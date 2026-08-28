param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Node', 'Python', 'VisualStudio')]
  [string]$Component,
  [Parameter(Mandatory = $true)]
  [string]$RepositoryRoot
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$manifestPath = Join-Path $RepositoryRoot 'dependencies.manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$toolRoot = Join-Path $env:LOCALAPPDATA 'nodeterm\toolchain'
[IO.Directory]::CreateDirectory($toolRoot) | Out-Null

function Assert-ToolRootChild([string]$Path) {
  $root = [IO.Path]::GetFullPath($toolRoot).TrimEnd('\') + '\'
  $candidate = [IO.Path]::GetFullPath($Path)
  if (-not $candidate.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify a path outside the nodeterm toolchain root: $candidate"
  }
}

function Get-Sha256([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try {
      $bytes = $algorithm.ComputeHash($stream)
    } finally {
      $algorithm.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
  return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}

function Get-VerifiedFile($Entry, [string]$Leaf) {
  $target = Join-Path $env:TEMP $Leaf
  Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
  Write-Host "[DOWNLOAD] $($Entry.url)"
  Invoke-WebRequest -UseBasicParsing -Uri ([string]$Entry.url) -OutFile $target
  $actual = Get-Sha256 $target
  $expected = ([string]$Entry.sha256).ToLowerInvariant()
  if ($actual -ne $expected) {
    Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
    throw "SHA-256 mismatch for $Leaf. Expected $expected, received $actual."
  }
  Write-Host "[VERIFIED] SHA-256 $actual"
  return $target
}

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

switch ($Component) {
  'Node' {
    $entry = $manifest.node
    $target = Join-Path $toolRoot ([string]$entry.directory)
    $nodeExe = Join-Path $target 'node.exe'
    if (Test-Path -LiteralPath $nodeExe -PathType Leaf) {
      $version = (& $nodeExe -v).TrimStart('v')
      if ($version -eq [string]$entry.version) {
        Write-Host "[OK] Pinned Node.js $version is already cached at $target."
        exit 0
      }
    }

    $archive = Get-VerifiedFile $entry 'nodeterm-node.zip'
    $stage = Join-Path $toolRoot ('.node-stage-' + [Guid]::NewGuid().ToString('N'))
    Assert-ToolRootChild $stage
    try {
      [IO.Directory]::CreateDirectory($stage) | Out-Null
      Expand-Archive -LiteralPath $archive -DestinationPath $stage -Force
      $expanded = Join-Path $stage ([string]$entry.directory)
      if (-not (Test-Path -LiteralPath (Join-Path $expanded 'node.exe') -PathType Leaf)) {
        throw 'The verified Node.js archive did not contain node.exe at the declared path.'
      }
      Assert-ToolRootChild $target
      if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
      }
      Move-Item -LiteralPath $expanded -Destination $target
    } finally {
      Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
      if (Test-Path -LiteralPath $stage) {
        Assert-ToolRootChild $stage
        Remove-Item -LiteralPath $stage -Recurse -Force
      }
    }
    $version = (& $nodeExe -v).TrimStart('v')
    if ($version -ne [string]$entry.version) {
      throw "Node.js verification failed after extraction. Expected $($entry.version), received $version."
    }
    Write-Host "[OK] Installed pinned Node.js $version at $target."
  }

  'Python' {
    $entry = $manifest.python
    $target = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312'
    $pythonExe = Join-Path $target 'python.exe'
    if (Test-Path -LiteralPath $pythonExe -PathType Leaf) {
      $version = (& $pythonExe -c 'import platform; print(platform.python_version())').Trim()
      if ($version -eq [string]$entry.version) {
        Write-Host "[OK] Pinned Python $version is already installed at $target."
        exit 0
      }
    }

    $installer = Get-VerifiedFile $entry 'nodeterm-python.exe'
    try {
      $arguments = @(
        '/quiet',
        'InstallAllUsers=0',
        'Include_launcher=0',
        'Include_test=0',
        'Include_pip=1',
        'Include_dev=1',
        'AssociateFiles=0',
        'Shortcuts=0',
        'PrependPath=0'
      )
      $process = Start-Process -FilePath $installer -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
      if ($process.ExitCode -ne 0) {
        throw "Python installer exited with code $($process.ExitCode)."
      }
    } finally {
      Remove-Item -LiteralPath $installer -Force -ErrorAction SilentlyContinue
    }
    if (-not (Test-Path -LiteralPath $pythonExe -PathType Leaf)) {
      throw "Python installation produced no python.exe at the per-user location $target."
    }
    $version = (& $pythonExe -c 'import platform; print(platform.python_version())').Trim()
    if ($version -ne [string]$entry.version) {
      throw "Python verification failed after installation. Expected $($entry.version), received $version."
    }
    Write-Host "[OK] Installed pinned Python $version at $target."
  }

  'VisualStudio' {
    if (-not (Test-Administrator)) {
      throw 'Visual Studio Build Tools is missing. Run build.bat by double-clicking it so the upfront administrator prompt can be approved.'
    }
    $entry = $manifest.visualStudio
    $installer = Get-VerifiedFile $entry 'nodeterm-vs-buildtools.exe'
    try {
      $arguments = @(
        '--quiet',
        '--wait',
        '--norestart',
        '--add',
        [string]$entry.workload,
        '--includeRecommended'
      )
      $process = Start-Process -FilePath $installer -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
      if ($process.ExitCode -notin @(0, 3010)) {
        throw "Visual Studio Build Tools installer exited with code $($process.ExitCode)."
      }
    } finally {
      Remove-Item -LiteralPath $installer -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] Visual Studio Build Tools $($entry.version) bootstrap completed."
  }
}

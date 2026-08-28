param(
  [Parameter(Mandatory = $true)]
  [string] $VsWhere
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $VsWhere -PathType Leaf)) {
  throw "vswhere.exe was not found at $VsWhere"
}

$paths = & $VsWhere -nologo -products * -version '[17,18)' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if ($LASTEXITCODE -ne 0) {
  throw "vswhere.exe exited with code $LASTEXITCODE"
}

$instances = @($paths | Where-Object { $_ -and $_ -notmatch '^Visual Studio Locator' })
foreach ($instance in $instances) {
  $root = [string]$instance
  if (-not $root) { continue }
  $spectre = @(Get-ChildItem -Path (Join-Path $root 'VC\Tools\MSVC\*\lib\spectre\x64') -Directory -ErrorAction SilentlyContinue)
  if ($spectre.Count -gt 0) {
    [Console]::Out.WriteLine($root)
    exit 0
  }
}

exit 2

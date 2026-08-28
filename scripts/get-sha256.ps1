param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath
)

$ErrorActionPreference = 'Stop'
$stream = [IO.File]::OpenRead($InputPath)
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
[Console]::Out.WriteLine(([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant())

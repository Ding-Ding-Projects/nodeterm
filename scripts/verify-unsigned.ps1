param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath
)

$ErrorActionPreference = 'Stop'
try {
  $certificate = [Security.Cryptography.X509Certificates.X509Certificate]::CreateFromSignedFile($InputPath)
  if ($null -ne $certificate) {
    $certificate.Dispose()
    [Console]::Error.WriteLine('The executable contains an Authenticode certificate.')
    exit 1
  }
} catch [Security.Cryptography.CryptographicException] {
  [Console]::Out.WriteLine('NotSigned')
  exit 0
}

[Console]::Error.WriteLine('The executable signing state could not be classified as unsigned.')
exit 2

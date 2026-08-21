# Generate Valid RSA 2048-bit Development Certificates for TLS (FR-21)
# Path: C:\Users\PC\Downloads\KMS\scripts\generate-dev-certs.ps1

$certDir = ".\certs"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

Write-Host "Generating valid RSA 2048-bit self-signed certificate for local TLS testing..." -ForegroundColor Cyan

$rsaProvider = New-Object System.Security.Cryptography.RSACryptoServiceProvider(2048)
$keyBytes = $rsaProvider.ExportCspBlob($true)

$req = New-Object System.Security.Cryptography.X509Certificates.CertificateRequest(
    "CN=kms.enterprise.internal",
    $rsaProvider,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256,
    [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
)

$cert = $req.CreateSelfSigned(
    [System.DateTimeOffset]::Now.AddDays(-1),
    [System.DateTimeOffset]::Now.AddYears(1)
)

# Export Certificate (PEM format)
$certPem = "-----BEGIN CERTIFICATE-----`n" +
    [System.Convert]::ToBase64String($cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), [System.Base64FormattingOptions]::InsertLineBreaks) +
    "`n-----END CERTIFICATE-----`n"

# Export Private Key (RSA Private Key PEM format)
$keyPem = "-----BEGIN RSA PRIVATE KEY-----`n" +
    [System.Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks) +
    "`n-----END RSA PRIVATE KEY-----`n"

Set-Content -Path (Join-Path $certDir "kms_enterprise.crt") -Value $certPem
Set-Content -Path (Join-Path $certDir "kms_enterprise.key") -Value $keyPem

Write-Host "[SUCCESS] Generated valid RSA 2048-bit certificate: .\certs\kms_enterprise.crt" -ForegroundColor Green
Write-Host "[SUCCESS] Generated valid RSA private key: .\certs\kms_enterprise.key" -ForegroundColor Green

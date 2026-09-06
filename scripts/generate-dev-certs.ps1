# ==============================================================================
# Generate Valid RSA 2048-bit Development Certificates for TLS & Jitsi Meet (FR-21)
# Generates:
#   1. INSA KMS Root CA (ca.crt, ca.key)
#   2. Jitsi Meet Server Certificate with SAN (jitsi.crt, jitsi.key, fullchain.crt)
#   3. Enterprise TLS Certificate (kms_enterprise.crt, kms_enterprise.key)
# ==============================================================================

$certDir = Resolve-Path "$PSScriptRoot\..\certs"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  INSA-KMS: Generating Development TLS & Jitsi Certificates " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# ── 1. Generate kms_enterprise.crt (FR-21) ───────────────────────────────────
Write-Host "`n[1/3] Generating RSA 2048-bit enterprise certificate (kms_enterprise)..." -ForegroundColor Yellow
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

$certPem = "-----BEGIN CERTIFICATE-----`n" +
    [System.Convert]::ToBase64String($cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), [System.Base64FormattingOptions]::InsertLineBreaks) +
    "`n-----END CERTIFICATE-----`n"

$keyPem = "-----BEGIN RSA PRIVATE KEY-----`n" +
    [System.Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks) +
    "`n-----END RSA PRIVATE KEY-----`n"

Set-Content -Path (Join-Path $certDir "kms_enterprise.crt") -Value $certPem -Encoding Ascii
Set-Content -Path (Join-Path $certDir "kms_enterprise.key") -Value $keyPem -Encoding Ascii
Write-Host "      [SUCCESS] Generated .\certs\kms_enterprise.crt and .key" -ForegroundColor Green

# ── 2. Generate INSA KMS Root CA & Jitsi TLS Certificates via OpenSSL ────────
Write-Host "`n[2/3] Generating INSA KMS Root CA & Jitsi Meet TLS Certificate..." -ForegroundColor Yellow

# Use OpenSSL from docker jitsi-web or local openssl
$hasDockerJitsi = $false
try {
    $cCheck = docker ps --filter "name=kms-jitsi-web" --format "{{.Names}}" 2>$null
    if ($cCheck -match "kms-jitsi-web") { $hasDockerJitsi = $true }
} catch { }

if ($hasDockerJitsi) {
    Write-Host "      Using OpenSSL inside kms-jitsi-web container..." -ForegroundColor Gray
    docker exec kms-jitsi-web bash -c "cat << 'EOF' > /tmp/ca.cnf
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_ca

[dn]
C = ET
O = INSA KMS
OU = Certificate Authority
CN = INSA KMS Development Root CA

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
subjectKeyIdentifier = hash
EOF
openssl req -new -x509 -nodes -keyout /tmp/ca.key -out /tmp/ca.crt -days 3650 -config /tmp/ca.cnf

cat << 'EOF' > /tmp/server.cnf
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn

[dn]
C = ET
O = INSA KMS
OU = Virtual Video Discussion
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
subjectKeyIdentifier = hash

[alt_names]
DNS.1 = localhost
DNS.2 = jitsi.kms.internal
DNS.3 = kms.enterprise.internal
DNS.4 = host.docker.internal
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
openssl req -new -nodes -keyout /tmp/jitsi.key -out /tmp/jitsi.csr -config /tmp/server.cnf
openssl x509 -req -in /tmp/jitsi.csr -CA /tmp/ca.crt -CAkey /tmp/ca.key -CAcreateserial -out /tmp/jitsi.crt -days 730 -extfile /tmp/server.cnf -extensions v3_req
cat /tmp/jitsi.crt /tmp/ca.crt > /tmp/fullchain.crt
" | Out-Null

    docker cp kms-jitsi-web:/tmp/ca.crt (Join-Path $certDir "ca.crt")
    docker cp kms-jitsi-web:/tmp/jitsi.crt (Join-Path $certDir "jitsi.crt")
    docker cp kms-jitsi-web:/tmp/jitsi.key (Join-Path $certDir "jitsi.key")
    docker cp kms-jitsi-web:/tmp/fullchain.crt (Join-Path $certDir "fullchain.crt")
    Write-Host "      [SUCCESS] Generated .\certs\ca.crt, jitsi.crt, jitsi.key, fullchain.crt" -ForegroundColor Green
} else {
    Write-Host "      kms-jitsi-web container not running; existing certificates in .\certs will be preserved." -ForegroundColor Yellow
}

# ── 3. Instructions to Trust CA ──────────────────────────────────────────────
Write-Host "`n[3/3] Trusting certificates..." -ForegroundColor Yellow
Write-Host "      Run .\scripts\trust-dev-ca.ps1 to install the Root CA into Windows Certificate Store." -ForegroundColor Cyan
Write-Host ""

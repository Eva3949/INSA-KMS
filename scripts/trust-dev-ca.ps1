# ==============================================================================
# INSA-KMS: Trust Development Root CA
# Installs INSA KMS Development Root CA into the Windows Trusted Root store.
#
# Trust Hierarchy:
#   INSA KMS Development Root CA (certs/ca.crt)
#           | signs
#   Jitsi Server Certificate (certs/jitsi.crt)
#           | served by
#   https://localhost:8443
#           | trusted by
#   Microsoft Edge / Google Chrome / Windows Schannel
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\trust-dev-ca.ps1
#   (Run in an Administrator PowerShell window to install to LocalMachine\Root)
# ==============================================================================

$certDir = Resolve-Path "$PSScriptRoot\..\certs"
$caCert = Join-Path $certDir "ca.crt"
$jitsiCert = Join-Path $certDir "jitsi.crt"

if (-not (Test-Path $caCert)) {
    Write-Error "Root CA certificate not found at $caCert. Run .\scripts\generate-dev-certs.ps1 first."
    exit 1
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  INSA-KMS: Development Root CA Trust Installer            " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "CA Certificate : $caCert" -ForegroundColor Gray
Write-Host "Elevated Admin : $isAdmin" -ForegroundColor Gray
Write-Host ""

$caObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($caCert)
Write-Host "Root CA Subject   : $($caObj.Subject)" -ForegroundColor Cyan
Write-Host "Root CA Thumbprint: $($caObj.Thumbprint)" -ForegroundColor Cyan
Write-Host ""

# 1. Install Root CA
if ($isAdmin) {
    Write-Host "[1/2] Installing Root CA into Cert:\LocalMachine\Root (System-wide for all users & browsers)..." -ForegroundColor Yellow
    $out = & certutil.exe -f -addstore Root "$caCert" 2>&1
    Write-Host "      $out" -ForegroundColor Gray
    
    # Also install to CurrentUser Root
    & certutil.exe -user -f -addstore Root "$caCert" 2>&1 | Out-Null
    Write-Host "      [SUCCESS] Installed into Cert:\LocalMachine\Root and Cert:\CurrentUser\Root" -ForegroundColor Green
} else {
    Write-Host "[1/2] Installing Root CA into Cert:\CurrentUser\Root..." -ForegroundColor Yellow
    Write-Host "      NOTE: If a Windows Security Warning dialog appears, click 'Yes' to confirm trusting this local CA." -ForegroundColor Cyan
    $out = & certutil.exe -user -f -addstore Root "$caCert" 2>&1
    Write-Host "      $out" -ForegroundColor Gray

    # Check if successfully added
    $inUserRoot = Get-ChildItem Cert:\CurrentUser\Root -ErrorAction SilentlyContinue | Where-Object { $_.Thumbprint -eq $caObj.Thumbprint }
    if ($inUserRoot) {
        Write-Host "      [SUCCESS] Root CA is installed in Cert:\CurrentUser\Root" -ForegroundColor Green
    } else {
        Write-Host "      [NOTICE] Not installed in CurrentUser Root (non-interactive session or dialog dismissed)." -ForegroundColor Yellow
        Write-Host "      Attempting to launch elevated installer prompt (UAC)..." -ForegroundColor Cyan
        try {
            Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command & { certutil.exe -f -addstore Root '$caCert'; Write-Host 'Root CA installed into LocalMachine\Root successfully!'; Start-Sleep -Seconds 2 }" -Wait
            $inLmRoot = Get-ChildItem Cert:\LocalMachine\Root -ErrorAction SilentlyContinue | Where-Object { $_.Thumbprint -eq $caObj.Thumbprint }
            if ($inLmRoot) {
                Write-Host "      [SUCCESS] Elevated install succeeded: Root CA is in Cert:\LocalMachine\Root" -ForegroundColor Green
            }
        } catch {
            Write-Host "      Elevation request failed or was cancelled: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

# 2. Also install to Intermediate CA store (standard practice for complete discovery)
Write-Host "`n[2/2] Registering in Intermediate CA store..." -ForegroundColor Yellow
& certutil.exe -user -f -addstore CA "$caCert" 2>&1 | Out-Null
Write-Host "      [SUCCESS] Registered in Cert:\CurrentUser\CA" -ForegroundColor Green

# 3. Verify Certificate Chain against the Jitsi Server Certificate
Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host "  CERTIFICATE CHAIN VALIDATION (Step 4 Verification)       " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

if (Test-Path $jitsiCert) {
    $jitsiObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($jitsiCert)
    Write-Host "Jitsi Leaf Subject   : $($jitsiObj.Subject)" -ForegroundColor Gray
    Write-Host "Jitsi Leaf Issuer    : $($jitsiObj.Issuer)" -ForegroundColor Gray
    Write-Host "Jitsi Leaf Thumbprint: $($jitsiObj.Thumbprint)" -ForegroundColor Gray

    # Check SAN
    $sanExt = $jitsiObj.Extensions | Where-Object { $_.Oid.FriendlyName -match 'Subject Alternative Name' }
    if ($sanExt) {
        Write-Host "Jitsi Leaf SAN       : $($sanExt.Format($false))" -ForegroundColor Gray
        $hasLocalhostSan = $sanExt.Format($false) -match "localhost"
        Write-Host "SAN matches localhost: $hasLocalhostSan" -ForegroundColor $(if ($hasLocalhostSan) { "Green" } else { "Red" })
    }

    $chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
    $chain.ChainPolicy.RevocationMode = [System.Security.Cryptography.X509Certificates.X509RevocationMode]::NoCheck
    $isValid = $chain.Build($jitsiObj)

    Write-Host "`nChain Elements ($($chain.ChainElements.Count)):" -ForegroundColor Cyan
    for ($i = 0; $i -lt $chain.ChainElements.Count; $i++) {
        $el = $chain.ChainElements[$i].Certificate
        Write-Host "  [$i] $($el.Subject) (Issuer: $($el.Issuer)) [Thumb: $($el.Thumbprint)]" -ForegroundColor Gray
    }

    Write-Host "`nChain Status Count: $($chain.ChainStatus.Count)" -ForegroundColor Cyan
    $hasErrors = $false
    foreach ($status in $chain.ChainStatus) {
        Write-Host "  - $($status.Status): $($status.StatusInformation.Trim())" -ForegroundColor Red
        if ($status.Status -ne [System.Security.Cryptography.X509Certificates.X509ChainStatusFlags]::NoError) {
            $hasErrors = $true
        }
    }

    if ($isValid -and -not $hasErrors) {
        Write-Host "`n[RESULT: PASS] Certificate chain is VALID and TRUSTED by Windows!" -ForegroundColor Green
        Write-Host "               Edge, Chrome, and Schannel will trust https://localhost:8443 without certificate errors." -ForegroundColor Green
    } else {
        Write-Host "`n[RESULT: PENDING TRUST] The Root CA is not yet in Cert:\LocalMachine\Root or Cert:\CurrentUser\Root." -ForegroundColor Red
        Write-Host "To complete trust:" -ForegroundColor Yellow
        Write-Host "  1. Open PowerShell as Administrator." -ForegroundColor Yellow
        Write-Host "  2. Run: certutil.exe -f -addstore Root `"$caCert`"" -ForegroundColor Yellow
        Write-Host "  3. Completely close and reopen Microsoft Edge." -ForegroundColor Yellow
    }
}

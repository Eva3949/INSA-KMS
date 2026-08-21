# Security Integration Test Script
# Path: C:\Users\PC\Downloads\KMS\scripts\test-security.ps1

$kcUrl = "http://localhost:8080"
$apiUrl = "http://localhost:8081/api/v1"

function Get-Token($user, $pass) {
    $body = "username=$user&password=$pass&grant_type=password&client_id=kms-frontend-client"
    $res = Invoke-RestMethod -Uri "$kcUrl/realms/kms-realm/protocol/openid-connect/token" -Method Post -ContentType "application/x-www-form-urlencoded" -Body $body
    return $res.access_token
}

function Test-Endpoint($name, $url, $headers, $expectedStatus) {
    $status = 0
    $body = ""
    try {
        if ($headers) {
            $res = Invoke-WebRequest -Uri $url -Method Get -Headers $headers -UseBasicParsing
        } else {
            $res = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing
        }
        $status = [int]$res.StatusCode
        $body = $res.Content
    } catch {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        } else {
            Write-Host "$name System Error: $($_.Exception.Message)" -ForegroundColor Red
            return
        }
    }

    $pass = ($status -eq $expectedStatus)
    $color = if ($pass) { "Green" } else { "Red" }
    $tag = if ($pass) { "PASS" } else { "FAIL" }
    Write-Host "[$tag] $name -> Actual HTTP Status: $status (Expected: $expectedStatus)" -ForegroundColor $color
    if ($body -and $pass -and $status -eq 200) {
        Write-Host "   Response Body: $body" -ForegroundColor Gray
    }
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " REAL KEYCLOAK JWT & SPRING SECURITY TEST MATRIX" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Test 1: No JWT -> 401
Test-Endpoint "Test 1: No JWT" "$apiUrl/users/me" $null 401

# Test 2: Invalid JWT -> 401
$invalidHeaders = @{ Authorization = "Bearer invalid.jwt.token" }
Test-Endpoint "Test 2: Invalid JWT" "$apiUrl/users/me" $invalidHeaders 401

# Test 3: Viewer -> Admin endpoint -> 403
$viewerToken = Get-Token "viewer" "viewer123"
$viewerHeaders = @{ Authorization = "Bearer $viewerToken" }
Test-Endpoint "Test 3: Viewer -> Admin Endpoint" "$apiUrl/admin/summary" $viewerHeaders 403

# Test 4: Admin -> Admin endpoint -> 200
$adminToken = Get-Token "admin" "admin123"
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
Test-Endpoint "Test 4: Admin -> Admin Endpoint" "$apiUrl/admin/summary" $adminHeaders 200

# Test 5: Admin -> /users/me -> 200
Test-Endpoint "Test 5: Admin -> /users/me Profile" "$apiUrl/users/me" $adminHeaders 200

# Full E2E Functional Test Matrix Script
# Path: C:\Users\PC\Downloads\KMS\scripts\test-e2e-functional.ps1

$kcUrl = "http://localhost:8080"
$apiUrl = "http://localhost:8081/api/v1"

function Get-Token($user, $pass) {
    $body = "username=$user&password=$pass&grant_type=password&client_id=kms-frontend-client"
    $res = Invoke-RestMethod -Uri "$kcUrl/realms/kms-realm/protocol/openid-connect/token" -Method Post -ContentType "application/x-www-form-urlencoded" -Body $body
    return $res.access_token
}

$adminToken = Get-Token "admin" "admin123"
$headers = @{ Authorization = "Bearer $adminToken" }

function Test-Api($fr, $name, $url, $method="Get", $body=$null, $expected=200) {
    $status = 0
    try {
        if ($body) {
            $jsonBody = $body | ConvertTo-Json -Depth 5
            $res = Invoke-WebRequest -Uri $url -Method $method -Headers $headers -ContentType "application/json" -Body $jsonBody -UseBasicParsing
        } else {
            $res = Invoke-WebRequest -Uri $url -Method $method -Headers $headers -UseBasicParsing
        }
        $status = [int]$res.StatusCode
    } catch {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        } else {
            Write-Host "[$fr FAIL] $name System Error: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }

    $pass = ($status -eq $expected)
    $color = if ($pass) { "Green" } else { "Red" }
    $tag = if ($pass) { "PASS" } else { "FAIL" }
    Write-Host "[$tag] $fr $name -> Status: $status (Expected: $expected)" -ForegroundColor $color
    return $pass
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " KMS PHASE 3 LIVE END-TO-END FR-01 -> FR-31 MATRIX" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Test-Api "FR-18" "SSO / User Profile" "$apiUrl/users/me" "Get" $null 200
Test-Api "FR-27" "Admin Summary" "$apiUrl/admin/summary" "Get" $null 200
Test-Api "FR-27" "Admin Users List" "$apiUrl/admin/users" "Get" $null 200
Test-Api "FR-17" "Admin Roles List" "$apiUrl/admin/roles" "Get" $null 200
Test-Api "FR-01" "Documents List" "$apiUrl/documents?page=0&size=10" "Get" $null 200
Test-Api "FR-03" "Folder Get By ID" "$apiUrl/folders/00000000-0000-0000-0000-000000000000" "Get" $null 200
Test-Api "FR-11" "Quick Full-Text Search" "$apiUrl/search/quick?q=test" "Get" $null 200
Test-Api "FR-12" "Advanced Search Filters" "$apiUrl/search/advanced" "Post" @{ query = "policy" } 200
Test-Api "FR-28" "Retention Policies List" "$apiUrl/governance/retention" "Get" $null 200
Test-Api "FR-29" "Legal Holds List" "$apiUrl/governance/legal-holds" "Get" $null 200
Test-Api "FR-22" "Audit Logs Query" "$apiUrl/governance/audit-logs?page=0&size=20" "Get" $null 200

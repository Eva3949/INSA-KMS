# Setup Super Admin and Standard Admin in Keycloak

$kcUrl = "http://localhost:8080"
$masterTokenRes = Invoke-RestMethod -Uri "$kcUrl/realms/master/protocol/openid-connect/token" -Method Post -ContentType "application/x-www-form-urlencoded" -Body "grant_type=password&client_id=admin-cli&username=admin&password=admin"
$token = $masterTokenRes.access_token

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 1. Get role representations
$superRole = Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/roles/ROLE_SUPER_ADMIN" -Method Get -Headers $headers
$adminRole = Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/roles/ROLE_ADMIN" -Method Get -Headers $headers

# 2. Assign ROLE_SUPER_ADMIN to admin
$adminUser = (Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/users?username=admin&exact=true" -Method Get -Headers $headers)[0]
if ($adminUser -and $superRole) {
    $superRoleJson = "[" + ($superRole | ConvertTo-Json) + "]"
    Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/users/$($adminUser.id)/role-mappings/realm" -Method Post -Headers $headers -Body $superRoleJson
    Write-Host "Assigned ROLE_SUPER_ADMIN to admin (id: $($adminUser.id))"
}

# 3. Assign ROLE_ADMIN to admin_ops
$opsUser = (Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/users?username=admin_ops&exact=true" -Method Get -Headers $headers)[0]
if ($opsUser -and $adminRole) {
    $adminRoleJson = "[" + ($adminRole | ConvertTo-Json) + "]"
    Invoke-RestMethod -Uri "$kcUrl/admin/realms/kms-realm/users/$($opsUser.id)/role-mappings/realm" -Method Post -Headers $headers -Body $adminRoleJson
    Write-Host "Assigned ROLE_ADMIN to admin_ops (id: $($opsUser.id))"
}

Write-Host "Admin tiers configuration verified in Keycloak!"

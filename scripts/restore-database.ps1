# KMS PostgreSQL Database Restore Script (NFR-06 / NFR-03)
# Path: C:\Users\PC\Downloads\KMS\scripts\restore-database.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$backupFile,
    [string]$dbUser = "kmsuser",
    [string]$dbName = "kmsdb"
)

if (-not (Test-Path $backupFile)) {
    Write-Host "[ERROR] Backup file not found: $backupFile" -ForegroundColor Red
    exit 1
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " KMS DATABASE RESTORE EXECUTION" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Source File   : $backupFile" -ForegroundColor Gray
Write-Host "Target DB     : $dbName" -ForegroundColor Gray

try {
    $cmd = "Get-Content `"$backupFile`" | docker exec -i kms-postgres psql -U $dbUser -d $dbName"
    Write-Host "Running restore command..." -ForegroundColor Yellow
    Invoke-Expression $cmd
    Write-Host "[SUCCESS] Database restored successfully from: $backupFile" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Restore failed: $_" -ForegroundColor Red
}

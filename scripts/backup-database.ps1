# KMS PostgreSQL Database Backup Script (NFR-06 / NFR-03)
# Path: C:\Users\PC\Downloads\KMS\scripts\backup-database.ps1

param(
    [string]$backupDir = ".\backups",
    [string]$dbHost = "localhost",
    [string]$dbPort = "5432",
    [string]$dbName = "kmsdb",
    [string]$dbUser = "kmsuser"
)

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupDir "kmsdb_backup_$timestamp.sql"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " KMS DATABASE BACKUP EXECUTION" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Database Host : ${dbHost}:${dbPort}" -ForegroundColor Gray
Write-Host "Database Name : $dbName" -ForegroundColor Gray
Write-Host "Target File   : $backupFile" -ForegroundColor Gray

try {
    # Execute pg_dump command (or docker exec if running inside container)
    $cmd = "docker exec kms-postgres pg_dump -U $dbUser $dbName > `"$backupFile`""
    Write-Host "Running: $cmd" -ForegroundColor Yellow
    Invoke-Expression $cmd
    Write-Host "[SUCCESS] Backup created successfully: $backupFile" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backup failed: $_" -ForegroundColor Red
}

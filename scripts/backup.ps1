<# 
.SYNOPSIS
    Database backup script for PostgreSQL on Windows

.DESCRIPTION
    Creates a compressed backup of the PostgreSQL database and manages retention

.PARAMETER RetentionDays
    Number of days to keep backups (default: 7)

.PARAMETER BackupDir
    Directory to store backups (default: "C:\backups")

.PARAMETER DbHost
    Database host (default: "localhost")

.PARAMETER DbPort
    Database port (default: "5432")

.PARAMETER DbName
    Database name (default: "finance")

.PARAMETER DbUser
    Database user (default: "finance")

.PARAMETER DbPassword
    Database password (default: "finance")

.EXAMPLE
    .\backup.ps1 -RetentionDays 7

.EXAMPLE
    .\backup.ps1 -RetentionDays 30 -BackupDir "D:\backups" -DbPassword "secret"
#>

param(
    [int]$RetentionDays = 7,
    [string]$BackupDir = "C:\backups",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "finance",
    [string]$DbUser = "finance",
    [string]$DbPassword = "finance"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "${DbName}_${Timestamp}.sql.gz"
$LatestLink = Join-Path $BackupDir "${DbName}_latest.sql.gz"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "Iniciando backup do banco $DbName em $BackupFile"

$env:PGPASSWORD = $DbPassword

try {
    & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName `
        --no-password --verbose --clean --if-exists --create | gzip > $BackupFile

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Backup concluído com sucesso: $BackupFile"
        Get-Item $BackupFile | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

        # Create/update latest copy
        Copy-Item $BackupFile $LatestLink -Force

        # Remove old backups
        Write-Host "Removendo backups com mais de $RetentionDays dias..."
        Get-ChildItem -Path $BackupDir -Filter "${DbName}_*.sql.gz" -File | Where-Object {
            $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays)
        } | Remove-Item -Force

        Write-Host "Backup finalizado."
    } else {
        Write-Error "Erro ao realizar backup! Código de saída: $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Error "Exceção durante backup: $_"
    exit 1
}
# reset-db.ps1
$infraDir = "$PSScriptRoot\.local-services"
$pgBin = "$infraDir\postgresql\pgsql\bin\pg_ctl.exe"
$pgData = "$infraDir\postgresql-data"
$pgLog = "$infraDir\postgres.log"
$psql = "$infraDir\postgresql\pgsql\bin\psql.exe"
$initdb = "$infraDir\postgresql\pgsql\bin\initdb.exe"

Write-Host "Stopping PostgreSQL..." -ForegroundColor Yellow
& $pgBin -D $pgData stop -m immediate

Start-Sleep -Seconds 3

Write-Host "Deleting old database directory..." -ForegroundColor Red
if (Test-Path $pgData) {
    Remove-Item -Recurse -Force $pgData
}

Write-Host "Initializing new PostgreSQL database..." -ForegroundColor Green
& $initdb -U postgres -D $pgData -E UTF8 --auth=trust

Write-Host "Starting PostgreSQL..." -ForegroundColor Green
& $pgBin -D $pgData -l $pgLog start

Start-Sleep -Seconds 3

Write-Host "Setting password for user 'postgres'..." -ForegroundColor Green
& $psql -h localhost -p 5432 -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"

Write-Host "Database reset and started successfully." -ForegroundColor Cyan

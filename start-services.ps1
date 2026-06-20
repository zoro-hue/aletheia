# start-services.ps1
# Script to launch PostgreSQL, Redis, and Mock ClickHouse locally

$infraDir = "$PSScriptRoot\.local-services"
$pgBin = "$infraDir\postgresql\pgsql\bin\pg_ctl.exe"
$pgData = "$infraDir\postgresql-data"
$pgLog = "$infraDir\postgres.log"

$redisBin = "$infraDir\redis\redis-server.exe"
$redisLog = "$infraDir\redis.log"

$clickhouseMock = "$PSScriptRoot\mock-clickhouse.js"
$clickhouseLog = "$infraDir\clickhouse-mock.log"

Write-Host "Starting PostgreSQL..." -ForegroundColor Green
& $pgBin -D $pgData -l $pgLog start

Write-Host "Starting Redis..." -ForegroundColor Green
Start-Process -FilePath $redisBin -ArgumentList "--port 6379 --requirepass myredissecret" -NoNewWindow -RedirectStandardOutput $redisLog

Write-Host "Starting Mock ClickHouse Server..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList $clickhouseMock -NoNewWindow -RedirectStandardOutput $clickhouseLog

Write-Host "All background services started successfully." -ForegroundColor Cyan
Write-Host "Logs are located in: $infraDir" -ForegroundColor Yellow

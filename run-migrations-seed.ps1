# run-migrations-seed.ps1
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"
$env:DIRECT_URL = "postgresql://postgres:postgres@localhost:5432/postgres"
$env:DISABLE_ERD = "true"

Write-Host "Running prisma migrate deploy..." -ForegroundColor Green
npx prisma migrate deploy --schema=packages/shared/prisma/schema.prisma

Write-Host "Seeding database with example data..." -ForegroundColor Green
npx pnpm --filter=shared run db:seed:examples

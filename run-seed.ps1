# run-seed.ps1
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"
$env:DIRECT_URL = "postgresql://postgres:postgres@localhost:5432/postgres"
npx pnpm --filter=shared db:seed:examples > seed-out.log 2>&1

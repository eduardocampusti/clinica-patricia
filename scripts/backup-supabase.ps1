[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $HostName,
  [int] $Port = 5432,
  [string] $UserName = 'postgres',
  [string] $Database = 'postgres',
  [string] $ProjectRef = 'xftnkusbyqzyvzrovroj',
  [string] $PgBin = 'scratch\tools\postgresql-17.11\pgsql\bin',
  [string] $OutputRoot = 'scratch\backups'
)

$ErrorActionPreference = 'Stop'
$pgDump = Join-Path $PgBin 'pg_dump.exe'
$psql = Join-Path $PgBin 'psql.exe'
if (-not (Test-Path -LiteralPath $pgDump) -or -not (Test-Path -LiteralPath $psql)) {
  throw 'pg_dump/psql não encontrados. Informe -PgBin para PostgreSQL 17 compatível.'
}

$password = $env:SUPABASE_DB_PASSWORD
if (-not $password) {
  $secure = Read-Host 'Senha do banco (não será exibida nem salva)' -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $OutputRoot $stamp
New-Item -ItemType Directory -Path $target -Force | Out-Null
$fullDump = Join-Path $target 'clinica-patricia-full.dump'
$appDump = Join-Path $target 'clinica-patricia-app.dump'
$authIds = Join-Path $target 'auth-user-ids.txt'
$started = Get-Date

try {
  $env:PGPASSWORD = $password
  $env:PGSSLMODE = 'require'
  & $pgDump --host=$HostName --port=$Port --username=$UserName --dbname=$Database `
    --role=postgres --format=custom --no-owner --file=$fullDump
  if ($LASTEXITCODE -ne 0) { throw "pg_dump completo falhou com código $LASTEXITCODE." }

  & $pgDump --host=$HostName --port=$Port --username=$UserName --dbname=$Database `
    --role=postgres --format=custom --no-owner --schema=public --schema=private `
    --schema=supabase_migrations --file=$appDump
  if ($LASTEXITCODE -ne 0) { throw "pg_dump da aplicação falhou com código $LASTEXITCODE." }

  $ids = & $psql -h $HostName -p $Port -U $UserName -d $Database -At -v ON_ERROR_STOP=1 `
    -c 'set role postgres; select id from auth.users order by id;' |
    Where-Object { $_ -match '^[0-9a-f-]{36}$' }
  [IO.File]::WriteAllLines($authIds, [string[]]$ids, [Text.UTF8Encoding]::new($false))
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
  $password = $null
}

$metadata = [ordered]@{
  created_at = (Get-Date).ToString('o')
  project_ref = $ProjectRef
  format = 'PostgreSQL custom'
  pg_dump_version = (& $pgDump --version) -join ' '
  elapsed_seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)
  schemas_app = @('public', 'private', 'supabase_migrations')
  auth_user_ids = $ids.Count
  files = @(
    [ordered]@{ name = (Split-Path $fullDump -Leaf); bytes = (Get-Item $fullDump).Length; sha256 = (Get-FileHash -Algorithm SHA256 $fullDump).Hash },
    [ordered]@{ name = (Split-Path $appDump -Leaf); bytes = (Get-Item $appDump).Length; sha256 = (Get-FileHash -Algorithm SHA256 $appDump).Hash },
    [ordered]@{ name = (Split-Path $authIds -Leaf); bytes = (Get-Item $authIds).Length; sha256 = (Get-FileHash -Algorithm SHA256 $authIds).Hash }
  )
}
$metadata | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $target 'metadata.json') -Encoding utf8
Write-Output "Backup concluído: $target"
Write-Output 'Execute scripts\verify-backup.ps1 para validar o conjunto.'

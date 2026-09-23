[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $BackupDir,
  [string] $PgBin = 'scratch\tools\postgresql-17.11\pgsql\bin',
  [int] $Port = 55439,
  [switch] $KeepCluster
)

$ErrorActionPreference = 'Stop'
$scratch = (Resolve-Path 'scratch').Path
$cluster = Join-Path $scratch ('restore-cluster-' + [guid]::NewGuid().ToString('N'))
$initdb = Join-Path $PgBin 'initdb.exe'
$pgCtl = Join-Path $PgBin 'pg_ctl.exe'
$psql = Join-Path $PgBin 'psql.exe'
$pgRestore = Join-Path $PgBin 'pg_restore.exe'
$dump = Join-Path $BackupDir 'clinica-patricia-app.dump'
$authIds = Join-Path $BackupDir 'auth-user-ids.txt'
foreach ($path in @($initdb, $pgCtl, $psql, $pgRestore, $dump, $authIds)) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Pré-requisito ausente: $path" }
}

$started = Get-Date
$running = $false
try {
  & $initdb -D $cluster --encoding=UTF8 --locale=C --auth=trust --username=postgres
  if ($LASTEXITCODE -ne 0) { throw 'initdb falhou.' }
  & $pgCtl -D $cluster -l (Join-Path $cluster 'postgres.log') -o "-p $Port -h 127.0.0.1" -w start
  if ($LASTEXITCODE -ne 0) { throw 'pg_ctl start falhou.' }
  $running = $true

  $bootstrap = "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role authenticator nologin; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as 'select null::uuid'; create schema vault; create table vault.decrypted_secrets(name text primary key, decrypted_secret text); create schema extensions; create extension pgcrypto with schema extensions; create extension btree_gist with schema extensions; drop schema public cascade;"
  & $psql -h 127.0.0.1 -p $Port -U postgres -d postgres -v ON_ERROR_STOP=1 -c $bootstrap | Out-Null
  foreach ($id in (Get-Content -LiteralPath $authIds)) {
    if ($id -notmatch '^[0-9a-f-]{36}$') { throw 'UUID inválido em auth-user-ids.txt.' }
    & $psql -h 127.0.0.1 -p $Port -U postgres -d postgres -v ON_ERROR_STOP=1 `
      -c "insert into auth.users(id) values ('$id');" | Out-Null
  }
  & $pgRestore -h 127.0.0.1 -p $Port -U postgres -d postgres --no-owner --no-privileges --exit-on-error $dump
  if ($LASTEXITCODE -ne 0) { throw 'pg_restore falhou.' }

  $catalog = & $psql -h 127.0.0.1 -p $Port -U postgres -d postgres -At -v ON_ERROR_STOP=1 -c "select json_build_object('tables',(select count(*) from information_schema.tables where table_schema in ('public','private','supabase_migrations') and table_type='BASE TABLE'),'functions',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')),'constraints',(select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname in ('public','private')),'enums',(select count(*) from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname in ('public','private') and t.typtype='e'),'policies',(select count(*) from pg_policies where schemaname='public'),'rls_tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity),'migrations',(select count(*) from supabase_migrations.schema_migrations));"
  Write-Output 'RESTORE ENSAIADO COM SUCESSO'
  Write-Output ($catalog | Where-Object { $_ -like '{*' } | Select-Object -Last 1)
  Write-Output "RTO técnico observado: $([math]::Round(((Get-Date) - $started).TotalSeconds, 2)) segundos"
}
finally {
  if ($running) { & $pgCtl -D $cluster -m fast -w stop | Out-Null }
  if (-not $KeepCluster -and (Test-Path -LiteralPath $cluster)) {
    $resolvedParent = Split-Path -Parent $cluster
    if ($resolvedParent -ne $scratch -or (Split-Path -Leaf $cluster) -notlike 'restore-cluster-*') {
      throw 'Recusa de remover cluster fora de scratch.'
    }
    Remove-Item -LiteralPath $cluster -Recurse -Force
  }
}

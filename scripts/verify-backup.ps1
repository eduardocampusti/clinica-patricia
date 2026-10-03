[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $BackupDir,
  [string] $PgBin = 'scratch\tools\postgresql-17.11\pgsql\bin'
)

$ErrorActionPreference = 'Stop'
$metadataPath = Join-Path $BackupDir 'metadata.json'
$pgRestore = Join-Path $PgBin 'pg_restore.exe'
if (-not (Test-Path -LiteralPath $metadataPath)) { throw 'metadata.json ausente.' }
if (-not (Test-Path -LiteralPath $pgRestore)) { throw 'pg_restore não encontrado.' }
$metadata = Get-Content -Raw -LiteralPath $metadataPath | ConvertFrom-Json

foreach ($file in $metadata.files) {
  $path = Join-Path $BackupDir $file.name
  if (-not (Test-Path -LiteralPath $path)) { throw "Arquivo ausente: $($file.name)" }
  if ((Get-Item -LiteralPath $path).Length -le 0) { throw "Arquivo vazio: $($file.name)" }
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash
  if ($actual -ne $file.sha256) { throw "SHA-256 divergente: $($file.name)" }
}

$appDump = Join-Path $BackupDir 'clinica-patricia-app.dump'
$list = & $pgRestore --list $appDump
if ($LASTEXITCODE -ne 0) { throw 'pg_restore --list falhou.' }
foreach ($required in @(' public ', ' private ', ' supabase_migrations ', ' recebimentos', ' atendimentos')) {
  if (-not ($list | Select-String -SimpleMatch $required)) { throw "Objeto obrigatório ausente no catálogo: $required" }
}

Write-Output "Backup verificado: $BackupDir"
Write-Output "Entradas no catálogo: $($list.Count)"
Write-Output "Tabelas/dados: $(($list | Select-String ' TABLE ').Count)"
Write-Output "Funções: $(($list | Select-String ' FUNCTION ').Count)"
Write-Output "Policies: $(($list | Select-String ' POLICY ').Count)"

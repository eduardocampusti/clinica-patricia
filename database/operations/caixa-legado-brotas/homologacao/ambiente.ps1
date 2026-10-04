param([ValidateSet('start','stop')][string]$Action='start', [string]$RuntimeFile)
$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$taskBin=Join-Path $taskRoot 'scratch/tools/postgresql-17.11/pgsql/bin'
if($Action -eq 'stop'){
  if(-not $RuntimeFile){throw 'Informe o arquivo de runtime local, sem credenciais.'}
  $taskState=Get-Content -LiteralPath $RuntimeFile -Raw | ConvertFrom-Json
  $taskResolved=[IO.Path]::GetFullPath($taskState.data)
  $taskAllowed=[IO.Path]::GetFullPath((Join-Path $taskRoot 'scratch/homologacao-caixa-legado-'))
  if(-not $taskResolved.StartsWith($taskAllowed,[StringComparison]::OrdinalIgnoreCase)){throw 'Diretório fora da homologação exclusiva.'}
  & (Join-Path $taskBin 'pg_ctl.exe') -D $taskResolved -m fast -w stop
  if($LASTEXITCODE -ne 0){throw 'Não foi possível comprovar parada do servidor temporário.'}
  Remove-Item -LiteralPath $taskState.passfile -ErrorAction SilentlyContinue
  $taskState | Add-Member -Force NoteProperty stopped_at ([DateTimeOffset]::Now.ToString('o'))
  $taskState | ConvertTo-Json | Set-Content -LiteralPath $RuntimeFile -Encoding utf8
  Write-Output 'Instância temporária parada; senha de teste descartada.'
  exit
}
if(-not (Test-Path (Join-Path $taskBin 'initdb.exe'))){throw 'Binários portáteis não encontrados.'}
$taskRun=[Guid]::NewGuid().ToString('N')
$taskWork=Join-Path $taskRoot ('scratch/homologacao-caixa-legado-'+$taskRun)
New-Item -ItemType Directory -Path $taskWork | Out-Null
# Diretório novo, exclusivo. Não altera ACLs de nenhuma pasta preexistente.
$taskSid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$taskAcl=Get-Acl -LiteralPath $taskWork
$taskAcl.SetAccessRuleProtection($true,$false)
$taskRule=New-Object Security.AccessControl.FileSystemAccessRule($taskSid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$taskAcl.AddAccessRule($taskRule)
Set-Acl -LiteralPath $taskWork -AclObject $taskAcl
$taskListener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,0)
$taskListener.Start(); $taskPort=$taskListener.LocalEndpoint.Port; $taskListener.Stop()
$taskPassword=[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$taskPwFile=Join-Path $taskWork 'init-password.txt'
[IO.File]::WriteAllText($taskPwFile,$taskPassword,[Text.UTF8Encoding]::new($false))
$taskData=Join-Path $taskWork 'data'
try {
  & (Join-Path $taskBin 'initdb.exe') -D $taskData -U postgres --auth=scram-sha-256 --pwfile=$taskPwFile --encoding=UTF8 --locale=C
  if($LASTEXITCODE -ne 0){throw 'initdb falhou. Nenhum banco existente foi usado.'}
} finally { Remove-Item -LiteralPath $taskPwFile -ErrorAction SilentlyContinue }
$taskConf=@"
listen_addresses = '127.0.0.1'
port = $taskPort
ssl = off
password_encryption = 'scram-sha-256'
logging_collector = off
log_statement = 'none'
log_min_error_statement = 'panic'
homologacao.caixa_legado = '$taskRun'
"@
Add-Content -LiteralPath (Join-Path $taskData 'postgresql.conf') -Value $taskConf
[IO.File]::WriteAllText((Join-Path $taskData 'pg_hba.conf'),"host all all 127.0.0.1/32 scram-sha-256`n",[Text.UTF8Encoding]::new($false))
$taskPass=Join-Path $taskWork 'pgpass.conf'
[IO.File]::WriteAllText($taskPass,"127.0.0.1:$($taskPort):*:postgres:$taskPassword`n",[Text.UTF8Encoding]::new($false))
$taskPassword=$null
$taskRuntime=Join-Path $taskWork 'runtime.json'
$taskState=[ordered]@{run=$taskRun;host='127.0.0.1';port=$taskPort;database=('homolog_legado_'+$taskRun);data=$taskData;passfile=$taskPass;bin=$taskBin;started_at=[DateTimeOffset]::Now.ToString('o');stopped_at=$null}
$taskState | ConvertTo-Json | Set-Content -LiteralPath $taskRuntime -Encoding utf8
$taskLog=Join-Path $taskWork 'postgres.log'
$taskStart=Start-Process -FilePath (Join-Path $taskBin 'pg_ctl.exe') -ArgumentList @('-D',('"'+$taskData+'"'),'-l',('"'+$taskLog+'"'),'-w','start') -WindowStyle Hidden -PassThru
# WaitForExit espera apenas pg_ctl, não a árvore que contém o servidor persistente.
$taskStart.WaitForExit()
if($taskStart.ExitCode -ne 0){throw "pg_ctl falhou ($($taskStart.ExitCode)); verifique o log local da instância exclusiva."}
Write-Output ('RUNTIME='+$taskRuntime)

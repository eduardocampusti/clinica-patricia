param([ValidateSet('proteger','homologar')][string]$Action,[Parameter(Mandatory)][string]$ArchiveDirectory,[string]$RuntimeFile,[string]$TransportFile,[switch]$ResumeObjects)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$taskPrivate=[IO.Path]::GetFullPath($ArchiveDirectory)
if(-not $taskPrivate.StartsWith((Join-Path $taskRoot 'scratch/recuperacao-caixa-legado-'),[StringComparison]::OrdinalIgnoreCase)){throw 'Pasta fora do recorte privado.'}
$taskArchive=Join-Path $taskPrivate 'recorte.dpapi'
if($Action -eq 'proteger'){
  if(-not $TransportFile){throw 'Arquivo de transporte criptografado obrigatório.'}
  $taskTransport=[IO.Path]::GetFullPath($TransportFile)
  if(-not $taskTransport.StartsWith((Join-Path $taskRoot 'scratch/recorte-criptografado-'),[StringComparison]::OrdinalIgnoreCase)){throw 'Transporte fora do local temporário autorizado.'}
  $taskPayload=Get-Content -LiteralPath $taskTransport -Raw | ConvertFrom-Json
  $taskKeyBytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Join-Path $taskPrivate 'chave-transporte.dpapi')),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $taskRsa=[Security.Cryptography.RSA]::Create()
  $taskRead=0
  $taskRsa.ImportPkcs8PrivateKey($taskKeyBytes,[ref]$taskRead)
  $taskAesKey=$taskRsa.Decrypt([Convert]::FromBase64String($taskPayload.key),[Security.Cryptography.RSAEncryptionPadding]::OaepSHA256)
  $taskCipher=[Convert]::FromBase64String($taskPayload.data)
  $taskCompressed=[byte[]]::new($taskCipher.Length)
  $taskAes=[Security.Cryptography.AesGcm]::new($taskAesKey,16)
  $taskAes.Decrypt([Convert]::FromBase64String($taskPayload.iv),$taskCipher,[Convert]::FromBase64String($taskPayload.tag),$taskCompressed)
  $taskGzip=[IO.Compression.GZipStream]::new([IO.MemoryStream]::new($taskCompressed),[IO.Compression.CompressionMode]::Decompress)
  $taskStream=[IO.MemoryStream]::new(); $taskGzip.CopyTo($taskStream); $taskBytes=$taskStream.ToArray()
  $taskHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskBytes)).ToLowerInvariant()
  if($taskHash -ne $taskPayload.sha256 -or $taskBytes.Length -ne $taskPayload.bytes){throw 'Integridade da cópia divergente.'}
  $taskObject=[Text.Encoding]::UTF8.GetString($taskBytes)|ConvertFrom-Json
  if($taskObject.formato -ne 'RECUPERACAO_RECORTE_V1' -or $taskObject.project_ref -ne 'xftnkusbyqzyvzrovroj' -or $taskObject.read_only -ne 'on' -or -not $taskObject.inventario.contexto.valido){throw 'Recorte/contexto não autorizado.'}
  [IO.File]::WriteAllBytes($taskArchive,[Security.Cryptography.ProtectedData]::Protect($taskBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
  $taskRoundtrip=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($taskArchive),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  if(-not [Security.Cryptography.CryptographicOperations]::FixedTimeEquals($taskBytes,$taskRoundtrip)){throw 'Falha na leitura da cópia protegida.'}
  $taskMeta=[ordered]@{formato=$taskObject.formato;momento_exportacao=$taskObject.momento;project_ref=$taskObject.project_ref;bytes=$taskBytes.Length;sha256=$taskHash;protecao='DPAPI CurrentUser e ACL exclusiva; mesma conta Windows necessária';sessao=1;entradas=2;auditorias=7;eventos=0;definicoes_tabelas=4;historico_pix_excluido_preservado=$true;restauracao_postgresql='PENDENTE'}
  $taskMeta|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskPrivate 'metadados.json') -Encoding utf8
  # Só arquivos temporários desta exportação; o recorte recuperável permanece.
  Remove-Item -LiteralPath $taskTransport
  Remove-Item -LiteralPath (Join-Path $taskPrivate 'chave-transporte.dpapi')
  [Array]::Clear($taskKeyBytes); [Array]::Clear($taskAesKey); [Array]::Clear($taskBytes); [Array]::Clear($taskRoundtrip)
  $taskRsa.Dispose(); $taskAes.Dispose(); $taskGzip.Dispose(); $taskStream.Dispose()
  Write-Output ('Recorte validado e protegido: '+$taskArchive)
}else{
  if(-not $RuntimeFile){throw 'Runtime exclusivo obrigatório.'}
  $taskBytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($taskArchive),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $taskPsi=[Diagnostics.ProcessStartInfo]::new('node')
  $taskPsi.ArgumentList.Add((Join-Path $PSScriptRoot 'recuperar-recorte.mjs')); $taskPsi.ArgumentList.Add($RuntimeFile)
  if($ResumeObjects){$taskPsi.ArgumentList.Add('--resume-objects')}
  $taskPsi.UseShellExecute=$false; $taskPsi.CreateNoWindow=$true; $taskPsi.RedirectStandardInput=$true; $taskPsi.RedirectStandardOutput=$true; $taskPsi.RedirectStandardError=$true
  $taskPsi.StandardInputEncoding=[Text.UTF8Encoding]::new($false)
  $taskProcess=[Diagnostics.Process]::Start($taskPsi)
  $taskProcess.StandardInput.Write([Text.Encoding]::UTF8.GetString($taskBytes)); $taskProcess.StandardInput.Close(); [Array]::Clear($taskBytes)
  $taskOutput=$taskProcess.StandardOutput.ReadToEnd(); $taskError=$taskProcess.StandardError.ReadToEnd(); $taskProcess.WaitForExit()
  # O executor não imprime registros nem SQL de erro, apenas estágio/SQLSTATE.
  Write-Output $taskOutput
  if($taskProcess.ExitCode -ne 0){throw ('Recuperação isolada falhou: '+$taskError)}
}

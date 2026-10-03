import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
const arquivos = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
const problemas = []
for (const arquivo of arquivos) {
  if (/\/node_modules\/|^scratch\/|^dist\//.test(arquivo)) continue
  if (/(^|\/)\.env(?:$|\.)/.test(arquivo) && !arquivo.endsWith('.example')) problemas.push(`${arquivo}: arquivo de ambiente`)
  if (!/\.(?:[cm]?[jt]sx?|json|md|sql|ya?ml|toml|html|txt|ps1|example)$/.test(arquivo)) continue
  const texto = await readFile(arquivo, 'utf8')
  if (/(?:sb_secret_|sbp_|ghp_|github_pat_)[A-Za-z0-9_]{20,}/.test(texto)) problemas.push(`${arquivo}: possível credencial privada`)
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(texto)) problemas.push(`${arquivo}: chave privada`)
  for (const token of texto.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
      if (payload.role === 'service_role' || payload.sub) problemas.push(`${arquivo}: token privilegiado ou de sessão`)
    } catch { /* Tokens fictícios inválidos não são credenciais comprovadas. */ }
  }
}
if (problemas.length) { console.error([...new Set(problemas)].join('\n')); process.exitCode = 1 }
else console.log(`Verificação dirigida: ${arquivos.length} arquivos candidatos; nenhum padrão privado detectado. Não é garantia de ausência de todo segredo.`)

import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { prepararNotas, publicarNotas } from './release-notes.mjs'

const arquivo = new URL('../src/config/notasEvolucao.json', import.meta.url)
const args = process.argv.slice(2).filter(arg => arg !== '--from-main')
const [acao, versaoInformada, dataInformada] = args
// A proposta é sempre reconstruída das notas aprovadas em main. Assim uma
// atualização do PR automático não acumula nem perde itens da versão anterior.
const texto = acao === 'prepare' && process.argv.includes('--from-main')
  ? execFileSync('git', ['show', 'origin/main:src/config/notasEvolucao.json'], { encoding: 'utf8' })
  : readFileSync(arquivo, 'utf8')
const notas = JSON.parse(texto)
const versao = versaoInformada ?? JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
let resultado
if (acao === 'prepare') resultado = prepararNotas(notas, versao)
else if (acao === 'publish') resultado = publicarNotas(notas, versao, dataInformada)
else throw new Error('Uso: node scripts/sync-release-notes.mjs prepare [versão] | publish versão AAAA-MM-DD')
writeFileSync(arquivo, `${JSON.stringify(resultado, null, 2)}\n`)
console.log(`Notas ${acao === 'prepare' ? 'preparadas' : 'publicadas'} para ${versao}.`)

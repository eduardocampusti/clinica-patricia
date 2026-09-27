import { readFileSync } from 'node:fs'

const pacote = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
const manifesto = JSON.parse(readFileSync(new URL('../.release-please-manifest.json', import.meta.url), 'utf8'))
const releasePlease = JSON.parse(readFileSync(new URL('../release-please-config.json', import.meta.url), 'utf8'))
const notas = JSON.parse(readFileSync(new URL('../src/config/notasEvolucao.json', import.meta.url), 'utf8'))
const versao = pacote.version

if (lock.version !== versao || lock.packages[''].version !== versao) {
  throw new Error('Versão divergente entre package.json e lockfile.')
}
if (manifesto['.'] === '0.0.0' && releasePlease['initial-version'] !== versao) {
  throw new Error('A primeira versão proposta pelo Release Please deve corresponder à versão em desenvolvimento.')
}
const lancada = notas.versoesLancadas.find(item => item.versao === versao)
if (lancada) {
  if (manifesto['.'] !== versao || !lancada.resumo || !Object.values(lancada.notas).some(lista => lista.length)) {
    throw new Error(`A versão lançada ${versao} não está consistente com o manifesto e as notas.`)
  }
} else if (manifesto['.'] === versao || notas.versaoEmDesenvolvimento !== versao || !Object.values(notas.naoLancadas).some(lista => lista.length)) {
  throw new Error(`A versão em desenvolvimento ${versao} não possui notas em português vinculadas ao build.`)
}
console.log(`Versão ${versao} (${lancada ? 'lançada' : 'em desenvolvimento'}) e notas de evolução coerentes; referência do manifesto: ${manifesto['.']}.`)

import { readFileSync } from 'node:fs'
import { validarNotas } from './release-notes.mjs'

const pacote = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
const manifesto = JSON.parse(readFileSync(new URL('../.release-please-manifest.json', import.meta.url), 'utf8'))
const releasePlease = JSON.parse(readFileSync(new URL('../release-please-config.json', import.meta.url), 'utf8'))
const notas = JSON.parse(readFileSync(new URL('../src/config/notasEvolucao.json', import.meta.url), 'utf8'))
const estado = validarNotas({ pacote, lock, manifesto, config: releasePlease, notas })
console.log(`Versão ${pacote.version} ${estado}; referência do manifesto: ${manifesto['.']}.`)

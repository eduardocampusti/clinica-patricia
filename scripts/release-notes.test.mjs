import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prepararNotas, publicarNotas, validarNotas } from './release-notes.mjs'

const vazias = () => ({ novidades: [], melhorias: [], correcoes: [] })
const origem = () => ({
  versaoEmDesenvolvimento: '0.1.0',
  naoLancadas: { novidades: ['Cadastro de exemplo aprovado'], melhorias: [], correcoes: [] },
  versoesPreparadas: [],
  versoesLancadas: [],
})
const validar = (notas, versao, manifestVersion) => validarNotas({
  pacote: { version: versao },
  lock: { version: versao, packages: { '': { version: versao } } },
  manifesto: { '.': manifestVersion },
  config: { 'initial-version': '0.1.0' },
  notas,
})

test('preparação inicial de 0.1.0 e atualização idempotente da proposta', () => {
  const inicial = origem()
  assert.equal(validar(inicial, '0.1.0', '0.0.0'), 'em desenvolvimento')
  const preparada = prepararNotas(inicial, '0.1.0')
  assert.equal(validar(preparada, '0.1.0', '0.1.0'), 'em preparação')
  assert.deepEqual(preparada.naoLancadas, vazias())
  assert.deepEqual(prepararNotas(preparada, '0.1.0'), preparada)
  const revisada = prepararNotas({ ...inicial, naoLancadas: { ...inicial.naoLancadas, correcoes: ['Texto revisto'] } }, '0.1.0')
  assert.equal(revisada.versoesPreparadas.length, 1)
  assert.deepEqual(revisada.versoesPreparadas[0].notas.correcoes, ['Texto revisto'])
  assert.equal(inicial.versoesPreparadas.length, 0)
})

test('manifesto e pacote iguais não comprovam publicação', () => {
  assert.throws(() => validar(origem(), '0.1.0', '0.1.0'), /notas vinculadas/)
  assert.equal(validar(prepararNotas(origem(), '0.1.0'), '0.1.0', '0.1.0'), 'em preparação')
})

test('publicação simulada, desenvolvimento seguinte e instalação antiga', () => {
  const pacoteAntigo = structuredClone(origem())
  const preparada = prepararNotas(origem(), '0.1.0')
  const publicada = publicarNotas(preparada, '0.1.0', '2026-09-26')
  assert.equal(validar(publicada, '0.1.0', '0.1.0'), 'publicada')
  assert.deepEqual(publicarNotas(publicada, '0.1.0', '2026-09-27'), publicada)
  assert.equal(publicada.versoesPreparadas.length, 0)
  assert.equal(publicada.versoesLancadas[0].lancadaEm, '2026-09-26')
  const seguinte = { ...publicada, naoLancadas: { ...vazias(), correcoes: ['Correção seguinte'] } }
  assert.equal(validar(seguinte, '0.1.0', '0.1.0'), 'publicada')
  assert.equal(pacoteAntigo.versoesLancadas.length, 0)
  assert.equal(validar(pacoteAntigo, '0.1.0', '0.0.0'), 'em desenvolvimento')
})

test('próxima correção 0.1.1 e funcionalidade 0.2.0 mantêm histórico sem duplicar', () => {
  const publicada = publicarNotas(prepararNotas(origem(), '0.1.0'), '0.1.0', '2026-09-26')
  const comCorrecao = { ...publicada, naoLancadas: { ...vazias(), correcoes: ['Correção aprovada'] } }
  const patch = prepararNotas(comCorrecao, '0.1.1')
  assert.equal(validar(patch, '0.1.1', '0.1.1'), 'em preparação')
  const patchPublicado = publicarNotas(patch, '0.1.1', '2026-10-01')
  const comFuncionalidade = { ...patchPublicado, naoLancadas: { ...vazias(), novidades: ['Funcionalidade aprovada'] } }
  const minor = prepararNotas(comFuncionalidade, '0.2.0')
  assert.equal(validar(minor, '0.2.0', '0.2.0'), 'em preparação')
  assert.deepEqual(minor.versoesLancadas.map(item => item.versao), ['0.1.0', '0.1.1'])
  assert.deepEqual(minor.versoesPreparadas.map(item => item.versao), ['0.2.0'])
  assert.throws(() => prepararNotas(minor, '0.1.0'), /já foi publicada/)
})

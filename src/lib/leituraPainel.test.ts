import { test } from 'node:test'
import assert from 'node:assert/strict'
import { concluirLeitura, falharLeitura, iniciarLeitura, instanteConservador, leituraDoContexto, type Leitura } from './leituraPainel'

const CLINICA_A = 'clinica-a:2026-10-09', CLINICA_B = 'clinica-b:2026-10-09'
const pronta: Leitura<string> = { chave: CLINICA_A, dado: 'movimento', em: '2026-10-09T12:00:00Z', carregando: false }

test('releitura no mesmo contexto conserva o resultado, sem piscar esqueleto', () => {
  const emAndamento = iniciarLeitura(pronta, CLINICA_A)
  assert.equal(emAndamento.dado, 'movimento')
  assert.equal(emAndamento.em, '2026-10-09T12:00:00Z')
  assert.equal(emAndamento.carregando, true)
  assert.equal(emAndamento.erro, undefined)
})

test('contexto novo nunca reaproveita dado nem horário do contexto anterior', () => {
  const trocada = iniciarLeitura(pronta, CLINICA_B)
  assert.equal(trocada.dado, undefined)
  assert.equal(trocada.em, undefined)
  assert.equal(trocada.carregando, true)
})

test('erro anterior não sobrevive ao início de uma nova tentativa', () => {
  const comErro: Leitura<string> = { chave: CLINICA_A, em: pronta.em, erro: 'leitura', carregando: false }
  assert.equal(iniciarLeitura(comErro, CLINICA_A).erro, undefined)
})

test('falha de leitura retira o número da tela e preserva a última leitura válida', () => {
  const falhou = falharLeitura(pronta, CLINICA_A, 'leitura')
  assert.equal(falhou.dado, undefined, 'número defasado não pode ser apresentado como atual')
  assert.equal(falhou.em, '2026-10-09T12:00:00Z')
  assert.equal(falhou.erro, 'leitura')
  assert.equal(falhou.carregando, false)
})

test('recusa de permissão limpa dado e horário da informação protegida', () => {
  const recusada = falharLeitura(pronta, CLINICA_A, 'permissao')
  assert.equal(recusada.dado, undefined)
  assert.equal(recusada.em, undefined)
  assert.equal(recusada.erro, 'permissao')
})

test('falha em contexto novo não herda o horário do contexto anterior', () => {
  assert.equal(falharLeitura(pronta, CLINICA_B, 'leitura').em, undefined)
})

test('resposta tardia de outro contexto não é publicada', () => {
  const tardia = concluirLeitura(CLINICA_B, 'movimento de outra clínica', '2026-10-09T12:00:05Z')
  const publicada = leituraDoContexto(tardia, CLINICA_A)
  assert.equal(publicada.dado, undefined)
  assert.equal(publicada.carregando, true)
  assert.equal(publicada.chave, CLINICA_A)
})

test('resultado do contexto atual é publicado como está', () => {
  assert.deepEqual(leituraDoContexto(pronta, CLINICA_A), pronta)
})

test('instante conservador usa a leitura mais antiga entre as bem-sucedidas', () => {
  assert.equal(instanteConservador('2026-10-09T12:00:30Z', '2026-10-09T12:00:00Z'), '2026-10-09T12:00:00Z')
  assert.equal(instanteConservador(undefined, '2026-10-09T12:00:00Z'), '2026-10-09T12:00:00Z')
  assert.equal(instanteConservador(undefined, undefined), undefined)
  assert.equal(instanteConservador('data inválida', '2026-10-09T12:00:00Z'), '2026-10-09T12:00:00Z')
})

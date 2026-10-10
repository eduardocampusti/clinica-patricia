import assert from 'node:assert/strict'
import test from 'node:test'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ConfiguracaoFinanceiraAusenteError, obterConfiguracaoFinanceira } from '../src/env.js'
import { canonicalizar } from '../src/financeiro/canonicalizacao.js'
import { assinaturaValidaParaTeste, criarAssercaoFinanceira, hashPayload } from '../src/financeiro/assercao.js'
import { executarComandoFinanceiro } from '../src/financeiro/http.js'
import { normalizarPayload } from '../src/financeiro/tipos.js'

test('canonicalização é determinística e ordena chaves recursivamente', () => {
  const a = canonicalizar({ z: 1, a: { y: true, x: ['á', 2] } })
  const b = canonicalizar({ a: { x: ['á', 2], y: true }, z: 1 })
  assert.equal(a, b)
  assert.equal(a, '{"a":{"x":["á",2],"y":true},"z":1}')
})

test('canonicalização rejeita números não finitos', () => {
  assert.throws(() => canonicalizar({ valor: Number.NaN }), /NaN/)
  assert.throws(() => canonicalizar({ valor: Number.POSITIVE_INFINITY }), /Infinity/)
})

test('asserção vincula identidade, clínica, operação, idempotência e payload', () => {
  const chave = 'chave-de-teste-que-nunca-sera-usada-em-ambiente-real'
  const payload = { valor_abertura: 10 }
  const resultado = criarAssercaoFinanceira({
    usuarioId: '11111111-1111-4111-8111-111111111111',
    clinicaId: '22222222-2222-4222-8222-222222222222',
    operacao: 'abrir_caixa',
    idempotencyKey: '33333333-3333-4333-8333-333333333333',
    payload,
    chave,
    keyId: 'financeiro-hmac-v1',
    agora: new Date('2026-08-11T12:00:00.000Z'),
    jti: '44444444-4444-4444-8444-444444444444',
  })

  assert.equal(resultado.dados.request_hash, hashPayload(payload))
  assert.equal(resultado.dados.exp - resultado.dados.iat, 30)
  assert.equal(assinaturaValidaParaTeste(resultado.texto, resultado.assinatura, chave), true)
  assert.equal(assinaturaValidaParaTeste(resultado.texto.replace('abrir_caixa', 'fechar_caixa'), resultado.assinatura, chave), false)
})

test('contrato de cortesia exige motivo e não aceita pagamentos', () => {
  assert.throws(
    () => normalizarPayload('registrar_cobranca', {
      paciente_id: 'p', profissional_id: 'm', valor_total: 100, status: 'cortesia', pagamentos: [],
    }),
    /Cortesia exige motivo/,
  )

  assert.deepEqual(normalizarPayload('registrar_cobranca', {
    paciente_id: 'p',
    profissional_id: 'm',
    valor_total: 100,
    status: 'cortesia',
    motivo_cortesia: 'Ação social autorizada',
    pagamentos: [{ forma_pagamento: 'dinheiro', valor: 100 }],
  }), {
    paciente_id: 'p',
    profissional_id: 'm',
    agendamento_id: null,
    valor_total: 100,
    status: 'cortesia',
    motivo_cortesia: 'Ação social autorizada',
    numero_nota_fiscal: null,
    descricao: null,
    pagamentos: [],
  })
})

test('pagamento de repasse não recebe valor parcial do cliente', () => {
  const payload = normalizarPayload('pagar_repasse_integral', {
    repasse_id: 'repasse-1',
    forma_pagamento: 'pix',
    valor: 1,
  })
  assert.deepEqual(payload, { repasse_id: 'repasse-1', forma_pagamento: 'pix', pago_em: null })
})

test('configuração financeira só é obrigatória no uso da fronteira privada', async () => {
  const databaseUrlAnterior = process.env.FINANCEIRO_DATABASE_URL
  const hmacAnterior = process.env.FINANCEIRO_ASSERTION_HMAC_KEY
  delete process.env.FINANCEIRO_DATABASE_URL
  delete process.env.FINANCEIRO_ASSERTION_HMAC_KEY

  try {
    assert.throws(
      obterConfiguracaoFinanceira,
      (error: unknown) => error instanceof ConfiguracaoFinanceiraAusenteError
        && error.variaveisAusentes.includes('FINANCEIRO_DATABASE_URL')
        && error.variaveisAusentes.includes('FINANCEIRO_ASSERTION_HMAC_KEY'),
    )

    let status = 0
    let resposta: unknown
    const reply = {
      code(codigo: number) {
        status = codigo
        return this
      },
      send(corpo: unknown) {
        resposta = corpo
        return corpo
      },
    } as unknown as FastifyReply
    const request = {
      headers: { 'idempotency-key': '11111111-1111-4111-8111-111111111111' },
      usuario: { id: '22222222-2222-4222-8222-222222222222' },
      clinicaAtiva: { id: '33333333-3333-4333-8333-333333333333' },
      body: { valor_abertura: 0 },
      log: { error() {} },
    } as unknown as FastifyRequest

    await executarComandoFinanceiro(request, reply, 'abrir_caixa', 201)
    assert.equal(status, 503)
    assert.deepEqual(resposta, {
      erro: 'Funcionalidade financeira indisponível: configuração do servidor incompleta.',
    })
  } finally {
    if (databaseUrlAnterior === undefined) delete process.env.FINANCEIRO_DATABASE_URL
    else process.env.FINANCEIRO_DATABASE_URL = databaseUrlAnterior
    if (hmacAnterior === undefined) delete process.env.FINANCEIRO_ASSERTION_HMAC_KEY
    else process.env.FINANCEIRO_ASSERTION_HMAC_KEY = hmacAnterior
  }
})

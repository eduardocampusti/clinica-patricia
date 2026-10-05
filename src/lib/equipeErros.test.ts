import assert from 'node:assert/strict'
import test from 'node:test'
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { consultaLegadaEquipePermitida, erroEquipeSeguro, interpretarErroAcessoEquipe, respostaAcessoEquipeReconhecida } from './equipeErros'

const textoPrivado = 'SQL equipe_membros CPF 000.000.000-00 terceiro@synthetic.invalid token=segredo-sintetico'

test('Response real do SDK preserva código/status, clona o corpo e nunca exibe texto remoto', async () => {
  const resposta = new Response(JSON.stringify({ codigo: 'DUPLICIDADE', erro: textoPrivado }), { status: 422 })
  const erro = await interpretarErroAcessoEquipe(new FunctionsHttpError(resposta), true)
  assert.equal(erro.codigo, 'DUPLICIDADE')
  assert.equal(erro.status, 422)
  assert.equal(erro.categoria, 'conflito')
  assert.equal(erro.resultadoIncerto, false)
  assert.equal(resposta.bodyUsed, false)
  assert.ok(!erro.mensagem.includes(textoPrivado))
})

test('categorias vêm de status e códigos, não de palavras do servidor', async () => {
  const casos = [
    [401, undefined, 'sessao'], [403, 'DUPLICIDADE', 'permissao'], [422, 'DADOS_INVALIDOS', 'validacao'],
    [409, undefined, 'conflito'], [429, undefined, 'limite'], [503, undefined, 'servico'],
    [404, 'CONTA_NAO_ENCONTRADA', 'desconhecido'], [422, 'CONTA_AUTH_DIVERGENTE', 'validacao'],
    [403, 'EMAIL_NAO_CONFIRMADO', 'permissao'], [422, 'DESCONHECIDO', 'validacao'],
  ] as const
  for (const [status, codigo, categoria] of casos) {
    const erro = await interpretarErroAcessoEquipe(new FunctionsHttpError(new Response(JSON.stringify({ codigo, erro: textoPrivado }), { status })), true)
    assert.equal(erro.categoria, categoria)
    assert.equal(erro.status, status)
    assert.ok(!/SQL|CPF|synthetic|segredo|existe/u.test(erro.mensagem))
  }
  assert.equal(erroEquipeSeguro({ message: 'sessão inválida permissão negada rede indisponível' }).categoria, 'desconhecido')
  for (const erro of ['Aguarde o envio atual terminar.', 'Aguarde um minuto antes de reenviar o convite.']) {
    assert.equal(erroEquipeSeguro({ codigo: 'DADOS_INVALIDOS', status: 422, erro }, true).categoria, 'limite')
    assert.equal(erroEquipeSeguro({ codigo: 'OUTRO', status: 422, erro }, true).categoria, 'validacao')
  }
  assert.equal(erroEquipeSeguro({ codigo: 'DADOS_INVALIDOS', status: 422, erro: 'Aguarde um minuto antes de reenviar o convite. ' + textoPrivado }).categoria, 'validacao')
})

test('corpo vazio, não JSON, array e primitivo mantêm status sem lançar', async () => {
  for (const corpo of ['', 'não JSON', '[]', 'null', '42', '"texto"']) {
    const erro = await interpretarErroAcessoEquipe(new FunctionsHttpError(new Response(corpo, { status: 401 })))
    assert.equal(erro.categoria, 'sessao')
    assert.equal(erro.status, 401)
  }
  const consumida = new Response('{}', { status: 503 })
  await consumida.text()
  assert.equal((await interpretarErroAcessoEquipe(new FunctionsHttpError(consumida))).categoria, 'servico')
})

test('rede/relay e falha desconhecida distinguem leitura de escrita incerta', async () => {
  for (const error of [new FunctionsFetchError(new Error(textoPrivado)), new FunctionsRelayError(new Response('', { status: 502 })), new SyntaxError(textoPrivado)]) {
    assert.equal((await interpretarErroAcessoEquipe(error)).resultadoIncerto, false)
    const escrita = await interpretarErroAcessoEquipe(error, true)
    assert.equal(escrita.resultadoIncerto, true)
    assert.match(escrita.mensagem, /Confira o estado atual/u)
    assert.ok(!escrita.mensagem.includes(textoPrivado))
  }
  assert.equal((await interpretarErroAcessoEquipe(new FunctionsFetchError(null))).categoria, 'rede')
  assert.equal((await interpretarErroAcessoEquipe(new FunctionsRelayError(new Response('', { status: 200 })))).categoria, 'servico')
})

test('erros previamente interpretados preservam código técnico seguro', async () => {
  assert.equal((await interpretarErroAcessoEquipe({ context: { body: { codigo: 'DADOS_INVALIDOS', erro: textoPrivado }, status: 422 } })).codigo, 'DADOS_INVALIDOS')
  assert.equal(erroEquipeSeguro({ codigo: textoPrivado }).codigo, 'ERRO_DESCONHECIDO')
  assert.equal(erroEquipeSeguro({ code: '42501' }).categoria, 'permissao')
  assert.equal(erroEquipeSeguro({ code: 'PGRST301' }).categoria, 'sessao')
  assert.equal(erroEquipeSeguro({ status: 0 }, true).resultadoIncerto, true)
})

test('compatibilidade não decorre de HTTP, permissão, mensagem ou função interna ausente', () => {
  assert.equal(consultaLegadaEquipePermitida({ code: 'PGRST202' }), true)
  assert.equal(consultaLegadaEquipePermitida({ code: '42883', message: 'function public.equipe_listar(uuid) does not exist' }), true)
  for (const erro of [{ status: 404 }, { code: '42501' }, { code: 'PGRST301' }, { code: '42883', message: 'function interna does not exist' }, { message: 'migration ausente equipe_listar' }, null]) {
    assert.equal(consultaLegadaEquipePermitida(erro), false)
  }
})

test('respostas inesperadas não comprovam sucesso; contratos atuais são reconhecidos', () => {
  for (const acao of ['listar', 'alterar', 'preparar', 'reenviar', 'aceitar']) {
    for (const data of [null, [], '', {}, { surpresa: true }, { erro: textoPrivado }, { status: 'desconhecido' }]) assert.equal(respostaAcessoEquipeReconhecida(data, acao), false)
  }
  assert.equal(respostaAcessoEquipeReconhecida({ membro_id: 'sintetico', clinicas: [], convites: [] }, 'listar'), true)
  assert.equal(respostaAcessoEquipeReconhecida({ clinica_id: 'sintetica', status: 'acesso_ativo' }, 'alterar'), true)
  assert.equal(respostaAcessoEquipeReconhecida({ id: 'sintetico', status: 'enviado' }, 'preparar'), true)
  assert.equal(respostaAcessoEquipeReconhecida({ id: 'sintetico', status: 'enviado' }, 'reenviar'), true)
  assert.equal(respostaAcessoEquipeReconhecida({ status: 'aceito' }, 'aceitar'), true)
})

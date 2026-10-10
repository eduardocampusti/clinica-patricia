import { randomUUID } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ConfiguracaoFinanceiraAusenteError, obterConfiguracaoFinanceira } from '../env.js'
import { criarAssercaoFinanceira } from './assercao.js'
import { executarRpcFinanceira } from './rpc.js'
import { normalizarPayload, type OperacaoFinanceira } from './tipos.js'

export async function executarComandoFinanceiro(
  request: FastifyRequest,
  reply: FastifyReply,
  operacao: OperacaoFinanceira,
  sucessoStatus = 200,
) {
  const idempotencyKey = request.headers['idempotency-key']
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return reply.code(400).send({ erro: 'Header Idempotency-Key inválido ou ausente.' })
  }
  if (!request.usuario || !request.clinicaAtiva) {
    return reply.code(500).send({ erro: 'Contexto autenticado incompleto.' })
  }

  let payload
  try {
    payload = normalizarPayload(operacao, request.body)
  } catch (error) {
    return reply.code(400).send({ erro: error instanceof Error ? error.message : 'Payload inválido.' })
  }

  try {
    const configuracao = obterConfiguracaoFinanceira()
    const assercao = criarAssercaoFinanceira({
      usuarioId: request.usuario.id,
      clinicaId: request.clinicaAtiva.id,
      operacao,
      idempotencyKey,
      payload,
      chave: configuracao.assertionHmacKey,
      keyId: configuracao.assertionKeyId,
      jti: randomUUID(),
    })
    const resultado = await executarRpcFinanceira(operacao, assercao.texto, assercao.assinatura)
    return reply.code(sucessoStatus).send(resultado)
  } catch (error) {
    if (error instanceof ConfiguracaoFinanceiraAusenteError) {
      request.log.error(
        { operacao, variaveisAusentes: error.variaveisAusentes },
        'Configuração financeira privada indisponível',
      )
      return reply.code(503).send({
        erro: 'Funcionalidade financeira indisponível: configuração do servidor incompleta.',
      })
    }
    const codigo = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
    const mensagem = error instanceof Error ? error.message : ''
    if (codigo === '42501' || mensagem.includes('FINANCEIRO_SEM_PERMISSAO')) {
      return reply.code(403).send({ erro: 'Você não tem permissão para esta operação financeira.' })
    }
    if (codigo === '23505' || mensagem.includes('FINANCEIRO_CONFLITO')) {
      return reply.code(409).send({ erro: 'A operação conflita com o estado financeiro atual.' })
    }
    if (mensagem.includes('FINANCEIRO_VALIDACAO')) {
      return reply.code(400).send({ erro: mensagem.replace(/^.*FINANCEIRO_VALIDACAO:\s*/, '') })
    }
    // Não serializar o erro bruto do driver: detalhes PostgreSQL podem conter
    // valores financeiros ou identificadores internos.
    request.log.error({ codigo: codigo || 'desconhecido', operacao }, 'Falha em comando financeiro')
    return reply.code(500).send({ erro: 'Não foi possível concluir a operação financeira.' })
  }
}

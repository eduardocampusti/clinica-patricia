import type { FastifyInstance } from 'fastify'
import { executarComandoFinanceiro } from '../financeiro/http.js'
import { requireAuth } from '../plugins/auth.js'
import { resolveClinicaAtiva } from '../plugins/clinicaAtiva.js'

// Mantém a URL existente, mas o contrato passa a representar uma cobrança
// paga, pendente ou cortesia. Nenhum INSERT direto é realizado pelo servidor.
export async function entradaCaixaRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, resolveClinicaAtiva]

  fastify.post('/api/caixa/entrada', { preHandler }, (request, reply) =>
    executarComandoFinanceiro(request, reply, 'registrar_cobranca', 201))

  fastify.post('/api/financeiro/cobrancas', { preHandler }, (request, reply) =>
    executarComandoFinanceiro(request, reply, 'registrar_cobranca', 201))

  fastify.post('/api/financeiro/cobrancas/:id/receber', { preHandler }, (request, reply) => {
    const params = request.params as { id?: string }
    request.body = { ...(request.body as Record<string, unknown>), cobranca_id: params.id }
    return executarComandoFinanceiro(request, reply, 'receber_cobranca', 201)
  })
}

import type { FastifyInstance } from 'fastify'
import { executarComandoFinanceiro } from '../financeiro/http.js'
import { requireAuth } from '../plugins/auth.js'
import { resolveClinicaAtiva } from '../plugins/clinicaAtiva.js'

export async function despesasRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, resolveClinicaAtiva]

  fastify.post('/api/financeiro/despesas', { preHandler }, (request, reply) =>
    executarComandoFinanceiro(request, reply, 'registrar_despesa', 201))

  fastify.post('/api/financeiro/despesas/:id/pagar', { preHandler }, (request, reply) => {
    const params = request.params as { id?: string }
    request.body = { ...(request.body as Record<string, unknown>), despesa_id: params.id }
    return executarComandoFinanceiro(request, reply, 'pagar_despesa')
  })
}

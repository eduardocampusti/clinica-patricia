import type { FastifyInstance } from 'fastify'
import { executarComandoFinanceiro } from '../financeiro/http.js'
import { requireAuth } from '../plugins/auth.js'
import { resolveClinicaAtiva } from '../plugins/clinicaAtiva.js'

export async function repassesRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/financeiro/repasses/:id/pagar',
    { preHandler: [requireAuth, resolveClinicaAtiva] },
    (request, reply) => {
      const params = request.params as { id?: string }
      request.body = { ...(request.body as Record<string, unknown>), repasse_id: params.id }
      return executarComandoFinanceiro(request, reply, 'pagar_repasse_integral')
    },
  )
}

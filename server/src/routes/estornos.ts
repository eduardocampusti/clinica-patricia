import type { FastifyInstance } from 'fastify'
import { executarComandoFinanceiro } from '../financeiro/http.js'
import { requireAuth } from '../plugins/auth.js'
import { resolveClinicaAtiva } from '../plugins/clinicaAtiva.js'

export async function estornosRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/financeiro/estornos',
    { preHandler: [requireAuth, resolveClinicaAtiva] },
    (request, reply) => executarComandoFinanceiro(request, reply, 'estornar_lancamento', 201),
  )
}

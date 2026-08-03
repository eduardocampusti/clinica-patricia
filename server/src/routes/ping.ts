import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../plugins/auth.js'
import { resolveClinicaAtiva } from '../plugins/clinicaAtiva.js'

export async function pingRoutes(fastify: FastifyInstance) {
  fastify.get('/api/ping', { preHandler: [requireAuth, resolveClinicaAtiva] }, async (request) => {
    return {
      usuario: request.usuario,
      clinica: request.clinicaAtiva,
    }
  })
}

import type { FastifyInstance } from 'fastify'
import { executarComandoFinanceiro } from '../financeiro/http.js'
import { requireAuth } from '../plugins/auth.js'
import { resolveClinicaAtiva } from '../plugins/clinicaAtiva.js'

export async function caixaRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, resolveClinicaAtiva]

  fastify.post('/api/caixa/abrir', { preHandler }, (request, reply) =>
    executarComandoFinanceiro(request, reply, 'abrir_caixa', 201))

  fastify.post('/api/caixa/sangrias', { preHandler }, (request, reply) =>
    executarComandoFinanceiro(request, reply, 'registrar_sangria', 201))

  fastify.post('/api/caixa/suprimentos', { preHandler }, (request, reply) =>
    executarComandoFinanceiro(request, reply, 'registrar_suprimento', 201))

  fastify.post('/api/caixa/fechar', { preHandler }, (request, reply) =>
    executarComandoFinanceiro(request, reply, 'fechar_caixa'))
}

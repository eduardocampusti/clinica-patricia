import type { FastifyReply, FastifyRequest } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { criarClientDaRequisicao } from '../supabase.js'

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: { id: string; email: string | null }
    supabaseClient?: SupabaseClient
  }
}

// preHandler: valida o Bearer token contra o Supabase Auth (auth.getUser).
// Não decodifica o JWT localmente — evita precisar do segredo de assinatura
// do token, que seria tão sensível quanto uma chave privilegiada.
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!token) {
    return reply.code(401).send({ erro: 'Token de autenticação ausente.' })
  }

  const supabaseClient = criarClientDaRequisicao(token)
  const { data, error } = await supabaseClient.auth.getUser(token)

  if (error || !data.user) {
    return reply.code(401).send({ erro: 'Token de autenticação inválido ou expirado.' })
  }

  request.usuario = { id: data.user.id, email: data.user.email ?? null }
  request.supabaseClient = supabaseClient
}

import type { FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    clinicaAtiva?: { id: string; nome: string }
  }
}

// preHandler: lê o header X-Clinica-Id e confirma, via RLS (mesmo client
// escopado ao token do usuário, decorado por requireAuth), que essa clínica
// pertence ao usuário logado. Não é resolução por subdomínio ainda (ver
// server/README.md) — é a ponte mínima até essa etapa existir.
// Precisa rodar DEPOIS de requireAuth na cadeia de preHandlers da rota.
export async function resolveClinicaAtiva(request: FastifyRequest, reply: FastifyReply) {
  const clinicaId = request.headers['x-clinica-id']

  if (!clinicaId || Array.isArray(clinicaId)) {
    return reply.code(400).send({ erro: 'Header X-Clinica-Id obrigatório.' })
  }

  if (!request.supabaseClient) {
    return reply.code(500).send({ erro: 'Contexto de autenticação ausente (requireAuth não rodou antes).' })
  }

  const { data, error } = await request.supabaseClient
    .from('clinicas')
    .select('id, nome')
    .eq('id', clinicaId)
    .eq('ativo', true)
    .single()

  if (error || !data) {
    return reply.code(403).send({ erro: 'Sem acesso a esta clínica.' })
  }

  request.clinicaAtiva = data
}

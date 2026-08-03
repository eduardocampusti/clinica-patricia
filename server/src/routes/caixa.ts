import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../plugins/auth.js'
import { resolveClinicaAtiva } from '../plugins/clinicaAtiva.js'

interface AbrirCaixaBody {
  valor_abertura?: unknown
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export async function caixaRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: AbrirCaixaBody }>(
    '/api/caixa/abrir',
    { preHandler: [requireAuth, resolveClinicaAtiva] },
    async (request, reply) => {
      const valorAbertura = request.body?.valor_abertura

      if (typeof valorAbertura !== 'number' || !Number.isFinite(valorAbertura) || valorAbertura < 0) {
        return reply.code(400).send({ erro: 'Informe um valor_abertura numérico e não negativo.' })
      }

      const supabase = request.supabaseClient!
      const clinicaId = request.clinicaAtiva!.id

      // Checagem prévia (amigável): quem garante de verdade é o índice
      // único parcial no banco (sessoes_caixa_aberta_unica) — isto é só UX.
      const { data: sessaoExistente } = await supabase
        .from('sessoes_caixa')
        .select('aberto_em')
        .eq('clinica_id', clinicaId)
        .eq('status', 'aberto')
        .maybeSingle()

      if (sessaoExistente) {
        return reply.code(409).send({
          erro: `Já existe uma sessão de caixa aberta, iniciada às ${formatarHora(sessaoExistente.aberto_em)}.`,
        })
      }

      const { data, error } = await supabase
        .from('sessoes_caixa')
        .insert({ clinica_id: clinicaId, valor_abertura: valorAbertura })
        .select('id, clinica_id, aberto_por, valor_abertura, aberto_em, status')
        .single()

      if (error) {
        // 23505: índice único parcial pegou uma corrida (dois cliques
        // quase simultâneos) que a checagem prévia não pegou a tempo.
        if (error.code === '23505') {
          return reply.code(409).send({ erro: 'Já existe uma sessão de caixa aberta para esta clínica.' })
        }
        // 42501: RLS rejeitou (usuário sem papel proprietaria/recepcao).
        if (error.code === '42501') {
          return reply.code(403).send({ erro: 'Você não tem permissão para abrir o caixa desta clínica.' })
        }
        request.log.error(error, 'Erro ao abrir caixa')
        return reply.code(500).send({ erro: 'Não foi possível abrir o caixa. Tente novamente.' })
      }

      return reply.code(201).send(data)
    },
  )
}

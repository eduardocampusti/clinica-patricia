import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../plugins/auth.js'
import { resolveClinicaAtiva } from '../plugins/clinicaAtiva.js'

const FORMAS_PAGAMENTO = [
  'dinheiro',
  'pix',
  'cartao_debito',
  'cartao_credito',
  'transferencia',
  'convenio',
  'cortesia',
] as const

type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

interface RegistrarEntradaBody {
  forma_pagamento?: unknown
  valor?: unknown
  descricao?: unknown
}

function ehFormaPagamentoValida(valor: unknown): valor is FormaPagamento {
  return typeof valor === 'string' && (FORMAS_PAGAMENTO as readonly string[]).includes(valor)
}

export async function entradaCaixaRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: RegistrarEntradaBody }>(
    '/api/caixa/entrada',
    { preHandler: [requireAuth, resolveClinicaAtiva] },
    async (request, reply) => {
      const formaPagamento = request.body?.forma_pagamento
      const valor = request.body?.valor
      const descricao = request.body?.descricao

      if (!ehFormaPagamentoValida(formaPagamento)) {
        return reply.code(400).send({ erro: 'Informe uma forma de pagamento válida.' })
      }

      if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
        return reply.code(400).send({ erro: 'Informe um valor numérico maior que zero.' })
      }

      const descricaoTratada = typeof descricao === 'string' && descricao.trim() ? descricao.trim() : null

      const supabase = request.supabaseClient!
      const clinicaId = request.clinicaAtiva!.id

      // O cliente nunca escolhe a sessão: o servidor resolve a sessão 'aberto'
      // da clínica ativa. Isso já elimina a possibilidade de mandar um
      // sessao_caixa_id de outra clínica ou de uma sessão fechada.
      const { data: sessaoAberta } = await supabase
        .from('sessoes_caixa')
        .select('id')
        .eq('clinica_id', clinicaId)
        .eq('status', 'aberto')
        .maybeSingle()

      if (!sessaoAberta) {
        return reply.code(409).send({ erro: 'Nenhum caixa aberto. Abra o caixa antes de registrar uma entrada.' })
      }

      const { data, error } = await supabase
        .from('entradas_caixa')
        .insert({
          sessao_caixa_id: sessaoAberta.id,
          clinica_id: clinicaId,
          forma_pagamento: formaPagamento,
          valor,
          descricao: descricaoTratada,
        })
        .select('id, sessao_caixa_id, clinica_id, forma_pagamento, valor, descricao, registrado_por, registrado_em')
        .single()

      if (error) {
        // 42501: RLS rejeitou (usuário sem papel proprietaria/recepcao).
        if (error.code === '42501') {
          return reply.code(403).send({ erro: 'Você não tem permissão para registrar entradas nesta clínica.' })
        }
        request.log.error(error, 'Erro ao registrar entrada de caixa')
        return reply.code(500).send({ erro: 'Não foi possível registrar a entrada. Tente novamente.' })
      }

      return reply.code(201).send(data)
    },
  )
}

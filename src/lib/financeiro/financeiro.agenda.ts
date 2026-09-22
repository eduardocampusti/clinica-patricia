import { mapearErroFinanceiro, ErroFinanceiro } from './financeiro.errors'
import { decimalBancoParaCentavos } from './financeiro.money'
import type { UUID } from './financeiro.types'

export function podeReceberNaAgenda(papel: string | null, status: string): boolean {
  return (papel === 'proprietaria' || papel === 'recepcao') && ['agendado', 'confirmado', 'aguardando'].includes(status)
}

// Leitura sob RLS; o preço definitivo é relido e validado na transação da RPC.
export async function consultarPrecoConsulta(clinicaId: UUID, profissionalId: UUID): Promise<bigint> {
  const { supabase } = await import('../supabase')
  const { data, error } = await supabase.from('profissionais_clinicas')
    .select('valor_consulta').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId)
    .eq('ativo', true).maybeSingle()
  if (error) throw mapearErroFinanceiro(error)
  if (data?.valor_consulta == null || decimalBancoParaCentavos(data.valor_consulta) <= 0n) {
    throw new ErroFinanceiro('configuracao_ausente', 'O preço da consulta não está configurado para este profissional nesta clínica. Solicite a configuração à proprietária.')
  }
  return decimalBancoParaCentavos(data.valor_consulta)
}

export async function consultarRecebimentosAgenda(clinicaId: UUID, agendamentos: UUID[]): Promise<Set<UUID>> {
  if (!agendamentos.length) return new Set()
  const { supabase } = await import('../supabase')
  const { data, error } = await supabase.from('recebimentos').select('agendamento_id')
    .eq('clinica_id', clinicaId).in('agendamento_id', agendamentos)
  if (error) throw mapearErroFinanceiro(error)
  return new Set((data ?? []).map((linha) => linha.agendamento_id as string))
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { referenciaAgoraAgenda } from '../lib/agendaBlocosApresentacao'
import { useAgoraAgenda } from './useAgoraAgenda'
import { sugestoesRemarcacao, type LeituraIntervaloAgenda, type SugestaoRemarcacao } from '../lib/agendaSugestoes'
import { somarDiasAgenda } from './useResumoDiasAgenda'

const DIAS = 14

// Próximos horários livres do mesmo profissional, a partir de hoje, em uma leitura por intervalo
// (mesmas tabelas da faixa de dias). Somente sugestão: o servidor valida ao salvar. Falha não bloqueia.
export function useSugestoesRemarcacao({ clinicaId, profissionalId, proprioId, dataAtual, inicioAtual, duracao, somenteMesmaData }: {
  clinicaId: string; profissionalId: string; proprioId: string; dataAtual: string; inicioAtual: string; duracao: number | null; somenteMesmaData: boolean
}): { estado: 'carregando' | 'pronta' | 'erro'; sugestoes: SugestaoRemarcacao[]; hoje: string } {
  const agora = useAgoraAgenda()
  const { hoje, horaAgora } = referenciaAgoraAgenda(agora)
  const fim = somarDiasAgenda(hoje, DIAS - 1)
  const contexto = `${clinicaId}/${profissionalId}/${hoje}`
  const [leitura, setLeitura] = useState<{ contexto: string; estado: 'carregando' | 'pronta' | 'erro'; dados: LeituraIntervaloAgenda | null }>({ contexto: '', estado: 'carregando', dados: null })
  useEffect(() => {
    let atual = true
    setLeitura({ contexto, estado: 'carregando', dados: null })
    if (clinicaId && profissionalId) void Promise.all([
      supabase.from('disponibilidade_padrao').select('dia_semana, hora_inicio, hora_fim').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId).eq('ativo', true),
      supabase.from('agenda_excecoes').select('data, tipo, hora_inicio, hora_fim').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId).gte('data', hoje).lte('data', fim),
      supabase.from('agendamentos').select('id, data, hora_inicio, hora_fim, status').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId).gte('data', hoje).lte('data', fim),
    ]).then(([p, e, a]) => {
      if (!atual) return
      if (p.error || e.error || a.error) throw new Error('Sugestões indisponíveis')
      setLeitura({ contexto, estado: 'pronta', dados: { padrao: p.data ?? [], excecoes: e.data ?? [], ocupacoes: a.data ?? [] } })
    }).catch(() => { if (atual) setLeitura({ contexto, estado: 'erro', dados: null }) })
    return () => { atual = false }
  }, [contexto, clinicaId, profissionalId, hoje, fim])
  const estado = leitura.contexto === contexto ? leitura.estado : 'carregando'
  if (estado !== 'pronta' || !leitura.dados) return { estado, sugestoes: [], hoje }
  const sugestoes = sugestoesRemarcacao({
    leitura: leitura.dados, datas: Array.from({ length: DIAS }, (_, i) => somarDiasAgenda(hoje, i)), duracao, proprioId,
    dataAtual, inicioAtual, hoje, horaAgora, somenteMesmaData,
  })
  return { estado, sugestoes, hoje }
}

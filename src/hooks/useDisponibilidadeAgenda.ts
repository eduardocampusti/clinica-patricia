import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { avaliarAgendaManual, diaSemanaAgenda, janelasAgenda, type ExcecaoAgenda, type JanelaAgenda, type OcupacaoAgenda } from '../lib/agendaDisponibilidade'

// Uma consulta e uma política para criar/corrigir; respostas de contexto antigo são descartadas.
export function useDisponibilidadeAgenda(clinicaId: string, profissionalId: string, data: string, inicio: string, duracao: number | null, proprioId = '') {
  const contexto = `${clinicaId}/${profissionalId}/${data}/${proprioId}`
  const [tentativa, setTentativa] = useState(0)
  const [consulta, setConsulta] = useState<{ contexto: string; estado: 'carregando' | 'pronta' | 'erro'; padrao: JanelaAgenda[]; excecoes: ExcecaoAgenda[]; ocupacoes: OcupacaoAgenda[] }>({ contexto: '', estado: 'carregando', padrao: [], excecoes: [], ocupacoes: [] })
  useEffect(() => {
    let atual = true
    setConsulta({ contexto, estado: 'carregando', padrao: [], excecoes: [], ocupacoes: [] })
    if (clinicaId && profissionalId && data) void Promise.all([
      supabase.from('disponibilidade_padrao').select('hora_inicio, hora_fim').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId).eq('dia_semana', diaSemanaAgenda(data)).eq('ativo', true),
      supabase.from('agenda_excecoes').select('tipo, hora_inicio, hora_fim').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId).eq('data', data),
      supabase.from('agendamentos').select('id, hora_inicio, hora_fim, status').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId).eq('data', data),
    ]).then(([p, e, a]) => {
      if (!atual) return
      if (p.error || e.error || a.error) throw new Error('Consulta indisponível')
      janelasAgenda(p.data ?? [], e.data ?? [])
      setConsulta({ contexto, estado: 'pronta', padrao: p.data ?? [], excecoes: e.data ?? [], ocupacoes: a.data ?? [] })
    }).catch(() => { if (atual) setConsulta({ contexto, estado: 'erro', padrao: [], excecoes: [], ocupacoes: [] }) })
    return () => { atual = false }
    // Horário/duração são avaliados localmente, sem repetir consulta a cada tecla.
  }, [contexto, clinicaId, profissionalId, data, proprioId, tentativa])
  const estado = consulta.contexto === contexto ? consulta.estado : 'carregando'
  const politica = estado === 'pronta' ? avaliarAgendaManual(inicio, duracao, consulta.padrao, consulta.excecoes, consulta.ocupacoes, proprioId) : { janelas: [], aviso: null, bloqueio: estado === 'erro' ? 'Não foi possível consultar a disponibilidade. Os dados digitados foram mantidos.' : 'Verificando disponibilidade...' }
  return { ...politica, estado, ocupacoes: consulta.ocupacoes, excecoes: estado === 'pronta' ? consulta.excecoes : [], repetir: () => setTentativa(t => t + 1) }
}

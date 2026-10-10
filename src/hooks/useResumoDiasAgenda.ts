import { useEffect, useState } from 'react'
import { useAgoraAgenda } from './useAgoraAgenda'
import { blocosApresentacaoAgenda } from '../lib/agendaBlocosApresentacao'
import { supabase } from '../lib/supabase'
import { diaSemanaAgenda, janelasAgenda, type ExcecaoAgenda, type JanelaAgenda, type OcupacaoAgenda } from '../lib/agendaDisponibilidade'

export type SituacaoDiaAgenda = 'livres' | 'sem-expediente' | 'folga' | 'indefinida'
export interface ResumoDiaAgenda { data: string; situacao: SituacaoDiaAgenda; livres: number }

// Data civil somada sem passar por UTC, como diaSemanaAgenda.
export function somarDiasAgenda(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Leitura { padrao: (JanelaAgenda & { dia_semana: number })[]; excecoes: (ExcecaoAgenda & { data: string })[]; ocupacoes: (OcupacaoAgenda & { data: string })[] }

// Resumo informativo de vários dias em uma leitura por intervalo. Falha não bloqueia o formulário,
// que mantém a consulta própria da data; respostas de contexto antigo são descartadas.
export function useResumoDiasAgenda(clinicaId: string, profissionalId: string, inicio: string, duracao: number | null, quantidade = 7, proprioId = '') {
  const agora = useAgoraAgenda()
  const datas = inicio ? Array.from({ length: quantidade }, (_, i) => somarDiasAgenda(inicio, i)) : []
  const fim = datas.at(-1) ?? ''
  const contexto = `${clinicaId}/${profissionalId}/${inicio}/${quantidade}`
  const [leitura, setLeitura] = useState<{ contexto: string; estado: 'carregando' | 'pronta' | 'erro'; dados: Leitura | null }>({ contexto: '', estado: 'carregando', dados: null })
  useEffect(() => {
    let atual = true
    setLeitura({ contexto, estado: 'carregando', dados: null })
    if (clinicaId && profissionalId && inicio) void Promise.all([
      supabase.from('disponibilidade_padrao').select('dia_semana, hora_inicio, hora_fim').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId).eq('ativo', true),
      supabase.from('agenda_excecoes').select('data, tipo, hora_inicio, hora_fim').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId).gte('data', inicio).lte('data', fim),
      supabase.from('agendamentos').select('id, data, hora_inicio, hora_fim, status').eq('clinica_id', clinicaId).eq('profissional_id', profissionalId).gte('data', inicio).lte('data', fim),
    ]).then(([p, e, a]) => {
      if (!atual) return
      if (p.error || e.error || a.error) throw new Error('Resumo indisponível')
      setLeitura({ contexto, estado: 'pronta', dados: { padrao: p.data ?? [], excecoes: e.data ?? [], ocupacoes: a.data ?? [] } })
    }).catch(() => { if (atual) setLeitura({ contexto, estado: 'erro', dados: null }) })
    return () => { atual = false }
    // A duração só muda a contagem local, sem nova leitura.
  }, [contexto, clinicaId, profissionalId, inicio, fim])
  const estado = leitura.contexto === contexto ? leitura.estado : 'carregando'
  const dados = estado === 'pronta' ? leitura.dados : null
  const dias: ResumoDiaAgenda[] = datas.map(data => {
    if (!dados || !duracao) return { data, situacao: 'indefinida', livres: 0 }
    const excecoes = dados.excecoes.filter(ex => ex.data === data)
    if (excecoes.some(ex => ex.tipo === 'folga' || ex.tipo === 'bloqueio')) return { data, situacao: 'folga', livres: 0 }
    let janelas: JanelaAgenda[]
    try { janelas = janelasAgenda(dados.padrao.filter(j => j.dia_semana === diaSemanaAgenda(data)), excecoes) } catch { return { data, situacao: 'indefinida', livres: 0 } }
    if (!janelas.length) return { data, situacao: 'sem-expediente', livres: 0 }
    const livres = blocosApresentacaoAgenda(data, duracao, janelas, dados.ocupacoes.filter(o => o.data === data), proprioId, agora).filter(b => !b.ocupado && !b.passado).length
    return { data, situacao: 'livres', livres }
  })
  return { estado, dias }
}

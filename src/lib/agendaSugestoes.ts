import { blocosHorarioAgenda, diaSemanaAgenda, janelasAgenda, minutosAgenda, periodoAgenda, type ExcecaoAgenda, type JanelaAgenda, type OcupacaoAgenda } from './agendaDisponibilidade'

export interface LeituraIntervaloAgenda {
  padrao: (JanelaAgenda & { dia_semana: number })[]
  excecoes: (ExcecaoAgenda & { data: string })[]
  ocupacoes: (OcupacaoAgenda & { data: string })[]
}
export type EtiquetaSugestao = 'Ainda hoje' | 'Mesmo horário' | 'Manhã' | 'Tarde' | 'Noite'
export interface SugestaoRemarcacao { data: string; hora: string; etiqueta: EtiquetaSugestao }

const LIMITE_HOJE = 2, LIMITE_MESMO_HORARIO = 2

// Próximos horários livres para remarcar, com as mesmas regras da grade: expediente do dia
// (janelasAgenda), duração completa e conflitos (blocosHorarioAgenda), ignorando o próprio agendamento.
// Prioridade: ainda hoje (até 2), mesmo horário em outro dia (até 2), primeiro livre de cada dia e,
// por fim, os demais em ordem; sem repetir. Exibição em ordem cronológica.
export function sugestoesRemarcacao({ leitura, datas, duracao, proprioId, dataAtual, inicioAtual, hoje, horaAgora, somenteMesmaData = false, limite = 6 }: {
  leitura: LeituraIntervaloAgenda; datas: string[]; duracao: number | null; proprioId: string
  dataAtual: string; inicioAtual: string; hoje: string; horaAgora: string; somenteMesmaData?: boolean; limite?: number
}): SugestaoRemarcacao[] {
  if (!duracao || duracao <= 0 || limite <= 0) return []
  const dias = (somenteMesmaData ? datas.filter(d => d === dataAtual) : datas).filter(d => d >= hoje)
  const livresPorDia = dias.map(data => {
    const excecoes = leitura.excecoes.filter(e => e.data === data)
    let janelas: JanelaAgenda[]
    try { janelas = janelasAgenda(leitura.padrao.filter(p => p.dia_semana === diaSemanaAgenda(data)), excecoes) } catch { return { data, horas: [] as string[] } }
    const horas = blocosHorarioAgenda(duracao, janelas, leitura.ocupacoes.filter(o => o.data === data), proprioId)
      .filter(b => !b.ocupado)
      .map(b => b.hora)
      .filter(h => !(data === dataAtual && h === inicioAtual))
      .filter(h => data !== hoje || minutosAgenda(h) > minutosAgenda(horaAgora))
    return { data, horas }
  })
  const escolhidas: { data: string; hora: string }[] = []
  const chave = (s: { data: string; hora: string }) => `${s.data} ${s.hora}`
  const usadas = new Set<string>()
  const incluir = (s: { data: string; hora: string }) => { if (escolhidas.length < limite && !usadas.has(chave(s))) { usadas.add(chave(s)); escolhidas.push(s) } }
  livresPorDia.find(d => d.data === hoje)?.horas.slice(0, LIMITE_HOJE).forEach(hora => incluir({ data: hoje, hora }))
  livresPorDia.filter(d => d.data !== dataAtual && d.horas.includes(inicioAtual)).slice(0, LIMITE_MESMO_HORARIO).forEach(d => incluir({ data: d.data, hora: inicioAtual }))
  // Hoje já teve sua cota acima; os demais dias recebem o primeiro livre ainda não sugerido.
  for (const d of livresPorDia.filter(d => d.data !== hoje)) { const primeira = d.horas.find(h => !usadas.has(`${d.data} ${h}`)); if (primeira) incluir({ data: d.data, hora: primeira }) }
  for (const d of livresPorDia) d.horas.forEach(hora => incluir({ data: d.data, hora }))
  return escolhidas
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora))
    .map(s => ({ ...s, etiqueta: s.data === hoje ? 'Ainda hoje' : s.hora === inicioAtual ? 'Mesmo horário' : periodoAgenda(s.hora) }))
}

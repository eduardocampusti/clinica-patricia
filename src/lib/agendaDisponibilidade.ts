export interface JanelaAgenda { hora_inicio: string | null; hora_fim: string | null }
export interface ExcecaoAgenda extends JanelaAgenda { tipo: string }
export interface OcupacaoAgenda { id: string; hora_inicio: string; hora_fim: string; status: string }
export function avaliarAgendaManual(inicio: string, duracao: number | null, padrao: JanelaAgenda[], excecoes: ExcecaoAgenda[], ocupacoes: OcupacaoAgenda[], proprioId = '') {
  const janelas = janelasAgenda(padrao, excecoes)
  const min = minutosAgenda(inicio), fim = min + (duracao ?? 0)
  let bloqueio: string | null = null
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio) || !duracao || duracao <= 0 || fim >= 1440) bloqueio = 'Informe horário e duração válidos, sem ultrapassar o dia.'
  else if (excecoes.some(e => e.tipo === 'folga' || e.tipo === 'bloqueio')) bloqueio = 'Há folga ou bloqueio explícito nesta data. Não é permitido agendar.'
  else if (excecoes.length && !janelas.some(j => j.hora_inicio && j.hora_fim && minutosAgenda(j.hora_inicio) <= min && minutosAgenda(j.hora_fim) >= fim)) bloqueio = 'O intervalo está fora do horário especial autorizado para esta data.'
  else if (ocupacoes.some(a => a.id !== proprioId && a.status !== 'cancelado' && minutosAgenda(a.hora_inicio) < fim && minutosAgenda(a.hora_fim) > min)) bloqueio = 'Há outro agendamento nesse horário. Escolha um horário disponível.'
  const dentro = janelas.some(j => j.hora_inicio && j.hora_fim && minutosAgenda(j.hora_inicio) <= min && minutosAgenda(j.hora_fim) >= fim)
  return { janelas, bloqueio, aviso: !bloqueio && !dentro ? janelas.length ? 'Horário fora da faixa habitual. Confira a duração completa e confirme a marcação manual.' : 'Sem expediente cadastrado para esta data. Confira o horário e confirme a marcação manual.' : null }
}
export const minutosAgenda = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))
export const horaAgenda = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
// Data civil, como extract(dow from date) no servidor: não converter a meia-noite UTC.
export const diaSemanaAgenda = (data: string) => new Date(`${data}T12:00:00`).getDay()
export function janelasAgenda(padrao: JanelaAgenda[], excecoes: ExcecaoAgenda[]): JanelaAgenda[] {
  if (!excecoes.length) return padrao
  if (excecoes.length !== 1) throw new Error('Exceções inconsistentes')
  const ex = excecoes[0]
  if (ex.tipo === 'folga' || ex.tipo === 'bloqueio') return []
  if (ex.tipo !== 'horario_especial' || !ex.hora_inicio || !ex.hora_fim) throw new Error('Exceção incompleta')
  return [ex]
}
export function validarHorarioAgenda(inicio: string, duracao: number | null, janelas: JanelaAgenda[], ocupacoes: OcupacaoAgenda[], proprioId: string): string | null {
  if (!/^\d{2}:\d{2}$/.test(inicio) || !duracao || duracao <= 0 || minutosAgenda(inicio) + duracao >= 1440) return 'Informe data e horário com duração válida.'
  const min = minutosAgenda(inicio), fim = min + duracao
  if (!janelas.some(j => j.hora_inicio && j.hora_fim && minutosAgenda(j.hora_inicio) <= min && minutosAgenda(j.hora_fim) >= fim)) return 'Horário fora da disponibilidade. Revise o expediente; este fluxo não autoriza encaixes.'
  if (ocupacoes.some(a => a.id !== proprioId && a.status !== 'cancelado' && minutosAgenda(a.hora_inicio) < fim && minutosAgenda(a.hora_fim) > min)) return 'Há outro agendamento nesse horário. Escolha um horário disponível.'
  return null
}
export function sugestoesHorarioAgenda(duracao: number | null, janelas: JanelaAgenda[], ocupacoes: OcupacaoAgenda[], proprioId: string): string[] {
  if (!duracao || duracao <= 0) return []
  const opcoes = new Set<string>()
  for (const janela of janelas) {
    if (!janela.hora_inicio || !janela.hora_fim) continue
    for (let min = minutosAgenda(janela.hora_inicio); min + duracao <= minutosAgenda(janela.hora_fim) && min + duracao < 1440; min += 5) {
      const hora = horaAgenda(min)
      if (!validarHorarioAgenda(hora, duracao, janelas, ocupacoes, proprioId)) opcoes.add(hora)
    }
  }
  return [...opcoes].sort()
}
export interface BlocoHorarioAgenda { hora: string; ocupado: boolean }
// Blocos com passo igual à duração, alinhados ao início de cada faixa; conflitos continuam visíveis.
export function blocosHorarioAgenda(duracao: number | null, janelas: JanelaAgenda[], ocupacoes: OcupacaoAgenda[], proprioId = ''): BlocoHorarioAgenda[] {
  if (!duracao || duracao <= 0) return []
  const blocos = new Map<string, boolean>()
  for (const janela of janelas) {
    if (!janela.hora_inicio || !janela.hora_fim) continue
    for (let min = minutosAgenda(janela.hora_inicio); min + duracao <= minutosAgenda(janela.hora_fim) && min + duracao < 1440; min += duracao) {
      const hora = horaAgenda(min)
      const livre = !validarHorarioAgenda(hora, duracao, janelas, ocupacoes, proprioId)
      blocos.set(hora, (blocos.get(hora) ?? false) || livre)
    }
  }
  return [...blocos].sort(([a], [b]) => a.localeCompare(b)).map(([hora, livre]) => ({ hora, ocupado: !livre }))
}
export type PeriodoAgenda = 'Manhã' | 'Tarde' | 'Noite'
export const periodoAgenda = (hora: string): PeriodoAgenda => minutosAgenda(hora) < 720 ? 'Manhã' : minutosAgenda(hora) < 1080 ? 'Tarde' : 'Noite'

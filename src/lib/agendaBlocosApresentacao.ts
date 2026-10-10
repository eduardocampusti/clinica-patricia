import { blocosHorarioAgenda, horaAgenda, type JanelaAgenda, type OcupacaoAgenda } from './agendaDisponibilidade'

// Mesma referência civil/local das sugestões de remarcação. Não altera a política manual.
export function referenciaAgoraAgenda(agora = new Date()) {
  return { hoje: `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`,
    horaAgora: horaAgenda(agora.getHours() * 60 + agora.getMinutes()) }
}
export function blocosApresentacaoAgenda(data: string, duracao: number | null, janelas: JanelaAgenda[], ocupacoes: OcupacaoAgenda[], proprioId = '', agora = new Date()) {
  const { hoje, horaAgora } = referenciaAgoraAgenda(agora)
  return blocosHorarioAgenda(duracao, janelas, ocupacoes, proprioId).map(bloco => ({ ...bloco,
    // As sugestões também excluem o minuto atual; um bloco não é uma reserva.
    passado: data === hoje && bloco.hora <= horaAgora,
  }))
}

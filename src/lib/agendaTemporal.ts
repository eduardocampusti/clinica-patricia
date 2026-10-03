import { minutosAgenda } from './agendaDisponibilidade'

// Pixels por minuto da grade Dia: 30 min = 48 px (alvo de toque ≥ 44 px) e 08:00–12:00 cabem na primeira tela.
export const ESCALA_AGENDA = 1.6

export interface RegistroTemporal { id: string; profissional_id: string; hora_inicio: string; hora_fim: string }

// Particionamento determinístico dos intervalos, sem permitir sobreposição na gravação.
export function distribuirSobreposicoes<T extends RegistroTemporal>(registros: T[]) {
  const ordenados = [...registros].sort((a, b) => minutosAgenda(a.hora_inicio) - minutosAgenda(b.hora_inicio) || a.id.localeCompare(b.id))
  const resultado: { registro: T; faixa: number; faixas: number }[] = []
  let grupo: { registro: T; faixa: number; faixas: number }[] = []
  let finais: number[] = []
  let fimGrupo = -1
  const concluir = () => { grupo.forEach(item => { item.faixas = finais.length; resultado.push(item) }); grupo = []; finais = [] }
  for (const registro of ordenados) {
    const inicio = minutosAgenda(registro.hora_inicio), fim = minutosAgenda(registro.hora_fim)
    if (inicio >= fimGrupo) concluir()
    let faixa = finais.findIndex(final => final <= inicio)
    if (faixa < 0) faixa = finais.length
    finais[faixa] = fim
    grupo.push({ registro, faixa, faixas: 1 })
    fimGrupo = Math.max(fimGrupo, fim)
  }
  concluir()
  return resultado
}

// Janela compacta (primeiro ao último horário relevante) ou dia inteiro, escolhidos na barra da página.
// Agendamentos sempre ampliam a janela: nenhum registro fica fora da área alcançável por rolagem.
export function janelaVisivelAgenda(janela: { inicio: number; fim: number }, registros: RegistroTemporal[], diaInteiro: boolean) {
  if (diaInteiro) return { inicio: 0, fim: 1440 }
  return {
    inicio: Math.min(janela.inicio, ...registros.map(a => Math.floor(minutosAgenda(a.hora_inicio) / 60) * 60)),
    fim: Math.max(janela.fim, ...registros.map(a => Math.ceil(minutosAgenda(a.hora_fim) / 60) * 60)),
  }
}

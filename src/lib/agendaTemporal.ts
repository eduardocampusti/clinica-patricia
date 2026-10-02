import { minutosAgenda } from './agendaDisponibilidade'

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

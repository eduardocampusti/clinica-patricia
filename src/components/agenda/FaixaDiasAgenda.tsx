import { useState } from 'react'
import { somarDiasAgenda, useResumoDiasAgenda, type ResumoDiaAgenda } from '../../hooks/useResumoDiasAgenda'

const QUANTIDADE = 7
const dataCivil = (data: string) => new Date(`${data}T12:00:00`)
const textoSituacao = (dia: ResumoDiaAgenda, estado: string) => estado === 'carregando' ? '…'
  : dia.situacao === 'livres' ? `${dia.livres} ${dia.livres === 1 ? 'livre' : 'livres'}`
    : dia.situacao === 'folga' ? 'Folga' : dia.situacao === 'sem-expediente' ? 'Sem expediente' : ''

// Somente informativa: a data escolhida continua validada pela consulta própria do formulário.
export function FaixaDiasAgenda({ clinicaId, profissionalId, data, duracao, onData, ocupado }: {
  clinicaId: string; profissionalId: string; data: string; duracao: number | null; onData: (data: string) => void; ocupado: boolean
}) {
  // A janela começa na data escolhida e só se desloca quando a data sai dela, sem saltar a cada clique.
  const [base, setBase] = useState(data)
  const dentro = !!data && data >= base && data <= somarDiasAgenda(base, QUANTIDADE - 1)
  if (data && !dentro) setBase(data)
  const resumo = useResumoDiasAgenda(clinicaId, profissionalId, dentro ? base : data, duracao, QUANTIDADE)
  if (!data) return null
  return <div className="space-y-1.5">
    <div role="group" aria-label="Próximos dias" className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
      {resumo.dias.map(dia => {
        const selecionado = dia.data === data
        const d = dataCivil(dia.data)
        const situacao = textoSituacao(dia, resumo.estado)
        return <button key={dia.data} type="button" aria-pressed={selecionado} disabled={ocupado} onClick={() => onData(dia.data)}
          aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}${situacao && situacao !== '…' ? `: ${situacao}` : ''}`}
          className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)] disabled:opacity-60 ${selecionado ? 'border-[var(--cor-primaria)] bg-[var(--cor-primaria-suave)]' : 'border-[var(--borda)] bg-[var(--fundo-card)] hover:border-[var(--cor-primaria)]'}`}>
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--texto-secundario)]">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
          <span className={`numero-tabular text-base font-semibold leading-none ${selecionado ? 'text-[var(--cor-primaria)]' : 'text-[var(--texto-principal)]'}`}>{String(d.getDate()).padStart(2, '0')}</span>
          <span className="min-h-4 text-[11px] leading-tight text-[var(--texto-secundario)]">{situacao}</span>
        </button>
      })}
    </div>
    {resumo.estado === 'erro' && <p className="text-xs text-[var(--texto-secundario)]">Contagem de horários livres indisponível. Escolha a data normalmente; os horários abaixo são consultados à parte.</p>}
  </div>
}

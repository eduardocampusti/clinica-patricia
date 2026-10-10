import { useState } from 'react'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const SEMANA_EXTENSO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const mesmoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// Somente navegação: escolher um dia troca a data da Agenda; não consulta dados.
export function MiniCalendarioAgenda({ data, onData }: { data: Date; onData: (data: Date) => void }) {
  const [mes, setMes] = useState(() => new Date(data.getFullYear(), data.getMonth(), 1))
  // Data escolhida fora do mês exibido (setas do dia, "Hoje") traz o calendário junto.
  const [ultimaData, setUltimaData] = useState(data)
  if (!mesmoDia(ultimaData, data)) {
    setUltimaData(data)
    if (data.getMonth() !== mes.getMonth() || data.getFullYear() !== mes.getFullYear()) setMes(new Date(data.getFullYear(), data.getMonth(), 1))
  }
  const hoje = new Date()
  const titulo = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' ')
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const celulas: (Date | null)[] = [...Array(mes.getDay()).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1, 12))]
  const navegar = (delta: number) => setMes(m => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  const seta = 'flex size-11 items-center justify-center rounded-lg border border-[var(--borda)] text-[var(--texto-principal)] hover:bg-[var(--fundo-pagina)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)]'
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold capitalize" aria-live="polite">{titulo}</h2>
      <div className="flex gap-1.5">
        <button type="button" className={seta} aria-label="Mês anterior" onClick={() => navegar(-1)}>‹</button>
        <button type="button" className={seta} aria-label="Próximo mês" onClick={() => navegar(1)}>›</button>
      </div>
    </div>
    <div aria-hidden="true" className="grid grid-cols-7 text-center">{SEMANA.map((d, i) => <span key={i} title={SEMANA_EXTENSO[i]} className="py-1 text-xs font-medium text-[var(--texto-secundario)]">{d}</span>)}</div>
    <div role="group" aria-label={`Dias de ${titulo}`} className="grid grid-cols-7 text-center">
        {celulas.map((dia, i) => dia ? <span key={i} className="flex justify-center">
          <button type="button" onClick={() => onData(dia)} aria-pressed={mesmoDia(dia, data)} aria-current={mesmoDia(dia, hoje) ? 'date' : undefined}
            aria-label={dia.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            className={`agenda-fonte-tecnica flex size-11 items-center justify-center rounded-lg text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)] ${mesmoDia(dia, data) ? 'bg-[var(--cor-primaria)] font-semibold text-[var(--texto-sobre-primaria)]' : `hover:bg-[var(--fundo-pagina)] ${mesmoDia(dia, hoje) ? 'font-semibold text-[var(--cor-primaria)] underline underline-offset-4' : dia.getDay() === 0 ? 'text-[var(--texto-secundario)]' : 'text-[var(--texto-principal)]'}`}`}>
            {dia.getDate()}
          </button>
        </span> : <span key={i} aria-hidden="true" />)}
    </div>
  </div>
}

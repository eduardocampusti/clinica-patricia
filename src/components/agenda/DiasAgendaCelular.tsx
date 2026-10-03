import { useEffect } from 'react'
const somar = (data: string, dias: number) => { const d = new Date(`${data}T12:00:00`); d.setDate(d.getDate() + dias); return d }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function DiasAgendaCelular({ data, onData, base, onBase }: { data: string; onData: (data: string) => void; base: string; onBase: (data: string) => void }) {
  const dentro = data >= base && data <= iso(somar(base, 4))
  useEffect(() => { if (!dentro) onBase(data) }, [dentro, data, onBase])
  return <div role="group" aria-label="Dias da agenda no celular" className="agenda-celular-dias md:hidden">
    {Array.from({ length: 5 }, (_, i) => somar(dentro ? base : data, i)).map(d => <button key={iso(d)} type="button" aria-pressed={iso(d) === data}
      aria-label={d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} onClick={() => onData(iso(d))}>
      <span>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span><strong className="agenda-fonte-tecnica">{String(d.getDate()).padStart(2, '0')}</strong>
    </button>)}
  </div>
}

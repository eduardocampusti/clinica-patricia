import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { horaAgenda, minutosAgenda } from '../../lib/agendaDisponibilidade'
import { distribuirSobreposicoes, type RegistroTemporal } from '../../lib/agendaTemporal'

const ESCALA = 3 // Mesma escala de minutos em todas as colunas, inclusive sem expediente.

export function GradeTemporalAgenda<T extends RegistroTemporal>({ registros, profissionais, contexto, renderRegistro, onNovo, renderAcao }: {
  registros: T[]; profissionais: { id: string; nome: string }[]; contexto: string
  renderRegistro: (registro: T) => ReactNode
  onNovo?: (profissionalId: string, inicio: string) => void
  renderAcao?: (profissionalId: string) => ReactNode
}) {
  const rolagem = useRef<HTMLDivElement>(null)
  const primeiraHora = registros.length ? Math.min(...registros.map(a => minutosAgenda(a.hora_inicio))) : 480
  useLayoutEffect(() => {
    if (rolagem.current) rolagem.current.scrollTop = Math.max(0, primeiraHora - 30) * ESCALA
  }, [contexto, primeiraHora])
  if (!profissionais.length) return <p className="p-5 text-sm">Nenhum profissional corresponde aos filtros.</p>
  return <>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borda)] px-4 py-2 text-xs text-[var(--texto-secundario)]">
      <span>Dia inteiro · selecione um horário para preparar uma marcação</span>
      <div className="flex gap-3"><button type="button" className="min-h-9 underline" onClick={() => { if (rolagem.current) rolagem.current.scrollTop = 0 }}>Início do dia</button>
        <button type="button" className="min-h-9 underline" onClick={() => { if (rolagem.current) rolagem.current.scrollTop = Math.max(0, primeiraHora - 30) * ESCALA }}>{registros.length ? 'Primeiro agendamento' : 'Ir para 08h'}</button></div>
    </div>
    <div ref={rolagem} className="agenda-temporal-rolagem" tabIndex={0} aria-label="Grade temporal do dia">
      <div className="agenda-temporal" style={{ gridTemplateColumns: `56px repeat(${profissionais.length}, minmax(240px, 1fr))` }}>
        <div className="agenda-temporal-canto">Hora</div>
        {profissionais.map(p => <div key={p.id} className="agenda-temporal-cabecalho"><h3 className="min-w-0 break-words text-sm font-semibold">{p.nome}</h3>{renderAcao?.(p.id)}</div>)}
        <div className="agenda-temporal-eixo" style={{ height: 1440 * ESCALA + 24 }}>{Array.from({ length: 25 }, (_, h) => <span key={h} style={{ top: h * 60 * ESCALA }} className="numero-tabular">{String(h).padStart(2, '0')}:00</span>)}</div>
        {profissionais.map(p => <section key={p.id} aria-label={p.nome} className="agenda-temporal-coluna" style={{ height: 1440 * ESCALA + 24 }}>
          {Array.from({ length: 48 }, (_, i) => <button key={i} type="button" disabled={!onNovo} className="agenda-temporal-horario" style={{ top: i * 30 * ESCALA, height: 30 * ESCALA }}
            aria-label={`Novo agendamento às ${horaAgenda(i * 30)} — ${p.nome}`} onClick={() => onNovo?.(p.id, horaAgenda(i * 30))}><span>{horaAgenda(i * 30)} <span aria-hidden="true">＋</span></span></button>)}
          {distribuirSobreposicoes(registros.filter(a => a.profissional_id === p.id)).map(({ registro, faixa, faixas }) => <div key={registro.id} className="agenda-temporal-posicao" data-inicio={registro.hora_inicio} data-faixas={faixas}
            style={{ top: minutosAgenda(registro.hora_inicio) * ESCALA, height: (minutosAgenda(registro.hora_fim) - minutosAgenda(registro.hora_inicio)) * ESCALA, left: `calc(${faixa * 100 / faixas}% + 3px)`, width: `calc(${100 / faixas}% - 6px)` }}>{renderRegistro(registro)}</div>)}
        </section>)}
      </div>
    </div>
  </>
}

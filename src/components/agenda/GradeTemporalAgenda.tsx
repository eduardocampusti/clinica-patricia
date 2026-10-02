import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { horaAgenda, minutosAgenda } from '../../lib/agendaDisponibilidade'
import { distribuirSobreposicoes, ESCALA_AGENDA as ESCALA, janelaVisivelAgenda, type RegistroTemporal } from '../../lib/agendaTemporal'

export interface ColunaAgenda {
  id: string; nome: string; detalhe: string
  // Inícios dos blocos livres dentro do expediente e duração de cada bloco.
  livres: string[]; duracao: number | null
  // Trechos sem expediente, folga ou disponibilidade não confirmada, em minutos do dia (0–1440).
  neutros: { inicio: number; fim: number; rotulo: string }[]
}

export type PedidoRolagemAgenda = { alvo: 'inicio' | 'primeiro'; vez: number } | null

const iniciais = (nome: string) => {
  const partes = nome.replace(/^(dra?\.?|dr\.)\s+/i, '').split(/\s+/u).filter(p => /^\p{L}/u.test(p))
  return partes.length ? `${partes[0][0]}${partes.length > 1 ? partes[partes.length - 1][0] : ''}`.toLocaleUpperCase('pt-BR') : '•'
}

export function GradeTemporalAgenda<T extends RegistroTemporal>({ registros, colunas, contexto, janela, diaInteiro, pedidoRolagem, renderRegistro, onNovo, renderAcao }: {
  registros: T[]; colunas: ColunaAgenda[]; contexto: string; janela: { inicio: number; fim: number }
  diaInteiro: boolean; pedidoRolagem: PedidoRolagemAgenda
  renderRegistro: (registro: T) => ReactNode
  onNovo?: (profissionalId: string, inicio: string) => void
  renderAcao?: (profissionalId: string) => ReactNode
}) {
  const rolagem = useRef<HTMLDivElement>(null)
  const primeiraHora = registros.length ? Math.min(...registros.map(a => minutosAgenda(a.hora_inicio))) : 480
  const { inicio, fim } = janelaVisivelAgenda(janela, registros, diaInteiro)
  const altura = (fim - inicio) * ESCALA + 12
  const y = (minutos: number) => (minutos - inicio) * ESCALA
  useLayoutEffect(() => {
    if (rolagem.current) rolagem.current.scrollTop = diaInteiro ? Math.max(0, primeiraHora - 30) * ESCALA : 0
  }, [contexto, primeiraHora, diaInteiro])
  useLayoutEffect(() => {
    if (!pedidoRolagem || !rolagem.current) return
    rolagem.current.scrollTop = pedidoRolagem.alvo === 'inicio' ? 0 : Math.max(0, primeiraHora - 30 - inicio) * ESCALA
  }, [pedidoRolagem, primeiraHora, inicio])
  if (!colunas.length) return <p className="p-5 text-sm">Nenhum profissional corresponde aos filtros.</p>
  return <div ref={rolagem} className="agenda-temporal-rolagem" tabIndex={0} aria-label="Grade temporal do dia">
    <div className="agenda-temporal" style={{ gridTemplateColumns: `56px repeat(${colunas.length}, minmax(200px, 1fr))`, width: `max(100%, ${56 + colunas.length * 200}px)` }}>
      <div className="agenda-temporal-canto"><span className="sr-only">Hora</span></div>
      {colunas.map(c => <div key={c.id} className="agenda-temporal-cabecalho">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--fundo-pagina)] text-xs font-semibold text-[var(--texto-secundario)]">{iniciais(c.nome)}</span>
          <div className="min-w-0"><h3 title={c.nome} className="truncate text-sm font-semibold leading-tight">{c.nome}</h3><p title={c.detalhe} className="truncate text-xs leading-tight text-[var(--texto-secundario)]">{c.detalhe}</p></div>
        </div>
        {renderAcao?.(c.id)}
      </div>)}
      <div className="agenda-temporal-eixo" style={{ height: altura }}>
        {Array.from({ length: Math.floor((fim - inicio) / 30) + 1 }, (_, i) => inicio + i * 30).map(m => <span key={m} style={{ top: y(m) }} className="agenda-fonte-tecnica">{horaAgenda(m)}</span>)}
      </div>
      {colunas.map(c => <section key={c.id} aria-label={c.nome} className="agenda-temporal-coluna" style={{ height: altura, ['--agenda-linha' as string]: `${30 * ESCALA}px` }}>
        {c.neutros.filter(n => n.fim > inicio && n.inicio < fim).map(n => {
          const de = Math.max(n.inicio, inicio), ate = Math.min(n.fim, fim)
          return <div key={`${n.inicio}-${n.rotulo}`} className="agenda-temporal-neutro" style={{ top: y(de) + 2, height: Math.max(0, (ate - de) * ESCALA - 4) }}><span>{n.rotulo}</span></div>
        })}
        {c.duracao && c.livres.filter(h => minutosAgenda(h) >= inicio && minutosAgenda(h) < fim).map(h => {
          const estilo = { top: y(minutosAgenda(h)) + 2, height: c.duracao! * ESCALA - 4 }
          return onNovo
            ? <button key={h} type="button" className="agenda-temporal-livre" style={estilo} aria-label={`Novo agendamento às ${h} — ${c.nome}`} onClick={() => onNovo(c.id, h)}><span aria-hidden="true">+ {h} livre</span></button>
            : <div key={h} className="agenda-temporal-livre" style={estilo}><span>{h} livre</span></div>
        })}
        {distribuirSobreposicoes(registros.filter(a => a.profissional_id === c.id)).map(({ registro, faixa, faixas }) => <div key={registro.id} className="agenda-temporal-posicao" data-inicio={registro.hora_inicio} data-faixas={faixas}
          style={{ top: y(minutosAgenda(registro.hora_inicio)), height: (minutosAgenda(registro.hora_fim) - minutosAgenda(registro.hora_inicio)) * ESCALA, left: `calc(${faixa * 100 / faixas}% + 3px)`, width: `calc(${100 / faixas}% - 6px)` }}>{renderRegistro(registro)}</div>)}
      </section>)}
    </div>
  </div>
}

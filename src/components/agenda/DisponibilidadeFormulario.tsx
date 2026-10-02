import { useEffect, useId, useRef, useState } from 'react'
import type { useDisponibilidadeAgenda } from '../../hooks/useDisponibilidadeAgenda'
import { blocosHorarioAgenda, periodoAgenda, type BlocoHorarioAgenda, type PeriodoAgenda } from '../../lib/agendaDisponibilidade'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { campoAgenda } from './PainelAgenda'

const PERIODOS: PeriodoAgenda[] = ['Manhã', 'Tarde', 'Noite']
const rotuloLivres = (n: number) => `${n} ${n === 1 ? 'livre' : 'livres'}`
const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)]'

export function DisponibilidadeFormulario({ consulta, inicio, duracao, onInicio, ocupado, proprioId = '', edicao = false }: {
  consulta: ReturnType<typeof useDisponibilidadeAgenda>; inicio: string; duracao: number | null
  onInicio: (inicio: string) => void; ocupado: boolean; proprioId?: string; edicao?: boolean
}) {
  const pronta = consulta.estado === 'pronta'
  const blocos = pronta ? blocosHorarioAgenda(duracao, consulta.janelas, consulta.ocupacoes, proprioId) : []
  const livres = blocos.filter(b => !b.ocupado)
  const folga = consulta.excecoes.some(e => e.tipo === 'folga' || e.tipo === 'bloqueio')
  // Horário digitado ou vindo da grade fora dos blocos livres continua visível no campo manual.
  const [aberto, setAberto] = useState(false)
  const manualVisivel = aberto || (pronta && !!inicio && !livres.some(b => b.hora === inicio))
  const campoManual = useRef<HTMLInputElement>(null)
  const focarManual = useRef(false)
  useEffect(() => { if (focarManual.current && manualVisivel) { campoManual.current?.focus(); focarManual.current = false } })
  const base = useId()
  const idManual = edicao ? 'novo-horario-correcao' : 'novo-agendamento-inicio'
  const destacarManual = pronta && !folga && !livres.length
  const grupos = PERIODOS.map(periodo => ({ periodo, blocos: blocos.filter(b => periodoAgenda(b.hora) === periodo) })).filter(g => g.blocos.length)

  return <section aria-label="Disponibilidade para a data" className="space-y-3 text-sm">
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-sm font-medium text-[var(--texto-principal)]">Horários disponíveis</p>
      {pronta && duracao ? <p className="text-xs text-[var(--texto-secundario)]">Blocos de {duracao} min</p> : null}
    </div>
    {consulta.estado === 'carregando' ? <p role="status">Verificando disponibilidade...</p>
      : consulta.estado === 'erro' ? <FeedbackAlert variant="destructive" title="Falha ao consultar disponibilidade" description={consulta.bloqueio ?? ''}
        action={<button type="button" onClick={consulta.repetir} disabled={ocupado}>Tentar novamente</button>} />
        : <>
          {grupos.length ? <div role="group" aria-label="Horários disponíveis" className="space-y-3">
            {grupos.map(({ periodo, blocos: doPeriodo }) => <div key={periodo} role="group" aria-labelledby={`${base}-${periodo}`} className="space-y-1.5">
              <p id={`${base}-${periodo}`} className="text-xs font-medium uppercase tracking-wide text-[var(--texto-secundario)]">{periodo} <span className="font-normal normal-case tracking-normal">· {rotuloLivres(doPeriodo.filter(b => !b.ocupado).length)}</span></p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
                {doPeriodo.map(bloco => <BotaoBloco key={bloco.hora} bloco={bloco} selecionado={!bloco.ocupado && bloco.hora === inicio} ocupado={ocupado}
                  onEscolher={() => { setAberto(false); onInicio(bloco.hora) }} />)}
              </div>
            </div>)}
          </div>
            : <div role="group" aria-label="Horários disponíveis" className="rounded-lg border border-dashed border-[var(--borda)] bg-[var(--fundo-pagina)] px-3 py-4 text-center">
              <p className="font-medium text-[var(--texto-principal)]">{folga ? 'Folga ou bloqueio explícito nesta data' : consulta.janelas.length ? `Nenhum bloco de ${duracao ?? '?'} min cabe nas faixas habituais` : 'Sem expediente cadastrado nesta data'}</p>
              <p className="mt-1 text-xs text-[var(--texto-secundario)]">{folga ? 'Não há horários para escolher.' : 'A marcação manual continua possível, com aviso e confirmação.'}</p>
            </div>}
          {livres.length ? <p className="text-xs text-[var(--texto-secundario)]">Sem conflito na consulta atual. Não é reserva; o servidor valida ao salvar.</p>
            : grupos.length ? <p className="text-xs text-[var(--texto-secundario)]">Todos os blocos estão ocupados. Use outro horário ou outra data.</p> : null}
          <details className="text-xs text-[var(--texto-secundario)]"><summary className="min-h-8 cursor-pointer">Faixas habituais na data</summary><p className="py-1">{consulta.janelas.length ? consulta.janelas.map(j => `${j.hora_inicio?.slice(0, 5)}–${j.hora_fim?.slice(0, 5)}`).join(' / ') : 'Sem expediente disponível.'}</p></details>
        </>}
    <div className="space-y-2">
      <button type="button" aria-expanded={manualVisivel} aria-controls={manualVisivel ? `${idManual}-area` : undefined} disabled={ocupado}
        onClick={() => { focarManual.current = !manualVisivel; setAberto(!manualVisivel) }}
        className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${foco} ${destacarManual ? 'bg-[var(--cor-primaria-suave)] text-[var(--cor-primaria)]' : 'border border-[var(--borda)] text-[var(--cor-primaria)] hover:bg-[var(--fundo-pagina)]'}`}>
        Outro horário
      </button>
      {manualVisivel && <div id={`${idManual}-area`} className="space-y-1">
        <label htmlFor={idManual} className="block text-sm font-medium text-[var(--texto-principal)]">{edicao ? 'Novo horário' : 'Início'}</label>
        <input ref={campoManual} id={idManual} type="time" className={campoAgenda} value={inicio} disabled={ocupado} onChange={e => { setAberto(true); onInicio(e.target.value) }} />
        <p className="text-xs text-[var(--texto-secundario)]">Para horários fora dos blocos. Fora da faixa habitual ou sem expediente, o aviso e a confirmação continuam obrigatórios.</p>
      </div>}
    </div>
    {consulta.estado === 'pronta' && consulta.bloqueio && <FeedbackAlert variant="warning" title="Revise o horário" description={consulta.bloqueio} />}
    {consulta.estado === 'pronta' && consulta.aviso && <FeedbackAlert variant="warning" title="Marcação manual" description={consulta.aviso} />}
  </section>
}

function BotaoBloco({ bloco, selecionado, ocupado, onEscolher }: { bloco: BlocoHorarioAgenda; selecionado: boolean; ocupado: boolean; onEscolher: () => void }) {
  if (bloco.ocupado) return <button type="button" disabled aria-label={`${bloco.hora} ocupado`}
    className="numero-tabular min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--borda)] bg-[var(--fundo-pagina)] text-sm text-[var(--texto-secundario)] line-through">
    {bloco.hora}
  </button>
  return <button type="button" aria-pressed={selecionado} disabled={ocupado} onClick={onEscolher}
    className={`numero-tabular min-h-11 rounded-lg border text-sm font-semibold transition disabled:opacity-60 ${foco} ${selecionado ? 'border-[var(--cor-primaria)] bg-[var(--cor-primaria)] text-[var(--texto-sobre-primaria)]' : 'border-[var(--borda)] bg-[var(--fundo-card)] text-[var(--texto-principal)] hover:border-[var(--cor-primaria)] hover:bg-[var(--cor-primaria-suave)]'}`}>
    {bloco.hora}
  </button>
}

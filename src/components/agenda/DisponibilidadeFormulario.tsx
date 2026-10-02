import type { useDisponibilidadeAgenda } from '../../hooks/useDisponibilidadeAgenda'
import { horaAgenda, minutosAgenda, sugestoesHorarioAgenda } from '../../lib/agendaDisponibilidade'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { campoAgenda } from './PainelAgenda'

export function DisponibilidadeFormulario({ consulta, inicio, duracao, onInicio, ocupado, proprioId = '', edicao = false }: {
  consulta: ReturnType<typeof useDisponibilidadeAgenda>; inicio: string; duracao: number | null
  onInicio: (inicio: string) => void; ocupado: boolean; proprioId?: string; edicao?: boolean
}) {
  const opcoes = consulta.estado === 'pronta' ? sugestoesHorarioAgenda(duracao, consulta.janelas, consulta.ocupacoes, proprioId) : []
  const id = edicao ? 'horarios-correcao' : 'sugestoes-criacao'
  return <section aria-label="Disponibilidade para a data" className="space-y-3 text-sm">
    {consulta.estado === 'carregando' ? <p role="status">Verificando disponibilidade...</p>
      : consulta.estado === 'erro' ? <FeedbackAlert variant="destructive" title="Falha ao consultar disponibilidade" description={consulta.bloqueio ?? ''}
        action={<button type="button" onClick={consulta.repetir} disabled={ocupado}>Tentar novamente</button>} />
        : <>
          <div className="space-y-1"><label className="block" htmlFor={id}>{edicao ? 'Horários disponíveis' : 'Horários sugeridos'}</label>
            <select id={id} className={campoAgenda} value={opcoes.includes(inicio) ? inicio : ''} disabled={ocupado || !opcoes.length} onChange={e => { if (e.target.value) onInicio(e.target.value) }}>
              <option value="">{opcoes.length ? 'Selecione um horário sugerido' : 'Nenhum horário sugerido disponível'}</option>
              {opcoes.map(h => <option key={h} value={h}>{h}–{horaAgenda(minutosAgenda(h) + (duracao ?? 0))}</option>)}
            </select>
          </div>
          <p className="text-xs text-[var(--texto-secundario)]">{opcoes.length ? 'Sem conflito na consulta atual. Não é reserva; o servidor valida ao salvar.' : `Nenhuma sugestão habitual comporta ${duracao ?? '?'} minutos. Confira os avisos para digitar um horário manual.`}</p>
          <details className="text-xs text-[var(--texto-secundario)]"><summary className="min-h-8 cursor-pointer">Faixas habituais na data</summary><p className="py-1">{consulta.janelas.length ? consulta.janelas.map(j => `${j.hora_inicio?.slice(0, 5)}–${j.hora_fim?.slice(0, 5)}`).join(' / ') : 'Sem expediente disponível.'}</p></details>
          {consulta.bloqueio && <FeedbackAlert variant="warning" title="Revise o horário" description={consulta.bloqueio} />}
          {consulta.aviso && <FeedbackAlert variant="warning" title="Marcação manual" description={consulta.aviso} />}
        </>}
  </section>
}

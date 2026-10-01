import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { ModalBase } from '../ModalBase'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { horaAgenda, minutosAgenda, sugestoesHorarioAgenda } from '../../lib/agendaDisponibilidade'
import { useDisponibilidadeAgenda } from '../../hooks/useDisponibilidadeAgenda'

export interface AgendamentoEditavel {
  id: string; paciente_nome: string; profissional_id: string; paciente_id: string
  data: string; hora_inicio: string; hora_fim: string; status: string; updated_at: string
}
const campo = 'w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60'
const exibirData = (data: string) => data.split('-').reverse().join('/')

export function EditarAgendamento({ agendamento, clinicaId, clinicaNome, profissionalNome, duracao,
  onFechar, onSalvo }: { agendamento: AgendamentoEditavel; clinicaId: string; clinicaNome: string;
    profissionalNome: string; duracao: number | null; onFechar: () => void;
    onSalvo: (data: string) => void }) {
  const [data, setData] = useState(agendamento.data)
  const chegou = agendamento.status === 'aguardando'
  const [inicio, setInicio] = useState(agendamento.hora_inicio.slice(0, 5))
  const [motivo, setMotivo] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [capacidade, setCapacidade] = useState<'carregando' | 'pronta' | 'indisponivel'>('carregando')
  const consulta = useDisponibilidadeAgenda(clinicaId, agendamento.profissional_id, data, inicio, duracao, agendamento.id)
  const [salvando, setSalvando] = useState(false)
  const [resultadoIncerto, setResultadoIncerto] = useState(false)
  const estadoConsulta = consulta.estado
  const validacao = consulta.bloqueio
  const opcoes = estadoConsulta === 'pronta' ? sugestoesHorarioAgenda(duracao, consulta.janelas, consulta.ocupacoes, agendamento.id) : []
  const impedimentos = [
    salvando ? 'Aguarde o término do salvamento.' : null,
    resultadoIncerto ? 'Confira o resultado na Agenda antes de outro envio.' : null,
    capacidade !== 'pronta' ? capacidade === 'carregando' ? 'Aguarde a verificação do recurso de correção.' : 'Recurso de correção indisponível.' : null,
    !data ? 'Informe a nova data.' : null, validacao,
    motivo.trim().length < 5 || motivo.trim().length > 500 ? 'Informe um motivo entre 5 e 500 caracteres.' : null,
    data === agendamento.data && inicio === agendamento.hora_inicio.slice(0, 5) ? 'Nenhuma alteração para salvar.' : null,
    !confirmado ? 'Marque a confirmação da correção.' : null,
  ].filter((texto): texto is string => !!texto)
  const [erro, setErro] = useState<{ texto: string; atencao: boolean } | null>(null)
  const envio = useRef(false)
  const vigente = useRef(true)
  useEffect(() => { vigente.current = true; return () => { vigente.current = false } }, [])
  useEffect(() => {
    let atual = true
    setCapacidade('carregando')
    void Promise.resolve(supabase.rpc('agenda_manual_disponivel', { p_clinica_id: clinicaId }))
      .then(({ data: disponivel, error }) => { if (atual) setCapacidade(!error && disponivel === true ? 'pronta' : 'indisponivel') })
      .catch(() => { if (atual) setCapacidade('indisponivel') })
    return () => { atual = false }
  }, [clinicaId])
  useEffect(() => { setConfirmado(false) }, [data, inicio])

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (envio.current || impedimentos.length) return
    if (chegou && data !== agendamento.data) {
      setErro({ texto: 'Após a chegada, corrija somente o horário na mesma data. Para outra data, use o fluxo específico de reagendamento, preservando a chegada.', atencao: true }); return
    }
    if (data === agendamento.data && inicio === agendamento.hora_inicio.slice(0, 5)) {
      setErro({ texto: 'Nenhuma alteração para salvar.', atencao: true }); return
    }
    envio.current = true; setSalvando(true); setErro(null)
    try {
      const { data: retorno, error } = await supabase.rpc('agenda_manual_corrigir_horario', {
        p_clinica_id: clinicaId, p_agendamento_id: agendamento.id, p_revisao: agendamento.updated_at,
        p_status: agendamento.status, p_data_anterior: agendamento.data, p_inicio_anterior: agendamento.hora_inicio,
        p_nova_data: data, p_novo_inicio: inicio, p_motivo: motivo.trim(), p_confirmacao_manual: confirmado,
      })
      if (!vigente.current) return
      if (error) {
        if (!error.code) setResultadoIncerto(true)
        const mensagens: Record<string, string> = {
          '23P01': 'Há outro agendamento nesse horário. Revise antes de salvar.',
          '40001': 'O agendamento mudou. Feche e reabra para revisar antes de salvar.',
          '42501': 'Você não tem autorização para corrigir este agendamento nesta clínica.',
          'PGRST202': 'Serviço incompatível ou em atualização. Preserve seu preenchimento e atualize a página antes de tentar novamente. Não será usada uma gravação alternativa.',
        }
        setErro({ texto: mensagens[error.code] ?? (error.code === 'P0001' ? 'O servidor recusou a correção por disponibilidade, situação ou vínculo. Revise o agendamento e o expediente.' : 'Não foi possível salvar. Os dados digitados foram mantidos. Confira a Agenda antes de tentar novamente.'), atencao: ['23P01', '40001', 'P0001'].includes(error.code) })
        return
      }
      if (retorno?.id !== agendamento.id || retorno?.data !== data || retorno?.hora_inicio?.slice(0, 5) !== inicio || retorno?.status !== agendamento.status) {
        setResultadoIncerto(true)
        setErro({ texto: 'Resultado não confirmado. Não repita o envio; confira a Agenda por leitura.', atencao: true }); return
      }
      onSalvo(data)
    } catch {
      if (vigente.current) {
        setResultadoIncerto(true)
        setErro({ texto: 'Resultado indisponível. Não repita o envio; confira a Agenda por leitura.', atencao: true })
      }
    } finally { envio.current = false; if (vigente.current) setSalvando(false) }
  }
  return <ModalBase titulo="Editar agendamento" onFechar={onFechar} ocupado={salvando}>
    <form onSubmit={salvar} className="space-y-4">
      <dl className="space-y-2 text-sm"><div><dt>Clínica</dt><dd className="font-semibold">{clinicaNome}</dd></div><div><dt>Paciente</dt><dd className="font-semibold">{agendamento.paciente_nome}</dd></div><div><dt>Profissional</dt><dd className="font-semibold">{profissionalNome}</dd></div><div><dt>Situação preservada</dt><dd>{agendamento.status === 'aguardando' ? 'Aguardando' : agendamento.status === 'confirmado' ? 'Confirmado' : 'Agendado'}</dd></div></dl>
      <p className="text-sm">Horário anterior: <strong>{exibirData(agendamento.data)} às {agendamento.hora_inicio.slice(0, 5)}</strong></p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">Nova data<input className={campo} type="date" required value={data} disabled={salvando || chegou} onChange={e => setData(e.target.value)} /></label>
        <label className="text-sm">Novo horário<input className={campo} type="time" required value={inicio} disabled={salvando} onChange={e => setInicio(e.target.value)} /></label>
      </div>
      {estadoConsulta === 'pronta' && <section aria-label="Disponibilidade para a data" className="space-y-2 text-sm">
        <p>Faixas habituais na data: {consulta.janelas.length ? consulta.janelas.map(j => `${j.hora_inicio?.slice(0, 5)}–${j.hora_fim?.slice(0, 5)}`).join(' / ') : 'sem expediente disponível'}. Agenda manual: as faixas orientam as sugestões; folgas e limites de horário especial continuam obrigatórios.</p>
        <label className="block" htmlFor="horarios-correcao">Horários disponíveis</label><select id="horarios-correcao" className={campo} value={opcoes.includes(inicio) ? inicio : ''} disabled={salvando || !opcoes.length} onChange={e => { if (e.target.value) setInicio(e.target.value) }}>
          <option value="">{opcoes.length ? 'Selecione um horário sugerido' : 'Nenhum horário sugerido disponível'}</option>
          {opcoes.map(h => <option key={h} value={h}>{h}–{horaAgenda(minutosAgenda(h) + (duracao ?? 0))}</option>)}
        </select>
        <p>{opcoes.length ? 'Sugestões a cada 5 minutos. Você também pode digitar outro horário; duração, bloqueios e conflitos serão verificados.' : `Nenhuma sugestão habitual comporta ${duracao ?? '?'} minutos. Você pode digitar um horário manual, desde que não haja bloqueio ou conflito.`}</p>
      </section>}
      {chegou && <FeedbackAlert variant="warning" title="Chegada preservada" description="Após a chegada e antes do atendimento, somente o horário pode ser corrigido na mesma data. A chegada e a posição na fila serão mantidas. Para mudar a data, é necessário o fluxo específico de reagendamento." />}
      <p className="text-sm">Novo horário: <strong>{exibirData(data)} às {inicio}</strong>{duracao ? ` · ${duracao} minutos` : ''}. Paciente, profissional, clínica, situação e pagamentos não serão trocados.</p>
      <label className="block text-sm">Motivo da correção<textarea className={campo} required minLength={5} maxLength={500} rows={3} value={motivo} disabled={salvando} onChange={e => setMotivo(e.target.value)} /><span className="text-xs">Descreva apenas a correção, sem documentos ou informações clínicas.</span></label>
      {capacidade === 'carregando' && <p role="status">Verificando recurso de correção...</p>}
      {capacidade === 'indisponivel' && <FeedbackAlert variant="warning" title="Correção ainda indisponível" description="Não foi possível confirmar a operação autorizada nesta sessão. Pode haver falha de serviço, permissão ou versão incompatível. Preserve seu preenchimento; consulte novamente ao reabrir ou atualize a página. Nenhuma gravação alternativa será realizada." />}
      {estadoConsulta === 'carregando' ? <p role="status">Verificando disponibilidade...</p> : estadoConsulta === 'erro' ? <FeedbackAlert variant="destructive" title="Falha ao consultar disponibilidade" description={validacao ?? ''} action={<button type="button" onClick={consulta.repetir} disabled={salvando}>Tentar novamente</button>} /> : validacao && <FeedbackAlert variant="warning" title="Revise o horário" description={validacao} />}
      {consulta.aviso && <FeedbackAlert variant="warning" title="Marcação manual" description={consulta.aviso} />}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmado} disabled={salvando} onChange={e => setConfirmado(e.target.checked)} />Conferi o horário anterior e o novo, os avisos de disponibilidade e confirmo a correção.</label>
      {erro && <FeedbackAlert variant={erro.atencao ? 'warning' : 'destructive'} title={erro.atencao ? 'Revisão necessária' : 'Não foi possível salvar'} description={erro.texto} urgent />}
      <div id="pendencias-correcao" role="status" className="text-sm">{impedimentos.length ? <><p>{impedimentos.length === 1 && !confirmado ? 'Só falta confirmar a correção para salvar.' : 'Para salvar:'}</p><ul className="list-inside list-disc">{impedimentos.map(p => <li key={p}>{p}</li>)}</ul></> : <p>Correção pronta para salvar. A disponibilidade será novamente validada pelo servidor.</p>}</div>
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onFechar} disabled={salvando} className="min-h-11 rounded-xl border border-[var(--borda)] px-4 py-2">Cancelar</button><button type="submit" aria-describedby="pendencias-correcao" disabled={impedimentos.length > 0} className="min-h-11 rounded-xl bg-[var(--cor-primaria)] px-4 py-2 font-semibold text-[var(--fundo-card)] disabled:opacity-60">{salvando ? 'Salvando…' : 'Salvar alterações'}</button></div>
    </form>
  </ModalBase>
}

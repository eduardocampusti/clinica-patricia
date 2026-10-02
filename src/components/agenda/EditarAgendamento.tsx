import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { PainelAgenda, ResumoHorario, campoAgenda } from './PainelAgenda'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { horaAgenda, minutosAgenda } from '../../lib/agendaDisponibilidade'
import { useDisponibilidadeAgenda } from '../../hooks/useDisponibilidadeAgenda'
import { useSugestoesRemarcacao } from '../../hooks/useSugestoesRemarcacao'
import { DisponibilidadeFormulario } from './DisponibilidadeFormulario'
import { FaixaDiasAgenda } from './FaixaDiasAgenda'
import { useDescarteAgenda } from './useDescarteAgenda'

export interface AgendamentoEditavel {
  id: string; paciente_nome: string; profissional_id: string; paciente_id: string
  data: string; hora_inicio: string; hora_fim: string; status: string; updated_at: string
}
const campo = campoAgenda
const exibirData = (data: string) => data.split('-').reverse().join('/')
const SITUACOES_REMARCAVEIS = ['agendado', 'confirmado', 'aguardando']
const MOTIVOS_RAPIDOS = ['Pedido do paciente', 'Pedido do profissional', 'Imprevisto da clínica']
const semana = (data: string) => { const s = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''); return s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1) }
const dataCompleta = (data: string) => `${semana(data)}, ${exibirData(data)}`
const juntar = (itens: string[]) => itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : itens[0] ?? ''
const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)]'

export function EditarAgendamento({ agendamento, clinicaId, clinicaNome, profissionalNome, duracao,
  onFechar, onSalvo }: { agendamento: AgendamentoEditavel; clinicaId: string; clinicaNome: string;
    profissionalNome: string; duracao: number | null; onFechar: () => void;
    onSalvo: (data: string) => void }) {
  const [data, setData] = useState(agendamento.data)
  const chegou = agendamento.status === 'aguardando'
  const [inicio, setInicio] = useState(agendamento.hora_inicio.slice(0, 5))
  const [motivo, setMotivo] = useState('')
  const [opcaoMotivo, setOpcaoMotivo] = useState<string | null>(null)
  const [confirmado, setConfirmado] = useState(false)
  const [capacidade, setCapacidade] = useState<'carregando' | 'pronta' | 'indisponivel'>('carregando')
  const consulta = useDisponibilidadeAgenda(clinicaId, agendamento.profissional_id, data, inicio, duracao, agendamento.id)
  const [salvando, setSalvando] = useState(false)
  const [resultadoIncerto, setResultadoIncerto] = useState(false)
  const validacao = consulta.bloqueio
  const descarte = useDescarteAgenda(data !== agendamento.data || inicio !== agendamento.hora_inicio.slice(0, 5) || !!motivo || confirmado, salvando, onFechar)
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
  const campoMotivo = useRef<HTMLTextAreaElement>(null)
  const secaoOutraData = useRef<HTMLHeadingElement>(null)
  const remarcavel = SITUACOES_REMARCAVEIS.includes(agendamento.status)
  const inicioAnterior = agendamento.hora_inicio.slice(0, 5)
  const sugestoes = useSugestoesRemarcacao({ clinicaId, profissionalId: remarcavel ? agendamento.profissional_id : '', proprioId: agendamento.id,
    dataAtual: agendamento.data, inicioAtual: inicioAnterior, duracao, somenteMesmaData: chegou })
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
  useEffect(() => { if (opcaoMotivo === 'Outro') campoMotivo.current?.focus() }, [opcaoMotivo])

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
  const pendencias = <div id="pendencias-correcao" role="status" className={remarcavel ? 'sr-only' : 'text-sm'}>{impedimentos.length ? <><p>{impedimentos.length === 1 && !confirmado ? 'Só falta confirmar a correção para salvar.' : 'Para salvar:'}</p><ul className="list-inside list-disc">{impedimentos.map(p => <li key={p}>{p}</li>)}</ul></> : <p>Correção pronta para salvar. A disponibilidade será novamente validada pelo servidor.</p>}</div>
  const avisos = <>
    {capacidade === 'carregando' && <p role="status">Verificando recurso de correção...</p>}
    {capacidade === 'indisponivel' && <FeedbackAlert variant="warning" title="Correção ainda indisponível" description="Não foi possível confirmar a operação autorizada nesta sessão. Pode haver falha de serviço, permissão ou versão incompatível. Preserve seu preenchimento; consulte novamente ao reabrir ou atualize a página. Nenhuma gravação alternativa será realizada." />}
    {chegou && <FeedbackAlert variant="warning" title="Chegada preservada" description="Corrija somente o horário na mesma data. Chegada e posição na fila serão mantidas; outra data exige o reagendamento específico." />}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmado} disabled={salvando} onChange={e => setConfirmado(e.target.checked)} />Conferi o horário anterior e o novo, os avisos de disponibilidade e confirmo a correção.</label>
    {erro && <FeedbackAlert variant={erro.atencao ? 'warning' : 'destructive'} title={erro.atencao ? 'Revisão necessária' : 'Não foi possível salvar'} description={erro.texto} urgent />}
  </>

  // Situação que não admite mudança de data nem horário: painel anterior, sem alterações.
  if (!remarcavel) return <PainelAgenda titulo="Editar agendamento" onFechar={descarte.solicitarFechar} ocupado={salvando}>
    <form onSubmit={salvar} className="agenda-formulario"><div className="agenda-formulario-conteudo space-y-4">
      <div className="space-y-1 border-b border-[var(--borda)] pb-3"><p className="text-xs text-[var(--texto-secundario)]">{clinicaNome} · {agendamento.status === 'aguardando' ? 'Aguardando' : agendamento.status === 'confirmado' ? 'Confirmado' : 'Agendado'}</p><h3 className="break-words text-lg font-semibold">{agendamento.paciente_nome}</h3><p className="text-sm text-[var(--texto-secundario)]">{profissionalNome}</p></div>
      <label className="block text-sm">Nova data<input className={campo} type="date" required value={data} disabled={salvando || chegou} onChange={e => setData(e.target.value)} /></label>
      <DisponibilidadeFormulario consulta={consulta} inicio={inicio} duracao={duracao} onInicio={setInicio} ocupado={salvando} proprioId={agendamento.id} edicao />
      <section aria-label="Comparação de horários" className="space-y-2"><div><p className="mb-1 text-xs font-medium">Horário anterior · {exibirData(agendamento.data)}</p><ResumoHorario label="Horário anterior" inicio={inicioAnterior} duracao={minutosAgenda(agendamento.hora_fim) - minutosAgenda(agendamento.hora_inicio)} /></div>
        <div><p className="mb-1 text-xs font-medium">Novo horário · {exibirData(data)}</p><ResumoHorario inicio={inicio} duracao={duracao} /></div></section>
      <label className="block text-sm">Motivo da correção<textarea className={campo} required minLength={5} maxLength={500} rows={3} value={motivo} disabled={salvando} onChange={e => setMotivo(e.target.value)} /><span className="text-xs">Descreva apenas a correção, sem documentos ou informações clínicas.</span></label>
      <section aria-label="Avisos e confirmação" className="space-y-3 border-t border-[var(--borda)] pt-3">{avisos}</section>
      </div><div className="agenda-formulario-rodape space-y-2">
      {pendencias}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={descarte.solicitarFechar} disabled={salvando} className="min-h-11 rounded-xl border border-[var(--borda)] px-4 py-2">Cancelar</button><button type="submit" aria-describedby="pendencias-correcao" disabled={impedimentos.length > 0} className="min-h-11 rounded-xl bg-[var(--cor-primaria)] px-4 py-2 font-semibold text-[var(--texto-sobre-primaria)] disabled:opacity-60">{salvando ? 'Salvando…' : 'Salvar alterações'}</button></div>
    </div></form>
    {descarte.confirmacao}
  </PainelAgenda>

  const duracaoAnterior = minutosAgenda(agendamento.hora_fim) - minutosAgenda(agendamento.hora_inicio)
  const alterou = data !== agendamento.data || inicio !== inicioAnterior
  const fimNovo = /^\d{2}:\d{2}$/.test(inicio) && duracao ? minutosAgenda(inicio) + duracao : null
  const faltas = [
    resultadoIncerto ? 'conferir a Agenda' : null,
    capacidade !== 'pronta' ? 'confirmação do serviço' : null,
    !alterou ? 'novo horário' : validacao ? consulta.estado === 'pronta' ? 'ajuste do horário' : consulta.estado === 'erro' ? 'consulta da disponibilidade' : 'verificação da disponibilidade' : null,
    motivo.trim().length < 5 || motivo.trim().length > 500 ? 'motivo' : null,
    !confirmado ? 'confirmação' : null,
  ].filter((f): f is string => !!f)
  const rotuloDia = (d: string) => d === sugestoes.hoje ? `Hoje, ${semana(d)} ${exibirData(d).slice(0, 5)}` : `${semana(d)} ${exibirData(d).slice(0, 5)}`
  const escolherMotivo = (opcao: string) => { setOpcaoMotivo(opcao); setMotivo(opcao === 'Outro' ? '' : opcao) }
  return <PainelAgenda titulo="Remarcar agendamento" subtitulo={`${agendamento.paciente_nome} · ${duracaoAnterior} min`} onFechar={descarte.solicitarFechar} ocupado={salvando}>
    <form onSubmit={salvar} className="agenda-formulario"><div className="agenda-formulario-conteudo space-y-7">
      <section aria-label="Comparação de horários" className="grid items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
        <div role="group" aria-label="Horário anterior" className="space-y-0.5 rounded-xl bg-[var(--fundo-pagina)] p-4">
          <p className="text-xs text-[var(--texto-secundario)]">Horário atual</p>
          <p className="agenda-fonte-tecnica text-xl font-semibold text-[var(--texto-secundario)] line-through"><span className="sr-only">Antes: </span>{inicioAnterior}–{agendamento.hora_fim.slice(0, 5)}</p>
          <p className="font-semibold">{dataCompleta(agendamento.data)}</p>
          <p className="text-sm text-[var(--texto-secundario)]">{profissionalNome} · {duracaoAnterior} min</p>
        </div>
        <span aria-hidden="true" className="flex items-center justify-center text-xl text-[var(--texto-secundario)]"><span className="rotate-90 sm:rotate-0">→</span></span>
        <div role="group" aria-label="Resumo do horário" aria-live="polite" className="space-y-0.5 rounded-xl border-2 border-[var(--cor-primaria)] p-4">
          <p className="text-xs text-[var(--texto-secundario)]">Novo horário</p>
          {alterou ? <>
            <p className="agenda-fonte-tecnica text-xl font-semibold">{inicio || '—'}–{fimNovo !== null && fimNovo < 1440 ? horaAgenda(fimNovo) : '—'}</p>
            <p className="font-semibold">{data ? dataCompleta(data) : 'Data não informada'}</p>
            <p className="text-sm text-[var(--texto-secundario)]">{profissionalNome}{duracao ? ` · ${duracao} min` : ''}</p>
          </> : <p className="pt-1 font-semibold text-[var(--texto-secundario)]">Escolha um novo horário</p>}
        </div>
      </section>

      <section aria-labelledby="remarcar-sugestoes" className="space-y-3">
        <div><h3 id="remarcar-sugestoes" className="text-base font-medium">Próximos horários livres</h3>
          <p className="text-xs text-[var(--texto-secundario)]">{chegou ? 'Mesmo profissional, na mesma data (chegada registrada).' : 'Mesmo profissional, nos próximos 14 dias.'} Não é reserva; o servidor valida ao confirmar.</p></div>
        {sugestoes.estado === 'carregando' ? <p role="status" className="text-sm text-[var(--texto-secundario)]">Buscando horários livres...</p>
          : sugestoes.estado === 'erro' ? <p className="rounded-xl bg-[var(--fundo-pagina)] px-4 py-3 text-sm text-[var(--texto-secundario)]">Não foi possível buscar sugestões agora. Escolha a data e o horário abaixo.</p>
          : !sugestoes.sugestoes.length ? <div className="rounded-xl border border-dashed border-[var(--borda)] bg-[var(--fundo-pagina)] px-4 py-4 text-center">
            <p className="font-medium">{chegou ? 'Nenhum horário livre encontrado nesta data' : 'Nenhum horário livre encontrado nos próximos 14 dias'}</p>
            <p className="mt-1 text-sm text-[var(--texto-secundario)]">A marcação manual continua possível, com aviso e confirmação.</p>
            <button type="button" className={`mt-3 min-h-11 rounded-lg bg-[var(--cor-primaria-suave)] px-4 text-sm font-semibold text-[var(--cor-primaria)] ${foco}`}
              onClick={() => { secaoOutraData.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); secaoOutraData.current?.focus() }}>Escolher data e horário manualmente</button>
          </div>
          : <div role="group" aria-labelledby="remarcar-sugestoes" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sugestoes.sugestoes.map(s => {
              const escolhida = s.data === data && s.hora === inicio
              return <button key={`${s.data}-${s.hora}`} type="button" aria-pressed={escolhida} disabled={salvando} onClick={() => { setData(s.data); setInicio(s.hora) }}
                aria-label={`${new Date(`${s.data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${s.hora} — ${s.etiqueta}`}
                className={`flex min-h-11 flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition disabled:opacity-60 ${foco} ${escolhida ? 'border-[var(--cor-primaria)] bg-[var(--cor-primaria)] text-[var(--texto-sobre-primaria)]' : 'border-[var(--borda)] bg-[var(--fundo-card)] hover:border-[var(--cor-primaria)]'}`}>
                <span className="text-sm">{rotuloDia(s.data)}</span>
                <span className="agenda-fonte-tecnica text-xl font-semibold">{s.hora}</span>
                <span className={`text-xs ${escolhida ? '' : 'text-[var(--texto-secundario)]'}`}>{s.etiqueta}</span>
              </button>
            })}
          </div>}
      </section>

      <section aria-labelledby="remarcar-outra-data" className="space-y-3">
        <h3 ref={secaoOutraData} tabIndex={-1} id="remarcar-outra-data" className="text-base font-medium outline-none">Escolher outra data</h3>
        {!chegou && <FaixaDiasAgenda clinicaId={clinicaId} profissionalId={agendamento.profissional_id} data={data} duracao={duracao} onData={setData} ocupado={salvando} />}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--texto-secundario)]">{data ? <>Data escolhida: <span className="font-medium text-[var(--texto-principal)]">{dataCompleta(data)}</span></> : 'Nenhuma data escolhida.'}</p>
          <label className="flex items-center gap-2 text-sm font-medium">Nova data
            <input className="min-h-11 rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-2 text-sm text-[var(--texto-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:opacity-60" type="date" required value={data} disabled={salvando || chegou} onChange={e => setData(e.target.value)} />
          </label>
        </div>
        <DisponibilidadeFormulario consulta={consulta} inicio={inicio} duracao={duracao} onInicio={setInicio} ocupado={salvando} proprioId={agendamento.id} edicao />
      </section>

      <section aria-labelledby="remarcar-motivo" className="space-y-3">
        <h3 id="remarcar-motivo" className="text-base font-medium">Motivo da remarcação</h3>
        <div role="group" aria-labelledby="remarcar-motivo" className="flex flex-wrap gap-2">
          {[...MOTIVOS_RAPIDOS, 'Outro'].map(opcao => <button key={opcao} type="button" aria-pressed={opcaoMotivo === opcao} disabled={salvando} onClick={() => escolherMotivo(opcao)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium transition disabled:opacity-60 ${foco} ${opcaoMotivo === opcao ? 'border-[var(--texto-principal)] bg-[var(--texto-principal)] text-[var(--fundo-card)]' : 'border-[var(--borda)] bg-[var(--fundo-card)] hover:border-[var(--texto-secundario)]'}`}>{opcao}</button>)}
        </div>
        {opcaoMotivo === 'Outro' && <label className="block text-sm">Descreva o motivo da correção
          <textarea ref={campoMotivo} className={campo} required minLength={5} maxLength={500} rows={3} value={motivo} disabled={salvando} onChange={e => setMotivo(e.target.value)} />
          <span className="text-xs text-[var(--texto-secundario)]">Entre 5 e 500 caracteres. Descreva apenas a correção, sem documentos ou informações clínicas.</span></label>}
      </section>

      <section aria-label="Avisos e confirmação" className="space-y-3 border-t border-[var(--borda)] pt-4">{avisos}</section>
      </div>
      <div className="agenda-formulario-rodape">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="min-w-0 basis-full text-sm text-[var(--texto-secundario)] sm:basis-0 sm:flex-1">
            {salvando ? 'Salvando remarcação...' : faltas.length ? `Falta: ${juntar(faltas)}` : `O horário das ${inicioAnterior} de ${dataCompleta(agendamento.data)} volta a ficar livre assim que a remarcação for confirmada.`}
          </p>
          <div className="ml-auto flex shrink-0 gap-3">
            <button type="button" onClick={descarte.solicitarFechar} disabled={salvando} className={`min-h-11 rounded-lg border border-[var(--borda)] px-4 font-medium transition hover:bg-[var(--fundo-pagina)] disabled:opacity-60 ${foco}`}>Cancelar</button>
            <button type="submit" aria-describedby="pendencias-correcao" disabled={impedimentos.length > 0} className={`min-h-11 rounded-lg bg-[var(--cor-primaria)] px-5 font-semibold text-[var(--texto-sobre-primaria)] transition hover:bg-[var(--cor-primaria-hover)] disabled:cursor-not-allowed disabled:opacity-60 ${foco}`}>{salvando ? 'Salvando…' : 'Confirmar remarcação'}</button>
          </div>
        </div>
        {pendencias}
      </div>
    </form>
    {descarte.confirmacao}
  </PainelAgenda>
}

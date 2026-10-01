import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { ModalBase } from '../ModalBase'
import { FeedbackAlert } from '../feedback/FeedbackAlert'

export interface AgendamentoEditavel {
  id: string; paciente_nome: string; profissional_id: string; paciente_id: string
  data: string; hora_inicio: string; hora_fim: string; status: string; updated_at: string
}
const campo = 'w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60'
const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))
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
  const [validacao, setValidacao] = useState<string | null>('Verificando disponibilidade...')
  const [salvando, setSalvando] = useState(false)
  const [resultadoIncerto, setResultadoIncerto] = useState(false)
  const [erro, setErro] = useState<{ texto: string; atencao: boolean } | null>(null)
  const envio = useRef(false)
  const vigente = useRef(true)
  useEffect(() => { vigente.current = true; return () => { vigente.current = false } }, [])
  useEffect(() => {
    let atual = true
    void supabase.rpc('agenda_correcao_disponivel', { p_clinica_id: clinicaId })
      .then(({ data: disponivel, error }) => { if (atual) setCapacidade(!error && disponivel === true ? 'pronta' : 'indisponivel') })
    return () => { atual = false }
  }, [clinicaId])
  useEffect(() => {
    let atual = true
    setConfirmado(false)
    setValidacao('Verificando disponibilidade...')
    if (!data || !inicio || !duracao || duracao <= 0 || minutos(inicio) + duracao >= 1440) {
      setValidacao('Informe data e horário com duração válida.'); return
    }
    const fim = minutos(inicio) + duracao
    const dia = new Date(`${data}T12:00:00`).getDay()
    void Promise.all([
      supabase.from('disponibilidade_padrao').select('hora_inicio, hora_fim').eq('clinica_id', clinicaId).eq('profissional_id', agendamento.profissional_id).eq('dia_semana', dia).eq('ativo', true),
      supabase.from('agenda_excecoes').select('tipo, hora_inicio, hora_fim').eq('clinica_id', clinicaId).eq('profissional_id', agendamento.profissional_id).eq('data', data),
      supabase.from('agendamentos').select('id, hora_inicio, hora_fim, status').eq('clinica_id', clinicaId).eq('profissional_id', agendamento.profissional_id).eq('data', data),
    ]).then(([padrao, excecoes, agendas]) => {
      if (!atual) return
      if (padrao.error || excecoes.error || agendas.error) { setValidacao('Disponibilidade indisponível. Feche e reabra para tentar novamente.'); return }
      const ex = excecoes.data?.[0]
      const janelas = ex ? ex.tipo === 'folga' ? [] : [ex] : padrao.data ?? []
      const dentro = janelas.some(j => j.hora_inicio && j.hora_fim && minutos(j.hora_inicio) <= minutos(inicio) && minutos(j.hora_fim) >= fim)
      const conflito = agendas.data?.some(a => a.id !== agendamento.id && a.status !== 'cancelado' && minutos(a.hora_inicio) < fim && minutos(a.hora_fim) > minutos(inicio))
      setValidacao(!dentro ? 'Horário fora da disponibilidade. Revise o expediente; este fluxo não autoriza encaixes.' : conflito ? 'Há outro agendamento nesse horário. Escolha um horário disponível.' : null)
    })
    return () => { atual = false }
  }, [data, inicio, duracao, clinicaId, agendamento.profissional_id, agendamento.id])

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (envio.current || resultadoIncerto || capacidade !== 'pronta' || validacao || !confirmado) return
    if (chegou && data !== agendamento.data) {
      setErro({ texto: 'Após a chegada, corrija somente o horário na mesma data. Para outra data, use o fluxo específico de reagendamento, preservando a chegada.', atencao: true }); return
    }
    if (data === agendamento.data && inicio === agendamento.hora_inicio.slice(0, 5)) {
      setErro({ texto: 'Nenhuma alteração para salvar.', atencao: true }); return
    }
    envio.current = true; setSalvando(true); setErro(null)
    try {
      const { data: retorno, error } = await supabase.rpc('agenda_corrigir_horario', {
        p_clinica_id: clinicaId, p_agendamento_id: agendamento.id, p_revisao: agendamento.updated_at,
        p_status: agendamento.status, p_data_anterior: agendamento.data, p_inicio_anterior: agendamento.hora_inicio,
        p_nova_data: data, p_novo_inicio: inicio, p_motivo: motivo.trim(),
      })
      if (!vigente.current) return
      if (error) {
        if (!error.code) setResultadoIncerto(true)
        const mensagens: Record<string, string> = {
          '23P01': 'Há outro agendamento nesse horário. Revise antes de salvar.',
          '40001': 'O agendamento mudou. Feche e reabra para revisar antes de salvar.',
          '42501': 'Você não tem autorização para corrigir este agendamento nesta clínica.',
          'PGRST202': 'A correção de horário ainda não está disponível no banco deste ambiente.',
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
      {chegou && <FeedbackAlert variant="warning" title="Chegada preservada" description="Após a chegada e antes do atendimento, somente o horário pode ser corrigido na mesma data. A chegada e a posição na fila serão mantidas. Para mudar a data, é necessário o fluxo específico de reagendamento." />}
      <p className="text-sm">Novo horário: <strong>{exibirData(data)} às {inicio}</strong>{duracao ? ` · ${duracao} minutos` : ''}. Paciente, profissional, clínica, situação e pagamentos não serão trocados.</p>
      <label className="block text-sm">Motivo da correção<textarea className={campo} required minLength={5} maxLength={500} rows={3} value={motivo} disabled={salvando} onChange={e => setMotivo(e.target.value)} /><span className="text-xs">Descreva apenas a correção, sem documentos ou informações clínicas.</span></label>
      {capacidade === 'carregando' && <p role="status">Verificando recurso de correção...</p>}
      {capacidade === 'indisponivel' && <FeedbackAlert variant="warning" title="Correção ainda indisponível" description="O banco deste ambiente ainda não oferece a operação autorizada. A migration precisa ser revisada e aplicada antes de salvar." />}
      {validacao && <FeedbackAlert variant="warning" title="Revise o horário" description={validacao} />}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmado} disabled={salvando} onChange={e => setConfirmado(e.target.checked)} />Conferi o horário anterior e o novo e confirmo a correção.</label>
      {erro && <FeedbackAlert variant={erro.atencao ? 'warning' : 'destructive'} title={erro.atencao ? 'Revisão necessária' : 'Não foi possível salvar'} description={erro.texto} urgent />}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onFechar} disabled={salvando} className="min-h-11 rounded-xl border border-[var(--borda)] px-4 py-2">Cancelar</button><button type="submit" disabled={salvando || resultadoIncerto || capacidade !== 'pronta' || !!validacao || !confirmado} className="min-h-11 rounded-xl bg-[var(--cor-primaria)] px-4 py-2 font-semibold text-[var(--fundo-card)] disabled:opacity-60">{salvando ? 'Salvando…' : 'Salvar alterações'}</button></div>
    </form>
  </ModalBase>
}

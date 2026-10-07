import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { buscarAtuacao, mensagemAtuacao, salvarAtuacao, valorAtuacao, type AtuacaoEquipe } from '../../lib/equipeAtuacao'
import { supabase } from '../../lib/supabase'
import type { ClinicaEquipe } from '../../lib/equipe'
import type { EstadoRecursoFicha } from './EquipeFotoPainel'
import type { ResumoAtuacao } from '../../lib/equipeApresentacao'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog'
import Profissionais from '../../pages/cadastros/Profissionais'

const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const preco = (v: number | null) => v === null ? 'Não configurado' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function EquipeAtuacaoPainel({ membroId, clinicaId, clinicas, onEstado, onResumo }: {
  membroId: string; clinicaId: string; clinicas: ClinicaEquipe[]; onEstado: (s: EstadoRecursoFicha) => void
  onResumo?: (r: ResumoAtuacao | null) => void
}) {
  const [unidade, setUnidade] = useState(clinicaId)
  const [dados, setDados] = useState<AtuacaoEquipe | null>(null)
  const [carregando, setCarregando] = useState(true), [erro, setErro] = useState<string | null>(null)
  const [campo, setCampo] = useState<'duracao' | 'preco' | null>(null), [valor, setValor] = useState('')
  const [ocupado, setOcupado] = useState(false), [bloqueado, setBloqueado] = useState(false)
  const [confirmar, setConfirmar] = useState(false), [sucesso, setSucesso] = useState<string | null>(null)
  const [horarios, setHorarios] = useState(false), [horarioEstado, setHorarioEstado] = useState<EstadoRecursoFicha>({ ocupado: false, alterado: false })
  const gen = useRef(0), trava = useRef(false), autenticada = useRef(true)
  const consultar = useCallback(async () => {
    if (!autenticada.current) return
    const g = ++gen.current
    setCarregando(true); setErro(null); setDados(null)
    try { const d = await buscarAtuacao(membroId, unidade); if (g === gen.current) { setDados(d); setCampo(null); setBloqueado(false); setConfirmar(false) } }
    catch (e) { if (g === gen.current) setErro(mensagemAtuacao(e)) }
    finally { if (g === gen.current) setCarregando(false) }
  }, [membroId, unidade])
  useEffect(() => {
    void consultar()
    const { data } = supabase.auth.onAuthStateChange(e => {
      if (e === 'SIGNED_OUT') { autenticada.current = false; gen.current++; setDados(null); setCampo(null); setValor(''); setOcupado(false); setHorarios(false); setCarregando(false); setErro('Entre novamente para consultar a atuação.') }
    })
    const invalidar = () => { gen.current++ }
    return () => { invalidar(); data.subscription.unsubscribe() }
  }, [consultar])
  // Resumo da Visão geral, somente com o dado já consultado da clínica de contexto.
  useEffect(() => {
    if (unidade === clinicaId) onResumo?.(dados ? { duracao_minutos: dados.duracao_minutos, valor_consulta: dados.valor_consulta, percentual_clinica: dados.percentual_clinica } : null)
  }, [dados, unidade, clinicaId, onResumo])
  useEffect(() => {
    onEstado({ ocupado: ocupado || horarioEstado.ocupado, alterado: campo !== null || horarioEstado.alterado })
    return () => onEstado({ ocupado: false, alterado: false })
  }, [campo, ocupado, horarioEstado, onEstado])
  useEffect(() => {
    if (campo === null && !horarioEstado.alterado) return
    const proteger = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', proteger)
    return () => window.removeEventListener('beforeunload', proteger)
  }, [campo, horarioEstado.alterado])
  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!dados || !campo || trava.current || bloqueado || !autenticada.current) return
    try { valorAtuacao(campo, valor) } catch { setErro('Informe minutos inteiros positivos ou um preço com até duas casas decimais.'); return }
    const g = gen.current
    trava.current = true; setOcupado(true); setErro(null); setSucesso(null)
    try { const d = await salvarAtuacao(dados, campo, valor); if (g === gen.current) { setDados(d); setCampo(null); setValor(''); setSucesso('Configuração confirmada. Agendamentos e valores financeiros anteriores foram preservados.') } }
    catch (e) { if (g === gen.current) { setErro(mensagemAtuacao(e, true)); setBloqueado(true) } }
    finally { trava.current = false; if (g === gen.current) setOcupado(false) }
  }
  return <div className="equipe-atuacao">
    <label htmlFor="atuacao-unidade">Clínica da atuação<select id="atuacao-unidade" value={unidade} disabled={ocupado || campo !== null || horarios} onChange={e => { gen.current++; setDados(null); setErro(null); setCarregando(true); setSucesso(null); setUnidade(e.target.value) }}>{clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
    {carregando && <p role="status">Consultando atuação nesta clínica…</p>}
    {erro && <FeedbackAlert variant="warning" title="Atuação não confirmada" description={erro}/>}
    {sucesso && <p role="status">{sucesso}</p>}
    <button type="button" disabled={carregando || ocupado || horarioEstado.ocupado || horarioEstado.alterado || !autenticada.current} onClick={() => campo ? setConfirmar(true) : void consultar()}>Reconsultar atuação</button>
    {dados && <>
      <dl className="equipe-ficha-resumo">
        <div><dt>Duração usada pela Agenda</dt><dd>{dados.duracao_minutos} min · configuração do profissional, compartilhada entre suas clínicas.</dd></div>
        <div><dt>Preço da consulta nesta clínica</dt><dd>{preco(dados.valor_consulta)} · configuração do vínculo profissional.</dd></div>
        <div><dt>Participação da clínica</dt><dd>{dados.percentual_clinica === null ? 'Regra vigente não configurada' : `${dados.percentual_clinica}% · regra da clínica, comum aos profissionais.`}{dados.vigente_desde && <span> Vigente desde {new Date(dados.vigente_desde).toLocaleString('pt-BR')}{dados.vigente_ate ? ` até ${new Date(dados.vigente_ate).toLocaleString('pt-BR')}` : ''}.</span>}</dd></div>
      </dl>
      {!campo ? <div className="equipe-ficha-acoes"><button type="button" disabled={!dados.pode_editar_duracao || horarios} onClick={() => { setCampo('duracao'); setValor(String(dados.duracao_minutos)); setSucesso(null) }}>Editar duração da Agenda</button><button type="button" disabled={horarios} onClick={() => { setCampo('preco'); setValor(dados.valor_consulta === null ? '' : String(dados.valor_consulta).replace('.', ',')); setSucesso(null) }}>Editar preço nesta clínica</button></div>
        : <form onSubmit={salvar} aria-label="Configurar atuação"><label htmlFor="atuacao-valor">{campo === 'duracao' ? 'Duração compartilhada (minutos)' : 'Preço nesta clínica (R$)'}<input id="atuacao-valor" inputMode={campo === 'duracao' ? 'numeric' : 'decimal'} value={valor} onChange={e => setValor(e.target.value)} disabled={ocupado}/></label><p>{campo === 'duracao' ? 'Altera a duração sugerida para novos atendimentos em todas as unidades. Horários já marcados permanecem iguais.' : 'Altera o preço de novas consultas desta unidade. Deixar vazio remove a configuração; recebimentos já registrados permanecem iguais.'}</p><div className="equipe-ficha-acoes"><button type="submit" disabled={ocupado || bloqueado}>{ocupado ? 'Salvando…' : 'Salvar configuração'}</button><button type="button" disabled={ocupado} onClick={() => setConfirmar(true)}>Cancelar configuração</button></div></form>}
      {!dados.pode_editar_duracao && <p>A duração exige administração de todos os vínculos ativos do profissional.</p>}
      <h4>Serviços</h4><p>Vínculos individuais de serviços ainda não definidos. O catálogo da clínica não confirma quais serviços este profissional realiza.</p><button type="button" disabled>Configurar serviços — indisponível</button>
      <details><summary>Catálogo existente desta clínica ({dados.catalogo.length})</summary>{dados.catalogo.length ? <ul>{dados.catalogo.map(s => <li key={s.id}>{s.nome} · {s.duracao_minutos} min no cadastro do serviço · {preco(s.preco)}</li>)}</ul> : <p>Nenhum serviço ativo nesta clínica.</p>}<p>A Agenda atual utiliza a duração do profissional e o Financeiro da consulta utiliza o preço do vínculo.</p></details>
      <h4>Disponibilidade para agendamento</h4>{dados.horarios.length ? <ul>{dados.horarios.map((h, i) => <li key={i}>{dias[h.dia_semana]} · {h.hora_inicio.slice(0, 5)}–{h.hora_fim.slice(0, 5)}</li>)}</ul> : <p>Sem horário habitual cadastrado. Marcação manual segue os avisos e impedimentos da Agenda.</p>}
      <p>Disponibilidade da Agenda é diferente da jornada contratual.</p>
      <details><summary>Folgas e horários especiais futuros ({dados.excecoes.length})</summary>{dados.excecoes.length ? <ul>{dados.excecoes.map((e, i) => <li key={i}>{e.data.split('-').reverse().join('/')} · {e.tipo === 'folga' ? 'Folga' : `${e.hora_inicio?.slice(0, 5)}–${e.hora_fim?.slice(0, 5)}`}</li>)}</ul> : <p>Nenhuma exceção futura nesta consulta.</p>}<p>Bloqueios, conflitos e confirmação de marcação manual continuam na Agenda.</p></details>
      <button type="button" disabled={campo !== null || horarioEstado.ocupado || horarioEstado.alterado} onClick={() => { setHorarios(h => !h); if (horarios) void consultar() }}>{horarios ? 'Fechar configuração de horários' : 'Abrir configuração de horários'}</button>
      {horarios && <Profissionais key={`${dados.profissional_id}:${unidade}`} clinicaAtivaId={unidade} carregandoClinica={false} souProprietaria podeGerenciarAgenda profissionalAlvoId={dados.profissional_id} somenteHorarios onEstadoHorarios={setHorarioEstado}/>}
      <p>Repasse usa a regra financeira vigente da clínica. Alteração de percentual não está disponível nesta ficha. PIX e conta ficam em Recebimento e não executam pagamentos.</p>
    </>}
    <ConfirmacaoDialog open={confirmar} onOpenChange={setConfirmar} title="Descartar configuração não salva?" description="O preenchimento será descartado e a configuração confirmada será consultada novamente." confirmLabel="Descartar e reconsultar" tone="warning" disabled={ocupado} onConfirm={() => { setCampo(null); setValor(''); void consultar() }}/>
  </div>
}

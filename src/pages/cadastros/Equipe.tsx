import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ConfirmacaoDialog } from '../../components/feedback/ConfirmacaoDialog'
import { FeedbackAlert } from '../../components/feedback/FeedbackAlert'
import { ModalBase } from '../../components/ModalBase'
import './equipe.css'
import { EquipeListagem } from './EquipeListagem'
import { EquipeAvatar } from '../../components/cadastros/EquipeAvatar'
import { EquipeFotoPainel, type EstadoRecursoFicha } from '../../components/cadastros/EquipeFotoPainel'
import { EquipeRecebimentoPainel } from '../../components/cadastros/EquipeRecebimentoPainel'
import { useEquipeFotos } from '../../components/cadastros/useEquipeFotos'
import { EquipeAtuacaoPainel } from '../../components/cadastros/EquipeAtuacaoPainel'
import { EquipeFichaAmpliada } from '../../components/cadastros/EquipeFichaAmpliada'
import { filtrarEquipe } from '../../lib/equipeLista'
import { supabase } from '../../lib/supabase'
import { formatarCpf } from '../../lib/cpf'
import { formatarTelefoneBrasil } from '../../lib/pacienteFormulario'
import { consultaLegadaEquipePermitida, erroEquipeSeguro } from '../../lib/equipeErros'
import {
  alterarAcessoEquipe, buscarAcessoEquipe, iniciarAcessoEquipe, reenviarConviteEquipe,
  rotuloPapelAcessoEquipe, rotuloStatusAcessoEquipe, statusAcessoCor,
  type AcessoEquipe, type AcaoAcessoEquipe, type ClinicaAcessoEquipe, type EscopoAcessoEquipe,
  type ModoConcessaoEquipe, type PapelAcessoEquipe,
} from '../../lib/equipeAcessos'
import {
  CARGOS_EQUIPE, TIPOS_EQUIPE, cargoEfetivo, formularioAPartirDoDetalhe, formularioEquipeVazio,
  detalheEquipePermiteEdicao, mascararCpfEquipe, mensagemVinculoInativoEquipe, montarDadosEquipe, rotuloTipoEquipe, validarFormularioEquipeDetalhada,
  type CampoFormularioEquipe, type ClinicaEquipe, type DetalheMembroEquipe, type FormularioEquipe,
  type MembroEquipe, type TipoMembroEquipe,
} from '../../lib/equipe'

interface Especialidade { id: string; nome: string }
interface EquipeProps { clinicaAtivaId: string | null; souProprietaria: boolean }

interface AtualizacaoAcessoEquipe {
  onConsultaAcesso: (membroId: string, contexto: string, acesso: AcessoEquipe | null) => void
  onOperacaoAcesso: (membroId: string, contexto: string) => void
}

interface FichaMembroProps extends AtualizacaoAcessoEquipe {
  membro: MembroEquipe
  detalhe: DetalheMembroEquipe | null
  clinicaAtivaId: string | null
  carregando: boolean
  erro: string | null
  indisponivel: boolean
  souProprietaria: boolean
  onFechar: () => void
  onEditar: () => void
  fotos: ReturnType<typeof useEquipeFotos>
}

function textoFicha(valor: string | null | undefined, fallback = 'Não cadastrado'): string {
  return valor && valor.trim() ? valor : fallback
}

function InfoFicha({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return <div className={className}>
    <dt className="text-[var(--texto-secundario)]">{label}</dt>
    <dd className="mt-0.5 break-words">{value}</dd>
  </div>
}

function FichaResumo({ membro, detalhe, clinicaAtivaId }: { membro: MembroEquipe; detalhe: DetalheMembroEquipe | null; clinicaAtivaId: string | null }) {
  const dados = detalhe ?? membro
  const profissional = dados.tipo === 'profissional_saude'
  return <div data-testid="ficha-conteudo" className="space-y-6">
    {membro.origem_legada && <FeedbackAlert
      variant="warning"
      title="Cadastro legado: consulta limitada"
      description="Esta ficha usa os dados já existentes do cadastro antigo. Contatos, UF, CPF e o estado detalhado de acesso não estão disponíveis nesta consulta."
    />}

    <section aria-labelledby="ficha-identificacao-titulo" data-testid="ficha-secao-identificacao">
      <h3 id="ficha-identificacao-titulo" className="mb-3 text-base font-semibold">Identificação</h3>
      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <InfoFicha className="sm:col-span-2" label="Nome completo" value={textoFicha(dados.nome_completo)} />
        <InfoFicha label="Cargo ou função" value={textoFicha(dados.cargo)} />
        <InfoFicha label="Tipo de membro" value={rotuloTipoEquipe(dados.tipo)} />
        <InfoFicha label="Situação cadastral" value="Pessoa cadastrada" />
        <InfoFicha label="CPF" value={detalhe ? mascararCpfEquipe(detalhe.cpf, detalhe.cpf_situacao) : 'Indisponível nesta consulta'} />
        <InfoFicha label="Tel./WhatsApp" value={textoFicha(dados.telefone)} />
        <InfoFicha label="E-mail de contato" value={textoFicha(dados.email_contato)} />
      </dl>
      <p className="mt-3 text-xs text-[var(--texto-secundario)]">O e-mail de contato é apenas um dado cadastral; ele não comprova a existência de login.</p>
    </section>

    <section aria-labelledby="ficha-profissional-titulo" data-testid="ficha-secao-profissional">
      <h3 id="ficha-profissional-titulo" className="mb-3 text-base font-semibold">Dados profissionais</h3>
      {profissional ? <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <InfoFicha label="Profissão" value={textoFicha(dados.profissao)} />
        <InfoFicha label="Especialidade" value={textoFicha(dados.especialidade_nome)} />
        <InfoFicha label="Conselho" value={textoFicha(dados.conselho_classe)} />
        <InfoFicha label="Registro profissional" value={textoFicha(dados.registro_conselho)} />
        <InfoFicha label="UF do conselho" value={textoFicha(dados.conselho_uf)} />
      </dl> : <p className="text-sm text-[var(--texto-secundario)]">Dados de conselho, registro, UF e especialidade não se aplicam a esta função.</p>}
    </section>

    <section aria-labelledby="ficha-clinicas-titulo" data-testid="ficha-secao-clinicas">
      <h3 id="ficha-clinicas-titulo" className="mb-3 text-base font-semibold">Clínicas</h3>
      {dados.clinicas.length > 0 ? <ul className="space-y-2 text-sm">
        {dados.clinicas.map((clinica) => <li key={clinica.id} className="flex flex-col gap-1 rounded-lg border border-[var(--borda)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium">{clinica.nome}</span>
          <span className="text-xs text-[var(--texto-secundario)]">{clinica.id === clinicaAtivaId ? 'Clínica selecionada' : 'Vínculo cadastral'}</span>
        </li>)}
      </ul> : <p className="text-sm text-[var(--texto-secundario)]">Nenhum vínculo clínico foi informado nesta consulta.</p>}
      <p className="mt-2 text-xs text-[var(--texto-secundario)]">O vínculo informa onde a pessoa atua. O acesso ao sistema é conferido separadamente.</p>
    </section>

  </div>
}

function papelAcessoValido(papel: unknown): papel is PapelAcessoEquipe {
  return papel === 'proprietaria' || papel === 'medico' || papel === 'recepcao'
}

function situacaoContaEquipe(usuarioId: unknown): 'vinculada' | 'sem_conta' | 'indisponivel' {
  if (typeof usuarioId === 'string' && usuarioId.trim()) return 'vinculada'
  return usuarioId === null ? 'sem_conta' : 'indisponivel'
}

function SeletorNovoPapel({ nome, value, disabled, onChange }: { nome: string; value: PapelAcessoEquipe | ''; disabled: boolean; onChange: (papel: PapelAcessoEquipe | '') => void }) {
  return <select aria-label={nome} value={value} disabled={disabled} onChange={(event) => { const papel = event.target.value; if (papel === '' || papelAcessoValido(papel)) onChange(papel) }} className="min-h-11 w-full max-w-full rounded border border-[var(--borda)] bg-[var(--fundo-card)] px-2 text-sm text-[var(--texto-principal)] sm:w-auto">
    <option value="">Selecione o papel de acesso</option><option value="proprietaria">Administradora</option><option value="medico">Médico</option><option value="recepcao">Recepção</option>
  </select>
}

function AcessoEquipePainel({ membro, clinicaAtivaId, souProprietaria, onConsultaAcesso, onOperacaoAcesso, onEstado }: { membro: MembroEquipe; clinicaAtivaId: string | null; souProprietaria: boolean; onEstado?: (estado: EstadoRecursoFicha) => void } & AtualizacaoAcessoEquipe) {
  const [acesso, setAcesso] = useState<AcessoEquipe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [email, setEmail] = useState(membro.email_contato ?? '')
  const [modo, setModo] = useState<ModoConcessaoEquipe>('convite')
  const [escopo, setEscopo] = useState<Record<string, PapelAcessoEquipe | ''>>({})
  const [papeisEditados, setPapeisEditados] = useState<Record<string, PapelAcessoEquipe>>({})
  const consultaAtual = useRef(0)
  const salvandoPapel = useRef(false)
  const enviandoAcesso = useRef<number | null>(null)
  const [operacao, setOperacao] = useState<string | null>(null)
  const escopoInicial = acesso?.usuario_id === null && acesso.clinicas.some(c=>c.id===clinicaAtivaId && c.status==='sem_acesso') ? {[clinicaAtivaId!]:''} : {}
  const acessoAlterado = JSON.stringify(Object.entries(escopo).sort()) !== JSON.stringify(Object.entries(escopoInicial).sort()) || modo !== 'convite' || email !== (membro.email_contato ?? '')
    || Object.entries(papeisEditados).some(([id,papel])=>papel !== acesso?.clinicas.find(c=>c.id===id)?.papel)
  useEffect(()=>{onEstado?.({ocupado:Boolean(operacao),alterado:acessoAlterado});return()=>onEstado?.({ocupado:false,alterado:false})},[onEstado,operacao,acessoAlterado])
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [resultadoIncerto, setResultadoIncerto] = useState(false)
  const avisoRef = useRef<HTMLDivElement>(null)
  const [mensagemTipo, setMensagemTipo] = useState<'success' | 'warning' | 'destructive'>('success')
  useEffect(() => {
    if (mensagem || erro) avisoRef.current?.scrollIntoView({ block: 'nearest' })
  }, [mensagem, erro])
  const [versao, setVersao] = useState(0)
  useEffect(() => { setMensagem(null) }, [membro.id, clinicaAtivaId, souProprietaria])

  useEffect(() => {
    let ativo = true
    consultaAtual.current += 1
    setCarregando(true)
    setErro(null)
    setResultadoIncerto(false)
    setAcesso(null)
    setPapeisEditados({})
    setEscopo({})
    setModo('convite')
    setEmail(membro.email_contato ?? '')
    setOperacao(null)
    if (!souProprietaria || !clinicaAtivaId || membro.origem_legada) {
      setCarregando(false)
      return () => { ativo = false; consultaAtual.current += 1 }
    }
    void buscarAcessoEquipe(membro.id, clinicaAtivaId).then(({ data, error }) => {
      if (!ativo) return
      setCarregando(false)
      if (error || !data || data.membro_id !== membro.id || !Array.isArray(data.clinicas) || !Array.isArray(data.convites)) {
        onConsultaAcesso(membro.id, clinicaAtivaId, null)
        setErro(error?.mensagem ?? 'Não foi possível consultar o acesso atual. Reabra a ficha para conferir novamente.')
        return
      }
      setAcesso(data)
      onConsultaAcesso(membro.id, clinicaAtivaId, data)
      setEmail(data.login_email ?? membro.email_contato ?? '')
      // A clínica do contexto fica indicada, mas nenhum papel é inferido do cadastro.
      setEscopo(data.usuario_id === null && data.clinicas.some((clinica) => clinica.id === clinicaAtivaId && clinica.status === 'sem_acesso') ? { [clinicaAtivaId]: '' } : {})
    }).catch(() => {
      if (!ativo) return
      onConsultaAcesso(membro.id, clinicaAtivaId, null)
      setCarregando(false)
      setErro('Não foi possível consultar os acessos. Reabra a ficha para tentar novamente.')
    })
    return () => { ativo = false; consultaAtual.current += 1 }
  }, [clinicaAtivaId, membro, souProprietaria, versao, onConsultaAcesso])

  function escoposSelecionados(clinicas: ClinicaAcessoEquipe[]): EscopoAcessoEquipe[] {
    const selecionados: EscopoAcessoEquipe[] = []
    for (const clinica of clinicas) {
      if (!Object.hasOwn(escopo, clinica.id)) continue
      const papel = escopo[clinica.id]
      // Uma clínica marcada sem papel bloqueia o conjunto inteiro, sem envio parcial.
      if (clinica.status !== 'sem_acesso' || !papelAcessoValido(papel)) return []
      selecionados.push({ clinica_id: clinica.id, papel })
    }
    return selecionados
  }

  async function executarOperacao(chave: string, solicitar: () => ReturnType<typeof iniciarAcessoEquipe>, sucesso: string) {
    if (!souProprietaria || carregando || operacao || salvandoPapel.current || enviandoAcesso.current === consultaAtual.current) return
    const consulta = consultaAtual.current
    enviandoAcesso.current = consulta
    setOperacao(chave)
    setMensagem(null)
    try {
      const { data, error } = await solicitar()
      if (consulta !== consultaAtual.current) return
      if (error) {
        if (error.resultadoIncerto) {
          setResultadoIncerto(true)
          if (clinicaAtivaId) onConsultaAcesso(membro.id, clinicaAtivaId, null)
        }
        setMensagemTipo(error.resultadoIncerto ? 'warning' : 'destructive')
        setMensagem(error.mensagem)
        return
      }
      setMensagemTipo('success')
      setMensagem(typeof data?.mensagem === 'string' ? data.mensagem : sucesso)
      if (clinicaAtivaId) onOperacaoAcesso(membro.id, clinicaAtivaId)
      setVersao((atual) => atual + 1)
    } catch {
      if (consulta !== consultaAtual.current) return
      setMensagemTipo('warning')
      setResultadoIncerto(true)
      if (clinicaAtivaId) onConsultaAcesso(membro.id, clinicaAtivaId, null)
      setMensagem('Não foi possível confirmar o resultado. Reabra a ficha e confira o acesso atual antes de tentar novamente.')
    } finally {
      if (enviandoAcesso.current === consulta) enviandoAcesso.current = null
      if (consulta === consultaAtual.current) setOperacao(null)
    }
  }

  async function iniciar(event: FormEvent) {
    event.preventDefault()
    if (!acesso || acesso.usuario_id !== null || !clinicaAtivaId || operacao) return
    const emailNormalizado = email.trim().toLocaleLowerCase('pt-BR')
    const selecionados = escoposSelecionados(acesso.clinicas)
    if (!emailNormalizado || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(emailNormalizado)) {
      setMensagemTipo('warning')
      setMensagem('Informe um e-mail válido para o login.')
      return
    }
    if (selecionados.length === 0) {
      setMensagemTipo('warning')
      setMensagem('Selecione ao menos uma clínica e informe o papel em cada vínculo.')
      return
    }
    await executarOperacao('preparar', () => iniciarAcessoEquipe({
      membroId: membro.id,
      clinicaContextoId: clinicaAtivaId,
      email: emailNormalizado,
      modo,
      clinicasPapeis: selecionados,
    }), modo === 'convite' ? 'Convite enviado. O acesso ficará pendente até o aceite.' : 'Confirmação enviada ao titular da conta.')
  }

  async function alterar(clinica: ClinicaAcessoEquipe, acao: Exclude<AcaoAcessoEquipe, 'papel'>) {
    if (!acesso || !clinicaAtivaId || operacao) return
    const papel = escopo[clinica.id]
    if (acao === 'conceder' && (!acesso.usuario_id || clinica.status !== 'sem_acesso' || !papelAcessoValido(papel))) return
    const chave = `${acao}:${clinica.id}`
    await executarOperacao(chave, () => alterarAcessoEquipe({
      membroId: membro.id,
      clinicaContextoId: clinicaAtivaId,
      clinicaAlvoId: clinica.id,
      acaoAcesso: acao,
      papel: acao === 'conceder' && papelAcessoValido(papel) ? papel : null,
    }), acao === 'suspender' ? 'Acesso suspenso nesta clínica.' : acao === 'reativar' ? 'Acesso reativado nesta clínica.' : 'Acesso concedido nesta clínica.')
  }

  async function salvarPapel(clinicaId: string) {
    const clinica = acesso?.clinicas.find((item) => item.id === clinicaId)
    const papel = papeisEditados[clinicaId]
    if (!souProprietaria || !acesso || !clinicaAtivaId || carregando || operacao || salvandoPapel.current || enviandoAcesso.current === consultaAtual.current
      || !clinica || clinica.status !== 'acesso_ativo' || !papelAcessoValido(clinica.papel)
      || !papelAcessoValido(papel) || papel === clinica.papel) return

    const consulta = consultaAtual.current
    salvandoPapel.current = true
    setOperacao(`papel:${clinicaId}`)
    setMensagem(null)
    let alteracaoConfirmada = false
    try {
      const { data: confirmacao, error } = await alterarAcessoEquipe({
        membroId: membro.id, clinicaContextoId: clinicaAtivaId,
        clinicaAlvoId: clinicaId, acaoAcesso: 'papel', papel,
      })
      if (consulta !== consultaAtual.current) return
      if (error) {
        if (error.resultadoIncerto) {
          onConsultaAcesso(membro.id, clinicaAtivaId, null)
          setErro(`Não foi possível confirmar o resultado da alteração. ${error.categoria === 'rede' ? 'A comunicação com o serviço falhou.' : 'O serviço não devolveu uma confirmação válida.'} Reabra a ficha para consultar o papel atual antes de tentar novamente.`)
          return
        }
        setMensagemTipo(error.resultadoIncerto ? 'warning' : 'destructive')
        setMensagem(error.mensagem)
        return
      }
      if (!confirmacao || confirmacao.clinica_id !== clinicaId || confirmacao.status !== 'acesso_ativo' || confirmacao.papel !== papel) {
        onConsultaAcesso(membro.id, clinicaAtivaId, null)
        setErro('Não foi possível confirmar o resultado da alteração. Reabra a ficha para consultar o papel atual antes de tentar novamente.')
        return
      }
      alteracaoConfirmada = true
      onOperacaoAcesso(membro.id, clinicaAtivaId)
      // A leitura confirmada, e não a seleção enviada, estabelece a nova referência.
      const { data, error: erroConsulta } = await buscarAcessoEquipe(membro.id, clinicaAtivaId)
      if (consulta !== consultaAtual.current) return
      if (erroConsulta || !data || data.membro_id !== membro.id || !Array.isArray(data.clinicas)
        || !Array.isArray(data.convites) || !data.clinicas.some((item) => item.id === clinicaId)) {
        setErro('A alteração foi confirmada, mas não foi possível consultar o papel atual. Reabra a ficha antes de tentar outra alteração.')
        return
      }
      setAcesso(data)
      onConsultaAcesso(membro.id, clinicaAtivaId, data)
      setPapeisEditados({})
      setMensagemTipo('success')
      setMensagem('Papel atualizado nesta clínica.')
    } catch {
      if (consulta !== consultaAtual.current) return
      onConsultaAcesso(membro.id, clinicaAtivaId, null)
      if (alteracaoConfirmada) {
        setErro('A alteração foi confirmada, mas não foi possível consultar o papel atual. Reabra a ficha antes de tentar outra alteração.')
      } else {
        setMensagemTipo('destructive')
        setMensagem('Não foi possível confirmar a alteração do papel. Reabra a ficha para conferir o acesso atual.')
      }
    } finally {
      salvandoPapel.current = false
      if (consulta === consultaAtual.current) setOperacao(null)
    }
  }

  async function reenviar(convite: NonNullable<AcessoEquipe['convites']>[number]) {
    if (!clinicaAtivaId || operacao) return
    await executarOperacao(`reenviar:${convite.id}`, () => reenviarConviteEquipe({ conviteId: convite.id, clinicaContextoId: clinicaAtivaId }), 'Solicitação reenviada.')
  }

  function conviteParaClinica(clinicaId: string) {
    return acesso?.convites.find((convite) => convite.status === 'pendente' || convite.status === 'enviado' || convite.status === 'erro'
      ? convite.clinicas_papeis.some((item) => item.clinica_id === clinicaId)
      : false)
  }

  if (!souProprietaria) {
    return <p className="mt-3 text-xs text-[var(--texto-secundario)]">O estado detalhado de acesso só pode ser consultado pela proprietária da clínica.</p>
  }
  if (membro.origem_legada) {
    return <p className="mt-3 text-xs text-[var(--texto-secundario)]">A consulta de acesso não está disponível para registros do modo legado. Nenhuma alteração de login foi tentada.</p>
  }
  if (carregando) {
    return <div className="mt-3 space-y-2" role="status" aria-busy="true" data-testid="acesso-carregando"><div className="h-10 animate-pulse rounded-lg bg-[var(--fundo-pagina)]" /><p className="text-xs text-[var(--texto-secundario)]">Conferindo conta e acessos…</p></div>
  }
  if (erro || !acesso) {
    return <div ref={avisoRef}><FeedbackAlert variant="warning" title="Consulta de acessos não concluída" description={erro ?? 'Não foi possível consultar o acesso atual. Reabra a ficha para conferir novamente.'} /></div>
  }

  const situacaoConta = situacaoContaEquipe(acesso.usuario_id)
  const temConta = situacaoConta === 'vinculada'
  return <div className="mt-4 space-y-4" data-testid="painel-gestao-acessos">
    {mensagem && <div ref={avisoRef}><FeedbackAlert variant={mensagemTipo} title={mensagemTipo === 'destructive' ? 'Não foi possível concluir' : mensagemTipo === 'warning' ? 'Confira a solicitação' : 'Operação concluída'} description={mensagem} urgent={mensagemTipo !== 'success'} onClose={() => setMensagem(null)} /></div>}
    {resultadoIncerto && <p className="text-sm font-medium">Situação da última consulta. Reabra a ficha para conferir o resultado da operação.</p>}
    <div className="space-y-1 bg-[var(--fundo-pagina)] px-3 py-3 text-sm" data-testid="situacao-conta">
      <p className="font-semibold">{temConta ? 'Conta de acesso vinculada' : situacaoConta === 'sem_conta' ? 'Sem conta vinculada' : 'Não foi possível confirmar a conta'}</p>
      {temConta ? <><p className="break-words">E-mail de login: {acesso.login_email || 'Não informado'}</p><p className="text-xs text-[var(--texto-secundario)]">{acesso.login_email ? acesso.conta_confirmada ? 'E-mail de login confirmado.' : 'E-mail de login ainda não confirmado.' : 'Não foi possível confirmar o e-mail de login.'} O acesso depende da situação de cada clínica abaixo.</p></> : <p className="text-xs text-[var(--texto-secundario)]">{situacaoConta === 'sem_conta' ? 'O cadastro pode permanecer sem login. Convite pendente não comprova conta vinculada.' : 'Reabra a ficha para conferir a conta antes de iniciar acesso.'}</p>}
    </div>

    <div className="equipe-acessos-clinicas">
      <h4 className="text-sm font-semibold">Acesso por clínica</h4>
      {acesso.clinicas.length === 0 && <p className="text-sm text-[var(--texto-secundario)]">Nenhum vínculo clínico autorizado foi retornado.</p>}
      {acesso.clinicas.map((clinica) => {
        const convite = conviteParaClinica(clinica.id)
        const papelSolicitado = convite?.clinicas_papeis.find((item) => item.clinica_id === clinica.id)?.papel
        const cor = statusAcessoCor(clinica.status)
        const papelConfirmado = papelAcessoValido(clinica.papel) ? clinica.papel : null
        const papelSelecionado = papeisEditados[clinica.id] ?? papelConfirmado
        return <div key={clinica.id} className="rounded-lg border border-[var(--borda)] px-3 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="font-medium">{clinica.nome}</p>{clinica.status === 'convite_pendente' ? <p className="text-xs text-[var(--texto-secundario)]">{papelAcessoValido(papelSolicitado) ? `Papel da solicitação: ${rotuloPapelAcessoEquipe(papelSolicitado)}` : 'Papel da solicitação não confirmado'}</p> : (clinica.status === 'acesso_ativo' || clinica.status === 'acesso_suspenso') && <p className="text-xs text-[var(--texto-secundario)]">{papelConfirmado ? `${clinica.status === 'acesso_ativo' ? 'Papel atual' : 'Papel do acesso suspenso'}: ${rotuloPapelAcessoEquipe(papelConfirmado)}` : 'Papel atual não confirmado'}</p>}</div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${cor === 'success' ? 'bg-[var(--feedback-sucesso-fundo)] text-[var(--feedback-sucesso-texto)]' : cor === 'warning' ? 'bg-[var(--feedback-alerta-fundo)] text-[var(--feedback-alerta-texto)]' : cor === 'destructive' ? 'bg-[var(--feedback-erro-fundo)] text-[var(--feedback-erro-texto)]' : 'bg-[var(--fundo-pagina)] text-[var(--texto-secundario)]'}`}>{rotuloStatusAcessoEquipe(clinica.status)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {clinica.status === 'acesso_ativo' && <>
              <label className="text-xs text-[var(--texto-secundario)]">Alterar papel
                <select aria-label={`Papel de ${clinica.nome}`} value={papelSelecionado ?? ''} disabled={Boolean(operacao) || !papelConfirmado} onChange={(event) => { const papel = event.target.value; if (papelAcessoValido(papel)) setPapeisEditados((atual) => ({ ...atual, [clinica.id]: papel })) }} className="ml-2 min-h-9 rounded border border-[var(--borda)] bg-[var(--fundo-card)] px-2 text-sm text-[var(--texto-principal)]">{!papelConfirmado && <option value="">Papel não confirmado</option>}<option value="proprietaria">Administradora</option><option value="medico">Médico</option><option value="recepcao">Recepção</option></select>
              </label>
              <button type="button" disabled={Boolean(operacao) || !papelConfirmado || !papelAcessoValido(papelSelecionado) || papelSelecionado === papelConfirmado} onClick={() => void salvarPapel(clinica.id)} className="min-h-9 rounded-lg border border-[var(--borda)] px-3 text-xs font-semibold disabled:opacity-50">Salvar papel</button>
              <button type="button" disabled={Boolean(operacao)} onClick={() => void alterar(clinica, 'suspender')} className="min-h-9 rounded-lg border border-[var(--borda)] px-3 text-xs font-semibold disabled:opacity-50">Suspender acesso</button>
            </>}
            {clinica.status === 'acesso_suspenso' && <button type="button" disabled={Boolean(operacao)} onClick={() => void alterar(clinica, 'reativar')} className="min-h-9 rounded-lg border border-[var(--borda)] px-3 text-xs font-semibold disabled:opacity-50">Reativar acesso</button>}
            {clinica.status === 'sem_acesso' && temConta && <div className="w-full space-y-2">
              <label className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">Papel para o novo acesso em {clinica.nome}<SeletorNovoPapel nome={`Papel para concessão em ${clinica.nome}`} value={escopo[clinica.id] ?? ''} disabled={Boolean(operacao)} onChange={(papel) => setEscopo((atual) => ({ ...atual, [clinica.id]: papel }))} /></label>
              <p className={`break-words px-3 py-2 text-sm ${papelAcessoValido(escopo[clinica.id]) ? 'bg-[var(--cor-primaria-suave)]' : 'text-[var(--texto-secundario)]'}`} data-testid={`resumo-concessao-${clinica.id}`} aria-live="polite">{papelAcessoValido(escopo[clinica.id]) ? <><strong>{membro.nome_completo}</strong> · {clinica.nome} · {rotuloPapelAcessoEquipe(escopo[clinica.id] || null)}</> : `Escolha o papel para o novo acesso em ${clinica.nome}.`}</p>
              <button type="button" disabled={Boolean(operacao) || !papelAcessoValido(escopo[clinica.id])} aria-busy={operacao === `conceder:${clinica.id}`} onClick={() => void alterar(clinica, 'conceder')} className="equipe-acao-primaria min-h-11 rounded-lg bg-[var(--cor-primaria)] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{operacao === `conceder:${clinica.id}` ? 'Processando…' : 'Conceder acesso'}</button>
            </div>}
            {clinica.status === 'convite_pendente' && convite && <button type="button" disabled={Boolean(operacao)} onClick={() => void reenviar(convite)} className="min-h-9 rounded-lg border border-[var(--borda)] px-3 text-xs font-semibold disabled:opacity-50">Reenviar convite</button>}
          </div>
          {clinica.status === 'acesso_ativo' && !papelConfirmado && <p className="mt-2 text-xs text-[var(--texto-secundario)]">O papel deste acesso não foi confirmado. Reabra a ficha para consultar novamente; a alteração permanece bloqueada.</p>}
        </div>
      })}
    </div>

    {situacaoConta === 'sem_conta' && <form onSubmit={iniciar} className="space-y-3 rounded-lg border border-[var(--borda)] px-3 py-3" aria-label="Conceder acesso ao membro">
      <div><h4 className="text-sm font-semibold">Iniciar acesso</h4><p className="mt-1 text-xs text-[var(--texto-secundario)]">Convite ou vínculo por confirmação prepara acesso às clínicas e papéis escolhidos, após as verificações e o aceite do titular.</p></div>
      <label className="block text-sm font-medium" htmlFor="equipe-acesso-email">E-mail de login<input id="equipe-acesso-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" disabled={Boolean(operacao)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" placeholder="pessoa@exemplo.com" /></label>
      <fieldset disabled={Boolean(operacao)}><legend className="text-sm font-medium">Como confirmar a conta?</legend><div className="mt-2 flex flex-col gap-2 text-sm sm:flex-row"><label className="flex items-center gap-2"><input type="radio" name="equipe-modo-acesso" checked={modo === 'convite'} onChange={() => setModo('convite')} /> Enviar convite para quem ainda não tem conta</label><label className="flex items-center gap-2"><input type="radio" name="equipe-modo-acesso" checked={modo === 'vinculo'} onChange={() => setModo('vinculo')} /> Vincular conta existente por confirmação</label></div></fieldset>
      <fieldset disabled={Boolean(operacao)}><legend className="text-sm font-medium">Clínicas e papéis</legend><div className="mt-2 space-y-3">{acesso.clinicas.map((clinica) => <div key={clinica.id} className="flex flex-wrap items-center gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={Object.hasOwn(escopo, clinica.id)} disabled={clinica.status !== 'sem_acesso'} onChange={(event) => setEscopo((atual) => { const proximo = { ...atual }; if (event.target.checked) proximo[clinica.id] = ''; else delete proximo[clinica.id]; return proximo })} /> {clinica.nome}</label>{Object.hasOwn(escopo, clinica.id) && <SeletorNovoPapel nome={`Papel para ${clinica.nome}`} value={escopo[clinica.id]} disabled={Boolean(operacao)} onChange={(papel) => setEscopo((atual) => ({ ...atual, [clinica.id]: papel }))} />}{clinica.status === 'convite_pendente' && <span className="text-xs text-[var(--texto-secundario)]">Solicitação existente; use Reenviar convite.</span>}</div>)}</div></fieldset>
      <div className="space-y-1 break-words bg-[var(--fundo-pagina)] px-3 py-2 text-sm" data-testid="resumo-novo-acesso" aria-live="polite"><p><strong>Pessoa:</strong> {membro.nome_completo}</p>{acesso.clinicas.filter((clinica) => Object.hasOwn(escopo, clinica.id)).map((clinica) => <p key={clinica.id}>{papelAcessoValido(escopo[clinica.id]) ? `${clinica.nome} · ${rotuloPapelAcessoEquipe(escopo[clinica.id] || null)}` : `Escolha o papel para ${clinica.nome}.`}</p>)}{!acesso.clinicas.some((clinica) => Object.hasOwn(escopo, clinica.id)) && <p>Selecione uma clínica e o papel de acesso.</p>}</div>
      <button type="submit" disabled={Boolean(operacao) || escoposSelecionados(acesso.clinicas).length === 0} aria-busy={operacao === 'preparar'} className="equipe-acao-primaria min-h-11 w-full rounded-lg bg-[var(--cor-primaria)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{operacao === 'preparar' ? 'Processando…' : modo === 'convite' ? 'Enviar convite' : 'Solicitar confirmação'}</button>
      <p className="text-xs text-[var(--texto-secundario)]">A confirmação pode depender da configuração de e-mail do ambiente. Nenhum segredo ou senha é exibido nesta tela.</p>
    </form>}
  </div>
}

function FichaMembro({ membro, detalhe, clinicaAtivaId, carregando, erro, indisponivel, souProprietaria, onFechar, onConsultaAcesso, onOperacaoAcesso, fotos, onEditar }: FichaMembroProps) {
  const [fotoEstado,setFotoEstado]=useState<EstadoRecursoFicha>({ocupado:false,alterado:false})
  const [recebimentoEstado,setRecebimentoEstado]=useState<EstadoRecursoFicha>({ocupado:false,alterado:false})
  const [ampliadaEstado,setAmpliadaEstado]=useState<EstadoRecursoFicha>({ocupado:false,alterado:false})
  const [atuacaoEstado,setAtuacaoEstado]=useState<EstadoRecursoFicha>({ocupado:false,alterado:false})
  const [acessoEstado,setAcessoEstado]=useState<EstadoRecursoFicha>({ocupado:false,alterado:false})
  const [confirmarSaida,setConfirmarSaida]=useState(false)
  const [acaoSaida,setAcaoSaida]=useState<'fechar'|'editar'>('fechar')
  const ocupado=fotoEstado.ocupado||recebimentoEstado.ocupado||ampliadaEstado.ocupado||atuacaoEstado.ocupado||acessoEstado.ocupado
  const alterado=fotoEstado.alterado||recebimentoEstado.alterado||ampliadaEstado.alterado||atuacaoEstado.alterado||acessoEstado.alterado
  useEffect(()=>{if(!alterado)return;const proteger=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',proteger);return()=>window.removeEventListener('beforeunload',proteger)},[alterado])
  function fechar(){setAcaoSaida('fechar');if(ocupado)return;if(alterado)setConfirmarSaida(true);else onFechar()}
  function editar(){if(ocupado)return;setAcaoSaida('editar');if(alterado)setConfirmarSaida(true);else onEditar()}
  const ampliadaDisponivel=!carregando&&!erro&&!indisponivel&&detalhe&&!membro.origem_legada&&clinicaAtivaId&&souProprietaria
  return <ModalBase titulo={`Ficha de ${membro.nome_completo}`} subtitulo={`${rotuloTipoEquipe((detalhe ?? membro).tipo)} · ${textoFicha((detalhe ?? membro).cargo)} · ${(detalhe ?? membro).clinicas.find(c=>c.id===clinicaAtivaId)?.nome ?? 'Clínica selecionada'}`}  onFechar={fechar} ocupado={ocupado} largura="xl" className={`equipe-modal${ampliadaDisponivel?' equipe-ficha-workspace':''}`}>
    {ampliadaDisponivel && <div className="equipe-ficha-retrato"><EquipeAvatar membroId={membro.id} clinicaId={clinicaAtivaId} nome={membro.nome_completo} foto={fotos.fotos[membro.id]}/></div>}
    {carregando && <div role="status" aria-busy="true" className="space-y-3" data-testid="ficha-carregando"><div className="h-5 w-2/3 animate-pulse rounded bg-[var(--fundo-pagina)]" /><div className="h-20 animate-pulse rounded-lg bg-[var(--fundo-pagina)]" /><p className="text-sm text-[var(--texto-secundario)]">Carregando dados autorizados da ficha…</p></div>}
    {!carregando && erro && <div className="space-y-4" data-testid="ficha-erro"><FeedbackAlert variant="destructive" title="Não foi possível carregar a ficha" description={erro} urgent /><FichaResumo membro={membro} detalhe={null} clinicaAtivaId={clinicaAtivaId} /></div>}
    {!carregando && !erro && indisponivel && <div className="space-y-4" data-testid="ficha-indisponivel"><FeedbackAlert variant="warning" title="Dados ampliados indisponíveis" description="Os dados completos não estão disponíveis agora. A ficha mostra as informações já confirmadas para esta pessoa." /><FichaResumo membro={membro} detalhe={null} clinicaAtivaId={clinicaAtivaId} /></div>}
    {!carregando && !erro && !indisponivel && detalhe && (!membro.origem_legada&&clinicaAtivaId&&souProprietaria?<EquipeFichaAmpliada key={`completa:${membro.id}:${clinicaAtivaId}`} detalhe={detalhe} clinicaId={clinicaAtivaId} clinicas={detalhe.clinicas} onEstado={setAmpliadaEstado}
      atuacao={<EquipeAtuacaoPainel membroId={membro.id} clinicaId={clinicaAtivaId} clinicas={detalhe.clinicas} onEstado={setAtuacaoEstado}/>}
      cadastroAcao={<button type="button" disabled={ocupado} onClick={editar}>Editar cadastro básico</button>}
      resumo={<FichaResumo membro={membro} detalhe={detalhe} clinicaAtivaId={clinicaAtivaId}/>}
      foto={<EquipeFotoPainel key={`foto:${membro.id}:${clinicaAtivaId}`} membroId={membro.id} nome={membro.nome_completo} clinicaId={clinicaAtivaId} meta={fotos.metas[membro.id]} foto={fotos.fotos[membro.id]} erroConsulta={fotos.erro} carregando={fotos.carregando} onReconsultar={fotos.reconsultar} onEstado={setFotoEstado}/>}
      recebimento={onSituacao=><EquipeRecebimentoPainel key={`recebimento:${membro.id}:${clinicaAtivaId}`} membroId={membro.id} clinicaId={clinicaAtivaId} clinicas={detalhe.clinicas} onEstado={setRecebimentoEstado} onSituacao={onSituacao}/>}
      acessos={<section aria-label="Gestão de acessos" data-testid="ficha-secao-acesso"><AcessoEquipePainel onEstado={setAcessoEstado} membro={membro} clinicaAtivaId={clinicaAtivaId} souProprietaria={souProprietaria} onConsultaAcesso={onConsultaAcesso} onOperacaoAcesso={onOperacaoAcesso}/></section>}/>:<FichaResumo membro={membro} detalhe={detalhe} clinicaAtivaId={clinicaAtivaId}/>)}
    {!carregando && (erro||indisponivel||!detalhe||membro.origem_legada||!clinicaAtivaId||!souProprietaria) && <section className="mt-6" aria-labelledby="ficha-acesso-titulo" data-testid="ficha-secao-acesso"><h3 id="ficha-acesso-titulo" className="mb-3 text-base font-semibold">Acesso ao sistema</h3><AcessoEquipePainel membro={membro} clinicaAtivaId={clinicaAtivaId} souProprietaria={souProprietaria} onConsultaAcesso={onConsultaAcesso} onOperacaoAcesso={onOperacaoAcesso} /></section>}
    <ConfirmacaoDialog open={confirmarSaida} onOpenChange={setConfirmarSaida} title="Descartar alterações desta ficha?" description="Os rascunhos e arquivos selecionados ainda não salvos serão descartados. Dados já confirmados serão preservados." confirmLabel="Descartar e fechar" tone="warning" onConfirm={acaoSaida==='editar'?onEditar:onFechar} disabled={ocupado}/>
  </ModalBase>
}

type ErroEquipe = { code?: string; message?: string; details?: string | null; hint?: string | null }

function mensagemErro(error: ErroEquipe | null): string {
  if (error?.code === '40001') return 'Este cadastro foi alterado em outra sessão. Reabra a ficha antes de salvar novamente.'
  return erroEquipeSeguro(error).mensagem
}

function mensagemErroFicha(error: { code?: string; message?: string } | null): string {
  if (error?.code === '42501') return 'Você não tem autorização para consultar esta ficha nesta clínica.'
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    return 'Os dados ampliados da ficha ainda não estão disponíveis nesta instância. A consulta legada permanece somente leitura.'
  }
  return erroEquipeSeguro(error).mensagem
}

function extrairDetalheEquipe(data: unknown): DetalheMembroEquipe | null {
  if (!data) return null
  const detalhe = (Array.isArray(data) ? data[0] : data) as DetalheMembroEquipe | undefined
  return detalhe?.id ? detalhe : null
}

async function consultarDetalheEquipe(membroId: string, clinicaId: string) {
  const { data, error, status } = await supabase.rpc('equipe_detalhar', {
    p_membro_id: membroId,
    p_clinica_contexto_id: clinicaId,
  })
  return { detalhe: extrairDetalheEquipe(data), error: error ? { ...error, status } : null }
}

function Equipe({ clinicaAtivaId, souProprietaria }: EquipeProps) {
  const [membros, setMembros] = useState<MembroEquipe[]>([])
  const fotos=useEquipeFotos(clinicaAtivaId,membros.map(m=>m.id).sort().join(','),souProprietaria)
  const [acessosConsultados, setAcessosConsultados] = useState<Record<string, AcessoEquipe | null>>({})
  const [clinicas, setClinicas] = useState<ClinicaEquipe[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [indisponivel, setIndisponivel] = useState(false)
  const [compatibilidade, setCompatibilidade] = useState(false)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<TipoMembroEquipe | ''>('')
  const [clinicaFiltro, setClinicaFiltro] = useState('')
  const [form, setForm] = useState<FormularioEquipe | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [visualizando, setVisualizando] = useState<MembroEquipe | null>(null)
  const [detalheFicha, setDetalheFicha] = useState<DetalheMembroEquipe | null>(null)
  const [carregandoFicha, setCarregandoFicha] = useState(false)
  const [erroFicha, setErroFicha] = useState<string | null>(null)
  const [fichaIndisponivel, setFichaIndisponivel] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [campoErro, setCampoErro] = useState<CampoFormularioEquipe | null>(null)
  const [novoMembroId,setNovoMembroId]=useState<string|null>(null)
  const [continuando,setContinuando]=useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [formAlterado, setFormAlterado] = useState(false)
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const carregarSequencia = useRef(0)
  const fichaSequencia = useRef(0)
  const edicaoSequencia = useRef(0)
  const contextoAcessoAtual = useRef({ clinicaId: clinicaAtivaId, proprietaria: souProprietaria })

  const clinicaAtual = useMemo(
    () => clinicas.find((clinica) => clinica.id === clinicaAtivaId) ?? null,
    [clinicas, clinicaAtivaId],
  )

  const limparFormulario = useCallback(() => {
    edicaoSequencia.current += 1
    setConfirmandoDescarte(false)
    setForm(null)
    setEditandoId(null)
    setErroForm(null)
    setCampoErro(null)
    setFormAlterado(false)
  }, [])

  const fecharFormulario = useCallback(() => {
    if (salvando) return
    if (formAlterado) {
      setConfirmandoDescarte(true)
      return
    }
    limparFormulario()
  }, [formAlterado, limparFormulario, salvando])

  const carregar = useCallback(async (preservarLista = false) => {
    const requisicao = ++carregarSequencia.current
    if (!clinicaAtivaId) {
      setMembros([])
      setClinicas([])
      setEspecialidades([])
      setCompatibilidade(false)
      setIndisponivel(false)
      setCarregando(false)
      return
    }

    if (!preservarLista) setCarregando(true)
    setErro(null)
    setIndisponivel(false)
    setCompatibilidade(false)
    if (!preservarLista) {
      setMembros([])
      setClinicas([])
      setEspecialidades([])
      setAcessosConsultados({})
    }

    try {
      const [lista, unidades, catalogo] = await Promise.all([
        supabase.rpc('equipe_listar', { p_clinica_contexto_id: clinicaAtivaId }),
        supabase.from('clinicas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('especialidades').select('id, nome').eq('ativo', true).order('nome'),
      ])
      if (requisicao !== carregarSequencia.current) return
      if (lista.error && !consultaLegadaEquipePermitida(lista.error)) {
        setIndisponivel(true)
        setErro(erroEquipeSeguro(lista.error, false, lista.status).mensagem)
        return
      }
      if (unidades.error || catalogo.error) {
        const falha = unidades.error ? unidades : catalogo
        setIndisponivel(true)
        setErro(erroEquipeSeguro(falha.error, false, falha.status).mensagem)
        return
      }
      setClinicas((unidades.data ?? []) as ClinicaEquipe[])
      setEspecialidades((catalogo.data ?? []) as Especialidade[])
      if (!lista.error) {
        if (!Array.isArray(lista.data)) {
          setIndisponivel(true)
          setErro(erroEquipeSeguro(null).mensagem)
          return
        }
        setMembros((lista.data ?? []) as MembroEquipe[])
        setCompatibilidade(false)
        setCarregando(false)
        return
      }

      const legado = await supabase.from('profissionais_clinicas')
        .select('profissional_id, clinica_id, profissionais(id, nome_completo, conselho_classe, registro_conselho, usuario_id, especialidades(nome)), clinicas(nome)')
        .eq('clinica_id', clinicaAtivaId).eq('ativo', true)
      if (requisicao !== carregarSequencia.current) return
      if (legado.error) {
        setMembros([])
        setIndisponivel(true)
        setErro(erroEquipeSeguro(legado.error, false, legado.status).mensagem)
        setCarregando(false)
        return
      }
      const adaptados = (legado.data ?? []).map((linha: any) => {
        const p = Array.isArray(linha.profissionais) ? linha.profissionais[0] : linha.profissionais
        const c = Array.isArray(linha.clinicas) ? linha.clinicas[0] : linha.clinicas
        const e = Array.isArray(p?.especialidades) ? p.especialidades[0] : p?.especialidades
        return {
          id: p.id, nome_completo: p.nome_completo, cargo: 'Médico(a)', tipo: 'profissional_saude',
          profissao: 'Medicina', telefone: null, email_contato: null, conselho_classe: p.conselho_classe,
          registro_conselho: p.registro_conselho, conselho_uf: null, especialidade_id: null,
          especialidade_nome: e?.nome ?? null, acesso_status: typeof p.usuario_id === 'string' ? 'conta_vinculada' : p.usuario_id === null ? 'sem_conta' : undefined,
          clinicas: [{ id: linha.clinica_id, nome: c?.nome ?? 'Clínica atual' }], revisao: 0, origem_legada: true,
        } as MembroEquipe
      })
      setMembros(adaptados)
      setCompatibilidade(true)
      setCarregando(false)
    } catch (error) {
      if (requisicao !== carregarSequencia.current) return
      setMembros([])
      setIndisponivel(true)
      setErro(erroEquipeSeguro(error).mensagem)
    } finally {
      if (requisicao === carregarSequencia.current) setCarregando(false)
    }
  }, [clinicaAtivaId])

  const registrarConsultaAcesso = useCallback((membroId: string, contexto: string, acesso: AcessoEquipe | null) => {
    const atual = contextoAcessoAtual.current
    if (atual.clinicaId !== contexto || !atual.proprietaria || (acesso && acesso.membro_id !== membroId)) return
    setAcessosConsultados((anteriores) => ({ ...anteriores, [membroId]: acesso }))
  }, [])

  const atualizarAposOperacaoAcesso = useCallback((membroId: string, contexto: string) => {
    const atual = contextoAcessoAtual.current
    if (atual.clinicaId !== contexto || !atual.proprietaria) return
    registrarConsultaAcesso(membroId, contexto, null)
    // Reutiliza a consulta coletiva; não busca conta para cada linha nem limpa filtros.
    void carregar(true)
  }, [carregar, registrarConsultaAcesso])

  useEffect(() => {
    contextoAcessoAtual.current = { clinicaId: clinicaAtivaId, proprietaria: souProprietaria }
    setAcessosConsultados({})
    fichaSequencia.current += 1
    edicaoSequencia.current += 1
    setForm(null)
    setEditandoId(null)
    setVisualizando(null)
    setDetalheFicha(null)
    setCarregandoFicha(false)
    setErroFicha(null)
    setFichaIndisponivel(false)
    setErroForm(null)
    setCampoErro(null)
    setSucesso(null)
    setNovoMembroId(null)
    setBusca('')
    setTipo('')
    setClinicaFiltro('')
    setMembros([])
    setClinicas([])
    setEspecialidades([])
    setCompatibilidade(false)
    setIndisponivel(false)
  }, [clinicaAtivaId, souProprietaria])

  useEffect(() => {
    void carregar()
    return () => { carregarSequencia.current += 1 }
  }, [carregar, souProprietaria])

  useEffect(() => {
    if (!campoErro || !form) return
    const alvo = formRef.current?.querySelector<HTMLElement>(`[data-equipe-campo="${campoErro}"]`)
    alvo?.focus()
  }, [campoErro, form])

  const filtrados = useMemo(() => filtrarEquipe(membros, busca, tipo, clinicaFiltro), [membros, busca, tipo, clinicaFiltro])

  function fecharFicha() {
    fichaSequencia.current += 1
    setVisualizando(null)
    setDetalheFicha(null)
    setCarregandoFicha(false)
    setErroFicha(null)
    setFichaIndisponivel(false)
  }

  async function abrirFicha(membro: MembroEquipe, confirmado?: DetalheMembroEquipe) {
    const contexto = clinicaAtivaId
    if (!contexto) return
    const requisicao = ++fichaSequencia.current
    setVisualizando(membro)
    setDetalheFicha(null)
    setErroFicha(null)
    setFichaIndisponivel(false)
    setCarregandoFicha(!membro.origem_legada)

    if(confirmado?.id===membro.id){setDetalheFicha(confirmado);setCarregandoFicha(false);return}

    // O modo legado só dispõe dos campos já retornados pela consulta antiga.
    // Não fazemos uma segunda consulta para tentar completar dados ausentes.
    if (membro.origem_legada) {
      setDetalheFicha({ ...membro, cpf: null, cpf_situacao: 'indisponivel' })
      setCarregandoFicha(false)
      return
    }

    let detalhe: DetalheMembroEquipe | null = null
    let error: { code?: string; message?: string } | null = null
    try {
      const resultado = await consultarDetalheEquipe(membro.id, contexto)
      detalhe = resultado.detalhe
      error = resultado.error
    } catch {
      error = null
    }
    if (requisicao !== fichaSequencia.current || contexto !== clinicaAtivaId) return
    setCarregandoFicha(false)
    if (error || !detalhe) {
      if (error?.code === 'PGRST202' || error?.code === '42883') setFichaIndisponivel(true)
      else setErroFicha(mensagemErroFicha(error))
      return
    }
    setDetalheFicha(detalhe)
  }

  async function abrirEdicao(membro: MembroEquipe) {
    if (!clinicaAtivaId || compatibilidade) return
    const requisicao = ++edicaoSequencia.current
    setErroForm(null)
    setCampoErro(null)
    const { detalhe, error: detalheErro } = await consultarDetalheEquipe(membro.id, clinicaAtivaId)
    if (requisicao !== edicaoSequencia.current || !clinicaAtivaId) return
    if (detalheErro || !detalhe) { setErro(mensagemErro(detalheErro)); return }
    if (!detalheEquipePermiteEdicao(detalhe, membro.id, clinicaAtivaId)) {
      setErro('Não foi possível carregar todos os dados para editar. Reabra o cadastro antes de salvar.')
      return
    }
    setEditandoId(membro.id)
    setForm(formularioAPartirDoDetalhe(detalhe))
    setFormAlterado(false)
  }

  async function salvar(event: FormEvent) {
    event.preventDefault()
    if (salvando || !form || !clinicaAtivaId) return
    const validacao = validarFormularioEquipeDetalhada(form)
    if (validacao) {
      setErroForm(validacao.mensagem)
      setCampoErro(validacao.campo)
      return
    }
    setSalvando(true)
    setErroForm(null)
    setCampoErro(null)
    const dados = montarDadosEquipe(form)
    try {
      const { data: membroSalvo, error: salvarErro, status } = await supabase.rpc('equipe_salvar', {
        p_membro_id: editandoId, p_clinica_contexto_id: clinicaAtivaId, p_revisao_esperada: form.revisao, p_dados: dados,
        p_chave_idempotencia: form.chaveIdempotencia,
      })
      if (salvarErro) {
        setErroForm(salvarErro.code === '40001' ? mensagemErro(salvarErro) : mensagemVinculoInativoEquipe(salvarErro, status) ?? erroEquipeSeguro(salvarErro, true, status).mensagem)
        return
      }
      setNovoMembroId(!editandoId && typeof membroSalvo === 'string' && /^[0-9a-f-]{36}$/i.test(membroSalvo) ? membroSalvo : null)
      const mensagemSucesso = editandoId ? 'Cadastro atualizado com sucesso.' : 'Funcionário cadastrado com sucesso.'
      limparFormulario()
      await carregar()
      setSucesso(mensagemSucesso)
    } catch (error) {
      setErroForm(erroEquipeSeguro(error, true).mensagem)
    } finally {
      setSalvando(false)
    }
  }

  function atualizar<K extends keyof FormularioEquipe>(campo: K, valor: FormularioEquipe[K]) {
    if (campo === 'tipo' && form?.edicao) return
    setForm((atual) => atual ? { ...atual, [campo]: valor } : atual)
    setFormAlterado(true)
    const grupoConselho = campo === 'conselhoClasse' || campo === 'registroConselho' || campo === 'conselhoUf'
    if (campoErro === campo || (campoErro === 'conselho' && grupoConselho)) {
      setCampoErro(null)
      setErroForm(null)
    }
  }

  function mostrarErroCampo(campo: CampoFormularioEquipe) {
    if (campoErro !== campo || !erroForm) return null
    return <p id={`equipe-erro-${campo}`} className="mt-1 text-sm text-[var(--cor-erro)]">{erroForm}</p>
  }

  function abrirNovo() {
    setEditandoId(null)
    setErroForm(null)
    setCampoErro(null)
    setFormAlterado(false)
    setForm(formularioEquipeVazio(clinicaAtivaId))
  }

  async function continuarCadastro(){
    if(!novoMembroId||!clinicaAtivaId||continuando)return
    const id=novoMembroId, contexto=clinicaAtivaId, geracao=fichaSequencia.current
    setContinuando(true)
    try{
      const {detalhe,error}=await consultarDetalheEquipe(id,contexto)
      if(geracao!==fichaSequencia.current)return
      if(error||!detalhe||detalhe.id!==id){setErro(mensagemErroFicha(error));return}
      await abrirFicha(detalhe,detalhe)
    }catch{if(geracao===fichaSequencia.current)setErro(mensagemErroFicha(null))}
    finally{setContinuando(false)}
  }
  return <div className="space-y-5" data-testid="equipe-modulo">
    {sucesso && <FeedbackAlert variant="success" title={sucesso} onClose={() => setSucesso(null)} autoDismissMs={6000} />}
    {compatibilidade && <FeedbackAlert
      variant="warning"
      title="Consulta de cadastros antigos"
      description={<span>O serviço atual de listagem não foi localizado. A consulta antiga de profissionais de <strong>{clinicaAtual?.nome ?? 'esta clínica'}</strong> permanece somente leitura; cadastro e edição estão bloqueados neste modo.</span>}
    />}
    {erro && <FeedbackAlert variant="destructive" title={erro} onClose={() => setErro(null)} />}
    <EquipeListagem membros={membros} fotos={fotos.fotos} filtrados={filtrados} clinicas={clinicas} contexto={clinicaAtivaId}
      clinicaAtual={clinicaAtual?.nome ?? (clinicaAtivaId ? 'clínica selecionada' : 'nenhuma selecionada')}
      acessos={acessosConsultados} busca={busca} tipo={tipo} clinicaFiltro={clinicaFiltro}
      onBusca={setBusca} onTipo={setTipo} onClinica={setClinicaFiltro}
      onLimpar={() => { setBusca(''); setTipo(''); setClinicaFiltro('') }}
      onNovo={abrirNovo} onVer={m => void abrirFicha(m)} onEditar={m => void abrirEdicao(m)}
      onReconsultar={() => void carregar()} proprietaria={souProprietaria}
      bloqueado={compatibilidade || indisponivel} carregando={carregando} indisponivel={indisponivel}
      semPermissao={erro === erroEquipeSeguro(null, false, 403).mensagem} />

    {novoMembroId && <button type="button" className="equipe-continuar-cadastro" disabled={continuando} onClick={()=>void continuarCadastro()}>{continuando?'Abrindo ficha…':'Continuar na ficha criada'}</button>}
    {visualizando && <FichaMembro key={`${visualizando.id}:${clinicaAtivaId}`} fotos={fotos} membro={visualizando} detalhe={detalheFicha} clinicaAtivaId={clinicaAtivaId} carregando={carregandoFicha} erro={erroFicha} indisponivel={fichaIndisponivel} souProprietaria={souProprietaria} onFechar={fecharFicha} onEditar={()=>{const membro=visualizando;fecharFicha();void abrirEdicao(membro)}} onConsultaAcesso={registrarConsultaAcesso} onOperacaoAcesso={atualizarAposOperacaoAcesso} />}

    {form && <ModalBase titulo={editandoId ? 'Editar membro da equipe' : 'Novo membro da equipe'} subtitulo={editandoId ? form.nomeCompleto : 'Cadastre a pessoa e os vínculos com as clínicas.'} onFechar={fecharFormulario} ocupado={salvando} largura="xl" className="equipe-modal equipe-cadastro-workspace"><form ref={formRef} aria-label={editandoId ? 'Editar membro da equipe' : 'Novo membro da equipe'} onSubmit={salvar} className="space-y-6">
      {erroForm && <FeedbackAlert variant="destructive" title="Revise o cadastro" description={erroForm} urgent />}
      <p className="equipe-orientacao text-sm text-[var(--texto-secundario)]">Salvar o cadastro não cria login nem concede acesso ao sistema.</p>
      {!editandoId&&<p className="equipe-orientacao text-sm text-[var(--texto-secundario)]">Para adicionar uma foto, salve o membro e abra sua ficha. Dados para recebimento ficam na ficha do profissional, separados deste cadastro.</p>}
      <fieldset disabled={salvando} className="space-y-6">
        <section aria-labelledby="equipe-dados-pessoais"><h3 id="equipe-dados-pessoais" className="mb-4 text-base font-semibold">Dados pessoais e função</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="equipe-nome" className="text-sm font-medium">Nome completo *</label><input id="equipe-nome" name="nomeCompleto" data-equipe-campo="nomeCompleto" aria-required="true" aria-invalid={campoErro === 'nomeCompleto'} aria-describedby={campoErro === 'nomeCompleto' ? 'equipe-erro-nomeCompleto' : undefined} value={form.nomeCompleto} onChange={(e) => atualizar('nomeCompleto', e.target.value)} autoComplete="name" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" />{mostrarErroCampo('nomeCompleto')}</div>
        {form.edicao ? <div data-testid="tipo-membro-atual"><p className="text-sm font-medium">Tipo de função atual</p><p className="mt-1.5 rounded-lg border border-[var(--borda)] bg-[var(--fundo-pagina)] px-3 py-2 text-sm font-semibold">{rotuloTipoEquipe(form.edicao.tipo)}</p><p className="mt-1 text-xs text-[var(--texto-secundario)]">O tipo é mantido nesta edição. Cargo e demais dados permitidos podem ser alterados.</p></div> : <div><label htmlFor="equipe-tipo-form" className="text-sm font-medium">Tipo de função *</label><select id="equipe-tipo-form" name="tipo" aria-required="true" value={form.tipo} onChange={(e) => atualizar('tipo', e.target.value as TipoMembroEquipe)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3"><option value="">Selecione</option>{TIPOS_EQUIPE.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}</select></div>}
        <div><label htmlFor="equipe-cargo" className="text-sm font-medium">Cargo ou função *</label><select id="equipe-cargo" name="cargo" data-equipe-campo="cargo" aria-required="true" aria-invalid={campoErro === 'cargo'} aria-describedby={campoErro === 'cargo' ? 'equipe-erro-cargo' : undefined} value={form.cargo} onChange={(e) => atualizar('cargo', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3"><option value="">Selecione</option>{CARGOS_EQUIPE.map((c) => <option key={c}>{c}</option>)}</select>{mostrarErroCampo('cargo')}</div>
        {form.cargo === 'Outro' && <div className="sm:col-span-2"><label htmlFor="equipe-outro-cargo" className="text-sm font-medium">Outro cargo *</label><input id="equipe-outro-cargo" name="outroCargo" data-equipe-campo="outroCargo" aria-invalid={campoErro === 'outroCargo'} aria-describedby={campoErro === 'outroCargo' ? 'equipe-erro-outroCargo' : undefined} value={form.outroCargo} onChange={(e) => atualizar('outroCargo', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" />{mostrarErroCampo('outroCargo')}</div>}
        <div><label htmlFor="equipe-cpf" className="text-sm font-medium">CPF <span className="font-normal text-[var(--texto-secundario)]">(opcional)</span></label><input id="equipe-cpf" name="cpf" data-equipe-campo="cpf" inputMode="numeric" aria-invalid={campoErro === 'cpf'} aria-describedby={campoErro === 'cpf' ? 'equipe-erro-cpf' : undefined} value={form.cpf} onChange={(e) => atualizar('cpf', formatarCpf(e.target.value))} disabled={!form.alterarCpf || salvando} placeholder={form.cpfSituacao === 'indisponivel' ? 'Dado não carregado' : '000.000.000-00'} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3 disabled:opacity-60" />{editandoId && form.cpfSituacao === 'informado' && <span className="mt-1 block text-xs text-[var(--texto-secundario)]">CPF protegido. Marque abaixo somente se precisar substituí-lo ou removê-lo.</span>}{mostrarErroCampo('cpf')}</div>
        {editandoId && form.cpfSituacao === 'informado' && <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={form.alterarCpf} onChange={(e) => atualizar('alterarCpf', e.target.checked)} /> Alterar CPF</label>}
        <div><label htmlFor="equipe-telefone" className="text-sm font-medium">Tel/WhatsApp</label><input id="equipe-telefone" name="telefone" inputMode="tel" value={form.telefone} onChange={(e) => atualizar('telefone', formatarTelefoneBrasil(e.target.value))} autoComplete="tel" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></div>
        <div><label htmlFor="equipe-email" className="text-sm font-medium">E-mail de contato</label><input id="equipe-email" name="emailContato" type="email" data-equipe-campo="emailContato" aria-invalid={campoErro === 'emailContato'} aria-describedby={campoErro === 'emailContato' ? 'equipe-erro-emailContato' : undefined} value={form.emailContato} onChange={(e) => atualizar('emailContato', e.target.value)} autoComplete="email" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /><span className="mt-1 block text-xs text-[var(--texto-secundario)]">Não altera o e-mail de login.</span>{mostrarErroCampo('emailContato')}</div>
        </div></section>
        {form.tipo === 'profissional_saude' && <fieldset className="equipe-secao-form"><legend className="text-base font-semibold">Dados profissionais de saúde</legend><div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label htmlFor="equipe-profissao" className="text-sm font-medium">Profissão *</label><input id="equipe-profissao" name="profissao" data-equipe-campo="profissao" aria-required="true" aria-invalid={campoErro === 'profissao'} aria-describedby={campoErro === 'profissao' ? 'equipe-erro-profissao' : undefined} value={form.profissao} onChange={(e) => atualizar('profissao', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" />{mostrarErroCampo('profissao')}</div><div><label htmlFor="equipe-conselho" className="text-sm font-medium">Conselho</label><input id="equipe-conselho" name="conselhoClasse" data-equipe-campo="conselho" aria-invalid={campoErro === 'conselho'} aria-describedby={campoErro === 'conselho' ? 'equipe-erro-conselho' : undefined} value={form.conselhoClasse} onChange={(e) => atualizar('conselhoClasse', e.target.value)} placeholder="CRM, CRP, COREN..." className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></div><div><label htmlFor="equipe-registro" className="text-sm font-medium">Registro</label><input id="equipe-registro" name="registroConselho" value={form.registroConselho} onChange={(e) => atualizar('registroConselho', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></div><div><label htmlFor="equipe-uf" className="text-sm font-medium">UF do conselho</label><input id="equipe-uf" name="conselhoUf" maxLength={2} value={form.conselhoUf} onChange={(e) => atualizar('conselhoUf', e.target.value.toUpperCase())} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></div><div><label htmlFor="equipe-especialidade" className="text-sm font-medium">Especialidade</label><select id="equipe-especialidade" name="especialidadeId" value={form.especialidadeId} onChange={(e) => atualizar('especialidadeId', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3"><option value="">Sem especialidade</option>{especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div></div>{mostrarErroCampo('conselho')}</fieldset>}
        <fieldset className="equipe-secao-form" aria-invalid={campoErro === 'clinicas'} aria-describedby={campoErro === 'clinicas' ? 'equipe-erro-clinicas' : undefined}>
          <legend className="text-base font-semibold">{form.edicao ? 'Vínculos com clínicas' : 'Clínicas vinculadas *'}</legend>
          {form.edicao ? <>
            <p className="text-sm font-medium">Vínculos existentes — mantidos</p>
            <ul className="mt-2 space-y-2 text-sm" data-testid="vinculos-existentes">{form.edicao.clinicas.map((clinica) => <li key={clinica.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--borda)] px-3 py-2"><span>{clinica.nome}</span><span className="text-xs text-[var(--texto-secundario)]">Vínculo ativo</span></li>)}</ul>
            <p className="mt-2 text-xs text-[var(--texto-secundario)]">Esta edição mantém os vínculos existentes e não permite removê-los.</p>
            {clinicas.some((clinica) => !form.edicao!.clinicas.some((existente) => existente.id === clinica.id)) && <div className="mt-4" data-testid="novos-vinculos">
              <p className="text-sm font-medium">Solicitar acréscimo em outra clínica</p>
              <div className="mt-2 flex flex-wrap gap-3">{clinicas.filter((clinica) => !form.edicao!.clinicas.some((existente) => existente.id === clinica.id)).map((clinica, index) => <label key={clinica.id} className="flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-[var(--borda)] px-3 text-sm"><input type="checkbox" data-equipe-campo={index === 0 ? 'clinicas' : undefined} checked={form.clinicasIds.includes(clinica.id)} onChange={(event) => atualizar('clinicasIds', event.target.checked ? [...form.clinicasIds, clinica.id] : form.clinicasIds.filter((id) => id !== clinica.id))} /><span>Acrescentar vínculo: {clinica.nome}</span></label>)}</div>
              <p className="mt-2 text-xs text-[var(--texto-secundario)]">O vínculo anterior dessas clínicas não é informado nesta tela. A inclusão será confirmada ao salvar. Vínculos inativos não serão reativados por esta edição.</p>
            </div>}
          </> : <div className="mt-2 flex flex-wrap gap-3">{clinicas.map((clinica, index) => <label key={clinica.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--borda)] px-3"><input type="checkbox" data-equipe-campo={index === 0 ? 'clinicas' : undefined} checked={form.clinicasIds.includes(clinica.id)} onChange={(event) => atualizar('clinicasIds', event.target.checked ? [...form.clinicasIds, clinica.id] : form.clinicasIds.filter((id) => id !== clinica.id))} />{clinica.nome}</label>)}</div>}
          <p className="mt-3 text-xs text-[var(--texto-secundario)]">O vínculo cadastral informa onde a pessoa atua.</p>
          {mostrarErroCampo('clinicas')}
        </fieldset>
      </fieldset>
      <div className="flex flex-col-reverse justify-end gap-3 border-t border-[var(--borda)] pt-4 sm:flex-row"><button type="button" disabled={salvando} onClick={fecharFormulario} className="min-h-11 w-full rounded-lg border border-[var(--borda)] px-4 font-semibold sm:w-auto">Cancelar</button><button type="submit" disabled={salvando || !cargoEfetivo(form)} aria-busy={salvando} className="equipe-acao-primaria min-h-11 w-full rounded-lg bg-[var(--cor-primaria)] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{salvando ? 'Salvando…' : 'Salvar cadastro'}</button></div>
    </form><ConfirmacaoDialog open={confirmandoDescarte} onOpenChange={setConfirmandoDescarte} tone="warning" title="Descartar alterações não salvas?" description="Os dados preenchidos nesta ficha serão descartados e não serão enviados ao banco." cancelLabel="Continuar editando" confirmLabel="Descartar alterações" onConfirm={limparFormulario} /></ModalBase>}
  </div>
}

export default Equipe

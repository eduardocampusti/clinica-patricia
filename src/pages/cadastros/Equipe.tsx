import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ConfirmacaoDialog } from '../../components/feedback/ConfirmacaoDialog'
import { FeedbackAlert } from '../../components/feedback/FeedbackAlert'
import { ModalBase } from '../../components/ModalBase'
import { supabase } from '../../lib/supabase'
import { formatarCpf } from '../../lib/cpf'
import { formatarTelefoneBrasil } from '../../lib/pacienteFormulario'
import {
  alterarAcessoEquipe, buscarAcessoEquipe, iniciarAcessoEquipe, reenviarConviteEquipe,
  rotuloPapelAcessoEquipe, rotuloStatusAcessoEquipe, statusAcessoCor,
  type AcessoEquipe, type AcaoAcessoEquipe, type ClinicaAcessoEquipe, type EscopoAcessoEquipe,
  type ModoConcessaoEquipe, type PapelAcessoEquipe,
} from '../../lib/equipeAcessos'
import {
  CARGOS_EQUIPE, TIPOS_EQUIPE, cargoEfetivo, formularioAPartirDoDetalhe, formularioEquipeVazio,
  mascararCpfEquipe, montarDadosEquipe, rotuloAcessoEquipe, rotuloTipoEquipe, validarFormularioEquipeDetalhada,
  type CampoFormularioEquipe, type ClinicaEquipe, type DetalheMembroEquipe, type FormularioEquipe,
  type MembroEquipe, type TipoMembroEquipe,
} from '../../lib/equipe'

interface Especialidade { id: string; nome: string }
interface EquipeProps { clinicaAtivaId: string | null; souProprietaria: boolean }

interface FichaMembroProps {
  membro: MembroEquipe
  detalhe: DetalheMembroEquipe | null
  clinicaAtivaId: string | null
  carregando: boolean
  erro: string | null
  indisponivel: boolean
  souProprietaria: boolean
  onFechar: () => void
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
        <InfoFicha label="Situação cadastral" value="Cadastro localizado no contexto consultado" />
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
          <span className="text-xs text-[var(--texto-secundario)]">{clinica.id === clinicaAtivaId ? 'Contexto consultado' : 'Vínculo listado; situação de acesso não confirmada nesta consulta'}</span>
        </li>)}
      </ul> : <p className="text-sm text-[var(--texto-secundario)]">Nenhum vínculo clínico foi informado nesta consulta.</p>}
    </section>

    <section aria-labelledby="ficha-acesso-titulo" data-testid="ficha-secao-acesso">
      <h3 id="ficha-acesso-titulo" className="mb-3 text-base font-semibold">Acesso ao sistema</h3>
      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <InfoFicha label="Status retornado pelo serviço" value={rotuloAcessoEquipe(dados.acesso_status)} />
        <InfoFicha label="Login" value="Não confirmado por esta consulta" />
      </dl>
      <p className="mt-3 text-xs text-[var(--texto-secundario)]">Cargo, profissão, vínculo clínico e login são informações diferentes. A ausência de um dado nesta ficha não comprova ausência de acesso.</p>
    </section>
  </div>
}

function AcessoEquipePainel({ membro, clinicaAtivaId, souProprietaria }: { membro: MembroEquipe; clinicaAtivaId: string | null; souProprietaria: boolean }) {
  const [acesso, setAcesso] = useState<AcessoEquipe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [email, setEmail] = useState(membro.email_contato ?? '')
  const [modo, setModo] = useState<ModoConcessaoEquipe>('convite')
  const [escopo, setEscopo] = useState<Record<string, PapelAcessoEquipe>>({})
  const [operacao, setOperacao] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [mensagemTipo, setMensagemTipo] = useState<'success' | 'warning' | 'destructive'>('success')
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    setAcesso(null)
    if (!souProprietaria || !clinicaAtivaId || membro.origem_legada) {
      setCarregando(false)
      return () => { ativo = false }
    }
    void buscarAcessoEquipe(membro.id, clinicaAtivaId).then(({ data, error }) => {
      if (!ativo) return
      setCarregando(false)
      if (error || !data || !Array.isArray(data.clinicas) || !Array.isArray(data.convites)) {
        setErro(error?.mensagem ?? 'A gestão de acessos ainda não está disponível neste ambiente.')
        return
      }
      setAcesso(data)
      setEmail(data.login_email ?? membro.email_contato ?? '')
      setEscopo((atual) => {
        const proximo = { ...atual }
        for (const clinica of data.clinicas) {
          if (!proximo[clinica.id]) proximo[clinica.id] = papelInicial(membro)
        }
        return proximo
      })
    })
    return () => { ativo = false }
  }, [clinicaAtivaId, membro, souProprietaria, versao])

  function papelInicial(item: MembroEquipe): PapelAcessoEquipe {
    return item.tipo === 'profissional_saude' ? 'medico' : 'recepcao'
  }

  function escoposSelecionados(clinicas: ClinicaAcessoEquipe[]): EscopoAcessoEquipe[] {
    return clinicas
      .filter((clinica) => Boolean(escopo[clinica.id]))
      .map((clinica) => ({ clinica_id: clinica.id, papel: escopo[clinica.id] }))
  }

  async function iniciar(event: FormEvent) {
    event.preventDefault()
    if (!acesso || !clinicaAtivaId || operacao) return
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
    setOperacao('preparar')
    setMensagem(null)
    const { data, error } = await iniciarAcessoEquipe({
      membroId: membro.id,
      clinicaContextoId: clinicaAtivaId,
      email: emailNormalizado,
      modo,
      clinicasPapeis: selecionados,
    })
    setOperacao(null)
    if (error) {
      setMensagemTipo('destructive')
      setMensagem(error.mensagem)
      return
    }
    setMensagemTipo('success')
    setMensagem(typeof data?.mensagem === 'string' ? data.mensagem : modo === 'convite' ? 'Convite enviado. O acesso ficará pendente até o aceite.' : 'Confirmação enviada ao titular da conta.')
    setVersao((atual) => atual + 1)
  }

  async function alterar(clinica: ClinicaAcessoEquipe, acao: AcaoAcessoEquipe) {
    if (!acesso || !clinicaAtivaId || operacao) return
    const chave = `${acao}:${clinica.id}`
    setOperacao(chave)
    setMensagem(null)
    const { error } = await alterarAcessoEquipe({
      membroId: membro.id,
      clinicaContextoId: clinicaAtivaId,
      clinicaAlvoId: clinica.id,
      acaoAcesso: acao,
      papel: acao === 'conceder' || acao === 'papel' ? (escopo[clinica.id] ?? papelInicial(membro)) : null,
    })
    setOperacao(null)
    if (error) {
      setMensagemTipo('destructive')
      setMensagem(error.mensagem)
      return
    }
    setMensagemTipo('success')
    setMensagem(acao === 'suspender' ? 'Acesso suspenso nesta clínica.' : acao === 'reativar' ? 'Acesso reativado nesta clínica.' : acao === 'papel' ? 'Papel atualizado nesta clínica.' : 'Acesso concedido nesta clínica.')
    setVersao((atual) => atual + 1)
  }

  async function reenviar(convite: NonNullable<AcessoEquipe['convites']>[number]) {
    if (!clinicaAtivaId || operacao) return
    setOperacao(`reenviar:${convite.id}`)
    setMensagem(null)
    const { data, error } = await reenviarConviteEquipe({ conviteId: convite.id, clinicaContextoId: clinicaAtivaId })
    setOperacao(null)
    if (error) {
      setMensagemTipo('destructive')
      setMensagem(error.mensagem)
      return
    }
    setMensagemTipo('success')
    setMensagem(typeof data?.mensagem === 'string' ? data.mensagem : 'Solicitação reenviada.')
    setVersao((atual) => atual + 1)
  }

  function conviteParaClinica(clinicaId: string) {
    return acesso?.convites.find((convite) => convite.status === 'pendente' || convite.status === 'enviado'
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
    return <div className="mt-3 space-y-2" role="status" aria-busy="true" data-testid="acesso-carregando"><div className="h-10 animate-pulse rounded-lg bg-[var(--fundo-pagina)]" /><p className="text-xs text-[var(--texto-secundario)]">Consultando permissões autorizadas…</p></div>
  }
  if (erro || !acesso) {
    return <FeedbackAlert variant="warning" title="Gestão de acessos indisponível" description={erro ?? 'A migration e o serviço seguro ainda não estão disponíveis neste ambiente. O cadastro da equipe continua separado e protegido.'} />
  }

  const temConta = Boolean(acesso.usuario_id)
  return <div className="mt-4 space-y-4" data-testid="painel-gestao-acessos">
    {mensagem && <FeedbackAlert variant={mensagemTipo} title={mensagemTipo === 'destructive' ? 'Não foi possível concluir' : mensagemTipo === 'warning' ? 'Revise os dados' : 'Operação concluída'} description={mensagem} urgent={mensagemTipo === 'destructive'} onClose={() => setMensagem(null)} />}
    <div className="rounded-lg border border-[var(--borda)] bg-[var(--fundo-pagina)] px-3 py-3 text-sm">
      <p><strong>Login:</strong> {acesso.login_email ?? 'Sem conta vinculada'}</p>
      <p className="mt-1 text-xs text-[var(--texto-secundario)]">{acesso.login_email ? (acesso.conta_confirmada ? 'Conta confirmada no Auth.' : 'Conta localizada, mas a confirmação não foi confirmada.') : 'E-mail de contato não comprova login.'}</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Acesso por clínica</h4>
      {acesso.clinicas.length === 0 && <p className="text-sm text-[var(--texto-secundario)]">Nenhum vínculo clínico autorizado foi retornado.</p>}
      {acesso.clinicas.map((clinica) => {
        const convite = conviteParaClinica(clinica.id)
        const cor = statusAcessoCor(clinica.status)
        return <div key={clinica.id} className="rounded-lg border border-[var(--borda)] px-3 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="font-medium">{clinica.nome}</p><p className="text-xs text-[var(--texto-secundario)]">Papel: {rotuloPapelAcessoEquipe(clinica.papel)}</p></div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${cor === 'success' ? 'bg-[var(--cor-sucesso-suave)] text-[var(--cor-sucesso)]' : cor === 'warning' ? 'bg-[var(--cor-atencao-suave)] text-[var(--cor-atencao)]' : cor === 'destructive' ? 'bg-[var(--feedback-erro-fundo)] text-[var(--cor-erro)]' : 'bg-[var(--fundo-pagina)] text-[var(--texto-secundario)]'}`}>{rotuloStatusAcessoEquipe(clinica.status)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {clinica.status === 'acesso_ativo' && <>
              <label className="text-xs text-[var(--texto-secundario)]">Alterar papel
                <select aria-label={`Papel de ${clinica.nome}`} value={escopo[clinica.id] ?? clinica.papel ?? papelInicial(membro)} disabled={Boolean(operacao)} onChange={(event) => setEscopo((atual) => ({ ...atual, [clinica.id]: event.target.value as PapelAcessoEquipe }))} className="ml-2 min-h-9 rounded border border-[var(--borda)] bg-[var(--fundo-card)] px-2 text-sm text-[var(--texto-principal)]"><option value="proprietaria">Administradora</option><option value="medico">Médico</option><option value="recepcao">Recepção</option></select>
              </label>
              <button type="button" disabled={Boolean(operacao)} onClick={() => void alterar(clinica, 'papel')} className="min-h-9 rounded-lg border border-[var(--borda)] px-3 text-xs font-semibold disabled:opacity-50">Salvar papel</button>
              <button type="button" disabled={Boolean(operacao)} onClick={() => void alterar(clinica, 'suspender')} className="min-h-9 rounded-lg border border-[var(--borda)] px-3 text-xs font-semibold disabled:opacity-50">Suspender acesso</button>
            </>}
            {clinica.status === 'acesso_suspenso' && <button type="button" disabled={Boolean(operacao)} onClick={() => void alterar(clinica, 'reativar')} className="min-h-9 rounded-lg border border-[var(--borda)] px-3 text-xs font-semibold disabled:opacity-50">Reativar acesso</button>}
            {clinica.status === 'sem_acesso' && temConta && <button type="button" disabled={Boolean(operacao)} onClick={() => void alterar(clinica, 'conceder')} className="min-h-9 rounded-lg bg-[var(--cor-primaria)] px-3 text-xs font-semibold text-white disabled:opacity-50">Conceder acesso</button>}
            {clinica.status === 'convite_pendente' && convite && <button type="button" disabled={Boolean(operacao)} onClick={() => void reenviar(convite)} className="min-h-9 rounded-lg border border-[var(--borda)] px-3 text-xs font-semibold disabled:opacity-50">Reenviar convite</button>}
          </div>
        </div>
      })}
    </div>

    {!temConta && <form onSubmit={iniciar} className="space-y-3 rounded-lg border border-[var(--borda)] px-3 py-3" aria-label="Conceder acesso ao membro">
      <div><h4 className="text-sm font-semibold">Iniciar acesso</h4><p className="mt-1 text-xs text-[var(--texto-secundario)]">O cadastro da pessoa já existe. Esta etapa cuida somente do login e dos vínculos autorizados.</p></div>
      <label className="block text-sm font-medium" htmlFor="equipe-acesso-email">E-mail de login<input id="equipe-acesso-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" disabled={Boolean(operacao)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" placeholder="pessoa@exemplo.com" /></label>
      <fieldset disabled={Boolean(operacao)}><legend className="text-sm font-medium">Como confirmar a conta?</legend><div className="mt-2 flex flex-col gap-2 text-sm sm:flex-row"><label className="flex items-center gap-2"><input type="radio" name="equipe-modo-acesso" checked={modo === 'convite'} onChange={() => setModo('convite')} /> Enviar convite para quem ainda não tem conta</label><label className="flex items-center gap-2"><input type="radio" name="equipe-modo-acesso" checked={modo === 'vinculo'} onChange={() => setModo('vinculo')} /> Vincular conta existente por confirmação</label></div></fieldset>
      <fieldset disabled={Boolean(operacao)}><legend className="text-sm font-medium">Clínicas e papéis</legend><div className="mt-2 space-y-2">{acesso.clinicas.map((clinica) => <label key={clinica.id} className="flex flex-wrap items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(escopo[clinica.id])} onChange={(event) => setEscopo((atual) => { const proximo = { ...atual }; if (event.target.checked) proximo[clinica.id] = atual[clinica.id] ?? papelInicial(membro); else delete proximo[clinica.id]; return proximo })} /> <span>{clinica.nome}</span>{escopo[clinica.id] && <select aria-label={`Papel para ${clinica.nome}`} value={escopo[clinica.id]} onChange={(event) => setEscopo((atual) => ({ ...atual, [clinica.id]: event.target.value as PapelAcessoEquipe }))} className="min-h-9 rounded border border-[var(--borda)] bg-[var(--fundo-card)] px-2 text-sm text-[var(--texto-principal)]"><option value="proprietaria">Administradora</option><option value="medico">Médico</option><option value="recepcao">Recepção</option></select>}</label>)}</div></fieldset>
      <button type="submit" disabled={Boolean(operacao)} aria-busy={operacao === 'preparar'} className="min-h-11 w-full rounded-lg bg-[var(--cor-primaria)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{operacao === 'preparar' ? 'Processando…' : modo === 'convite' ? 'Enviar convite' : 'Solicitar confirmação'}</button>
      <p className="text-xs text-[var(--texto-secundario)]">A confirmação pode depender da configuração de e-mail do ambiente. Nenhum segredo ou senha é exibido nesta tela.</p>
    </form>}
  </div>
}

function FichaMembro({ membro, detalhe, clinicaAtivaId, carregando, erro, indisponivel, souProprietaria, onFechar }: FichaMembroProps) {
  return <ModalBase titulo={`Ficha de ${membro.nome_completo}`} onFechar={onFechar} largura="lg">
    {carregando && <div role="status" aria-busy="true" className="space-y-3" data-testid="ficha-carregando"><div className="h-5 w-2/3 animate-pulse rounded bg-[var(--fundo-pagina)]" /><div className="h-20 animate-pulse rounded-lg bg-[var(--fundo-pagina)]" /><p className="text-sm text-[var(--texto-secundario)]">Carregando dados autorizados da ficha…</p></div>}
    {!carregando && erro && <div className="space-y-4" data-testid="ficha-erro"><FeedbackAlert variant="destructive" title="Não foi possível carregar a ficha" description={erro} urgent /><FichaResumo membro={membro} detalhe={null} clinicaAtivaId={clinicaAtivaId} /><AcessoEquipePainel membro={membro} clinicaAtivaId={clinicaAtivaId} souProprietaria={souProprietaria} /></div>}
    {!carregando && !erro && indisponivel && <div className="space-y-4" data-testid="ficha-indisponivel"><FeedbackAlert variant="warning" title="Dados ampliados indisponíveis" description="Esta instância ainda não oferece a consulta detalhada. Os campos abaixo são somente os que a listagem autorizada já confirmou." /><FichaResumo membro={membro} detalhe={null} clinicaAtivaId={clinicaAtivaId} /><AcessoEquipePainel membro={membro} clinicaAtivaId={clinicaAtivaId} souProprietaria={souProprietaria} /></div>}
    {!carregando && !erro && !indisponivel && detalhe && <><FichaResumo membro={membro} detalhe={detalhe} clinicaAtivaId={clinicaAtivaId} /><AcessoEquipePainel membro={membro} clinicaAtivaId={clinicaAtivaId} souProprietaria={souProprietaria} /></>}
  </ModalBase>
}

type ErroEquipe = { code?: string; message?: string; details?: string | null; hint?: string | null }

function mensagemErro(error: ErroEquipe | null): string {
  if (error?.code === '23505') {
    // O PostgREST mantém o nome do índice na mensagem técnica. Usamos esse
    // contexto somente para escolher um texto seguro; nunca exibimos detalhes
    // técnicos ou o hash/CPF retornado pelo banco.
    const contexto = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLocaleLowerCase()
    if (contexto.includes('cpf_hash') || contexto.includes('equipe_membros_cpf')) {
      return 'Já existe um funcionário cadastrado com este CPF.'
    }
    if (contexto.includes('equipe_registro_unico') || contexto.includes('registro_conselho')) {
      return 'Já existe um profissional com este registro de conselho.'
    }
    return 'Já existe um cadastro com este CPF ou registro profissional.'
  }
  if (error?.code === '40001') return 'Este cadastro foi alterado em outra sessão. Reabra a ficha antes de salvar novamente.'
  if (error?.code === 'PGRST202' || error?.code === '42883') return 'A atualização segura do banco para Equipe ainda não foi aplicada neste ambiente.'
  if (error?.code === '22023' && error.message) return error.message
  return 'Não foi possível concluir a operação. Tente novamente.'
}

function mensagemErroFicha(error: { code?: string; message?: string } | null): string {
  if (error?.code === '42501') return 'Você não tem autorização para consultar esta ficha nesta clínica.'
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    return 'Os dados ampliados da ficha ainda não estão disponíveis nesta instância. A consulta legada permanece somente leitura.'
  }
  return 'Não foi possível carregar a ficha deste membro. Tente novamente.'
}

function extrairDetalheEquipe(data: unknown): DetalheMembroEquipe | null {
  if (!data) return null
  const detalhe = (Array.isArray(data) ? data[0] : data) as DetalheMembroEquipe | undefined
  return detalhe?.id ? detalhe : null
}

async function consultarDetalheEquipe(membroId: string, clinicaId: string) {
  const { data, error } = await supabase.rpc('equipe_detalhar', {
    p_membro_id: membroId,
    p_clinica_contexto_id: clinicaId,
  })
  return { detalhe: extrairDetalheEquipe(data), error }
}

function Equipe({ clinicaAtivaId, souProprietaria }: EquipeProps) {
  const [membros, setMembros] = useState<MembroEquipe[]>([])
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
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [formAlterado, setFormAlterado] = useState(false)
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const carregarSequencia = useRef(0)
  const fichaSequencia = useRef(0)
  const edicaoSequencia = useRef(0)

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

  const carregar = useCallback(async () => {
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

    setCarregando(true)
    setErro(null)
    setIndisponivel(false)

    try {
      const [lista, unidades, catalogo] = await Promise.all([
        supabase.rpc('equipe_listar', { p_clinica_contexto_id: clinicaAtivaId }),
        supabase.from('clinicas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('especialidades').select('id, nome').eq('ativo', true).order('nome'),
      ])
      if (requisicao !== carregarSequencia.current) return
      setClinicas((unidades.data ?? []) as ClinicaEquipe[])
      setEspecialidades((catalogo.data ?? []) as Especialidade[])
      if (!lista.error) {
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
        setErro('Não foi possível carregar a equipe desta clínica.')
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
          especialidade_nome: e?.nome ?? null, acesso_status: p.usuario_id ? 'conta_vinculada' : 'sem_conta',
          clinicas: [{ id: linha.clinica_id, nome: c?.nome ?? 'Clínica atual' }], revisao: 0, origem_legada: true,
        } as MembroEquipe
      })
      setMembros(adaptados)
      setCompatibilidade(true)
      setCarregando(false)
    } catch {
      if (requisicao !== carregarSequencia.current) return
      setMembros([])
      setIndisponivel(true)
      setErro('Não foi possível carregar a equipe desta clínica.')
      setCarregando(false)
    }
  }, [clinicaAtivaId])

  useEffect(() => {
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
    setBusca('')
    setTipo('')
    setClinicaFiltro('')
    setMembros([])
    setClinicas([])
    setEspecialidades([])
    setCompatibilidade(false)
    setIndisponivel(false)
  }, [clinicaAtivaId])

  useEffect(() => { void carregar() }, [carregar])

  useEffect(() => {
    if (!campoErro || !form) return
    const alvo = formRef.current?.querySelector<HTMLElement>(`[data-equipe-campo="${campoErro}"]`)
    alvo?.focus()
  }, [campoErro, form])

  const filtrados = useMemo(() => membros.filter((m) => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return (!termo || `${m.nome_completo} ${m.cargo} ${m.profissao ?? ''}`.toLocaleLowerCase('pt-BR').includes(termo))
      && (!tipo || m.tipo === tipo) && (!clinicaFiltro || m.clinicas.some((c) => c.id === clinicaFiltro))
  }), [membros, busca, tipo, clinicaFiltro])

  function fecharFicha() {
    fichaSequencia.current += 1
    setVisualizando(null)
    setDetalheFicha(null)
    setCarregandoFicha(false)
    setErroFicha(null)
    setFichaIndisponivel(false)
  }

  async function abrirFicha(membro: MembroEquipe) {
    const contexto = clinicaAtivaId
    if (!contexto) return
    const requisicao = ++fichaSequencia.current
    setVisualizando(membro)
    setDetalheFicha(null)
    setErroFicha(null)
    setFichaIndisponivel(false)
    setCarregandoFicha(!membro.origem_legada)

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
    const { error: salvarErro } = await supabase.rpc('equipe_salvar', {
      p_membro_id: editandoId, p_clinica_contexto_id: clinicaAtivaId, p_revisao_esperada: form.revisao, p_dados: dados,
      p_chave_idempotencia: form.chaveIdempotencia,
    })
    if (salvarErro) {
      setErroForm(mensagemErro(salvarErro))
      setSalvando(false)
      return
    }
    const mensagemSucesso = editandoId ? 'Cadastro atualizado com sucesso.' : 'Funcionário cadastrado com sucesso.'
    limparFormulario()
    setSalvando(false)
    await carregar()
    setSucesso(mensagemSucesso)
  }

  function atualizar<K extends keyof FormularioEquipe>(campo: K, valor: FormularioEquipe[K]) {
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

  return <div className="space-y-5" data-testid="equipe-modulo">
    {sucesso && <FeedbackAlert variant="success" title={sucesso} onClose={() => setSucesso(null)} autoDismissMs={6000} />}
    {compatibilidade && <FeedbackAlert
      variant="warning"
      title="Cadastro e edição aguardam homologação do banco"
      description={<span>A lista de profissionais existente continua disponível para consulta em <strong>{clinicaAtual?.nome ?? 'esta clínica'}</strong>. Os botões de mutação permanecem protegidos e nenhuma alteração será salva até a migration segura de Equipe ser aplicada e homologada.</span>}
    />}
    {erro && <FeedbackAlert variant="destructive" title={erro} onClose={() => setErro(null)} />}
    <p className="rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-4 py-3 text-sm text-[var(--texto-secundario)]">Contas antigas de recepção e administração não são convertidas automaticamente em funcionários. Cadastrar a pessoa aqui não cria outro login.</p>

    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="texto-titulo-secao">Equipe &amp; acessos</h2>
        <p className="text-sm text-[var(--texto-secundario)]">Pessoas vinculadas às clínicas; cadastro e acesso ao sistema são independentes.</p>
      </div>
      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <div className="rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2 text-sm" aria-label="Clínica ativa" role="status">
          <span className="mr-1 text-[var(--texto-secundario)]">Clínica ativa:</span>
          <strong>{clinicaAtual?.nome ?? (clinicaAtivaId ? 'carregando…' : 'nenhuma selecionada')}</strong>
        </div>
        {souProprietaria && <button type="button" disabled={compatibilidade || indisponivel || !clinicaAtivaId} onClick={abrirNovo} className="min-h-11 rounded-lg bg-[var(--cor-primaria)] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Novo membro</button>}
      </div>
    </div>
    {!souProprietaria && <p className="text-sm text-[var(--texto-secundario)]">Consulta disponível para este perfil. O cadastro e a edição permanecem restritos à proprietária da clínica.</p>}

    <div className="flex flex-wrap gap-3 rounded-xl bg-[var(--fundo-card)] p-4 shadow-[var(--sombra-baixa)]">
      <label htmlFor="equipe-busca" className="min-w-[220px] flex-1 text-sm font-medium">Buscar por nome
        <input id="equipe-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome ou cargo" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3 font-normal" />
      </label>
      <label htmlFor="equipe-tipo" className="min-w-[190px] text-sm font-medium">Cargo ou tipo
        <select id="equipe-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMembroEquipe | '')} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 font-normal"><option value="">Todos</option>{TIPOS_EQUIPE.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}</select>
      </label>
      <label htmlFor="equipe-clinica" className="min-w-[180px] text-sm font-medium">Clínica
        <select id="equipe-clinica" value={clinicaFiltro} onChange={(e) => setClinicaFiltro(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 font-normal"><option value="">Todas autorizadas</option>{clinicas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
      </label>
    </div>

    {carregando ? <div className="space-y-2" aria-label="Carregando equipe" aria-busy="true">{[1, 2, 3].map((n) => <div key={n} className="h-20 animate-pulse rounded-xl bg-[var(--fundo-card)]" />)}</div>
      : indisponivel ? <div className="rounded-xl border border-[var(--feedback-erro-borda)] bg-[var(--feedback-erro-fundo)] p-6 text-center" role="status"><p className="font-semibold text-[var(--feedback-erro-texto)]">Equipe indisponível neste momento</p><p className="mt-1 text-sm text-[var(--feedback-erro-texto)]">A consulta não foi concluída. Tente novamente quando o serviço estiver disponível.</p><button type="button" onClick={() => void carregar()} className="mt-4 min-h-11 rounded-lg border border-current px-4 text-sm font-semibold text-[var(--feedback-erro-texto)]">Tentar novamente</button></div>
      : !clinicaAtivaId ? <div className="rounded-xl border border-[var(--borda)] bg-[var(--fundo-card)] p-8 text-center" role="status"><p className="font-semibold">Selecione uma clínica</p><p className="mt-1 text-sm text-[var(--texto-secundario)]">A equipe será carregada somente depois que uma unidade autorizada estiver ativa.</p></div>
      : filtrados.length === 0 ? <div className="rounded-xl border border-[var(--borda)] bg-[var(--fundo-card)] p-8 text-center"><p className="font-semibold">Nenhum membro encontrado</p><p className="mt-1 text-sm text-[var(--texto-secundario)]">Revise os filtros ou cadastre o primeiro membro desta clínica.</p></div>
      : <div className="overflow-x-auto rounded-xl bg-[var(--fundo-card)] shadow-[var(--sombra-baixa)]"><table className="w-full min-w-[760px] text-left" aria-label={`Equipe de ${clinicaAtual?.nome ?? 'clínica ativa'}`}><caption className="sr-only">Membros da equipe, clínicas vinculadas, acesso e ações</caption><thead className="border-b border-[var(--borda)] text-xs text-[var(--texto-secundario)]"><tr><th scope="col" className="p-4">Nome e função</th><th scope="col" className="p-4">Clínicas</th><th scope="col" className="p-4">Acesso</th><th scope="col" className="p-4 text-right">Ações</th></tr></thead><tbody>{filtrados.map((m) => <tr key={m.id} className="border-b border-[var(--borda-sutil)] last:border-0"><td className="p-4"><p className="font-semibold">{m.nome_completo}</p><p className="text-sm text-[var(--texto-secundario)]">{m.cargo} · {rotuloTipoEquipe(m.tipo)}</p></td><td className="p-4 text-sm">{m.clinicas.map((c) => c.nome).join(', ')}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.acesso_status === 'ativo_na_unidade' ? 'bg-[var(--cor-sucesso-suave)] text-[var(--cor-sucesso)]' : 'bg-[var(--fundo-pagina)] text-[var(--texto-secundario)]'}`}>{rotuloAcessoEquipe(m.acesso_status)}</span></td><td className="p-4 text-right"><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => void abrirFicha(m)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-[var(--cor-primaria)]" aria-label={`Ver cadastro de ${m.nome_completo}`}>Ver cadastro</button>{souProprietaria && <button type="button" disabled={compatibilidade || indisponivel} onClick={() => void abrirEdicao(m)} className="min-h-11 rounded-lg border border-[var(--borda)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Editar cadastro de ${m.nome_completo}`}>Editar</button>}</div></td></tr>)}</tbody></table></div>}

    {visualizando && <FichaMembro membro={visualizando} detalhe={detalheFicha} clinicaAtivaId={clinicaAtivaId} carregando={carregandoFicha} erro={erroFicha} indisponivel={fichaIndisponivel} souProprietaria={souProprietaria} onFechar={fecharFicha} />}

    {form && <ModalBase titulo={editandoId ? 'Editar membro da equipe' : 'Novo membro da equipe'} onFechar={fecharFormulario} ocupado={salvando} largura="lg"><form ref={formRef} aria-label={editandoId ? 'Editar membro da equipe' : 'Novo membro da equipe'} onSubmit={salvar} className="space-y-5">
      {erroForm && <FeedbackAlert variant="destructive" title="Revise o cadastro" description={erroForm} urgent />}
      <p className="rounded-lg border border-[var(--borda)] bg-[var(--fundo-pagina)] px-3 py-2 text-sm text-[var(--texto-secundario)]">A pessoa, a função, as clínicas vinculadas e o acesso ao sistema são informações separadas. Esta tela não cria login automaticamente.</p>
      <fieldset disabled={salvando} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="equipe-nome" className="text-sm font-medium">Nome completo *</label><input id="equipe-nome" name="nomeCompleto" data-equipe-campo="nomeCompleto" aria-required="true" aria-invalid={campoErro === 'nomeCompleto'} aria-describedby={campoErro === 'nomeCompleto' ? 'equipe-erro-nomeCompleto' : undefined} value={form.nomeCompleto} onChange={(e) => atualizar('nomeCompleto', e.target.value)} autoComplete="name" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" />{mostrarErroCampo('nomeCompleto')}</div>
        <div><label htmlFor="equipe-tipo-form" className="text-sm font-medium">Tipo de função *</label><select id="equipe-tipo-form" name="tipo" aria-required="true" value={form.tipo} onChange={(e) => atualizar('tipo', e.target.value as TipoMembroEquipe)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3"><option value="">Selecione</option>{TIPOS_EQUIPE.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}</select></div>
        <div><label htmlFor="equipe-cargo" className="text-sm font-medium">Cargo ou função *</label><select id="equipe-cargo" name="cargo" data-equipe-campo="cargo" aria-required="true" aria-invalid={campoErro === 'cargo'} aria-describedby={campoErro === 'cargo' ? 'equipe-erro-cargo' : undefined} value={form.cargo} onChange={(e) => atualizar('cargo', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3"><option value="">Selecione</option>{CARGOS_EQUIPE.map((c) => <option key={c}>{c}</option>)}</select>{mostrarErroCampo('cargo')}</div>
        {form.cargo === 'Outro' && <div className="sm:col-span-2"><label htmlFor="equipe-outro-cargo" className="text-sm font-medium">Outro cargo *</label><input id="equipe-outro-cargo" name="outroCargo" data-equipe-campo="outroCargo" aria-invalid={campoErro === 'outroCargo'} aria-describedby={campoErro === 'outroCargo' ? 'equipe-erro-outroCargo' : undefined} value={form.outroCargo} onChange={(e) => atualizar('outroCargo', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" />{mostrarErroCampo('outroCargo')}</div>}
        <div><label htmlFor="equipe-cpf" className="text-sm font-medium">CPF <span className="font-normal text-[var(--texto-secundario)]">(opcional enquanto a regra da equipe não for aprovada)</span></label><input id="equipe-cpf" name="cpf" data-equipe-campo="cpf" inputMode="numeric" aria-invalid={campoErro === 'cpf'} aria-describedby={campoErro === 'cpf' ? 'equipe-erro-cpf' : undefined} value={form.cpf} onChange={(e) => atualizar('cpf', formatarCpf(e.target.value))} disabled={!form.alterarCpf || salvando} placeholder={form.cpfSituacao === 'indisponivel' ? 'Dado não carregado' : '000.000.000-00'} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3 disabled:opacity-60" />{editandoId && form.cpfSituacao === 'informado' && <span className="mt-1 block text-xs text-[var(--texto-secundario)]">CPF protegido. Marque abaixo somente se precisar substituí-lo ou removê-lo.</span>}{mostrarErroCampo('cpf')}</div>
        {editandoId && form.cpfSituacao === 'informado' && <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={form.alterarCpf} onChange={(e) => atualizar('alterarCpf', e.target.checked)} /> Alterar CPF</label>}
        <div><label htmlFor="equipe-telefone" className="text-sm font-medium">Tel/WhatsApp</label><input id="equipe-telefone" name="telefone" inputMode="tel" value={form.telefone} onChange={(e) => atualizar('telefone', formatarTelefoneBrasil(e.target.value))} autoComplete="tel" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></div>
        <div><label htmlFor="equipe-email" className="text-sm font-medium">E-mail de contato</label><input id="equipe-email" name="emailContato" type="email" data-equipe-campo="emailContato" aria-invalid={campoErro === 'emailContato'} aria-describedby={campoErro === 'emailContato' ? 'equipe-erro-emailContato' : undefined} value={form.emailContato} onChange={(e) => atualizar('emailContato', e.target.value)} autoComplete="email" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /><span className="mt-1 block text-xs text-[var(--texto-secundario)]">Não altera o e-mail de login.</span>{mostrarErroCampo('emailContato')}</div>
        {form.tipo === 'profissional_saude' && <fieldset className="sm:col-span-2 rounded-lg border border-[var(--borda)] p-4"><legend className="px-1 text-sm font-medium">Dados profissionais de saúde</legend><p className="mb-3 text-xs text-[var(--texto-secundario)]">Conselho, registro, UF e especialidade só se aplicam a profissionais de saúde.</p><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label htmlFor="equipe-profissao" className="text-sm font-medium">Profissão *</label><input id="equipe-profissao" name="profissao" data-equipe-campo="profissao" aria-required="true" aria-invalid={campoErro === 'profissao'} aria-describedby={campoErro === 'profissao' ? 'equipe-erro-profissao' : undefined} value={form.profissao} onChange={(e) => atualizar('profissao', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" />{mostrarErroCampo('profissao')}</div><div><label htmlFor="equipe-conselho" className="text-sm font-medium">Conselho</label><input id="equipe-conselho" name="conselhoClasse" data-equipe-campo="conselho" aria-invalid={campoErro === 'conselho'} aria-describedby={campoErro === 'conselho' ? 'equipe-erro-conselho' : undefined} value={form.conselhoClasse} onChange={(e) => atualizar('conselhoClasse', e.target.value)} placeholder="CRM, CRP, COREN..." className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></div><div><label htmlFor="equipe-registro" className="text-sm font-medium">Registro</label><input id="equipe-registro" name="registroConselho" value={form.registroConselho} onChange={(e) => atualizar('registroConselho', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></div><div><label htmlFor="equipe-uf" className="text-sm font-medium">UF do conselho</label><input id="equipe-uf" name="conselhoUf" maxLength={2} value={form.conselhoUf} onChange={(e) => atualizar('conselhoUf', e.target.value.toUpperCase())} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></div><div><label htmlFor="equipe-especialidade" className="text-sm font-medium">Especialidade</label><select id="equipe-especialidade" name="especialidadeId" value={form.especialidadeId} onChange={(e) => atualizar('especialidadeId', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3"><option value="">Sem especialidade</option>{especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div></div>{mostrarErroCampo('conselho')}</fieldset>}
        <fieldset className="sm:col-span-2 rounded-lg border border-[var(--borda)] p-4" aria-invalid={campoErro === 'clinicas'} aria-describedby={campoErro === 'clinicas' ? 'equipe-erro-clinicas' : undefined}><legend className="px-1 text-sm font-medium">Clínicas vinculadas *</legend><div className="mt-2 flex flex-wrap gap-3">{clinicas.map((c, index) => <label key={c.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--borda)] px-3"><input type="checkbox" data-equipe-campo={index === 0 ? 'clinicas' : undefined} checked={form.clinicasIds.includes(c.id)} onChange={(e) => atualizar('clinicasIds', e.target.checked ? [...form.clinicasIds, c.id] : form.clinicasIds.filter((id) => id !== c.id))} />{c.nome}</label>)}</div><p className="mt-1 text-xs text-[var(--texto-secundario)]">O cadastro é global; o vínculo identifica onde a pessoa atua. Isto não concede acesso.</p>{mostrarErroCampo('clinicas')}</fieldset>
      </fieldset>
      <div className="flex flex-col-reverse justify-end gap-3 border-t border-[var(--borda)] pt-4 sm:flex-row"><button type="button" disabled={salvando} onClick={fecharFormulario} className="min-h-11 w-full rounded-lg border border-[var(--borda)] px-4 font-semibold sm:w-auto">Cancelar</button><button type="submit" disabled={salvando || !cargoEfetivo(form)} aria-busy={salvando} className="min-h-11 w-full rounded-lg bg-[var(--cor-primaria)] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{salvando ? 'Salvando…' : 'Salvar cadastro'}</button></div>
    </form><ConfirmacaoDialog open={confirmandoDescarte} onOpenChange={setConfirmandoDescarte} tone="warning" title="Descartar alterações não salvas?" description="Os dados preenchidos nesta ficha serão descartados e não serão enviados ao banco." cancelLabel="Continuar editando" confirmLabel="Descartar alterações" onConfirm={limparFormulario} /></ModalBase>}
  </div>
}

export default Equipe

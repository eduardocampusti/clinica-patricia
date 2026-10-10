import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Papel } from './hooks/usePapelNaClinica'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import ConviteEquipe from './pages/ConviteEquipe'
import RecuperarSenha from './pages/RecuperarSenha'
import Pacientes from './pages/Pacientes'
import Cadastros from './pages/cadastros/Cadastros'
import FinanceiroModulo from './pages/FinanceiroModulo'
import Dashboard from './pages/Dashboard'
import Agenda, { type PacienteCriadoAgenda } from './pages/Agenda'
import Prontuario from './pages/Prontuario'
import SobreSistema from './pages/SobreSistema'
import { useTheme } from './theme/ThemeProvider'
import { useClinicaAtiva } from './hooks/useClinicaAtiva'
import { useClinicasDoUsuario } from './hooks/useClinicasDoUsuario'
import { usePapelNaClinica } from './hooks/usePapelNaClinica'
import AppShell from './components/shell/AppShell'
import PlaceholderScreen from './components/shell/PlaceholderScreen'
import { TELAS_POR_PAPEL, TITULOS_TELA, type Tela } from './components/shell/types'
import { carregarAcessosClinicas } from './lib/clinicAccess'
import { CLINIC_BRANDS, clinicaCorrespondeAoBrand, resolveClinicBrand } from './config/clinicBrands'
import { caminhoInterno, lerRotaInterna, marcaDaRota, navegarPara, useCaminhoAtual } from './lib/appRoute'
import { FeedbackAlert } from './components/feedback/FeedbackAlert'
import { useIdentidadeConta } from './hooks/useIdentidadeConta'
import Configuracoes, { type GuardaConfiguracoes } from './pages/Configuracoes'
import { ConfirmacaoDialog } from './components/feedback/ConfirmacaoDialog'
import { GuardaAtivacao } from './components/GuardaAtivacao'
import { ContextoAtivacao } from './lib/contextoAtivacao'
import { CONFIGURACOES_INTERFACE_DISPONIVEL } from './config/configuracoesDisponibilidade'

function App() {
  const ativacao = useContext(ContextoAtivacao)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recuperacao, setRecuperacao] = useState(() => new URLSearchParams(window.location.search).get('recuperar') === '1' || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery')
  const [recuperacaoAutorizada, setRecuperacaoAutorizada] = useState(ativacao.recuperacaoAutorizada)
  const [escolhaAcesso, setEscolhaAcesso] = useState<{ clinicaId: string; papel: Papel; lembrar: boolean; restauracao?: boolean } | null>(null)
  const [escolhaAplicada, setEscolhaAplicada] = useState(false)
  const [acessoValidado, setAcessoValidado] = useState(false)
  const [usuarioValidado, setUsuarioValidado] = useState<string | null>(null)
  const [erroAcesso, setErroAcesso] = useState<string | null>(null)
  const caminhoAtual = useCaminhoAtual()
  const tela: Tela = lerRotaInterna(caminhoAtual)?.tela ?? 'dashboard'
  const [tentativaAcesso, setTentativaAcesso] = useState(0)
  const [restaurandoAcesso, setRestaurandoAcesso] = useState(true)
  const preferenciaNovoLogin = useRef<boolean | null>(null)
  // Atendimento criado a partir da Agenda ("Iniciar atendimento"): navega
  // para o Prontuário, que sempre o abre pela RPC auditada de leitura.
  const [atendimentoParaAbrir, setAtendimentoParaAbrir] = useState<string | null>(null)
  const [cadastroPacienteAgendaAberto, setCadastroPacienteAgendaAberto] = useState(false)
  const [pacienteCriadoAgenda, setPacienteCriadoAgenda] = useState<PacienteCriadoAgenda | null>(null)
  const [entradaPainel, setEntradaPainel] = useState<{ clinicaId: string; novoPaciente?: boolean; novoAgendamento?: boolean; pacienteId?: string; receberPagamento?: boolean } | null>(null)
  const { aplicarCoresClinica } = useTheme()
  const { clinicas: clinicasDoUsuario, carregando: carregandoClinicas, erro: erroClinicas } = useClinicasDoUsuario(session?.user.id)
  const {
    clinicaAtiva,
    clinicaAtivaId,
    selecionarClinica,
    carregando: carregandoClinica,
  } = useClinicaAtiva(clinicasDoUsuario, carregandoClinicas)
  const { papel, carregando: carregandoPapel, erro: erroPapel } = usePapelNaClinica(session?.user.id ?? '', clinicaAtivaId)
  const identidade = useIdentidadeConta(acessoValidado && usuarioValidado === session?.user.id && !carregandoPapel ? session.user.id : null, clinicaAtivaId, papel)
  const conviteId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('convite') : null
  const conviteValido = !!conviteId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(conviteId)
  const sessionUserId = session?.user.id
  const guardaConfiguracoes = useRef<GuardaConfiguracoes | null>(null)
  const [transicaoPendente, setTransicaoPendente] = useState<(() => void) | null>(null)
  const [salvandoTransicao, setSalvandoTransicao] = useState(false)
  const registrarGuarda = useCallback((g: GuardaConfiguracoes | null) => { guardaConfiguracoes.current = g }, [])
  function solicitarMudanca(acao: () => void) {
    if (guardaConfiguracoes.current?.sujo || guardaConfiguracoes.current?.ocupado) { setTransicaoPendente(() => acao); return }
    acao()
  }

  function setTela(destino: Tela, entrada?: { clinicaId: string; novoPaciente?: boolean; novoAgendamento?: boolean; pacienteId?: string; receberPagamento?: boolean }) {
    solicitarMudanca(() => setTelaDireta(destino, entrada))
  }
  function setTelaDireta(destino: Tela, entrada?: { clinicaId: string; novoPaciente?: boolean; novoAgendamento?: boolean; pacienteId?: string; receberPagamento?: boolean }) {
    if (!papel || !TELAS_POR_PAPEL[papel].includes(destino)) return
    const marca = Object.values(CLINIC_BRANDS).find(item => clinicaAtiva && clinicaCorrespondeAoBrand(clinicaAtiva, item))
    if (!marca) return
    setEntradaPainel(entrada ?? null)
    navegarPara(caminhoInterno(marca.slug, destino))
  }

  function encaminharPainel(destino: 'pacientes' | 'agenda', entrada: { novoPaciente?: boolean; novoAgendamento?: boolean; pacienteId?: string }) {
    if (papel !== 'recepcao' || !clinicaAtivaId) return
    setTela(destino, { clinicaId: clinicaAtivaId, ...entrada })
  }

  // Auth restaura a sessão; os serviços existentes confirmam vínculo/papel.
  // Não executa consultas dentro do callback de onAuthStateChange.
  useEffect(() => {
    if (!sessionUserId || recuperacao || conviteValido) return
    let cancelado = false
    setRestaurandoAcesso(true)
    setAcessoValidado(false)
    setErroAcesso(null)
    const marcaDominio = resolveClinicBrand().brand
    const marca = marcaDominio && (marcaDaRota() ?? marcaDominio)
    if (!marca) { setRestaurandoAcesso(false); return }
    void carregarAcessosClinicas(sessionUserId).then(acessos => {
      if (cancelado) return
      const acesso = acessos.find(item => clinicaCorrespondeAoBrand({ id: item.clinicaId, nome: item.nome, subdomain: item.subdomain }, marca))
      if (!acesso) {
        setErroAcesso(`Sua conta não possui vínculo ativo com ${marca.nome}. Acesso suspenso ou sem autorização. Procure a administração ou entre com outra conta.`)
        setRestaurandoAcesso(false)
        return
      }
      setEscolhaAplicada(false)
      const preferencia = preferenciaNovoLogin.current
      preferenciaNovoLogin.current = null
      setEscolhaAcesso({ clinicaId: acesso.clinicaId, papel: acesso.papel, lembrar: preferencia ?? false, restauracao: preferencia === null })
    }).catch(() => {
      if (cancelado) return
      setErroAcesso('Não foi possível consultar seu acesso. Verifique a conexão e tente novamente. Isso não confirma ausência de vínculo.')
      setRestaurandoAcesso(false)
    })
    return () => { cancelado = true }
  }, [sessionUserId, recuperacao, conviteValido, tentativaAcesso])

  useEffect(() => {
    function voltarNaRota() {
      const rota = lerRotaInterna()
      if (guardaConfiguracoes.current?.sujo || guardaConfiguracoes.current?.ocupado) {
        const destino = window.location.pathname
        const marcaAtual = Object.values(CLINIC_BRANDS).find(b => clinicaAtiva && clinicaCorrespondeAoBrand(clinicaAtiva, b))
        if (marcaAtual) navegarPara(caminhoInterno(marcaAtual.slug, 'configuracoes'), true)
        solicitarMudanca(() => {
          const alvo = rota && clinicasDoUsuario.find(c => clinicaCorrespondeAoBrand(c, CLINIC_BRANDS[rota.unidade]))
          if (alvo) selecionarClinica(alvo.id, false, true)
          navegarPara(destino, true)
        })
        return
      }
      setEntradaPainel(null)
      if (!rota) { window.location.replace(window.location.href); return }
      const clinica = clinicasDoUsuario.find(item => clinicaCorrespondeAoBrand(item, CLINIC_BRANDS[rota.unidade]))
      if (!clinica) { window.location.replace(window.location.href); return }
      selecionarClinica(clinica.id, false, true)
    }
    window.addEventListener('popstate', voltarNaRota)
    return () => window.removeEventListener('popstate', voltarNaRota)
  }, [clinicasDoUsuario, selecionarClinica, clinicaAtiva])

  useEffect(() => {
    if (!escolhaAcesso || !session || carregandoClinicas) return
    if (erroClinicas || erroPapel) {
      setErroAcesso('Não foi possível consultar seu acesso. Tente novamente; seus vínculos não foram alterados.')
      setEscolhaAcesso(null)
      setRestaurandoAcesso(false)
      return
    }
    if (!clinicasDoUsuario.some(clinica => clinica.id === escolhaAcesso.clinicaId)) {
      setErroAcesso('Não foi possível confirmar o vínculo com a unidade selecionada. Entre em contato com a administração.')
      setEscolhaAcesso(null)
      setRestaurandoAcesso(false)
      return
    }
    if (!escolhaAplicada) {
      selecionarClinica(escolhaAcesso.clinicaId, escolhaAcesso.lembrar, escolhaAcesso.restauracao)
      setEscolhaAplicada(true)
      return
    }
    if (clinicaAtivaId !== escolhaAcesso.clinicaId) return
    if (carregandoPapel) return
    if (papel !== escolhaAcesso.papel) {
      setErroAcesso('O perfil escolhido não está autorizado para esta unidade. Entre em contato com a administração.')
      setEscolhaAcesso(null)
      setRestaurandoAcesso(false)
      return
    }
    const marca = Object.values(CLINIC_BRANDS).find(item => clinicaAtiva && clinicaCorrespondeAoBrand(clinicaAtiva, item))
    // A URL atual prevalece sobre qualquer destino anterior ao retorno da
    // consulta. Permissão recusada é explícita, nunca um Dashboard silencioso.
    const solicitada = lerRotaInterna()
    if (marca && solicitada && marca.slug !== solicitada.unidade) {
      setEscolhaAcesso(null)
      setTentativaAcesso(valor => valor + 1)
      return
    }
    if (marca) navegarPara(escolhaAcesso.restauracao !== false && solicitada ? caminhoInterno(solicitada.unidade, solicitada.tela) : caminhoInterno(marca.slug, 'dashboard'), true)
    setEscolhaAcesso(null)
    setAcessoValidado(true)
    setUsuarioValidado(session.user.id)
    setErroAcesso(null)
    setRestaurandoAcesso(false)
  }, [escolhaAcesso, escolhaAplicada, session, carregandoClinicas, clinicasDoUsuario, clinicaAtivaId, clinicaAtiva, selecionarClinica, carregandoPapel, papel, erroClinicas, erroPapel, tela])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    }).catch(() => {
      setErroAcesso('Não foi possível restaurar a sessão. Verifique a conexão e tente novamente.')
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecuperacao(true)
        setRecuperacaoAutorizada(true)
        window.history.replaceState({}, document.title, `${window.location.pathname}?recuperar=1`)
      }
      setSession(newSession)
      if (event === 'SIGNED_OUT') {
        setUsuarioValidado(null)
        setAcessoValidado(false)
        setEscolhaAcesso(null)
        setEscolhaAplicada(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!clinicaAtiva) return
    aplicarCoresClinica({
      cor_primaria: clinicaAtiva.cor_primaria,
      cor_secundaria: clinicaAtiva.cor_secundaria,
      cor_menu: clinicaAtiva.cor_menu,
    })
  }, [clinicaAtiva, aplicarCoresClinica])

  useEffect(() => {
    setCadastroPacienteAgendaAberto(false)
    setPacienteCriadoAgenda(null)
  }, [clinicaAtivaId])

  useEffect(() => {
    if (tela !== 'agenda') setCadastroPacienteAgendaAberto(false)
  }, [tela])

  async function handleSignOut() {
    await supabase.auth.signOut()
    const marca = marcaDaRota() ?? resolveClinicBrand().brand
    navegarPara(`/acesso/${marca?.slug ?? 'brotas'}`, true)
    setEscolhaAcesso(null)
    setEscolhaAplicada(false)
    setAcessoValidado(false)
    setErroAcesso(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--fundo-pagina)]">
        <p className="text-sm text-[var(--texto-secundario)]">Carregando...</p>
      </div>
    )
  }

  if (recuperacao) return <RecuperarSenha retorno autorizado={recuperacaoAutorizada && !!session} onVoltar={() => {
    window.history.replaceState({}, document.title, window.location.pathname)
    setRecuperacao(false)
    setRecuperacaoAutorizada(false)
    setAcessoValidado(false)
  }} />

  if (session && conviteId && conviteValido) {
    return <ConviteEquipe conviteId={conviteId} session={session} onConcluido={() => {
      // O aceite mudou os vínculos no servidor. Uma nova montagem evita reutilizar
      // listas pré-aceite; replaceState + setters com valores iguais não navegavam.
      // A sessão é preservada e Login verifica novamente os vínculos autorizados.
      window.location.replace(window.location.pathname)
    }} />
  }

  if (!session || !acessoValidado || usuarioValidado !== session.user.id) {
    if (session && resolveClinicBrand().brand) {
      return <main className="flex min-h-screen items-center justify-center bg-[var(--fundo-pagina)] p-6">
        <section className="w-full max-w-lg" aria-live="polite">
          {erroAcesso ? <><FeedbackAlert variant="destructive" title="Não foi possível abrir a clínica" description={erroAcesso} />
            <button className="mt-4 mr-4 rounded-lg border p-3" onClick={() => { if (erroClinicas || erroPapel) window.location.reload(); else setTentativaAcesso(valor => valor + 1) }}>Tentar novamente</button>
            <button className="rounded-lg border p-3" onClick={() => void handleSignOut()}>Entrar com outra conta</button></>
            : <p role="status">{restaurandoAcesso ? 'Verificando acesso à clínica…' : 'Carregando acesso…'}</p>}
        </section>
      </main>
    }
    return <Login acessoAutomatico authenticatedUserId={session?.user.id} onBeginAuth={lembrar => { preferenciaNovoLogin.current = lembrar ?? null; setErroAcesso(null) }} onAccessGranted={escolha => { setEscolhaAplicada(false); setEscolhaAcesso(escolha) }} accessError={erroAcesso} />
  }

  // Troca de clínica/conta não pode exibir uma tela com o papel anterior.
  if (carregandoClinicas || carregandoPapel) return <main className="p-6" role="status">Verificando acesso à clínica…</main>
  if (erroClinicas || erroPapel || !papel) return <main className="p-6"><FeedbackAlert variant="destructive" title="Acesso indisponível" description="Não foi possível confirmar um acesso ativo. Recarregue para consultar novamente ou entre com outra conta." /><button onClick={() => void handleSignOut()}>Entrar com outra conta</button></main>
  if (!TELAS_POR_PAPEL[papel].includes(tela)) return <main className="p-6"><FeedbackAlert variant="destructive" title="Página não autorizada" description="Seu perfil não possui acesso a esta página." /><button onClick={() => setTela('dashboard')}>Ir ao início</button></main>

  return (
    <AppShell
      tela={tela}
      onNavegar={setTela}
      clinicaAtiva={clinicaAtiva}
      clinicasDoUsuario={clinicasDoUsuario}
      onSelecionarClinica={id => { if (id === clinicaAtivaId) return; solicitarMudanca(() => {
        setEntradaPainel(null)
        const clinica = clinicasDoUsuario.find(item => item.id === id)
        const marca = Object.values(CLINIC_BRANDS).find(item => clinica && clinicaCorrespondeAoBrand(clinica, item))
        if (!marca) return
        selecionarClinica(id)
        navegarPara(caminhoInterno(marca.slug, tela), true)
      }) }}
      identidade={identidade}
      conta={session.user.email ?? 'Identificação de login não informada'}
      papel={papel}
      onSair={() => solicitarMudanca(() => void handleSignOut())}
    >
      {tela === 'dashboard' && <Dashboard clinicaAtivaId={clinicaAtivaId} clinicaNome={clinicaAtiva?.nome ?? 'Clínica selecionada'} papel={papel}
        nomeUsuario={identidade.nome} usuarioId={session.user.id}
        onNovoPaciente={() => encaminharPainel('pacientes', { novoPaciente: true })}
        onNovoAgendamento={() => encaminharPainel('agenda', { novoAgendamento: true })}
        onAbrirPaciente={pacienteId => encaminharPainel('pacientes', { pacienteId })}
        onAgenda={() => setTela('agenda')} onPacientes={() => setTela('pacientes')} onFinanceiro={() => setTela('financeiro')} />}
      {tela === 'agenda' && (
        <>
          {entradaPainel?.clinicaId === clinicaAtivaId && entradaPainel.receberPagamento && <div className="mb-4"><FeedbackAlert variant="info" title="Receber pagamento pela Agenda"
            description={`Selecione o dia e o agendamento de ${clinicaAtiva?.nome ?? 'esta clínica'}. Nos detalhes, use Receber pagamento; o valor será consultado no cadastro autorizado.`}
            action={<button className="finance-button" onClick={() => setTela('financeiro')}>Voltar ao Caixa</button>} onClose={() => setEntradaPainel(null)} /></div>}
          <Agenda
            iniciarComNovoAgendamento={entradaPainel?.clinicaId === clinicaAtivaId && entradaPainel.novoAgendamento}
            clinicaAtiva={clinicaAtiva}
            carregandoClinica={carregandoClinica}
            usuarioId={session.user.id}
            pacienteCriadoExternamente={pacienteCriadoAgenda}
            cadastroPacienteAberto={cadastroPacienteAgendaAberto}
            onNovoPaciente={() => setCadastroPacienteAgendaAberto(true)}
            onAtendimentoIniciado={(atendimentoId) => {
              setAtendimentoParaAbrir(atendimentoId)
              setTela('prontuario')
            }}
          />
          {cadastroPacienteAgendaAberto && (
            <Pacientes
              clinicaAtivaId={clinicaAtivaId}
              carregandoClinica={carregandoClinica}
              papel={papel}
              carregandoPapel={carregandoPapel}
              usuarioId={session.user.id}
              iniciarComCadastroAberto
              onCancelarCadastro={() => setCadastroPacienteAgendaAberto(false)}
              onPacienteCriado={(paciente) => {
                setPacienteCriadoAgenda({ ...paciente, revisao: Date.now() })
                setCadastroPacienteAgendaAberto(false)
              }}
            />
          )}
        </>
      )}
      {tela === 'pacientes' && (
        <Pacientes
          key={clinicaAtivaId}
          iniciarComCadastroAberto={entradaPainel?.clinicaId === clinicaAtivaId && entradaPainel.novoPaciente}
          pacienteInicialId={entradaPainel?.clinicaId === clinicaAtivaId ? entradaPainel.pacienteId : undefined}
          clinicaAtivaId={clinicaAtivaId}
          clinicaNome={clinicaAtiva?.nome}
          carregandoClinica={carregandoClinica}
          papel={papel}
          carregandoPapel={carregandoPapel}
          usuarioId={session.user.id}
          onIrParaAgenda={() => setTela('agenda')}
        />
      )}
      {tela === 'equipe' && (
        <Cadastros
          clinicaAtivaId={clinicaAtivaId}
          carregandoClinica={carregandoClinica}
          usuarioId={session.user.id}
        />
      )}
      {tela === 'prontuario' && (
        <Prontuario
          clinicaAtivaId={clinicaAtivaId}
          carregandoClinica={carregandoClinica}
          usuarioId={session.user.id}
          atendimentoParaAbrirId={atendimentoParaAbrir}
          onAtendimentoParaAbrirConsumido={() => setAtendimentoParaAbrir(null)}
        />
      )}
      {tela === 'financeiro' && (
        <FinanceiroModulo key={`${session.user.id}:${clinicaAtivaId}:${papel}`} clinicaAtivaId={clinicaAtivaId} clinicaNome={clinicaAtiva?.nome} carregandoClinica={carregandoClinica}
          usuarioId={session.user.id} papel={papel} carregandoPapel={carregandoPapel}
          onReceberPagamento={() => { if (clinicaAtivaId) setTela('agenda', { clinicaId: clinicaAtivaId, receberPagamento: true }) }} />
      )}
      {tela === 'sobre' && <SobreSistema clinicaAtiva={clinicaAtiva} />}
      {tela === 'configuracoes' && clinicaAtivaId && (CONFIGURACOES_INTERFACE_DISPONIVEL ? <Configuracoes key={`${session.user.id}:${clinicaAtivaId}`} clinicaId={clinicaAtivaId} clinicaNome={clinicaAtiva?.nome ?? 'Clínica selecionada'} papel={papel} onGuarda={registrarGuarda} onEquipe={() => setTela('equipe')} /> : <FeedbackAlert variant="warning" title="Configurações em preparação" description="Este recurso aguarda validação. A edição não está disponível nesta versão." />)}
      <ConfirmacaoDialog open={!!transicaoPendente} onOpenChange={o => { if (!o && !salvandoTransicao) setTransicaoPendente(null) }} tone="warning" title="Alterações de Configurações não salvas" description="Salve o rascunho, descarte as alterações ou continue editando antes de sair ou trocar a clínica." confirmLabel="Descartar e continuar" cancelLabel="Continuar editando" disabled={salvandoTransicao || !!guardaConfiguracoes.current?.ocupado} onConfirm={() => { const acao = transicaoPendente; guardaConfiguracoes.current = null; setTransicaoPendente(null); acao?.() }}>
        <button className="cfg-botao" disabled={salvandoTransicao || !!guardaConfiguracoes.current?.ocupado} onClick={() => { setSalvandoTransicao(true); void guardaConfiguracoes.current?.salvar().then(ok => { if (ok) { const acao = transicaoPendente; guardaConfiguracoes.current = null; setTransicaoPendente(null); acao?.() } }).finally(() => setSalvandoTransicao(false)) }}>Salvar rascunho e continuar</button>
      </ConfirmacaoDialog>
      {tela !== 'dashboard' &&
        tela !== 'agenda' &&
        tela !== 'pacientes' &&
        tela !== 'equipe' &&
        tela !== 'prontuario' &&
        tela !== 'financeiro' &&
        tela !== 'configuracoes' &&
        tela !== 'sobre' && <PlaceholderScreen titulo={TITULOS_TELA[tela]} />}
    </AppShell>
  )
}

export default function AppProtegido() { return <GuardaAtivacao><App /></GuardaAtivacao> }

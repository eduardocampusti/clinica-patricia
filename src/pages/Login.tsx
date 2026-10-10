import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Papel } from '../hooks/usePapelNaClinica'
import { rotuloPapel } from '../lib/papelApresentacao'
import { carregarAcessosClinicas, type AcessoClinica } from '../lib/clinicAccess'
import { clinicaCorrespondeAoBrand, resolveClinicBrand } from '../config/clinicBrands'
import { FeedbackAlert } from '../components/feedback/FeedbackAlert'
import './login.css'
import RecuperarSenha from './RecuperarSenha'
import { caminhoInterno, navegarPara } from '../lib/appRoute'
import { consultarMarcaPublica, type MarcaPublica } from '../lib/configuracoes'

function Icon({ children }: { children: ReactNode }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}
const shield = <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>
const perfis: { valor: Papel | 'laboratorio'; rotulo: string }[] = [
  { valor: 'medico', rotulo: 'Médico / Clínico' },
  { valor: 'recepcao', rotulo: 'Recepção' },
  { valor: 'proprietaria', rotulo: rotuloPapel('proprietaria') },
  { valor: 'laboratorio', rotulo: 'Laboratório' },
]
type EscolhaAcesso = { clinicaId: string; papel: Papel; lembrar: boolean }
type LoginProps = {
  acessoAutomatico?: boolean
  authenticatedUserId?: string
  onBeginAuth?: (lembrar?: boolean) => void
  onAccessGranted?: (escolha: EscolhaAcesso) => void
  accessError?: string | null
}

export default function Login({ acessoAutomatico = false, authenticatedUserId, onBeginAuth, onAccessGranted, accessError }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [perfil, setPerfil] = useState<Papel | 'laboratorio'>('medico')
  const [unidadeId, setUnidadeId] = useState('')
  const [vinculos, setVinculos] = useState<AcessoClinica[]>([])
  const [etapa, setEtapa] = useState<'credenciais' | 'sessao'>('credenciais')
  const [lembrar, setLembrar] = useState(true)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [recuperar, setRecuperar] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const usuarioCarregado = useRef<string | null>(null)
  const brandResolution = useMemo(() => resolveClinicBrand(), [])
  const brand = brandResolution.brand
  const [marcaPublica,setMarcaPublica]=useState<MarcaPublica|null>(null)
  const [logoFalhou,setLogoFalhou]=useState(false)
  const [imagemFalhou,setImagemFalhou]=useState(false)
  useEffect(()=>{let vivo=true;if(brand)void consultarMarcaPublica(brand.hostname??'').then(m=>{if(vivo)setMarcaPublica(m)}).catch(()=>{});return()=>{vivo=false}},[brand])
  const logo=logoFalhou?undefined:marcaPublica?marcaPublica.logo||undefined:brand?.logoSrc
  const imagem=imagemFalhou?undefined:marcaPublica?marcaPublica.imagem||undefined:brand?.imagemLogin
  useEffect(()=>{setLogoFalhou(false);setImagemFalhou(false)},[marcaPublica])
  useEffect(()=>{if(!marcaPublica?.favicon)return;const link=document.createElement('link');link.rel='icon';link.href=marcaPublica.favicon;document.head.append(link);return()=>link.remove()},[marcaPublica])
  const acessoConfirmado = vinculos[0] ?? null
  const nomeMarca = brand?.nome ?? 'Domínio não configurado'
  const estilosMarca = brand ? {
    '--login-primary': marcaPublica?.cor || brand.cores.primaria,
    '--login-primary-hover': marcaPublica?.cor || brand.cores.primariaHover,
    '--login-soft': brand.cores.destaqueSuave,
    '--login-visual': brand.cores.visual,
  } as CSSProperties : undefined

  async function prepararAcessos(usuarioId: string) {
    if (!brand) return
    if (usuarioCarregado.current === usuarioId) return
    usuarioCarregado.current = usuarioId
    setLoading(true)
    setError(null)
    try {
      const acessos = await carregarAcessosClinicas(usuarioId)
      if (!acessos.length) throw new Error('Nenhum vínculo disponível')

      const acessoDoDominio = acessos.find(acesso => clinicaCorrespondeAoBrand({ id: acesso.clinicaId, nome: acesso.nome, subdomain: acesso.subdomain }, brand))
      if (!acessoDoDominio) {
        usuarioCarregado.current = null
        await supabase.auth.signOut()
        setError(`Sua conta não possui vínculo ativo com ${brand.nome}. O domínio identifica a clínica, mas não concede permissão.`)
        return
      }
      setPerfil(acessoDoDominio.papel)
      setVinculos([acessoDoDominio])
      setUnidadeId(acessoDoDominio.clinicaId)
      setPassword('')
      setEtapa('sessao')
    } catch {
      usuarioCarregado.current = null
      await supabase.auth.signOut()
      setError('Não foi possível confirmar suas unidades de acesso. Tente novamente ou procure a administração.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accessError) return
    usuarioCarregado.current = null
    setEtapa('credenciais')
    setVinculos([])
    setUnidadeId('')
    setPassword('')
    setLoading(false)
  }, [accessError])

  useEffect(() => {
    if (!acessoAutomatico && authenticatedUserId && brand) void prepararAcessos(authenticatedUserId)
  // O ref impede consultas duplicadas no StrictMode; a resolução de marca é imutável nesta montagem.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedUserId, acessoAutomatico])

  useEffect(() => {
    document.title = `${nomeMarca} — Acesso`
  }, [nomeMarca])

  useEffect(() => {
    if (brandResolution.redirectTo && window.location.pathname !== brandResolution.redirectTo) {
      window.location.replace(brandResolution.redirectTo)
    }
  }, [brandResolution.redirectTo])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    if (etapa === 'sessao') {
      if (!acessoConfirmado || acessoConfirmado.clinicaId !== unidadeId || perfil === 'laboratorio') {
        setError('Não foi possível confirmar o vínculo ativo com esta clínica. Entre com outra conta ou procure a administração.')
        return
      }
      setError(null)
      setLoading(true)
      onAccessGranted?.({ clinicaId: acessoConfirmado.clinicaId, papel: acessoConfirmado.papel, lembrar })
      return
    }
    submitting.current = true
    setError(null)
    setLoading(true)
    onBeginAuth?.(lembrar)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) {
        setError(authError.status === 429 ? 'Muitas tentativas. Aguarde um momento antes de tentar novamente.' : authError.status === 400 || authError.status === 401 || authError.status === 422 ? 'E-mail ou senha inválidos. Confira seus dados e tente novamente.' : 'Não foi possível acessar o sistema. Verifique sua conexão e tente novamente.')
      } else if (data.user) {
        // A guarda pode desmontar Login durante SIGNED_IN. Fixar o destino do
        // novo login aqui não concede acesso: ativação e vínculos seguem obrigatórios.
        if (acessoAutomatico && brand) navegarPara(caminhoInterno(brand.slug, 'dashboard'), true)
        if (!acessoAutomatico) await prepararAcessos(data.user.id)
      } else {
        setError('Não foi possível confirmar a autenticação. Tente novamente.')
      }
    } catch {
      await supabase.auth.signOut()
      setError('Não foi possível confirmar suas unidades de acesso. Tente novamente ou procure a administração.')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  async function trocarConta() {
    await supabase.auth.signOut()
    usuarioCarregado.current = null
    setEtapa('credenciais')
    setVinculos([])
    setUnidadeId('')
    setPassword('')
    setError(null)
    setLoading(false)
  }

  if (recuperar && brand) return <RecuperarSenha onVoltar={() => setRecuperar(false)} />

  if (!brand) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white" data-clinic-brand="invalid" data-brand-source={brandResolution.origem}>
      <section className="max-w-xl text-center" aria-labelledby="invalid-domain-title">
        <h1 id="invalid-domain-title" className="text-2xl font-semibold">Domínio não configurado</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Este endereço não está autorizado para acessar o portal da clínica. Verifique o domínio informado ou procure a administração.</p>
      </section>
    </main>
  }

  return <main className="login-page" data-clinic-brand={brand.slug} data-brand-source={brandResolution.origem} data-active-profile={perfil} data-composicao-desktop={marcaPublica?.desktop} data-composicao-mobile={marcaPublica?.mobile} style={estilosMarca}>
    <section className="login-access" aria-labelledby="login-title">
      <header className="login-brand-row">
        <a className="login-brand" href={`/acesso/${brand.slug}`} aria-label={`${nomeMarca} — início`}>
          {logo ? <img className="login-brand-logo" src={logo} alt="" onError={()=>setLogoFalhou(true)} /> : <span className="login-brand-symbol"><Icon><path d="M12 4v16M5 11h14M6 16c0 5 12 5 12 0" /><circle cx="17" cy="6" r="2" /></Icon></span>}
          <span><strong>{nomeMarca}</strong><small>{brand.textos.descricaoMarca}</small></span>
        </a>
        <span className="login-brand-description">Prontuário &amp;<br />gestão clínica</span>
        <span className="login-access-badge"><Icon>{shield}</Icon>Acesso profissional</span>
      </header>

      <div className="login-content">
        <h1 id="login-title">{marcaPublica?.mensagem || brand.titulo}</h1>
        <p className="login-intro">{brand.subtitulo}</p>
        <form onSubmit={handleSubmit} className="login-form" aria-busy={loading}>
          {etapa === 'credenciais' && <fieldset className="login-role-fieldset" disabled={loading}>
            <legend>Perfil de Acesso</legend>
            <div className="login-role-options">
              {perfis.map(opcao => <label key={opcao.valor} className="login-role-option" data-role={opcao.valor}>
                <input type="radio" name="perfil" value={opcao.valor} checked={perfil === opcao.valor} onChange={() => { setPerfil(opcao.valor); setUnidadeId(''); setError(null) }} />
                <span>{opcao.rotulo}</span>
              </label>)}
            </div>
            <p className="login-field-hint">O perfil será conferido com suas permissões após a autenticação.</p>
          </fieldset>}
          {etapa === 'credenciais' && <div className="login-field">
            <label htmlFor="email">E-mail institucional ou CRM / Identificador</label>
            <div className="login-input-wrap"><Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></Icon><input id="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={e => setEmail(e.target.value)} disabled={loading} placeholder="seuemail@exemplo.com" aria-describedby={error || accessError ? 'login-error' : 'login-identifier-hint'} /></div>
            <p id="login-identifier-hint" className="login-field-hint">Neste sistema, a entrada utiliza o e-mail cadastrado.</p>
          </div>}
          {etapa === 'credenciais' && <div className="login-field">
            <div className="login-label-row"><label htmlFor="password">Senha de Acesso</label><a href="#recuperar-acesso" onClick={event => { event.preventDefault(); setRecuperar(true) }}>Esqueci minha senha</a></div>
            <div className="login-input-wrap"><Icon><circle cx="7" cy="12" r="4" /><path d="M11 12h10m-3 0v3m-3-3v2" /></Icon><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={loading} placeholder="Digite sua senha" aria-describedby={error || accessError ? 'login-error' : undefined} /><button className="login-password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} disabled={loading}><Icon><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</Icon></button></div>
          </div>}
          {etapa === 'credenciais' && <div className="login-context" aria-label={`Clínica de entrada: ${brand.nome}`}>
            <Icon><path d="M4 21V5l8-2 8 2v16M2 21h20M9 8h1m-1 4h1m4-4h1m-1 4h1m-5 4h6" /></Icon>
            <p><strong>Clínica de entrada</strong><span>{brand.nome}. O vínculo e o papel serão confirmados após autenticar.</span></p>
          </div>}
          {etapa === 'sessao' && acessoConfirmado && <section className="login-active-session" aria-labelledby="login-active-session-title">
            <span className="login-active-session-icon"><Icon>{shield}</Icon></span>
            <div><h2 id="login-active-session-title">Sessão ativa</h2><p>Acesso confirmado para {brand.nome} como {rotuloPapel(acessoConfirmado.papel)}.</p></div>
          </section>}
          <div className="login-options-row"><label className="login-remember"><input type="checkbox" checked={lembrar} onChange={event => setLembrar(event.target.checked)} disabled={loading} /><span>Lembrar meu acesso neste dispositivo seguro</span></label><a href="#ajuda-acesso" onClick={() => setAjudaAberta(true)}>Ajuda no Acesso</a></div>
          <p className="login-field-hint login-remember-hint">Guarda apenas a unidade escolhida neste navegador; nunca o e-mail ou a senha.</p>
          <details id="ajuda-acesso" className="login-help" open={ajudaAberta} onToggle={event => setAjudaAberta(event.currentTarget.open)}><summary>Orientações para acesso</summary><p>Use “Esqueci minha senha” para recuperar sua conta. Se ainda não possui acesso à unidade, procure a administração. Não compartilhe sua senha.</p></details>
          {(error || accessError) && <div id="login-error"><FeedbackAlert variant="destructive" title="Não foi possível entrar" description={error || accessError} urgent /></div>}
          <button className="login-submit" type="submit" disabled={loading} aria-live="polite"><span>{loading ? 'Validando acesso…' : etapa === 'sessao' ? `Continuar na ${brand.nome}` : 'Acessar Sistema Integrado'}</span><Icon><path d="M14 4h6v16h-6M3 12h12m-4-4 4 4-4 4" /></Icon></button>
          {etapa === 'sessao' && <button type="button" className="login-switch-account" onClick={() => void trocarConta()}>Entrar com outra conta</button>}
          <p className="login-certificate">Acessar com Certificado Digital <span>Indisponível neste sistema</span></p>
        </form>
        <div className="login-notice"><Icon>{shield}</Icon><p><strong>Acesso restrito.</strong> {brand.textos.avisoAcesso} Proteja os dados dos pacientes e encerre sua sessão ao utilizar um dispositivo compartilhado.</p></div>
      </div>
      <footer className="login-footer"><span>{brand.textos.rodape}</span><span>Suporte: administração da clínica</span></footer>
    </section>

    <aside className="login-visual" aria-label="Cuidado e gestão clínica">
      {imagem && <img className="login-photo" src={imagem} alt="" fetchPriority="high" onError={()=>setImagemFalhou(true)} style={marcaPublica?{objectPosition:`${marcaPublica.focoX}% ${marcaPublica.focoY}%`}:undefined} />}
      <div className="login-photo-shade" />
      <div className="login-visual-top"><span><Icon>{shield}</Icon>Ambiente de acesso profissional</span><span>{nomeMarca}</span></div>
      <div className="login-visual-bottom">
        <div className="login-features">
          <article><span className="login-feature-icon"><Icon><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h5M8 15h3" /><circle cx="16" cy="16" r="2" /></Icon></span><h2>Informação &amp;<br />continuidade do cuidado</h2><p>Prontuários e histórico de atendimentos para apoiar a rotina dos profissionais.</p></article>
          <article><span className="login-feature-icon login-feature-green"><Icon><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18M7 15h3m4 0h3" /></Icon></span><h2>Gestão<br />em um só lugar</h2><p>Agenda, pacientes e financeiro conectados à operação da sua clínica.</p></article>
        </div>
        <div className="login-message"><span aria-hidden="true">“</span><p>Cuidar de pessoas começa com atenção em cada detalhe.<small>Tecnologia a serviço de um atendimento mais humano.</small></p></div>
      </div>
    </aside>
  </main>
}

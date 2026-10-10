import { useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { resolveClinicBrand } from '../config/clinicBrands'
import { FeedbackAlert } from '../components/feedback/FeedbackAlert'
import { passwordProblem, recoveryReturnUrl } from '../lib/passwordRecovery'

export default function RecuperarSenha({ retorno = false, autorizado = false, onVoltar }: {
  retorno?: boolean; autorizado?: boolean; onVoltar: () => void
}) {
  const brand = resolveClinicBrand().brand
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [concluido, setConcluido] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const enviando = useRef(false)
  const senhaRef = useRef<HTMLInputElement>(null)
  const confirmacaoRef = useRef<HTMLInputElement>(null)
  async function enviar(event: FormEvent) {
    event.preventDefault()
    if (enviando.current || !brand || (retorno && !autorizado)) return
    setErro(null)
    if (retorno) {
      const problema = passwordProblem(senha, confirmacao)
      if (problema) {
        setErro(problema)
        ;(senha.length < 8 ? senhaRef : confirmacaoRef).current?.focus()
        return
      }
    }
    enviando.current = true
    setOcupado(true)
    try {
      if (retorno) {
        const { data, error } = await supabase.auth.updateUser({ password: senha })
        if (error || !data.user) {
          setErro('Não foi possível alterar a senha. O link pode ter expirado ou a senha não atende aos requisitos. Solicite outro link se necessário.')
          return
        }
        setSenha(''); setConfirmacao(''); setConcluido(true)
        await supabase.auth.signOut({ scope: 'local' })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: recoveryReturnUrl(window.location.origin, brand.slug) })
        if (error && (error.status === 429 || !error.status || error.status >= 500)) {
          setErro('Não foi possível solicitar o envio agora. Aguarde um momento e tente novamente.')
          return
        }
        // Não revela a existência ou elegibilidade do endereço.
        setConcluido(true)
      }
    } catch { setErro('Não foi possível concluir agora. Verifique sua conexão e tente novamente.') }
    finally { enviando.current = false; setOcupado(false) }
  }
  if (!brand) return <main><h1>Domínio não configurado</h1></main>
  const invalido = retorno && !autorizado && !concluido
  const campo = 'mt-2 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 text-[var(--texto-principal)]'
  return <main className="flex min-h-screen items-center justify-center bg-[var(--fundo-pagina)] px-4 py-8 text-[var(--texto-principal)]">
    <section className="w-full max-w-lg rounded-xl bg-[var(--fundo-card)] p-6" aria-labelledby="recuperacao-titulo">
      <p className="mb-3 font-semibold">{brand.nome}</p>
      <h1 id="recuperacao-titulo" className="text-2xl font-semibold">{retorno ? 'Definir nova senha' : 'Recuperar acesso'}</h1>
      <p className="my-4 text-sm text-[var(--texto-secundario)]">A recuperação altera somente a senha da conta. Suas unidades e permissões permanecem as mesmas.</p>
      {invalido && <FeedbackAlert variant="destructive" title="Link inválido ou expirado" description="Solicite um novo link em Esqueci minha senha e abra a mensagem mais recente." />}
      {concluido && <FeedbackAlert variant="success" title={retorno ? 'Senha alterada' : 'Solicitação registrada'} description={retorno ? 'Sua nova senha foi salva. Volte ao login para entrar novamente.' : 'Se o e-mail estiver cadastrado e puder receber a recuperação, você receberá as instruções. Confira também a pasta de spam.'} />}
      {!concluido && !invalido && <form onSubmit={enviar} className="mt-5 space-y-4" aria-busy={ocupado}>
        {!retorno ? <label className="block">E-mail de acesso<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={ocupado} className={campo} /></label> : <>
          <label className="block">Nova senha<input ref={senhaRef} type="password" autoComplete="new-password" required minLength={8} value={senha} onChange={e => setSenha(e.target.value)} disabled={ocupado} aria-describedby={erro ? 'recuperacao-erro' : 'senha-orientacao'} className={campo} /></label>
          <p id="senha-orientacao" className="text-sm">Use pelo menos 8 caracteres.</p>
          <label className="block">Confirmar nova senha<input ref={confirmacaoRef} type="password" autoComplete="new-password" required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} disabled={ocupado} aria-describedby={erro ? 'recuperacao-erro' : undefined} className={campo} /></label>
        </>}
        {erro && <div id="recuperacao-erro"><FeedbackAlert variant="destructive" title="Não foi possível concluir" description={erro} urgent /></div>}
        <button type="submit" disabled={ocupado} className="min-h-11 w-full rounded-lg bg-[var(--cor-primaria)] px-4 font-semibold text-white disabled:opacity-50">{ocupado ? 'Aguarde…' : retorno ? 'Salvar nova senha' : 'Enviar instruções'}</button>
      </form>}
      <button type="button" onClick={onVoltar} disabled={ocupado} className="mt-4 min-h-11 w-full rounded-lg border border-[var(--borda)] px-4">Voltar ao login</button>
    </section>
  </main>
}

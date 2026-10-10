import { useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { concluirAtivacao } from '../lib/acessoDireto'
import { validarSenhaPessoal } from '../lib/acessoDiretoModelo'
import { FeedbackAlert } from '../components/feedback/FeedbackAlert'
export default function DefinirSenhaPessoal({ email, onSair, onConcluido }: { email: string; onSair: () => Promise<void>; onConcluido: () => void }) {
  const [senha, setSenha] = useState(''), [confirmacao, setConfirmacao] = useState('')
  const [mostrar, setMostrar] = useState(false), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState<string | null>(null)
  const enviando = useRef(false)
  async function salvar(e: FormEvent) {
    e.preventDefault(); if (enviando.current) return
    const falha = validarSenhaPessoal(senha, confirmacao); if (falha) { setErro(falha); return }
    enviando.current = true; setOcupado(true); setErro(null)
    try {
      await concluirAtivacao(senha)
      // A sessão temporária permanece proibida no banco. Exigir sessão nova.
      await supabase.auth.signOut({ scope: 'local' })
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      setSenha(''); setConfirmacao('')
      if (error) { setErro('Sua senha foi definida, mas não foi possível iniciar a nova sessão. Saia e entre com sua senha pessoal.'); return }
      onConcluido()
    } catch (e) { setErro(e instanceof Error ? e.message : 'A troca não foi confirmada. Consulte a administração antes de repetir.') }
    finally { enviando.current = false; setOcupado(false) }
  }
  const campo = 'mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3'
  return <main className="flex min-h-screen items-center justify-center bg-[var(--fundo-pagina)] p-4 text-[var(--texto-principal)] sm:p-8"><section className="w-full max-w-lg space-y-6">
    <div><h1 className="text-2xl font-semibold">Defina sua senha pessoal</h1><p className="mt-2 break-words text-sm text-[var(--texto-secundario)]">Antes de entrar no Sistema Multiclínicas, substitua a senha temporária por uma senha que só você conhece.</p></div>
    {erro && <FeedbackAlert variant="destructive" title="Confira a troca de senha" description={erro} urgent />}
    <form onSubmit={e => void salvar(e)} className="space-y-4" aria-busy={ocupado}><fieldset disabled={ocupado} className="space-y-4">
      <p id="senha-pessoal-requisitos" className="text-sm text-[var(--texto-secundario)]">Use de 12 a 128 caracteres, com maiúscula, minúscula, número e símbolo. A senha deve ser diferente da temporária.</p>
      <div><label htmlFor="senha-pessoal">Nova senha</label><input className={campo} id="senha-pessoal" type={mostrar ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="senha-pessoal-requisitos" value={senha} onChange={e => setSenha(e.target.value)} /></div>
      <div><label htmlFor="senha-pessoal-confirmar">Confirmar nova senha</label><input className={campo} id="senha-pessoal-confirmar" type={mostrar ? 'text' : 'password'} autoComplete="new-password" required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} /></div>
      <button type="button" className="min-h-11 underline" aria-pressed={mostrar} onClick={() => setMostrar(v => !v)}>{mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}</button>
      <div className="flex flex-col gap-3 sm:flex-row"><button type="submit" className="min-h-11 rounded-lg bg-[var(--cor-primaria)] px-4 font-semibold text-[var(--texto-sobre-primaria)]">{ocupado ? 'Confirmando…' : 'Salvar e continuar'}</button><button type="button" className="min-h-11 rounded-lg border border-[var(--borda)] px-4" onClick={() => { setSenha(''); setConfirmacao(''); void onSair() }}>Sair</button></div>
    </fieldset></form>
  </section></main>
}

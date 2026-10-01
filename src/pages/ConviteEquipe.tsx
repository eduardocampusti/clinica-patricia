import { useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import type { Session } from '@supabase/supabase-js'
import { FeedbackAlert } from '../components/feedback/FeedbackAlert'
import { aceitarAcessoEquipe } from '../lib/equipeAcessos'
import { supabase } from '../lib/supabase'

interface ConviteEquipeProps {
  conviteId: string
  session: Session
  onConcluido: () => void
}

export default function ConviteEquipe({ conviteId, session, onConcluido }: ConviteEquipeProps) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [abrindo, setAbrindo] = useState(false)

  async function concluir(event: FormEvent) {
    event.preventDefault()
    if (salvando) return
    if (senha || confirmacao) {
      if (senha.length < 8) {
        setErro('A senha precisa ter pelo menos 8 caracteres.')
        return
      }
      if (senha !== confirmacao) {
        setErro('A confirmação da senha não confere.')
        return
      }
    }
    setSalvando(true)
    setErro(null)
    if (senha) {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) {
        setSalvando(false)
        setErro('Não foi possível definir a senha agora. Tente novamente pelo link recebido.')
        return
      }
    }
    const { error } = await aceitarAcessoEquipe(conviteId)
    setSalvando(false)
    if (error) {
      setErro(error.mensagem)
      return
    }
    setSucesso(true)
  }

  if (sucesso) {
    return <main className="flex min-h-screen items-center justify-center bg-[var(--fundo-pagina)] px-4 py-8 text-[var(--texto-principal)]"><section className="w-full max-w-lg rounded-2xl bg-[var(--fundo-card)] p-6 shadow-[var(--sombra-baixa)]" aria-labelledby="convite-sucesso"><FeedbackAlert variant="success" title="Acesso confirmado" description="Seu vínculo com a equipe foi confirmado. Você poderá escolher uma clínica autorizada e entrar no sistema." /><button type="button" disabled={abrindo} aria-busy={abrindo} onClick={() => { if (abrindo) return; flushSync(() => setAbrindo(true)); onConcluido() }} className="mt-4 min-h-11 w-full rounded-lg bg-[var(--cor-primaria)] px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-70">{abrindo ? 'Abrindo sistema…' : 'Continuar para o sistema'}</button></section></main>
  }

  return <main className="flex min-h-screen items-center justify-center bg-[var(--fundo-pagina)] px-4 py-8 text-[var(--texto-principal)]"><section className="w-full max-w-lg rounded-2xl bg-[var(--fundo-card)] p-6 shadow-[var(--sombra-baixa)]" aria-labelledby="convite-titulo"><h1 id="convite-titulo" className="text-xl font-semibold">Confirmar acesso à equipe</h1><p className="mt-2 text-sm text-[var(--texto-secundario)]">Sessão confirmada para <strong>{session.user.email ?? 'esta conta'}</strong>. Confirme o vínculo para liberar somente as clínicas e o papel autorizados pela administradora.</p>{erro && <div className="mt-4"><FeedbackAlert variant="destructive" title="Não foi possível confirmar" description={erro} urgent /></div>}<form onSubmit={concluir} className="mt-5 space-y-4"><div><label htmlFor="convite-senha" className="text-sm font-medium">Nova senha (opcional para conta já existente)<input id="convite-senha" type="password" value={senha} onChange={(event) => setSenha(event.target.value)} autoComplete="new-password" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></label><p className="mt-1 text-xs text-[var(--texto-secundario)]">Se esta é uma conta nova, defina uma senha com pelo menos 8 caracteres.</p></div><label htmlFor="convite-confirmacao" className="text-sm font-medium">Confirmar senha<input id="convite-confirmacao" type="password" value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)} autoComplete="new-password" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3" /></label><button type="submit" disabled={salvando} aria-busy={salvando} className="min-h-11 w-full rounded-lg bg-[var(--cor-primaria)] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{salvando ? 'Confirmando…' : 'Confirmar acesso'}</button></form></section></main>
}

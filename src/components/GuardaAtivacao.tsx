import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { consultarAtivacao, type EstadoAtivacao } from '../lib/acessoDireto'
import { ACESSO_DIRETO_HABILITADO } from '../config/acessoDireto'
import { FeedbackAlert } from './feedback/FeedbackAlert'
import DefinirSenhaPessoal from '../pages/DefinirSenhaPessoal'
import { marcaDaRota, navegarPara } from '../lib/appRoute'
import { resolveClinicBrand } from '../config/clinicBrands'
import { ContextoAtivacao } from '../lib/contextoAtivacao'

function GuardaAtiva({ children }: { children: ReactNode }) {
  const [recuperacaoAutorizada, setRecuperacaoAutorizada] = useState(false)
  const [resultado, setResultado] = useState<{ token: string | null; estado: EstadoAtivacao } | null>(null)
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null), [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    let vivo = true
    void supabase.auth.getSession().then(({ data, error }) => { if (vivo) { if (error) setErro('Não foi possível restaurar a sessão.'); else setSessao(data.session) } }).catch(() => { if (vivo) setErro('Não foi possível restaurar a sessão.') })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, s) => { if (vivo) { if (evento === 'PASSWORD_RECOVERY') setRecuperacaoAutorizada(true); else if (evento === 'SIGNED_OUT' || evento === 'SIGNED_IN') setRecuperacaoAutorizada(false); setSessao(s); setErro(null) } })
    return () => { vivo = false; subscription.unsubscribe() }
  }, [])
  const token = sessao?.access_token
  useEffect(() => {
    if (sessao === undefined) return
    let vivo = true; setErro(null); setResultado(null)
    if (!sessao) { setResultado({ token: null, estado: { estado: 'normal' } }); return }
    void consultarAtivacao().then(estado => { if (vivo) setResultado({ token: token!, estado }) }).catch(e => { if (vivo) setErro(e instanceof Error ? e.message : 'Ativação indisponível.') })
    return () => { vivo = false }
  }, [sessao, token, tentativa])
  async function sair() { await supabase.auth.signOut({ scope: 'local' }); const marca = marcaDaRota() ?? resolveClinicBrand().brand; navegarPara(`/acesso/${marca?.slug ?? 'brotas'}`, true) }
  if (erro) return <main className="min-h-screen bg-[var(--fundo-pagina)] p-6 text-[var(--texto-principal)]"><FeedbackAlert variant="destructive" title="Ativação não verificada" description={erro} /><button className="m-3 min-h-11 underline" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button><button className="min-h-11 underline" onClick={() => void sair()}>Sair</button></main>
  if (!resultado || resultado.token !== (token ?? null)) return <main className="min-h-screen bg-[var(--fundo-pagina)] p-6 text-[var(--texto-principal)]" role="status">Verificando ativação da conta…</main>
  if (resultado.estado.estado === 'pendente' && sessao) return <DefinirSenhaPessoal email={sessao.user.email ?? ''} onSair={sair} onConcluido={() => { const marca = marcaDaRota() ?? resolveClinicBrand().brand; navegarPara(`/acesso/${marca?.slug ?? 'brotas'}`, true); window.location.reload() }} />
  if (resultado.estado.estado !== 'normal') return <main className="min-h-screen bg-[var(--fundo-pagina)] p-6 text-[var(--texto-principal)]"><FeedbackAlert variant="warning" title={resultado.estado.estado === 'expirada' ? 'Senha temporária expirada' : 'Entre novamente'} description={resultado.estado.estado === 'expirada' ? 'Solicite à administração uma nova credencial temporária. Nenhum módulo está disponível nesta sessão.' : 'Esta sessão foi aberta antes da troca ou substituição da senha. Saia e entre com a credencial atual.'} /><button className="mt-4 min-h-11 rounded-lg border border-[var(--borda)] px-4" onClick={() => void sair()}>Sair</button></main>
  return <ContextoAtivacao.Provider value={{ recuperacaoAutorizada }}>{children}</ContextoAtivacao.Provider>
}
export function GuardaAtivacao({ children }: { children: ReactNode }) {
  // Enquanto o backend não foi aplicado, nenhum acesso direto pode ser criado.
  // Preserva contas existentes sem inventar uma verificação remota.
  return ACESSO_DIRETO_HABILITADO ? <GuardaAtiva>{children}</GuardaAtiva> : children
}

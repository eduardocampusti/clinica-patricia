import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setError('E-mail ou senha inválidos.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ===== LADO ESQUERDO — desktop only ===== */}
      <div
        className="hidden w-1/2 lg:flex lg:flex-col lg:justify-between"
        style={{ backgroundColor: 'var(--cor-menu)', padding: '32px' }}
      >
        {/* Topo */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white">
            Clínica Patrícia
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Clínica Brotas
          </span>
        </div>

        {/* Centro — slogan + ilustrações */}
        <div className="flex flex-1 flex-col justify-center">
          <h2
            className="mb-4 text-4xl font-bold leading-tight text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            Cuidado conectado.
            <br />
            Gestão inteligente.
          </h2>
          <p className="max-w-md text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Uma experiência integrada para cuidar de pacientes,
            atendimentos e da gestão da clínica.
          </p>

          <div className="relative mt-10 h-72">
            {/* Card 1 — topo direita */}
            <div
              className="absolute right-4 top-0 w-64 rounded-xl p-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                transform: 'rotate(-3deg)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 9h18M8 3v4M16 3v4" />
                  </svg>
                </div>
                <div className="h-2 w-24 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <div className="h-2 w-3/4 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              </div>
            </div>

            {/* Card 2 — centro */}
            <div
              className="absolute left-8 top-24 w-56 rounded-xl p-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
                    <circle cx="9" cy="8" r="3.2" />
                    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  </svg>
                </div>
                <div className="h-2 w-20 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <div className="ml-auto h-5 w-5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <div className="h-2 w-2/3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              </div>
            </div>

            {/* Card 3 — embaixo direita */}
            <div
              className="absolute bottom-0 right-12 w-60 rounded-xl p-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                transform: 'rotate(2deg)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7.5v1.2M12 15.5v1.3" />
                  </svg>
                </div>
                <div className="h-2 w-16 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div className="flex gap-2">
                <div className="h-16 w-1/3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <div className="h-16 w-1/3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                <div className="h-16 w-1/3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Gestão Clínica Inteligente © {new Date().getFullYear()}
        </p>
      </div>

      {/* ===== LADO DIREITO — formulário ===== */}
      <div className="flex min-h-screen w-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-[var(--cor-primaria-suave)] to-[var(--fundo-pagina)] lg:w-1/2 lg:bg-none lg:bg-[var(--fundo-pagina)]">
        <div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:px-8">
          <div className="w-full max-w-[420px]">
            {/* Logo mobile only */}
            <div className="mb-10 flex items-center justify-center gap-2.5 lg:hidden">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--cor-primaria)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 9h18M8 3v4M16 3v4" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[var(--texto-principal)]">
                Clínica Patrícia
              </span>
            </div>

            {/* Título */}
            <div className="mb-8">
              <h1
                className="text-3xl font-semibold text-[var(--texto-principal)]"
                style={{ letterSpacing: '-0.02em' }}
              >
                Bem-vindo
              </h1>
              <p className="mt-2 text-base text-[var(--texto-secundario)]">
                Entre na sua conta para acessar a Clínica Brotas.
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="texto-label-tecnico mb-1.5 block text-[var(--texto-secundario)]"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="seuemail@exemplo.com"
                  className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3.5 py-2.5 text-[var(--texto-principal)] outline-none transition placeholder:text-[var(--texto-terciario)] focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="texto-label-tecnico mb-1.5 block text-[var(--texto-secundario)]"
                >
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3.5 py-2.5 text-[var(--texto-principal)] outline-none transition placeholder:text-[var(--texto-terciario)] focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--texto-secundario)]">
                  <input
                    type="checkbox"
                    disabled
                    className="h-4 w-4 rounded border-[var(--borda)] text-[var(--cor-primaria)] focus:ring-[var(--cor-primaria-suave)]"
                  />
                  Lembrar meu acesso
                </label>
                <button
                  type="button"
                  disabled
                  className="text-sm font-medium opacity-60"
                  style={{ color: 'var(--cor-primaria)' }}
                >
                  Esqueci minha senha
                </button>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: 'var(--cor-primaria)' }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </form>

            {/* Rodapé do formulário */}
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-1.5 text-xs text-[var(--texto-terciario)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                Ambiente seguro
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--texto-terciario)]">
                <span className="cursor-pointer hover:underline">Privacidade</span>
                <span>·</span>
                <span className="cursor-pointer hover:underline">Termos de Uso</span>
              </div>
              <p className="text-xs text-[var(--texto-terciario)]">
                Problemas para acessar? Falar com o administrador
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

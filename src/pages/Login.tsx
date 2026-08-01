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
    // Em caso de sucesso, o onAuthStateChange no App troca a tela.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--fundo-pagina)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-normal text-[var(--texto-titulo)]">Clínica Patrícia</h1>
          <p className="mt-1 text-sm text-[var(--texto-secundario)]">
            Acesse sua conta para continuar
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-6 shadow-[0px_1px_8px_rgba(0,0,0,0.1)] sm:p-8"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]"
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
                placeholder="voce@exemplo.com"
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]"
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
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
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
              className="w-full rounded-xl bg-[var(--cor-primaria)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login

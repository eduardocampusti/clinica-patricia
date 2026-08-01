import { useState, type ReactNode } from 'react'
import type { ClinicaAtiva } from '../../hooks/useClinicaAtiva'
import { ThemeToggle } from '../../theme/ThemeToggle'
import Sidebar from './Sidebar'
import type { Tela } from './types'
import { IconeFechar, IconeMenuHamburguer } from './icons'

interface AppShellProps {
  tela: Tela
  onNavegar: (tela: Tela) => void
  clinicaAtiva: ClinicaAtiva | null
  clinicasDoUsuario: ClinicaAtiva[]
  onSelecionarClinica: (id: string) => void
  emailUsuario: string
  onSair: () => void
  children: ReactNode
}

function AppShell({
  tela,
  onNavegar,
  clinicaAtiva,
  clinicasDoUsuario,
  onSelecionarClinica,
  emailUsuario,
  onSair,
  children,
}: AppShellProps) {
  const [drawerAberto, setDrawerAberto] = useState(false)

  return (
    <div className="flex min-h-screen bg-[var(--fundo-pagina)]">
      <Sidebar
        tela={tela}
        onNavegar={onNavegar}
        clinicaAtiva={clinicaAtiva}
        clinicasDoUsuario={clinicasDoUsuario}
        onSelecionarClinica={onSelecionarClinica}
        emailUsuario={emailUsuario}
        aberta={drawerAberto}
        onFechar={() => setDrawerAberto(false)}
      />

      {drawerAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setDrawerAberto(false)}
          className="fixed inset-0 z-30 bg-[var(--sobreposicao)] lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--borda)] bg-[var(--fundo-card)] px-4 py-3 lg:justify-end lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerAberto((v) => !v)}
            aria-label={drawerAberto ? 'Fechar menu' : 'Abrir menu'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--borda)] text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] lg:hidden"
          >
            {drawerAberto ? <IconeFechar /> : <IconeMenuHamburguer />}
          </button>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={onSair}
              className="rounded-xl border border-[var(--borda)] px-4 py-2 text-sm font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)]"
            >
              Sair
            </button>
          </div>
        </div>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  )
}

export default AppShell

import { useState, type ReactNode } from 'react'
import type { ClinicaAtiva } from '../../hooks/useClinicaAtiva'
import type { Papel } from '../../hooks/usePapelNaClinica'
import { ThemeToggle } from '../../theme/ThemeToggle'
import Sidebar from './Sidebar'
import type { Tela } from './types'
import { IconeFechar, IconeLupa, IconeMenuHamburguer, IconeSino } from './icons'

interface AppShellProps {
  tela: Tela
  onNavegar: (tela: Tela) => void
  clinicaAtiva: ClinicaAtiva | null
  clinicasDoUsuario: ClinicaAtiva[]
  onSelecionarClinica: (id: string) => void
  emailUsuario: string
  papel: Papel | null
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
  papel,
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
        papel={papel}
        aberta={drawerAberto}
        onFechar={() => setDrawerAberto(false)}
        onSair={onSair}
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
        <header className="flex h-16 flex-none items-center gap-4 border-b border-[var(--borda)] bg-[var(--fundo-card)] px-4 lg:px-6">
          {/* Botão hambúrguer — só mobile */}
          <button
            type="button"
            onClick={() => setDrawerAberto((v) => !v)}
            aria-label={drawerAberto ? 'Fechar menu' : 'Abrir menu'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] lg:hidden"
          >
            {drawerAberto ? <IconeFechar /> : <IconeMenuHamburguer />}
          </button>

          {/* Abas de clínica — só proprietária (desktop) */}
          {clinicasDoUsuario.length > 1 && (
            <nav className="hidden items-center gap-1 lg:flex">
              {clinicasDoUsuario.map((c) => {
                const ativa = c.id === clinicaAtiva?.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelecionarClinica(c.id)}
                    className={`relative px-3 py-2 text-sm font-medium transition ${
                      ativa
                        ? 'text-[var(--cor-primaria)]'
                        : 'text-[var(--texto-terciario)] hover:text-[var(--texto-principal)]'
                    }`}
                  >
                    {c.nome.replace('Clínica ', '')}
                    {ativa && (
                      <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-[var(--cor-primaria)]" />
                    )}
                  </button>
                )
              })}
            </nav>
          )}

          {/* Nome da clínica — só funcionário (desktop) */}
          {clinicasDoUsuario.length <= 1 && clinicaAtiva && (
            <span className="hidden text-sm font-medium text-[var(--texto-secundario)] lg:block">
              {clinicaAtiva.nome}
            </span>
          )}

          {/* Espaçador */}
          <div className="flex-1" />

          {/* Busca (desktop) */}
          <div className="hidden items-center gap-2 rounded-lg border border-[var(--borda)] bg-[var(--fundo-pagina)] px-3 py-1.5 text-sm text-[var(--texto-terciario)] lg:flex">
            <IconeLupa className="h-4 w-4" />
            <span>Buscar paciente ou agenda...</span>
            <kbd className="ml-4 rounded border border-[var(--borda)] bg-[var(--fundo-card)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--texto-terciario)]">
              Ctrl+K
            </kbd>
          </div>

          {/* Ícones de ação */}
          <div className="flex items-center gap-2">
            {/* Sino de notificações */}
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--texto-secundario)] transition hover:bg-[var(--fundo-pagina)]"
            >
              <IconeSino className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-[var(--cor-erro)]" />
            </button>

            {/* Toggle claro/escuro */}
            <ThemeToggle />

            {/* CTA — Novo Atendimento (desktop) */}
            <button
              type="button"
              onClick={() => onNavegar('atendimentos')}
              className="hidden items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 lg:flex"
              style={{ backgroundColor: 'var(--cor-primaria)' }}
            >
              Novo Atendimento
            </button>

            {/* Avatar do usuário */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--fundo-pagina)] text-xs font-bold text-[var(--texto-principal)]">
              {emailUsuario.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  )
}

export default AppShell

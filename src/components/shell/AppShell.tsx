import { type ReactNode } from 'react'
import type { ClinicaAtiva } from '../../hooks/useClinicaAtiva'
import type { Papel } from '../../hooks/usePapelNaClinica'
import { ThemeToggle } from '../../theme/ThemeToggle'
import { rotuloPapel } from '../../lib/papelApresentacao'
import Sidebar from './Sidebar'
import { TITULOS_TELA, type Tela } from './types'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../ui/sidebar'

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
  return (
    <SidebarProvider className={tela === 'financeiro' ? 'app-shell-finance' : ''}>
      <Sidebar
        onNavegar={onNavegar}
        clinicaAtiva={clinicaAtiva}
        clinicasDoUsuario={clinicasDoUsuario}
        onSelecionarClinica={onSelecionarClinica}
        papel={papel}
        emailUsuario={emailUsuario}
        onSair={onSair}
      />

      <SidebarInset>
        <header className="app-shell-header flex min-h-16 flex-none items-center gap-3 border-b border-[var(--borda)] bg-[var(--fundo-card)] px-4 sm:px-6 lg:px-8">
          <SidebarTrigger />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--texto-principal)]">{TITULOS_TELA[tela]}</p>
            <p className="hidden text-xs text-[var(--texto-secundario)] sm:block">Gestão clínica</p>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {clinicasDoUsuario.length > 1 ? (
              <select aria-label="Selecionar clínica" value={clinicaAtiva?.id ?? ''}
                onChange={(evento) => onSelecionarClinica(evento.target.value)}
                className="max-w-[115px] min-h-10 truncate rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-2 text-xs font-medium text-[var(--texto-principal)] focus-visible:outline-2 focus-visible:outline-[var(--cor-primaria)] sm:max-w-[190px] sm:px-3 sm:text-sm">
                {clinicasDoUsuario.map((clinica) => <option key={clinica.id} value={clinica.id}>{clinica.nome}</option>)}
              </select>
            ) : clinicaAtiva && <span className="max-w-[110px] truncate text-xs font-medium text-[var(--texto-secundario)] sm:max-w-none sm:text-sm">{clinicaAtiva.nome}</span>}
            <ThemeToggle />
            <div aria-label={`Usuário ${emailUsuario}`} title={emailUsuario} className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--cor-primaria-suave)] text-xs font-bold text-[var(--cor-primaria)]">
              {emailUsuario.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden max-w-40 lg:block"><p className="truncate text-xs font-semibold text-[var(--texto-principal)]" title={emailUsuario}>{emailUsuario.split('@')[0]}</p><p className="text-xs text-[var(--texto-secundario)]">{rotuloPapel(papel)}</p></div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AppShell

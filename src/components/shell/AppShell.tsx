import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ClinicaAtiva } from '../../hooks/useClinicaAtiva'
import type { Papel } from '../../hooks/usePapelNaClinica'
import { ThemeToggle } from '../../theme/ThemeToggle'
import { rotuloPapel } from '../../lib/papelApresentacao'
import Sidebar from './Sidebar'
import { TITULOS_TELA, type Tela } from './types'
import { IconeFechar, IconeMenuHamburguer } from './icons'

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
  const [compacto, setCompacto] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches)
  const gatilhoMenu = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const atualizar = () => { setCompacto(media.matches); if (!media.matches) setDrawerAberto(false) }
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])

  useEffect(() => {
    if (!drawerAberto || !compacto) return
    const menu = document.getElementById('app-sidebar')
    const primeiro = menu?.querySelector<HTMLElement>('button:not(:disabled), select:not(:disabled)')
    primeiro?.focus()
    const teclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') { evento.preventDefault(); setDrawerAberto(false); return }
      if (evento.key !== 'Tab' || !menu) return
      const controles = Array.from(menu.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), a[href]'))
        .filter((elemento) => elemento.getClientRects().length > 0)
      if (!controles.length) return
      const inicio = controles[0]
      const fim = controles.at(-1)!
      if (evento.shiftKey && (document.activeElement === inicio || !menu.contains(document.activeElement))) {
        evento.preventDefault(); fim.focus()
      } else if (!evento.shiftKey && (document.activeElement === fim || !menu.contains(document.activeElement))) {
        evento.preventDefault(); inicio.focus()
      }
    }
    document.addEventListener('keydown', teclado)
    const gatilho = gatilhoMenu.current
    return () => { document.removeEventListener('keydown', teclado); gatilho?.focus() }
  }, [drawerAberto, compacto])

  return (
    <div className={`app-shell flex min-h-screen bg-[var(--fundo-pagina)]${tela === 'financeiro' ? ' app-shell-finance' : ''}`}>
      <Sidebar
        tela={tela}
        onNavegar={onNavegar}
        clinicaAtiva={clinicaAtiva}
        clinicasDoUsuario={clinicasDoUsuario}
        onSelecionarClinica={onSelecionarClinica}
        papel={papel}
        emailUsuario={emailUsuario}
        aberta={drawerAberto}
        compacto={compacto}
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
        <header className="app-shell-header flex min-h-16 flex-none items-center gap-3 border-b border-[var(--borda)] bg-[var(--fundo-card)] px-4 sm:px-6 lg:px-8">
          {/* Botão hambúrguer — só mobile */}
          <button
            type="button"
            ref={gatilhoMenu}
            onClick={() => setDrawerAberto((v) => !v)}
            aria-label={drawerAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-controls="app-sidebar"
            aria-expanded={drawerAberto}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] lg:hidden"
          >
            {drawerAberto ? <IconeFechar /> : <IconeMenuHamburguer />}
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--texto-principal)]">{TITULOS_TELA[tela]}</p>
            <p className="hidden text-xs text-[var(--texto-secundario)] sm:block">Gestão clínica</p>
          </div>

          {/* Espaçador */}
          <div className="flex-1" />

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
      </div>
    </div>
  )
}

export default AppShell

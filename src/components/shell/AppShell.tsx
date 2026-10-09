import { useEffect, useState, type ReactNode } from 'react'
import type { ClinicaAtiva } from '../../hooks/useClinicaAtiva'
import type { Papel } from '../../hooks/usePapelNaClinica'
import { ThemeToggle } from '../../theme/ThemeToggle'
import { rotuloPapel } from '../../lib/papelApresentacao'
import Sidebar from './Sidebar'
import { TITULOS_TELA, type Tela } from './types'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../ui/sidebar'
import type { IdentidadeConta } from '../../hooks/useIdentidadeConta'
import { AvatarConta } from './AvatarConta'
import { detalheIdentidade, rotuloIdentidade } from '../../lib/identidadeApresentacao'
import { MeuPerfil } from '../perfil/MeuPerfil'
import { useMarcaInstitucional } from '../../hooks/useMarcaInstitucional'
import { useTheme } from '../../theme/ThemeProvider'

interface AppShellProps {
  tela: Tela
  onNavegar: (tela: Tela) => void
  clinicaAtiva: ClinicaAtiva | null
  clinicasDoUsuario: ClinicaAtiva[]
  onSelecionarClinica: (id: string) => void
  identidade: IdentidadeConta
  conta: string
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
  identidade,
  conta,
  papel,
  onSair,
  children,
}: AppShellProps) {
  const [perfilAberto, setPerfilAberto] = useState(false)
  const abrirPerfil = () => { identidade.reconsultar?.(); setPerfilAberto(true) }
  const marcaInstitucional = useMarcaInstitucional(clinicaAtiva?.id ?? null)
  const { aplicarCoresClinica } = useTheme()
  useEffect(()=>{
    if(!clinicaAtiva||!marcaInstitucional.snapshot)return
    aplicarCoresClinica({...clinicaAtiva,cor_primaria:marcaInstitucional.apresentacao.cor})
    const favicon=marcaInstitucional.snapshot.ativos[marcaInstitucional.apresentacao.favicon]
    if(!favicon)return
    const link=document.createElement('link');link.rel='icon';link.href=favicon;document.head.append(link)
    return()=>link.remove()
  },[clinicaAtiva,marcaInstitucional.snapshot,marcaInstitucional.apresentacao.cor,marcaInstitucional.apresentacao.favicon,aplicarCoresClinica])
  return (
    <SidebarProvider className={tela === 'financeiro' ? 'app-shell-finance' : ''}>
      <Sidebar
        onNavegar={onNavegar}
        clinicaAtiva={clinicaAtiva}
        clinicasDoUsuario={clinicasDoUsuario}
        onSelecionarClinica={onSelecionarClinica}
        papel={papel}
        identidade={identidade}
        onMeuPerfil={abrirPerfil}
        onSair={onSair}
        logoInstitucional={marcaInstitucional.logo}
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
            <button type="button" aria-label="Meu perfil pelo avatar" title="Meu perfil" onClick={abrirPerfil} className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[var(--cor-primaria)]"><AvatarConta identidade={identidade} papel={rotuloPapel(papel)} /></button>
            <div className="hidden max-w-40 lg:block" title={detalheIdentidade(identidade)}><p className="truncate text-xs font-semibold text-[var(--texto-principal)]" title={identidade.nome ?? undefined}>{rotuloIdentidade(identidade)}</p><p className="text-xs text-[var(--texto-secundario)]">{rotuloPapel(papel)}</p></div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </SidebarInset>
      {perfilAberto && <MeuPerfil key={identidade.chave.split(':')[0]} identidade={identidade} conta={conta} papel={rotuloPapel(papel)} clinica={clinicaAtiva?.nome ?? 'Clínica selecionada'} onFechar={() => setPerfilAberto(false)} />}
    </SidebarProvider>
  )
}

export default AppShell

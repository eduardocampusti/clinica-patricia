import { useEffect, useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import type { ClinicaAtiva } from '../../hooks/useClinicaAtiva'
import type { Papel } from '../../hooks/usePapelNaClinica'
import { rotuloPapel, rotuloVisao } from '../../lib/papelApresentacao'
import { useCaminhoAtual } from '../../lib/appRoute'
import { CLINIC_BRANDS, clinicaCorrespondeAoBrand } from '../../config/clinicBrands'
import type { Tela } from './types'
import { itemAtivo, itensParaPapel } from './navigation'
import { IconeChevron, IconeCheck, IconeFechar, IconeMais } from './icons'
import { Sidebar as SidebarBase, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '../ui/sidebar'

interface SidebarProps {
  onNavegar: (tela: Tela) => void
  clinicaAtiva: ClinicaAtiva | null
  clinicasDoUsuario: ClinicaAtiva[]
  onSelecionarClinica: (id: string) => void
  papel: Papel | null
  emailUsuario: string
  onSair: () => void
}
export default function Sidebar({ onNavegar, clinicaAtiva, clinicasDoUsuario, onSelecionarClinica, papel, emailUsuario, onSair }: SidebarProps) {
  const { open, isMobile, setOpenMobile } = useSidebar()
  const caminho = useCaminhoAtual()
  const [seletorAberto, setSeletorAberto] = useState(false)
  const recolhido = !isMobile && !open
  const marca = clinicaAtiva ? Object.values(CLINIC_BRANDS).find(b => clinicaCorrespondeAoBrand(clinicaAtiva, b)) : undefined
  const itens = marca ? itensParaPapel(papel, marca.slug) : []
  useEffect(() => { setOpenMobile(false); setSeletorAberto(false) }, [caminho, setOpenMobile])
  const texto = recolhido ? 'sr-only' : 'min-w-0 truncate'
  return <SidebarBase>
    <SidebarHeader>
      <div className="flex min-h-10 items-center gap-3 px-1 pr-8 lg:pr-0" title="Clínica Patrícia · Gestão clínica">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--menu-avatar-bg)] font-bold">P</span>
        <div className={texto}><p className="text-sm font-semibold">Clínica Patrícia</p><p className="text-xs text-[var(--menu-texto-secundario)]">Gestão clínica</p></div>
      </div>
      <p className={`px-2 text-xs text-[var(--menu-texto-secundario)] ${texto}`}>{rotuloVisao(papel)}</p>
      <Popover.Root open={seletorAberto} onOpenChange={setSeletorAberto}>
        <Popover.Trigger disabled={clinicasDoUsuario.length < 2} aria-label={`Selecionar clínica: ${clinicaAtiva?.nome ?? 'Carregando'}`} title={clinicaAtiva?.nome} className={`flex min-h-11 w-full items-center gap-2 rounded-lg bg-[var(--menu-hover-bg)] p-2 text-left focus-visible:outline-2 focus-visible:outline-[var(--menu-texto)] ${recolhido ? 'justify-center' : ''}`}>
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--menu-avatar-bg)] text-xs font-bold">{marca?.slug === 'ipupiara' ? 'I' : marca ? 'B' : '—'}</span>
          <span className={`flex-1 text-sm font-semibold ${texto}`}>{clinicaAtiva?.nome ?? 'Carregando clínica…'}</span>
          {!recolhido && clinicasDoUsuario.length > 1 && <IconeChevron className="shrink-0" />}
        </Popover.Trigger>
        <Popover.Portal><Popover.Positioner side={recolhido ? 'right' : 'bottom'} align="start" sideOffset={8} className="z-[60]">
          <Popover.Popup className="w-64 rounded-xl border border-[var(--borda)] bg-[var(--fundo-card)] p-2 text-[var(--texto-principal)] shadow-lg outline-none">
            <Popover.Title className="px-2 py-2 text-xs font-semibold text-[var(--texto-secundario)]">Unidades autorizadas</Popover.Title>
            {clinicasDoUsuario.map(c => <button key={c.id} type="button" aria-pressed={c.id === clinicaAtiva?.id} onClick={() => { onSelecionarClinica(c.id); setSeletorAberto(false) }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-[var(--fundo-pagina)] focus-visible:outline-2 focus-visible:outline-[var(--cor-primaria)]"><span className="flex-1">{c.nome}</span>{c.id === clinicaAtiva?.id && <IconeCheck />}</button>)}
          </Popover.Popup>
        </Popover.Positioner></Popover.Portal>
      </Popover.Root>
      {(papel === 'recepcao' || papel === 'proprietaria') && <button type="button" aria-label="Novo agendamento" title="Novo agendamento" onClick={() => { onNavegar('agenda'); if (marca && itemAtivo(window.location.pathname, `/sistema/${marca.slug}/agenda`)) setOpenMobile(false) }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--fundo-card)] px-2 font-semibold text-[var(--texto-principal)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--menu-texto)]"><IconeMais /><span className={texto}>Novo agendamento</span></button>}
    </SidebarHeader>
    <SidebarContent><nav aria-label="Navegação principal">
      <p className={`px-3 py-2 text-xs text-[var(--menu-texto-secundario)] ${texto}`}>Navegação</p>
      {!papel && <p role="status" className="text-xs">Verificando permissões…</p>}
      <SidebarMenu>{itens.map(({ tela, titulo, href, Icone }) => <SidebarMenuItem key={tela}>
        <SidebarMenuButton render={<a href={href} />} isActive={itemAtivo(caminho, href)} aria-current={itemAtivo(caminho, href) ? 'page' : undefined} aria-label={titulo} title={recolhido ? titulo : undefined} onClick={evento => {
          if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey || evento.button !== 0) return
          evento.preventDefault(); onNavegar(tela)
          if (itemAtivo(window.location.pathname, href)) setOpenMobile(false)
        }}><span aria-hidden="true" className="shrink-0"><Icone /></span><span className={texto}>{titulo}</span></SidebarMenuButton>
      </SidebarMenuItem>)}</SidebarMenu>
    </nav></SidebarContent>
    <SidebarFooter>
      <div title={`${emailUsuario} · ${rotuloPapel(papel)}`} className="mb-2 flex items-center gap-3 px-1 py-2">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--menu-avatar-bg)] text-xs font-bold">{emailUsuario.slice(0, 2).toUpperCase()}</span>
        <div className={texto}><p className="truncate text-xs font-semibold">{emailUsuario.split('@')[0]}</p><p className="text-xs text-[var(--menu-texto-secundario)]">{rotuloPapel(papel)}</p></div>
        {recolhido && <span className="sr-only">{emailUsuario} · {rotuloPapel(papel)}</span>}
      </div>
      <SidebarMenuButton type="button" aria-label="Sair" title={recolhido ? 'Sair' : undefined} onClick={onSair}><IconeFechar /><span className={texto}>Sair</span></SidebarMenuButton>
    </SidebarFooter>
  </SidebarBase>
}

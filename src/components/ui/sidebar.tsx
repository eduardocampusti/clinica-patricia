// Adaptação localizada do registry oficial shadcn/ui base-nova/sidebar (Base UI).
// https://ui.shadcn.com/docs/components/base/sidebar
import { createContext, useContext, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { IconeFechar, IconeMenuHamburguer } from '../shell/icons'

const PREFERENCIA = 'clinica:sidebar:expanded'
type Contexto = { open: boolean; setOpen: (open: boolean) => void; openMobile: boolean; setOpenMobile: (open: boolean) => void; isMobile: boolean; state: 'expanded' | 'collapsed'; toggleSidebar: () => void }
const SidebarContext = createContext<Contexto | null>(null)
// Composição oficial compartilha hook e primitives no mesmo módulo.
// oxlint-disable-next-line react/only-export-components
export function useSidebar() {
  const contexto = useContext(SidebarContext)
  if (!contexto) throw new Error('Sidebar requer SidebarProvider.')
  return contexto
}
export function SidebarProvider({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [open, setOpenState] = useState(() => { try { return localStorage.getItem(PREFERENCIA) !== 'false' } catch { return true } })
  const [openMobile, setOpenMobile] = useState(false)
  const [isMobile, setIsMobile] = useState(() => matchMedia('(max-width: 1023px)').matches)
  useEffect(() => {
    const media = matchMedia('(max-width: 1023px)')
    const atualizar = () => { setIsMobile(media.matches); setOpenMobile(false) }
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])
  const value = useMemo<Contexto>(() => {
    const setOpen = (next: boolean) => { setOpenState(next); try { localStorage.setItem(PREFERENCIA, String(next)) } catch { /* Preferência opcional. */ } }
    return { open, setOpen, openMobile, setOpenMobile, isMobile, state: open ? 'expanded' : 'collapsed', toggleSidebar: () => isMobile ? setOpenMobile(!openMobile) : setOpen(!open) }
  }, [open, openMobile, isMobile])
  // Sem atalho global: preservar os comandos de campos e editores.
  return <SidebarContext.Provider value={value}><div data-slot="sidebar-wrapper" className={`app-shell flex min-h-svh w-full bg-[var(--fundo-pagina)] ${className}`}>{children}</div></SidebarContext.Provider>
}
export function Sidebar({ children }: { children: ReactNode }) {
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar()
  if (isMobile) return <Dialog.Root open={openMobile} onOpenChange={setOpenMobile}><Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 z-40 bg-[var(--sobreposicao)]" />
    <Dialog.Popup id="app-sidebar" className="app-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(288px,calc(100vw-32px))] flex-col bg-[var(--cor-menu)] text-[var(--menu-texto)] outline-none" finalFocus={() => document.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]')}>
      <Dialog.Title className="sr-only">Menu principal</Dialog.Title><Dialog.Description className="sr-only">Navegação e clínica autorizada.</Dialog.Description>
      <Dialog.Close aria-label="Fechar menu" className="absolute right-2 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--menu-hover-bg)] focus-visible:outline-2 focus-visible:outline-[var(--menu-texto)]"><IconeFechar /></Dialog.Close>{children}
    </Dialog.Popup>
  </Dialog.Portal></Dialog.Root>
  return <div data-slot="sidebar" data-state={state} data-collapsible={state === 'collapsed' ? 'icon' : ''} className="group/sidebar hidden shrink-0 lg:block">
    <div data-slot="sidebar-gap" className="w-[240px] transition-[width] duration-200 group-data-[collapsible=icon]/sidebar:w-[76px] motion-reduce:transition-none" />
    <aside id="app-sidebar" aria-label="Menu principal" className="app-sidebar fixed inset-y-0 left-0 z-20 flex w-[240px] flex-col bg-[var(--cor-menu)] text-[var(--menu-texto)] transition-[width] duration-200 group-data-[collapsible=icon]/sidebar:w-[76px] motion-reduce:transition-none">{children}</aside>
  </div>
}
export function SidebarTrigger() {
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar()
  const label = isMobile ? 'Abrir menu' : open ? 'Recolher menu' : 'Expandir menu'
  return <button type="button" data-slot="sidebar-trigger" aria-label={label} title={label} aria-controls="app-sidebar" aria-expanded={isMobile ? openMobile : open} onClick={toggleSidebar} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--texto-principal)] hover:bg-[var(--fundo-pagina)] focus-visible:outline-2 focus-visible:outline-[var(--cor-primaria)]"><IconeMenuHamburguer /></button>
}
export function SidebarInset({ className = '', ...props }: ComponentProps<'div'>) { return <div data-slot="sidebar-inset" className={`flex min-w-0 flex-1 flex-col ${className}`} {...props} /> }
export function SidebarHeader({ className = '', ...props }: ComponentProps<'div'>) { return <div data-slot="sidebar-header" className={`shrink-0 space-y-3 px-3 pb-3 pt-5 ${className}`} {...props} /> }
export function SidebarContent({ className = '', ...props }: ComponentProps<'div'>) { return <div data-slot="sidebar-content" className={`min-h-0 flex-1 overflow-y-auto px-3 ${className}`} {...props} /> }
export function SidebarFooter({ className = '', ...props }: ComponentProps<'div'>) { return <div data-slot="sidebar-footer" className={`shrink-0 border-t border-[var(--menu-borda)] p-3 ${className}`} {...props} /> }
export function SidebarMenu(props: ComponentProps<'ul'>) { return <ul data-slot="sidebar-menu" className="space-y-1" {...props} /> }
export function SidebarMenuItem(props: ComponentProps<'li'>) { return <li data-slot="sidebar-menu-item" {...props} /> }
export function SidebarMenuButton({ render, isActive = false, className = '', ...props }: useRender.ComponentProps<'button'> & ComponentProps<'button'> & { isActive?: boolean }) {
  return useRender({ defaultTagName: 'button', render, props: mergeProps<'button'>({ className: `sidebar-menu-button flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-[var(--menu-hover-bg)] focus-visible:outline-2 focus-visible:outline-[var(--menu-texto)] ${isActive ? 'bg-[var(--menu-ativo-bg)] text-[var(--menu-texto)]' : 'text-[var(--menu-texto-secundario)]'} ${className}` }, props), state: { slot: 'sidebar-menu-button', active: isActive } })
}

import { useEffect, useRef, type ReactNode } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogIcon, AlertDialogTitle,
} from '../ui/alert-dialog'

function IconeConfirmacao({ tone }: { tone: 'danger' | 'warning' }) {
  return tone === 'danger'
    ? <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></svg>
    : <svg viewBox="0 0 24 24"><path d="M10.3 4.1 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 4.1a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
}

export function ConfirmacaoDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel = 'Cancelar', tone = 'danger', onConfirm, disabled = false, children }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'warning'
  onConfirm: () => void
  disabled?: boolean
  children?: ReactNode
}) {
  const cancelarRef = useRef<HTMLButtonElement>(null)
  const focoAnterior = useRef<HTMLElement | null>(null)
  const estavaAberto = useRef(false)
  const portalContainer = open && typeof document !== 'undefined'
    ? document.activeElement?.closest('dialog') ?? undefined
    : undefined
  useEffect(() => {
    if (open && !estavaAberto.current) focoAnterior.current = document.activeElement as HTMLElement | null
    if (!open && estavaAberto.current) requestAnimationFrame(() => focoAnterior.current?.focus())
    estavaAberto.current = open
  }, [open])
  return <AlertDialog open={open} onOpenChange={(value) => { if (!disabled) onOpenChange(value) }}>
    <AlertDialogContent portalContainer={portalContainer} data-tone={tone} onOpenAutoFocus={(event) => { event.preventDefault(); cancelarRef.current?.focus() }} onEscapeKeyDown={(event) => { if (disabled) event.preventDefault() }}>
      <AlertDialogHeader>
        <AlertDialogIcon tone={tone}><IconeConfirmacao tone={tone} /></AlertDialogIcon>
        <div><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></div>
      </AlertDialogHeader>
      {children}
      <AlertDialogFooter>
        <AlertDialogCancel ref={cancelarRef} disabled={disabled}>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction tone={tone} disabled={disabled} onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type { ComponentProps, ReactNode } from 'react'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger

export function AlertDialogContent({ className = '', children, portalContainer, ...props }: ComponentProps<typeof AlertDialogPrimitive.Content> & { portalContainer?: HTMLElement }) {
  return <AlertDialogPrimitive.Portal container={portalContainer}>
    <AlertDialogPrimitive.Overlay data-slot="alert-dialog-overlay" className="app-alert-dialog-overlay" />
    <AlertDialogPrimitive.Content data-slot="alert-dialog-content" className={`app-alert-dialog-content ${className}`.trim()} {...props}>
      {children}
    </AlertDialogPrimitive.Content>
  </AlertDialogPrimitive.Portal>
}

export function AlertDialogHeader({ className = '', ...props }: ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-header" className={`app-alert-dialog-header ${className}`.trim()} {...props} />
}

export function AlertDialogFooter({ className = '', ...props }: ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-footer" className={`app-alert-dialog-footer ${className}`.trim()} {...props} />
}

export function AlertDialogTitle({ className = '', ...props }: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={`app-alert-dialog-title ${className}`.trim()} {...props} />
}

export function AlertDialogDescription({ className = '', ...props }: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={`app-alert-dialog-description ${className}`.trim()} {...props} />
}

export function AlertDialogCancel({ className = '', ...props }: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" className={`app-alert-dialog-button app-alert-dialog-cancel ${className}`.trim()} {...props} />
}

export function AlertDialogAction({ className = '', tone = 'danger', ...props }: ComponentProps<typeof AlertDialogPrimitive.Action> & { tone?: 'danger' | 'warning' }) {
  return <AlertDialogPrimitive.Action data-slot="alert-dialog-action" data-tone={tone} className={`app-alert-dialog-button app-alert-dialog-action ${className}`.trim()} {...props} />
}

export function AlertDialogIcon({ tone, children }: { tone: 'danger' | 'warning'; children: ReactNode }) {
  return <span className="app-alert-dialog-icon" data-tone={tone} aria-hidden="true">{children}</span>
}

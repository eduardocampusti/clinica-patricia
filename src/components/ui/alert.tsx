import type { HTMLAttributes } from 'react'

export type AlertVariant = 'info' | 'success' | 'warning' | 'destructive'

export function Alert({ variant = 'info', className = '', ...props }: HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return <div data-slot="alert" data-variant={variant} className={`app-alert ${className}`.trim()} {...props} />
}

export function AlertTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 data-slot="alert-title" className={`app-alert-title ${className}`.trim()} {...props} />
}

export function AlertDescription({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="alert-description" className={`app-alert-description ${className}`.trim()} {...props} />
}

export function AlertAction({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="alert-action" className={`app-alert-action ${className}`.trim()} {...props} />
}

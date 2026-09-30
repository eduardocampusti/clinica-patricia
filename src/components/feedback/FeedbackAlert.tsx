import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Alert, AlertAction, AlertDescription, AlertTitle, type AlertVariant } from '../ui/alert'

function IconeFeedback({ variant }: { variant: AlertVariant }) {
  if (variant === 'success') return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.7 2.7L16.5 9" /></svg>
  if (variant === 'warning') return <svg viewBox="0 0 24 24"><path d="M10.3 4.1 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 4.1a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
  if (variant === 'destructive') return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></svg>
  return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
}

interface FeedbackAlertProps {
  variant?: AlertVariant
  title: string
  description?: ReactNode
  action?: ReactNode
  onClose?: () => void
  autoDismissMs?: number
  urgent?: boolean
  className?: string
}

export function FeedbackAlert({ variant = 'info', title, description, action, onClose, autoDismissMs, urgent = false, className }: FeedbackAlertProps) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(autoDismissMs ?? 0)
  const startedAt = useRef(0)

  useEffect(() => {
    if (!onClose || !autoDismissMs || paused) return
    startedAt.current = Date.now()
    const timer = window.setTimeout(onClose, remaining.current || autoDismissMs)
    return () => {
      window.clearTimeout(timer)
      remaining.current = Math.max(250, (remaining.current || autoDismissMs) - (Date.now() - startedAt.current))
    }
  }, [autoDismissMs, onClose, paused])

  const role = urgent || variant === 'destructive' ? 'alert' : 'status'
  return <Alert
    variant={variant}
    role={role}
    aria-live={role === 'alert' ? 'assertive' : 'polite'}
    className={className}
    onPointerEnter={() => setPaused(true)}
    onPointerLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}
  >
    <span className="app-alert-icon" aria-hidden="true"><IconeFeedback variant={variant} /></span>
    <div className="app-alert-copy"><AlertTitle>{title}</AlertTitle>{description && <AlertDescription>{description}</AlertDescription>}</div>
    {(action || onClose) && <AlertAction>{action}{onClose && <button type="button" className="app-alert-close" aria-label="Fechar mensagem" onClick={onClose}>×</button>}</AlertAction>}
  </Alert>
}

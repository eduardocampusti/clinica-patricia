import { useEffect, useId, useRef, type ReactNode } from 'react'

export function ModalBase({ titulo, subtitulo, onFechar, children, largura = 'md', ocupado = false, suspenso = false, apresentacao = 'modal' }: {
  titulo: string
  subtitulo?: string
  onFechar: () => void
  children: ReactNode
  largura?: 'md' | 'lg'
  ocupado?: boolean
  suspenso?: boolean
  apresentacao?: 'modal' | 'painel'
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const id = useId()
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const elemento = dialog.current!
    return () => { if (elemento.open) elemento.close(); anterior?.focus() }
  }, [])
  useEffect(() => {
    const elemento = dialog.current!
    if (suspenso) {
      if (elemento.open) elemento.close()
      return
    }
    if (!elemento.open) elemento.showModal()
    heading.current?.focus()
  }, [suspenso])
  useEffect(() => { heading.current?.focus() }, [titulo])
  useEffect(() => {
    if (!ocupado) return
    const proteger = (evento: BeforeUnloadEvent) => { evento.preventDefault(); evento.returnValue = '' }
    window.addEventListener('beforeunload', proteger)
    return () => window.removeEventListener('beforeunload', proteger)
  }, [ocupado])
  return (
    <dialog ref={dialog} aria-labelledby={id} aria-busy={ocupado}
      onKeyDown={(evento) => {
        // Confirmações compartilhadas contêm o próprio foco dentro do diálogo nativo.
        if ((evento.target as HTMLElement).closest('[role="alertdialog"]')) return
        if (evento.key !== 'Tab') return
        const controles = Array.from(evento.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'))
          .filter((el) => el.getClientRects().length > 0)
        const primeiro = controles[0]
        const ultimo = controles.at(-1)
        if (!primeiro) { evento.preventDefault(); heading.current?.focus(); return }
        if (evento.shiftKey && (document.activeElement === primeiro || document.activeElement === heading.current)) {
          evento.preventDefault(); ultimo?.focus()
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault(); primeiro.focus()
        }
      }}
      onCancel={(evento) => { evento.preventDefault(); if (!ocupado) onFechar() }}
      className={apresentacao === 'painel' ? 'painel-agenda ml-auto mr-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden bg-[var(--fundo-card)] text-[var(--texto-principal)] backdrop:bg-[var(--sobreposicao)] sm:max-w-xl' : `m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-[var(--fundo-card)] p-5 text-[var(--texto-principal)] backdrop:bg-[var(--sobreposicao)] sm:p-6 ${largura === 'lg' ? 'max-w-lg' : 'max-w-md'}`}>
      <div className={apresentacao === 'painel' ? 'flex shrink-0 items-center justify-between gap-3 border-b border-[var(--borda)] px-5 py-3' : 'mb-5 flex items-start justify-between gap-3'}>
        {subtitulo ? <div className="min-w-0">
          <h2 id={id} ref={heading} tabIndex={-1} className="texto-titulo-secao outline-none">{titulo}</h2>
          <p className="truncate text-sm text-[var(--texto-secundario)]">{subtitulo}</p>
        </div> : <h2 id={id} ref={heading} tabIndex={-1} className="texto-titulo-secao outline-none">{titulo}</h2>}
        <button type="button" aria-label="Fechar" disabled={ocupado} onClick={onFechar}
          className="min-h-11 min-w-11 rounded-lg text-[var(--texto-secundario)] focus-visible:outline-2 disabled:opacity-40">✕</button>
      </div>
      {children}
    </dialog>
  )
}

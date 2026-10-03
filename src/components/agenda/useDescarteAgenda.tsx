import { useEffect, useState } from 'react'
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog'

export function useDescarteAgenda(alterado: boolean, ocupado: boolean, onFechar: () => void) {
  const [confirmar, setConfirmar] = useState(false)
  useEffect(() => {
    if (!alterado) return
    const proteger = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', proteger)
    return () => window.removeEventListener('beforeunload', proteger)
  }, [alterado])
  return {
    solicitarFechar: () => { if (!ocupado) { if (alterado) setConfirmar(true); else onFechar() } },
    confirmacao: <ConfirmacaoDialog open={confirmar} onOpenChange={setConfirmar} title="Descartar alterações?"
      description="O preenchimento não salvo será perdido. Nenhuma alteração será feita no agendamento."
      confirmLabel="Descartar alterações" cancelLabel="Continuar preenchendo" tone="warning" disabled={ocupado} onConfirm={onFechar} />,
  }
}

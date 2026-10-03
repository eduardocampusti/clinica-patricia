import { useEffect, useState } from 'react'

// Atualiza só a apresentação na virada do minuto, inclusive quando a aba volta a ficar visível.
export function useAgoraAgenda() {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const atualizar = () => {
      const atual = new Date()
      setAgora(atual)
      clearTimeout(timer)
      timer = setTimeout(atualizar, 60000 - (atual.getSeconds() * 1000 + atual.getMilliseconds()))
    }
    atualizar()
    document.addEventListener('visibilitychange', atualizar)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', atualizar) }
  }, [])
  return agora
}

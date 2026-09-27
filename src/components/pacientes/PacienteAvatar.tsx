import { useEffect, useState } from 'react'
import { carregarFotoPaciente, obterCaminhoFotoPaciente } from '../../lib/pacienteFoto'

interface Props {
  pacienteId: string
  clinicaId: string
  nome: string
  caminho?: string | null
  tamanho?: 'lista' | 'resumo'
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/u).filter(Boolean)
  if (!partes.length) return '•'
  return `${partes[0][0]}${partes.length > 1 ? partes[partes.length - 1][0] : ''}`.toLocaleUpperCase('pt-BR')
}

export default function PacienteAvatar({ pacienteId, clinicaId, nome, caminho, tamanho = 'lista' }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    let objectUrl: string | null = null
    setUrl(null)
    void (async () => {
      try {
        const path = caminho === undefined
          ? await obterCaminhoFotoPaciente({ pacienteId, clinicaId })
          : caminho
        if (!path || !vigente) return
        const foto = await carregarFotoPaciente({ clinicaId, objectPath: path })
        if (!vigente) return
        objectUrl = URL.createObjectURL(foto)
        setUrl(objectUrl)
      } catch {
        // A miniatura é opcional; nunca revelar detalhes de autorização no cadastro.
      }
    })()
    return () => {
      vigente = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [pacienteId, clinicaId, caminho])

  return (
    <span className={`pacientes-avatar pacientes-avatar--${tamanho}`} aria-hidden="true">
      {url ? <img src={url} alt="" /> : iniciais(nome)}
    </span>
  )
}

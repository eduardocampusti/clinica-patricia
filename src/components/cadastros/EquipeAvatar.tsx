import { Avatar } from '@base-ui/react/avatar'

/** Image URLs must come from an authorized reader and match both identifiers.
 * Photos arrive through an authorized collective side channel, separately from
 * equipe_listar. No Storage/admin lookup per row in this component. */
export interface FotoEquipeDisponivel {
  membroId: string
  clinicaId: string
  url: string
}

export function EquipeAvatar({ membroId, clinicaId, nome, foto }: {
  membroId: string; clinicaId: string | null; nome: string; foto?: FotoEquipeDisponivel
}) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const letras = [partes[0], partes.length > 1 ? partes.at(-1) : undefined]
    .filter(Boolean).map(parte => Array.from(parte!)[0]).join('').toLocaleUpperCase('pt-BR')
  const iniciais = Array.from(letras).slice(0,2).join('') || '?'
  const url = foto?.membroId === membroId && foto.clinicaId === clinicaId ? foto.url : undefined
  return <Avatar.Root key={`${clinicaId}:${membroId}:${url ?? ''}`} className="equipe-avatar" aria-hidden="true">
    {url && <Avatar.Image className="equipe-avatar-imagem" src={url} alt="" />}
    <Avatar.Fallback className="equipe-avatar-iniciais">{iniciais}</Avatar.Fallback>
  </Avatar.Root>
}

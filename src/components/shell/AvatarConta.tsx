import { Avatar } from '@base-ui/react/avatar'
import type { IdentidadeConta } from '../../hooks/useIdentidadeConta'
import { iniciaisConta, detalheIdentidade, rotuloIdentidade } from '../../lib/identidadeApresentacao'

export function AvatarConta({ identidade, papel, menu = false }: { identidade: IdentidadeConta; papel: string; menu?: boolean }) {
  const rotulo = `${rotuloIdentidade(identidade)} · ${papel}`
  return <Avatar.Root key={`${identidade.chave}:${identidade.fotoUrl ?? ''}`} role="img" aria-label={rotulo}
    title={[rotulo, detalheIdentidade(identidade)].filter(Boolean).join(' · ')}
    className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${menu ? 'bg-[var(--menu-avatar-bg)] text-[var(--menu-texto)]' : 'bg-[var(--cor-primaria-suave)] text-[var(--texto-principal)]'}`}>
    {identidade.fotoUrl && <Avatar.Image src={identidade.fotoUrl} alt="" className="h-full w-full object-cover" />}
    <Avatar.Fallback>{iniciaisConta(identidade.nome)}</Avatar.Fallback>
  </Avatar.Root>
}

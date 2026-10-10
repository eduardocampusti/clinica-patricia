import type { ReactNode } from 'react'
import type { Tom } from '../../lib/equipeApresentacao'

// Selo de situação compartilhado pela listagem e pela ficha da Equipe (regras em lib/equipeApresentacao).
export function Selo({ tom, children, testId }: { tom: Tom; children: ReactNode; testId?: string }) {
  return <span className={`equipe-selo equipe-selo-${tom}`} data-testid={testId}><span className="equipe-selo-ponto" aria-hidden="true" />{children}</span>
}


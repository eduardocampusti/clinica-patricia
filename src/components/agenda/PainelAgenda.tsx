import type { ReactNode } from 'react'
import { ModalBase } from '../ModalBase'
import { horaAgenda, minutosAgenda } from '../../lib/agendaDisponibilidade'

export const campoAgenda = 'w-full min-h-11 rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-sm text-[var(--texto-principal)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:opacity-60'
export const acaoAgenda = 'min-h-11 rounded-lg border border-[var(--borda)] px-4 py-2 text-sm font-semibold focus-visible:outline-2 disabled:opacity-50'

export function PainelAgenda(props: { titulo: string; onFechar: () => void; ocupado?: boolean; suspenso?: boolean; children: ReactNode }) {
  return <ModalBase {...props} apresentacao="painel" />
}

export function ResumoHorario({ inicio, duracao, label = 'Resumo do horário' }: { inicio: string; duracao: number | null; label?: string }) {
  const fim = inicio && duracao ? minutosAgenda(inicio) + duracao : null
  return <dl aria-label={label} className="grid grid-cols-3 gap-2 rounded-lg bg-[var(--fundo-pagina)] p-3 text-sm">
    <div><dt className="text-[var(--texto-secundario)]">Início</dt><dd className="numero-tabular font-semibold">{inicio || '—'}</dd></div>
    <div><dt className="text-[var(--texto-secundario)]">Duração</dt><dd className="font-semibold">{duracao ? `${duracao} min` : 'Não disponível'}</dd></div>
    <div><dt className="text-[var(--texto-secundario)]">Término</dt><dd className="numero-tabular font-semibold">{fim !== null && fim < 1440 ? horaAgenda(fim) : '—'}</dd></div>
  </dl>
}

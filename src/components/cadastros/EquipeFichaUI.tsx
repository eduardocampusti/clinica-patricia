import type { ReactNode } from 'react'
import { ChevronRight, Info } from 'lucide-react'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../ui/collapsible'
import { valorVazio } from '../../lib/equipeApresentacao'

// Padrões visuais comuns da ficha da Equipe. Só apresentação: nenhum dado é alterado.

export function CabecalhoSecao({ descricao, acao }: { descricao?: ReactNode; acao?: ReactNode }) {
  return <>
    {descricao && <p className="equipe-secao-descricao">{descricao}</p>}
    {acao && <div className="equipe-secao-acao">{acao}</div>}
  </>
}

export function Cartao({ titulo, acao, children, testId, className = '', id }: { titulo?: ReactNode; acao?: ReactNode; children: ReactNode; testId?: string; className?: string; id?: string }) {
  return <section className={`equipe-cartao ${className}`} data-testid={testId} id={id} aria-label={typeof titulo === 'string' ? titulo : undefined}>
    {(titulo || acao) && <div className="equipe-cartao-topo">{titulo && <h4>{titulo}</h4>}{acao}</div>}
    {children}
  </section>
}

export function GradeCampos({ children, colunas = 2 }: { children: ReactNode; colunas?: 2 | 3 | 4 }) {
  return <dl className={`equipe-grade-campos equipe-grade-${colunas}`}>{children}</dl>
}

/** Rótulo em cima, valor embaixo; vazio mostra só "Não informado" em cinza. */
export function Campo({ rotulo, valor, amplo = false }: { rotulo: string; valor: ReactNode; amplo?: boolean }) {
  return <div className={amplo ? 'equipe-campo-amplo' : undefined}>
    <dt>{rotulo}</dt>
    <dd>{valorVazio(valor) ? <span className="equipe-nao-informado">Não informado</span> : valor}</dd>
  </div>
}

/** Ação única do cartão: "Completar" quando há campo vazio, "Editar" quando tudo está preenchido. */
export function AcaoCartao({ valores, assunto, onClick, desabilitado = false }: { valores: unknown[]; assunto: string; onClick: () => void; desabilitado?: boolean }) {
  const texto = valores.some(valorVazio) ? 'Completar' : 'Editar'
  return <button type="button" className="equipe-acao-cartao" disabled={desabilitado} aria-label={`${texto} ${assunto}`} onClick={onClick}>{texto}</button>
}

/** Regras e limites da seção numa única linha discreta. */
export function NotaInfo({ children }: { children: ReactNode }) {
  return <p className="equipe-nota-info"><Info aria-hidden="true" className="equipe-nota-icone" /><span>{children}</span></p>
}

/** Substitui <details>: mesmo conteúdo, mesmo estado inicial e painel montado quando fechado. */
export function Recolhivel({ titulo, children, defaultOpen = false, className = '' }: { titulo: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  return <Collapsible defaultOpen={defaultOpen} className={`equipe-recolhivel ${className}`}>
    <CollapsibleTrigger><ChevronRight aria-hidden="true" className="equipe-recolhivel-icone" /><span>{titulo}</span></CollapsibleTrigger>
    <CollapsiblePanel className="equipe-recolhivel-painel">{children}</CollapsiblePanel>
  </Collapsible>
}

export function Esqueleto({ rotulo, linhas = 3 }: { rotulo: string; linhas?: number }) {
  return <div className="equipe-esqueleto" role="status" aria-busy="true" aria-label={rotulo}>
    {Array.from({ length: linhas }, (_, i) => <div key={i} className="animate-pulse" />)}
  </div>
}

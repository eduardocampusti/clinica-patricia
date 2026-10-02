import { useEffect, useId, useRef, useState } from 'react'
import { campoAgenda } from './PainelAgenda'

const iniciais = (nome: string) => {
  const partes = nome.trim().split(/\s+/u).filter(Boolean)
  return partes.length ? `${partes[0][0]}${partes.length > 1 ? partes[partes.length - 1][0] : ''}`.toLocaleUpperCase('pt-BR') : '•'
}

// Seleção explícita: texto digitado nunca é interpretado como identidade de paciente.
export function SelecionarPaciente({ pacientes, value, onChange, disabled, detalhe }: {
  pacientes: { id: string; nome_completo: string }[]; value: string; onChange: (id: string) => void; disabled: boolean
  detalhe?: string
}) {
  const id = useId()
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const trocar = useRef<HTMLButtonElement>(null)
  const pesquisa = useRef<HTMLInputElement>(null)
  // O cartão substitui o campo: o foco acompanha a troca para não se perder no corpo do painel.
  const focar = useRef<'cartao' | 'pesquisa' | null>(null)
  const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const resultados = pacientes.filter(p => normalizar(p.nome_completo).includes(normalizar(busca))).slice(0, 30)
  const selecionado = pacientes.find(p => p.id === value)
  useEffect(() => {
    if (focar.current === 'cartao') trocar.current?.focus()
    if (focar.current === 'pesquisa') pesquisa.current?.focus()
    focar.current = null
  })
  function escolher(indice: number) {
    const p = resultados[indice]
    if (p) { focar.current = 'cartao'; onChange(p.id); setAberto(false); setBusca('') }
  }
  if (selecionado && !aberto) return <div role="group" aria-label="Paciente selecionado"
    className="flex items-center gap-3 rounded-xl border border-[var(--borda)] bg-[var(--fundo-pagina)] p-3 sm:p-4">
    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--borda)] bg-[var(--fundo-card)] text-sm font-semibold text-[var(--texto-secundario)]">{iniciais(selecionado.nome_completo)}</span>
    <div className="min-w-0 flex-1">
      <p className="break-words font-semibold text-[var(--texto-principal)]">{selecionado.nome_completo}</p>
      {detalhe && <p className="text-sm text-[var(--texto-secundario)]">{detalhe}</p>}
    </div>
    <button ref={trocar} type="button" disabled={disabled} aria-label={`Trocar paciente ${selecionado.nome_completo}`}
      onClick={() => { focar.current = 'pesquisa'; onChange(''); setBusca(''); setAberto(true); setAtivo(0) }}
      className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-[var(--cor-primaria)] hover:bg-[var(--cor-primaria-suave)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)] disabled:opacity-60">
      Trocar
    </button>
  </div>
  return <div className="space-y-2">
    <input ref={pesquisa} id={id} role="combobox" aria-label="Paciente" aria-required="true" aria-autocomplete="list" aria-expanded={aberto}
      aria-controls={`${id}-opcoes`} aria-activedescendant={aberto && resultados[ativo] ? `${id}-${ativo}` : undefined}
      className={campoAgenda} placeholder="Pesquisar e selecionar paciente" disabled={disabled}
      value={aberto ? busca : selecionado?.nome_completo ?? ''}
      onFocus={() => { setAberto(true); setAtivo(0) }}
      onChange={e => { setBusca(e.target.value); setAtivo(0); setAberto(true) }}
      onBlur={e => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) setAberto(false) }}
      onKeyDown={e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setAtivo(a => Math.min(a + 1, resultados.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo(a => Math.max(a - 1, 0)) }
        if (e.key === 'Enter' && aberto) { e.preventDefault(); escolher(ativo) }
        if (e.key === 'Escape' && aberto) { e.preventDefault(); e.stopPropagation(); setAberto(false) }
      }} />
    {aberto && <div id={`${id}-opcoes`} role="listbox" aria-label="Pacientes encontrados" className="max-h-48 overflow-auto rounded-lg border border-[var(--borda)]">
      {resultados.map((p, i) => <button id={`${id}-${i}`} key={p.id} type="button" role="option" aria-selected={p.id === value}
        tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => escolher(i)}
        className={`block min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-[var(--fundo-pagina)] ${ativo === i ? 'bg-[var(--cor-primaria-suave)]' : ''}`}>{p.nome_completo}</button>)}
      {!resultados.length && <p className="p-3 text-sm">Nenhum paciente encontrado. Você pode cadastrar um novo paciente.</p>}
    </div>}
    {aberto && <p className="text-xs text-[var(--texto-secundario)]">Até 30 resultados. Refine pelo nome; use as setas e Enter para selecionar.</p>}
  </div>
}

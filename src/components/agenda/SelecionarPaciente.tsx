import { useId, useState } from 'react'
import { campoAgenda } from './PainelAgenda'

// Seleção explícita: texto digitado nunca é interpretado como identidade de paciente.
export function SelecionarPaciente({ pacientes, value, onChange, disabled }: {
  pacientes: { id: string; nome_completo: string }[]; value: string; onChange: (id: string) => void; disabled: boolean
}) {
  const id = useId()
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const resultados = pacientes.filter(p => normalizar(p.nome_completo).includes(normalizar(busca))).slice(0, 30)
  const selecionado = pacientes.find(p => p.id === value)
  function escolher(indice: number) {
    const p = resultados[indice]
    if (p) { onChange(p.id); setAberto(false); setBusca('') }
  }
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">Paciente <span aria-hidden="true">*</span></label>
    <input id={id} role="combobox" aria-label="Paciente" aria-required="true" aria-autocomplete="list" aria-expanded={aberto}
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
    {selecionado && <p className="text-xs text-[var(--texto-secundario)]">Paciente selecionado: {selecionado.nome_completo}. <button type="button" disabled={disabled} onClick={() => { onChange(''); setBusca('') }} className="min-h-8 underline">Limpar seleção</button></p>}
    {aberto && <p className="text-xs text-[var(--texto-secundario)]">Até 30 resultados. Refine pelo nome; use as setas e Enter para selecionar.</p>}
  </div>
}

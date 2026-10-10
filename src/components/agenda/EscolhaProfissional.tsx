import { campoAgenda } from './PainelAgenda'

export const LIMITE_CARTOES_PROFISSIONAL = 6

// Até seis profissionais, cartões (rádios nativos, setas do teclado); acima disso, o select anterior.
export function EscolhaProfissional({ profissionais, value, onChange, disabled, rotuloId }: {
  profissionais: { id: string; nome_completo: string; especialidade_nome: string; duracao_consulta_minutos: number }[]
  value: string; onChange: (id: string) => void; disabled: boolean; rotuloId: string
}) {
  const escolhido = profissionais.find(p => p.id === value)
  if (profissionais.length > LIMITE_CARTOES_PROFISSIONAL) return <div className="space-y-1.5">
    <select id="novo-agendamento-profissional" aria-labelledby={rotuloId} required value={value} disabled={disabled}
      onChange={e => onChange(e.target.value)} className={campoAgenda}>
      <option value="">Selecione...</option>
      {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
    </select>
    {escolhido && <p className="text-sm text-[var(--texto-secundario)]">{[escolhido.especialidade_nome, `${escolhido.duracao_consulta_minutos} min por atendimento`].filter(Boolean).join(' · ')}</p>}
  </div>
  return <div role="radiogroup" aria-labelledby={rotuloId} aria-required="true" className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
    {profissionais.map(p => {
      const marcado = p.id === value
      return <label key={p.id} className={`relative flex min-h-16 cursor-pointer flex-col justify-center gap-0.5 rounded-xl border bg-[var(--fundo-card)] px-4 py-3 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--cor-primaria)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${marcado ? 'border-[var(--cor-primaria)] ring-1 ring-[var(--cor-primaria)]' : 'border-[var(--borda)] hover:border-[var(--cor-primaria)]'}`}>
        <input type="radio" name="novo-agendamento-profissional" value={p.id} checked={marcado} disabled={disabled} required
          onChange={() => onChange(p.id)} className="absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-xl opacity-0 disabled:cursor-not-allowed" />
        <span className="break-words font-semibold text-[var(--texto-principal)]">{p.nome_completo}</span>
        <span className="text-sm text-[var(--texto-secundario)]">{[p.especialidade_nome || 'Especialidade não informada', marcado ? `${p.duracao_consulta_minutos} min` : ''].filter(Boolean).join(' · ')}</span>
      </label>
    })}
  </div>
}

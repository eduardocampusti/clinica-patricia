import type { ClinicaEquipe } from '../../lib/equipe';
import { useId } from 'react';
import { objeto } from '../../lib/equipeFicha';
import { formatarCep, formatarTelefoneBrasil } from '../../lib/pacienteFormulario';
import { opcoesCampo, obterValor, mudarValor, type CampoFicha, type GrupoFicha, type OpcoesFicha } from '../../lib/equipeFichaFormulario';
export function CamposFicha({ campos, dados, onChange, opcoes, disabled = false }: {
    campos: CampoFicha[];
    dados: Record<string, unknown>;
    onChange: (d: Record<string, unknown>) => void;
    opcoes: OpcoesFicha;
    disabled?: boolean;
}) {
    const prefix = useId();
    return <div className="equipe-ficha-campos">{campos.filter(c => !c.quando || c.quando(dados)).map(c => { const id = prefix + c.chave, valor = obterValor(dados, c.chave); const alterar = (value: unknown) => onChange(mudarValor(dados, c.chave, value)); return <label key={c.chave} htmlFor={id} className={c.tipo === 'textarea' ? 'equipe-campo-amplo' : ''}><span>{c.label}</span>{c.tipo === 'checkbox' ? <input id={id} type="checkbox" checked={valor === true} onChange={e => alterar(e.target.checked)} disabled={disabled}/> : c.tipo === 'select' ? <select id={id} value={String(valor ?? '')} onChange={e => alterar(e.target.value)} disabled={disabled}><option value="">Selecione</option>{opcoesCampo(c, opcoes).filter(([v]) => v).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select> : c.tipo === 'textarea' ? <textarea id={id} value={String(valor ?? '')} onChange={e => alterar(e.target.value)} maxLength={1000} disabled={disabled}/> : <input id={id} type={c.tipo === 'date' || c.tipo === 'time' ? c.tipo : 'text'} value={String(valor ?? '')} onChange={e => alterar(c.chave.endsWith('cep') ? formatarCep(e.target.value) : c.chave.endsWith('telefone') ? formatarTelefoneBrasil(e.target.value) : e.target.value)} maxLength={c.chave === 'atividades' ? 1000 : 250} autoComplete="off" inputMode={['remuneracao', 'horas_semanais'].includes(c.chave) ? 'decimal' : undefined} disabled={disabled} data-privado={c.privado || undefined}/>}</label>; })}</div>;
}
export function GruposFicha({ grupos, dados, onChange, opcoes, disabled = false }: {
    grupos: GrupoFicha[];
    dados: Record<string, unknown>;
    onChange: (d: Record<string, unknown>) => void;
    opcoes: OpcoesFicha;
    disabled?: boolean;
}) { return <>{grupos.filter(g => !g.quando || g.quando(dados)).map(g => { const items = Array.isArray(dados[g.chave]) ? dados[g.chave] as unknown[] : []; return <fieldset key={g.chave} className="equipe-ficha-grupo"><legend>{g.label}</legend>{items.map((v, i) => { const d = g.simples ? { valor: v } : objeto(v); return <div key={String(d.id ?? i)} className="equipe-ficha-item"><CamposFicha dados={d} campos={g.campos} opcoes={opcoes} disabled={disabled} onChange={novo => { const arr = [...items]; arr[i] = g.simples ? novo.valor : novo; onChange({ ...dados, [g.chave]: arr }); }}/>{g.chave === 'registros' && <p className="text-sm">Conferência: {String(d.conferencia).replaceAll('_', ' ')}. Conferir a versão salva, abaixo.</p>}<button type="button" disabled={disabled} onClick={() => onChange({ ...dados, [g.chave]: items.filter((_, index) => index !== i) })}>Retirar {g.chave === 'registros' ? 'inscrição' : 'item'} do rascunho</button></div>; })}<button type="button" disabled={disabled || items.length >= 40} onClick={() => onChange({ ...dados, [g.chave]: [...items, g.simples ? '' : g.item()] })}>Adicionar {g.label.toLocaleLowerCase('pt-BR')}</button></fieldset>; })}</>; }
export function UnidadesFicha({ clinicas, unidades, onChange, disabled = false }: {
    clinicas: ClinicaEquipe[];
    unidades: string[];
    onChange: (v: string[]) => void;
    disabled?: boolean;
}) { return <fieldset className="equipe-ficha-unidades"><legend>Escopo autorizado / unidades de trabalho</legend>{clinicas.map(c => <label key={c.id}><input type="checkbox" disabled={disabled} checked={unidades.includes(c.id)} onChange={e => onChange(e.target.checked ? [...unidades, c.id] : unidades.filter(id => id !== c.id))}/>{c.nome}</label>)}<p>O registro vale para o conjunto escolhido. Administrar uma unidade não autoriza dados das demais.</p></fieldset>; }

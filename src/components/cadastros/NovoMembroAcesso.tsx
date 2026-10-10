import type { ClinicaEquipe } from '../../lib/equipe'
import type { PapelAcessoEquipe } from '../../lib/equipeAcessos'
import type { NovoAcesso } from '../../lib/acessoDiretoModelo'
import { DEPENDENCIA_ACESSO_DIRETO } from '../../lib/acessoDireto'
import { ACESSO_DIRETO_HABILITADO } from '../../config/acessoDireto'
import { FeedbackAlert } from '../feedback/FeedbackAlert'

export function NovoMembroAcesso({ value, clinicas, onChange, bloqueado }: { value: NovoAcesso; clinicas: ClinicaEquipe[]; onChange: (a: NovoAcesso) => void; bloqueado: boolean }) {
  const campo = 'min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3'
  return <fieldset disabled={bloqueado} className="equipe-secao-form space-y-4"><legend className="text-base font-semibold">Acesso ao sistema</legend>
    <p className="text-sm text-[var(--texto-secundario)]">O cadastro, a conta de login e os acessos por clínica são separados. O cargo não define o papel de acesso.</p>
    <div className="space-y-2">{([
      ['pessoa', 'Somente cadastrar a pessoa'], ['temporaria', 'Criar acesso com senha temporária'], ['convite', 'Enviar convite por e-mail'],
    ] as const).map(([modo, rotulo]) => <label key={modo} className="flex min-h-11 items-center gap-3"><input type="radio" name="novo-acesso" value={modo} checked={value.modo === modo} onChange={() => onChange({ ...value, modo })} />{rotulo}</label>)}</div>
    {value.modo === 'temporaria' && !ACESSO_DIRETO_HABILITADO && <FeedbackAlert variant="warning" title="Acesso direto ainda indisponível" description={DEPENDENCIA_ACESSO_DIRETO} />}
    {value.modo !== 'pessoa' && <>
      <div><label htmlFor="novo-email-login" className="text-sm font-medium">E-mail de login *</label><input className={`${campo} mt-1.5`} id="novo-email-login" type="email" autoComplete="off" value={value.email} onChange={e => onChange({ ...value, email: e.target.value })} required aria-describedby="novo-email-login-ajuda" /><p id="novo-email-login-ajuda" className="mt-1 text-sm text-[var(--texto-secundario)]">Pode ser diferente do e-mail de contato.</p></div>
      <fieldset className="space-y-3"><legend className="text-sm font-medium">Clínicas e papéis de acesso *</legend>
        {!clinicas.length && <p className="text-sm">Selecione primeiro as clínicas do cadastro.</p>}
        {clinicas.map(c => { const escopo = value.escopos.find(e => e.clinica_id === c.id); return <div key={c.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={!!escopo} onChange={e => onChange({ ...value, escopos: e.target.checked ? [...value.escopos, { clinica_id: c.id, papel: '' as PapelAcessoEquipe }] : value.escopos.filter(s => s.clinica_id !== c.id) })} />{c.nome}</label>{escopo && <select className={`${campo} sm:max-w-64`} aria-label={`Papel de acesso em ${c.nome}`} required value={escopo.papel} onChange={e => onChange({ ...value, escopos: value.escopos.map(s => s.clinica_id === c.id ? { ...s, papel: e.target.value as PapelAcessoEquipe } : s) })}><option value="">Selecione o papel</option><option value="proprietaria">Administradora</option><option value="medico">Médico</option><option value="recepcao">Recepção</option></select>}</div> })}
      </fieldset>
      <p className="text-sm text-[var(--texto-secundario)]">{value.modo === 'temporaria' ? 'Senha individual gerada pelo servidor, válida por 24 horas. Nenhum e-mail será enviado. O titular deve definir a senha pessoal antes de acessar dados.' : 'O convite mantém a confirmação pelo titular e a definição da própria senha.'}</p>
    </>}
  </fieldset>
}

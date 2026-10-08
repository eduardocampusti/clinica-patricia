import { objeto } from '../../lib/equipeFicha'
import { formatarData, rotuloLegivel, type Tom } from '../../lib/equipeApresentacao'
import { Selo } from './EquipeSelos'

// Formação e registros: contadores e uma linha por inscrição. Só apresentação dos dados já recebidos.

const INFORMACAO: Record<string, [string, Tom]> = { informado: ['Informado', 'neutro'], ativo: ['Ativo informado', 'ativo'], inativo: ['Inativo informado', 'alerta'], nao_confirmado: ['Não confirmado', 'neutro'] }
const CONFERENCIA: Record<string, [string, Tom]> = { aguardando: ['Aguardando', 'alerta'], conferido: ['Conferido', 'ativo'], necessita_correcao: ['Necessita correção', 'erro'] }
const lista = (v: unknown) => Array.isArray(v) ? v : []
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

export function ResumoFormacao({ dados }: { dados: Record<string, unknown> }) {
  const cursos = lista(dados.cursos), registros = lista(dados.registros), especialidades = lista(dados.especialidades)
  return <div className="equipe-formacao">
    <dl className="equipe-contadores">
      <div><dt>Formações</dt><dd>{plural(cursos.length, 'formação', 'formações')}</dd></div>
      <div><dt>Inscrições</dt><dd>{plural(registros.length, 'inscrição', 'inscrições')}</dd></div>
      <div><dt>Especialidades</dt><dd>{plural(especialidades.length, 'especialidade ou área', 'especialidades ou áreas')}</dd></div>
    </dl>
    {registros.length > 0 && <ul className="equipe-inscricoes">
      {registros.map(v => {
        const r = objeto(v)
        const [info, tomInfo] = INFORMACAO[String(r.situacao_informada)] ?? [rotuloLegivel(r.situacao_informada), 'neutro']
        const [conf, tomConf] = CONFERENCIA[String(r.conferencia)] ?? [rotuloLegivel(r.conferencia), 'neutro']
        return <li key={String(r.id)}>
          <span className="equipe-inscricao-numero">{String(r.conselho)}/{String(r.uf)} · {String(r.numero)}</span>
          <Selo tom={tomInfo}><span className="sr-only">informação: </span>{info}</Selo>
          <Selo tom={tomConf}><span className="sr-only">conferência: </span>{conf}</Selo>
          {r.conferido_em ? <span className="equipe-inscricao-conferida">Conferida em {formatarData(String(r.conferido_em).slice(0, 10))} · responsável registrado</span> : null}
        </li>
      })}
    </ul>}
  </div>
}

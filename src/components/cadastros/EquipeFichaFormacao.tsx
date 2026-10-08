import { objeto } from '../../lib/equipeFicha'
import { formatarData, rotuloLegivel, type Tom } from '../../lib/equipeApresentacao'
import { Selo } from './EquipeSelos'

// Formação e registros: contadores e uma linha por inscrição. Só apresentação dos dados já recebidos.

const INFORMACAO: Record<string, [string, Tom]> = { informado: ['Informado', 'neutro'], ativo: ['Ativo informado', 'ativo'], inativo: ['Inativo informado', 'alerta'], nao_confirmado: ['Não confirmado', 'neutro'] }
const CONFERENCIA: Record<string, [string, Tom]> = { aguardando: ['Aguardando', 'alerta'], conferido: ['Conferido', 'ativo'], necessita_correcao: ['Necessita correção', 'erro'] }
const lista = (v: unknown) => Array.isArray(v) ? v : []
const rotulo = (n: number, um: string, varios: string) => n === 1 ? um : varios

export function ResumoFormacao({ dados }: { dados: Record<string, unknown> }) {
  const cursos = lista(dados.cursos), registros = lista(dados.registros), especialidades = lista(dados.especialidades)
  if (!cursos.length && !registros.length && !especialidades.length) return <div className="equipe-estado-vazio equipe-formacao-vazia"><p>Nenhuma formação, inscrição ou especialidade registrada nesta ficha.</p></div>
  return <div className="equipe-formacao">
    <dl className="equipe-contadores">
      <div><dt>{rotulo(cursos.length, 'Formação', 'Formações')}</dt><dd>{cursos.length}</dd></div>
      <div><dt>{rotulo(registros.length, 'Inscrição', 'Inscrições')}</dt><dd>{registros.length}</dd></div>
      <div><dt>{rotulo(especialidades.length, 'Especialidade ou área', 'Especialidades ou áreas')}</dt><dd>{especialidades.length}</dd></div>
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

import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { objeto, type RegistroFicha } from '../../lib/equipeFicha'
import { formatarData, rotuloOpcao, textoJornada, textoRemuneracao, type Tom } from '../../lib/equipeApresentacao'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../ui/collapsible'
import { Selo } from './EquipeSelos'
import { Campo, GradeCampos } from './EquipeFichaUI'

// Apresentação de Contratos e jornada. Só formata o que a ficha já recebe; nenhum dado novo.

const TOM_SITUACAO: Record<string, Tom> = { vigente: 'ativo', em_preparacao: 'alerta', suspenso: 'erro', encerrado: 'neutro' }
const TOM_CONFERENCIA: Record<string, Tom> = { conferido: 'ativo', aguardando: 'alerta', necessita_correcao: 'erro' }

/**
 * Valor restrito: o conteúdo só é montado (e entra no HTML) depois do clique.
 * Quem vê o botão é quem já via o contrato; a permissão não muda.
 */
export function ValorRestrito({ valor, rotulo = 'Mostrar valor' }: { valor: () => ReactNode; rotulo?: string }) {
  const [visivel, setVisivel] = useState(false)
  if (!visivel) return <button type="button" className="equipe-link" onClick={() => setVisivel(true)}>{rotulo}</button>
  return <span className="equipe-valor-restrito"><span>{valor()}</span><button type="button" className="equipe-link" onClick={() => setVisivel(false)}>Ocultar valor</button></span>
}

function ResumoContrato({ dados }: { dados: Record<string, unknown> }) {
  const ctps = objeto(dados.ctps)
  const carga = String(dados.horas_semanais ?? '').trim()
  // CTPS aparece nas mesmas condições do formulário (vínculo CLT) ou quando já há valor.
  const mostrarCtps = dados.vinculo === 'clt' || Boolean(ctps.modalidade)
  return <GradeCampos colunas={3}>
    <Campo rotulo="Início" valor={formatarData(dados.admissao)} />
    <Campo rotulo="Vigência desta versão" valor={formatarData(dados.vigencia)} />
    <Campo rotulo="Carga semanal" valor={carga ? `${carga} h` : ''} />
    <Campo rotulo="Escala" valor={String(dados.escala ?? '')} />
    {mostrarCtps && <Campo rotulo="CTPS" valor={ctps.modalidade ? <span className="equipe-valor-selo">{rotuloOpcao('contrato', 'ctps.modalidade', ctps.modalidade).split(' — ')[0]}{ctps.conferencia ? <Selo tom={TOM_CONFERENCIA[String(ctps.conferencia)] ?? 'neutro'}>{rotuloOpcao('contrato', 'ctps.conferencia', ctps.conferencia)}</Selo> : null}</span> : ''} />}
    <Campo rotulo="Remuneração restrita" valor={<ValorRestrito valor={() => textoRemuneracao(dados)} />} />
    <Campo rotulo="Jornada informada" valor={textoJornada(dados.jornada)} amplo />
  </GradeCampos>
}

/**
 * Um cartão por contrato. O vigente começa aberto; os demais ficam numa linha com "Ver detalhes".
 * O formulário de edição (editor) continua montado; o resumo dá lugar a ele durante a edição, como antes.
 */
export function CartaoContrato({ contrato, empresa, unidades, editando, onEditar, editor, extras }: {
  contrato: RegistroFicha
  empresa: string
  unidades: string
  editando: boolean
  onEditar: () => void
  editor: ReactNode
  extras?: ReactNode
}) {
  const dados = contrato.dados
  const [aberto, setAberto] = useState(dados.situacao === 'vigente')
  const editar = () => { setAberto(true); onEditar() }
  return <Collapsible open={aberto || editando} onOpenChange={setAberto} className="equipe-cartao equipe-ficha-contrato">
    <div className="equipe-contrato-topo">
      <div className="equipe-contrato-identidade">
        <h4>{String(dados.cargo || 'Cargo não informado')} · {empresa}</h4>
        <div className="equipe-contrato-selos">
          {dados.situacao ? <Selo tom={TOM_SITUACAO[String(dados.situacao)] ?? 'neutro'}>{rotuloOpcao('contrato', 'situacao', dados.situacao)}</Selo> : null}
          {dados.vinculo ? <Selo tom="neutro">{rotuloOpcao('contrato', 'vinculo', dados.vinculo)}</Selo> : null}
          <Selo tom="neutro">Versão {contrato.revisao}</Selo>
        </div>
        <p className="equipe-contrato-unidades">{unidades}</p>
      </div>
      <div className="equipe-contrato-acoes">
        {!editando && <button type="button" className="equipe-acao-cartao" onClick={editar}>Editar contrato</button>}
        {!editando && <CollapsibleTrigger className="equipe-contrato-detalhes"><ChevronRight aria-hidden="true" className="equipe-recolhivel-icone" />{aberto ? 'Ocultar detalhes' : 'Ver detalhes'}</CollapsibleTrigger>}
      </div>
    </div>
    <CollapsiblePanel className="equipe-contrato-corpo">
      {!editando && <ResumoContrato dados={dados} />}
      {editor}
      {extras}
    </CollapsiblePanel>
  </Collapsible>
}

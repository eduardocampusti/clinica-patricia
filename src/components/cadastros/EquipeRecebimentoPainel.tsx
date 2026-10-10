import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog'
import type { ResumoRecebimento } from '../../lib/equipeApresentacao'
import { buscarRecebimentoEquipe, CAMPOS_PROTEGIDOS, erroRecursosSeguro, salvarRecebimentoEquipe, validarRecebimento, type DadosRecebimento, type RecebimentoEquipe } from '../../lib/equipeRecursos'
import type { ClinicaEquipe } from '../../lib/equipe'
import type { EstadoRecursoFicha } from './EquipeFotoPainel'
import { supabase } from '../../lib/supabase'
import { Esqueleto, NotaInfo } from './EquipeFichaUI'

const TIPO_PIX: Record<string, string> = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Aleatória' }
const TIPO_CONTA: Record<string, string> = { corrente: 'corrente', poupanca: 'poupança', pagamento: 'de pagamento' }

function vazio():DadosRecebimento{return {preferencia:'pix',pix:{tipo:'email',chave:''},conta:null,favorecido:{tipo:'pf',nome:'',documento:'',diferente:false}}}
function novaConta():NonNullable<DadosRecebimento['conta']>{return {instituicao:'',codigo:'',agencia:'',digitoAgencia:'',numero:'',digitoConta:'',tipo:'corrente'}}
function prepararEdicao(d:DadosRecebimento|null):{dados:DadosRecebimento;preservar:string[]} {
  const dados=d?structuredClone(d):vazio();const preservar:string[]=[]
  for(const p of CAMPOS_PROTEGIDOS){const [g,c]=p.split('.');const grupo=dados[g as 'pix'|'conta'|'favorecido'] as unknown as Record<string,string>|null;if(grupo?.[c]){preservar.push(p);grupo[c]=''}}
  return {dados,preservar}
}
function EditorRecebimento({membroId,clinicaId,clinicaNome,onEstado,onModo,onSituacao,onResumo}:{membroId:string;clinicaId:string;clinicaNome:string;onEstado:(s:EstadoRecursoFicha)=>void;onModo:(b:boolean)=>void;onSituacao?:(s:'configurado'|'ausente'|'indisponivel')=>void;onResumo?:(r:ResumoRecebimento|null)=>void}) {
  const [atual,setAtual]=useState<RecebimentoEquipe|null>(null)
  const [carregando,setCarregando]=useState(true);const [editando,setEditando]=useState(false)
  const [dados,setDados]=useState<DadosRecebimento>(vazio);const [preservar,setPreservar]=useState<string[]>([])
  const [erro,setErro]=useState<string|null>(null);const [campo,setCampo]=useState<string|null>(null);const [sucesso,setSucesso]=useState<string|null>(null)
  const [ocupado,setOcupado]=useState(false);const [bloqueado,setBloqueado]=useState(false);const [descartar,setDescartar]=useState(false)
  const trava=useRef(false);const geracao=useRef(0);const form=useRef<HTMLFormElement>(null);const id=useId()
  useEffect(()=>{onSituacao?.(carregando||!atual?'indisponivel':atual.dados?'configurado':'ausente')},[atual,carregando,onSituacao])
  // Resumo da Visão geral: só preferência e nome do favorecido, já carregados aqui (sem chave nem conta).
  useEffect(()=>{onResumo?.(atual?.dados?{preferencia:atual.dados.preferencia,favorecido:atual.dados.favorecido.nome}:null)},[atual,onResumo])
  useEffect(()=>{onEstado({ocupado,alterado:editando});onModo(editando||ocupado)},[editando,ocupado,onEstado,onModo])
  const consultar=useCallback(async()=>{
    const versao=++geracao.current;setCarregando(true);setErro(null)
    try {const r=await buscarRecebimentoEquipe(membroId,clinicaId);if(versao===geracao.current){setAtual(r);setBloqueado(false);setEditando(false);setDados(vazio());setPreservar([]);setCampo(null)}}
    catch(e){if(versao===geracao.current){setAtual(null);setErro(erroRecursosSeguro(e).message)}}
    finally{if(versao===geracao.current)setCarregando(false)}
  },[membroId,clinicaId])
  useEffect(()=>{void consultar();const invalidar=()=>{geracao.current++};return invalidar},[consultar])
  useEffect(()=>{const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){geracao.current++;setAtual(null);setEditando(false);setDados(vazio());setPreservar([]);setErro('Entre novamente para consultar a configuração.');setCarregando(false);setOcupado(false);setBloqueado(true);setDescartar(false);setSucesso(null);trava.current=false}});return()=>data.subscription.unsubscribe()},[])
  function editar(){if(!atual)return;const e=prepararEdicao(atual.dados);setDados(e.dados);setPreservar(e.preservar);setEditando(true);setErro(null);setSucesso(null)}
  function cancelar(){setEditando(false);setDados(vazio());setPreservar([]);setCampo(null);setSucesso(null);setErro(null);setDescartar(false)}
  function atualizar(grupo:'pix'|'conta'|'favorecido',nome:string,valor:string|boolean){
    setDados(d=>({...d,[grupo]:{...d[grupo],[nome]:valor}}))
    const contexto=nome==='tipo'||(grupo==='conta'&&['instituicao','codigo'].includes(nome))
    if(contexto){setPreservar(p=>p.filter(c=>!c.startsWith(grupo+'.')));setDados(d=>{const prox=structuredClone(d);for(const c of CAMPOS_PROTEGIDOS.filter(c=>c.startsWith(grupo+'.'))){const [,n]=c.split('.');(prox[grupo] as unknown as Record<string,string>)[n]=''}return prox})}
    else setPreservar(p=>p.filter(c=>c!==`${grupo}.${nome}`))
    setCampo(null)
  }
  async function salvar(e:FormEvent){
    e.preventDefault();if(!atual||trava.current||bloqueado)return
    let validado:DadosRecebimento
    try{validado=validarRecebimento(dados,preservar)}catch(e){const r=erroRecursosSeguro(e);setErro(r.message);setCampo(r.campo??null);requestAnimationFrame(()=>form.current?.querySelector<HTMLElement>(`[data-recebimento-campo="${r.campo}"]`)?.focus());return}
    const ciclo=geracao.current;trava.current=true;setOcupado(true);setErro(null)
    try{const confirmado=await salvarRecebimentoEquipe(atual,validado,preservar);if(ciclo!==geracao.current)return;setAtual(confirmado);setEditando(false);setDados(vazio());setPreservar([]);setCampo(null);setSucesso('Dados de recebimento salvos nesta clínica.')}
    catch(e){if(ciclo===geracao.current){const r=erroRecursosSeguro(e,true);setErro(r.message);setCampo(r.campo??null);setBloqueado(['RESULTADO_INCERTO','CONFLITO','NAO_AUTORIZADO'].includes(r.codigo))}}
    finally{if(ciclo===geracao.current){trava.current=false;setOcupado(false)}}
  }
  const campoTexto=(grupo:'pix'|'conta'|'favorecido',nome:string,label:string,opcional=false)=>{
    const caminho=`${grupo}.${nome}`;const v=dados[grupo] as unknown as Record<string,string>;const masked=atual?.dados?.[grupo] as unknown as Record<string,string>|undefined
    return <div><label htmlFor={`${id}-${caminho}`}>{label}{opcional?' (opcional)':''}</label><input id={`${id}-${caminho}`} data-recebimento-campo={caminho} aria-invalid={campo===caminho} value={v[nome]} onChange={e=>atualizar(grupo,nome,e.target.value)} autoComplete="off" spellCheck={false} maxLength={grupo==='pix'?254:nome==='nome'?160:120} placeholder={preservar.includes(caminho)?`Mantido: ${masked?.[nome]??'protegido'}`:undefined}/>{preservar.includes(caminho)&&<p className="equipe-recurso-ajuda">Deixe vazio para manter o dado protegido. Ao preencher, você o substituirá.</p>}</div>
  }
  return <div data-testid="equipe-recebimento-editor">
    {carregando?<Esqueleto rotulo="Consultando configuração autorizada…" linhas={2}/>:!atual?<><FeedbackAlert variant="warning" title="Recebimento indisponível" description={erro??'A configuração não pôde ser consultada.'}/><button type="button" className="equipe-recurso-consulta" onClick={()=>void consultar()}>Reconsultar recebimento</button></>:<>
      {erro&&<FeedbackAlert variant="destructive" title="Confira os dados de recebimento" description={erro} urgent/>}
      {sucesso&&<FeedbackAlert variant="success" title={sucesso}/>}
      {!editando?<div className="equipe-recebimento-resumo">{!atual.dados?<p className="equipe-texto-discreto">Não há dados de recebimento cadastrados nesta clínica. O cadastro do profissional continua disponível.</p>:<dl className="equipe-grade-campos equipe-grade-2">
        <div><dt>Preferência</dt><dd>{atual.dados.preferencia==='pix'?'PIX':'Transferência'}</dd></div>
        {atual.dados.pix&&<div><dt>Chave PIX · {TIPO_PIX[atual.dados.pix.tipo]??atual.dados.pix.tipo}</dt><dd>{atual.dados.pix.chave}</dd></div>}
        {atual.dados.conta&&<><div><dt>Instituição · conta {TIPO_CONTA[atual.dados.conta.tipo]??atual.dados.conta.tipo}</dt><dd>{atual.dados.conta.instituicao}{atual.dados.conta.codigo&&` · ${atual.dados.conta.codigo}`}</dd></div><div><dt>Agência / conta</dt><dd>{atual.dados.conta.agencia||'Sem agência'}{atual.dados.conta.digitoAgencia&&`-${atual.dados.conta.digitoAgencia}`} / {atual.dados.conta.numero}{atual.dados.conta.digitoConta&&`-${atual.dados.conta.digitoConta}`}</dd></div></>}
        <div><dt>Favorecido · {atual.dados.favorecido.tipo==='pf'?'Pessoa física':'Pessoa jurídica'}</dt><dd>{atual.dados.favorecido.nome}{atual.dados.favorecido.documento&&` · ${atual.dados.favorecido.documento}`}</dd></div>
        <div><dt>Favorecido diferente do profissional</dt><dd>{atual.dados.favorecido.diferente?'Sim, informado no cadastro':'Não, informado no cadastro'}</dd></div>
      </dl>}<button type="button" className="equipe-acao-cartao equipe-recurso-consulta" onClick={editar}>{atual.dados?'Editar recebimento':'Cadastrar dados de recebimento'}</button></div>:<form ref={form} onSubmit={salvar} aria-label={`Dados para recebimento em ${clinicaNome}`}>
        <fieldset disabled={ocupado||bloqueado} className="equipe-recebimento-campos">
          <div className="equipe-recebimento-grid"><div><label htmlFor={`${id}-preferencia`}>Meio preferencial</label><select id={`${id}-preferencia`} data-recebimento-campo="preferencia" aria-invalid={campo==='preferencia'} value={dados.preferencia} onChange={e=>setDados(d=>({...d,preferencia:e.target.value as DadosRecebimento['preferencia']}))}><option value="pix">PIX</option><option value="transferencia">Transferência</option></select></div></div>
          <div className="equipe-recebimento-grupo"><label className="equipe-recurso-checkbox"><input type="checkbox" checked={Boolean(dados.pix)} onChange={e=>{setDados(d=>({...d,pix:e.target.checked?{tipo:'email',chave:''}:null}));setPreservar(p=>p.filter(c=>!c.startsWith('pix.')))}}/>Cadastrar PIX</label>
            {dados.pix&&<div className="equipe-recebimento-grid"><div><label htmlFor={`${id}-pix-tipo`}>Tipo de chave PIX</label><select id={`${id}-pix-tipo`} value={dados.pix.tipo} onChange={e=>atualizar('pix','tipo',e.target.value)}><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option></select></div>{campoTexto('pix','chave','Chave PIX')}</div>}
          </div>
          <div className="equipe-recebimento-grupo"><label className="equipe-recurso-checkbox"><input type="checkbox" checked={Boolean(dados.conta)} onChange={e=>{setDados(d=>({...d,conta:e.target.checked?novaConta():null}));setPreservar(p=>p.filter(c=>!c.startsWith('conta.')))}}/>Cadastrar conta para transferência</label>
            {dados.conta&&<div className="equipe-recebimento-grid">{campoTexto('conta','instituicao','Banco ou instituição')}{campoTexto('conta','codigo','Código da instituição',true)}{campoTexto('conta','agencia','Agência',true)}{campoTexto('conta','digitoAgencia','Dígito da agência',true)}{campoTexto('conta','numero','Número da conta')}{campoTexto('conta','digitoConta','Dígito da conta',true)}<div><label htmlFor={`${id}-conta-tipo`}>Tipo de conta</label><select id={`${id}-conta-tipo`} value={dados.conta.tipo} onChange={e=>atualizar('conta','tipo',e.target.value)}><option value="corrente">Corrente</option><option value="poupanca">Poupança</option><option value="pagamento">Pagamento</option></select></div></div>}
          </div>
          <div className="equipe-recebimento-grupo"><h4>Favorecido</h4><div className="equipe-recebimento-grid"><div><label htmlFor={`${id}-fav-tipo`}>Tipo de favorecido</label><select id={`${id}-fav-tipo`} value={dados.favorecido.tipo} onChange={e=>atualizar('favorecido','tipo',e.target.value)}><option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option></select></div>{campoTexto('favorecido','nome',dados.favorecido.tipo==='pf'?'Nome completo do favorecido':'Razão social do favorecido')}{campoTexto('favorecido','documento',dados.favorecido.tipo==='pf'?'CPF do favorecido':'CNPJ do favorecido',!dados.conta)}</div><label className="equipe-recurso-checkbox"><input type="checkbox" checked={dados.favorecido.diferente} onChange={e=>atualizar('favorecido','diferente',e.target.checked)}/>O favorecido é diferente do profissional</label></div>
        </fieldset>
        <p className="equipe-recurso-ajuda">Informe somente os meios desejados. Não copiamos CPF ou telefone do cadastro da pessoa. Dados preservados não são exibidos integralmente.</p>
        <div className="equipe-recurso-acoes"><button type="submit" className="equipe-recurso-primario" disabled={ocupado||bloqueado} aria-busy={ocupado}>{ocupado?'Salvando…':'Salvar recebimento'}</button><button type="button" disabled={ocupado} onClick={()=>setDescartar(true)}>Cancelar recebimento</button>{bloqueado&&<button type="button" disabled={ocupado} onClick={()=>setDescartar(true)}>Reconsultar configuração</button>}</div>
      </form>}
    </>}
    <ConfirmacaoDialog open={descartar} onOpenChange={setDescartar} title={bloqueado?'Reconsultar dados confirmados?':'Cancelar edição de recebimento?'} description="Os dados digitados nesta edição serão descartados. Nenhum pagamento, acesso ou cadastro de pessoa será alterado." confirmLabel={bloqueado?'Descartar edição e reconsultar':'Descartar edição'} tone="warning" onConfirm={()=>{cancelar();if(bloqueado)void consultar()}} disabled={ocupado}/>
  </div>
}
export function EquipeRecebimentoPainel({membroId,clinicaId,clinicas,onEstado,onSituacao,onResumo}:{membroId:string;clinicaId:string;clinicas:ClinicaEquipe[];onEstado:(s:EstadoRecursoFicha)=>void;onSituacao?:(s:'configurado'|'ausente'|'indisponivel')=>void;onResumo?:(r:ResumoRecebimento|null)=>void}) {
  const [selecionada,setSelecionada]=useState(clinicaId);const [emEdicao,setEmEdicao]=useState(false)
  const opcoes=clinicas.filter(c=>c.id===clinicaId||c.nome.toLowerCase().includes('brotas')||c.nome.toLowerCase().includes('ipupiara'))
  return <section className="equipe-recurso equipe-cartao equipe-recebimento" aria-labelledby="equipe-recebimento-titulo" data-testid="equipe-recebimento-painel"><div className="equipe-cartao-topo"><h4 id="equipe-recebimento-titulo">Dados para recebimento</h4></div><p className="equipe-texto-discreto">Configuração opcional do profissional nesta clínica. Não executa PIX, pagamentos ou alterações em repasses.</p>
    <div className="equipe-recebimento-clinica"><label htmlFor="equipe-recebimento-clinica">Clínica dos dados de recebimento</label><select id="equipe-recebimento-clinica" value={selecionada} disabled={emEdicao} onChange={e=>setSelecionada(e.target.value)}>{opcoes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>{emEdicao&&<p className="equipe-recurso-ajuda">Conclua ou cancele a edição antes de consultar outra clínica.</p>}</div>
    <EditorRecebimento key={`${membroId}:${selecionada}`} membroId={membroId} clinicaId={selecionada} clinicaNome={opcoes.find(c=>c.id===selecionada)?.nome??'clínica selecionada'} onEstado={onEstado} onModo={setEmEdicao} onSituacao={selecionada===clinicaId?onSituacao:undefined} onResumo={selecionada===clinicaId?onResumo:undefined}/>
    <NotaInfo>A titularidade da chave e da conta não foi verificada; o favorecido é informado pela administração. Somente Proprietário(a)/Administradora autorizada consulta e altera esta configuração.</NotaInfo>
  </section>
}

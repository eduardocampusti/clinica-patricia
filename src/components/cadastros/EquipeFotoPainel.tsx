import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { EquipeAvatar, type FotoEquipeDisponivel } from './EquipeAvatar'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog'
import { erroRecursosSeguro, ErroRecursoEquipe, salvarFotoEquipe, type FotoEquipeMeta } from '../../lib/equipeRecursos'
import { FOTO_MAX_BYTES, verificarCabecalhoFoto } from '../../../supabase/functions/_shared/equipeFoto'
import { supabase } from '../../lib/supabase'
export interface EstadoRecursoFicha { ocupado:boolean; alterado:boolean }

export function EquipeFotoPainel({membroId,nome,clinicaId,meta,foto,erroConsulta,carregando,onReconsultar,onEstado}:{
  membroId:string;nome:string;clinicaId:string;meta?:FotoEquipeMeta;foto?:FotoEquipeDisponivel;erroConsulta:string|null;carregando:boolean
  onReconsultar:()=>Promise<boolean>;onEstado:(s:EstadoRecursoFicha)=>void
}) {
  const [arquivo,setArquivo]=useState<File|null>(null)
  const [preview,setPreview]=useState<string|null>(null)
  const [ocupado,setOcupado]=useState(false)
  const [erro,setErro]=useState<string|null>(null)
  const [sucesso,setSucesso]=useState<string|null>(null)
  const [bloqueado,setBloqueado]=useState(false)
  const [remover,setRemover]=useState(false)
  const trava=useRef(false);const geracao=useRef(0);const input=useRef<HTMLInputElement>(null)
  useEffect(()=>{onEstado({ocupado,alterado:Boolean(arquivo)})},[ocupado,arquivo,onEstado])
  useEffect(()=>()=>{geracao.current++},[])
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
  useEffect(()=>{const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){geracao.current++;setArquivo(null);setPreview(null);setErro(null);setSucesso(null);setRemover(false);setOcupado(false);setBloqueado(true);trava.current=false;if(input.current)input.current.value=''}});return()=>data.subscription.unsubscribe()},[])
  function cancelar(){setArquivo(null);setPreview(null);setErro(null);setSucesso(null);if(input.current)input.current.value=''}
  async function selecionar(e:ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0];if(!f||trava.current)return
    const atual=++geracao.current;trava.current=true;setOcupado(true);setErro(null);setSucesso(null)
    try {
      if(f.size>FOTO_MAX_BYTES||!['image/jpeg','image/png'].includes(f.type))throw new ErroRecursoEquipe('FOTO_INVALIDA','Use uma foto JPEG ou PNG válida de até 5 MB.')
      verificarCabecalhoFoto(new Uint8Array(await f.arrayBuffer()),f.type)
      const bitmap=await createImageBitmap(f);bitmap.close()
      if(atual===geracao.current){setArquivo(f);setPreview(URL.createObjectURL(f))}
    } catch(err){if(atual===geracao.current){setErro(erroRecursosSeguro(err).message);if(input.current)input.current.value=''}}
    finally{if(atual===geracao.current){trava.current=false;setOcupado(false)}}
  }
  async function salvar(remocao=false){
    if(!meta||trava.current||bloqueado||!meta.pode_editar||(!arquivo&&!remocao))return
    const atual=geracao.current;trava.current=true;setOcupado(true);setErro(null);setSucesso(null);setRemover(false)
    try {
      const r=await salvarFotoEquipe(meta,remocao?null:arquivo)
      if(atual!==geracao.current)return
      setArquivo(null);setPreview(null);if(input.current)input.current.value=''
      const atualizado=await onReconsultar()
      if(atual!==geracao.current)return
      setBloqueado(!atualizado)
      setSucesso(atualizado?(remocao?'Foto removida.':'Foto salva e atualizada na equipe.'):'A operação foi confirmada, mas a imagem ainda precisa ser reconsultada.')
      if(r.limpezaPendente)setErro('A foto foi confirmada. A limpeza de arquivos antigos ficou pendente no servidor; não repita a alteração.')
    } catch(e){if(atual===geracao.current){const r=erroRecursosSeguro(e,true);setErro(r.message);setBloqueado(['RESULTADO_INCERTO','CONFLITO','NAO_AUTORIZADO'].includes(r.codigo))}}
    finally{if(atual===geracao.current){trava.current=false;setOcupado(false)}}
  }
  async function consultar(){if(trava.current)return;trava.current=true;setOcupado(true);try{if(await onReconsultar()){cancelar();setBloqueado(false)}}finally{trava.current=false;setOcupado(false)}}
  return <section className="equipe-recurso" aria-labelledby="equipe-foto-titulo" data-testid="equipe-foto-painel">
    <div className="equipe-recurso-cabecalho"><div><h3 id="equipe-foto-titulo">Foto da equipe</h3><p>A foto identifica este membro nas clínicas vinculadas, independentemente do login.</p></div></div>
    <div className="equipe-foto-conteudo"><div className="equipe-foto-preview">{preview?<img src={preview} alt="Prévia da foto selecionada"/>:<EquipeAvatar membroId={membroId} clinicaId={clinicaId} nome={nome} foto={foto}/>}</div>
      <div className="equipe-foto-controles">
        {carregando?<p role="status">Consultando foto autorizada…</p>:erroConsulta?<FeedbackAlert variant="warning" title="Foto indisponível" description={erroConsulta}/>:!meta?<p>A foto ainda não pode ser gerenciada neste ambiente.</p>:!meta.pode_editar?<p>A alteração da foto exige administração de todas as clínicas vinculadas a este membro.</p>:<>
          <label className="equipe-recurso-label" htmlFor="equipe-foto-arquivo">{meta.caminho?'Substituir foto':'Adicionar foto'}</label>
          <input ref={input} id="equipe-foto-arquivo" type="file" accept="image/jpeg,image/png" disabled={ocupado||bloqueado} onChange={e=>void selecionar(e)}/>
          <p className="equipe-recurso-ajuda">JPEG ou PNG, até 5 MB; 32 a 4096 px e até 8 megapixels. Metadados serão removidos no servidor.</p>
          <div className="equipe-recurso-acoes"><button type="button" className="equipe-recurso-primario" disabled={ocupado||bloqueado||!arquivo} onClick={()=>void salvar()}>Salvar foto</button>
            {arquivo&&<button type="button" disabled={ocupado} onClick={cancelar}>Cancelar foto</button>}
            {meta.caminho&&<button type="button" disabled={ocupado||bloqueado} onClick={()=>setRemover(true)}>Remover foto</button>}</div>
        </>}
        {(erroConsulta||bloqueado||!meta)&&<button type="button" className="equipe-recurso-consulta" disabled={ocupado||carregando} onClick={()=>void consultar()}>Reconsultar foto</button>}
      </div></div>
    {erro&&<FeedbackAlert variant="destructive" title="Confira a foto" description={erro} urgent/>}
    {sucesso&&<FeedbackAlert variant="success" title={sucesso}/>}
    <ConfirmacaoDialog open={remover} onOpenChange={setRemover} title="Remover foto da equipe?" description="O membro será apresentado pelas iniciais em todas as clínicas vinculadas. Os demais dados serão preservados." confirmLabel="Remover foto" disabled={ocupado} onConfirm={()=>void salvar(true)}/>
  </section>
}

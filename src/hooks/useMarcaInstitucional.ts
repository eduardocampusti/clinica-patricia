import { useEffect, useState } from 'react'
import { BACKEND_CONFIGURACOES_HABILITADO, PADRAO, resolverTipoDocumento, type SnapshotTimbrado } from '../lib/configuracoes'
import { supabase } from '../lib/supabase'
export async function consultarTimbradoAplicado(clinicaId:string,tipo:SnapshotTimbrado['tipo']='padrao'):Promise<SnapshotTimbrado|null> {
  if(!BACKEND_CONFIGURACOES_HABILITADO)return null
  const r=await supabase.rpc('configuracoes_timbrado_consultar',{p_clinica:clinicaId})
  if(r.error||!r.data)throw new Error('Timbrado aplicado indisponível. Reconsulte antes de emitir o PDF.')
  const a=resolverTipoDocumento(r.data.geral,r.data.geralVariacoes??{},r.data.campos,r.data.variacoes??{},tipo)
  const paths=[...new Set([a.logoPrincipal,a.logoImpressao,a.logoCompacta,a.favicon].filter(Boolean))]
  const ativos:Record<string,string>={}
  if(paths.length){const s=await supabase.storage.from('institucionais').createSignedUrls(paths,3600);if(s.error)throw new Error('Imagens institucionais indisponíveis.');for(const d of s.data??[])if(d.path&&d.signedUrl)ativos[d.path]=d.signedUrl}
  return {escopo:clinicaId,versao:r.data.versao,versaoGeral:r.data.geralVersao??0,fonteRevisao:r.data.fonteRevisao??'',tipo,instituicao:r.data.instituicao,apresentacao:a,ativos}
}
export function useMarcaInstitucional(clinicaId:string|null) {
  const [marca,setMarca]=useState<{id:string;snapshot:SnapshotTimbrado}|null>(null)
  const [revisao,setRevisao]=useState(0)
  useEffect(()=>{const h=()=>setRevisao(v=>v+1);window.addEventListener('clinica:configuracao-aplicada',h);return()=>window.removeEventListener('clinica:configuracao-aplicada',h)},[])
  useEffect(()=>{let vivo=true;setMarca(null);if(clinicaId)void consultarTimbradoAplicado(clinicaId).then(s=>{if(vivo&&s)setMarca({id:clinicaId,snapshot:s})}).catch(()=>{/* mantém marca oficial de fallback */});return()=>{vivo=false}},[clinicaId,revisao])
  const atual=marca?.id===clinicaId?marca.snapshot:null
  return {snapshot:atual,apresentacao:atual?.apresentacao??PADRAO,logo:atual?.ativos[atual.apresentacao.logoCompacta]}
}

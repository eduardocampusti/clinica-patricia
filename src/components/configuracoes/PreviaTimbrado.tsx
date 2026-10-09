import {useEffect,useState} from 'react'
import type {SnapshotTimbrado} from '../../lib/configuracoes'
import type {PreviaTimbrado} from '../../lib/timbradoPdf'

export function PreviaTimbradoAutomatica({snapshot}:{snapshot:SnapshotTimbrado}) {
  const [previa,setPrevia]=useState<PreviaTimbrado|null>(null),[estado,setEstado]=useState('Atualizando prévia…'),[erro,setErro]=useState('')
  // Dependência estável: renderizações da tela sem alteração do modelo não recalculam.
  const chave=JSON.stringify(snapshot)
  useEffect(()=>{
    let atual=true
    const controller=new AbortController()
    setEstado('Atualizando prévia…');setErro('')
    const timer=setTimeout(()=>{
      void (async()=>{
        const s=JSON.parse(chave) as SnapshotTimbrado
        const {prepararPreviaTimbrado,CONTEUDO_DEMONSTRACAO}=await import('../../lib/timbradoPdf')
        const [p]=await Promise.all([prepararPreviaTimbrado(s,CONTEUDO_DEMONSTRACAO,controller.signal),document.fonts.load('12px "Noto Sans Timbrado"')])
        if(atual){setPrevia(p);setEstado('Prévia atualizada')}
      })().catch(e=>{if(atual){setPrevia(null);setErro(e instanceof Error?e.message:'Não foi possível atualizar a prévia.');setEstado('Prévia indisponível')}})
    },500)
    return()=>{atual=false;clearTimeout(timer);controller.abort()}
  },[chave])
  return <div className="cfg-previsualizacao"><p className="cfg-ajuda" role="status">{estado}</p>{erro&&<p className="cfg-ajuda" role="alert">{erro}</p>}{previa&&<svg viewBox="0 0 210 297" role="img" aria-label="Prévia A4 da primeira página, com dados fictícios" className="cfg-papel">
    <rect width="210" height="297" fill="white"/>
    {previa.marcaDagua&&<text x="105" y="155" textAnchor="middle" transform="rotate(-35 105 155)" fontSize={28*25.4/72} opacity=".07">{previa.marcaDagua}</text>}
    {previa.logo&&<image href={previa.logo.data} x={previa.logoX} y={previa.margem} width={previa.logo.width} height={previa.logo.height} preserveAspectRatio="xMidYMid meet"/>}
    {previa.textos.map((t,n)=><text key={n} x={t.x} y={t.y} fontSize={t.tamanho*25.4/72} fontWeight={t.negrito?700:400} textAnchor={t.alinhamento==='left'?'start':t.alinhamento==='right'?'end':'middle'}>{t.texto}</text>)}
  </svg>}<p className="cfg-ajuda">Primeira página · apresentação em edição com dados fictícios. Gere o PDF para conferir todas as páginas.</p></div>
}

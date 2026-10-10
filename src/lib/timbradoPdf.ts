import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { comporLinhas, validarPersonalizacao, type SnapshotTimbrado } from '../../supabase/functions/_shared/configuracoes'
import { FONTE_TIMBRADO, incorporarFontesTimbrado } from './timbradoFontes'
export interface BlocoTexto { texto: string; titulo?: boolean }
export interface BlocoTabela { colunas: string[]; linhas: string[][] }
const mmPorPonto=25.4/72
interface LogoTimbrado {data:string;formato:'PNG'|'JPEG';width:number;height:number}
export interface TextoPrevia {texto:string;x:number;y:number;tamanho:number;negrito:boolean;alinhamento:'left'|'center'|'right'}
export interface PreviaTimbrado {textos:TextoPrevia[];logo:LogoTimbrado|null;logoX:number;margem:number;topo:number;fim:number;marcaDagua:string}
// As duas saídas compartilham fonte, quebra de linha e geometria; a prévia não emite PDF.
async function prepararTimbrado(snapshot:SnapshotTimbrado,signal?:AbortSignal) {
  validarPersonalizacao(snapshot.apresentacao)
  const a=snapshot.apresentacao,i=snapshot.instituicao,m=a.margem,w=210-2*m
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true})
  await incorporarFontesTimbrado(doc,signal)
  const linhas=(texts:string[],size:number,peso='normal')=> {doc.setFont(FONTE_TIMBRADO,peso);doc.setFontSize(size);return texts.flatMap(t=>doc.splitTextToSize(t,w) as string[])}
  const cab=linhas(comporLinhas(a.cabecalho,i),9),rod=linhas(comporLinhas(a.rodape,i),8)
  let logo: LogoTimbrado|null=null
  const logoPath=a.logoImpressao
  if(logoPath) {
    const url=snapshot.ativos[logoPath];if(!url)throw new Error('Logo de impressão indisponível. Reconsulte ou remova a logo da demonstração.')
    const resp=await fetch(url,{signal});if(!resp.ok)throw new Error('Não foi possível carregar a logo. Nada foi emitido.')
    const b=await resp.blob();const bitmap=await createImageBitmap(b)
    try {const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Falha na logo.'));reader.readAsDataURL(b)})
      const width=Math.min(a.logoLargura,bitmap.width/bitmap.height*24);logo={data,formato:b.type==='image/png'?'PNG':'JPEG',width,height:width*bitmap.height/bitmap.width}
    }finally{bitmap.close()}
  }
  const nome=i.nomeExibicao||i.nomeFantasia||i.nome
  const nomes=a.nomeInstitucional?linhas([nome],12,'bold'):[]
  const topo=m+(logo?logo.height+a.espaco:0)+nomes.length*5+cab.length*4+a.espaco+6
  const fim=297-m-rod.length*3.8-8-a.espaco
  if(topo+25>fim)throw new Error('Cabeçalho e rodapé excedem a área útil. Reduza as linhas ou o tamanho da logo.')
  return {doc,cab,rod,logo,nomes,topo,fim,m,w}
}
function medirBloco(doc:jsPDF,bloco:BlocoTexto,w:number,espaco:number) {
  doc.setFont(FONTE_TIMBRADO,bloco.titulo?'bold':'normal');doc.setFontSize(bloco.titulo?12:10)
  const altura=(bloco.titulo?12:10)*mmPorPonto*1.45
  const linhas=doc.splitTextToSize(bloco.texto,w) as string[]
  return {altura,linhas,reserva:linhas.length*altura+(bloco.titulo?espaco+10:0)}
}
export async function prepararPreviaTimbrado(snapshot:SnapshotTimbrado,conteudo:BlocoTexto[],signal?:AbortSignal):Promise<PreviaTimbrado> {
  const {doc,cab,rod,logo,nomes,topo,fim,m,w}=await prepararTimbrado(snapshot,signal),a=snapshot.apresentacao
  signal?.throwIfAborted()
  const textos:TextoPrevia[]=[]
  const adicionar=(texto:string,x:number,y:number,tamanho:number,negrito=false,alinhamento:TextoPrevia['alinhamento']='left')=>textos.push({texto,x,y,tamanho,negrito,alinhamento})
  const x=a.alinhamento==='left'?m:a.alinhamento==='right'?210-m:105
  let h=m+(logo?logo.height+a.espaco:0)
  for(const t of nomes){adicionar(t,x,h+4,12,true,a.alinhamento);h+=5}
  for(const t of cab){adicionar(t,x,h+4,9,false,a.alinhamento);h+=4}
  let f=297-m-rod.length*3.8-5
  for(const t of rod){adicionar(t,x,f,8,false,a.alinhamento);f+=3.8}
  if(a.paginas)adicionar('Página 1 · prévia',105,297-m+1,8,false,'center')
  adicionar('DEMONSTRAÇÃO · DADOS FICTÍCIOS · SEM VALIDADE CLÍNICA',105,7,7,false,'center')
  let y=topo
  for(const bloco of conteudo) {
    const {linhas,altura,reserva}=medirBloco(doc,bloco,w,a.espaco)
    if(y>topo&&reserva<=fim-topo&&y+reserva>fim)break
    for(const line of linhas){if(y+altura>fim)return resultado();adicionar(line,m,y,bloco.titulo?12:10,!!bloco.titulo);y+=altura}
    y+=a.espaco
  }
  return resultado()
  function resultado():PreviaTimbrado {return {textos,logo,logoX:a.logoPosicao==='left'?m:a.logoPosicao==='right'?210-m-(logo?.width??0):(210-(logo?.width??0))/2,margem:m,topo,fim,marcaDagua:a.marcaDagua}}
}
export async function gerarPdfTimbrado(snapshot: SnapshotTimbrado, conteudo: (BlocoTexto|BlocoTabela)[], demonstracao=false): Promise<Blob> {
  const {doc,cab,rod,logo,nomes,topo,fim,m,w}=await prepararTimbrado(snapshot),a=snapshot.apresentacao
  doc.setProperties({title: demonstracao?'Demonstração de timbrado — sem validade clínica':'Documento institucional',subject:`Timbrado: unidade ${snapshot.versao}; padrão geral ${snapshot.versaoGeral??0}; fonte ${snapshot.fonteRevisao||'demonstração'}`})
  let y=topo
  for(const bloco of conteudo) {
    if('colunas' in bloco){
      autoTable(doc,{startY:y,head:[bloco.colunas],body:bloco.linhas,theme:'grid',margin:{top:topo,bottom:297-fim,left:m,right:m},styles:{font:FONTE_TIMBRADO,fontSize:8,textColor:25,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:240,textColor:25},rowPageBreak:'avoid'})
      y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+a.espaco;continue
    }
    const {altura,linhas:textoQuebrado,reserva}=medirBloco(doc,bloco,w,a.espaco)
    // Parágrafos que cabem na página ficam inteiros; títulos reservam início de conteúdo.
    if(y>topo&&reserva<=fim-topo&&y+reserva>fim){doc.addPage();y=topo}
    for(const line of textoQuebrado) {if(y+altura>fim){doc.addPage();y=topo}doc.text(line,m,y);y+=altura}
    y+=a.espaco
  }
  const total=doc.getNumberOfPages()
  for(let p=1;p<=total;p++) {
    doc.setPage(p);doc.setTextColor(25);doc.setFont(FONTE_TIMBRADO,'normal')
    if(a.marcaDagua){doc.saveGraphicsState();doc.setGState(doc.GState({opacity:.07}));doc.setFontSize(28);doc.text(a.marcaDagua,105,155,{align:'center',angle:35});doc.restoreGraphicsState()}
    if(demonstracao){doc.setFontSize(7);doc.text('DEMONSTRAÇÃO · DADOS FICTÍCIOS · SEM VALIDADE CLÍNICA',105,7,{align:'center'})}
    let h=m
    if(logo){const x=a.logoPosicao==='left'?m:a.logoPosicao==='right'?210-m-logo.width:(210-logo.width)/2;doc.addImage(logo.data,logo.formato,x,h,logo.width,logo.height);h+=logo.height+a.espaco}
    const x=a.alinhamento==='left'?m:a.alinhamento==='right'?210-m:105
    doc.setFont(FONTE_TIMBRADO,'bold');doc.setFontSize(12)
    for(const l of nomes){doc.text(l,x,h+4,{align:a.alinhamento});h+=5}
    doc.setFont(FONTE_TIMBRADO,'normal');doc.setFontSize(9)
    for(const l of cab){doc.text(l,x,h+4,{align:a.alinhamento});h+=4}
    doc.setFontSize(8)
    let f=297-m-rod.length*3.8-5
    for(const l of rod){doc.text(l,x,f,{align:a.alinhamento});f+=3.8}
    if(a.paginas)doc.text(`Página ${p} de ${total}`,105,297-m+1,{align:'center'})
  }
  return doc.output('blob')
}
export const CONTEUDO_DEMONSTRACAO: BlocoTexto[]=[{texto:'Demonstração de documento institucional',titulo:true},{texto:'Esta prévia apresenta somente a identidade visual e a área útil do documento. Não constitui receita, atestado, laudo ou documento clínico.'},...Array.from({length:22},(_,n)=>({texto:`Parágrafo demonstrativo ${n+1}. Informações fictícias para conferir margens, quebras de página, leitura monocromática e repetição do cabeçalho e rodapé. O documento efetivamente emitido deve conservar sua identidade institucional e versão originais.`}))]

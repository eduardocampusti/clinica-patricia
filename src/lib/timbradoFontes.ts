import type { jsPDF } from 'jspdf'
import regularUrl from '../assets/pdf/NotoSans-Regular.ttf?url'
import boldUrl from '../assets/pdf/NotoSans-Bold.ttf?url'

export const FONTE_TIMBRADO = 'NotoSans'
export const FONTES_TIMBRADO = {normal:regularUrl,bold:boldUrl}
let fontes: Promise<string[]> | undefined
function carregarFontes() {
  return fontes ??= Promise.all(Object.values(FONTES_TIMBRADO).map(async url=>{
    const r=await fetch(url)
    if(!r.ok)throw new Error('Não foi possível carregar a fonte do documento. Tente gerar novamente.')
    const bytes=new Uint8Array(await r.arrayBuffer())
    let binario=''
    for(let n=0;n<bytes.length;n+=8192)binario+=String.fromCharCode(...bytes.subarray(n,n+8192))
    return btoa(binario)
  })).catch(e=>{fontes=undefined;throw e})
}
// Arquivos locais, licenciados sob SIL OFL 1.1. Sem dependência de fontes do leitor.
export async function incorporarFontesTimbrado(doc:jsPDF,signal?:AbortSignal) {
  const [normal,bold]=await carregarFontes()
  signal?.throwIfAborted()
  doc.addFileToVFS('NotoSans-Regular.ttf',normal)
  doc.addFileToVFS('NotoSans-Bold.ttf',bold)
  doc.addFont('NotoSans-Regular.ttf',FONTE_TIMBRADO,'normal')
  doc.addFont('NotoSans-Bold.ttf',FONTE_TIMBRADO,'bold')
  doc.setFont(FONTE_TIMBRADO,'normal')
  doc.setCharSpace(0)
}

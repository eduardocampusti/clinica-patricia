import { ErroRecursoEquipe } from './equipeRecebimento.ts'
export const FOTO_MAX_BYTES = 5 * 1024 * 1024
export interface CabecalhoFoto { formato:'image/jpeg'|'image/png'; largura:number; altura:number; orientacao:number }
const falhar = (): never => { throw new ErroRecursoEquipe('FOTO_INVALIDA','Use uma foto JPEG ou PNG válida, até 5 MB, de 32 a 4096 px e até 8 megapixels.') }
export function verificarCabecalhoFoto(b: Uint8Array, mime?: string): CabecalhoFoto {
  if (b.length < 24 || b.length > FOTO_MAX_BYTES) return falhar()
  const d = new DataView(b.buffer,b.byteOffset,b.byteLength)
  let formato: CabecalhoFoto['formato']; let largura=0; let altura=0; let orientacao=1
  if (b[0]===137 && b[1]===80 && b[2]===78 && b[3]===71 && b[4]===13 && b[5]===10 && b[6]===26 && b[7]===10) {
    formato='image/png'
    if (d.getUint32(8)!==13 || d.getUint32(12)!==0x49484452) return falhar()
    largura=d.getUint32(16);altura=d.getUint32(20)
    let p=8
    while (p+12<=b.length) {const len=d.getUint32(p); if (p+12+len>b.length) return falhar(); if(d.getUint32(p+4)===0x6163544c) return falhar();p+=12+len}
  } else if(b[0]===255 && b[1]===216) {
    formato='image/jpeg'; let p=2
    while(p+4<=b.length) {
      if (b[p++]!==255) return falhar()
      while(b[p]===255) p++
      if(p+3>b.length) return falhar()
      const marca=b[p++]; if(marca===0xda || marca===0xd9) break
      if(marca===0x01 || (marca>=0xd0 && marca<=0xd7)) continue
      const len=d.getUint16(p); if(len<2 || p+len>b.length) return falhar()
      if([0xc0,0xc1,0xc2].includes(marca) && len>=8) {altura=d.getUint16(p+3);largura=d.getUint16(p+5)}
      if(marca===0xe1 && len>=16 && d.getUint32(p+2)===0x45786966 && d.getUint16(p+6)===0) {
        const t=p+8;if(t+8>p+len)return falhar(); const le=d.getUint16(t)===0x4949
        if (!le && d.getUint16(t)!==0x4d4d) return falhar()
        if(d.getUint16(t+2,le)!==42) return falhar()
        const ifd=t+d.getUint32(t+4,le)
        if(ifd+2>p+len) return falhar()
        const n=d.getUint16(ifd,le)
        if(ifd+2+n*12>p+len) return falhar()
        for(let i=0;i<n;i++){const q=ifd+2+i*12; if(d.getUint16(q,le)===0x0112){if(d.getUint16(q+2,le)!==3||d.getUint32(q+4,le)!==1)return falhar();orientacao=d.getUint16(q+8,le)}}
      }
      p+=len
    }
  } else return falhar()
  if (mime && mime!==formato || largura<32 || altura<32 || largura>4096 || altura>4096 || largura*altura>8_000_000 || orientacao<1 || orientacao>8) return falhar()
  return {formato,largura,altura,orientacao}
}
export interface ImagemEquipe {
  width:number; height:number
  bitmap:Uint8Array|Uint8ClampedArray
  resize(width:number,height:number):ImagemEquipe
  encodeJPEG(quality:number):Promise<Uint8Array>
}
export async function processarFotoEquipe(bytes: Uint8Array, decodificar:(b:Uint8Array)=>Promise<ImagemEquipe>, mime?:string,criar?:(w:number,h:number)=>ImagemEquipe):Promise<Uint8Array> {
  const c=verificarCabecalhoFoto(bytes,mime)
  let imagem:ImagemEquipe
  try { imagem=await decodificar(bytes) } catch { return falhar() }
  if(imagem.width!==c.largura || imagem.height!==c.altura) return falhar()
  // Exact EXIF pixel mapping avoids interpolation/cropping when axes are swapped.
  if(c.orientacao!==1) {
    if(!criar)return falhar()
    const w=imagem.width,h=imagem.height;const orientada=criar(c.orientacao>=5?h:w,c.orientacao>=5?w:h)
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let nx=x,ny=y
      switch(c.orientacao){case 2:nx=w-1-x;break;case 3:nx=w-1-x;ny=h-1-y;break;case 4:ny=h-1-y;break;case 5:nx=y;ny=x;break;case 6:nx=h-1-y;ny=x;break;case 7:nx=h-1-y;ny=w-1-x;break;case 8:nx=y;ny=w-1-x;break}
      const a=(y*w+x)*4,b=(ny*orientada.width+nx)*4
      for(let k=0;k<4;k++)orientada.bitmap[b+k]=imagem.bitmap[a+k]
    }
    imagem=orientada
  }
  const escala=Math.min(1,1024/Math.max(imagem.width,imagem.height))
  if(escala<1) {const w=Math.round(imagem.width*escala),h=Math.round(imagem.height*escala);if(w<32||h<32)return falhar();imagem=imagem.resize(w,h)}
  const saida=await imagem.encodeJPEG(85)
  // Only newly encoded pixels are stored: EXIF/GPS/other input metadata are discarded.
  verificarCabecalhoFoto(saida,'image/jpeg')
  return saida
}

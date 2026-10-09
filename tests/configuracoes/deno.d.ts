declare namespace Deno {
 const env:{get:(nome:string)=>string|undefined}
 function serve(handler:(request:Request)=>Response|Promise<Response>):void
}
declare module 'https://deno.land/x/imagescript@1.3.0/mod.ts' {
 export class Image {
  width:number; height:number
  static decode(bytes:Uint8Array):Promise<Image>
  encodePNG():Promise<Uint8Array>
 }
}

// Serviço determinístico, independente de Deno/Supabase, testável com portas.
export interface PerfilServidor { versao: 1; usuario_id: string; nome: string | null; foto_caminho: string | null; revisao: number }
export interface PortasPerfil {
  consultar(): Promise<PerfilServidor>
  processar(bytes: Uint8Array, mime: string): Promise<Uint8Array>
  enviar(path: string, bytes: Uint8Array): Promise<void>
  confirmar(nome: string, path: string | null, revisao: number): Promise<PerfilServidor>
}
export class ErroPerfil extends Error {
  constructor(public status: number, mensagem: string, public exigeConferencia = false) { super(mensagem) }
}
export async function gravarPerfilProprio(atorId: string, campos: Record<string, unknown>, foto: File | null, portas: PortasPerfil, novoId: () => string): Promise<PerfilServidor> {
  if (Object.keys(campos).some(k => !['acao','nome','revisao','fotoAcao'].includes(k)) || campos.acao !== 'salvar') throw new ErroPerfil(422,'Campos não permitidos.')
  const nome = typeof campos.nome === 'string' ? campos.nome.trim().replace(/\s+/gu,' ') : ''
  const revisao = typeof campos.revisao === 'string' && /^\d+$/u.test(campos.revisao) ? Number(campos.revisao) : -1
  if (!nome || Array.from(nome).length>120 || /[\p{Cc}\p{Cf}]/u.test(nome) || !Number.isSafeInteger(revisao) || revisao<0
    || typeof campos.fotoAcao !== 'string' || !['manter','substituir','remover'].includes(campos.fotoAcao) || (campos.fotoAcao==='substituir')!==!!foto) throw new ErroPerfil(422,'Nome ou foto inválido.')
  const anterior = await portas.consultar()
  if (anterior.usuario_id!==atorId) throw new ErroPerfil(403,'Conta não autorizada.')
  if (anterior.revisao!==revisao) throw new ErroPerfil(409,'Perfil alterado. Reabra antes de salvar.')
  let path = campos.fotoAcao==='remover' ? null : anterior.foto_caminho
  if (foto) {
    if (!['image/jpeg','image/png'].includes(foto.type) || foto.size===0 || foto.size>5*1024*1024) throw new ErroPerfil(422,'Foto inválida.')
    const bytes = await portas.processar(new Uint8Array(await foto.arrayBuffer()),foto.type)
    const id = novoId()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(id)) throw new ErroPerfil(503,'Serviço indisponível.')
    path = `${atorId}/${id}.jpg`
    // Immutable new object. Never overwrite/delete the old photo on upload error.
    await portas.enviar(path,bytes)
  }
  // A transaction commits name, pointer, revision and audit together. If the RPC
  // response is lost, do not delete either object: commit outcome is uncertain.
  return portas.confirmar(nome,path,revisao)
}

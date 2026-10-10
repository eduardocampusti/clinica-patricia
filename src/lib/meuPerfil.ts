import { supabase } from './supabase'
import { nomeCadastrado } from './identidadeApresentacao'
import { FOTO_MAX_BYTES, verificarCabecalhoFoto } from '../../supabase/functions/_shared/equipeFoto'
import { SERVICO_PERFIL_HABILITADO } from '../config/perfilConta'

export interface PerfilConta {
  usuarioId: string
  nome: string | null
  fotoCaminho: string | null
  revisao: number
}
export type EstadoPerfil = 'carregando' | 'disponivel' | 'ausente' | 'erro'
export const BUCKET_PERFIL = 'contas-fotos'
export class ErroSalvarPerfil extends Error {
  readonly exigeConferencia: boolean
  constructor(mensagem: string, exigeConferencia: boolean) { super(mensagem); this.exigeConferencia = exigeConferencia }
}
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
export function caminhoFotoPropria(caminho: unknown, usuarioId: string): caminho is string {
  return typeof caminho === 'string' && new RegExp(`^${uuid}/${uuid}\\.jpg$`, 'i').test(caminho) && caminho.split('/')[0] === usuarioId
}
export function validarPerfilConta(valor: unknown, usuarioId: string): PerfilConta {
  const p = valor as Record<string, unknown> | null
  if (!p || p.versao !== 1 || p.usuario_id !== usuarioId || !Number.isSafeInteger(p.revisao) || Number(p.revisao) < 0
    || (p.nome !== null && typeof p.nome !== 'string') || (p.foto_caminho !== null && !caminhoFotoPropria(p.foto_caminho, usuarioId))) {
    throw new Error('Não foi possível confirmar os dados do próprio perfil.')
  }
  return { usuarioId, nome: nomeCadastrado(p.nome), fotoCaminho: p.foto_caminho as string | null, revisao: Number(p.revisao) }
}
async function conferirSessao(usuarioId: string) {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session || data.session.user.id !== usuarioId) throw new Error('A conta conectada mudou. Abra seu perfil novamente.')
}
export async function consultarMeuPerfil(usuarioId: string, signal: AbortSignal): Promise<PerfilConta | null> {
  if (!SERVICO_PERFIL_HABILITADO) return null
  await conferirSessao(usuarioId)
  const { data, error } = await supabase.functions.invoke('meu-perfil', { body: { acao: 'consultar' }, signal })
  if (error) {
    // Only an explicitly absent function permits the historical read-only fallback.
    if (error.context instanceof Response && error.context.status === 404) return null
    throw new Error('Não foi possível consultar o serviço de perfil. Tente novamente.')
  }
  return validarPerfilConta(data, usuarioId)
}
export async function carregarFotoPerfil(perfil: PerfilConta, signal: AbortSignal): Promise<string | undefined> {
  if (!perfil.fotoCaminho) return undefined
  if (!caminhoFotoPropria(perfil.fotoCaminho, perfil.usuarioId)) throw new Error('Foto não autorizada.')
  await conferirSessao(perfil.usuarioId)
  // Recheck current authorization instead of reusing a private response cached
  // before a photo replacement, account change or access suspension.
  const { data, error } = await supabase.storage.from(BUCKET_PERFIL).download(perfil.fotoCaminho, { cacheNonce: crypto.randomUUID() }, { cache: 'no-store', signal })
  if (error || !data || data.size > FOTO_MAX_BYTES || data.type !== 'image/jpeg') throw new Error('Não foi possível carregar sua foto pessoal.')
  signal.throwIfAborted()
  return URL.createObjectURL(data)
}
export async function validarFotoPessoal(arquivo: File): Promise<void> {
  if (!['image/jpeg', 'image/png'].includes(arquivo.type) || arquivo.size > FOTO_MAX_BYTES || arquivo.size === 0) throw new Error('Escolha uma foto JPEG ou PNG de até 5 MB.')
  try { verificarCabecalhoFoto(new Uint8Array(await arquivo.arrayBuffer()), arquivo.type) }
  catch { throw new Error('Use uma foto JPEG ou PNG válida, de 32 a 4096 px e até 8 megapixels.') }
  // Decode as well as inspect headers; never preview an undecodable payload.
  const bitmap = await createImageBitmap(arquivo)
  bitmap.close()
}
export async function salvarMeuPerfil(perfil: PerfilConta, nome: string, foto: File | null, removerFoto: boolean, signal: AbortSignal): Promise<PerfilConta> {
  if (!SERVICO_PERFIL_HABILITADO) throw new Error('O serviço de perfil pessoal ainda não foi habilitado.')
  await conferirSessao(perfil.usuarioId)
  const normalizado = nomeCadastrado(nome)
  if (!normalizado || Array.from(normalizado).length > 120 || /[\p{Cc}\p{Cf}]/u.test(normalizado)) throw new Error('Informe seu nome de exibição, com até 120 caracteres.')
  if (foto && removerFoto) throw new Error('Escolha substituir ou remover a foto.')
  if (foto) await validarFotoPessoal(foto)
  const body = new FormData()
  body.set('acao', 'salvar'); body.set('nome', normalizado); body.set('revisao', String(perfil.revisao))
  body.set('fotoAcao', foto ? 'substituir' : removerFoto ? 'remover' : 'manter')
  if (foto) body.set('foto', foto)
  // No account ID, role, clinic, email or permission is accepted in this payload.
  const { data, error } = await supabase.functions.invoke('meu-perfil', { body, signal })
  if (error) {
    const status = error.context instanceof Response ? error.context.status : 0
    let semGravacao = false
    if (error.context instanceof Response && [422, 503].includes(status)) {
      try {
        const resposta = await error.context.clone().json()
        semGravacao = resposta?.erro_tipo === 'sem_gravacao'
      } catch { /* Gateway/network responses do not prove the transaction outcome. */ }
    }
    throw new ErroSalvarPerfil(status === 409 ? 'Seu perfil foi alterado em outra janela. Reabra antes de salvar.' : semGravacao && status === 422 ? 'O nome ou a foto foi recusado. Confira os dados e tente novamente.' : semGravacao ? 'O envio não foi concluído. Seu formulário foi preservado; tente novamente.' : 'O salvamento não foi confirmado. Reabra o perfil para conferir antes de tentar novamente.', !semGravacao)
  }
  await conferirSessao(perfil.usuarioId)
  let salvo: PerfilConta
  try { salvo = validarPerfilConta(data, perfil.usuarioId) }
  catch { throw new ErroSalvarPerfil('O resultado do salvamento não foi confirmado. Reabra o perfil para conferir.', true) }
  if (salvo.nome !== normalizado || salvo.revisao !== perfil.revisao + 1 || (removerFoto && salvo.fotoCaminho !== null)
    || (foto && (!salvo.fotoCaminho || salvo.fotoCaminho === perfil.fotoCaminho)) || (!foto && !removerFoto && salvo.fotoCaminho !== perfil.fotoCaminho)) {
    throw new ErroSalvarPerfil('O resultado do salvamento não foi confirmado. Reabra o perfil para conferir.', true)
  }
  return salvo
}

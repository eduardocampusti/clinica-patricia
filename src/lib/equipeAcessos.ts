import { supabase } from './supabase'

export type StatusAcessoEquipe =
  | 'sem_acesso'
  | 'convite_pendente'
  | 'acesso_ativo'
  | 'acesso_suspenso'
  | 'conta_inativa'

export type PapelAcessoEquipe = 'proprietaria' | 'medico' | 'recepcao'
export type ModoConcessaoEquipe = 'convite' | 'vinculo'
export type AcaoAcessoEquipe = 'conceder' | 'reativar' | 'suspender' | 'papel'

export interface ClinicaAcessoEquipe {
  id: string
  nome: string
  usuario_id: string | null
  papel: PapelAcessoEquipe | null
  ativo: boolean
  status: StatusAcessoEquipe
}

export interface ConviteAcessoEquipe {
  id: string
  membro_id: string
  modo: ModoConcessaoEquipe
  status: 'pendente' | 'enviado' | 'aceito' | 'erro' | 'cancelado' | 'expirado'
  email: string
  auth_user_id: string | null
  clinicas_papeis: Array<{ clinica_id: string; papel: PapelAcessoEquipe }>
  tentativas: number
  ultimo_envio_em: string | null
  erro_codigo: string | null
  expira_em: string
}

export interface AcessoEquipe {
  membro_id: string
  usuario_id: string | null
  login_email: string | null
  conta_confirmada: boolean
  clinicas: ClinicaAcessoEquipe[]
  convites: ConviteAcessoEquipe[]
}

export interface EscopoAcessoEquipe {
  clinica_id: string
  papel: PapelAcessoEquipe
}

export interface ErroAcessoEquipe {
  codigo: string
  mensagem: string
  status?: number
}

function textoErro(error: unknown, fallback: string): ErroAcessoEquipe {
  const candidato = error as { context?: { body?: { codigo?: string; erro?: string } }; message?: string; status?: number } | null
  const corpo = candidato?.context?.body
  if (corpo?.codigo && corpo.erro) return { codigo: corpo.codigo, mensagem: corpo.erro, status: candidato?.status }
  return { codigo: 'OPERACAO_INDISPONIVEL', mensagem: fallback, status: candidato?.status }
}

async function invocar<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: ErroAcessoEquipe | null }> {
  const { data, error } = await supabase.functions.invoke<T>('equipe-acessos', { body })
  if (error) return { data: null, error: textoErro(error, 'A gestão de acessos ainda não está disponível neste ambiente.') }
  return { data, error: null }
}

export async function buscarAcessoEquipe(membroId: string, clinicaContextoId: string): Promise<{ data: AcessoEquipe | null; error: ErroAcessoEquipe | null }> {
  return invocar<AcessoEquipe>({ acao: 'listar', membroId, clinicaContextoId })
}

export async function iniciarAcessoEquipe(input: {
  membroId: string
  clinicaContextoId: string
  email: string
  modo: ModoConcessaoEquipe
  clinicasPapeis: EscopoAcessoEquipe[]
  chaveIdempotencia?: string
}): Promise<{ data: Record<string, unknown> | null; error: ErroAcessoEquipe | null }> {
  return invocar<Record<string, unknown>>({
    acao: 'preparar',
    ...input,
    chaveIdempotencia: input.chaveIdempotencia ?? crypto.randomUUID(),
  })
}

export async function alterarAcessoEquipe(input: {
  membroId: string
  clinicaContextoId: string
  clinicaAlvoId: string
  acaoAcesso: AcaoAcessoEquipe
  papel?: PapelAcessoEquipe | null
}): Promise<{ data: Record<string, unknown> | null; error: ErroAcessoEquipe | null }> {
  return invocar<Record<string, unknown>>({ acao: 'alterar', ...input })
}

export async function reenviarConviteEquipe(input: {
  conviteId: string
  clinicaContextoId: string
}): Promise<{ data: Record<string, unknown> | null; error: ErroAcessoEquipe | null }> {
  return invocar<Record<string, unknown>>({ acao: 'reenviar', ...input })
}

export async function aceitarAcessoEquipe(conviteId: string): Promise<{ data: Record<string, unknown> | null; error: ErroAcessoEquipe | null }> {
  return invocar<Record<string, unknown>>({ acao: 'aceitar', conviteId })
}

export function rotuloStatusAcessoEquipe(status: StatusAcessoEquipe): string {
  if (status === 'convite_pendente') return 'Convite pendente'
  if (status === 'acesso_ativo') return 'Acesso ativo'
  if (status === 'acesso_suspenso') return 'Acesso suspenso'
  if (status === 'conta_inativa') return 'Conta inativa'
  return 'Sem acesso'
}

export function rotuloPapelAcessoEquipe(papel: PapelAcessoEquipe | null | undefined): string {
  if (papel === 'proprietaria') return 'Administradora'
  if (papel === 'medico') return 'Médico'
  if (papel === 'recepcao') return 'Recepção'
  return 'Não definido'
}

export function statusAcessoCor(status: StatusAcessoEquipe): 'success' | 'warning' | 'destructive' | 'info' {
  if (status === 'acesso_ativo') return 'success'
  if (status === 'convite_pendente') return 'warning'
  if (status === 'acesso_suspenso' || status === 'conta_inativa') return 'destructive'
  return 'info'
}

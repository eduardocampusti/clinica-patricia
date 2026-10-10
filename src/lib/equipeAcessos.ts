import { supabase } from './supabase'
import { erroEquipeSeguro, interpretarErroAcessoEquipe, respostaAcessoEquipeReconhecida } from './equipeErros'
export type { ErroAcessoEquipe } from './equipeErros'
import type { ErroAcessoEquipe } from './equipeErros'

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
  ativacao?: { id: string; estado: 'reservada' | 'pendente' | 'substituindo' | 'ativa' | 'expirada'; fase?: 'reservada' | 'pendente' | 'substituindo' | 'ativa'; revisao: number } | null
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

async function invocar<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<{ data: T | null; error: ErroAcessoEquipe | null }> {
  const escrita = body.acao !== 'listar'
  try {
    const { data, error } = await supabase.functions.invoke<T>('equipe-acessos', { body, signal })
    if (error) return { data: null, error: await interpretarErroAcessoEquipe(error, escrita) }
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) return { data: null, error: erroEquipeSeguro(null, escrita) }
    if ('erro' in data || 'codigo' in data) return { data: null, error: erroEquipeSeguro(data, escrita) }
    if (!respostaAcessoEquipeReconhecida(data, body.acao)) return { data: null, error: erroEquipeSeguro(null, escrita) }
    return { data, error: null }
  } catch (error) {
    return { data: null, error: await interpretarErroAcessoEquipe(error, escrita) }
  }
}

export async function buscarAcessoEquipe(membroId: string, clinicaContextoId: string, signal?: AbortSignal): Promise<{ data: AcessoEquipe | null; error: ErroAcessoEquipe | null }> {
  return invocar<AcessoEquipe>({ acao: 'listar', membroId, clinicaContextoId }, signal)
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

export function rotuloStatusAcessoEquipe(status: unknown): string {
  if (status === 'convite_pendente') return 'Convite pendente'
  if (status === 'acesso_ativo') return 'Acesso ativo'
  if (status === 'acesso_suspenso') return 'Acesso suspenso'
  if (status === 'conta_inativa') return 'Conta inativa'
  if (status === 'sem_acesso') return 'Sem acesso a esta clínica'
  return 'Acesso não confirmado'
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

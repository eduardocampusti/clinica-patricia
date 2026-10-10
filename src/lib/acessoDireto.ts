import { supabase } from './supabase'
import { ACESSO_DIRETO_HABILITADO } from '../config/acessoDireto'
import type { CredencialTemporaria } from './acessoDiretoModelo'
import type { EscopoAcessoEquipe } from './equipeAcessos'

export const DEPENDENCIA_ACESSO_DIRETO = 'O acesso com senha temporária aguarda a ativação e validação do serviço seguro. Você pode cadastrar somente a pessoa ou usar o convite existente.'
export type EstadoAtivacao = { estado: 'normal' | 'pendente' | 'expirada' | 'sessao_obsoleta'; expiraEm?: string }
export async function consultarAtivacao(): Promise<EstadoAtivacao> {
  if (!ACESSO_DIRETO_HABILITADO) return { estado: 'normal' }
  const { data, error } = await supabase.rpc('acesso_direto_estado')
  if (error || !data || !['normal', 'pendente', 'expirada', 'sessao_obsoleta'].includes(data.estado)) throw new Error('Não foi possível verificar a ativação da conta. Tente novamente ou procure a administração.')
  return data as EstadoAtivacao
}
async function invocar(body: Record<string, unknown>) {
  if (!ACESSO_DIRETO_HABILITADO) throw new Error(DEPENDENCIA_ACESSO_DIRETO)
  const { data, error } = await supabase.functions.invoke('equipe-acesso-direto', { body })
  if (error || !data || data.erro) {
    let codigo = data?.codigo
    if (error && 'context' in error && error.context instanceof Response) {
      try { codigo = (await error.context.clone().json()).codigo } catch { /* Não expor resposta técnica. */ }
    }
    const mensagens: Record<string, string> = {
      CONTA_EXISTENTE: 'Já existe uma conta para esse e-mail. Use a vinculação existente com confirmação do titular; a senha não foi alterada.',
      NAO_AUTORIZADO: 'Você não está autorizado a preparar esse acesso.',
      CREDENCIAL_EXPIRADA: 'A senha temporária expirou. Solicite uma nova à administração.',
      SENHA_INVALIDA: 'Confira os requisitos. A senha pessoal deve ser diferente da temporária.',
      CONFLITO: 'Há outra operação em andamento. Confira a situação antes de tentar novamente.',
      SERVICO_INDISPONIVEL: DEPENDENCIA_ACESSO_DIRETO,
    }
    throw new Error(mensagens[String(codigo)] ?? 'A operação de acesso não foi confirmada. Confira a situação antes de repetir; o cadastro da pessoa permanece salvo.')
  }
  return data as Record<string, unknown>
}
export async function prepararAcessoDireto(input: { membroId: string; clinicaContextoId: string; email: string; clinicasPapeis: EscopoAcessoEquipe[]; chaveIdempotencia: string }): Promise<CredencialTemporaria> {
  const data = await invocar({ acao: 'provisionar', ...input })
  if (!credencialConfirmada(data)) throw new Error('A credencial não foi confirmada. Confira a situação do acesso antes de continuar.')
  return data as unknown as CredencialTemporaria
}
export async function substituirCredencialTemporaria(input: { membroId: string; clinicaContextoId: string; operacaoId: string; revisao: number; chaveIdempotencia: string }): Promise<CredencialTemporaria> {
  const data = await invocar({ acao: 'substituir', ...input })
  if (!credencialConfirmada(data)) throw new Error('A substituição não foi confirmada. Consulte o estado antes de repetir.')
  return data as unknown as CredencialTemporaria
}
export async function retomarAcessoDireto(input: { membroId: string; clinicaContextoId: string; operacaoId: string }): Promise<CredencialTemporaria> {
  const data = await invocar({ acao: 'retomar', ...input })
  if (!credencialConfirmada(data)) throw new Error('A retomada não foi confirmada. Reconsulte a ficha.')
  return data as unknown as CredencialTemporaria
}
function credencialConfirmada(data: Record<string, unknown>): boolean {
  return typeof data.operacaoId === 'string' && /^[a-f0-9-]{36}$/i.test(data.operacaoId) && typeof data.email === 'string' && typeof data.expiraEm === 'string' && Number.isFinite(Date.parse(data.expiraEm)) && (data.senhaTemporaria === null || (typeof data.senhaTemporaria === 'string' && data.senhaTemporaria.length >= 12 && data.senhaTemporaria.length <= 128))
}
export async function concluirAtivacao(senha: string): Promise<void> {
  const data = await invocar({ acao: 'ativar', novaSenha: senha })
  if (data.estado !== 'ativa') throw new Error('A ativação não foi confirmada pelo servidor.')
}

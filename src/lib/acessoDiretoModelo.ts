import type { EscopoAcessoEquipe } from './equipeAcessos'

export type ModoNovoAcesso = 'pessoa' | 'temporaria' | 'convite'
export interface NovoAcesso { modo: ModoNovoAcesso; email: string; escopos: EscopoAcessoEquipe[] }
export interface CredencialTemporaria { operacaoId: string; email: string; senhaTemporaria: string | null; expiraEm: string; estado?: 'pendente' | 'ativa' }
export const novoAcessoVazio = (): NovoAcesso => ({ modo: 'pessoa', email: '', escopos: [] })
export function validarNovoAcesso(acesso: NovoAcesso, clinicasCadastrais: string[]): string | null {
  if (acesso.modo === 'pessoa') return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acesso.email.trim())) return 'Informe um e-mail de login válido.'
  if (!acesso.escopos.length) return 'Selecione uma clínica e o papel de acesso.'
  if (new Set(acesso.escopos.map(e => e.clinica_id)).size !== acesso.escopos.length) return 'Não repita clínicas no acesso.'
  if (acesso.escopos.some(e => !clinicasCadastrais.includes(e.clinica_id) || !['proprietaria', 'medico', 'recepcao'].includes(e.papel))) return 'Confira a clínica vinculada e o papel de cada acesso.'
  return null
}
export function validarSenhaPessoal(senha: string, confirmacao: string): string | null {
  if (senha.length < 12 || senha.length > 128 || !/[a-z]/.test(senha) || !/[A-Z]/.test(senha) || !/[0-9]/.test(senha) || !/[^a-zA-Z0-9\s]/.test(senha)) return 'Use de 12 a 128 caracteres, com maiúscula, minúscula, número e símbolo.'
  if (senha !== confirmacao) return 'As senhas precisam ser iguais.'
  return null
}

// A mesma chave do cadastro é mantida em falhas e na retomada do acesso.
// Nenhuma senha é persistida; a credencial só é devolvida após confirmação.
export async function coordenarNovoMembro<T>(portas: {
  salvarPessoa: () => Promise<string>
  prepararAcesso: (membroId: string) => Promise<T>
}, membroPersistido: string | null, comAcesso: boolean): Promise<{ membroId: string; acesso: T | null }> {
  const membroId = membroPersistido ?? await portas.salvarPessoa()
  if (!comAcesso) return { membroId, acesso: null }
  try { return { membroId, acesso: await portas.prepararAcesso(membroId) } }
  catch (cause) { throw Object.assign(new Error('Pessoa salva; acesso não confirmado. Retome a preparação sem cadastrar novamente.'), { membroId, cause }) }
}

// Regras determinísticas e portas testáveis. Nunca registrar entradas/credenciais.
export class ErroAcessoDireto extends Error {
  constructor(public codigo: string) { super(codigo) }
}
export const senhaPessoalValida = (s: unknown): s is string => typeof s === 'string' && s.length >= 12 && s.length <= 128 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s) && /[^a-zA-Z0-9\s]/.test(s)
const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+-=?'
export function gerarSenhaTemporaria(): string {
  // Rejection sampling, sem viés do módulo e sem Math.random.
  for (;;) {
    let senha = ''
    while (senha.length < 24) {
      const bytes = crypto.getRandomValues(new Uint8Array(32))
      for (const b of bytes) { if (b < Math.floor(256 / alfabeto.length) * alfabeto.length) senha += alfabeto[b % alfabeto.length]; if (senha.length === 24) break }
    }
    if (senhaPessoalValida(senha)) return senha
  }
}
export async function compromissoSenha(salt: string, senha: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${senha}`))
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('')
}
export interface ReservaDireta { id: string; auth_user_id: string; email: string; salt: string; estado: string; reserva_id: string | null; expira_em: string; revisao: number; senha_digest?: string }
export interface PortasProvisionamento {
  reservar: () => Promise<ReservaDireta>
  buscarContaReservada: (id: string) => Promise<{ id: string; email: string; operacao: string } | null>
  criarConta: (r: ReservaDireta, senha: string) => Promise<{ id: string }>
  confirmar: (r: ReservaDireta, digest: string) => Promise<void>
}
export async function provisionarDireto(p: PortasProvisionamento) {
  const r = await p.reservar()
  if (r.estado === 'pendente' || r.estado === 'ativa') return { operacaoId: r.id, email: r.email, senhaTemporaria: null, expiraEm: r.expira_em, estado: r.estado }
  if (r.estado !== 'reservada' || !r.reserva_id) throw new ErroAcessoDireto('CONFLITO')
  const conta = await p.buscarContaReservada(r.auth_user_id)
  if (conta) {
    if (conta.id !== r.auth_user_id || conta.email.toLowerCase() !== r.email.toLowerCase() || conta.operacao !== r.id) throw new ErroAcessoDireto('CONFLITO')
    // Recuperação por ID reservado pelo servidor; nunca coincidência de e-mail.
    // Um segredo perdido não é redefinido nem reapresentado por repetição.
    await p.confirmar(r, '')
    return { operacaoId: r.id, email: r.email, senhaTemporaria: null, expiraEm: r.expira_em, estado: 'pendente' }
  }
  const senha = gerarSenhaTemporaria()
  const digest = await compromissoSenha(r.salt, senha)
  const novaConta = await p.criarConta(r, senha)
  if (novaConta.id !== r.auth_user_id) throw new ErroAcessoDireto('CONFLITO')
  await p.confirmar(r, digest)
  return { operacaoId: r.id, email: r.email, senhaTemporaria: senha, expiraEm: r.expira_em, estado: 'pendente' }
}
export async function ativarDireto(novaSenha: unknown, p: {
  reservar: () => Promise<ReservaDireta>
  atualizarSenha: (usuarioId: string, senha: string) => Promise<void>
  verificarSenha: (r: ReservaDireta, senha: string) => Promise<void>
  revogarSessoes: () => Promise<void>
  confirmar: (r: ReservaDireta) => Promise<void>
}) {
  if (!senhaPessoalValida(novaSenha)) throw new ErroAcessoDireto('SENHA_INVALIDA')
  const r = await p.reservar()
  // A perda do compromisso nunca libera uma senha desconhecida: substituição obrigatória.
  if (!r.senha_digest || await compromissoSenha(r.salt, novaSenha) === r.senha_digest) throw new ErroAcessoDireto('SENHA_INVALIDA')
  await p.atualizarSenha(r.auth_user_id, novaSenha)
  await p.verificarSenha(r, novaSenha)
  await p.revogarSessoes()
  await p.confirmar(r)
  return { estado: 'ativa' }
}

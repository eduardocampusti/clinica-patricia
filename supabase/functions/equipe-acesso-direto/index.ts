import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.111.0'
import { ORIGENS_LOCAIS_PERMITIDAS, ORIGENS_PUBLICAS_PERMITIDAS } from '../equipe-acessos/conviteAuth.ts'
import { ativarDireto, provisionarDireto, gerarSenhaTemporaria, compromissoSenha, ErroAcessoDireto, type ReservaDireta } from '../_shared/acessoDireto.ts'
const url = Deno.env.get('SUPABASE_URL') ?? '', anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '', key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } }
function headers(req: Request) {
  const h = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'Access-Control-Allow-Headers': 'authorization,apikey,x-client-info,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS', Vary: 'Origin' })
  const origin = req.headers.get('origin') ?? ''; if (ORIGENS_LOCAIS_PERMITIDAS.has(origin) || ORIGENS_PUBLICAS_PERMITIDAS.has(origin)) h.set('Access-Control-Allow-Origin', origin)
  return h
}
const resposta = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(req) })
async function rpc<T>(admin: SupabaseClient, nome: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(nome, args)
  if (error) {
    const codigos = ['CONTA_EXISTENTE', 'CREDENCIAL_EXPIRADA', 'CONFLITO', 'SERVICO_INDISPONIVEL']
    throw new ErroAcessoDireto(codigos.includes(error.message) ? error.message : error.code === '42501' ? 'NAO_AUTORIZADO' : error.code === '22023' ? 'DADOS_INVALIDOS' : 'OPERACAO_NAO_CONFIRMADA')
  }
  return data as T
}
async function lerCorpo(req: Request): Promise<Record<string, unknown>> {
  const reader = req.body?.getReader(); if (!reader) throw new ErroAcessoDireto('DADOS_INVALIDOS')
  const chunks: Uint8Array[] = []; let size = 0
  try { for (;;) { const r = await reader.read(); if (r.done) break; size += r.value.length; if (size > 16384) { await reader.cancel(); throw new ErroAcessoDireto('DADOS_INVALIDOS') } chunks.push(r.value) } } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size); let pos = 0; for (const c of chunks) { bytes.set(c, pos); pos += c.length }
  const b = JSON.parse(new TextDecoder().decode(bytes)); if (!b || typeof b !== 'object' || Array.isArray(b)) throw new ErroAcessoDireto('DADOS_INVALIDOS'); return b
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(req) })
  if (req.method !== 'POST') return resposta(req, { codigo: 'DADOS_INVALIDOS' }, 405)
  try {
    if (url !== 'https://xftnkusbyqzyvzrovroj.supabase.co' || !anon || !key || Deno.env.get('ACESSO_DIRETO_HABILITADO') !== 'true') throw new ErroAcessoDireto('SERVICO_INDISPONIVEL')
    const origin = req.headers.get('origin'); if (origin && !ORIGENS_LOCAIS_PERMITIDAS.has(origin) && !ORIGENS_PUBLICAS_PERMITIDAS.has(origin)) throw new ErroAcessoDireto('NAO_AUTORIZADO')
    const authorization = req.headers.get('authorization') ?? ''; if (!authorization.startsWith('Bearer ')) throw new ErroAcessoDireto('NAO_AUTORIZADO')
    const jwt = authorization.slice(7)
    const client = createClient(url, anon, { ...options, global: { ...options.global, headers: { Authorization: authorization } } })
    const { data, error } = await client.auth.getUser(jwt); if (error || !data.user) throw new ErroAcessoDireto('NAO_AUTORIZADO')
    // Extrair apenas após verificação Auth; session_id será revalidado no banco.
    const claims = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const sessionId = claims.session_id; if (typeof sessionId !== 'string') throw new ErroAcessoDireto('NAO_AUTORIZADO')
    const admin = createClient(url, key, options)
    const ready = await rpc<boolean>(admin, 'acesso_direto_disponivel', {}); if (!ready) throw new ErroAcessoDireto('SERVICO_INDISPONIVEL')
    const b = await lerCorpo(req)
    if (b.acao === 'ativar') {
      let jwtVerificado: string | null = null
      return resposta(req, await ativarDireto(b.novaSenha, {
        reservar: () => rpc<ReservaDireta>(admin, 'acesso_direto_reservar_troca', { p_usuario: data.user!.id, p_sessao: sessionId }),
        atualizarSenha: async (id, password) => { const r = await admin.auth.admin.updateUserById(id, { password }); if (r.error || r.data.user?.id !== id) throw new ErroAcessoDireto('SENHA_INVALIDA') },
        verificarSenha: async (r, password) => {
          await rpc<void>(admin, 'acesso_direto_preparar_verificacao', { p_operacao: r.id, p_reserva: r.reserva_id })
          const verificacao = createClient(url, anon, options)
          const v = await verificacao.auth.signInWithPassword({ email: r.email, password })
          if (v.error || v.data.user?.id !== r.auth_user_id || !v.data.session) throw new ErroAcessoDireto('OPERACAO_NAO_CONFIRMADA')
          jwtVerificado = v.data.session.access_token
          const sessao = JSON.parse(atob(jwtVerificado.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id
          await rpc<void>(admin, 'acesso_direto_registrar_verificacao', { p_operacao: r.id, p_reserva: r.reserva_id, p_sessao: sessao })
        },
        revogarSessoes: async () => { if (!jwtVerificado) throw new ErroAcessoDireto('OPERACAO_NAO_CONFIRMADA'); const r = await admin.auth.admin.signOut(jwtVerificado, 'global'); if (r.error) throw new ErroAcessoDireto('OPERACAO_NAO_CONFIRMADA'); jwtVerificado = null },
        confirmar: r => rpc<void>(admin, 'acesso_direto_concluir_troca', { p_operacao: r.id, p_reserva: r.reserva_id }),
      }))
    }
    const gate = await client.rpc('acesso_direto_exigir_sessao'); if (gate.error || gate.data !== true) throw new ErroAcessoDireto('NAO_AUTORIZADO')
    const ator = data.user.id
    if (b.acao === 'provisionar' || b.acao === 'retomar') return resposta(req, await provisionarDireto({
      reservar: () => b.acao === 'retomar' ? rpc<ReservaDireta>(admin, 'acesso_direto_retomar', { p_ator: ator, p_membro: b.membroId, p_contexto: b.clinicaContextoId, p_operacao: b.operacaoId }) : rpc<ReservaDireta>(admin, 'acesso_direto_reservar', { p_ator: ator, p_membro: b.membroId, p_contexto: b.clinicaContextoId, p_email: b.email, p_escopos: b.clinicasPapeis, p_chave: b.chaveIdempotencia }),
      buscarContaReservada: async id => { const r = await admin.auth.admin.getUserById(id); if (r.error?.status === 404) return null; if (r.error) throw new ErroAcessoDireto('OPERACAO_NAO_CONFIRMADA'); return r.data.user ? { id: r.data.user.id, email: r.data.user.email ?? '', operacao: String(r.data.user.app_metadata?.acesso_direto_operacao ?? '') } : null },
      criarConta: async (r, password) => { const c = await admin.auth.admin.createUser({ id: r.auth_user_id, email: r.email, password, email_confirm: true, app_metadata: { acesso_direto_operacao: r.id, email_origem: 'administracao_sem_prova_caixa' } }); if (c.error || !c.data.user) throw new ErroAcessoDireto(c.error?.code === 'email_exists' ? 'CONTA_EXISTENTE' : 'OPERACAO_NAO_CONFIRMADA'); return { id: c.data.user.id } },
      confirmar: (r, digest) => rpc<void>(admin, 'acesso_direto_confirmar_conta', { p_operacao: r.id, p_reserva: r.reserva_id, p_digest: digest }),
    }))
    if (b.acao === 'substituir') {
      const r = await rpc<ReservaDireta>(admin, 'acesso_direto_reservar_substituicao', { p_ator: ator, p_membro: b.membroId, p_contexto: b.clinicaContextoId, p_operacao: b.operacaoId, p_revisao: b.revisao, p_chave: b.chaveIdempotencia })
      if (!r.reserva_id) { if (r.estado !== 'pendente') throw new ErroAcessoDireto('CONFLITO'); return resposta(req, { operacaoId: r.id, email: r.email, senhaTemporaria: null, expiraEm: r.expira_em }) }
      const senha = gerarSenhaTemporaria(), digest = await compromissoSenha(r.salt, senha)
      const update = await admin.auth.admin.updateUserById(r.auth_user_id, { password: senha }); if (update.error || update.data.user?.id !== r.auth_user_id) throw new ErroAcessoDireto('OPERACAO_NAO_CONFIRMADA')
      await rpc<void>(admin, 'acesso_direto_confirmar_substituicao', { p_operacao: r.id, p_reserva: r.reserva_id, p_digest: digest })
      return resposta(req, { operacaoId: r.id, email: r.email, senhaTemporaria: senha, expiraEm: r.expira_em })
    }
    throw new ErroAcessoDireto('DADOS_INVALIDOS')
  } catch (e) {
    // Sem logging: nenhuma senha/token/corpo/erro bruto sai em auditoria/resposta.
    const codigo = e instanceof ErroAcessoDireto ? e.codigo : 'OPERACAO_NAO_CONFIRMADA'
    return resposta(req, { codigo, erro: 'Operação não confirmada.' }, codigo === 'NAO_AUTORIZADO' ? 403 : codigo === 'CONFLITO' ? 409 : codigo === 'SERVICO_INDISPONIVEL' ? 503 : 422)
  }
})

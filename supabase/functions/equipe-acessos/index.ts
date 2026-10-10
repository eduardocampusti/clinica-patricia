import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.111.0'
import { ErroContaConvite, garantirContaDoConvite, ORIGENS_LOCAIS_PERMITIDAS, ORIGENS_PUBLICAS_PERMITIDAS, type ContaConvite } from './conviteAuth.ts'
import { identidadeEmailConvite } from './emailContext.ts'
import { redirectUnidade } from './redirectUnidade.ts'
import { exigirAtivacaoServico } from '../_shared/guardaAtivacao.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? ''

function corsHeaders(request: Request): Headers {
  const origin = request.headers.get('origin') ?? ''
  const headers = new Headers({
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  })
  if (ORIGENS_LOCAIS_PERMITIDAS.has(origin) || ORIGENS_PUBLICAS_PERMITIDAS.has(origin)) headers.set('Access-Control-Allow-Origin', origin)
  return headers
}

function response(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) })
}

function erroCodigo(error: { code?: string | null; message?: string | null } | null | undefined): string {
  if (error?.code === '42501') return 'NAO_AUTORIZADO'
  if (error?.code === 'P0002') return 'NAO_ENCONTRADO'
  if (error?.code === '23505') return 'DUPLICIDADE'
  if (error?.code === '22023') return 'DADOS_INVALIDOS'
  return 'OPERACAO_INDISPONIVEL'
}

function statusHttp(code: string): number {
  if (code === 'NAO_AUTORIZADO') return 403
  if (code === 'NAO_ENCONTRADO') return 404
  if (code === 'DADOS_INVALIDOS' || code === 'DUPLICIDADE') return 422
  return 502
}

function mensagemSegura(typed: { code?: string; message?: string }, codigo: string): string {
  const detalhe = typed.message ?? ''
  if (codigo === 'NAO_AUTORIZADO' && detalhe.includes('e-mail')) return 'A sessão atual não corresponde ao convite.'
  if (codigo === 'NAO_ENCONTRADO') return 'O convite não existe, expirou ou foi removido.'
  if (detalhe.includes('já foi encerrada') || detalhe.includes('já foi aceita')) return 'Este convite já foi utilizado ou encerrado.'
  if (detalhe.includes('Aguarde')) return detalhe
  if (detalhe.includes('aceite do titular')) return 'O convite ainda aguarda o aceite do titular.'
  if (codigo === 'DUPLICIDADE') return 'Já existe um vínculo ou convite para este membro.'
  if (codigo === 'DADOS_INVALIDOS' && detalhe.includes('papel')) return 'O papel selecionado não é permitido.'
  return 'Não foi possível concluir a gestão de acesso.'
}

function clienteServico(): SupabaseClient {
  if (!supabaseUrl || !serviceKey) throw new Error('Configuração segura do servidor de acessos ausente.')
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

function clientePublico(): SupabaseClient {
  if (!supabaseUrl || !anonKey) throw new Error('Configuração pública do Supabase ausente.')
  return createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

type Ator = { id: string; email: string | null; confirmado: boolean }

async function autenticar(request: Request): Promise<Ator | Response> {
  if (!supabaseUrl || !anonKey) return response(request, { erro: 'Configuração pública do Supabase ausente.' }, 503)
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return response(request, { erro: 'Token de autenticação ausente.' }, 401)
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await client.auth.getUser(authorization.slice('Bearer '.length))
  if (error || !data.user) return response(request, { erro: 'Token de autenticação inválido ou expirado.' }, 401)
  try { await exigirAtivacaoServico(client) } catch { return response(request, { codigo: 'NAO_AUTORIZADO', erro: 'Ativação ou sessão não autorizada.' }, 403) }
  return { id: data.user.id, email: data.user.email ?? null, confirmado: Boolean(data.user.email_confirmed_at) }
}

function redirectSeguro(request: Request): string | Response {
  const redirect = Deno.env.get('EQUIPE_INVITE_REDIRECT_URL')?.trim()
  if (!redirect) return response(request, { codigo: 'CONVITE_NAO_CONFIGURADO', erro: 'O endereço seguro de aceite ainda não foi configurado no Supabase.' }, 503)
  try {
    const url = new URL(redirect)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') throw new Error('redirect inseguro')
  } catch {
    return response(request, { codigo: 'CONVITE_NAO_CONFIGURADO', erro: 'O endereço seguro de aceite está inválido.' }, 503)
  }
  return redirect
}

function redirectComConvite(redirect: string, conviteId: string): string {
  const url = new URL(redirect)
  url.searchParams.set('convite', conviteId)
  return url.toString()
}

async function redirectAutorizado(admin: SupabaseClient, conviteId: string, contextoId: unknown, base: string): Promise<string> {
  const { data, error } = await admin.from('equipe_acesso_convites').select('clinicas_papeis').eq('id', conviteId).single()
  if (error || !data || !Array.isArray(data.clinicas_papeis)) throw new Error('Contexto do convite indisponível.')
  const vinculos = data.clinicas_papeis as { clinica_id: string }[]
  const escolhido = vinculos.find(v => v.clinica_id === contextoId) ?? (vinculos.length === 1 ? vinculos[0] : undefined)
  if (!escolhido) throw new Error('Selecione uma unidade vinculada ao convite.')
  const { data: clinicas, error: erroClinica } = await admin.from('clinicas').select('id,nome').eq('id', escolhido.clinica_id)
  if (erroClinica) throw new Error('Unidade do convite indisponível.')
  const unidade = identidadeEmailConvite(clinicas ?? [], [escolhido])
  if (unidade === 'conjunta') throw new Error('Unidade de retorno não configurada.')
  const publica = Deno.env.get(unidade === 'brotas' ? 'EQUIPE_INVITE_REDIRECT_BROTAS_URL' : 'EQUIPE_INVITE_REDIRECT_IPUPIARA_URL')?.trim()
  return redirectUnidade(unidade, base, publica)
}

async function rpc<T>(admin: SupabaseClient, name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(name, args)
  if (error) throw Object.assign(new Error(error.message), { code: error.code, details: error.details })
  return data as T
}

async function emailAuth(admin: SupabaseClient, userId: string | null): Promise<{ email: string | null; confirmado: boolean }> {
  if (!userId) return { email: null, confirmado: false }
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) return { email: null, confirmado: false }
  return { email: data.user.email ?? null, confirmado: Boolean(data.user.email_confirmed_at) }
}

async function contaAuthPorId(admin: SupabaseClient, userId: string): Promise<ContaConvite | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user?.email) return null
  return { id: data.user.id, email: data.user.email, confirmado: Boolean(data.user.email_confirmed_at) }
}

async function listar(admin: SupabaseClient, actorId: string, body: Record<string, unknown>) {
  // Esta operação é deliberadamente somente leitura. E-mail confirmado no Auth
  // não é aceite desta solicitação e nunca dispara RPC de concessão.
  const dados = await rpc<Record<string, unknown>>(admin, 'equipe_acesso_listar', {
    p_solicitante_id: actorId,
    p_membro_id: body.membroId,
    p_clinica_contexto_id: body.clinicaContextoId,
  })
  const auth = await emailAuth(admin, typeof dados.usuario_id === 'string' ? dados.usuario_id : null)
  const ativacao = await rpc<Record<string, unknown> | null>(admin, 'acesso_direto_consultar_operacao', { p_ator: actorId, p_membro: body.membroId, p_contexto: body.clinicaContextoId })
  return { ...dados, login_email: auth.email, conta_confirmada: auth.confirmado, ativacao }
}

async function localizarConta(admin: SupabaseClient, email: string): Promise<{ id: string; email: string; confirmado: boolean } | null> {
  const data = await rpc<Record<string, unknown> | null>(admin, 'equipe_acesso_localizar_conta', { p_email: email })
  if (!data || typeof data.id !== 'string' || typeof data.email !== 'string') return null
  return { id: data.id, email: data.email, confirmado: Boolean(data.confirmado) }
}

async function reservar(admin: SupabaseClient, actorId: string, conviteId: string) {
  return rpc<Record<string, unknown>>(admin, 'equipe_acesso_reservar_envio', { p_solicitante_id: actorId, p_convite_id: conviteId })
}

async function finalizar(admin: SupabaseClient, actorId: string, conviteId: string, reservaId: string, sucesso: boolean, erroCodigo?: string | null) {
  return rpc<Record<string, unknown>>(admin, 'equipe_acesso_finalizar_envio', {
    p_solicitante_id: actorId,
    p_convite_id: conviteId,
    p_reserva_id: reservaId,
    p_sucesso: sucesso,
    p_erro_codigo: erroCodigo ?? null,
  })
}

async function registrarAuth(admin: SupabaseClient, actorId: string, conviteId: string, userId: string, email: string) {
  return rpc<Record<string, unknown>>(admin, 'equipe_acesso_registrar_auth', {
    p_solicitante_id: actorId,
    p_convite_id: conviteId,
    p_auth_user_id: userId,
    p_auth_email: email,
  })
}

async function enviarOtp(email: string, redirect: string, conviteId: string) {
  const client = clientePublico()
  return client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectComConvite(redirect, conviteId) } })
}

async function aplicarPendente(admin: SupabaseClient, actorId: string, conviteId: string, conta: ContaConvite) {
  return rpc<Record<string, unknown>>(admin, 'equipe_acesso_aplicar', {
    p_solicitante_id: actorId,
    p_convite_id: conviteId,
    p_auth_user_id: conta.id,
    p_auth_email: conta.email,
    p_confirmado: false,
  })
}

async function garantirConta(
  admin: SupabaseClient,
  actorId: string,
  conviteId: string,
  email: string,
  authUserId: string | null,
  permitirCriar: boolean,
  redirect: string,
) {
  return garantirContaDoConvite({ email, authUserId, permitirCriar }, {
    buscarPorId: (id) => contaAuthPorId(admin, id),
    localizarPorEmailExato: (emailExato) => localizarConta(admin, emailExato),
    criarConvite: async (emailExato) => {
      // A solicitação persistida já foi autorizada pela RPC e teve o envio reservado.
      // Não recebemos identidade visual do navegador nem atualizamos metadata de contas existentes.
      const { data: conviteEmail, error: erroConvite } = await admin.from('equipe_acesso_convites')
        .select('clinicas_papeis').eq('id', conviteId).single()
      if (erroConvite || !conviteEmail) throw new Error('Contexto autorizado do convite indisponível.')
      const ids = Array.isArray(conviteEmail.clinicas_papeis)
        ? conviteEmail.clinicas_papeis.map((v: { clinica_id: string }) => v.clinica_id) : []
      const { data: clinicasEmail, error: erroClinicas } = await admin.from('clinicas').select('id,nome').in('id', ids)
      if (erroClinicas) throw new Error('Identidade das unidades do convite indisponível.')
      const marca = identidadeEmailConvite(clinicasEmail ?? [], conviteEmail.clinicas_papeis)
      const { data, error } = await admin.auth.admin.inviteUserByEmail(emailExato, {
        redirectTo: redirectComConvite(redirect, conviteId),
        data: { equipe_email_unidades: marca },
      })
      if (error || !data.user?.email) throw Object.assign(new Error(error?.message ?? 'Auth não devolveu a conta criada.'), { code: error?.code })
      return { id: data.user.id, email: data.user.email, confirmado: Boolean(data.user.email_confirmed_at) }
    },
    registrarNoConvite: async (conta) => { await registrarAuth(admin, actorId, conviteId, conta.id, conta.email) },
  })
}

async function preparar(admin: SupabaseClient, actorId: string, body: Record<string, unknown>, request: Request) {
  const modo = body.modo === 'vinculo' ? 'vinculo' : 'convite'
  const redirect = redirectSeguro(request)
  if (redirect instanceof Response) return redirect
  const convite = await rpc<Record<string, unknown>>(admin, 'equipe_acesso_preparar', {
    p_solicitante_id: actorId,
    p_membro_id: body.membroId,
    p_clinica_contexto_id: body.clinicaContextoId,
    p_email: body.email,
    p_modo: modo,
    p_clinicas_papeis: body.clinicasPapeis,
    p_chave_idempotencia: body.chaveIdempotencia,
  })
  if (convite.status === 'enviado' || convite.status === 'aceito') return { ...convite, mensagem: 'Esta tentativa já foi processada.' }
  if (convite.status === 'expirado' || convite.status === 'cancelado') {
    return response(request, { codigo: 'CONVITE_ENCERRADO', erro: 'Esta tentativa expirou. Inicie uma nova solicitação.' }, 422)
  }
  const conviteId = String(convite.id)
  const email = String(convite.email)
  const reserva = await reservar(admin, actorId, conviteId)
  const reservaId = String(reserva.reserva_id)
  try {
    const retorno = await redirectAutorizado(admin, conviteId, body.clinicaContextoId, redirect)
    const resultado = await garantirConta(admin, actorId, conviteId, email, typeof convite.auth_user_id === 'string' ? convite.auth_user_id : null, modo === 'convite', retorno)
    if (resultado.origem !== 'criada') {
      const { error } = await enviarOtp(resultado.conta.email, retorno, conviteId)
      if (error) throw Object.assign(new Error(error.message), { code: error.code })
    }
    const aplicada = await aplicarPendente(admin, actorId, conviteId, resultado.conta)
    await finalizar(admin, actorId, conviteId, reservaId, true)
    return { ...aplicada, email: resultado.conta.email, mensagem: modo === 'vinculo'
      ? 'Enviamos uma confirmação ao titular da conta. O vínculo só será ativado após o aceite.'
      : 'Convite enviado. O acesso ficará pendente até a pessoa aceitar e definir a própria senha.' }
  } catch (error) {
    await finalizar(admin, actorId, conviteId, reservaId, false, erroCodigo(error as { code?: string; message?: string })).catch(() => undefined)
    if (error instanceof ErroContaConvite && error.codigo === 'CONTA_NAO_ENCONTRADA') {
      return response(request, { codigo: error.codigo, erro: 'Não localizamos uma conta com esse e-mail. Use Enviar convite para uma pessoa sem conta.' }, 404)
    }
    if (error instanceof ErroContaConvite) {
      return response(request, { codigo: error.codigo, erro: 'A conta de acesso não corresponde a esta solicitação.' }, 422)
    }
    return response(request, { codigo: 'VINCULO_NAO_CONCLUIDO', erro: 'O Auth processou a conta, mas o vínculo ficou pendente para recuperação segura; nenhum acesso ativo foi criado.' }, 502)
  }
}

async function reenviar(admin: SupabaseClient, actorId: string, body: Record<string, unknown>, request: Request) {
  const redirect = redirectSeguro(request)
  if (redirect instanceof Response) return redirect
  const convite = await rpc<Record<string, unknown>>(admin, 'equipe_acesso_convite_detalhar', { p_solicitante_id: actorId, p_convite_id: body.conviteId, p_clinica_contexto_id: body.clinicaContextoId })
  if (['aceito', 'cancelado', 'expirado'].includes(String(convite.status))) return response(request, { codigo: 'CONVITE_ENCERRADO', erro: 'Esta solicitação não pode ser reenviada.' }, 422)
  const conviteId = String(convite.id)
  const reserva = await reservar(admin, actorId, conviteId)
  const reservaId = String(reserva.reserva_id)
  const email = String(convite.email)
  try {
    const retorno = await redirectAutorizado(admin, conviteId, body.clinicaContextoId, redirect)
    const resultado = await garantirConta(admin, actorId, conviteId, email, typeof convite.auth_user_id === 'string' ? convite.auth_user_id : null, convite.modo !== 'vinculo', retorno)
    if (resultado.origem !== 'criada') {
      const envio = await enviarOtp(resultado.conta.email, retorno, conviteId)
      if (envio.error) throw Object.assign(new Error(envio.error.message), { code: envio.error.code })
    }
    await aplicarPendente(admin, actorId, conviteId, resultado.conta)
    const finalizado = await finalizar(admin, actorId, conviteId, reservaId, true)
    return { ...finalizado, mensagem: 'Solicitação reenviada. O acesso continua pendente até o aceite.' }
  } catch (error) {
    await finalizar(admin, actorId, conviteId, reservaId, false, erroCodigo(error as { code?: string; message?: string })).catch(() => undefined)
    if (error instanceof ErroContaConvite && error.codigo === 'CONTA_NAO_ENCONTRADA') {
      return response(request, { codigo: error.codigo, erro: 'A conta vinculada não foi localizada.' }, 404)
    }
    return response(request, { codigo: convite.modo === 'vinculo' ? 'CONFIRMACAO_NAO_ENVIADA' : 'CONVITE_NAO_ENVIADO', erro: 'Não foi possível reenviar a confirmação. A tentativa pode ser repetida com segurança.' }, 502)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return response(request, { erro: 'Método não permitido.' }, 405)
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return response(request, { erro: 'JSON inválido.' }, 400) }
  const actor = await autenticar(request)
  if (actor instanceof Response) return actor
  let admin: SupabaseClient
  try { admin = clienteServico() } catch { return response(request, { codigo: 'SERVICO_NAO_CONFIGURADO', erro: 'A função segura de acessos ainda não foi configurada.' }, 503) }
  try {
    const action = body.acao
    if (action === 'alterar' || action === 'preparar') {
      const pendente = await rpc<Record<string, unknown> | null>(admin, 'acesso_direto_consultar_operacao', { p_ator: actor.id, p_membro: body.membroId, p_contexto: body.clinicaContextoId })
      if (pendente && pendente.estado !== 'ativa') return response(request, { codigo: 'CONFLITO', erro: 'Conclua a ativação ou retome a preparação do acesso direto antes desta operação.' }, 409)
    }
    if (action === 'listar') return response(request, await listar(admin, actor.id, body))
    if (action === 'preparar') return response(request, await preparar(admin, actor.id, body, request))
    if (action === 'reenviar') return response(request, await reenviar(admin, actor.id, body, request))
    if (action === 'alterar') return response(request, await rpc(admin, 'equipe_acesso_alterar', {
      p_solicitante_id: actor.id, p_membro_id: body.membroId, p_clinica_contexto_id: body.clinicaContextoId,
      p_clinica_alvo_id: body.clinicaAlvoId, p_acao: body.acaoAcesso, p_papel: body.papel ?? null,
    }))
    if (action === 'aceitar') {
      if (!actor.confirmado) return response(request, { codigo: 'EMAIL_NAO_CONFIRMADO', erro: 'Confirme o e-mail da sessão antes de aceitar o acesso.' }, 403)
      return response(request, await rpc(admin, 'equipe_acesso_aceitar', { p_convite_id: body.conviteId, p_auth_user_id: actor.id, p_auth_email: actor.email, p_email_confirmado: actor.confirmado }))
    }
    return response(request, { codigo: 'ACAO_INVALIDA', erro: 'Operação de acesso não reconhecida.' }, 400)
  } catch (error) {
    const typed = error as { code?: string; message?: string }
    const codigo = erroCodigo(typed)
    return response(request, { codigo, erro: mensagemSegura(typed, codigo) }, statusHttp(codigo))
  }
})

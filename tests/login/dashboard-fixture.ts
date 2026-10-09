import { expect, type Page } from '@playwright/test'
import type { Papel } from '../../src/hooks/usePapelNaClinica'

export const clinicas = [
  { id: '22222222-2222-4222-8222-222222222222', nome: 'Clínica Brotas', subdomain: 'brotas', cor_primaria: '#2563eb', cor_secundaria: '#3b82f6', cor_menu: '#1e3a8a' },
  { id: '33333333-3333-4333-8333-333333333333', nome: 'Clínica Ipupiara', subdomain: 'ipupiara', cor_primaria: '#16a34a', cor_secundaria: '#22c55e', cor_menu: '#14532d' },
]
export interface PerfilSintetico {
  nome: string | null
  erroNome?: boolean
  foto?: 'vinculada' | 'erro' | 'sem-vinculo-clinica' | 'outra-pessoa'
  anonimo?: boolean
  demoraNome?: number
  papeis?: Papel[]
  segundaConta?: boolean
  aguardarAcesso?: () => Promise<void>
}
export async function abrirMenu(page: Page) {
  await expect(page.locator('.app-shell-header')).toBeVisible()
  const abrir = page.getByRole('button', { name: 'Abrir menu', exact: true })
  if (await abrir.isVisible()) await abrir.click()
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
}
export async function fecharMenu(page: Page) {
  const fechar = page.getByRole('button', { name: 'Fechar menu', exact: true })
  if (await fechar.isVisible()) await fechar.click()
}
export async function preparar(page: Page, papel: Papel = 'proprietaria', modo: 'normal' | 'erro-agenda' | 'erro-acesso' | 'lento' = 'normal', perfil: PerfilSintetico = { nome: 'Pessoa Sintética' }) {
  const primeiroUsuario = { id: '11111111-1111-4111-8111-111111111111', email: 'login@example.invalid', aud: 'authenticated' }
  const membroId = '44444444-4444-4444-8444-444444444444'
  const escritas: string[] = [], consultas: { recurso: string; usuario: string | null; clinica: string | null }[] = []
  const token = (id: string) => [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })).toString('base64url'), 'synthetic'].join('.')
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const json = (data: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) })
    const user = perfil.segundaConta ? { ...primeiroUsuario, id: '55555555-5555-4555-8555-555555555555', email: 'outro-login@example.invalid' } : primeiroUsuario
    if (url.pathname.endsWith('/auth/v1/user')) return json(user)
    if (url.pathname.endsWith('/auth/v1/token')) return json({ access_token: token(user.id), refresh_token: 'synthetic', expires_in: 3600, token_type: 'bearer', user })
    if (url.pathname.endsWith('/auth/v1/logout')) return route.fulfill({ status: 204, headers })
    const recurso = url.pathname.split('/').pop() ?? ''
    // Resposta explicitamente SINTÉTICA para a guarda agora habilitada na release.
    // Sem esta fixture, POST era recusado e a tela bloqueava corretamente.
    if (url.pathname === '/rest/v1/rpc/acesso_direto_estado' && request.method() === 'POST') return json({ estado: 'normal' })
    const leituraPost = (url.pathname.startsWith('/rest/v1/rpc/') && ['equipe_listar', 'equipe_foto_autorizar', 'financeiro_dashboard_proprietaria'].includes(recurso)) || (['equipe-acessos', 'meu-perfil'].includes(recurso) && ['listar', 'consultar'].includes(request.postDataJSON().acao))
    if (request.method() !== 'GET' && !leituraPost) { escritas.push(url.pathname); return json({ message: 'Mutação sintética bloqueada' }, 403) }
    consultas.push({ recurso, usuario: url.searchParams.get('usuario_id') ?? url.searchParams.get('id'), clinica: url.searchParams.get('clinica_id') ?? request.headers()['x-clinica-id'] ?? null })
    if (recurso === 'meu-perfil') return json({ message: 'Function not found' }, 404)
    if (recurso === 'usuarios') {
      const nome = perfil.nome
      if (perfil.demoraNome) await new Promise(resolve => setTimeout(resolve, perfil.demoraNome))
      return perfil.erroNome ? json({ message: 'Falha sintética de perfil' }, 503) : json(nome === null ? [] : [{ nome_completo: nome }])
    }
    if (recurso === 'equipe_membros') return json(perfil.foto && perfil.foto !== 'outra-pessoa' && !perfil.segundaConta ? [{ id: membroId }] : [])
    if (recurso === 'equipe_membros_clinicas') return json(perfil.foto === 'sem-vinculo-clinica' ? [] : [{ membro_id: membroId }])
    if (recurso === 'equipe_listar') {
      const args = request.postDataJSON()
      expect(Object.keys(args)).toEqual(['p_clinica_contexto_id'])
      expect(clinicas.some(c => c.id === args.p_clinica_contexto_id)).toBe(true)
      return json(perfil.foto && !perfil.segundaConta ? [{ id: membroId, nome_completo: perfil.nome, acesso_status: 'ativo_na_unidade', clinicas: perfil.foto === 'sem-vinculo-clinica' ? [] : clinicas }] : [])
    }
    if (recurso === 'equipe-acessos') {
      const args = request.postDataJSON()
      expect(args.acao).toBe('listar')
      const id = perfil.foto === 'outra-pessoa' ? '77777777-7777-4777-8777-777777777777' : user.id
      return json({ membro_id: membroId, usuario_id: id, login_email: user.email, conta_confirmada: true, convites: [], clinicas: clinicas.map(c => ({ ...c, usuario_id: id, papel, ativo: true, status: 'acesso_ativo' })) })
    }
    if (recurso === 'equipe_foto_autorizar') {
      const args = request.postDataJSON()
      expect(args.p_membro_id).toBe(membroId)
      expect(args.p_escrita).toBe(false)
      return json({ membro_id: membroId, clinica_id: args.p_clinica_id, caminho: `${membroId}/66666666-6666-4666-8666-666666666666.jpg`, revisao: 1, pode_editar: true })
    }
    if (url.pathname.includes('/storage/v1/object/equipe-fotos/')) {
      expect(request.headers().authorization).toContain('Bearer ')
      expect(request.headers()['x-clinica-id']).toBeTruthy()
      // Minimal synthetic JPEG; no real person or external image is used.
      return perfil.foto === 'erro' ? json({ message: 'Foto indisponível' }, 503) : route.fulfill({ headers, contentType: 'image/jpeg', body: Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdAAf/2Q==', 'base64') })
    }
    if (recurso === 'financeiro_dashboard_proprietaria') return json({ message: 'Consulta financeira indisponível no cenário sintético' }, 503)
    if (recurso === 'usuarios_clinicas') {
      if (modo === 'erro-acesso') return json({ message: 'Falha sintética' }, 500)
      if (modo === 'lento') {
        if (perfil.aguardarAcesso) await perfil.aguardarAcesso()
        else await new Promise(resolve => setTimeout(resolve, 500))
      }
      const vinculos = clinicas.filter(c => !url.searchParams.has('clinica_id') || url.searchParams.get('clinica_id') === `eq.${c.id}`).map(c => ({ clinica_id: c.id, papel: perfil.papeis?.[clinicas.indexOf(c)] ?? papel }))
      return json(request.headers().accept?.includes('object') ? vinculos[0] : vinculos)
    }
    if (recurso === 'clinicas') return json(clinicas)
    if (recurso === 'agendamentos') return modo === 'erro-agenda' ? json({ message: 'Falha sintética' }, 500) : route.fulfill({ status: 200, headers: { ...headers, 'content-range': '*/0', 'access-control-expose-headers': 'content-range' }, contentType: 'application/json', body: '[]' })
    if (recurso === 'especialidades') return json([{ id: 'especialidade-sintetica', nome: 'Especialidade Sintética' }])
    if (recurso === 'servicos') {
      const clinica = clinicas.find(c => url.searchParams.get('clinica_id') === `eq.${c.id}`)
      return json([{ id: 'servico-sintetico', nome: `Serviço Sintético ${clinica?.nome}`, especialidade_id: 'especialidade-sintetica', especialidades: { nome: 'Especialidade Sintética' }, preco: 123.45, duracao_minutos: 30 }])
    }
    return json([])
  })
  if (!perfil.anonimo) await page.addInitScript(({ jwt, user }) => {
    if (!localStorage.getItem('sb-financeiro-auth-token')) localStorage.setItem('sb-financeiro-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'synthetic', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }))
  }, { jwt: token(primeiroUsuario.id), user: primeiroUsuario })
  return { escritas, consultas }
}

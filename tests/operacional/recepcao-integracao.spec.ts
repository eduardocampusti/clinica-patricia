import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

// Executa o App normal, com autenticação e serviços sintéticos interceptados.
// A configuração Vite aponta exclusivamente para operacional.synthetic.invalid.
async function preparar(page: Page, papel = 'recepcao', quantidade = 205) {
  const errosPagina: string[] = []
  page.on('pageerror', erro => errosPagina.push(erro.message))
  const clinicas = [
    { id: '22222222-2222-4222-8222-222222222222', nome: 'Clínica Brotas', cor_primaria: '#2563eb', cor_secundaria: '#1d4ed8', cor_menu: '#1e305d' },
    { id: '33333333-3333-4333-8333-333333333333', nome: 'Clínica Ipupiara', cor_primaria: '#16a34a', cor_secundaria: '#15803d', cor_menu: '#183b33' },
  ]
  const usuario = { id: '11111111-1111-4111-8111-111111111111', email: 'teste@example.invalid', aud: 'authenticated' }
  const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: usuario.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })).toString('base64url'), 'synthetic'].join('.')
  const estado = { falha: false, financeiroFalho: false, caixaModo: 'operacional' as 'operacional' | 'ausente' | 'legado' | 'permissao' | 'estado_invalido' | 'valor_invalido' | 'contexto_invalido', semPermissao: false, truncar: false, atraso: 0, cpfAtraso: 0, escritas: [] as string[], paginas: [] as number[], errosPagina }
  await page.addInitScript(({ jwt, usuario }) => {
    localStorage.setItem('sb-operacional-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'synthetic', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user: usuario }))
    if (!localStorage.getItem('clinica-patricia:tema')) localStorage.setItem('clinica-patricia:tema', 'claro')
  }, { jwt, usuario })
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort())
  await page.route('**/auth/v1/user', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(usuario) }))
  await page.route('**/rest/v1/**', async route => {
    const req = route.request(), u = new URL(req.url()), tabela = u.pathname.split('/').at(-1)!, singular = req.headers().accept?.includes('object')
    const json = (dado: unknown, count?: number, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: count === undefined ? {} : { 'content-range': `0-${Math.max(0, Array.isArray(dado) ? dado.length - 1 : 0)}/${count}`, 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(dado) })
    const clinica = u.searchParams.get('clinica_id')?.slice(3) ?? clinicas[0].id
    const data = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const linhas = Array.from({ length: quantidade }, (_, i) => ({ id: `a${String(i).padStart(4, '0')}`, clinica_id: clinica, paciente_id: i === 204 ? 'p0' : `p${i}`, profissional_id: `prof${i % 2}`, data, hora_inicio: i < 3 ? '00:01:00' : '23:00:00', hora_fim: i < 3 ? '00:31:00' : '23:30:00', status: ['aguardando', 'agendado', 'confirmado', 'em_atendimento', 'concluido'][i % 5], updated_at: '2026-10-03T12:00:00+00:00', pacientes: { nome_completo: `${clinica === clinicas[0].id ? 'Brotas' : 'Ipupiara'} Paciente ${i}` }, profissionais: { nome_completo: `Profissional ${i % 2}`, especialidades: { nome: 'Clínica geral' } } }))
    const leiturasRpc = ['financeiro_resumo_caixa', 'paciente_buscar_por_cpf', 'paciente_responsavel_legal_resumo', 'agenda_manual_disponivel', 'paciente_cpf_pendente', 'paciente_indicadores']
    if (req.method() !== 'GET' && req.method() !== 'HEAD' && !leiturasRpc.includes(tabela)) { estado.escritas.push(tabela); return json({ message: 'Gravação proibida no teste' }, undefined, 400) }
    if (tabela === 'usuarios_clinicas') return json(singular ? { papel } : u.searchParams.get('select') === 'papel' ? [{ papel }] : clinicas.map(c => ({ clinica_id: c.id, papel })))
    if (tabela === 'clinicas') return json(clinicas)
    if (tabela === 'agendamentos') {
      if (estado.atraso && clinica === clinicas[0].id) await new Promise(resolve => setTimeout(resolve, estado.atraso))
      if (estado.falha || estado.semPermissao) return json({ code: estado.semPermissao ? '42501' : 'XX000' }, undefined, estado.semPermissao ? 403 : 500)
      if (u.searchParams.get('select') === 'updated_at') return json(linhas.length ? [{ updated_at: linhas[0].updated_at }] : [], quantidade)
      const offset = Number(u.searchParams.get('offset') ?? 0), limit = Number(u.searchParams.get('limit') ?? quantidade)
      estado.paginas.push(offset)
      return json(linhas.slice(offset, offset + (estado.truncar ? 100 : limit)), quantidade)
    }
    if (tabela === 'sessoes_caixa') {
      if (estado.caixaModo === 'ausente') return json(singular ? null : [])
      const sessao = { id: clinica, status: 'aberto', aberto_em: '2026-10-03T10:45:00-03:00', valor_abertura: '100', idempotency_key: estado.caixaModo === 'legado' ? null : 'teste' }
      return json(singular ? sessao : [sessao])
    }
    if (tabela === 'financeiro_resumo_caixa') {
      if (estado.financeiroFalho) return json({ code: 'XX000' }, undefined, 500)
      if (estado.caixaModo === 'permissao') return json({ code: '42501' }, undefined, 403)
      const id = req.postDataJSON().p_sessao_caixa_id
      return json({ sessao_caixa_id: id, clinica_id: estado.caixaModo === 'contexto_invalido' ? clinicas[1].id : id, clinica_nome: 'Clínica', status: estado.caixaModo === 'estado_invalido' ? 'desconhecido' : 'aberto', aberto_em: '2026-10-03T10:45:00-03:00', aberto_por_nome: 'Operador de teste', resumo: { valor_abertura: '100', total_dinheiro: '420', total_pix: '680', total_cartao_credito: '350', total_recebimentos_brutos: estado.caixaModo === 'valor_invalido' ? null : '1450', valor_esperado: '570' } })
    }
    if (tabela === 'paciente_buscar_por_cpf') { if (estado.cpfAtraso) await new Promise(resolve => setTimeout(resolve, estado.cpfAtraso)); return json([{ id: 'p0', nome_completo: 'Brotas Paciente 0', ativo: true }]) }
    if (tabela === 'pacientes') {
      const id = u.searchParams.get('id')?.slice(3) ?? 'p0'
      return json([{ id, nome_completo: `Brotas Paciente ${id.slice(1)}`, data_nascimento: null, sexo: null, telefone: null, endereco: null, foto_path: null, created_at: '2026-10-03T00:00:00Z', ativo: true }], 1)
    }
    if (tabela === 'paciente_cpf_pendente') return json(false)
    return json([], 0)
  })
  return estado
}
async function abrir(page: Page) {
  await page.goto('/sistema/brotas/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Movimento de hoje' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Atualizar', exact: true })).toBeEnabled()
}

test('preparação para publicação: contrato do caixa e destino geral da Agenda', async ({ page }) => {
  const s = await preparar(page, 'recepcao', 15); await abrir(page)
  const abrirCaixa = page.getByRole('button', { name: /Caixa do turno/ })
  if (await abrirCaixa.getAttribute('aria-expanded') === 'false') await abrirCaixa.click()
  const caixa = page.locator('#rp-caixa')
  await expect(caixa).toContainText('Recebido no turno')
  await expect(caixa).toContainText('R$ 1.450,00')
  await expect(caixa).toContainText('Saldo esperado em dinheiro')
  await expect(caixa).toContainText('R$ 570,00')
  await expect(caixa).toContainText('Período: abertura até a consulta')
  const casos: Array<[typeof s.caixaModo, string]> = [
    ['ausente', 'Nenhuma sessão de caixa aberta está acessível'],
    ['legado', 'O resumo homologado não está disponível'],
    ['permissao', 'Caixa sem permissão'],
    ['estado_invalido', 'Caixa indisponível'],
    ['valor_invalido', 'Caixa indisponível'],
    ['contexto_invalido', 'Caixa indisponível'],
  ]
  for (const [modo, mensagem] of casos) {
    s.caixaModo = modo
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Atualizar', exact: true })).toBeEnabled()
    await expect(caixa).toContainText(mensagem)
    await expect(caixa).not.toContainText('R$')
    await expect(caixa.getByRole('button', { name: /Abrir Financeiro/ })).toBeVisible()
  }
  s.caixaModo = 'operacional'; s.financeiroFalho = true
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
  await expect(caixa).toContainText('Caixa indisponível')
  await expect(caixa).not.toContainText('R$')
  await page.getByTestId('registro').first().getByRole('button', { name: 'Abrir Agenda', exact: true }).click()
  await expect(page).toHaveURL(/\/sistema\/brotas\/agenda$/)
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible()
  expect(s.escritas).toEqual([])
  expect(s.errosPagina).toEqual([])
})

test('App normal: conjunto completo, filtros, CPF exato, abas e temas', async ({ page }, info) => {
  const s = await preparar(page); await abrir(page)
  await expect(page.locator('.rp-criteria').first()).toContainText('205 agendamentos / 204 pacientes distintos')
  expect(s.paginas).toContain(200)
  await expect(page.getByTestId('registro')).toHaveCount(41)
  await expect(page.locator('.rp')).not.toContainText(/simulad|min de espera|Ordem de chegada|Recebimento confirmado/i)
  await expect(page.locator('.rp-payment')).toHaveCount(0)
  await page.getByLabel('Buscar paciente').fill('Paciente 0'); await expect(page.getByTestId('registro')).toHaveCount(1)
  await page.getByLabel('Buscar paciente').fill(''); await page.getByLabel('Filtrar por profissional').selectOption('prof1'); await expect(page.getByTestId('registro')).toHaveCount(20)
  await expect(page.locator('.rp-metrics').first()).toContainText('205')
  await page.getByLabel('Filtrar por profissional').selectOption('todos')
  await page.getByRole('tab', { name: /Aguardando/ }).focus(); await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: /Concluídos/ })).toBeFocused()
  const caixaAba = await page.getByRole('tab', { name: /Concluídos/ }).boundingBox(); expect(caixaAba!.x + caixaAba!.width).toBeLessThanOrEqual(info.project.use.viewport!.width)
  await page.getByRole('tab', { name: /Aguardando/ }).click()
  await page.getByLabel('Modalidade da busca').selectOption('cpf'); await page.getByLabel('CPF exato').fill('52998224725'); await page.getByRole('button', { name: 'Buscar CPF' }).click()
  await expect(page.getByTestId('registro')).toHaveCount(1)
  await page.getByLabel('Modalidade da busca').selectOption('nome')
  if (info.project.name !== 'desktop') {
    await expect(page.getByRole('button', { name: /Caixa do turno/ })).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('button', { name: /Pendências cadastrais/ })).toHaveAttribute('aria-expanded', 'false')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await mkdir('scratch/recepcao-integracao/capturas', { recursive: true })
  await page.screenshot({ path: `scratch/recepcao-integracao/capturas/${info.project.name}-volume-claro.png`, fullPage: true })
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
  await page.getByRole('tab', { name: /Aguardando/ }).focus(); await page.keyboard.press('End'); await expect(page.getByRole('tab', { name: /Concluídos/ })).toBeFocused()
  await page.screenshot({ path: `scratch/recepcao-integracao/capturas/${info.project.name}-volume-escuro.png`, fullPage: true })
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'escuro'); await expect(page.getByRole('heading', { name: 'Movimento de hoje' })).toBeVisible()
  expect(s.escritas).toEqual([])
})

test('vazio, falhas, leitura parcial e atualização malsucedida', async ({ page }) => {
  const s = await preparar(page, 'recepcao', 0); await abrir(page)
  await expect(page.getByText('Nenhum agendamento nesta data', { exact: true })).toBeVisible()
  const ultima = await page.locator('.rp-footer').innerText()
  s.falha = true; s.financeiroFalho = true
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Movimento indisponível' })).toBeVisible()
  await expect(page.locator('.rp-metrics')).not.toContainText('0')
  await expect(page.locator('.rp-footer')).toContainText('última leitura válida: ' + ultima.match(/Movimento atualizado: (.*?) · America/)![1])
  const expandir = page.getByRole('button', { name: /Caixa do turno/ }); if (await expandir.getAttribute('aria-expanded') === 'false') await expandir.click()
  await expect(page.locator('#rp-caixa')).not.toContainText('R$ 0')
  await expect(page.locator('#rp-caixa')).toContainText('Caixa indisponível')
  s.falha = false; s.semPermissao = true
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click(); await expect(page.locator('.rp')).toContainText('Movimento sem permissão')
  expect(s.escritas).toEqual([])
})

test('resposta truncada não produz totais', async ({ page }) => {
  const s = await preparar(page); s.truncar = true; await abrir(page)
  await expect(page.getByRole('alert').filter({ hasText: 'Movimento indisponível' })).toBeVisible()
  await expect(page.locator('.rp-metrics')).not.toContainText('205')
})

test('troca de clínica e filtro descarta respostas atrasadas', async ({ page }) => {
  const s = await preparar(page, 'recepcao', 5); s.atraso = 900
  await page.goto('/sistema/brotas/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Movimento de hoje' })).toBeVisible()
  await page.getByLabel('Selecionar clínica', { exact: true }).selectOption('33333333-3333-4333-8333-333333333333')
  await expect(page.getByTestId('registro').first()).toContainText('Ipupiara Paciente 0')
  await page.waitForTimeout(1100)
  await expect(page.locator('.rp-records')).not.toContainText('Brotas Paciente')
  s.cpfAtraso = 500
  await page.getByLabel('Modalidade da busca').selectOption('cpf'); await page.getByLabel('CPF exato').fill('52998224725'); await page.getByRole('button', { name: 'Buscar CPF' }).click()
  await page.getByLabel('Filtrar por profissional').selectOption('prof1')
  await page.getByLabel('Filtrar por profissional').selectOption('todos'); await page.waitForTimeout(600)
  await expect(page.getByTestId('registro')).toHaveCount(0)
  await expect(page.getByRole('tabpanel')).toContainText('Informe o CPF válido')
})

test('fluxos existentes abrem e cancelam sem gravar; paciente correto', async ({ page }) => {
  const s = await preparar(page, 'recepcao', 5); await abrir(page)
  await page.getByTestId('registro').first().getByRole('button', { name: 'Ver cadastro' }).click()
  await expect(page).toHaveURL(/\/pacientes$/)
  await expect(page.locator('.pacientes-pagina')).toContainText('Brotas Paciente 0')
  await expect(page.getByText('Cadastro encaminhado pelo painel', { exact: true })).toBeVisible()
  await page.goto('/sistema/brotas/dashboard'); await expect(page.getByRole('button', { name: '+ Novo paciente', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '+ Novo paciente', exact: true }).click(); await expect(page).toHaveURL(/\/pacientes$/)
  await expect(page.getByRole('button', { name: 'Fechar cadastro de paciente', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Fechar cadastro de paciente', exact: true }).click()
  await page.goto('/sistema/brotas/dashboard'); await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  await expect(page).toHaveURL(/\/agenda$/); await expect(page.getByRole('button', { name: 'Cancelar', exact: true }).first()).toBeVisible(); await page.getByRole('button', { name: 'Cancelar', exact: true }).first().click()
  expect(s.escritas).toEqual([])
  expect(s.errosPagina).toEqual([])
})

test('capturas compactas e último registro acessível', async ({ page }, info) => {
  await preparar(page, 'recepcao', 15); await abrir(page)
  await expect(page.getByTestId('registro')).toHaveCount(3)
  if (info.project.name === 'desktop') await expect(page.locator('#rp-caixa')).toContainText('R$ 1.450,00')
  else await expect(page.getByRole('button', { name: /Caixa do turno/ })).toHaveAttribute('aria-expanded', 'false')
  const fila = await page.getByRole('heading', { name: 'Movimento de hoje' }).boundingBox()
  expect(fila!.y).toBeLessThan(600)
  await mkdir('scratch/recepcao-integracao/capturas', { recursive: true })
  await page.screenshot({ path: `scratch/recepcao-integracao/capturas/${info.project.name}-claro.png`, fullPage: true })
  const ultima = page.getByTestId('registro').last().getByRole('button', { name: 'Ver cadastro' })
  await ultima.scrollIntoViewIfNeeded()
  const retangulo = await ultima.boundingBox(); expect(retangulo!.y + retangulo!.height).toBeLessThanOrEqual(info.project.use.viewport!.height)
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
  await page.screenshot({ path: `scratch/recepcao-integracao/capturas/${info.project.name}-escuro.png`, fullPage: true })
})

for (const papel of ['proprietaria', 'medico']) test(`Dashboard preservado: ${papel}`, async ({ page }) => {
  await preparar(page, papel, 0); await page.goto('/sistema/brotas/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Olá!' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Movimento de hoje' })).toHaveCount(0)
})

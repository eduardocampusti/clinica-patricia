import { expect, test, type Page } from '@playwright/test'

// O Vite sintético recompila um módulo grande no Windows e algumas recargas
// reais podem ultrapassar 30 s sem que o fluxo esteja travado.
test.beforeEach(() => { test.setTimeout(90_000) })

const inicial = { id: 'edicao-sintetica', clinica_id: 'clinica-sintetica', nome_completo: 'Ana Demonstração', data_nascimento: null, sexo: 'nao_informado', telefone: '77900000010', email: 'teste@example.invalid', endereco: 'Rua Sintética,  10\nBloco A, referência literal', observacoes: 'Observação administrativa sintética', foto_path: null, ativo: true, created_at: '2026-01-01T12:00:00Z', updated_at: '2026-09-25T12:00:00Z' }
type CenarioEndereco = 'legado' | 'vazio' | 'estruturado'
async function preparar(page: Page, erro?: string, comResponsavel = true, foto = false, falhaUpload = false, cpfPendente: boolean | null = false, cenarioEndereco: CenarioEndereco = 'legado', falhasEndereco = 0) {
  const enderecoInicial = cenarioEndereco === 'estruturado' ? {
    endereco: 'Rua Estruturada, 45, Apto 2, Centro, Brotas de Macaúbas - BA, CEP 47520-000',
    cep: '47520-000', logradouro: 'Rua Estruturada', numero: '45', complemento: 'Apto 2',
    bairro: 'Centro', cidade: 'Brotas de Macaúbas', uf: 'BA', endereco_historico: null,
  } : cenarioEndereco === 'vazio' ? {
    endereco: null, cep: null, logradouro: null, numero: null, complemento: null,
    bairro: null, cidade: null, uf: null, endereco_historico: null,
  } : {
    endereco: inicial.endereco, cep: null, logradouro: null, numero: null, complemento: null,
    bairro: null, cidade: null, uf: null, endereco_historico: null,
  }
  let paciente = { ...inicial, ...enderecoInicial, foto_path: foto ? 'clinica-sintetica/edicao-sintetica/imagem.png' : null }
  let cpfAtual = '52998224725' // fixture sintética; nunca é enviada à listagem
  const chamadas = [] as Record<string, unknown>[] & { liberarEndereco?: () => void; consultasViaCep?: () => number; falharProximaLista?: () => void; consultasLista?: () => number }
  let bloquearEndereco = falhasEndereco > 0
  let consultasViaCep = 0
  let falhasListaPendentes = 0
  let consultasLista = 0
  chamadas.liberarEndereco = () => { bloquearEndereco = false }
  chamadas.consultasViaCep = () => consultasViaCep
  chamadas.falharProximaLista = () => { falhasListaPendentes += 1 }
  chamadas.consultasLista = () => consultasLista
  await page.clock.setFixedTime(new Date('2026-09-26T12:00:00Z'))
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) return route.continue()
    if (url.hostname === 'viacep.com.br') {
      consultasViaCep += 1
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ cep: '47520-000', logradouro: 'Rua Remota', bairro: 'Bairro Remoto', localidade: 'Cidade Remota', uf: 'BA' }) })
    }
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    if (url.pathname.includes('/storage/v1/object/')) {
      expect(route.request().headers()['x-clinica-id']).toBe('clinica-sintetica')
      if (route.request().method() === 'POST') return route.fulfill({ status: falhaUpload ? 403 : 200, contentType: 'application/json', body: falhaUpload ? '{"message":"negado"}' : '{"Key":"foto-sintetica"}' })
      if (route.request().method() === 'DELETE') return route.fulfill({ contentType: 'application/json', body: '[]' })
      expect(route.request().method()).toBe('GET')
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9p0AAAAASUVORK5CYII=', 'base64') })
    }
    if (url.pathname.endsWith('/pacientes')) {
      if (route.request().method() === 'HEAD') return route.fulfill({ headers: { 'content-range': '*/1' }, body: '' })
      expect(route.request().method()).toBe('GET') // nenhum INSERT ou UPDATE direto
      expect(url.searchParams.get('select')).not.toMatch(/cpf/)
      const clinic = url.searchParams.get('clinica_id')
      const detalhe = url.searchParams.has('id')
      if (clinic === 'eq.clinica-b') return route.fulfill({ contentType: 'application/json', headers: { 'access-control-expose-headers': 'content-range', 'content-range': '*/0' }, body: '[]' })
      paciente.clinica_id = clinic?.slice(3) ?? paciente.clinica_id
      if (!detalhe) {
        consultasLista += 1
        if (falhasListaPendentes > 0) {
          falhasListaPendentes -= 1
          return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST000', message: 'falha sintética de atualização' }) })
        }
      }
      if (url.searchParams.get('select')?.endsWith('endereco_historico') && bloquearEndereco) {
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST000' }) })
      }
      return route.fulfill({ contentType: 'application/json', headers: { 'access-control-expose-headers': 'content-range', 'content-range': '0-0/1' }, body: JSON.stringify(detalhe ? paciente : [paciente]) })
    }
    if (url.pathname.endsWith('/rpc/paciente_responsavel_legal_resumo')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(comResponsavel ? [{ id: 'r', nome_completo: 'Responsável Sintético', vinculo: 'Mãe', telefone: '77900000011' }] : []) })
    if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(cpfPendente) })
    if (url.pathname.endsWith('/rpc/paciente_ler_cpf')) {
      const payload = route.request().postDataJSON()
      expect(payload).toEqual({ p_paciente_id: inicial.id, p_clinica_id: paciente.clinica_id })
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(cpfPendente ? null : cpfAtual) })
    }
    if (url.pathname.endsWith('/rpc/paciente_corrigir_cpf')) {
      const payload = route.request().postDataJSON()
      expect(payload.p_paciente_id).toBe(inicial.id)
      expect(payload.p_clinica_id).toBe(paciente.clinica_id)
      expect(payload.p_updated_at).toBe(paciente.updated_at)
      expect(payload.p_motivo).toBeTruthy()
      cpfAtual = payload.p_cpf_novo
      paciente = { ...paciente, updated_at: '2026-09-26T13:00:00Z' }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paciente.updated_at) })
    }
    if (url.pathname.endsWith('/rpc/paciente_definir_cpf')) {
      const payload = route.request().postDataJSON()
      expect(payload.p_paciente_id).toBe(inicial.id)
      expect(payload.p_clinica_id).toBe(inicial.clinica_id)
      cpfPendente = false
      return route.fulfill({ contentType: 'application/json', body: 'null' })
    }
    if (url.pathname.endsWith('/rpc/paciente_obter_foto')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paciente.foto_path) })
    if (url.pathname.endsWith('/rpc/paciente_definir_foto')) {
      const anterior = paciente.foto_path
      paciente = { ...paciente, foto_path: route.request().postDataJSON().p_object_path }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(anterior) })
    }
    if (url.pathname.endsWith('/rpc/paciente_remover_foto')) {
      const anterior = paciente.foto_path
      paciente = { ...paciente, foto_path: null }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(anterior) })
    }
    if (url.pathname.endsWith('/rpc/paciente_editar_administrativo')) {
      const payload = route.request().postDataJSON(); chamadas.push(payload)
      expect(payload.p_paciente_id).toBe(inicial.id)
      expect(payload.p_clinica_id).toBe(paciente.clinica_id)
      expect(payload.p_updated_at).toBe(paciente.updated_at)
      for (const campo of ['id', 'clinica_id', 'cpf_hash', 'cpf_encrypted', 'foto_path', 'created_at', 'created_by']) expect(payload.p_alteracoes).not.toHaveProperty(campo)
      if (erro) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: erro }) })
      const alterouEstruturado = ['cep','logradouro','numero','complemento','bairro','cidade','uf'].some((campo) => campo in payload.p_alteracoes)
      const tinhaEstruturado = ['cep','logradouro','numero','complemento','bairro','cidade','uf'].some((campo) => Boolean(paciente[campo as keyof typeof paciente]))
      paciente = {
        ...paciente,
        ...(alterouEstruturado && !tinhaEstruturado && paciente.endereco?.trim() ? { endereco_historico: paciente.endereco } : {}),
        ...payload.p_alteracoes,
        updated_at: '2026-09-26T12:00:00Z',
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([paciente]) })
    }
    throw new Error(`Operação sintética inesperada: ${url.pathname}`)
  })
  return chamadas
}
async function abrir(page: Page) {
  await page.getByRole('button', { name: 'Ver resumo de Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Editar cadastro' }).click()
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(inicial.nome_completo)
}
async function sessaoSintetica(page: Page) {
  await page.addInitScript(() => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replaceAll('=', '')
    const body = btoa(JSON.stringify({ sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated', exp: 1990000000 })).replaceAll('=', '')
    localStorage.setItem('sb-operacional-auth-token', JSON.stringify({ access_token: `${header}.${body}.assinatura-sintetica`, refresh_token: 'sintetico', token_type: 'bearer', expires_at: 1990000000, user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated' } }))
  })
}
test('Editar na tabela abre o mesmo formulário sem selecionar o resumo; salva e reabre', async ({ page }, info) => {
  const chamadas = await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[role="columnheader"]').filter({ hasText: 'Ações' })).toHaveCount(1, { timeout: 15000 })
  const editar = page.getByRole('button', { name: 'Editar Ana Demonstração' })
  await expect(editar).toBeVisible()
  await page.screenshot({ path: `scratch/pacientes-edicao-20260926/tabela-editar-${info.project.name}.png`, fullPage: true })
  await editar.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Resumo do cadastro' })).toHaveCount(0)
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(inicial.nome_completo)
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await page.getByLabel('Telefone / WhatsApp', { exact: true }).fill('77900000098')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Resumo do cadastro' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Alterações salvas' })).toBeVisible()
  await expect(page.getByText('O cadastro do paciente foi atualizado com sucesso.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Alterações salvas' })).toHaveCount(1)
  await page.screenshot({ path: `scratch/pacientes-feedback-salvo-lista-${info.project.name}.png`, fullPage: true })
  expect(chamadas).toHaveLength(1)
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByLabel('Telefone / WhatsApp', { exact: true })).toHaveValue('(77) 90000-0098')
})

test('endereço vazio exibe todos os campos, persiste e reaparece após recarga', async ({ page }) => {
  const chamadas = await preparar(page, undefined, true, false, false, false, 'vazio')
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Endereço anterior preservado' })).toHaveCount(0)
  await expect(page.getByLabel('Rua / logradouro')).toHaveValue('')
  await page.getByLabel('Rua / logradouro').fill('RUA NOVA')
  await page.getByLabel('Número').fill('18')
  await page.getByLabel('Bairro').fill('CENTRO')
  await page.getByLabel('Cidade').fill('BROTAS DE MACAÚBAS')
  await page.getByLabel('UF').fill('ba')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  await expect.poll(() => chamadas.length).toBe(1)
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].p_alteracoes).toMatchObject({ logradouro: 'Rua Nova', numero: '18', bairro: 'Centro', cidade: 'Brotas de Macaúbas', uf: 'BA' })
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByLabel('Rua / logradouro')).toHaveValue('Rua Nova')
  await expect(page.getByLabel('Número')).toHaveValue('18')
})

test('endereço textual antigo permanece como referência enquanto os campos estruturados são preenchidos', async ({ page }, info) => {
  const chamadas = await preparar(page, undefined, true, false, false, false, 'legado')
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  const referencia = page.getByRole('complementary', { name: 'Endereço anterior preservado' })
  await expect(referencia).toContainText('Rua Sintética,  10')
  await expect(page.getByRole('textbox', { name: 'CEP', exact: true })).toBeVisible()
  await expect(page.getByLabel('Rua / logradouro')).toHaveValue('')
  await page.getByLabel('Rua / logradouro').fill('AVENIDA TESTE')
  await page.getByLabel('Número').fill('90')
  await page.getByLabel('Complemento').fill('SALA 3')
  await page.getByLabel('Bairro').fill('CENTRO')
  await page.getByLabel('Cidade').fill('IPUPIARA')
  await page.getByLabel('UF').fill('ba')
  await page.screenshot({ path: `scratch/pacientes-endereco-completo-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  await expect.poll(() => chamadas.length).toBe(1)
  expect(chamadas[0].p_alteracoes).toMatchObject({ logradouro: 'Avenida Teste', numero: '90', complemento: 'SALA 3', bairro: 'Centro', cidade: 'Ipupiara', uf: 'BA' })
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Endereço anterior preservado' })).toContainText('Rua Sintética,  10')
  await expect(page.getByLabel('Rua / logradouro')).toHaveValue('Avenida Teste')
})

test('endereço estruturado altera somente número e complemento sem perder os demais componentes', async ({ page }) => {
  const chamadas = await preparar(page, undefined, true, false, false, false, 'estruturado')
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'CEP', exact: true })).toHaveValue('47520-000')
  await expect(page.getByLabel('Rua / logradouro')).toHaveValue('Rua Estruturada')
  await page.waitForTimeout(150)
  expect(chamadas.consultasViaCep?.()).toBe(0)
  await expect(page.getByLabel('Cidade')).toHaveValue('Brotas de Macaúbas')
  await page.getByLabel('Número').fill('47')
  await page.getByLabel('Complemento').fill('Casa B')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  await expect.poll(() => chamadas.length).toBe(1)
  expect(chamadas[0].p_alteracoes).toMatchObject({ cep: '47520-000', logradouro: 'Rua Estruturada', numero: '47', complemento: 'Casa B', bairro: 'Centro', cidade: 'Brotas de Macaúbas', uf: 'BA' })
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByLabel('Número')).toHaveValue('47')
  await expect(page.getByLabel('Complemento')).toHaveValue('Casa B')
  await expect(page.getByLabel('Cidade')).toHaveValue('Brotas de Macaúbas')
})

test('falha ao carregar endereço bloqueia a gravação e permite tentar novamente sem perder a ficha', async ({ page }) => {
  const chamadas = await preparar(page, undefined, true, false, false, false, 'estruturado', 1)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByLabel('Nome completo', { exact: true }).fill('Ana Rascunho')
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o endereço')
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  expect(chamadas).toHaveLength(0)
  chamadas.liberarEndereco?.()
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('textbox', { name: 'CEP', exact: true })).toHaveValue('47520-000')
  await page.getByRole('button', { name: 'Voltar à Identificação' }).click()
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Ana Rascunho')
})
test('edição preenche, preserva e atualiza mesmo ID sem INSERT; capturas', async ({ page }, info) => {
  // Este é o primeiro acesso ao Vite sintético: a compilação fria no Windows
  // pode exceder o limite padrão de 30 s antes de qualquer asserção.
  test.setTimeout(90_000)
  const chamadas = await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Ver resumo de Ana Demonstração' }).click()
  await page.screenshot({ path: `scratch/pacientes-edicao-20260926/resumo-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Editar cadastro' }).click()
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(inicial.nome_completo)
  await expect(page.getByLabel('Idade', { exact: true })).toHaveValue('Não determinada')
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toContainText('Responsável Sintético')
  await page.screenshot({ path: `scratch/pacientes-edicao-20260926/identificacao-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByLabel('Endereço anterior preservado')).toContainText(inicial.endereco)
  await expect(page.getByRole('textbox', { name: 'CEP', exact: true })).toHaveValue('')
  await expect(page.getByLabel('Logradouro')).toHaveValue('')
  await page.getByLabel('Telefone / WhatsApp', { exact: true }).fill('77900000099')
  await page.getByRole('button', { name: 'Voltar à Identificação' }).click()
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(inicial.nome_completo)
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByLabel('Telefone / WhatsApp', { exact: true })).toHaveValue('(77) 90000-0099')
  await page.screenshot({ path: `scratch/pacientes-edicao-20260926/contatos-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].p_alteracoes).toEqual({ telefone: '(77) 90000-0099' })
  expect(chamadas[0].p_responsavel).toBeNull()
  await expect(page.getByRole('heading', { name: 'Resumo do cadastro' })).toBeVisible()
  await expect(page.locator('.pacientes-resumo')).toContainText('(77) 90000-0099')
  await expect(page.locator('.pacientes-endereco-literal')).toHaveText(inicial.endereco)
})

test('foto privada existente permanece entre etapas e após resposta de edição', async ({ page }) => {
  await sessaoSintetica(page)
  await preparar(page, undefined, true, true)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' }); await abrir(page)
  const foto = page.locator('.paciente-edicao img')
  await expect(foto).toHaveAttribute('src', /^blob:/)
  const fonte = await foto.getAttribute('src')
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await page.getByLabel('Telefone / WhatsApp', { exact: true }).fill('77900000099')
  await page.getByRole('button', { name: 'Voltar à Identificação' }).click()
  await expect(foto).toHaveAttribute('src', fonte!)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  await expect(page.locator('.pacientes-resumo img')).toHaveAttribute('src', /^blob:/)
})

test('edição direta abre foto privada; inclusão reaparece após recarga', async ({ page }) => {
  await sessaoSintetica(page)
  await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Adicionar foto' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Foto do paciente' })).toBeVisible()
  await page.locator('.paciente-foto-modal input[type="file"]').setInputFiles({ name: 'imagem-sintetica.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9p0AAAAASUVORK5CYII=', 'base64') })
  await expect(page.getByText('Prévia selecionada — ainda não salva. Confira antes de salvar.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar foto', exact: true })).toHaveCSS('background-color', 'rgb(0, 97, 148)')
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click()
  await expect(page.getByText('Foto salva com sucesso.')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar gerenciamento de foto' }).click()
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await expect(page.getByRole('button', { name: 'Trocar ou remover foto' })).toBeVisible()
  await expect(page.locator('.paciente-edicao img')).toHaveAttribute('src', /^blob:/)
})

test('foto: estados legíveis, descarte local, envio único, erro e nova tentativa', async ({ page }, info) => {
  await sessaoSintetica(page)
  await preparar(page, undefined, true, true)
  let envios = 0
  let liberar!: () => void
  const espera = new Promise<void>((resolve) => { liberar = resolve })
  await page.route('**/storage/v1/object/pacientes-fotos/**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    envios++
    if (envios === 1) {
      await espera
      return route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"falha sintética"}' })
    }
    return route.fulfill({ contentType: 'application/json', body: '{"Key":"foto-sintetica"}' })
  })
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Trocar ou remover foto' }).click()
  const modal = page.getByRole('dialog', { name: 'Foto do paciente', exact: true })
  const salvar = modal.getByRole('button', { name: 'Salvar foto', exact: true })
  await expect(salvar).toBeDisabled()
  await expect(modal).toContainText('Escolha uma foto ou use a câmera')
  const anterior = await modal.locator('img').getAttribute('src')
  // PNG geométrico gerado para o teste, sem imagem de pessoa.
  const arquivo = { name: 'sintetica.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAABdElEQVR4nO3RwQ3CUADD0D8tOzFt2YLX1ol8jyWf8/kOiTeI4w3ieIM43iCON4jjDeJ4gzjeII43iOMN4niDON4gjjeI4w3ieIM43iCON4jjDeJ4gzjeII43iOMN4niDON4gjjeI4w3ieIM43iCON4jjDeJ4gzjeII43iOMN4vzt6XraFgBvAfAWAG8B8BYAbwHwFgBvAfAWAG8B8BYAbwHwFgBvAfAWAG8B8BYAbwHwFgBvAfAWAG8B8BYAbwHwFgBvAfAWAG8B8BYAbwHwFgBvAfAWAG8B8BYAbwHwFgBvAfAWAG8B8BYAbwHwFgBvAfAWAG8B8BYAbwHwFgBvAfAWAG8B8BYAbwHwFgBvAfAWAG8B8N4WYCzALfEGcbxBHG8QxxvE8QZxvEEcbxDHG8TxBnG8QRxvEMcbxPEGcbxBHG8QxxvE8QZxvEEcbxDHG8TxBnG8QRxvEMcbxPEGcbxBHG8QxxvE8QZxvEEcbxDHG7T5AYGI3BVGcMVOAAAAAElFTkSuQmCC', 'base64') }
  await modal.locator('input[type=file]').setInputFiles({ name: 'invalido.txt', mimeType: 'text/plain', buffer: Buffer.from('teste') })
  await expect(modal.getByRole('alert')).toBeVisible()
  await expect(salvar).toBeDisabled()
  await modal.locator('input[type=file]').setInputFiles(arquivo)
  await expect(salvar).toBeEnabled()
  await modal.getByRole('button', { name: 'Descartar seleção' }).click()
  await expect(modal.locator('img')).toHaveAttribute('src', anterior!)
  await expect(salvar).toBeDisabled()
  expect(envios).toBe(0)
  await modal.locator('input[type=file]').setInputFiles(arquivo)
  await expect(salvar).toHaveCSS('background-color', 'rgb(0, 97, 148)')
  await expect(salvar).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(salvar).toHaveCSS('opacity', '1')
  await expect(modal.locator('.paciente-avatar')).toHaveCSS('width', '112px')
  await page.screenshot({ path: `scratch/pacientes-foto-final-${info.project.name}.png`, fullPage: true })
  await salvar.click()
  await expect(modal.getByRole('button', { name: 'Salvando…', exact: true })).toBeDisabled()
  await expect(modal.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(modal).toBeVisible()
  expect(envios).toBe(1)
  liberar()
  await expect(modal.getByRole('alert')).toContainText('Não foi possível enviar')
  await expect(modal).not.toContainText('Foto salva com sucesso.')
  await expect(salvar).toBeEnabled()
  await salvar.click()
  await expect(modal.getByText('Foto salva com sucesso.')).toBeVisible()
  expect(envios).toBe(2)
  await expect(salvar).toBeDisabled()
  const fim = await modal.locator('.paciente-foto-rodape').boundingBox()
  expect(fim!.y + fim!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(modal).toHaveCount(0)
  await page.getByRole('button', { name: 'Fechar resumo', exact: true }).click()
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Trocar ou remover foto' }).click()
  await expect(modal).toHaveCSS('background-color', 'rgb(30, 41, 59)')
  await modal.locator('input[type=file]').setInputFiles(arquivo)
  await expect(salvar).toHaveCSS('background-color', 'rgb(0, 97, 148)')
  await expect(salvar).toHaveCSS('color', 'rgb(255, 255, 255)')
  await page.screenshot({ path: `scratch/pacientes-foto-final-${info.project.name}-escuro.png`, fullPage: true })
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 480 })
  const rodapeBaixo = await modal.locator('.paciente-foto-rodape').boundingBox()
  expect(rodapeBaixo!.y + rodapeBaixo!.height).toBeLessThanOrEqual(480)
  const scroll = await modal.locator('.paciente-foto-conteudo').evaluate(el => el.scrollHeight - el.clientHeight)
  expect(scroll).toBeGreaterThan(0)
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect(envios).toBe(2) // seleção descartada: não enviou novamente
})

test('falha de upload preserva foto anterior após recarga e não mostra sucesso', async ({ page }) => {
  await sessaoSintetica(page)
  await preparar(page, undefined, true, true, true)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Trocar ou remover foto' }).click()
  await page.locator('.paciente-foto-modal input[type="file"]').setInputFiles({ name: 'outra-imagem-sintetica.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9p0AAAAASUVORK5CYII=', 'base64') })
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível enviar a foto')
  await page.getByRole('button', { name: 'Fechar gerenciamento de foto' }).click()
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await expect(page.getByRole('button', { name: 'Trocar ou remover foto' })).toBeVisible()
  await expect(page.locator('.paciente-edicao img')).toHaveAttribute('src', /^blob:/)
})

test('troca e remoção da foto usam o mesmo fluxo privado e persistem após recarga', async ({ page }) => {
  await sessaoSintetica(page)
  await preparar(page, undefined, true, true)
  const exclusoes: string[] = []
  page.on('request', (pedido) => { if (pedido.method() === 'DELETE' && pedido.url().includes('/storage/v1/object/')) exclusoes.push(pedido.url()) })
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Trocar ou remover foto' }).click()
  await page.locator('.paciente-foto-modal input[type="file"]').setInputFiles({ name: 'substituicao-sintetica.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9p0AAAAASUVORK5CYII=', 'base64') })
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click()
  await expect(page.getByText('Foto salva com sucesso.')).toBeVisible()
  await page.getByRole('button', { name: 'Remover foto salva', exact: true }).click()
  const confirmacaoRemocao = page.getByRole('alertdialog', { name: 'Remover a foto deste paciente?' })
  await expect(confirmacaoRemocao).toBeVisible()
  await confirmacaoRemocao.getByRole('button', { name: 'Remover foto', exact: true }).click()
  await expect(page.getByText('Foto removida.', { exact: true })).toBeVisible()
  expect(exclusoes).toHaveLength(2)
  await page.getByRole('button', { name: 'Fechar gerenciamento de foto' }).click()
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await expect(page.getByRole('button', { name: 'Adicionar foto' })).toBeVisible()
})

test('edição não descarta campos ao abrir foto ou CPF pendente sem confirmação', async ({ page }) => {
  const chamadas = await preparar(page, undefined, true, false, false, true)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByLabel('Nome completo', { exact: true }).fill('Outro Nome Sintético')
  await page.getByRole('button', { name: 'Adicionar foto' }).click()
  const confirmacaoFoto = page.getByRole('alertdialog', { name: 'Descartar alterações não salvas?' })
  await expect(confirmacaoFoto).toContainText('As alterações cadastrais serão descartadas antes de abrir a gestão da foto.')
  await confirmacaoFoto.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Outro Nome Sintético')
  await page.getByRole('button', { name: 'Adicionar CPF' }).click()
  const confirmacaoCpf = page.getByRole('alertdialog', { name: 'Descartar alterações não salvas?' })
  await expect(confirmacaoCpf).toContainText('As alterações cadastrais serão descartadas antes de abrir a inclusão do CPF.')
  await confirmacaoCpf.getByRole('button', { name: 'Descartar e adicionar CPF' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'CPF pendente de Ana Demonstração' })).toBeVisible()
  expect(chamadas).toHaveLength(0)
})
test('CPF com situação não confirmada não é apresentado como informado nem libera inclusão', async ({ page }) => {
  const chamadas = await preparar(page, undefined, true, false, false, null)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar paciente' })
  await expect(dialog).toContainText('Não foi possível confirmar a situação do CPF.')
  await expect(dialog.getByRole('button', { name: 'Adicionar CPF' })).toHaveCount(0)
  await expect(dialog).not.toContainText('CPF informado.')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('button', { name: 'Ver resumo de Ana Demonstração' }).click()
  await expect(page.locator('.pacientes-resumo')).toContainText('Consulta indisponível')
  await expect(page.getByRole('button', { name: 'Adicionar CPF' })).toHaveCount(0)
  expect(chamadas).toHaveLength(0)
})

test('CPF carrega separadamente, erro permite salvar outros campos e retry não perde rascunho', async ({ page }) => {
  const chamadas = await preparar(page)
  let liberar!: () => void
  const espera = new Promise<void>((resolve) => { liberar = resolve })
  let tentativa = 0
  await page.route('**/rpc/paciente_cpf_pendente', async (route) => {
    tentativa++
    if (tentativa === 1) { await espera; return route.fulfill({ status: 403, contentType: 'application/json', body: '{"code":"42501"}' }) }
    return route.fulfill({ contentType: 'application/json', body: 'false' })
  })
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  const secao = page.getByRole('region', { name: 'CPF do paciente', exact: true })
  await expect(secao).toContainText('Consultando situação do CPF')
  await expect(page.getByRole('button', { name: 'Adicionar CPF', exact: true })).toHaveCount(0)
  await page.getByLabel('Nome completo', { exact: true }).fill('Outro Nome Sintético')
  liberar()
  await expect(secao).toContainText('Não foi possível confirmar')
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled()
  await secao.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(secao).toContainText('***.***.***-**')
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Outro Nome Sintético')
  await expect(page.getByRole('button', { name: 'Corrigir CPF', exact: true })).toHaveCount(0) // recepção
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].p_alteracoes).toEqual({ nome_completo: 'Outro Nome Sintético' })
})

test('CPF ausente não bloqueia edição; adiamento dura na ficha e inclusão persiste no backend simulado', async ({ page }, info) => {
  const chamadas = await preparar(page, undefined, true, false, false, true)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await expect(page.getByText('CPF não informado. Deseja completar o cadastro?', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Informar depois', exact: true }).click()
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await page.getByLabel('E-mail', { exact: true }).fill('outro@example.invalid')
  await page.getByRole('button', { name: 'Voltar à Identificação', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Informar depois' })).toHaveCount(0)
  await page.screenshot({ path: `scratch/pacientes-cpf-ausente-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  expect(chamadas[0].p_alteracoes).toEqual({ email: 'outro@example.invalid' })
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByRole('button', { name: 'Adicionar CPF', exact: true }).click()
  const aviso = page.getByRole('region', { name: 'CPF pendente de Ana Demonstração' })
  await aviso.getByRole('button', { name: 'Adicionar CPF' }).click()
  let envios = 0
  await page.route('**/rpc/paciente_definir_cpf', async (route) => {
    envios++
    if (envios === 1) return route.fulfill({ status: 409, contentType: 'application/json', body: '{"code":"23505"}' })
    await route.fallback()
  })
  await aviso.getByLabel('CPF de Ana Demonstração').fill('11111111111')
  await aviso.getByRole('button', { name: 'Salvar CPF' }).click()
  await expect(aviso).toContainText('11 dígitos válidos')
  expect(envios).toBe(0)
  await aviso.getByLabel('CPF de Ana Demonstração').fill('52998224725') // somente mock
  await aviso.getByRole('button', { name: 'Salvar CPF' }).click()
  await expect(aviso).toContainText('inclusive entre os inativos')
  await aviso.getByRole('button', { name: 'Salvar CPF' }).click()
  await expect(aviso).toHaveCount(0)
  expect(envios).toBe(2)
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await expect(page.getByRole('region', { name: 'CPF do paciente', exact: true })).toContainText('***.***.***-**')
  await expect(page.getByRole('button', { name: 'Adicionar CPF' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('outro@example.invalid')
})

test('proprietária lê CPF individual, corrige com motivo e preserva edição não salva', async ({ page }) => {
  await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html?papel=proprietaria', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  const ficha = page.getByRole('dialog', { name: 'Editar paciente' })
  await expect(ficha.getByLabel('CPF atual')).toHaveValue('529.982.247-25')
  await expect(ficha.getByLabel('CPF atual')).toHaveJSProperty('readOnly', true)
  await ficha.getByLabel('Nome completo', { exact: true }).fill('Outra Demonstração')
  await ficha.getByRole('button', { name: 'Corrigir CPF', exact: true }).click()
  const correcao = page.getByRole('dialog', { name: 'Corrigir CPF', exact: true })
  await expect(correcao.getByLabel('CPF atual')).toHaveValue('529.982.247-25')
  await correcao.getByLabel('Novo CPF').fill('11111111111')
  await correcao.getByLabel('Motivo da correção').fill('Correção documental após conferência')
  await correcao.getByRole('button', { name: 'Salvar correção' }).click()
  await expect(correcao.getByRole('alert')).toContainText('11 dígitos válidos')
  await correcao.getByLabel('Novo CPF').fill('16899535009')
  await correcao.getByRole('button', { name: 'Salvar correção' }).click()
  await page.getByRole('alertdialog', { name: 'Confirmar correção do CPF?' }).getByRole('button', { name: 'Confirmar correção' }).click()
  await expect(correcao).toHaveCount(0)
  await expect(ficha).toContainText('CPF atualizado')
  await expect(ficha.getByLabel('CPF atual')).toHaveValue('168.995.350-09')
  await expect(ficha.getByLabel('Nome completo', { exact: true })).toHaveValue('Outra Demonstração')
  await ficha.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(ficha).toHaveCount(0)
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Outra Demonstração' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' }).getByLabel('CPF atual')).toHaveValue('168.995.350-09')
  await expect(page.getByRole('dialog', { name: 'Editar paciente' }).getByLabel('Nome completo', { exact: true })).toHaveValue('Outra Demonstração')
})

test('correção cancelada ou duplicada não altera CPF e mantém rascunho', async ({ page }) => {
  await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html?papel=proprietaria', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  const ficha = page.getByRole('dialog', { name: 'Editar paciente' })
  await ficha.getByLabel('Nome completo', { exact: true }).fill('Outra Demonstração')
  await ficha.getByRole('button', { name: 'Corrigir CPF' }).click()
  const correcao = page.getByRole('dialog', { name: 'Corrigir CPF', exact: true })
  await correcao.getByLabel('Novo CPF').fill('16899535009')
  await correcao.getByRole('button', { name: 'Cancelar' }).click()
  await expect(ficha.getByLabel('CPF atual')).toHaveValue('529.982.247-25')
  await expect(ficha.getByLabel('Nome completo', { exact: true })).toHaveValue('Outra Demonstração')
  await page.route('**/rpc/paciente_corrigir_cpf', (route) => route.fulfill({ status: 409, contentType: 'application/json', body: '{"code":"23505"}' }))
  await ficha.getByRole('button', { name: 'Corrigir CPF' }).click()
  await correcao.getByLabel('Novo CPF').fill('16899535009')
  await correcao.getByLabel('Motivo da correção').fill('Conferência documental sintética')
  await correcao.getByRole('button', { name: 'Salvar correção' }).click()
  await page.getByRole('alertdialog', { name: 'Confirmar correção do CPF?' }).getByRole('button', { name: 'Confirmar correção' }).click()
  await expect(correcao.getByRole('alert')).toContainText('Já existe um paciente')
  await expect(ficha.getByLabel('Nome completo', { exact: true })).toHaveValue('Outra Demonstração')
  await expect(correcao.getByLabel('CPF atual')).toHaveValue('529.982.247-25')
})

test('falha da leitura individual não afirma CPF ausente nem expõe ação de correção', async ({ page }) => {
  await preparar(page)
  await page.route('**/rpc/paciente_ler_cpf', (route) => route.fulfill({ status: 403, contentType: 'application/json', body: '{"code":"42501"}' }))
  await page.goto('/tests/operacional/pacientes-pagina.html?papel=proprietaria', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  const ficha = page.getByRole('dialog', { name: 'Editar paciente' })
  await expect(ficha).toContainText('Não foi possível confirmar a situação do CPF.')
  await expect(ficha.getByRole('button', { name: 'Corrigir CPF' })).toHaveCount(0)
  await expect(ficha.getByRole('button', { name: 'Adicionar CPF' })).toHaveCount(0)
  await expect(ficha.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible()
})

test('CPF legado inválido confirmado permite correção sem revelar o valor anterior', async ({ page }) => {
  await preparar(page)
  await page.route('**/rpc/paciente_ler_cpf', (route) => route.fulfill({ status: 422, contentType: 'application/json', body: '{"code":"PC422","message":"O CPF cadastrado precisa de revisão."}' }))
  await page.goto('/tests/operacional/pacientes-pagina.html?papel=proprietaria', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  const ficha = page.getByRole('dialog', { name: 'Editar paciente' })
  await expect(ficha).toContainText('O CPF cadastrado precisa de revisão. Confira o documento antes de corrigir.')
  await expect(ficha.getByRole('button', { name: 'Tentar novamente' })).toHaveCount(0)
  await expect(ficha.getByLabel('CPF atual')).toHaveCount(0)
  await ficha.getByLabel('Nome completo', { exact: true }).fill('Outra Demonstração')
  await ficha.getByRole('button', { name: 'Corrigir CPF' }).click()
  const correcao = page.getByRole('dialog', { name: 'Corrigir CPF', exact: true })
  await expect(correcao).toContainText('O CPF anterior não pode ser exibido.')
  await expect(correcao.getByLabel('CPF atual')).toHaveCount(0)
  await correcao.getByLabel('Novo CPF').fill('11111111111')
  await correcao.getByLabel('Motivo da correção').fill('Conferência documental sintética')
  await correcao.getByRole('button', { name: 'Salvar correção' }).click()
  await expect(correcao.getByRole('alert')).toContainText('11 dígitos válidos')
  await correcao.getByLabel('Novo CPF').fill('16899535009')
  await correcao.getByRole('button', { name: 'Salvar correção' }).click()
  await page.getByRole('alertdialog', { name: 'Confirmar correção do CPF?' }).getByRole('button', { name: 'Confirmar correção' }).click()
  await expect(correcao).toHaveCount(0)
  await expect(ficha).toContainText('CPF atualizado')
  await expect(ficha.getByLabel('CPF atual')).toHaveValue('168.995.350-09')
  await expect(ficha.getByLabel('Nome completo', { exact: true })).toHaveValue('Outra Demonstração')
  await ficha.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(ficha).toHaveCount(0)
  await page.reload({ waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Editar Outra Demonstração' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' }).getByLabel('Nome completo', { exact: true })).toHaveValue('Outra Demonstração')
})

test('validação, cancelamento, grafia e ausência de gravação', async ({ page }) => {
  const chamadas = await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' }); await abrir(page)
  await page.getByLabel('Nome completo', { exact: true }).fill('MARIA DA CONCEIÇÃO')
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Maria da Conceição')
  await page.getByLabel('Nome completo', { exact: true }).fill('')
  await page.getByLabel('Nome completo', { exact: true }).fill('JOÃO DOS SANTOS')
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('João dos Santos')
  await page.getByLabel('Preservar grafia excepcional').check()
  await page.getByLabel('Nome completo', { exact: true }).fill('João McDonald')
  await page.getByRole('button', { name: 'Endereço & Contatos', exact: true }).click()
  await page.getByLabel('E-mail', { exact: true }).fill('invalido')
  await page.getByRole('button', { name: 'Voltar à Identificação' }).click()
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('alert')).toContainText('e-mail válido')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused()
  expect(chamadas).toHaveLength(0)
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('invalido')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Descartar alterações' }).click()
  expect(chamadas).toHaveLength(0)
})
test('conflito, contrato ausente, autorização e falha genérica preservam edição', async ({ page }) => {
  for (const [codigo, mensagem] of [['PT409', 'outra operação'], ['PGRST202', 'ainda não está disponível'], ['42501', 'autorizar'], ['PGRST000', 'Suas alterações não foram salvas. Tente novamente.']]) {
    await page.unrouteAll()
    const chamadas = await preparar(page, codigo)
    await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' }); await abrir(page)
    await page.getByLabel('Nome completo', { exact: true }).fill('Outro Exemplo')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByRole('alert')).toContainText(mensagem)
    await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Outro Exemplo')
    expect(chamadas).toHaveLength(1)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.getByRole('button', { name: 'Descartar alterações' }).click()
  }
})
test('correção para menor exige responsável atomicamente sem criar novo paciente', async ({ page }) => {
  const chamadas = await preparar(page, undefined, false)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' }); await abrir(page)
  await page.getByLabel('Data de nascimento', { exact: true }).fill('2015-01-01')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('alert')).toContainText('responsável legal')
  expect(chamadas).toHaveLength(0)
  await page.getByLabel('Nome completo do responsável', { exact: true }).fill('Responsável Sintético')
  await page.getByLabel('Vínculo com o paciente', { exact: true }).fill('Mãe')
  await page.getByLabel('Telefone / WhatsApp do responsável', { exact: true }).fill('77900000011')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].p_alteracoes).toEqual({ data_nascimento: '2015-01-01' })
  expect(chamadas[0].p_responsavel).toMatchObject({ nome_completo: 'Responsável Sintético', cpf: '' })
})

test('preserva busca e ordenação; informa saída dos critérios após editar', async ({ page }) => {
  await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('searchbox').fill('Ana')
  await page.getByRole('combobox', { name: 'Ordenar por' }).selectOption('nome_desc')
  await abrir(page)
  await page.getByLabel('Nome completo', { exact: true }).fill('Beatriz Demonstração')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  await expect(page.getByText('O cadastro do paciente foi atualizado com sucesso. O paciente saiu dos critérios atuais de busca ou filtro.')).toBeVisible()
  await expect(page.getByRole('searchbox')).toHaveValue('Ana')
  await expect(page.getByRole('combobox', { name: 'Ordenar por' })).toHaveValue('nome_desc')
  await expect(page.getByRole('heading', { name: 'Resumo do cadastro' })).toHaveCount(0)
})

test('sucesso iniciado pelo resumo permanece visível após fechar a edição', async ({ page }, info) => {
  await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
  await abrir(page)
  await page.getByLabel('Nome completo', { exact: true }).fill('Ana Confirmação')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  const resumo = page.getByRole('dialog', { name: 'Resumo do cadastro de Ana Confirmação' })
  await expect(resumo).toBeVisible()
  await expect(resumo.getByRole('heading', { name: 'Alterações salvas' })).toBeVisible()
  await expect(resumo.getByText('O cadastro do paciente foi atualizado com sucesso.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Alterações salvas' })).toHaveCount(1)
  await page.screenshot({ path: `scratch/pacientes-feedback-salvo-${info.project.name}.png`, fullPage: true })
})

test('salvamento confirmado diferencia falha da atualização da lista e permite tentar novamente', async ({ page }) => {
  const chamadas = await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar Ana Demonstração' }).click()
  await page.getByLabel('Nome completo', { exact: true }).fill('Ana Lista Pendente')
  chamadas.falharProximaLista?.()
  const consultasAntes = chamadas.consultasLista?.() ?? 0
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect.poll(() => chamadas.consultasLista?.()).toBe(consultasAntes + 1)
  await expect(page.getByRole('heading', { name: 'Alterações salvas, mas não foi possível atualizar a lista.' })).toBeVisible()
  await expect(page.getByText('O cadastro foi salvo. Atualize a lista para conferir os dados sem gravar novamente.')).toBeVisible()
  await page.getByRole('button', { name: 'Atualizar lista' }).click()
  await expect(page.getByRole('heading', { name: 'Alterações salvas' })).toBeVisible()
  await expect(page.getByText('O cadastro do paciente foi atualizado com sucesso.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Alterações salvas, mas não foi possível atualizar a lista.' })).toHaveCount(0)
})

test('troca de clínica invalida edição sem gravar na nova unidade', async ({ page }) => {
  const chamadas = await preparar(page)
  await page.goto('/tests/operacional/pacientes-contexto.html', { waitUntil: 'domcontentloaded' }); await abrir(page)
  await page.getByLabel('Nome completo', { exact: true }).fill('Não Enviar')
  // Mudança externa de contexto, inclusive enquanto o dialog torna o fundo inerte.
  await page.getByRole('button', { name: 'Trocar para Clínica B' }).evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.getByRole('dialog', { name: 'Editar paciente' })).toHaveCount(0)
  await expect(page.getByText('Não Enviar')).toHaveCount(0)
  expect(chamadas).toHaveLength(0)
})

import { expect, test, type Page } from '@playwright/test'

// Confere o fuso do domínio independentemente do relógio do navegador.
test.use({ timezoneId: 'UTC' })

const pacientes = [
  { id: 's-4', nome_completo: 'Zélia Demonstração', data_nascimento: null, created_at: null },
  { id: 's-2', nome_completo: 'Álvaro Exemplo', data_nascimento: '2000-09-27', created_at: '2026-09-26T02:59:59.999Z' },
  { id: 's-1', nome_completo: 'alvaro exemplo', data_nascimento: '2000-09-26', created_at: '2026-09-25T03:00:00Z' },
  { id: 's-3', nome_completo: 'Beatriz Modelo', data_nascimento: '2014-06-01', created_at: '2026-09-26T03:00:00Z' },
].map((p) => ({ ...p, telefone: '71900000000', endereco: 'Rua de Demonstração, 10 — dados sintéticos', foto_path: null, ativo: true }))

async function preparar(page: Page, opcao: 'normal' | 'limite' | 'erro' | 'sem-contagem' = 'normal') {
  await page.clock.setFixedTime(new Date('2026-09-26T15:00:00Z'))
  let erro = opcao === 'erro'
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    if (url.pathname.endsWith('/pacientes')) {
      expect(route.request().method()).toBe('GET')
      const clinica = url.searchParams.get('clinica_id')
      expect(['eq.clinica-sintetica', 'eq.clinica-a', 'eq.clinica-b']).toContain(clinica)
      expect(url.searchParams.get('select')).not.toMatch(/cpf|updated_at/)
      if (erro) { erro = false; return route.fulfill({ status: 400, body: '{}' }) }
      let linhas = clinica === 'eq.clinica-b' ? [{ ...pacientes[2], id: 'b-1', nome_completo: 'Outra Clínica Sintética' }] : pacientes
      const nome = url.searchParams.get('nome_completo')?.slice(7).toLocaleLowerCase('pt-BR')
      if (nome) linhas = linhas.filter((p) => new RegExp(nome, 'i').test(p.nome_completo))
      for (const campo of ['created_at', 'data_nascimento'] as const) for (const condicao of url.searchParams.getAll(campo)) {
        linhas = linhas.filter((p) => {
          if (condicao === 'is.null') return p[campo] === null
          if (condicao === 'not.is.null') return p[campo] !== null
          const [operador, ...partes] = condicao.split('.')
          const valor = partes.join('.')
          if (!p[campo]) return false
          const a = Date.parse(p[campo]), b = Date.parse(valor)
          return operador === 'gte' ? a >= b : operador === 'lt' ? a < b : operador === 'gt' ? a > b : a <= b
        })
      }
      if (nome === 'álvaro') await new Promise((r) => setTimeout(r, 500))
      const total = opcao === 'limite' ? 1001 : linhas.length
      return route.fulfill({ contentType: 'application/json', headers: opcao === 'sem-contagem' ? {} : { 'access-control-expose-headers': 'content-range', 'content-range': `0-${Math.max(0, linhas.length - 1)}/${total}` }, body: JSON.stringify(linhas) })
    }
    if (url.pathname.endsWith('/rpc/paciente_buscar_por_cpf')) {
      expect(route.request().postDataJSON()).toEqual({ p_clinica_id: 'clinica-sintetica', p_cpf: '52998224725' })
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ ...pacientes[1], ativo: false }]) })
    }
    if (url.pathname.endsWith('/rpc/paciente_responsavel_legal_resumo')) return route.fulfill({ contentType: 'application/json', body: '[]' })
    if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) return route.fulfill({ contentType: 'application/json', body: 'true' })
    throw new Error(`Chamada sintética não prevista: ${url.pathname}`)
  })
}
const nomesVisiveis = (page: Page) => page.locator('.pacientes-lista-identidade strong')

test('ordenação, filtros aplicados, teclado, resumo e capturas responsivas', async ({ page }, info) => {
  await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html')
  const ordenar = page.getByRole('combobox', { name: 'Ordenar por' })
  await expect(nomesVisiveis(page)).toHaveText(['alvaro exemplo', 'Álvaro Exemplo', 'Beatriz Modelo', 'Zélia Demonstração'])
  await expect(page.getByText('4 pacientes encontrados')).toBeVisible()
  for (const [opcao, primeiro] of [['nome_desc', 'Zélia Demonstração'], ['cadastro_desc', 'Beatriz Modelo'], ['cadastro_asc', 'alvaro exemplo'], ['nascimento_desc', 'Beatriz Modelo'], ['nascimento_asc', 'alvaro exemplo']] as const) {
    await ordenar.selectOption(opcao)
    await expect(nomesVisiveis(page).first()).toHaveText(primeiro)
  }
  if (info.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Paciente', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(ordenar).toHaveValue('nome_asc')
    await expect(page.getByRole('columnheader', { name: 'Paciente' })).toHaveAttribute('aria-sort', 'ascending')
    await page.getByRole('button', { name: 'Nascimento / idade', exact: true }).click()
    await expect(ordenar).toHaveValue('nascimento_desc')
    await ordenar.selectOption('cadastro_desc')
    await expect(page.locator('[aria-sort]')).toHaveCount(0)
    await page.locator('.pacientes-lista-identidade').filter({ hasText: 'Beatriz Modelo' }).click()
    await expect(page.getByRole('heading', { name: 'Resumo do cadastro' })).toBeVisible()
    await ordenar.selectOption('nome_desc')
    await expect(page.getByRole('heading', { name: 'Resumo do cadastro' })).toBeVisible()
  }
  await ordenar.selectOption('nome_asc')
  // Captura da lista inteira, não somente do modal.
  if (await page.getByRole('button', { name: 'Fechar resumo', exact: true }).isVisible()) await page.getByRole('button', { name: 'Fechar resumo', exact: true }).click()
  await page.screenshot({ path: `scratch/pacientes-filtros-20260926/lista-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: /^Filtros/ }).click()
  await page.getByLabel('Idade mínima').fill('30')
  await page.getByLabel('Idade máxima').fill('20')
  await page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await expect(page.getByRole('alert')).toContainText('mínima não pode superar')
  await expect(nomesVisiveis(page)).toHaveCount(4)
  await page.getByLabel('Idade mínima').fill('0')
  await page.getByLabel('Data de nascimento', { exact: true }).selectOption('ausente')
  await page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await expect(page.getByRole('alert')).toContainText('não pode ser combinado')
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await page.getByLabel('Data inicial').fill('2026-09-25')
  await page.getByLabel('Data final').fill('2026-09-25')
  await page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await expect(page.getByText('2 pacientes encontrados')).toBeVisible()
  await expect(nomesVisiveis(page)).toHaveCount(2)
  await expect(page.getByRole('button', { name: /^Filtros/ })).toContainText('2')
  await page.screenshot({ path: `scratch/pacientes-filtros-20260926/filtros-${info.project.name}.png`, fullPage: true })
  await page.getByRole('searchbox').fill('Álvaro')
  await expect(page.getByText('1 paciente encontrado')).toBeVisible()
  await ordenar.selectOption('cadastro_desc')
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await expect(page.getByRole('searchbox')).toHaveValue('Álvaro')
  await expect(ordenar).toHaveValue('cadastro_desc')
  await expect(page.getByText('1 paciente encontrado')).toBeVisible()
  if (info.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Ver resumo de Álvaro Exemplo' }).click()
    await page.getByLabel('Data de nascimento', { exact: true }).selectOption('ausente')
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect(page.getByText('Nenhum resultado nesta clínica')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Resumo do cadastro' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Resumo do cadastro' })).toHaveCount(0)
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'escuro')
  await expect(page.getByText('1 paciente encontrado')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `scratch/pacientes-filtros-20260926/escuro-${info.project.name}.png`, fullPage: true })
})

test('resposta cortada ou sem contagem não é apresentada como ordenação global; erro admite repetição', async ({ page }) => {
  for (const opcao of ['limite', 'sem-contagem', 'erro'] as const) {
    await page.unrouteAll({ behavior: 'wait' })
    await preparar(page, opcao)
    await page.goto('/tests/operacional/pacientes-pagina.html')
    if (opcao === 'limite') {
      await expect(page.getByText('1001 pacientes encontrados')).toBeVisible()
      await expect(page.getByText('Refine a busca ou os filtros')).toBeVisible()
      await expect(nomesVisiveis(page)).toHaveCount(0)
    } else {
      await expect(page.getByRole('alert')).toContainText('Não foi possível carregar')
      if (opcao === 'erro') {
        await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
        await expect(nomesVisiveis(page)).toHaveCount(4)
      }
    }
  }
})

test('respostas atrasadas não substituem busca nova nem contexto da outra clínica', async ({ page }) => {
  await preparar(page)
  await page.goto('/tests/operacional/pacientes-contexto.html')
  await expect(nomesVisiveis(page)).toHaveCount(4)
  await page.getByRole('searchbox').fill('Álvaro')
  await page.waitForRequest((r) => r.url().includes('nome_completo=imatch'))
  await page.getByRole('searchbox').fill('Beatriz')
  await expect(nomesVisiveis(page)).toHaveText(['Beatriz Modelo'])
  await page.waitForTimeout(600)
  await expect(nomesVisiveis(page)).toHaveText(['Beatriz Modelo'])
  await page.getByRole('button', { name: 'Trocar para Clínica B' }).click()
  await expect(page.getByText('Beatriz Modelo', { exact: true })).toHaveCount(0)
  await expect(nomesVisiveis(page)).toHaveText(['Outra Clínica Sintética'])
})

test('CPF exato mantém contrato e combina filtros de criação, inclusive inativo', async ({ page }) => {
  await preparar(page)
  await page.goto('/tests/operacional/pacientes-pagina.html')
  await page.getByRole('button', { name: 'CPF exato', exact: true }).click()
  await page.getByLabel('Buscar por CPF exato').fill('52998224725')
  await page.getByRole('button', { name: 'Buscar CPF', exact: true }).click()
  await expect(nomesVisiveis(page)).toHaveText(['Álvaro Exemplo'])
  await page.getByRole('button', { name: /^Filtros/ }).click()
  await page.getByLabel('Data inicial').fill('2026-09-26')
  await page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await expect(page.getByText('0 pacientes encontrados')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await expect(nomesVisiveis(page)).toHaveText(['Álvaro Exemplo'])
  await expect(page.locator('.pacientes-status--inativo')).toBeVisible()
})

test('idade exibida e filtro usam o mesmo dia na Bahia mesmo após meia-noite UTC', async ({ page }) => {
  await preparar(page)
  await page.clock.setFixedTime(new Date('2026-09-26T02:00:00Z'))
  await page.goto('/tests/operacional/pacientes-pagina.html')
  const linha = page.locator('.pacientes-lista-linha').filter({ has: page.getByText('alvaro exemplo', { exact: true }) })
  await expect(linha).toContainText('25 anos')
  await page.getByRole('button', { name: /^Filtros/ }).click()
  await page.getByLabel('Idade mínima').fill('26')
  await page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await expect(page.getByText('0 pacientes encontrados')).toBeVisible()
})

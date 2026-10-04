import { test, expect } from '@playwright/test'
const entrada = '/tests/operacional/pacientes-redesenho.html'
test('Acabamento móvel: etapas ordenadas, prévia útil, foto e valores preservados', async ({ page }, info) => {
  test.skip(info.project.name === 'tablet', 'Larguras direcionadas de celular e computador')
  const erros: string[] = []
  page.on('pageerror', erro => erros.push(erro.message))
  for (const width of info.project.name === 'mobile' ? [360, 390, 430] : [1440]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(entrada)
    await page.getByRole('button', { name: 'Novo paciente', exact: true }).click()
    const nav = page.getByRole('navigation', { name: 'Etapas do formulário do paciente' })
    await expect(nav.locator('strong')).toHaveText(['1. Identificação', '2. Endereço e contatos'])
    await expect(nav).not.toContainText('Convênios')
    await expect(page.getByRole('note', { name: 'Convênios — Em planejamento' })).toBeVisible()
    const nome = page.getByLabel('Nome completo', { exact: false })
    const previa = page.getByLabel('Prévia da identificação na lista')
    if (width < 500) {
      await expect(previa).not.toBeVisible()
      await expect(nome).toBeInViewport()
      await page.screenshot({ path: `scratch/acabamento-mobile/cadastro-${width}.png` })
    } else await expect(previa).toBeVisible()
    await nome.fill('Pessoa Sintética de Conferência')
    await expect(previa).toBeVisible()
    await expect(previa).toContainText('Pessoa Sintética de Conferência')
    if (width < 500) {
      const foto = page.getByRole('button', { name: /Foto do paciente/ })
      await foto.press('Enter')
      await expect(page.getByRole('button', { name: 'Enviar foto', exact: true })).toBeVisible()
      await foto.press('Enter')
      await expect(nome).toHaveValue('Pessoa Sintética de Conferência')
    }
    await page.getByLabel('Data de nascimento', { exact: true }).fill('1992-03-14')
    await nav.getByRole('button', { name: 'Endereço e contatos', exact: true }).press('Enter')
    await expect(page.getByLabel('Telefone / WhatsApp', { exact: true })).toBeVisible()
    await nav.getByRole('button', { name: /^1\. Identificação/ }).press('Enter')
    await expect(nome).toHaveValue('Pessoa Sintética de Conferência')
    await page.getByLabel('Data de nascimento', { exact: true }).fill('2014-03-14')
    await expect(nav.getByRole('button')).toHaveCount(3)
    await expect(nav.getByRole('button').nth(1)).toContainText('2. Responsável legal')
    await expect(nav.getByRole('button').nth(2)).toContainText('3. Endereço e contatos')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(erros).toHaveLength(0)
})
test('ReUI: foto compacta preserva identificação, seleção e opções no cadastro e edição', async ({ page }, info) => {
  await page.goto(entrada)
  await page.getByRole('button', { name: 'Novo paciente', exact: true }).click()
  const gatilho = page.getByRole('button', { name: /Foto do paciente/ })
  const mobile = info.project.name === 'mobile'
  if (mobile) {
    await expect(gatilho).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('button', { name: 'Enviar foto', exact: true })).not.toBeVisible()
    await expect(page.getByLabel('Nome completo', { exact: false })).toBeVisible()
    await gatilho.press('Enter')
  } else await expect(gatilho).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar foto', exact: true })).toBeVisible()
  await page.locator('.paciente-foto-area input[type="file"]').setInputFiles({ name: 'foto-sintetica.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9p0AAAAASUVORK5CYII=', 'base64') })
  if (mobile) {
    await gatilho.press('Enter'); await expect(page.getByRole('button', { name: 'Confirmar foto', exact: true })).not.toBeVisible()
    await gatilho.press('Enter')
  }
  await page.getByRole('button', { name: 'Confirmar foto', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Trocar foto', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remover foto', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar cadastro de paciente' }).click()
  await page.getByRole('button', { name: 'Descartar cadastro', exact: true }).click()
  await page.getByRole('button', { name: 'Editar Ana Exemplo Sintético', exact: true }).click()
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Ana Exemplo Sintético')
  if (mobile) {
    await expect(gatilho).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('button', { name: 'Adicionar foto', exact: true })).not.toBeVisible()
    await gatilho.press('Enter')
  }
  await expect(page.getByRole('button', { name: 'Adicionar foto', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar edição' }).click()
})
for (const unidade of ['brotas', 'ipupiara']) for (const tema of ['claro', 'escuro']) {
  test(`${unidade}/${tema}: lista, resumo, seis itens, criação e edição reais em isolamento`, async ({ page }, info) => {
    await page.addInitScript(t => localStorage.setItem('clinica-patricia:tema', t), tema)
    const externas: string[] = []
    page.on('request', r => { if (r.url().includes('supabase.co')) externas.push(r.url()) })
    await page.goto(`${entrada}?unidade=${unidade}`)
    await expect(page.locator('.pacientes-lista-linha')).toHaveCount(8)
    await expect(page.locator('.pacientes-lista-linha').filter({ hasText: 'Clara Exemplo Sintético' }).getByText('Dados a completar', { exact: true })).toBeVisible()
    if (info.project.name !== 'desktop') {
      await page.screenshot({ path: `scratch/pacientes-redesenho/${unidade}-${tema}-${info.project.name}-lista.png` })
    }
    if (info.project.name === 'mobile') {
      await expect(page.locator('.pacientes-lista-identidade').first()).toHaveCSS('grid-row-start', '1')
      await page.locator('.pacientes-lista-linha').last().scrollIntoViewIfNeeded()
      const ultimo = await page.locator('.pacientes-lista-linha').last().boundingBox()
      const novo = await page.getByRole('button', { name: 'Novo paciente', exact: true }).boundingBox()
      expect(ultimo!.y + ultimo!.height).toBeLessThanOrEqual(novo!.y)
      await page.locator('.pacientes-lista-linha').first().scrollIntoViewIfNeeded()
      await page.screenshot({ path: `scratch/pacientes-redesenho/${unidade}-${tema}-mobile-cartoes.png` })
    }
    await page.getByRole('button', { name: 'Ver resumo de Ana Exemplo Sintético', exact: true }).click()
    await expect(page.getByText('6 de 6 itens informados', { exact: true })).toBeVisible()
    const resumo = page.locator('.pacientes-resumo')
    const posicao = await resumo.evaluate(el => getComputedStyle(el).position)
    expect(posicao).toBe(info.project.name === 'desktop' ? 'sticky' : 'fixed')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (info.project.name === 'desktop') await expect(page.locator('.pacientes-lista-colunas')).toBeVisible()
    await page.screenshot({ path: `scratch/pacientes-redesenho/${unidade}-${tema}-${info.project.name}-${info.project.name === 'desktop' ? 'lista' : 'resumo'}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Fechar resumo', exact: true }).click()
    await page.getByRole('button', { name: 'Ver resumo de Clara Exemplo Sintético', exact: true }).click()
    await expect(page.getByText('1 de 6 itens informados', { exact: true })).toBeVisible()
    await expect(page.getByText(/Dados a completar: Nascimento, Telefone, Sexo, Endereço, CPF/)).toBeVisible()
    await page.getByRole('button', { name: 'Fechar resumo', exact: true }).press('Escape')
    await expect(resumo).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ver resumo de Clara Exemplo Sintético', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Novo paciente', exact: true }).click()
    await page.getByLabel('Nome completo', { exact: false }).fill('Novo Exemplo Sintético')
    await expect(page.getByLabel('Prévia da identificação na lista')).toContainText('Novo Exemplo Sintético')
    await expect(page.locator('.paciente-etapa-rodape')).toContainText('Etapa 1 de 2')
    await page.screenshot({ path: `scratch/pacientes-redesenho/${unidade}-${tema}-${info.project.name}-criacao.png`, fullPage: true })
    await page.getByRole('button', { name: 'Fechar cadastro de paciente' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Continuar preenchendo' }).click()
    await expect(page.getByLabel('Nome completo', { exact: false })).toHaveValue('Novo Exemplo Sintético')
    await page.getByRole('button', { name: 'Fechar cadastro de paciente' }).click()
    await page.getByRole('button', { name: 'Descartar cadastro', exact: true }).click()
    await page.getByRole('button', { name: 'Editar Ana Exemplo Sintético', exact: true }).click()
    await expect(page.locator('.paciente-edicao')).toBeVisible()
    await expect(page.locator('.paciente-edicao').getByLabel('Nome completo', { exact: true })).toHaveValue('Ana Exemplo Sintético')
    await page.screenshot({ path: `scratch/pacientes-redesenho/${unidade}-${tema}-${info.project.name}-edicao.png`, fullPage: true })
    await page.getByRole('button', { name: 'Fechar edição' }).click()
    expect(externas).toHaveLength(0)
  })
}
test('cadastro sem CPF: sucesso confirmado permanece após fechar; falha mantém rascunho', async ({ page }) => {
  for (const falha of [false, true]) {
    await page.goto(`${entrada}${falha ? '?erro-salvar' : ''}`)
    await page.getByRole('button', { name: 'Novo paciente', exact: true }).click()
    await page.getByLabel('Nome completo', { exact: false }).fill('Cadastro Sintético')
    await page.getByLabel('Data de nascimento', { exact: true }).fill('1992-03-14')
    await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
    await page.getByLabel('Telefone / WhatsApp', { exact: true }).fill('77900000000')
    await page.getByRole('button', { name: 'Salvar paciente', exact: true }).click()
    if (falha) {
      await expect(page.getByText('Não foi possível concluir', { exact: true })).toBeVisible()
      await expect(page.locator('.paciente-modal')).toBeVisible()
      await expect(page.getByLabel('Telefone / WhatsApp', { exact: true })).toHaveValue('(77) 90000-0000')
    } else {
      await expect(page.getByText('Paciente cadastrado com sucesso.', { exact: true })).toBeVisible()
      await expect(page.locator('.paciente-modal')).toHaveCount(0)
    }
  }
})
for (const cenario of ['erro-cpf', 'erro-leitura', 'erro-contagem', 'limite', 'lento', 'sexo-legado']) {
  test(`estado ${cenario} não inventa ausência ou total`, async ({ page }) => {
    await page.goto(`${entrada}?${cenario}`)
    if (cenario === 'limite') { await expect(page.getByText('Refine a busca ou os filtros', { exact: true })).toBeVisible(); await expect(page.locator('.pacientes-lista-linha')).toHaveCount(0); return }
    if (cenario === 'erro-contagem') { await expect(page.locator('.pacientes-indicador strong')).toHaveText(['Indisponível', 'Indisponível']); return }
    await page.getByRole('button', { name: 'Ver resumo de Ana Exemplo Sintético', exact: true }).click()
    await expect(page.getByText(cenario === 'lento' ? '6 de 6 itens informados' : cenario === 'sexo-legado' ? 'Informação de cadastro não reconhecida' : 'Não foi possível verificar o preenchimento', { exact: true })).toBeVisible()
    if (cenario !== 'lento') await expect(page.locator('.pacientes-preenchimento progress')).toHaveCount(0)
    await page.getByRole('button', { name: 'Fechar resumo', exact: true }).click()
    await page.getByRole('button', { name: 'Trocar clínica de demonstração' }).click()
    await expect(page.locator('.pacientes-resumo')).toHaveCount(0)
    await expect(page.locator('.pacientes-pagina-clinica')).toContainText('Clínica Ipupiara')
  })
}

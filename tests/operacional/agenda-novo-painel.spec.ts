import { expect, test, type Locator, type Page } from '@playwright/test'

// Fidelidade visual do painel "Novo agendamento". Somente prévia sintética; nenhuma escrita em banco real.
const previa = '/tests/operacional/agenda-preview.html'
const pasta = 'scratch/agenda-ux/fidelidade'
async function abrir(page: Page, query = '') {
  await page.goto(previa + query, { waitUntil: 'domcontentloaded' })
  // Primeira carga do Vite sintético pode compilar a frio.
  await expect(page.getByTestId('registro-agenda').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  return page.getByRole('dialog', { name: 'Novo agendamento' })
}
const rodape = (painel: Locator) => painel.locator('.agenda-formulario-rodape')
const cartaoPaciente = (painel: Locator) => painel.getByRole('group', { name: 'Paciente selecionado' })
const profissionais = (painel: Locator) => painel.getByRole('radiogroup', { name: '2. Profissional' })
async function capturar(page: Page, painel: Locator, alvo: Locator, nome: string, projeto: string) {
  await alvo.scrollIntoViewIfNeeded()
  await expect(painel.getByText('Verificando disponibilidade...', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: `${pasta}/${nome}-${projeto}.png`, animations: 'disabled' })
}
async function semOverflow(page: Page, painel: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  expect(await painel.locator('.agenda-formulario-conteudo').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
}
async function rodapeVisivel(page: Page, painel: Locator) {
  const caixa = await rodape(painel).boundingBox()
  expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1)
}
test.beforeEach(() => test.setTimeout(60_000))

test('cabeçalho, seções numeradas, estado vazio e linha “Falta:” no painel vazio', async ({ page }, info) => {
  const painel = await abrir(page)
  await expect(painel.getByRole('heading', { name: 'Novo agendamento' })).toBeVisible()
  await expect(painel).toContainText('Clínica Brotas')
  const fechar = painel.getByRole('button', { name: 'Fechar', exact: true })
  const caixa = await fechar.boundingBox()
  expect(caixa!.width).toBeGreaterThanOrEqual(44)
  expect(caixa!.height).toBeGreaterThanOrEqual(44)
  for (const titulo of ['1. Paciente', '2. Profissional', '3. Data e horário']) await expect(painel.getByRole('region', { name: titulo })).toBeVisible()
  // Observações: o título numerado é o rótulo do próprio campo (um só elemento com esse nome).
  await expect(painel.getByLabel('Observações')).toHaveAttribute('id', 'novo-agendamento-observacoes')
  await expect(painel.getByText('4. Observações', { exact: true })).toBeVisible()
  await expect(painel.getByRole('region', { name: '3. Data e horário' })).toContainText('Escolha o profissional para ver os dias e horários livres.')
  // A lista com marcadores saiu da tela; o texto completo fica só para leitor de tela.
  await expect(rodape(painel).locator('ul, li')).toHaveCount(0)
  await expect(painel.locator('#pendencias-criacao')).toHaveClass(/sr-only/)
  await expect(rodape(painel)).toContainText('Falta: paciente, profissional e horário')
  const agendar = painel.getByRole('button', { name: 'Agendar', exact: true })
  await expect(agendar).toBeDisabled()
  // A lista completa continua acessível: descreve o botão e fica no status para leitor de tela.
  await expect(agendar).toHaveAccessibleDescription(/Para agendar: .*Selecione um paciente nos resultados da pesquisa\./)
  await expect(painel.getByLabel('Resumo do horário')).toHaveCount(0)
  await rodapeVisivel(page, painel)
  await semOverflow(page, painel)
  await capturar(page, painel, painel.getByRole('region', { name: '1. Paciente' }), 'painel-vazio', info.project.name)
})

test('paciente: cartão com iniciais e “Trocar” volta à pesquisa, inclusive por teclado', async ({ page }, info) => {
  const painel = await abrir(page)
  const pesquisa = painel.getByRole('combobox', { name: 'Paciente', exact: true })
  await pesquisa.fill('Ana')
  await pesquisa.press('Enter')
  const cartao = cartaoPaciente(painel)
  await expect(cartao).toContainText('Ana Exemplo Sintético')
  await expect(cartao).toContainText('AS')
  await expect(cartao).toContainText('Paciente da Clínica Brotas')
  await expect(pesquisa).toHaveCount(0)
  const trocar = cartao.getByRole('button', { name: /^Trocar/ })
  await expect(trocar).toBeFocused()
  const alvo = await trocar.boundingBox()
  expect(alvo!.height).toBeGreaterThanOrEqual(44)
  await expect(rodape(painel)).toContainText('Falta: profissional e horário')
  await capturar(page, painel, cartao, 'paciente-escolhido', info.project.name)
  await page.keyboard.press('Enter')
  await expect(cartao).toHaveCount(0)
  await expect(pesquisa).toBeFocused()
  await expect(painel.getByRole('listbox', { name: 'Pacientes encontrados' })).toBeVisible()
  await expect(rodape(painel)).toContainText('Falta: paciente, profissional e horário')
  // Digitar sem escolher continua sem identificar paciente.
  await pesquisa.fill('Bruno')
  await expect(cartao).toHaveCount(0)
  await painel.getByRole('option', { name: 'Bruno Exemplo Sintético', exact: true }).click()
  await expect(cartaoPaciente(painel)).toContainText('Bruno Exemplo Sintético')
})

test('profissional: cartões selecionáveis com duração; resumo e blocos no rodapé', async ({ page }, info) => {
  const painel = await abrir(page, '?terca')
  await painel.getByRole('combobox', { name: 'Paciente', exact: true }).fill('Ana')
  await painel.getByRole('option', { name: 'Ana Exemplo Sintético', exact: true }).click()
  const grupo = profissionais(painel)
  await expect(grupo.getByRole('radio')).toHaveCount(2)
  await expect(painel.locator('select#novo-agendamento-profissional')).toHaveCount(0)
  const clinico = grupo.getByRole('radio', { name: /Clínica geral/ })
  await clinico.focus()
  await page.keyboard.press('Space')
  await expect(clinico).toBeChecked()
  const cartao = grupo.locator('label').filter({ hasText: 'Clínica geral' })
  await expect(cartao).toContainText('30 min')
  await expect(cartao).toHaveCSS('border-top-color', await painel.evaluate(() => {
    const sonda = document.createElement('div'); sonda.style.color = 'var(--cor-primaria)'; document.body.append(sonda)
    const cor = getComputedStyle(sonda).color; sonda.remove(); return cor
  }))
  await expect(grupo.locator('label').filter({ hasText: 'Cardiologia' })).not.toContainText('min')
  for (const r of await grupo.getByRole('radio').all()) expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await painel.getByRole('button', { name: /^terça-feira/ }).click()
  const blocos = painel.getByRole('group', { name: 'Horários disponíveis' })
  await expect(blocos.getByRole('button', { name: '10:00', exact: true })).toBeVisible()
  await expect(rodape(painel)).toContainText('Falta: horário')
  await capturar(page, painel, blocos, 'profissional-blocos', info.project.name)
  await blocos.getByRole('button', { name: '10:00', exact: true }).click()
  const resumo = painel.getByLabel('Resumo do horário')
  await expect(resumo).toContainText(/Ter, \d{2}\/\d{2} · 10:00–10:30 · Profissional Sintético — Clínica geral/)
  await expect(resumo).toContainText('30 min')
  await expect(rodape(painel)).not.toContainText('Falta:')
  await expect(painel.getByRole('button', { name: 'Agendar', exact: true })).toBeEnabled()
  await expect(painel.getByRole('button', { name: 'Agendar', exact: true })).toHaveAccessibleDescription(/Pronto para agendar/)
  await rodapeVisivel(page, painel)
  await semOverflow(page, painel)
  await capturar(page, painel, blocos.getByRole('button', { name: '10:00', exact: true }), 'horario-resumo', info.project.name)
  // Resumo com pendência restante: horário manual fora da faixa exige confirmação.
  await painel.getByRole('button', { name: 'Outro horário', exact: true }).click()
  await painel.getByLabel('Início', { exact: true }).fill('18:10')
  await expect(resumo).toContainText('18:10–18:40')
  await expect(resumo).toContainText('30 min · Falta: confirmação manual')
  await painel.getByRole('checkbox', { name: /confirmo a marcação manual/ }).check()
  await expect(rodape(painel)).not.toContainText('Falta:')
  await painel.getByRole('button', { name: 'Agendar', exact: true }).click()
  await expect(painel).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-envios-sinteticos', '1')
})

test('mais de seis profissionais mantém o select e mostra a duração do escolhido', async ({ page }) => {
  const painel = await abrir(page, '?muitos-profissionais')
  await expect(profissionais(painel)).toHaveCount(0)
  const select = painel.getByRole('combobox', { name: '2. Profissional' })
  await expect(select.locator('option')).toHaveCount(9)
  await select.selectOption('prof-2')
  await expect(painel.getByRole('region', { name: '2. Profissional' })).toContainText('Cardiologia · 40 min por atendimento')
  await expect(painel.getByRole('region', { name: '3. Data e horário' }).getByRole('group', { name: 'Próximos dias' })).toBeVisible()
})

test('sem expediente: estado vazio na seção e “Outra data” compacta', async ({ page }, info) => {
  const painel = await abrir(page, '?sem-expediente')
  await profissionais(painel).getByRole('radio', { name: /Clínica geral/ }).check()
  const secao = painel.getByRole('region', { name: '3. Data e horário' })
  await expect(secao).toContainText('Sem expediente cadastrado nesta data')
  const outraData = secao.getByLabel('Outra data')
  await expect(outraData).toBeVisible()
  expect((await outraData.boundingBox())!.width).toBeLessThan((await secao.boundingBox())!.width / 2)
  await expect(rodape(painel)).toContainText('Falta: paciente e horário')
  await semOverflow(page, painel)
  await capturar(page, painel, secao.getByRole('group', { name: 'Horários disponíveis' }), 'sem-expediente', info.project.name)
})

test('modo escuro: cartões, faixa, blocos e rodapé legíveis com tokens do tema', async ({ page }, info) => {
  await page.goto(previa + '?terca', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('registro-agenda').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Alternar tema' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'escuro')
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  const painel = page.getByRole('dialog', { name: 'Novo agendamento' })
  await painel.getByRole('combobox', { name: 'Paciente', exact: true }).fill('Ana')
  await painel.getByRole('option', { name: 'Ana Exemplo Sintético', exact: true }).click()
  await profissionais(painel).getByRole('radio', { name: /Clínica geral/ }).check()
  await painel.getByRole('button', { name: /^terça-feira/ }).click()
  await painel.getByRole('group', { name: 'Horários disponíveis' }).getByRole('button', { name: '09:30', exact: true }).click()
  const cores = await painel.evaluate(el => {
    const fundo = getComputedStyle(el).backgroundColor
    const cartao = el.querySelector('[aria-label="Paciente selecionado"]')!
    const resumo = el.querySelector('[aria-label="Resumo do horário"] p')!
    return { fundo, cartao: getComputedStyle(cartao).backgroundColor, textoCartao: getComputedStyle(cartao.querySelector('p')!).color, resumo: getComputedStyle(resumo).color }
  })
  expect(cores.cartao).not.toBe(cores.fundo)
  expect(cores.textoCartao).not.toBe(cores.cartao)
  expect(cores.resumo).not.toBe(cores.fundo)
  await semOverflow(page, painel)
  await capturar(page, painel, cartaoPaciente(painel), 'escuro-topo', info.project.name)
  await capturar(page, painel, painel.getByRole('group', { name: 'Horários disponíveis' }), 'escuro', info.project.name)
})

test('Ipupiara: mesma estrutura com a identidade da clínica ativa', async ({ page }, info) => {
  const painel = await abrir(page, '?unidade=ipupiara&terca')
  await expect(painel).toContainText('Clínica Ipupiara')
  await painel.getByRole('combobox', { name: 'Paciente', exact: true }).fill('Ana')
  await painel.getByRole('option', { name: 'Ana Exemplo Sintético', exact: true }).click()
  await profissionais(painel).getByRole('radio', { name: /Clínica geral/ }).check()
  await painel.getByRole('button', { name: /^terça-feira/ }).click()
  await painel.getByRole('group', { name: 'Horários disponíveis' }).getByRole('button', { name: '11:00', exact: true }).click()
  await expect(painel.getByLabel('Resumo do horário')).toContainText('11:00–11:30')
  await capturar(page, painel, painel.getByRole('group', { name: 'Horários disponíveis' }), 'ipupiara-resumo', info.project.name)
})

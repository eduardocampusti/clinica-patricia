import { expect, test, type Locator, type Page } from '@playwright/test'

// Etapa 1 do seletor visual de horários. Somente prévia sintética; nenhuma escrita em banco real.
const previa = '/tests/operacional/agenda-preview.html'
const pasta = 'scratch/agenda-ux/etapa1'
async function abrirCriacao(page: Page, query = '', profissional = 'prof-1') {
  await page.goto(previa + query, { waitUntil: 'domcontentloaded' })
  // Primeira carga do Vite sintético pode compilar a frio.
  await expect(page.getByTestId('registro-agenda').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  const painel = page.getByRole('dialog', { name: 'Novo agendamento' })
  await painel.getByRole('combobox', { name: 'Paciente', exact: true }).fill('Ana')
  await painel.getByRole('option', { name: 'Ana Exemplo Sintético', exact: true }).click()
  await painel.locator(`input[name="novo-agendamento-profissional"][value="${profissional}"]`).check()
  await expect(painel.getByText('Verificando disponibilidade...', { exact: true })).toHaveCount(0)
  return painel
}
const blocos = (painel: Locator) => painel.getByRole('group', { name: 'Horários disponíveis' })
const faixa = (painel: Locator) => painel.getByRole('group', { name: 'Próximos dias' })
async function semOverflow(page: Page, painel: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  expect(await painel.locator('.agenda-formulario-conteudo').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
}
async function alvoMinimo(alvos: Locator) {
  for (const box of await alvos.evaluateAll(els => els.map(el => el.getBoundingClientRect()).map(b => ({ w: b.width, h: b.height })))) {
    expect(box.h).toBeGreaterThanOrEqual(44)
    expect(box.w).toBeGreaterThanOrEqual(44)
  }
}
async function capturar(page: Page, alvo: Locator, nome: string, projeto: string) {
  await alvo.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${pasta}/${nome}-${projeto}.png`, animations: 'disabled' })
}
test.beforeEach(() => test.setTimeout(60_000))

for (const unidade of ['brotas', 'ipupiara']) test(`${unidade}: clicar bloco preenche início/término; ocupado aparece riscado e não é clicável`, async ({ page }, info) => {
  const painel = await abrirCriacao(page, `?unidade=${unidade}`)
  const grade = blocos(painel)
  await expect(grade.getByRole('group', { name: /^Manhã/ })).toBeVisible()
  await expect(grade.getByRole('group', { name: /^Tarde/ })).toBeVisible()
  await expect(grade.getByRole('group', { name: /^Noite/ })).toHaveCount(0)
  // 08:00–18:00 com 30 min: 20 blocos, dois ocupados pelos agendamentos sintéticos de 09:00 e 10:00.
  await expect(grade.getByRole('button')).toHaveCount(20)
  const ocupado = grade.getByRole('button', { name: '09:00 ocupado', exact: true })
  await expect(ocupado).toBeDisabled()
  await expect(ocupado).toHaveCSS('text-decoration-line', 'line-through')
  await expect(grade.getByRole('button', { name: '10:00 ocupado', exact: true })).toBeDisabled()
  await ocupado.click({ force: true })
  // Sem horário escolhido, o rodapé mostra só o que falta (o resumo aparece depois).
  await expect(painel.getByLabel('Resumo do horário')).toHaveCount(0)
  await expect(painel.locator('.agenda-formulario-rodape')).toContainText('Falta: horário')
  await alvoMinimo(grade.getByRole('button'))
  await alvoMinimo(faixa(painel).getByRole('button'))
  await alvoMinimo(painel.getByRole('button', { name: 'Outro horário', exact: true }))
  await semOverflow(page, painel)
  if (unidade === 'brotas') await capturar(page, grade, 'blocos', info.project.name)
  // Teclado: foco visível e Enter seleciona.
  await grade.getByRole('button', { name: '08:00', exact: true }).focus()
  await page.keyboard.press('Tab')
  const bloco = grade.getByRole('button', { name: '08:30', exact: true })
  await expect(bloco).toBeFocused()
  expect(await bloco.evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineStyle !== 'none')).toBe(true)
  await page.keyboard.press('Enter')
  await expect(bloco).toHaveAttribute('aria-pressed', 'true')
  await expect(painel.getByLabel('Resumo do horário')).toContainText('08:30')
  await expect(painel.getByLabel('Resumo do horário')).toContainText('09:00')
  // Cor primária da clínica ativa, lida do token (aguarda o fim da transição).
  await expect.poll(() => bloco.evaluate(el => {
    const sonda = document.createElement('div'); sonda.style.background = 'var(--cor-primaria)'; document.body.append(sonda)
    const esperado = getComputedStyle(sonda).backgroundColor; sonda.remove(); return getComputedStyle(el).backgroundColor === esperado
  })).toBe(true)
  await grade.getByRole('button', { name: '14:00', exact: true }).click()
  await expect(bloco).toHaveAttribute('aria-pressed', 'false')
  await expect(painel.getByLabel('Resumo do horário')).toContainText('14:30')
  await capturar(page, grade, `selecionado-${unidade}`, info.project.name)
  await expect(painel.getByRole('button', { name: 'Agendar', exact: true })).toBeEnabled()
  await painel.getByRole('button', { name: 'Agendar', exact: true }).click()
  await expect(painel).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento criado' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-envios-sinteticos', '1')
})

test('Outro horário fora da faixa exige aviso e confirmação e usa a RPC de criação', async ({ page }) => {
  const painel = await abrirCriacao(page)
  const outro = painel.getByRole('button', { name: 'Outro horário', exact: true })
  await expect(outro).toHaveAttribute('aria-expanded', 'false')
  await expect(painel.getByLabel('Início', { exact: true })).toHaveCount(0)
  await outro.click()
  await expect(outro).toHaveAttribute('aria-expanded', 'true')
  await expect(painel.getByLabel('Início', { exact: true })).toBeFocused()
  await painel.getByLabel('Início', { exact: true }).fill('18:10')
  await expect(painel.getByRole('region', { name: 'Disponibilidade para a data' }).getByRole('status').filter({ hasText: 'Marcação manual' })).toContainText('Horário fora da faixa habitual')
  await expect(painel.getByLabel('Resumo do horário')).toContainText('18:40')
  const agendar = painel.getByRole('button', { name: 'Agendar', exact: true })
  await expect(agendar).toBeDisabled()
  await painel.getByRole('checkbox', { name: /confirmo a marcação manual/ }).check()
  await expect(agendar).toBeEnabled()
  await agendar.click()
  // A prévia responde em memória (fetch interceptado na página): conferir envio único e o registro devolvido.
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento criado' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-envios-sinteticos', '1')
  await expect(page.getByTestId('registro-agenda').filter({ hasText: '18:10–18:40' })).toContainText('Ana Exemplo Sintético')
})

test('dia sem expediente mostra estado vazio e permite marcação manual confirmada', async ({ page }, info) => {
  const painel = await abrirCriacao(page, '?sem-expediente')
  await expect(blocos(painel)).toContainText('Sem expediente cadastrado nesta data')
  await expect(blocos(painel).getByRole('button')).toHaveCount(0)
  await expect(painel.getByRole('alert')).toHaveCount(0)
  await expect(faixa(painel).getByRole('button')).toHaveCount(7)
  for (const dia of await faixa(painel).getByRole('button').all()) await expect(dia).toContainText('Sem expediente')
  await capturar(page, blocos(painel), 'sem-expediente', info.project.name)
  await painel.getByRole('button', { name: 'Outro horário', exact: true }).click()
  await painel.getByLabel('Início', { exact: true }).fill('11:00')
  await expect(painel.getByRole('region', { name: 'Disponibilidade para a data' }).getByRole('status').filter({ hasText: 'Marcação manual' })).toContainText('Sem expediente cadastrado para esta data')
  await expect(painel.getByRole('button', { name: 'Agendar', exact: true })).toBeDisabled()
  await painel.getByRole('checkbox', { name: /confirmo a marcação manual/ }).check()
  await expect(painel.getByRole('button', { name: 'Agendar', exact: true })).toBeEnabled()
  await semOverflow(page, painel)
})

test('faixa de dias: troca de data atualiza os blocos sem deslocar a janela', async ({ page }, info) => {
  const painel = await abrirCriacao(page, '?terca')
  const dias = faixa(painel).getByRole('button')
  await expect(dias).toHaveCount(7)
  const primeiro = await dias.first().getAttribute('aria-label')
  await expect(dias.first()).toHaveAttribute('aria-pressed', 'true')
  const terca = faixa(painel).getByRole('button', { name: /^terça-feira/ })
  await expect(terca).toContainText('livres')
  const rotulo = (await terca.getAttribute('aria-label'))!
  await terca.click()
  await expect(terca).toHaveAttribute('aria-pressed', 'true')
  const data = await painel.getByLabel('Outra data').inputValue()
  expect(new Date(`${data}T12:00:00`).getDay()).toBe(2)
  await expect(painel.getByText('Verificando disponibilidade...', { exact: true })).toHaveCount(0)
  const livres = Number(/(\d+) livres?/.exec(rotulo)![1])
  expect(await blocos(painel).getByRole('button', { disabled: false }).count()).toBe(livres)
  await expect(dias.first()).toHaveAttribute('aria-label', primeiro!)
  await capturar(page, faixa(painel), 'faixa-terca', info.project.name)
  await faixa(painel).getByRole('button', { name: /Sem expediente$/ }).first().click()
  await expect(blocos(painel)).toContainText('Sem expediente cadastrado nesta data')
  await expect(dias.first()).toHaveAttribute('aria-label', primeiro!)
})

test('falha da leitura da faixa não bloqueia o formulário', async ({ page }) => {
  const painel = await abrirCriacao(page, '?falha-faixa')
  await expect(painel).toContainText('Contagem de horários livres indisponível')
  await expect(faixa(painel).getByRole('button')).toHaveCount(7)
  await expect(faixa(painel)).not.toContainText('livre')
  await expect(painel.getByRole('alert')).toHaveCount(0)
  await blocos(painel).getByRole('button', { name: '08:30', exact: true }).click()
  await expect(painel.getByRole('button', { name: 'Agendar', exact: true })).toBeEnabled()
  await painel.getByRole('button', { name: 'Agendar', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento criado' })).toBeVisible()
})

test('edição usa os mesmos blocos, agora com a faixa de dias da remarcação; próprio horário fica selecionado', async ({ page }, info) => {
  await page.goto(previa, { waitUntil: 'domcontentloaded' })
  // Computador abre no modo Dia; estes cenários usam as ações da lista.
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await page.locator('[data-registro-id="ag-2"]').getByRole('button', { name: 'Editar agendamento' }).click()
  const painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await expect(painel.getByText('Verificando disponibilidade...', { exact: true })).toHaveCount(0)
  // Remarcação: “Escolher outra data” passou a incluir a faixa de dias (antes ausente na edição).
  await expect(faixa(painel)).toHaveCount(1)
  await expect(blocos(painel).getByRole('button', { name: '10:00', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(blocos(painel).getByRole('button', { name: '09:00 ocupado', exact: true })).toBeDisabled()
  await blocos(painel).getByRole('button', { name: '11:00', exact: true }).click()
  await expect(painel.getByLabel('Resumo do horário')).toContainText('11:30')
  await painel.getByRole('button', { name: 'Outro', exact: true }).click()
  await painel.getByLabel('Motivo da correção').fill('Correção exclusivamente sintética')
  await painel.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  await expect(painel.getByRole('button', { name: 'Confirmar remarcação' })).toBeEnabled()
  await semOverflow(page, painel)
  await capturar(page, blocos(painel), 'edicao', info.project.name)
})

test('modo escuro: blocos, faixa e seleção legíveis com tokens do tema', async ({ page }, info) => {
  await page.goto(previa + '?terca', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Alternar tema' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'escuro')
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  const painel = page.getByRole('dialog', { name: 'Novo agendamento' })
  await painel.locator('input[name="novo-agendamento-profissional"][value="prof-1"]').check()
  await faixa(painel).getByRole('button', { name: /^terça-feira/ }).click()
  await blocos(painel).getByRole('button', { name: '10:30', exact: true }).click()
  const cores = await blocos(painel).getByRole('button', { name: '10:30', exact: true }).evaluate(el => {
    const fundo = getComputedStyle(document.querySelector('dialog')!).backgroundColor
    return { texto: getComputedStyle(el).color, fundoBloco: getComputedStyle(el).backgroundColor, fundo }
  })
  expect(cores.fundoBloco).not.toBe(cores.fundo)
  expect(cores.texto).not.toBe(cores.fundoBloco)
  await semOverflow(page, painel)
  await capturar(page, blocos(painel), 'escuro', info.project.name)
})

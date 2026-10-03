import { expect, test, type Locator, type Page } from '@playwright/test'

// Painel de remarcação conforme o mockup aprovado. Somente prévia sintética; nenhuma escrita em banco real.
// Relógio fixo em hoje às 10:20 para as sugestões “ainda hoje” serem determinísticas.
const previa = '/tests/operacional/agenda-preview.html'
const pasta = 'scratch/agenda-ux/remarcacao'
const hoje = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
const registro = (page: Page, id: string) => page.locator(`[data-registro-id="${id}"]`)
async function abrirRemarcacao(page: Page, query = '', id = 'ag-r') {
  await page.clock.setFixedTime(new Date(`${hoje}T10:20:00`))
  await page.goto(`${previa}?remarcacao${query}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('registro-agenda').first()).toBeAttached({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await registro(page, id).getByRole('button', { name: 'Editar agendamento' }).click()
  const painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await expect(painel.getByText('Buscando horários livres...')).toHaveCount(0)
  return painel
}
const sugestoes = (painel: Locator) => painel.getByRole('group', { name: 'Próximos horários livres' }).getByRole('button')
const rodape = (painel: Locator) => painel.locator('.agenda-formulario-rodape')
const ultimoEnvio = async (page: Page) => JSON.parse((await page.locator('html').getAttribute('data-ultimo-envio'))!)
async function capturar(page: Page, alvo: Locator, nome: string, projeto: string) {
  await alvo.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${pasta}/${nome}-${projeto}.png`, animations: 'disabled' })
}
async function semOverflow(page: Page, painel: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  expect(await painel.locator('.agenda-formulario-conteudo').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
}
async function alvos(locais: Locator) {
  for (const b of await locais.evaluateAll(els => els.map(el => el.getBoundingClientRect()).map(r => ({ w: r.width, h: r.height })))) {
    expect(b.h).toBeGreaterThanOrEqual(44)
    expect(b.w).toBeGreaterThanOrEqual(44)
  }
}
test.beforeEach(() => test.setTimeout(60_000))

test('abertura: de → para, sugestões priorizadas, motivo e “Falta:” no rodapé', async ({ page }, info) => {
  const painel = await abrirRemarcacao(page)
  await expect(painel).toContainText('Clara Exemplo Sintético · 30 min')
  const fechar = painel.getByRole('button', { name: 'Fechar', exact: true })
  await alvos(fechar)
  const atual = painel.getByRole('group', { name: 'Horário anterior' })
  await expect(atual).toContainText('Horário atual')
  await expect(atual.locator('.line-through')).toContainText('11:00–11:30')
  await expect(atual).toContainText('Profissional Sintético — Clínica geral')
  await expect(painel.getByRole('group', { name: 'Resumo do horário' })).toContainText('Escolha um novo horário')
  // Prioridade: ainda hoje (até 2, depois de agora), mesmo horário em outro dia (até 2), primeiro livre de cada dia.
  const lista = await sugestoes(painel).evaluateAll(els => els.map(e => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()))
  expect(lista).toHaveLength(6)
  expect(lista.slice(0, 2)).toEqual([expect.stringMatching(/^Hoje, .* 10:30 Ainda hoje$/), expect.stringMatching(/^Hoje, .* 11:30 Ainda hoje$/)])
  expect(lista.filter(t => /11:00 Mesmo horário$/.test(t))).toHaveLength(2)
  expect(lista.filter(t => /08:00 Manhã$/.test(t))).toHaveLength(2)
  for (const s of await sugestoes(painel).all()) await expect(s).toHaveAttribute('aria-pressed', 'false')
  await alvos(sugestoes(painel))
  await expect(rodape(painel)).toContainText('Falta: novo horário, motivo e confirmação')
  await expect(painel.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  await alvos(painel.getByRole('group', { name: 'Motivo da remarcação' }).getByRole('button'))
  if (info.project.name === 'mobile') {
    const a = (await atual.boundingBox())!, b = (await painel.getByRole('group', { name: 'Resumo do horário' }).boundingBox())!
    expect(b.y).toBeGreaterThan(a.y + a.height - 1)
  }
  await semOverflow(page, painel)
  await capturar(page, atual, 'abertura', info.project.name)
})

test('sugestão preenche data e horário; motivo rápido; revisão, confirmação e envio único', async ({ page }, info) => {
  const painel = await abrirRemarcacao(page, '&atraso')
  const mesmoHorario = sugestoes(painel).filter({ hasText: 'Mesmo horário' }).first()
  const rotulo = (await mesmoHorario.textContent())!
  await mesmoHorario.click()
  await expect(mesmoHorario).toHaveAttribute('aria-pressed', 'true')
  const novo = painel.getByRole('group', { name: 'Resumo do horário' })
  await expect(novo).toContainText('11:00–11:30')
  const dataEscolhida = await painel.getByLabel('Nova data').inputValue()
  expect(dataEscolhida > hoje).toBe(true)
  expect(rotulo).toContain(dataEscolhida.slice(8, 10) + '/' + dataEscolhida.slice(5, 7))
  await expect(novo).toContainText(`${dataEscolhida.slice(8, 10)}/${dataEscolhida.slice(5, 7)}/${dataEscolhida.slice(0, 4)}`)
  await expect(painel.getByRole('group', { name: 'Horários disponíveis' }).getByRole('button', { name: '11:00', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(rodape(painel)).toContainText('Falta: motivo e confirmação')
  await capturar(page, novo, 'sugestao-escolhida', info.project.name)
  const pedido = painel.getByRole('button', { name: 'Pedido do paciente' })
  await pedido.click()
  await expect(pedido).toHaveAttribute('aria-pressed', 'true')
  await expect(painel.getByLabel('Motivo da correção')).toHaveCount(0)
  await expect(rodape(painel)).toContainText('Falta: confirmação')
  await capturar(page, painel.getByRole('group', { name: 'Motivo da remarcação' }), 'motivo', info.project.name)
  const confirmar = painel.getByRole('button', { name: 'Confirmar remarcação' })
  await expect(confirmar).toBeDisabled()
  await painel.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  await expect(confirmar).toBeEnabled()
  await expect(rodape(painel)).toContainText('O horário das 11:00')
  await expect(rodape(painel)).toContainText('volta a ficar livre')
  await capturar(page, painel.getByRole('checkbox', { name: /Conferi o horário/ }), 'revisao', info.project.name)
  // Envio único mesmo com duplo envio; conteúdo exato para a RPC atual.
  await painel.locator('form').evaluate((f: HTMLFormElement) => { f.requestSubmit(); f.requestSubmit() })
  await expect(painel.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  await expect(painel).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-envios-sinteticos', '1')
  expect(await ultimoEnvio(page)).toMatchObject({ rpc: 'agenda_manual_corrigir_horario', p_agendamento_id: 'ag-r', p_status: 'confirmado', p_data_anterior: hoje,
    p_inicio_anterior: '11:00:00', p_nova_data: dataEscolhida, p_novo_inicio: '11:00', p_motivo: 'Pedido do paciente', p_confirmacao_manual: true, p_revisao: '2026-10-01T10:00:00Z' })
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento atualizado' })).toBeVisible()
})

test('motivo “Outro” abre o texto livre e mantém a validação de 5 a 500 caracteres', async ({ page }) => {
  const painel = await abrirRemarcacao(page)
  await sugestoes(painel).first().click()
  await painel.getByRole('button', { name: 'Imprevisto da clínica' }).click()
  await painel.getByRole('button', { name: 'Outro', exact: true }).click()
  const texto = painel.getByLabel('Motivo da correção')
  await expect(texto).toBeFocused()
  await expect(texto).toHaveValue('')
  await expect(rodape(painel)).toContainText('Falta: motivo e confirmação')
  await texto.fill('abc')
  await expect(rodape(painel)).toContainText('motivo')
  await texto.fill('Paciente pediu outro dia por telefone')
  await painel.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  await expect(rodape(painel)).not.toContainText('Falta:')
  await painel.getByRole('button', { name: 'Confirmar remarcação' }).click()
  await expect(painel).toHaveCount(0)
  expect(await ultimoEnvio(page)).toMatchObject({ p_motivo: 'Paciente pediu outro dia por telefone', p_novo_inicio: '10:30', p_nova_data: hoje })
})

test('chegada registrada: somente sugestões da mesma data, sem faixa de dias', async ({ page }) => {
  const painel = await abrirRemarcacao(page, '', 'ag-1')
  await expect(painel).toContainText('Chegada preservada')
  await expect(painel.getByLabel('Nova data')).toBeDisabled()
  await expect(painel.getByRole('group', { name: 'Próximos dias' })).toHaveCount(0)
  const lista = await sugestoes(painel).evaluateAll(els => els.map(e => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()))
  expect(lista.length).toBeGreaterThan(0)
  for (const t of lista) expect(t).toMatch(/^Hoje, .* Ainda hoje$/)
})

test('situação não editável mantém o comportamento atual (sem remarcação)', async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${hoje}T10:20:00`))
  await page.goto(`${previa}?remarcacao`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('registro-agenda').first()).toBeAttached({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await registro(page, 'ag-r').getByRole('button', { name: /^11:00 / }).click()
  const consulta = page.getByRole('dialog', { name: 'Consultar agendamento' })
  await consulta.getByRole('button', { name: 'Cancelar agendamento' }).click()
  await expect(registro(page, 'ag-r')).toContainText('Cancelado')
  await expect(registro(page, 'ag-r').getByRole('button', { name: 'Editar agendamento' })).toHaveCount(0)
  await registro(page, 'ag-r').getByRole('button', { name: /^11:00 / }).click()
  await expect(page.getByRole('dialog', { name: 'Consultar agendamento' }).getByRole('button', { name: 'Editar agendamento' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Remarcar agendamento' })).toHaveCount(0)
})

test('sem horários livres: estado vazio e caminho manual em evidência', async ({ page }, info) => {
  const painel = await abrirRemarcacao(page, '&sem-expediente')
  await expect(painel).toContainText('Nenhum horário livre encontrado nos próximos 14 dias')
  await expect(sugestoes(painel)).toHaveCount(0)
  const manual = painel.getByRole('button', { name: 'Escolher data e horário manualmente' })
  await alvos(manual)
  await manual.click()
  await expect(painel.getByRole('heading', { name: 'Escolher outra data' })).toBeFocused()
  await capturar(page, manual, 'sem-horarios', info.project.name)
  await painel.getByRole('button', { name: 'Outro horário', exact: true }).click()
  await painel.getByLabel('Novo horário', { exact: true }).fill('14:00')
  await expect(painel.getByRole('region', { name: 'Disponibilidade para a data' })).toContainText('Sem expediente cadastrado para esta data')
})

test('falha na leitura das sugestões não bloqueia a remarcação manual', async ({ page }) => {
  const painel = await abrirRemarcacao(page, '&falha-faixa')
  await expect(painel).toContainText('Não foi possível buscar sugestões agora')
  await expect(painel.getByRole('alert')).toHaveCount(0)
  await painel.getByRole('group', { name: 'Horários disponíveis' }).getByRole('button', { name: '14:00', exact: true }).click()
  await painel.getByRole('button', { name: 'Pedido do profissional' }).click()
  await painel.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  await expect(painel.getByRole('button', { name: 'Confirmar remarcação' })).toBeEnabled()
})

test('modo escuro: sugestão escolhida e motivo legíveis', async ({ page }, info) => {
  await page.clock.setFixedTime(new Date(`${hoje}T10:20:00`))
  await page.goto(`${previa}?remarcacao`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('registro-agenda').first()).toBeAttached({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Alternar tema' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'escuro')
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await registro(page, 'ag-r').getByRole('button', { name: 'Editar agendamento' }).click()
  const painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await sugestoes(painel).filter({ hasText: 'Mesmo horário' }).first().click()
  await painel.getByRole('button', { name: 'Pedido do paciente' }).click()
  for (const alvo of [sugestoes(painel).filter({ hasText: 'Mesmo horário' }).first(), painel.getByRole('button', { name: 'Pedido do paciente' })]) {
    const [fundo, texto] = await alvo.evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color])
    expect(fundo).not.toBe(texto)
  }
  await semOverflow(page, painel)
  await capturar(page, painel.getByRole('group', { name: 'Resumo do horário' }), 'escuro', info.project.name)
})


// Painel de criação: cartões de profissional (rádios nativos) ou select acima de seis.
const radioProfissional = (escopo: Page | Locator, id: string) => escopo.locator(`input[name="novo-agendamento-profissional"][value="${id}"]`)
import { expect, test, type Locator, type Page } from '@playwright/test'
import { relogioAgendaAntesDoExpediente } from './agenda-test-utils'
relogioAgendaAntesDoExpediente()
import { ESCALA_AGENDA } from '../../src/lib/agendaTemporal'

const previa = '/tests/operacional/agenda-preview.html'
const registro = (page: Page, id: string) => page.locator(`[data-registro-id="${id}"]`)
async function abrir(page: Page, query = '', quantidade = 3) {
  await page.goto(previa + query, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('registro-agenda')).toHaveCount(quantidade)
  // Computador abre no modo Dia; estes cenários usam as ações da lista.
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
}
async function semOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}
async function cancelarDescarte(page: Page) {
  const confirmacao = page.getByRole('alertdialog', { name: 'Descartar alterações?' })
  await expect(confirmacao).toBeVisible()
  await expect(confirmacao.getByRole('button', { name: 'Continuar preenchendo' })).toBeFocused()
  await confirmacao.getByRole('button', { name: 'Continuar preenchendo' }).click()
}
// Fora do expediente não há cartão livre na grade: a marcação manual parte de “+ Novo agendamento”.
async function abrirCriacaoManual(page: Page, inicio = '11:00') {
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  const painel = page.getByRole('dialog', { name: 'Novo agendamento' })
  await radioProfissional(painel, 'prof-2').check()
  await painel.getByRole('button', { name: 'Outro horário', exact: true }).click()
  await painel.getByLabel('Início', { exact: true }).fill(inicio)
  return painel
}
test.beforeEach(() => test.setTimeout(60_000))

for (const unidade of ['brotas', 'ipupiara']) {
  test(`grade temporal ${unidade}: eixo comum, duração, sobreposição, lista equivalente e shell real`, async ({ page }, info) => {
    await abrir(page, `?unidade=${unidade}&complexa`, 6)
    await expect(page.locator('.app-shell-header')).toContainText(`Clínica ${unidade === 'brotas' ? 'Brotas' : 'Ipupiara'}`)
    if (info.project.name !== 'desktop') {
      await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Menu principal' })).toContainText('Recepção')
      await page.keyboard.press('Escape')
    } else await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
    const ids = await page.getByTestId('registro-agenda').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-registro-id')).sort())
    await expect(registro(page, 'ag-5')).toContainText('Nome Muito Longo')
    await semOverflow(page)
    if (unidade === 'brotas') await page.screenshot({ path: `scratch/agenda-ux/rodada2/lista-${info.project.name}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    expect(await page.getByTestId('registro-agenda').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-registro-id')).sort())).toEqual(ids)
    const a = await registro(page, 'ag-1').boundingBox(), b = await registro(page, 'ag-4').boundingBox(), c = await registro(page, 'ag-5').boundingBox()
    expect(a!.y).toBeCloseTo(b!.y, 0)
    expect(b!.height / a!.height).toBeCloseTo(70 / 30, 1)
    expect(c!.y - a!.y).toBeCloseTo(15 * ESCALA_AGENDA, 0)
    expect(a!.x + a!.width).toBeLessThanOrEqual(c!.x)
    await expect(registro(page, 'ag-5')).toBeVisible()
    for (const id of ids) {
      expect(await registro(page, id!).evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      // Consultas curtas: uma linha (flex, sem quebra); demais: uma coluna interna de grade.
      expect(await registro(page, id!).locator('.agenda-lista-consulta').evaluate(el => el.closest('.agenda-temporal-curto') ? (getComputedStyle(el).display === 'flex' && getComputedStyle(el).flexWrap === 'nowrap' ? 1 : 0) : getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1)
    }
    await expect(page.locator('.agenda-temporal-posicao').filter({ has: registro(page, 'ag-5') })).toHaveAttribute('data-faixas', '2')
    // Janela compacta: começa no primeiro horário relevante (08:00) e mostra todos os registros.
    expect(await page.locator('.agenda-temporal-eixo span').first().textContent()).toBe('08:00')
    expect(await page.locator('.agenda-temporal-rolagem').evaluate(el => el.scrollTop)).toBe(0)
    await page.getByRole('button', { name: 'Ver dia inteiro' }).click()
    expect(await page.locator('.agenda-temporal-rolagem').evaluate(el => el.scrollTop)).toBeCloseTo((9 * 60 - 30) * ESCALA_AGENDA, 0)
    await semOverflow(page)
    if (unidade === 'brotas') await page.screenshot({ path: `scratch/agenda-ux/rodada2/grade-${info.project.name}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Início do dia' }).click()
    expect(await page.locator('.agenda-temporal-rolagem').evaluate(el => el.scrollTop)).toBe(0)
    // Dia inteiro acessível: eixo até 24:00 e colunas com altura de 24 h na mesma escala.
    await expect(page.locator('.agenda-temporal-eixo span').filter({ hasText: '23:30' })).toHaveCount(1)
    for (const altura of await page.locator('.agenda-temporal-coluna').evaluateAll(els => els.map(el => el.getBoundingClientRect().height))) expect(altura).toBeCloseTo(1440 * ESCALA_AGENDA + 12, 0)
  })
}

test('selecionar horário preenche o painel sem gravar e mantém o rascunho ao cancelar descarte', async ({ page }, info) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  await page.getByRole('button', { name: 'Novo agendamento às 11:00 — Profissional Sintético — Clínica geral', exact: true }).click()
  const painel = page.getByRole('dialog', { name: 'Novo agendamento' })
  const bloco = painel.getByRole('group', { name: 'Horários disponíveis' }).getByRole('button', { name: '11:00', exact: true })
  await expect(bloco).toHaveAttribute('aria-pressed', 'true')
  await expect(radioProfissional(painel, 'prof-1')).toBeChecked()
  await expect(page.locator('html')).not.toHaveAttribute('data-envios-sinteticos')
  await painel.getByRole('combobox', { name: 'Paciente', exact: true }).fill('Ana')
  await painel.getByRole('option', { name: 'Ana Exemplo Sintético' }).click()
  await painel.getByLabel('Observações').fill('Rascunho sintético preservado')
  await page.keyboard.press('Escape')
  await cancelarDescarte(page)
  await expect(painel.getByLabel('Observações')).toHaveValue('Rascunho sintético preservado')
  await expect(bloco).toHaveAttribute('aria-pressed', 'true')
  // Horário livre do expediente: sem aviso nem confirmação manual.
  await expect(painel.getByRole('checkbox', { name: /confirmo a marcação manual/ })).toHaveCount(0)
  const salvar = painel.getByRole('button', { name: 'Agendar', exact: true })
  await expect(salvar).toBeEnabled()
  const box = await salvar.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await page.screenshot({ path: `scratch/agenda-ux/rodada2/criacao-${info.project.name}.png` })
  await salvar.click()
  await expect(painel).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento criado' })).toHaveCount(1)
  await expect(page.locator('html')).toHaveAttribute('data-envios-sinteticos', '1')
})

test('edição compacta, descarte por teclado, rodapé e sucesso depois de fechar', async ({ page }, info) => {
  await abrir(page)
  await registro(page, 'ag-3').getByRole('button', { name: 'Editar agendamento' }).click()
  const painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await painel.getByLabel('Novo horário', { exact: true }).fill('16:40')
  await painel.getByRole('button', { name: 'Outro', exact: true }).click()
  await painel.getByLabel('Motivo da correção').fill('Correção exclusivamente sintética')
  await expect(painel.getByLabel('Comparação de horários')).toContainText('16:00')
  await expect(painel.getByLabel('Resumo do horário')).toContainText('17:20')
  await painel.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await cancelarDescarte(page)
  await expect(painel.getByLabel('Novo horário', { exact: true })).toHaveValue('16:40')
  await painel.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  const salvar = painel.getByRole('button', { name: 'Confirmar remarcação' })
  await expect(salvar).toBeEnabled()
  const box = await salvar.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await semOverflow(page)
  await page.screenshot({ path: `scratch/agenda-ux/rodada2/edicao-${info.project.name}.png` })
  await salvar.click()
  await expect(painel).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento atualizado' })).toHaveCount(1)
  await expect(registro(page, 'ag-3')).toContainText('16:40–17:20')
})

test('dia vazio permite preparar horários no dia inteiro, sem inventar expediente', async ({ page }) => {
  await abrir(page, '?vazio', 0)
  await expect(page.getByText('Nenhum agendamento corresponde à data e aos filtros.')).toBeVisible()
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  // Sem expediente: bloco neutro e nenhum horário livre inventado; o profissional com expediente mantém os seus.
  const cardiologia = page.getByRole('region', { name: 'Profissional Sintético — Cardiologia' })
  await expect(cardiologia).toContainText('Sem expediente')
  await expect(cardiologia.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Profissional Sintético — Clínica geral' }).getByRole('button', { name: /^Novo agendamento às 08:00/ })).toBeVisible()
  await page.getByRole('button', { name: 'Ver dia inteiro' }).click()
  await expect(page.locator('.agenda-temporal-eixo span').filter({ hasText: '20:00' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  const painel = await abrirCriacaoManual(page, '20:00')
  await expect(painel.getByLabel(/^Início/)).toHaveValue('20:00')
  await expect(painel).toContainText('Sem expediente cadastrado')
  await expect(painel.getByRole('button', { name: 'Agendar', exact: true })).toBeDisabled()
})

test('recepção: chegada pela lista e pelos detalhes; sem atalhos clínicos nem retorno silencioso', async ({ page }) => {
  await abrir(page)
  await registro(page, 'ag-2').getByRole('button', { name: 'Registrar chegada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Chegada registrada' })).toBeVisible()
  await expect(registro(page, 'ag-2')).toContainText('Aguardando')
  await expect(registro(page, 'ag-2').getByRole('button', { name: 'Registrar chegada' })).toHaveCount(0)
  await registro(page, 'ag-3').getByRole('button', { name: /^16:00 Clara/ }).click()
  const detalhes = page.getByRole('dialog', { name: 'Consultar agendamento' })
  await expect(detalhes.getByRole('button', { name: 'Em atendimento', exact: true })).toHaveCount(0)
  await expect(detalhes.getByRole('button', { name: 'Concluído', exact: true })).toHaveCount(0)
  await expect(detalhes.getByRole('button', { name: 'Iniciar atendimento' })).toHaveCount(0)
  await detalhes.getByRole('button', { name: 'Registrar chegada' }).click()
  await expect(registro(page, 'ag-3')).toContainText('Aguardando')
})

test('avisos distintos: falha não é expediente ausente e conflito continua bloqueando', async ({ page }) => {
  await abrir(page, '?falha')
  await expect(registro(page, 'ag-3')).toContainText('Disponibilidade não confirmada')
  await expect(registro(page, 'ag-3')).not.toContainText('Sem expediente')
  await registro(page, 'ag-3').getByRole('button', { name: 'Editar agendamento' }).click()
  let painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await expect(painel.getByRole('alert')).toContainText('Falha ao consultar disponibilidade')
  await expect(painel.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  await abrir(page)
  await registro(page, 'ag-2').getByRole('button', { name: 'Editar agendamento' }).click()
  painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await painel.getByRole('button', { name: 'Outro horário', exact: true }).click()
  await painel.getByLabel('Novo horário', { exact: true }).fill('09:15')
  await expect(painel.getByRole('region', { name: 'Disponibilidade para a data' }).getByRole('status')).toContainText('Há outro agendamento')
  await expect(painel.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
})

test('envio em andamento impede repetição; confirmação manual e folga preservadas', async ({ page }) => {
  await abrir(page, '?atraso')
  await registro(page, 'ag-3').getByRole('button', { name: 'Editar agendamento' }).click()
  const painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await painel.getByLabel('Novo horário', { exact: true }).fill('17:00')
  await painel.getByRole('button', { name: 'Outro', exact: true }).click()
  await painel.getByLabel('Motivo da correção').fill('Teste sintético de envio único')
  await expect(painel.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  await painel.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  await painel.getByRole('button', { name: 'Confirmar remarcação' }).click()
  await expect(painel.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  await expect(painel.getByRole('button', { name: 'Fechar', exact: true })).toBeDisabled()
  await expect(painel).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-envios-sinteticos', '1')
  await abrir(page, '?folga')
  await registro(page, 'ag-3').getByRole('button', { name: 'Editar agendamento' }).click()
  await expect(page.getByRole('dialog').getByRole('region', { name: 'Disponibilidade para a data' }).getByRole('status')).toContainText('folga ou bloqueio')
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
})

test('descarte confirmado não grava e modo escuro mantém painel legível e foco contido', async ({ page }, info) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Alternar tema' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'escuro')
  await registro(page, 'ag-3').getByRole('button', { name: 'Editar agendamento' }).click()
  const painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await painel.getByRole('button', { name: 'Outro', exact: true }).click()
  await painel.getByLabel('Motivo da correção').fill('Rascunho sintético a descartar')
  await page.keyboard.press('Escape')
  const dialog = page.getByRole('alertdialog', { name: 'Descartar alterações?' })
  await expect(dialog.getByRole('button', { name: 'Continuar preenchendo' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Descartar alterações' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Continuar preenchendo' })).toBeFocused()
  await semOverflow(page)
  await page.screenshot({ path: `scratch/agenda-ux/rodada2/descarte-escuro-${info.project.name}.png`, animations: 'disabled' })
  await dialog.getByRole('button', { name: 'Descartar alterações' }).click()
  await expect(painel).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-envios-sinteticos')
})

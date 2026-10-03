import { test, type Page } from '@playwright/test'

// B2 depende de agora. Fixar o relógio mantém os cenários anteriores de blocos
// disponíveis determinísticos, sem alterar ou relaxar suas asserções.
export function relogioAgendaAntesDoExpediente() {
  test.beforeEach(async ({ page }) => {
    const agora = new Date(); agora.setHours(6, 0, 0, 0)
    await page.clock.setFixedTime(agora)
  })
}

export async function filtrarProfissionalAgenda(page: Page, id: string) {
  const select = page.getByLabel('Filtrar profissional')
  if (await select.isVisible()) return select.selectOption(id)
  const nome = await select.locator('option').evaluateAll((opcoes, valor) => (opcoes.find(o => (o as HTMLOptionElement).value === valor) as HTMLOptionElement)?.textContent ?? '', id)
  await page.getByRole('group', { name: 'Profissionais no celular' }).getByRole('button', { name: id ? nome : 'Todos', exact: true }).click()
}

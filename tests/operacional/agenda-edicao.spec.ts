import { expect, test, type Page } from '@playwright/test'

test.beforeEach(() => test.setTimeout(90_000))
async function preparar(page: Page, papel = 'recepcao', erro?: string, semExpediente = false, recurso = true) {
  const hoje = new Date().toLocaleDateString('en-CA')
  let horario = '10:00:00'
  let data = hoje
  let escritas = 0
  let status = 'confirmado'
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const json = (body: unknown, code = 200) => route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/usuarios_clinicas')) return json({ papel })
    if (url.pathname.endsWith('/profissionais_clinicas')) return json([{ profissionais: { id: 'prof-a', nome_completo: 'Profissional Sintético', duracao_consulta_minutos: 30, valor_consulta: 200 } }])
    if (url.pathname.endsWith('/disponibilidade_padrao')) return json(semExpediente ? [] : [{ profissional_id: 'prof-a', hora_inicio: '08:00:00', hora_fim: '18:00:00', dia_semana: new Date().getDay() }])
    if (url.pathname.endsWith('/rpc/agenda_correcao_disponivel')) return recurso ? json(true) : json({ code: 'PGRST202' }, 404)
    if (url.pathname.endsWith('/rpc/agenda_corrigir_horario')) {
      escritas++
      const p = route.request().postDataJSON()
      expect(p).toMatchObject({ p_clinica_id: 'clinica-a', p_agendamento_id: 'ag-a', p_status: status, p_data_anterior: hoje, p_inicio_anterior: '10:00:00' })
      expect(p.p_revisao).toBe('2026-10-01T10:00:00Z')
      expect(p.p_motivo).toBe('Correção sintética de horário')
      if (erro) return json({ code: erro }, 400)
      await new Promise(resolve => setTimeout(resolve, 300))
      horario = `${p.p_novo_inicio}:00`; data = p.p_nova_data
      return json({ id: 'ag-a', data, hora_inicio: horario, status })
    }
    if (url.pathname.endsWith('/agendamentos')) return json(url.searchParams.get('data') === `eq.${data}` ? [{ id: 'ag-a', profissional_id: 'prof-a', paciente_id: 'pac-a', data, updated_at: '2026-10-01T10:00:00Z', hora_inicio: horario, hora_fim: horario === '10:00:00' ? '10:30:00' : '11:30:00', status, pacientes: { nome_completo: 'Paciente Sintético Edição' } }] : [])
    return json([])
  })
  return { escritas: () => escritas, horario: () => horario, mudarStatus: (valor: string) => { status = valor } }
}
async function abrir(page: Page) {
  await page.goto('/tests/operacional/agenda-contexto.html')
  await page.getByRole('region', { name: 'Agendamentos do dia' }).getByRole('button', { name: 'Editar agendamento' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}
async function preencher(page: Page) {
  await page.getByLabel('Novo horário', { exact: true }).fill('11:00')
  await page.getByLabel('Motivo da correção').fill('Correção sintética de horário')
  await expect(page.getByText('Verificando disponibilidade...', { exact: true })).toHaveCount(0)
  await page.getByRole('checkbox', { name: /Conferi o horário/ }).check()
}
test('após chegada permite somente horário na mesma data e preserva Aguardando', async ({ page }) => {
  const estado = await preparar(page)
  estado.mudarStatus('aguardando')
  await abrir(page)
  await expect(page.getByLabel('Nova data', { exact: true })).toBeDisabled()
  await expect(page.getByText('Chegada preservada', { exact: true })).toBeVisible()
  await expect(page.getByText(/Para mudar a data, é necessário o fluxo específico/)).toBeVisible()
  await preencher(page)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento atualizado' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' })).toContainText('Aguardando')
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' })).toContainText('11:00')
  expect(estado.escritas()).toBe(1)
})
for (const papel of ['recepcao', 'proprietaria']) test(`edição ${papel} preserva vínculos e confirma após fechamento e recarga simulada`, async ({ page }) => {
  const estado = await preparar(page, papel)
  await abrir(page); await preencher(page)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento atualizado' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(estado.escritas()).toBe(1)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' })).toContainText('11:00')
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' })).toContainText('Confirmado')
})
for (const codigo of ['23P01', '40001', '42501', 'P0001', 'XX000']) test(`recusa ${codigo} preserva formulário e horário anterior`, async ({ page }) => {
  const estado = await preparar(page, 'recepcao', codigo)
  await abrir(page); await preencher(page)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Novo horário', { exact: true })).toHaveValue('11:00')
  expect(estado.horario()).toBe('10:00:00')
  expect(estado.escritas()).toBe(1)
  await expect(page.getByText('Agendamento atualizado', { exact: true })).toHaveCount(0)
})
test('agendamento sem expediente permanece acessível; não permite salvar fora da disponibilidade', async ({ page }) => {
  const estado = await preparar(page, 'recepcao', undefined, true)
  await abrir(page)
  await expect(page.getByText(/Expediente ausente ou incompatível/)).toBeVisible()
  await preencher(page)
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  expect(estado.escritas()).toBe(0)
})
test('migration ausente bloqueia salvar, sem fallback para UPDATE direto', async ({ page }) => {
  const estado = await preparar(page, 'recepcao', undefined, false, false)
  await abrir(page); await preencher(page)
  await expect(page.getByText('Correção ainda indisponível', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  expect(estado.escritas()).toBe(0)
})
test('troca de clínica descarta a edição aberta', async ({ page }) => {
  const estado = await preparar(page)
  await abrir(page)
  // Mudança externa enquanto o diálogo está aberto; somente harness sintético.
  await page.evaluate(() => {
    const botao = [...document.querySelectorAll('button')].find(b => b.textContent === 'Trocar para Clínica B')
    botao?.click()
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(estado.escritas()).toBe(0)
})
test('mudança de data oferece navegação para o novo dia sem criar outro registro', async ({ page }) => {
  const estado = await preparar(page)
  await abrir(page)
  const nova = new Date(); nova.setDate(nova.getDate() + 7)
  await page.getByLabel('Nova data', { exact: true }).fill(nova.toLocaleDateString('en-CA'))
  await preencher(page)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await page.getByRole('button', { name: 'Ver na nova data' }).click()
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' })).toContainText('11:00')
  expect(estado.escritas()).toBe(1)
})
test('concluído não oferece edição habilitada', async ({ page }) => {
  const estado = await preparar(page)
  estado.mudarStatus('concluido')
  await page.goto('/tests/operacional/agenda-contexto.html')
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' }).getByRole('button', { name: 'Editar agendamento' })).toBeDisabled()
})
test('conflito local impede envio e distingue outro agendamento do próprio', async ({ page }) => {
  const estado = await preparar(page)
  await page.route('**/rest/v1/agendamentos?**', async route => {
    const url = new URL(route.request().url())
    if (!url.searchParams.has('profissional_id')) return route.fallback()
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: 'ag-a', hora_inicio: '10:00:00', hora_fim: '10:30:00', status: 'confirmado' },
      { id: 'outro-sintetico', hora_inicio: '11:00:00', hora_fim: '11:30:00', status: 'agendado' },
    ]) })
  })
  await abrir(page); await preencher(page)
  await expect(page.getByText('Há outro agendamento nesse horário. Escolha um horário disponível.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  expect(estado.escritas()).toBe(0)
})

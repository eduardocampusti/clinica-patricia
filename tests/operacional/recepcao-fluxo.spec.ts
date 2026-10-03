
// Painel de criação: cartões de profissional (rádios nativos) ou select acima de seis.
const radioProfissional = (escopo: Page | Locator, id: string) => escopo.locator(`input[name="novo-agendamento-profissional"][value="${id}"]`)
const pacienteEscolhido = (escopo: Page | Locator) => escopo.getByRole('group', { name: 'Paciente selecionado' })
import { expect, test, type Locator, type Page } from '@playwright/test'
import { relogioAgendaAntesDoExpediente } from './agenda-test-utils'
relogioAgendaAntesDoExpediente()

test.beforeEach(() => { test.setTimeout(90_000) })

// Somente harness isolado. Estado em memória no interceptador não prova persistência real.
async function preparar(page: Page, unidade: string, falhaChegada = false, semRetorno = false, aguardar?: Promise<void>) {
  const clinica = unidade === 'brotas' ? 'clinica-a' : 'clinica-b'
  const pacienteId = `paciente-recepcao-${unidade}`
  const profissionalId = `prof-recepcao-${unidade}`
  let paciente: Record<string, unknown> | null = null
  let agenda: Record<string, unknown> | null = null
  let escritasChegada = 0
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    const metodo = route.request().method()
    if (metodo === 'GET' && url.searchParams.has('clinica_id') && url.searchParams.get('clinica_id') !== `eq.${clinica}` && !url.pathname.endsWith('/usuarios_clinicas')) return json([])
    if (url.pathname.endsWith('/usuarios_clinicas')) return json({ papel: 'recepcao' })
    if (url.pathname.endsWith('/rpc/agenda_manual_disponivel')) return json(true)
    if (url.pathname.endsWith('/profissionais_clinicas')) return json([{ profissionais: { id: profissionalId, nome_completo: 'Profissional Sintético', duracao_consulta_minutos: 30, valor_consulta: 200, especialidades: { nome: 'Clínica geral' } } }])
    if (url.pathname.endsWith('/pacientes')) {
      if (metodo === 'POST') {
        const payload = route.request().postDataJSON()
        paciente = { ...(Array.isArray(payload) ? payload[0] : payload), id: pacienteId }
        expect(paciente?.clinica_id).toBe(clinica)
        expect(paciente?.cpf_encrypted).toBeNull()
        return json(paciente, 201)
      }
      return json(paciente ? [paciente] : [])
    }
    if (url.pathname.endsWith('/disponibilidade_padrao')) return json([{ id: 'disp-sintetica', profissional_id: profissionalId, dia_semana: new Date().getDay(), hora_inicio: '08:00:00', hora_fim: '18:00:00' }])
    if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) {
      expect(route.request().postDataJSON().p_clinica_id).toBe(clinica)
      return json(true)
    }
    if (url.pathname.endsWith('/rpc/agenda_manual_criar')) {
        const payload = route.request().postDataJSON()
        expect(payload).toMatchObject({ p_clinica_id: clinica, p_paciente_id: pacienteId, p_profissional_id: profissionalId, p_inicio: '10:00' })
        agenda = { clinica_id: clinica, paciente_id: pacienteId, profissional_id: profissionalId, data: payload.p_data, hora_inicio: '10:00:00', status: 'agendado', id: 'agenda-recepcao', hora_fim: '10:30:00', pacientes: { nome_completo: paciente?.nome_completo } }
        return json(agenda)
    }
    if (url.pathname.endsWith('/agendamentos')) {
      if (metodo === 'PATCH') {
        escritasChegada++
        expect(url.searchParams.get('id')).toBe('eq.agenda-recepcao')
        expect(url.searchParams.get('clinica_id')).toBe(`eq.${clinica}`)
        expect(route.request().postDataJSON()).toEqual({ status: 'aguardando' })
        if (aguardar) await aguardar
        if (falhaChegada) return json({ code: '42501', message: 'Recusa sintética' }, 403)
        if (semRetorno) return json([])
        await new Promise(resolve => setTimeout(resolve, 150))
        agenda = { ...agenda, status: 'aguardando' }
        return json([{ id: 'agenda-recepcao', status: 'aguardando' }])
      }
      expect(url.searchParams.get('clinica_id')).toBe(`eq.${clinica}`)
      return json(agenda ? [agenda] : [])
    }
    return json([])
  })
  return { clinica, pacienteId, profissionalId, escritas: () => escritasChegada, status: () => agenda?.status }
}

test('chegada em andamento impede repetição de envio', async ({ page }) => {
  let liberar!: () => void
  const pendente = new Promise<void>(resolve => { liberar = resolve })
  const estado = await preparar(page, 'brotas', false, false, pendente)
  await cadastrarEAgendar(page, 'brotas', estado.profissionalId)
  const cartao = page.getByRole('button', { name: /^10:00 Paciente Recepção Sintética/ })
  await cartao.click()
  await page.getByRole('dialog', { name: 'Consultar agendamento' }).getByRole('button', { name: 'Registrar chegada', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Atualizando situação' })).toBeVisible()
  // A consulta fecha durante a atualização; reabri-la não permite outro envio.
  await cartao.click()
  await expect(page.getByRole('dialog', { name: 'Consultar agendamento' }).getByRole('button', { name: 'Registrar chegada', exact: true })).toBeDisabled()
  expect(estado.escritas()).toBe(1)
  await page.getByRole('dialog', { name: 'Consultar agendamento' }).getByRole('button', { name: 'Registrar chegada', exact: true }).evaluate((b: HTMLButtonElement) => b.click())
  expect(estado.escritas()).toBe(1)
  liberar()
  await expect.poll(estado.status).toBe('aguardando')
  expect(estado.escritas()).toBe(1)
})

test('resposta atrasada da chegada não mostra sucesso na outra clínica', async ({ page }) => {
  let liberar!: () => void
  const pendente = new Promise<void>(resolve => { liberar = resolve })
  const estado = await preparar(page, 'brotas', false, false, pendente)
  await cadastrarEAgendar(page, 'brotas', estado.profissionalId)
  await page.getByRole('button', { name: /^10:00 Paciente Recepção Sintética/ }).click()
  await page.getByRole('dialog', { name: 'Consultar agendamento' }).getByRole('button', { name: 'Registrar chegada', exact: true }).click()
  await expect.poll(estado.escritas).toBe(1)
  await page.getByRole('button', { name: 'Trocar para Clínica B' }).evaluate((b: HTMLButtonElement) => b.click())
  await expect(page.getByText('Clínica B', { exact: true })).toBeVisible()
  const resposta = page.waitForResponse(response => response.request().method() === 'PATCH')
  liberar()
  await resposta
  await expect(page.getByText('Chegada registrada', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Lembrete de CPF na chegada')).toHaveCount(0)
})

async function cadastrarEAgendar(page: Page, unidade: string, profissionalId: string) {
  await page.goto(`/tests/operacional/agenda-contexto.html?unidade=${unidade}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  await radioProfissional(page.getByRole('dialog'), profissionalId).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Outro horário', exact: true }).click()
  await page.getByLabel(/^Início/).fill('10:00')
  await page.getByRole('button', { name: '+ Novo paciente' }).click()
  await page.getByLabel('Nome completo').fill('Paciente Recepção Sintética')
  await page.getByLabel('Data de nascimento', { exact: true }).fill('1990-05-18')
  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
  await page.getByRole('button', { name: 'Salvar paciente' }).click()
  await expect(pacienteEscolhido(page)).toContainText('Paciente Recepção Sintética')
  await expect(page.getByLabel('CPF pendente de Paciente Recepção Sintética')).toBeVisible()
  await page.getByRole('button', { name: 'Informar depois' }).click()
  await page.getByRole('button', { name: 'Agendar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Novo agendamento' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^10:00 Paciente Recepção Sintética/ })).toBeVisible()
}

for (const unidade of ['brotas', 'ipupiara']) {
  test(`recepção sintética ${unidade}: cadastro sem CPF → agenda → chegada → aguardando`, async ({ page }, info) => {
    const estado = await preparar(page, unidade)
    await cadastrarEAgendar(page, unidade, estado.profissionalId)
    await page.getByRole('button', { name: /^10:00 Paciente Recepção Sintética/ }).click()
    await expect(page.getByRole('button', { name: 'Iniciar atendimento' })).toHaveCount(0)
    await page.getByRole('dialog', { name: 'Consultar agendamento' }).getByRole('button', { name: 'Registrar chegada', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Chegada registrada' })).toBeVisible()
    await expect(page.getByLabel('Lembrete de CPF na chegada')).toBeVisible()
    expect(estado.status()).toBe('aguardando')
    expect(estado.escritas()).toBe(1)
    await page.getByRole('button', { name: 'Informar depois' }).click()
    await page.reload()
    const cartao = page.getByRole('button', { name: /^10:00 Paciente Recepção Sintética/ })
    await expect(cartao).toContainText('Aguardando')
    await page.screenshot({ path: `scratch/recepcao-${unidade}-${info.project.name}.png`, fullPage: true })
  })
}

for (const semRetorno of [false, true]) {
  test(`chegada sem confirmação (${semRetorno ? 'zero registros' : 'erro de serviço'}) mostra erro e permite tentar novamente`, async ({ page }) => {
    const estado = await preparar(page, 'brotas', !semRetorno, semRetorno)
    await cadastrarEAgendar(page, 'brotas', estado.profissionalId)
    await page.getByRole('button', { name: /^10:00 Paciente Recepção Sintética/ }).click()
    await page.getByRole('dialog', { name: 'Consultar agendamento' }).getByRole('button', { name: 'Registrar chegada', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Não foi possível atualizar a situação')
    await expect(page.getByText('Chegada registrada', { exact: true })).toHaveCount(0)
    expect(estado.status()).toBe('agendado')
    await page.getByRole('button', { name: /^10:00 Paciente Recepção Sintética/ }).click()
    await page.getByRole('dialog', { name: 'Consultar agendamento' }).getByRole('button', { name: 'Registrar chegada', exact: true }).click()
    await expect.poll(estado.escritas).toBe(2)
  })
}

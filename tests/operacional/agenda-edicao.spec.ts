import { expect, test, type Locator, type Page } from '@playwright/test'
import { avaliarAgendaManual, diaSemanaAgenda, janelasAgenda, validarHorarioAgenda, sugestoesHorarioAgenda } from '../../src/lib/agendaDisponibilidade'

// Painel de criação: cartões de profissional (rádios nativos) ou select acima de seis.
const radioProfissional = (escopo: Page | Locator, id: string) => escopo.locator(`input[name="novo-agendamento-profissional"][value="${id}"]`)

test.beforeEach(() => test.setTimeout(90_000))
async function preparar(page: Page, papel = 'recepcao', erro?: string, semExpediente = false, recurso = true) {
  // O dia inicial da Agenda é o dia civil do navegador, inclusive nos ensaios de fuso.
  const hoje = await page.evaluate(() => new Date().toLocaleDateString('en-CA'))
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
    if (url.pathname.endsWith('/rpc/agenda_manual_disponivel')) return recurso ? json(true) : json({ code: 'PGRST202' }, 404)
    if (url.pathname.endsWith('/rpc/agenda_manual_corrigir_horario')) {
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
  // Computador abre no modo Dia; estes cenários usam as ações da lista.
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await page.getByRole('region', { name: 'Agendamentos do dia' }).getByRole('button', { name: 'Editar agendamento' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}
async function preencher(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Outro horário', exact: true }).click()
  await page.getByLabel('Novo horário', { exact: true }).fill('11:00')
  await page.getByRole('button', { name: 'Outro', exact: true }).click()
  await page.getByLabel('Motivo da correção').fill('Correção sintética de horário')
  await expect(page.getByText('Verificando disponibilidade...', { exact: true })).toHaveCount(0)
  await page.getByRole('checkbox', { name: /Conferi o horário/ }).check()
}

test('política manual: criação e edição sem expediente exigem confirmação e usam RPC', async ({ page }) => {
  const estado = await preparar(page, 'recepcao', undefined, true)
  let criacoes = 0
  await page.route('**/rest/v1/pacientes?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'pac-a', nome_completo: 'Paciente Sintético Política' }]) }))
  await page.route('**/rest/v1/rpc/agenda_manual_criar', async route => {
    criacoes++
    const p = route.request().postDataJSON()
    expect(p).toMatchObject({ p_clinica_id: 'clinica-a', p_paciente_id: 'pac-a', p_profissional_id: 'prof-a', p_inicio: '11:00', p_confirmacao_manual: true })
    // Duração/fim não podem ser definidos pelo cliente; dependem do servidor.
    expect(route.request().postDataJSON()).not.toHaveProperty('hora_fim')
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'novo-sintetico', clinica_id: p.p_clinica_id, paciente_id: p.p_paciente_id, profissional_id: p.p_profissional_id, data: p.p_data, hora_inicio: p.p_inicio + ':00' }) })
  })
  await abrir(page)
  await preencher(page)
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeEnabled()
  expect(estado.escritas()).toBe(0)
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar alterações', exact: true }).click()
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  await page.getByRole('combobox', { name: 'Paciente', exact: true }).click()
  await page.getByRole('listbox', { name: 'Pacientes encontrados' }).getByRole('option').first().click()
  await radioProfissional(page.getByRole('dialog'), 'prof-a').check()
  await page.getByRole('dialog').getByRole('button', { name: 'Outro horário', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Início', { exact: false }).fill('11:00')
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Agendar', exact: true })).toBeDisabled()
  await page.getByRole('dialog').getByRole('checkbox', { name: /confirmo a marcação manual/ }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Agendar', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(criacoes).toBe(1)
})

test('diagnóstico de política: médico não recebe ações de criação nem edição', async ({ page }) => {
  const estado = await preparar(page, 'medico', undefined, true)
  await page.goto('/tests/operacional/agenda-contexto.html')
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' })).toBeVisible()
  // Computador abre no modo Dia; estes cenários usam as ações da lista.
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar agendamento' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '+ Novo agendamento', exact: true })).toHaveCount(0)
  expect(estado.escritas()).toBe(0)
})

test('transição: serviço incompatível mantém rascunho e não usa gravação direta', async ({ page }) => {
  const estado = await preparar(page, 'recepcao', 'PGRST202')
  let diretas = 0
  await page.route('**/rest/v1/agendamentos?**', route => {
    if (route.request().method() !== 'GET') { diretas++; return route.abort() }
    return route.fallback()
  })
  await abrir(page)
  await preencher(page)
  await page.getByRole('button', { name: 'Confirmar remarcação' }).click()
  await expect(page.getByRole('alert')).toContainText('atualize a página')
  await expect(page.getByLabel('Motivo da correção')).toHaveValue('Correção sintética de horário')
  await expect(page.getByLabel('Novo horário', { exact: true })).toHaveValue('11:00')
  expect(estado.escritas()).toBe(1)
  expect(diretas).toBe(0)
})

test('transição: falha parcial de publicação não exige encerramento do legado', async ({ page }) => {
  const estado = await preparar(page, 'recepcao', undefined, false, false)
  await abrir(page)
  await expect(page.getByRole('dialog')).toContainText('versão incompatível')
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  expect(estado.escritas()).toBe(0)
})
test('após chegada permite somente horário na mesma data e preserva Aguardando', async ({ page }) => {
  const estado = await preparar(page)
  estado.mudarStatus('aguardando')
  await abrir(page)
  await expect(page.getByLabel('Nova data', { exact: true })).toBeDisabled()
  await expect(page.getByText('Chegada preservada', { exact: true })).toBeVisible()
  await expect(page.getByText(/outra data exige o reagendamento específico/)).toBeVisible()
  await preencher(page)
  await page.getByRole('button', { name: 'Confirmar remarcação' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento atualizado' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' })).toContainText('Aguardando')
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' })).toContainText('11:00')
  expect(estado.escritas()).toBe(1)
})
for (const papel of ['recepcao', 'proprietaria']) test(`edição ${papel} preserva vínculos e confirma após fechamento e recarga simulada`, async ({ page }) => {
  const estado = await preparar(page, papel)
  await abrir(page); await preencher(page)
  await page.getByRole('button', { name: 'Confirmar remarcação' }).click()
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
  await page.getByRole('button', { name: 'Confirmar remarcação' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Novo horário', { exact: true })).toHaveValue('11:00')
  expect(estado.horario()).toBe('10:00:00')
  expect(estado.escritas()).toBe(1)
  await expect(page.getByText('Agendamento atualizado', { exact: true })).toHaveCount(0)
})
test('agendamento sem expediente permanece acessível; confirmação libera correção manual', async ({ page }) => {
  const estado = await preparar(page, 'recepcao', undefined, true)
  await abrir(page)
  await expect(page.getByRole('dialog')).toContainText('Faixas habituais na data')
  await preencher(page)
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeEnabled()
  await expect(page.getByRole('status').filter({ hasText: 'Marcação manual' })).toBeVisible()
  expect(estado.escritas()).toBe(0)
})
test('migration ausente bloqueia salvar, sem fallback para UPDATE direto', async ({ page }) => {
  const estado = await preparar(page, 'recepcao', undefined, false, false)
  await abrir(page); await preencher(page)
  await expect(page.getByText('Correção ainda indisponível', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
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
  await page.getByRole('button', { name: 'Confirmar remarcação' }).click()
  await page.getByRole('button', { name: 'Ver na nova data' }).click()
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' })).toContainText('11:00')
  expect(estado.escritas()).toBe(1)
})
test('concluído não oferece edição habilitada', async ({ page }) => {
  const estado = await preparar(page)
  estado.mudarStatus('concluido')
  await page.goto('/tests/operacional/agenda-contexto.html')
  // Computador abre no modo Dia; estes cenários usam as ações da lista.
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Agendamentos do dia' }).getByRole('button', { name: 'Editar agendamento' })).toHaveCount(0)
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
  await expect(page.getByRole('status').filter({ hasText: 'Revise o horário' })).toContainText('Há outro agendamento nesse horário. Escolha um horário disponível.')
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  expect(estado.escritas()).toBe(0)
})

test('data civil coincide com DOW do servidor e faixas respeitam fim, intervalo e exceção', () => {
  expect(diaSemanaAgenda('2026-10-01')).toBe(4)
  const janelas = [{ hora_inicio: '08:00:00', hora_fim: '12:00:00' }, { hora_inicio: '14:00:00', hora_fim: '17:00:00' }]
  expect(validarHorarioAgenda('16:30', 30, janelas, [], 'proprio')).toBeNull()
  expect(validarHorarioAgenda('16:40', 30, janelas, [], 'proprio')).toContain('fora da disponibilidade')
  expect(validarHorarioAgenda('11:40', 30, janelas, [], 'proprio')).toContain('fora da disponibilidade')
  expect(validarHorarioAgenda('12:00', 30, janelas, [], 'proprio')).toContain('fora da disponibilidade')
  expect(janelasAgenda(janelas, [{ tipo: 'folga', hora_inicio: null, hora_fim: null }])).toEqual([])
  const especial = [{ tipo: 'horario_especial', hora_inicio: '16:00:00', hora_fim: '18:00:00' }]
  expect(validarHorarioAgenda('16:40', 30, janelasAgenda(janelas, especial), [], 'proprio')).toBeNull()
  expect(() => janelasAgenda(janelas, [{ tipo: 'horario_especial', hora_inicio: null, hora_fim: null }])).toThrow()
  expect(sugestoesHorarioAgenda(30, janelas, [{ id: 'outro', hora_inicio: '16:30:00', hora_fim: '17:00:00', status: 'confirmado' }], 'proprio')).not.toContain('16:30')
})

test('confirmação é a única pendência quando horário e motivo são válidos', async ({ page }) => {
  await preparar(page); await abrir(page)
  await page.getByRole('dialog').getByRole('group', { name: 'Horários disponíveis' }).getByRole('button', { name: '11:00', exact: true }).click()
  await page.getByRole('button', { name: 'Outro', exact: true }).click()
  await page.getByLabel('Motivo da correção').fill('Correção sintética de horário')
  await expect(page.getByText('Só falta confirmar a correção para salvar.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  await page.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeEnabled()
  await page.getByRole('dialog').getByRole('button', { name: 'Outro horário', exact: true }).click()
  await page.getByLabel('Novo horário', { exact: true }).fill('11:05')
  await expect(page.getByRole('checkbox', { name: /Conferi o horário/ })).not.toBeChecked()
})

test('fim exato permitido; ultrapassar faixa habitual exige confirmação manual', async ({ page }) => {
  await preparar(page)
  await page.route('**/rest/v1/disponibilidade_padrao?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ profissional_id: 'prof-a', hora_inicio: '14:00:00', hora_fim: '17:00:00' }]) }))
  await abrir(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Outro horário', exact: true }).click()
  await page.getByLabel('Novo horário', { exact: true }).fill('16:30')
  await page.getByRole('button', { name: 'Outro', exact: true }).click()
  await page.getByLabel('Motivo da correção').fill('Correção sintética de horário')
  await expect(page.getByRole('region', { name: 'Disponibilidade para a data' })).toContainText('14:00–17:00')
  await page.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeEnabled()
  await page.getByLabel('Novo horário', { exact: true }).fill('16:40')
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  await expect(page.getByRole('status').filter({ hasText: 'Marcação manual' })).toContainText('fora da faixa habitual')
  await page.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeEnabled()
})

test('política comum: ausência, faixa habitual, folga, bloqueio, horário especial e duração completa', () => {
  const habitual = [{ hora_inicio: '08:00', hora_fim: '12:00' }, { hora_inicio: '14:00', hora_fim: '17:00' }]
  expect(avaliarAgendaManual('11:00', 30, [], [], []).aviso).toContain('Sem expediente')
  expect(avaliarAgendaManual('11:00', 30, [], [], []).bloqueio).toBeNull()
  expect(avaliarAgendaManual('16:30', 30, habitual, [], []).aviso).toBeNull()
  expect(avaliarAgendaManual('16:40', 30, habitual, [], []).aviso).toContain('fora da faixa habitual')
  expect(avaliarAgendaManual('11:40', 30, habitual, [], []).aviso).toContain('fora da faixa habitual')
  for (const tipo of ['folga', 'bloqueio']) expect(avaliarAgendaManual('11:00', 30, habitual, [{ tipo, hora_inicio: null, hora_fim: null }], []).bloqueio).toContain('bloqueio explícito')
  expect(avaliarAgendaManual('16:40', 30, habitual, [{ tipo: 'horario_especial', hora_inicio: '14:00', hora_fim: '17:00' }], []).bloqueio).toContain('horário especial')
  const ocupado = [{ id: 'outro', hora_inicio: '11:20', hora_fim: '11:50', status: 'agendado' }]
  expect(avaliarAgendaManual('11:00', 30, [], [], ocupado).bloqueio).toContain('outro agendamento')
  expect(avaliarAgendaManual('11:00', 30, [], [], ocupado, 'outro').bloqueio).toBeNull()
  expect(avaliarAgendaManual('23:40', 30, [], [], []).bloqueio).toContain('ultrapassar o dia')
})

test('folga explícita bloqueia edição mesmo com confirmação', async ({ page }) => {
  const estado = await preparar(page)
  await page.route('**/rest/v1/agenda_excecoes?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ tipo: 'folga', hora_inicio: null, hora_fim: null }]) }))
  await abrir(page); await preencher(page)
  await expect(page.getByRole('status').filter({ hasText: 'Revise o horário' })).toContainText('folga ou bloqueio explícito')
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  expect(estado.escritas()).toBe(0)
})

test('criação manual: erro preserva dados; envio repetido não duplica e sucesso sobrevive ao modal', async ({ page }) => {
  await preparar(page, 'recepcao', undefined, true)
  let chamadas = 0, falha = true
  let liberar!: () => void
  const pendente = new Promise<void>(resolve => { liberar = resolve })
  await page.route('**/rest/v1/pacientes?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'pac-a', nome_completo: 'Paciente Sintético Manual' }]) }))
  await page.route('**/rest/v1/rpc/agenda_manual_criar', async route => {
    chamadas++
    if (falha) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: '23P01' }) })
    await pendente
    const p = route.request().postDataJSON()
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'ag-manual-sintetico', clinica_id: p.p_clinica_id, paciente_id: p.p_paciente_id, profissional_id: p.p_profissional_id, data: p.p_data, hora_inicio: p.p_inicio + ':00' }) })
  })
  await page.goto('/tests/operacional/agenda-contexto.html')
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  await page.getByRole('combobox', { name: 'Paciente', exact: true }).click()
  await page.getByRole('listbox', { name: 'Pacientes encontrados' }).getByRole('option').first().click()
  await radioProfissional(page.getByRole('dialog'), 'prof-a').check()
  await page.getByRole('dialog').getByRole('button', { name: 'Outro horário', exact: true }).click()
  await page.getByLabel('Início', { exact: false }).fill('11:00')
  await page.getByLabel('Observações').fill('Rascunho sintético preservado')
  await page.getByRole('checkbox', { name: /confirmo a marcação manual/ }).check()
  await page.getByRole('button', { name: 'Agendar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('já tem um agendamento')
  await expect(page.getByLabel('Observações')).toHaveValue('Rascunho sintético preservado')
  await expect(page.getByText('Agendamento criado', { exact: true })).toHaveCount(0)
  falha = false
  await page.getByRole('dialog').locator('form').evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit() })
  await expect(page.getByRole('button', { name: 'Salvando...', exact: true })).toBeDisabled()
  expect(chamadas).toBe(2)
  liberar()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento criado' })).toBeVisible()
  expect(chamadas).toBe(2)
})

for (const caso of ['folga', 'falha', 'conflito']) test(`criação manual bloqueia ${caso}, sem interpretar erro como expediente ausente`, async ({ page }) => {
  await preparar(page, 'recepcao', undefined, true)
  await page.route('**/rest/v1/pacientes?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'pac-a', nome_completo: 'Paciente Sintético Manual' }]) }))
  if (caso === 'folga') await page.route('**/rest/v1/agenda_excecoes?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ tipo: 'folga', hora_inicio: null, hora_fim: null }]) }))
  if (caso === 'falha') await page.route('**/rest/v1/agenda_excecoes?**', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501' }) }))
  await page.goto('/tests/operacional/agenda-contexto.html')
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  await page.getByRole('combobox', { name: 'Paciente', exact: true }).click()
  await page.getByRole('listbox', { name: 'Pacientes encontrados' }).getByRole('option').first().click()
  await radioProfissional(page.getByRole('dialog'), 'prof-a').check()
  await page.getByRole('dialog').getByRole('button', { name: 'Outro horário', exact: true }).click()
  await page.getByLabel('Início', { exact: false }).fill(caso === 'conflito' ? '10:10' : '11:00')
  await expect(page.getByRole('dialog')).toContainText(caso === 'folga' ? 'folga ou bloqueio explícito' : caso === 'falha' ? 'Falha ao consultar disponibilidade' : 'Há outro agendamento')
  await expect(page.getByRole('button', { name: 'Agendar', exact: true })).toBeDisabled()
})

test('falha de consulta não vira sem expediente e nova tentativa preserva rascunho', async ({ page }) => {
  await preparar(page)
  let falhar = true
  await page.route('**/rest/v1/agenda_excecoes?**', route => {
    if (new URL(route.request().url()).searchParams.get('select') !== 'tipo,hora_inicio,hora_fim') return route.fallback()
    return route.fulfill({ status: falhar ? 503 : 200, contentType: 'application/json', body: JSON.stringify(falhar ? { message: 'Falha sintética' } : []) })
  })
  await abrir(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Outro horário', exact: true }).click()
  await page.getByLabel('Novo horário', { exact: true }).fill('11:00')
  await page.getByRole('button', { name: 'Outro', exact: true }).click()
  await page.getByLabel('Motivo da correção').fill('Correção sintética de horário')
  // O SDK instalado repete GET 503; aguardar seu retorno definitivo, sem mexer no servidor.
  await expect(page.getByRole('alert')).toContainText('Falha ao consultar disponibilidade', { timeout: 20_000 })
  await expect(page.getByRole('region', { name: 'Disponibilidade para a data' })).not.toContainText('Sem expediente disponível')
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  falhar = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Disponibilidade para a data' })).toBeVisible()
  await expect(page.getByLabel('Novo horário', { exact: true })).toHaveValue('11:00')
  await expect(page.getByLabel('Motivo da correção')).toHaveValue('Correção sintética de horário')
})

test('carregamento e respostas antigas de outra data não liberam envio', async ({ page }) => {
  await preparar(page)
  await page.route('**/rest/v1/disponibilidade_padrao?**', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const dia = new URL(route.request().url()).searchParams.get('dia_semana')
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(dia === 'eq.4' ? [{ profissional_id: 'prof-a', hora_inicio: '08:00:00', hora_fim: '17:00:00' }] : []) })
  })
  await abrir(page)
  await page.getByLabel('Nova data', { exact: true }).fill('2026-10-01')
  await page.getByLabel('Nova data', { exact: true }).fill('2026-10-02')
  await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeDisabled()
  await expect(page.getByRole('region', { name: 'Disponibilidade para a data' })).toContainText('Sem expediente disponível')
  // Sem select: nenhum bloco escolhível e estado vazio explícito.
  await expect(page.getByRole('dialog').getByRole('group', { name: 'Horários disponíveis' }).getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('dialog').getByRole('group', { name: 'Horários disponíveis' })).toContainText('Sem expediente cadastrado nesta data')
})

for (const timezoneId of ['America/Bahia', 'America/Los_Angeles', 'Pacific/Auckland']) test.describe(`data civil no navegador ${timezoneId}`, () => {
  test.use({ timezoneId })
  test('consulta quinta-feira sem deslocar a data e horário especial prevalece', async ({ page }) => {
    await preparar(page)
    let diaConsultado = ''
    await page.route('**/rest/v1/disponibilidade_padrao?**', route => {
      diaConsultado = new URL(route.request().url()).searchParams.get('dia_semana') ?? ''
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ profissional_id: 'prof-a', hora_inicio: '08:00:00', hora_fim: '12:00:00' }]) })
    })
    await page.route('**/rest/v1/agenda_excecoes?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ tipo: 'horario_especial', hora_inicio: '14:00:00', hora_fim: '17:10:00' }]) }))
    await abrir(page)
    await page.getByLabel('Nova data', { exact: true }).fill('2026-10-01')
    await page.getByRole('dialog').getByRole('button', { name: 'Outro horário', exact: true }).click()
    await page.getByLabel('Novo horário', { exact: true }).fill('16:40')
    await page.getByRole('button', { name: 'Outro', exact: true }).click()
    await page.getByLabel('Motivo da correção').fill('Correção sintética de horário')
    await expect(page.getByRole('region', { name: 'Disponibilidade para a data' })).toContainText('14:00–17:10')
    await page.getByRole('checkbox', { name: /Conferi o horário/ }).check()
    await expect(page.getByRole('button', { name: 'Confirmar remarcação' })).toBeEnabled()
    expect(diaConsultado).toBe('eq.4')
    await expect(page.getByLabel('Nova data', { exact: true })).toHaveValue('2026-10-01')
  })
})

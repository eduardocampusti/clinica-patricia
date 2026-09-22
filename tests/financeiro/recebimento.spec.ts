import { test, expect, type Page } from '@playwright/test'

type Opcoes = { papel?: string; status?: string; erro?: string; preco?: string | null; rede?: boolean; pago?: boolean; demora?: number }
async function preparar(page: Page, opcoes: Opcoes = {}) {
  const chamadas: Array<Record<string, unknown>> = []
  let pago = opcoes.pago ?? false
  let leiturasAgenda = 0
  const resultado = {
    recebimento_id: 'recebimento-sintetico', agendamento_id: 'agendamento-sintetico', clinica_id: 'clinica-sintetica',
    paciente_id: 'paciente-sintetico', profissional_id: 'profissional-sintetico', sessao_caixa_id: 'caixa-sintetico',
    valor_bruto: '500.00', percentual_clinica: '24.69', valor_clinica: '123.45', valor_profissional: '376.55',
    status: 'confirmado', status_fiscal: 'pendente', registrado_em: '2026-09-22T12:00:00Z', nova_operacao: true,
    pagamentos: [{ forma_pagamento: 'pix', valor: '500.00' }],
  }
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    // Impede qualquer conexão externa, inclusive a um Supabase real.
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const tabela = url.pathname.split('/').pop()
    let data: unknown = []
    if (tabela === 'financeiro_registrar_recebimento') {
      chamadas.push(route.request().postDataJSON())
      if (opcoes.demora) await new Promise((resolve) => setTimeout(resolve, opcoes.demora))
      if (opcoes.rede && chamadas.length === 1) return route.abort('failed')
      if (opcoes.erro) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: '22023', message: opcoes.erro }) })
      pago = true
      data = { ...resultado, pagamentos: chamadas.at(-1)!.p_pagamentos }
    } else if (tabela === 'usuarios_clinicas') data = { papel: opcoes.papel ?? 'recepcao' }
    else if (tabela === 'profissionais_clinicas') {
      data = url.searchParams.get('select') === 'valor_consulta' ? { valor_consulta: opcoes.preco === undefined ? '500.00' : opcoes.preco }
        : [{ profissionais: { id: 'profissional-sintetico', nome_completo: 'Profissional Exemplo', duracao_consulta_minutos: 30, valor_consulta: 999, especialidades: { nome: 'Clínica geral' } } }]
    } else if (tabela === 'pacientes') data = [{ id: 'paciente-sintetico', nome_completo: 'Paciente Exemplo' }]
    else if (tabela === 'profissionais') data = { id: 'profissional-sintetico' }
    else if (tabela === 'disponibilidade_padrao') data = [{ id: 'horario', profissional_id: 'profissional-sintetico', dia_semana: new Date().getDay(), hora_inicio: '07:00', hora_fim: '19:00' }]
    else if (tabela === 'agendamentos') {
      leiturasAgenda++
      data = [{ id: 'agendamento-sintetico', profissional_id: 'profissional-sintetico', paciente_id: 'paciente-sintetico', hora_inicio: '08:00', hora_fim: '09:00', status: opcoes.status ?? 'confirmado', observacoes: null, pacientes: { nome_completo: 'Paciente Exemplo' } }]
    } else if (tabela === 'recebimentos') data = pago ? [{ agendamento_id: 'agendamento-sintetico' }] : []
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto('/tests/financeiro/index.html')
  await page.getByRole('button', { name: /08:00 Paciente Exemplo/ }).click()
  return { chamadas, leiturasAgenda: () => leiturasAgenda }
}
async function abrir(page: Page, opcoes: Opcoes = {}) {
  const controle = await preparar(page, opcoes)
  await page.getByRole('button', { name: 'Receber pagamento', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  return controle
}
async function revisar(page: Page, dinheiro = '', pix = '500,00') {
  if (dinheiro) await page.getByLabel('Dinheiro', { exact: true }).fill(dinheiro)
  if (pix) await page.getByLabel('PIX', { exact: true }).fill(pix)
  await page.getByRole('button', { name: 'Revisar recebimento' }).click()
}
async function screenshot(page: Page, nome: string, projeto: string) {
  const dialog = page.getByRole('dialog')
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy()
  await page.screenshot({ path: `scratch/financeiro-10b-screenshots/${projeto}-${nome}.png` })
}

test('Agenda → PIX → revisão → wrapper → sucesso e invalidação', async ({ page }, info) => {
  const controle = await abrir(page)
  await expect(page.getByText('R$ 500,00', { exact: true }).first()).toBeVisible()
  await screenshot(page, 'inicial', info.project.name)
  await revisar(page)
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible()
  await expect(page.getByText('R$ 123,45', { exact: true })).toBeVisible()
  await expect(page.getByText('R$ 376,55', { exact: true })).toBeVisible()
  await expect(page.getByText('Pendente', { exact: true })).toBeVisible()
  expect(controle.chamadas).toHaveLength(1)
  expect(controle.chamadas[0].p_pagamentos).toEqual([{ forma_pagamento: 'pix', valor: 500 }])
  expect(Object.keys(controle.chamadas[0]).sort()).toEqual(['p_agendamento_id', 'p_idempotency_key', 'p_pagamentos'])
  expect(controle.leiturasAgenda()).toBeGreaterThan(1)
  await screenshot(page, 'sucesso', info.project.name)
  await page.getByRole('button', { name: 'Voltar à Agenda' }).click()
  await expect(page.getByRole('button', { name: /Recebimento registrado/ })).toBeFocused()
})
test('split dinheiro 200 + PIX 300', async ({ page }, info) => {
  const { chamadas } = await abrir(page)
  await page.getByLabel('Dinheiro', { exact: true }).fill('200,00')
  await page.getByLabel('PIX', { exact: true }).fill('300,00')
  await screenshot(page, 'split', info.project.name)
  await page.getByRole('button', { name: 'Revisar recebimento' }).click()
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible()
  expect(chamadas[0].p_pagamentos).toEqual([{ forma_pagamento: 'dinheiro', valor: 200 }, { forma_pagamento: 'pix', valor: 300 }])
})
for (const [valor, label] of [['499,99', 'Restante'], ['500,01', 'Excedente']]) {
  test(`${valor} bloqueia revisão (${label})`, async ({ page }) => {
    const { chamadas } = await abrir(page)
    await page.getByLabel('PIX', { exact: true }).fill(valor)
    await expect(page.getByRole('button', { name: 'Revisar recebimento' })).toBeDisabled()
    await expect(page.getByText('R$ 0,01', { exact: true })).toBeVisible()
    expect(chamadas).toHaveLength(0)
  })
}
test('duplo clique, loading e Escape não fecha envio', async ({ page }) => {
  const { chamadas } = await abrir(page, { demora: 800 })
  await revisar(page)
  await page.getByRole('button', { name: 'Confirmar pagamento' }).evaluate((el: HTMLButtonElement) => { el.click(); el.click() })
  await expect(page.getByRole('button', { name: 'Processando pagamento…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Fechar', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible()
  expect(chamadas).toHaveLength(1)
})
test('retry de rede preserva chave e não produz sucesso antecipado', async ({ page }) => {
  const { chamadas } = await abrir(page, { rede: true })
  await revisar(page)
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible()
  expect(chamadas).toHaveLength(2)
  expect(chamadas[0]).toEqual(chamadas[1])
})
for (const [nome, erro, mensagem] of [
  ['caixa ausente', 'Nao existe caixa aberto para a clinica.', 'Não há um caixa financeiro aberto para esta clínica. Abra o caixa antes de receber pagamentos.'],
  ['caixa legado', 'Sessao de caixa legada nao pode receber operacoes do novo Financeiro.', 'Esta clínica possui um caixa antigo ainda em aberto. Ele precisa ser regularizado antes de usar o novo Financeiro.'],
  ['duplicado', 'Agendamento ja possui recebimento principal.', 'Este atendimento já possui um recebimento registrado.'],
  ['configuração', 'Configuracao financeira vigente nao encontrada para a clinica.', 'O preço ou a configuração financeira desta clínica está ausente. Solicite a configuração à proprietária.'],
]) {
  test(`erro ${nome} permanece aberto sem sucesso`, async ({ page }, info) => {
    await abrir(page, { erro })
    await revisar(page)
    await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
    await expect(page.getByRole('alert')).toHaveText(mensagem)
    await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toHaveCount(0)
    if (nome === 'caixa legado') await screenshot(page, 'erro', info.project.name)
  })
}
test('médico não recebe ação de cobrança', async ({ page }) => {
  await preparar(page, { papel: 'medico' })
  await expect(page.getByRole('button', { name: 'Receber pagamento' })).toHaveCount(0)
})
test('proprietária pode cobrar', async ({ page }) => {
  await abrir(page, { papel: 'proprietaria' })
  await expect(page.getByLabel('PIX', { exact: true })).toBeVisible()
})
test('preço ausente bloqueia e não utiliza preço global', async ({ page }) => {
  const { chamadas } = await abrir(page, { preco: null })
  await expect(page.getByRole('alert')).toContainText('preço da consulta não está configurado')
  await expect(page.getByRole('button', { name: 'Revisar recebimento' })).toHaveCount(0)
  expect(chamadas).toHaveLength(0)
})
test('recebimento existente é independente do status clínico', async ({ page }) => {
  await preparar(page, { pago: true })
  await expect(page.getByRole('button', { name: /Recebimento registrado/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Receber pagamento' })).toHaveCount(0)
})
test('consulta concluída não oferece operação rejeitada pelo contrato', async ({ page }) => {
  await preparar(page, { status: 'concluido' })
  await expect(page.getByRole('button', { name: 'Receber pagamento' })).toHaveCount(0)
})
test('foco contido e retorno ao agendamento', async ({ page }) => {
  await abrir(page)
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    expect(await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement))).toBeTruthy()
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /08:00 Paciente Exemplo/ })).toBeFocused()
})

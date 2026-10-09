import { expect, test, type Page } from '@playwright/test'
import { clinicas, preparar } from './dashboard-fixture'

type Modo = 'movimento' | 'vazio' | 'erro' | 'negado' | 'financeiro-erro' | 'financeiro-negado' | 'incompleto' | 'escopo-errado' | 'atrasado'
type Controle = { modo: Modo; consultadoEm: string; esperar?: (recurso: string) => Promise<void> }
async function painel(page: Page, modoInicial: Modo = 'movimento', controle?: Controle) {
  const original = await preparar(page)
  const chamadas: { recurso: string; clinica: string | null; args?: Record<string, unknown> }[] = []
  let liberar: (() => void) | undefined
  const atraso = new Promise<void>(resolve => { liberar = resolve })
  await page.route('https://financeiro.synthetic.invalid/rest/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), recurso = url.pathname.split('/').pop() ?? ''
    if (!['agendamentos', 'financeiro_dashboard_proprietaria'].includes(recurso)) return route.fallback()
    if (!new URL(page.url()).pathname.endsWith('/dashboard')) return route.fallback()
    // Consultas da Agenda podem terminar de sair durante a navegação. Só esta
    // projeção paginada pertence à fonte da dashboard; as outras usam a fixture original.
    if (recurso === 'agendamentos' && !url.searchParams.get('select')?.includes('updated_at')) return route.fallback()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const args = recurso === 'financeiro_dashboard_proprietaria' ? request.postDataJSON() : undefined
    const clinica = args?.p_clinica_id ?? url.searchParams.get('clinica_id')?.replace('eq.', '') ?? null
    chamadas.push({ recurso, clinica, args })
    const modo = controle?.modo ?? modoInicial
    const consultadoEm = controle?.consultadoEm ?? '2026-10-09T11:10:00Z'
    if (controle?.esperar) await controle.esperar(recurso)
    const json = (data: unknown, status = 200, extra = {}) => route.fulfill({ status, headers: { ...headers, ...extra }, contentType: 'application/json', body: JSON.stringify(data) })
    if (modo === 'atrasado' && clinica === clinicas[0].id) await atraso
    if (recurso === 'agendamentos') {
      expect(request.method()).toBe('GET')
      expect(url.searchParams.get('status')).toBe('neq.cancelado')
      const dia = url.searchParams.get('data')?.replace('eq.', '')
      const revisao = url.searchParams.get('select') === 'updated_at'
      const estados = clinica === clinicas[0].id ? ['agendado', 'confirmado', 'aguardando', 'em_atendimento', 'concluido'] : ['concluido']
      const linhas = modo === 'vazio' ? [] : estados.map((status, i) => ({
        id: `sintetico-${i}`, clinica_id: clinica, paciente_id: `paciente-${i}`, profissional_id: `profissional-${i}`, data: dia,
        hora_inicio: `${String(9 + i).padStart(2, '0')}:00:00`, status, updated_at: '2026-10-09T11:00:00Z',
        pacientes: { nome_completo: 'Paciente Fictício Não Deve Aparecer' }, profissionais: { nome_completo: `Profissional DEMO ${clinica === clinicas[0].id ? 'Brotas' : 'Ipupiara'} ${i + 1}`, especialidades: { nome: 'Especialidade DEMO' } },
      }))
      if (modo === 'erro' || modo === 'negado') return json({ code: modo === 'negado' ? '42501' : 'XX000', message: 'Falha controlada' }, modo === 'negado' ? 403 : 500)
      return json(revisao ? linhas.length ? [{ updated_at: linhas[0].updated_at }] : [] : linhas, 200, modo === 'incompleto' ? {} : { 'content-range': `${revisao ? '0-0' : `0-${Math.max(0, linhas.length - 1)}`}/${linhas.length}` })
    }
    expect(request.method()).toBe('POST') // RPC somente de leitura.
    expect(args.p_profissional_id).toBeNull()
    expect(args.p_paciente_id).toBeNull()
    expect(args.p_timezone).toBe('America/Bahia')
    expect(Date.parse(args.p_fim) - Date.parse(args.p_inicio)).toBe(86400000)
    expect(args.p_inicio).toContain('03:00:00')
    if (modo === 'financeiro-erro' || modo === 'financeiro-negado') return json({ code: modo === 'financeiro-negado' ? '42501' : 'XX000', message: 'Falha controlada' }, modo === 'financeiro-negado' ? 403 : 500)
    return json({
      versao: 1, inicio: args.p_inicio, fim: args.p_fim, timezone_series: args.p_timezone,
      clinicas_autorizadas: [modo === 'escopo-errado' ? 'outra-clinica' : clinica], consultado_em: consultadoEm,
      resumo: { producao: { bruto: modo === 'vazio' ? '0.00' : clinica === clinicas[0].id ? '1250.00' : '75.00', clinica_liquida: modo === 'vazio' ? '0.00' : clinica === clinicas[0].id ? '250.00' : '15.00', quantidade: modo === 'vazio' ? 0 : 3 },
        repasses: { valor_repasses_pagos_periodo: '0.00', repasses_pendentes_atual: modo === 'vazio' ? 0 : 2 }, fiscal: { pendente: modo === 'vazio' ? 0 : 1 },
        caixa: { situacao_operacional_atual: { aguardando_aprovacao: modo === 'vazio' ? 0 : 1, devolvido_para_correcao: 0 } } },
    })
  })
  return { ...original, chamadas, liberar: () => liberar?.() }
}
for (const unidade of ['brotas', 'ipupiara'] as const) test(`fontes, estados, F5 e destinos reais — ${unidade}`, async ({ page }, info) => {
  const { escritas, chamadas } = await painel(page)
  await page.goto(`/sistema/${unidade}/dashboard`)
  await expect(page.getByTestId('resumo-Agendados').locator('dd')).toHaveText(unidade === 'brotas' ? '2' : '0')
  await expect(page.getByTestId('resumo-Concluídos').locator('dd')).toHaveText('1')
  if (unidade === 'brotas') for (const nome of ['Aguardando', 'Em atendimento']) await expect(page.getByTestId(`resumo-${nome}`).locator('dd')).toHaveText('1')
  await expect(page.locator('.proprietaria-finance-values').getByText(unidade === 'brotas' ? 'R$ 1.250,00' : 'R$ 75,00', { exact: true })).toBeVisible()
  await expect(page.locator('.proprietaria-finance-values').getByText(unidade === 'brotas' ? 'R$ 250,00' : 'R$ 15,00', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pendências e ações' })).toBeVisible()
  await expect(page.locator('.proprietaria-pending-list')).toContainText('Repasses pendentes')
  await expect(page.getByRole('list', { name: 'Agendamentos de hoje' })).toContainText(`Profissional DEMO ${unidade === 'brotas' ? 'Brotas' : 'Ipupiara'}`)
  await expect(page.locator('main')).not.toContainText('Paciente Fictício Não Deve Aparecer')
  await expect(page.getByRole('region', { name: 'Administração da clínica' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath(`${unidade}-movimento.png`), fullPage: true })
  await page.reload()
  await expect(page.getByTestId('resumo-Concluídos').locator('dd')).toHaveText('1')
  await page.getByRole('button', { name: 'Abrir Agenda', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/agenda$`))
  await page.goto(`/sistema/${unidade}/dashboard`)
  await expect(page.getByText('Repasses pendentes', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Conferir no Financeiro' }).first().click()
  await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/financeiro$`))
  expect(chamadas.every(c => c.clinica === clinicas[unidade === 'brotas' ? 0 : 1].id)).toBe(true)
  expect(escritas).toEqual([])
})
for (const unidade of ['brotas', 'ipupiara'] as const) test(`ações legíveis no tema claro e escuro — ${unidade}`, async ({ page }, info) => {
  await painel(page)
  await page.goto(`/sistema/${unidade}/dashboard`)
  await expect(page.locator('.proprietaria-finance-values')).toBeVisible()
  for (const tema of ['claro', 'escuro']) {
    if (tema === 'escuro') await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
    const contraste = await page.getByRole('button', { name: 'Abrir Agenda', exact: true }).evaluate(botao => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')!
      const luminancia = (cor: string) => {
        ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = cor; ctx.fillRect(0, 0, 1, 1)
        const pixel = ctx.getImageData(0, 0, 1, 1).data
        const linear = Array.from(pixel).slice(0, 3).map(c => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
      }
      const texto = luminancia(getComputedStyle(botao).color)
      const fundo = luminancia(getComputedStyle(botao.closest('section')!).backgroundColor)
      return (Math.max(texto, fundo) + 0.05) / (Math.min(texto, fundo) + 0.05)
    })
    expect(contraste).toBeGreaterThanOrEqual(4.5)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath(`${unidade}-escuro.png`), fullPage: true })
})
test('sem movimento mantém os quatro blocos e zero só confirmado', async ({ page }, info) => {
  const { escritas } = await painel(page, 'vazio')
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.getByRole('heading', { name: 'Nenhum agendamento hoje' })).toBeVisible()
  await expect(page.locator('.proprietaria-finance-values').getByText('R$ 0,00', { exact: true })).toHaveCount(3)
  await expect(page.getByText(/Nenhuma pendência de aprovação/)).toBeVisible()
  for (const titulo of ['Resumo do dia', 'Agenda do dia', 'Resumo financeiro', 'Pendências e ações']) await expect(page.getByRole('heading', { name: titulo, exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('sem-movimento.png'), fullPage: true })
  expect(escritas).toEqual([])
})
for (const modo of ['erro', 'negado', 'incompleto', 'financeiro-erro', 'financeiro-negado', 'escopo-errado'] as const) test(`consulta ${modo} nunca vira ausência`, async ({ page }, info) => {
  await painel(page, modo)
  await page.goto('/sistema/ipupiara/dashboard')
  const erroAgenda = ['erro', 'negado', 'incompleto'].includes(modo)
  await expect(page.getByText(erroAgenda ? modo === 'negado' ? 'Movimento do dia: acesso não autorizado' : 'Movimento do dia indisponível' : modo === 'financeiro-negado' ? 'Resumo financeiro: acesso não autorizado' : 'Resumo financeiro indisponível', { exact: true })).toBeVisible()
  if (erroAgenda) {
    await expect(page.getByTestId('resumo-Agendados')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Nenhum agendamento hoje' })).toHaveCount(0)
    await expect(page.locator('.proprietaria-finance-values')).toContainText('R$ 75,00')
  } else {
    await expect(page.locator('.proprietaria-finance-values')).toHaveCount(0)
    await expect(page.getByText(/Nenhuma pendência de aprovação/)).toHaveCount(0)
    await expect(page.getByTestId('resumo-Concluídos').locator('dd')).toHaveText('1')
  }
  if (modo === 'negado' || modo === 'financeiro-erro') await page.screenshot({ path: info.outputPath(`${modo}.png`), fullPage: true })
})
test('respostas atrasadas e carregamento não contaminam troca de clínica', async ({ page }, info) => {
  const { liberar, escritas } = await painel(page, 'atrasado')
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.getByText('Consultando movimento do dia…', { exact: true })).toBeVisible()
  await expect(page.getByText('Consultando valores oficiais…', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Selecionar clínica', exact: true }).selectOption(clinicas[1].id)
  await expect(page).toHaveURL(/ipupiara\/dashboard$/)
  await expect(page.locator('.proprietaria-finance-values')).toContainText('R$ 75,00')
  liberar()
  await expect(page.getByTestId('resumo-Agendados').locator('dd')).toHaveText('0')
  await expect(page.locator('main')).not.toContainText('Profissional DEMO Brotas')
  await expect(page.locator('.proprietaria-finance-values')).not.toContainText('R$ 1.250,00')
  await page.getByRole('button', { name: 'Atualizar painel', exact: true }).click()
  await expect(page.getByTestId('resumo-Concluídos').locator('dd')).toHaveText('1')
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('troca-ipupiara-escuro.png'), fullPage: true })
  expect(escritas).toEqual([])
})

for (const unidade of ['brotas', 'ipupiara'] as const) test(`conferência final: estados e próximo atendimento — ${unidade}`, async ({ page }, info) => {
  await page.clock.setFixedTime(new Date('2026-10-09T11:30:00Z'))
  const { escritas } = await painel(page)
  await page.goto(`/sistema/${unidade}/dashboard`)
  await expect(page.getByTestId('resumo-Agendados')).toContainText('Agendado ou confirmado; não é o total')
  for (const [nome, n] of [['Agendados', unidade === 'brotas' ? '2' : '0'], ['Aguardando', unidade === 'brotas' ? '1' : '0'], ['Em atendimento', unidade === 'brotas' ? '1' : '0'], ['Concluídos', '1']]) {
    await expect(page.getByTestId(`resumo-${nome}`).locator('dd')).toHaveText(n)
  }
  if (unidade === 'brotas') await expect(page.locator('.proprietaria-next strong')).toHaveText('09:00 · Profissional DEMO Brotas 1')
  await page.clock.setFixedTime(new Date('2026-10-09T21:00:00Z'))
  await page.getByRole('button', { name: 'Atualizar painel', exact: true }).click()
  await expect(page.locator('.proprietaria-next strong')).toHaveText('Nenhum horário futuro agendado ou confirmado hoje.')
  if (unidade === 'brotas') {
    await expect(page.locator('.proprietaria-next')).toContainText('1 aguardando · 1 em atendimento.')
    await expect(page.locator('.proprietaria-next')).toContainText('2 horários anteriores ainda em Agendado ou Confirmado.')
  } else {
    await expect(page.locator('.proprietaria-next')).not.toContainText('aguardando ·')
  }
  await expect(page.locator('main')).not.toContainText('Nenhum agendamento restante hoje.')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath(`${unidade}-sem-futuros-sintetico.png`), fullPage: true })
  expect(escritas).toEqual([])
})

for (const unidade of ['brotas', 'ipupiara'] as const) test(`conferência final: horários e atualização das duas fontes — ${unidade}`, async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-09T13:48:00Z'))
  const controle: Controle = { modo: 'movimento', consultadoEm: '2026-10-09T11:10:00Z' }
  const { chamadas, escritas } = await painel(page, 'movimento', controle)
  await page.goto(`/sistema/${unidade}/dashboard`)
  for (const titulo of ['Resumo do dia', 'Agenda do dia']) await expect(page.getByRole('region', { name: titulo, exact: true })).toContainText('Leitura concluída em 09/10/2026, 10:48:00')
  for (const titulo of ['Resumo financeiro', 'Pendências e ações']) await expect(page.getByRole('region', { name: titulo, exact: true })).toContainText('Dados consultados no servidor em 09/10/2026, 08:10:00')
  const antes = chamadas.length
  await page.clock.setFixedTime(new Date('2026-10-09T13:49:00Z'))
  // Resposta financeira ainda antiga: o horário do clique não a torna recente.
  await page.getByRole('button', { name: 'Atualizar painel', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Resumo do dia', exact: true })).toContainText('10:49:00')
  await expect(page.getByRole('region', { name: 'Resumo financeiro', exact: true })).toContainText('08:10:00')
  expect(chamadas.slice(antes).some(c => c.recurso === 'agendamentos')).toBe(true)
  expect(chamadas.slice(antes).some(c => c.recurso === 'financeiro_dashboard_proprietaria')).toBe(true)
  controle.consultadoEm = '2026-10-09T13:50:00Z'
  await page.clock.setFixedTime(new Date('2026-10-09T13:50:00Z'))
  await page.getByRole('button', { name: 'Atualizar painel', exact: true }).click()
  for (const titulo of ['Resumo financeiro', 'Pendências e ações']) await expect(page.getByRole('region', { name: titulo, exact: true })).toContainText('10:50:00')
  expect(escritas).toEqual([])
})

for (const modo of ['erro', 'negado', 'financeiro-erro', 'financeiro-negado'] as const) test(`conferência final: atualização parcial ${modo} retira valores antigos`, async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-09T13:48:00Z'))
  const controle: Controle = { modo: 'movimento', consultadoEm: '2026-10-09T11:10:00Z' }
  const { chamadas, escritas } = await painel(page, 'movimento', controle)
  const unidade = modo.includes('negado') ? 'ipupiara' : 'brotas'
  await page.goto(`/sistema/${unidade}/dashboard`)
  await expect(page.locator('.proprietaria-finance-values')).toBeVisible()
  await expect(page.getByTestId('resumo-Concluídos').locator('dd')).toHaveText('1')
  const antes = chamadas.length
  let liberar!: () => void
  const espera = new Promise<void>(resolve => { liberar = resolve })
  controle.esperar = () => espera
  controle.modo = modo
  controle.consultadoEm = '2026-10-09T13:49:00Z'
  await page.clock.setFixedTime(new Date('2026-10-09T13:49:00Z'))
  try {
    await page.getByRole('button', { name: 'Atualizar painel', exact: true }).click()
    for (const texto of ['Consultando movimento do dia…', 'Consultando agenda…', 'Consultando valores oficiais…', 'Consultando pendências financeiras…']) await expect(page.getByText(texto, { exact: true })).toBeVisible()
    await expect(page.getByTestId('resumo-Agendados')).toHaveCount(0)
    await expect(page.locator('.proprietaria-finance-values')).toHaveCount(0)
    await expect(page.locator('.proprietaria-pending-list')).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText('08:10:00')
  } finally { liberar(); controle.esperar = undefined }
  const falhaAgenda = modo === 'erro' || modo === 'negado'
  const bloqueados = falhaAgenda ? ['Resumo do dia', 'Agenda do dia'] : ['Resumo financeiro', 'Pendências e ações']
  for (const titulo of bloqueados) {
    const bloco = page.getByRole('region', { name: titulo, exact: true })
    await expect(bloco).toContainText(modo.includes('negado') ? 'acesso não autorizado' : 'indisponível')
    await expect(bloco).not.toContainText('10:49:00')
    await expect(bloco).not.toContainText('08:10:00')
  }
  for (const titulo of falhaAgenda ? ['Resumo financeiro', 'Pendências e ações'] : ['Resumo do dia', 'Agenda do dia']) await expect(page.getByRole('region', { name: titulo, exact: true })).toContainText('10:49:00')
  expect(chamadas.slice(antes).some(c => c.recurso === 'agendamentos')).toBe(true)
  expect(chamadas.slice(antes).some(c => c.recurso === 'financeiro_dashboard_proprietaria')).toBe(true)
  expect(escritas).toEqual([])
})

test('conferência final: agenda vazia também identifica sua leitura', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-09T13:48:00Z'))
  await painel(page, 'vazio')
  await page.goto('/sistema/brotas/dashboard')
  const agenda = page.getByRole('region', { name: 'Agenda do dia', exact: true })
  await expect(agenda).toContainText('Nenhum agendamento hoje')
  await expect(agenda).toContainText('Leitura concluída em 09/10/2026, 10:48:00')
  await expect(page.locator('.proprietaria-finance-values')).toBeVisible()
})

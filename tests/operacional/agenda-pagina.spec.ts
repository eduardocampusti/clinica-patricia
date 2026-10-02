import { expect, test, type Locator, type Page } from '@playwright/test'
import { ESCALA_AGENDA } from '../../src/lib/agendaTemporal'

// Página principal da Agenda conforme o mockup aprovado. Somente prévia sintética; nenhuma escrita em banco real.
const previa = '/tests/operacional/agenda-preview.html'
const pasta = 'scratch/agenda-ux/pagina'
const registro = (page: Page, id: string) => page.locator(`[data-registro-id="${id}"]`)
async function abrir(page: Page, query = '') {
  await page.goto(previa + query, { waitUntil: 'domcontentloaded' })
  // Primeira carga do Vite sintético pode compilar a frio.
  await expect(page.getByRole('region', { name: 'Resumo do dia' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('registro-agenda').first()).toBeAttached()
}
const indicador = (page: Page, rotulo: string) => page.getByRole('region', { name: 'Resumo do dia' }).locator('div').filter({ has: page.getByText(rotulo, { exact: true }) })
async function semOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}
async function alvos(locais: Locator) {
  for (const b of await locais.evaluateAll(els => els.map(el => el.getBoundingClientRect()).map(r => ({ w: r.width, h: r.height })))) {
    expect(b.h).toBeGreaterThanOrEqual(44)
    expect(b.w).toBeGreaterThanOrEqual(44)
  }
}
// Contraste do texto sobre o fundo efetivo (fundo translúcido composto sobre o cartão).
async function contraste(alvo: Locator) {
  return alvo.evaluate(el => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    const camadas: string[] = []
    for (let n: Element | null = el; n; n = n.parentElement) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') camadas.unshift(bg); if (/^rgb\(/.test(bg)) break }
    const pinta = (cores: string[]) => { ctx.clearRect(0, 0, 1, 1); for (const c of cores) { ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1) } return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
    const lum = (c: number[]) => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
    const fundo = pinta(camadas), texto = pinta([...camadas, getComputedStyle(el).color])
    const [a, b] = [lum(fundo), lum(texto)].sort((x, y) => y - x)
    return (a + 0.05) / (b + 0.05)
  })
}
test.beforeEach(() => test.setTimeout(60_000))

test('estrutura: título com data por extenso, cinco indicadores e modo inicial por tela', async ({ page }, info) => {
  await abrir(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible()
  await expect(page.locator('header').filter({ has: page.getByRole('heading', { name: 'Agenda' }) })).toContainText(/(Segunda|Terça|Quarta|Quinta|Sexta)-feira|Sábado|Domingo/)
  await expect(page.locator('header').filter({ has: page.getByRole('heading', { name: 'Agenda' }) })).toContainText(/\d{1,2} de [a-zç]+ de \d{4}/)
  await expect(page.getByRole('button', { name: '+ Novo agendamento', exact: true })).toBeVisible()
  // Dados da prévia: 3 registros (aguardando, confirmado, agendado); 08–18 h de 30 min para um profissional, com 2 blocos ocupados.
  for (const [rotulo, valor, apoio] of [['Agendamentos do dia', '3', '2 profissionais'], ['A confirmar', '1', 'ainda sem confirmação'], ['Aguardando atendimento', '1', 'chegada registrada'],
    ['Horários livres', '18', '1 profissional com expediente'], ['Lista de espera', '1', 'aguardando vaga']] as const) {
    await expect(indicador(page, rotulo).last()).toContainText(valor)
    await expect(indicador(page, rotulo).last()).toContainText(apoio)
  }
  const dia = page.getByRole('button', { name: 'Dia', exact: true }), lista = page.getByRole('button', { name: 'Lista', exact: true })
  if (info.project.name === 'desktop') {
    await expect(dia).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.agenda-temporal')).toBeVisible()
  } else {
    await expect(lista).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.agenda-lista-linha').first()).toBeVisible()
  }
  await alvos(page.getByRole('group', { name: 'Controles da Agenda' }).getByRole('button'))
  await semOverflow(page)
  await page.screenshot({ path: `${pasta}/inicial-${info.project.name}.png`, fullPage: true, animations: 'disabled' })
})

test('indicador de horários livres distingue sem expediente de falha de disponibilidade', async ({ page }) => {
  await abrir(page, '?sem-expediente')
  await expect(indicador(page, 'Horários livres').last()).toContainText('—')
  await expect(indicador(page, 'Horários livres').last()).toContainText('sem expediente cadastrado')
  await abrir(page, '?falha')
  await expect(indicador(page, 'Horários livres').last()).toContainText('—')
  await expect(indicador(page, 'Horários livres').last()).toContainText('disponibilidade não confirmada')
  await expect(page.getByRole('alert').filter({ hasText: 'Falha ao consultar disponibilidade' })).toBeVisible()
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  for (const coluna of await page.locator('.agenda-temporal-coluna').all()) {
    await expect(coluna).toContainText('Disponibilidade não confirmada')
    await expect(coluna).not.toContainText('Sem expediente')
    await expect(coluna.locator('.agenda-temporal-livre')).toHaveCount(0)
  }
})

test('grade Dia: cabeçalhos, cartões por situação, livre clicável, neutro e janela compacta', async ({ page }, info) => {
  await abrir(page, '?complexa')
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  const geral = page.getByRole('region', { name: 'Profissional Sintético — Clínica geral' })
  const cardio = page.getByRole('region', { name: 'Profissional Sintético — Cardiologia' })
  const cabecalhos = page.locator('.agenda-temporal-cabecalho')
  await expect(cabecalhos.filter({ hasText: 'Clínica geral' })).toContainText('PG')
  await expect(cabecalhos.filter({ hasText: 'Clínica geral' })).toContainText(/Clínica geral · \d+ livres?/)
  await expect(cabecalhos.filter({ hasText: 'Cardiologia' })).toContainText('Cardiologia · sem expediente')
  // Janela 08:00–18:00 (expediente) contém todos os registros, inclusive os fora do expediente.
  await expect(page.locator('.agenda-temporal-eixo span').first()).toHaveText('08:00')
  await expect(page.getByRole('group', { name: 'Controles da Agenda' })).toContainText('Horários relevantes · 08:00–18:00')
  const altura = await geral.evaluate(el => el.getBoundingClientRect().height)
  for (const id of ['ag-1', 'ag-2', 'ag-3', 'ag-4', 'ag-5', 'ag-6']) {
    const top = await registro(page, id).evaluate(el => el.parentElement!.offsetTop + el.offsetHeight)
    expect(top).toBeLessThanOrEqual(altura)
  }
  // Cartão: fundo da situação, nome, ponto + texto da situação e linha monoespaçada.
  const confirmado = registro(page, 'ag-2')
  await expect(confirmado).toHaveAttribute('data-situacao', 'confirmado')
  await expect(confirmado).toContainText('Ana Exemplo Sintético')
  await expect(confirmado.locator('.agenda-situacao')).toHaveText('Confirmado')
  await expect(confirmado.locator('.agenda-situacao-ponto')).toHaveCount(1)
  await expect(confirmado.locator('.agenda-fonte-tecnica')).toHaveText('10:00–10:30 · 30 min')
  const fundoEsperado = await page.evaluate(() => { const d = document.createElement('div'); d.style.background = 'var(--status-confirmado-fundo)'; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c })
  await expect(confirmado).toHaveCSS('background-color', fundoEsperado)
  expect(await contraste(confirmado.locator('.agenda-situacao'))).toBeGreaterThanOrEqual(4.5)
  expect(await contraste(confirmado.locator('.agenda-fonte-tecnica'))).toBeGreaterThanOrEqual(4.5)
  // Sem expediente: bloco neutro, sem horário livre inventado.
  await expect(cardio.locator('.agenda-temporal-neutro')).toContainText('Sem expediente')
  await expect(cardio.locator('.agenda-temporal-livre')).toHaveCount(0)
  // Livre: cartão tracejado “+ HH:MM livre” que pré-seleciona profissional, data e início, sem gravar.
  const livre = geral.getByRole('button', { name: 'Novo agendamento às 11:00 — Profissional Sintético — Clínica geral', exact: true })
  await expect(livre).toHaveText('+ 11:00 livre')
  await expect(livre).toHaveCSS('border-top-style', 'dashed')
  await alvos(livre)
  await page.screenshot({ path: `${pasta}/dia-${info.project.name}.png`, animations: 'disabled' })
  await livre.click()
  const painel = page.getByRole('dialog', { name: 'Novo agendamento' })
  await expect(painel.locator('input[name="novo-agendamento-profissional"][value="prof-1"]')).toBeChecked()
  await expect(painel.getByRole('group', { name: 'Horários disponíveis' }).getByRole('button', { name: '11:00', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).not.toHaveAttribute('data-envios-sinteticos')
  await painel.getByRole('button', { name: 'Cancelar', exact: true }).click()
  // Consulta continua abrindo pelo cartão.
  await confirmado.getByRole('button').click()
  await expect(page.getByRole('dialog', { name: 'Consultar agendamento' })).toContainText('Ana Exemplo Sintético')
  await page.getByRole('button', { name: 'Fechar consulta' }).click()
  await semOverflow(page)
})

test('coluna direita: calendário troca a data, lista de espera encaixa e legenda conta situações', async ({ page }, info) => {
  await abrir(page)
  const lateral = page.getByRole('complementary', { name: 'Calendário, lista de espera e situações' })
  if (info.project.name !== 'desktop') {
    const alternar = lateral.getByRole('button', { name: 'Mostrar calendário do mês' })
    await expect(alternar).toHaveAttribute('aria-expanded', 'false')
    await expect(lateral.getByRole('group', { name: /^Dias de / })).toBeHidden()
    await alternar.click()
    await expect(lateral.getByRole('button', { name: 'Ocultar calendário do mês' })).toHaveAttribute('aria-expanded', 'true')
  }
  const dias = lateral.getByRole('group', { name: /^Dias de / })
  await expect(dias.getByRole('button', { pressed: true })).toHaveCount(1)
  await alvos(dias.getByRole('button'))
  const quinze = dias.getByRole('button', { name: /^\S+, 15 de / })
  await quinze.click()
  await expect(quinze).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('header').filter({ has: page.getByRole('heading', { name: 'Agenda' }) })).toContainText(/15 de [a-zç]+ de \d{4}/)
  const tituloMes = await lateral.locator('h2').first().textContent()
  await lateral.getByRole('button', { name: 'Próximo mês' }).click()
  await expect(lateral.locator('h2').first()).not.toHaveText(tituloMes!)
  await page.getByRole('button', { name: 'Hoje', exact: true }).click()
  await expect(lateral.locator('h2').first()).toHaveText(tituloMes!)
  // Lista de espera: contagem, profissional · desde DD/MM, Encaixar e adicionar.
  const espera = lateral.getByRole('region', { name: 'Lista de espera' })
  await expect(espera).toContainText('1 paciente')
  await expect(espera).toContainText(/Profissional Sintético — Cardiologia · desde \d{2}\/\d{2}/)
  await expect(espera.getByRole('button', { name: '+ Adicionar à lista de espera' })).toBeVisible()
  const situacoes = lateral.getByRole('region', { name: 'Situação dos atendimentos' })
  for (const [nome, n] of [['Agendado', '1'], ['Confirmado', '1'], ['Aguardando', '1'], ['Em atendimento', '0'], ['Concluído', '0'], ['Cancelado', '0']]) {
    await expect(situacoes.getByRole('listitem').filter({ hasText: nome })).toContainText(n)
  }
  await expect(situacoes.locator('.agenda-situacao-ponto')).toHaveCount(6)
  await page.screenshot({ path: `${pasta}/lateral-${info.project.name}.png`, fullPage: true, animations: 'disabled' })
  await espera.getByRole('button', { name: 'Encaixar Davi Exemplo Sintético' }).click()
  const painel = page.getByRole('dialog', { name: 'Novo agendamento' })
  await expect(painel.getByRole('group', { name: 'Paciente selecionado' })).toContainText('Davi Exemplo Sintético')
  await expect(painel.locator('input[name="novo-agendamento-profissional"][value="prof-2"]')).toBeChecked()
})

test('modo Lista mantém a coluna direita no computador e as ações da recepção', async ({ page }, info) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(registro(page, 'ag-2').getByRole('button', { name: 'Registrar chegada' })).toBeVisible()
  await expect(registro(page, 'ag-2').getByRole('button', { name: 'Editar agendamento' })).toBeVisible()
  const lateral = page.getByRole('complementary', { name: 'Calendário, lista de espera e situações' })
  await expect(lateral).toBeVisible()
  if (info.project.name === 'desktop') {
    const principal = await page.getByRole('region', { name: 'Agendamentos do dia' }).boundingBox()
    const coluna = await lateral.boundingBox()
    expect(coluna!.x).toBeGreaterThan(principal!.x + principal!.width - 1)
    expect(coluna!.width).toBeGreaterThan(300)
    expect(coluna!.width).toBeLessThan(360)
  }
  await semOverflow(page)
  await page.screenshot({ path: `${pasta}/lista-${info.project.name}.png`, fullPage: info.project.name !== 'desktop', animations: 'disabled' })
})

test('modo escuro e Ipupiara: tokens do tema e contraste dos cartões', async ({ page }, info) => {
  await abrir(page, '?unidade=ipupiara&complexa')
  await expect(page.locator('.app-shell-header')).toContainText('Clínica Ipupiara')
  await page.getByRole('button', { name: 'Alternar tema' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'escuro')
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  for (const id of ['ag-1', 'ag-2', 'ag-3']) {
    expect(await contraste(registro(page, id).locator('.agenda-situacao'))).toBeGreaterThanOrEqual(4.5)
    expect(await contraste(registro(page, id).locator('.agenda-fonte-tecnica'))).toBeGreaterThanOrEqual(4.5)
  }
  const selecionado = page.getByRole('group', { name: /^Dias de / }).getByRole('button', { pressed: true })
  if (info.project.name !== 'desktop') await page.getByRole('button', { name: 'Mostrar calendário do mês' }).click()
  expect(await contraste(selecionado)).toBeGreaterThanOrEqual(4.5)
  await semOverflow(page)
  await page.screenshot({ path: `${pasta}/escuro-ipupiara-${info.project.name}.png`, animations: 'disabled' })
})

test('acabamento: 08:00–12:00 na primeira tela em 1440×900, cartão de 30 min legível e Expediente como ícone', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Verificação do computador 1440×900.')
  await page.setViewportSize({ width: 1440, height: 900 })
  await abrir(page)
  await expect(page.getByRole('button', { name: 'Dia', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => scrollY)).toBe(0)
  const eixo = page.locator('.agenda-temporal-eixo span')
  const oito = await eixo.filter({ hasText: /^08:00$/ }).boundingBox(), doze = await eixo.filter({ hasText: /^12:00$/ }).boundingBox()
  expect(oito!.y).toBeGreaterThanOrEqual(0)
  expect(doze!.y + doze!.height).toBeLessThanOrEqual(900)
  // A janela (linha própria antes) está na barra de controles.
  const barra = page.getByRole('group', { name: 'Controles da Agenda' })
  await expect(barra).toContainText('Horários relevantes · 08:00–18:00')
  await expect(barra.getByRole('button', { name: 'Ver dia inteiro' })).toBeVisible()
  // Cartão de 30 min: ≥ 44 px, proporcional, com nome e horário inteiros dentro dele.
  const cartao = registro(page, 'ag-2')
  const caixa = (await cartao.boundingBox())!
  expect(caixa.height).toBeGreaterThanOrEqual(44)
  expect(caixa.height).toBeCloseTo(30 * ESCALA_AGENDA, 0)
  for (const linha of [cartao.locator('.agenda-registro-nome').first(), cartao.locator('.agenda-fonte-tecnica')]) {
    const b = (await linha.boundingBox())!
    expect(b.y).toBeGreaterThanOrEqual(caixa.y - 1)
    expect(b.y + b.height).toBeLessThanOrEqual(caixa.y + caixa.height + 1)
  }
  await expect(page.locator('.agenda-temporal-livre').first()).toHaveCSS('height', `${30 * ESCALA_AGENDA - 4}px`)
  // Cabeçalho: nome em uma linha com reticências; Expediente é ícone com nome acessível e 44 px.
  const cabecalho = page.locator('.agenda-temporal-cabecalho').filter({ hasText: 'Clínica geral' })
  await expect(cabecalho.locator('h3')).toHaveCSS('white-space', 'nowrap')
  await expect(cabecalho.locator('h3')).toHaveCSS('text-overflow', 'ellipsis')
  await expect(cabecalho).toContainText(/Clínica geral · \d+ livres?/)
  const expediente = page.getByRole('button', { name: 'Expediente de Profissional Sintético — Clínica geral: marcar folga ou horário especial' })
  await expect(expediente.locator('svg')).toHaveCount(1)
  expect((await expediente.textContent())!.trim()).toBe('')
  await alvos(expediente)
  await page.screenshot({ path: 'scratch/agenda-ux/pagina-acabamento/primeira-tela-1440x900.png', animations: 'disabled' })
})

test('acabamento: nome em uma linha com reticências em cartão sobreposto; situação vira ponto', async ({ page }, info) => {
  await abrir(page, '?complexa')
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  await expect(page.locator('.agenda-temporal-posicao').filter({ has: registro(page, 'ag-5') })).toHaveAttribute('data-faixas', '2')
  const cartao = registro(page, 'ag-5'), nome = cartao.locator('.agenda-registro-nome').first()
  await expect(nome).toHaveCSS('white-space', 'nowrap')
  await expect(nome).toHaveCSS('text-overflow', 'ellipsis')
  expect(await nome.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true)
  expect((await nome.boundingBox())!.height).toBeLessThan(22)
  const nomeCompleto = 'Paciente Exemplo Sintético de Nome Muito Longo para Conferência de Leitura e Expansão'
  await expect(cartao.getByRole('button')).toHaveAttribute('title', new RegExp(`^${nomeCompleto} · Agendado`))
  await expect(cartao.getByRole('button')).toHaveAccessibleName(new RegExp(`^09:15 ${nomeCompleto} — Agendado`))
  await expect(cartao.locator('.agenda-situacao-texto')).toBeHidden()
  await expect(cartao.locator('.agenda-situacao-ponto')).toBeVisible()
  // Cartão sem sobreposição e largo mantém o texto da situação.
  await abrir(page)
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  await expect(registro(page, 'ag-2').locator('.agenda-situacao-texto')).toBeVisible()
  await page.screenshot({ path: `scratch/agenda-ux/pagina-acabamento/sobreposicao-${info.project.name}.png`, animations: 'disabled' })
})

test('acabamento: primeiro agendamento na primeira tela em 390×844 com os cinco indicadores compactos', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Verificação do celular 390×844.')
  await abrir(page)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  const primeiro = (await page.getByTestId('registro-agenda').first().boundingBox())!
  expect(primeiro.y).toBeGreaterThanOrEqual(0)
  expect(primeiro.y + primeiro.height).toBeLessThanOrEqual(844)
  const itens = page.getByRole('region', { name: 'Resumo do dia' }).locator(':scope > div')
  await expect(itens).toHaveCount(5)
  const caixas = await itens.evaluateAll(els => els.map(el => el.getBoundingClientRect()).map(r => ({ y: Math.round(r.y), h: r.height })))
  expect(new Set(caixas.map(c => c.y)).size).toBe(1)
  for (const c of caixas) expect(c.h).toBeLessThanOrEqual(70)
  for (const [curto, valor] of [['Total', '3'], ['A confirmar', '1'], ['Aguardando', '1'], ['Livres', '18'], ['Espera', '1']]) {
    const item = itens.filter({ has: page.locator('p[aria-hidden="true"]').filter({ hasText: new RegExp('^' + curto + '$') }) })
    await expect(item).toContainText(valor)
    const rotulo = item.locator('p[aria-hidden="true"]')
    expect(await rotulo.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  }
  await expect(page.getByRole('button', { name: '+ Novo agendamento', exact: true })).toBeVisible()
  await page.screenshot({ path: 'scratch/agenda-ux/pagina-acabamento/primeira-tela-390x844.png', animations: 'disabled' })
})

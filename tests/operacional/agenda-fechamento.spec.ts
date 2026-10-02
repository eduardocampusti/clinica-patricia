
// Painel de criação: cartões de profissional (rádios nativos) ou select acima de seis.
const radioProfissional = (escopo: Page | Locator, id: string) => escopo.locator(`input[name="novo-agendamento-profissional"][value="${id}"]`)
const pacienteEscolhido = (escopo: Page | Locator) => escopo.getByRole('group', { name: 'Paciente selecionado' })
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ESCALA_AGENDA } from '../../src/lib/agendaTemporal'

const previa = '/tests/operacional/agenda-preview.html'
const registro = (page: Page, id: string) => page.locator(`[data-registro-id="${id}"]`)
async function abrir(page: Page, query = '', quantidade = 3) {
  await page.goto(previa + query, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('registro-agenda')).toHaveCount(quantidade)
  // Computador abre no modo Dia; estes cenários usam as ações da lista.
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
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
async function geometria(painel: Locator) {
  const areas = await painel.evaluate(el => {
    const r = (n: Element) => { const b = n.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height } }
    return { cabecalho: r(el.children[0]), titulo: r(el.querySelector('h2')!), corpo: r(el.querySelector('.agenda-formulario-conteudo')!), rodape: r(el.querySelector('.agenda-formulario-rodape')!), altura: innerHeight }
  })
  expect(areas.cabecalho.bottom).toBeLessThanOrEqual(areas.corpo.top + 1)
  expect(areas.cabecalho.top).toBeGreaterThanOrEqual(-1)
  expect(areas.titulo.top).toBeGreaterThanOrEqual(areas.cabecalho.top)
  expect(areas.titulo.bottom).toBeLessThanOrEqual(areas.cabecalho.bottom)
  expect(areas.corpo.height).toBeGreaterThan(50)
  expect(areas.corpo.bottom).toBeLessThanOrEqual(areas.rodape.top + 1)
  expect(areas.rodape.bottom).toBeLessThanOrEqual(areas.altura + 1)
}
async function visivelNoCorpo(painel: Locator, campo: Locator) {
  const corpo = await painel.locator('.agenda-formulario-conteudo').boundingBox()
  const alvo = await campo.boundingBox()
  expect(alvo!.y).toBeGreaterThanOrEqual(corpo!.y - 1)
  expect(alvo!.y + alvo!.height).toBeLessThanOrEqual(corpo!.y + corpo!.height + 1)
}

test('painéis: abertura no topo, confirmação inteira e foco sem cabeçalho/rodapé encobrindo', async ({ page }, info) => {
  await abrir(page)
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  let painel = page.getByRole('dialog', { name: 'Novo agendamento' })
  await geometria(painel)
  expect(await painel.locator('.agenda-formulario-conteudo').evaluate(el => el.scrollTop)).toBe(0)
  await visivelNoCorpo(painel, painel.getByRole('combobox', { name: 'Paciente', exact: true }))
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/criacao-abertura-${info.project.name}.png`, animations: 'disabled' })
  await painel.getByRole('button', { name: 'Cancelar', exact: true }).click()
  painel = await abrirCriacaoManual(page)
  const confirmarCriacao = painel.getByRole('checkbox', { name: /confirmo a marcação manual/ })
  await confirmarCriacao.focus()
  await visivelNoCorpo(painel, confirmarCriacao.locator('..'))
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/criacao-confirmacao-${info.project.name}.png`, animations: 'disabled' })
  await abrir(page)
  await registro(page, 'ag-3').getByRole('button', { name: 'Editar agendamento' }).click()
  painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await geometria(painel)
  expect(await painel.locator('.agenda-formulario-conteudo').evaluate(el => el.scrollTop)).toBe(0)
  // Remarcação: o primeiro conteúdo é o bloco “de → para”; a data fica em “Escolher outra data”.
  await visivelNoCorpo(painel, painel.getByRole('group', { name: 'Horário anterior' }))
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/edicao-abertura-${info.project.name}.png`, animations: 'disabled' })
  const confirmarEdicao = painel.getByRole('checkbox', { name: /Conferi o horário/ })
  await confirmarEdicao.focus()
  await visivelNoCorpo(painel, confirmarEdicao.locator('..'))
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/edicao-confirmacao-${info.project.name}.png`, animations: 'disabled' })
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab')
    const foco = await painel.evaluate(el => {
      const a = document.activeElement!, b = a.getBoundingClientRect(), corpo = el.querySelector('.agenda-formulario-conteudo')!, c = corpo.getBoundingClientRect()
      return { contido: el.contains(a), corpo: corpo.contains(a), top: b.top, bottom: b.bottom, topoCorpo: c.top, fimCorpo: c.bottom }
    })
    expect(foco.contido).toBe(true)
    if (foco.corpo) { expect(foco.top).toBeGreaterThanOrEqual(foco.topoCorpo - 1); expect(foco.bottom).toBeLessThanOrEqual(foco.fimCorpo + 1) }
  }
  await geometria(painel)
})

for (const zoom of [1.25, 1.5]) {
  test(`painéis com ampliação CSS ${zoom * 100}%: conteúdo rolável e ações acessíveis`, async ({ page }, info) => {
    await abrir(page)
    // Emulação de ampliação de layout; não representa controle do zoom nativo do navegador.
    await page.addStyleTag({ content: `html { zoom: ${zoom}; } .painel-agenda { height: calc(100dvh / ${zoom}); max-height: calc(100dvh / ${zoom}); }` })
    await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
    let painel = page.getByRole('dialog', { name: 'Novo agendamento' })
    await geometria(painel)
    await painel.getByRole('combobox', { name: 'Paciente', exact: true }).focus()
    await visivelNoCorpo(painel, painel.getByRole('combobox', { name: 'Paciente', exact: true }))
    await painel.getByLabel('Observações').focus()
    await visivelNoCorpo(painel, painel.getByLabel('Observações'))
    await painel.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await registro(page, 'ag-3').getByRole('button', { name: 'Editar agendamento' }).click()
    painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
    await geometria(painel)
    await painel.getByRole('checkbox', { name: /Conferi o horário/ }).focus()
    await visivelNoCorpo(painel, painel.getByRole('checkbox', { name: /Conferi o horário/ }).locator('..'))
    await page.screenshot({ path: `scratch/agenda-ux/fechamento/edicao-zoom${zoom * 100}-${info.project.name}.png`, animations: 'disabled' })
  })
}

for (const unidade of ['brotas', 'ipupiara']) {
  test(`consultas curtas ${unidade}: 15/20 min proporcionais, paciente legível e detalhes por teclado/toque`, async ({ page }, info) => {
    await abrir(page, `?unidade=${unidade}&curtas`, 5)
    const ids = await page.getByTestId('registro-agenda').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-registro-id')).sort())
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    expect(await page.getByTestId('registro-agenda').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-registro-id')).sort())).toEqual(ids)
    for (const [id, minutos] of [['curta-15', 15], ['curta-20', 20]] as const) {
      const cartao = registro(page, id)
      await cartao.scrollIntoViewIfNeeded()
      const box = await cartao.boundingBox()
      expect(box!.height).toBeCloseTo(minutos * ESCALA_AGENDA, 0)
      const nome = cartao.locator('button > span').nth(1)
      const b = await nome.boundingBox()
      expect(b!.y + b!.height).toBeLessThanOrEqual(box!.y + box!.height)
      expect(await cartao.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
      const botao = cartao.getByRole('button')
      if (info.project.name === 'mobile') await botao.tap()
      else { await botao.focus(); await page.keyboard.press('Enter') }
      const detalhes = page.getByRole('dialog', { name: 'Consultar agendamento' })
      await expect(detalhes.getByRole('heading', { name: 'Paciente Exemplo Sintético de Nome Muito Longo para Conferência de Leitura e Expansão', exact: true })).toBeVisible()
      await expect(detalhes.getByLabel('Resumo do horário')).toContainText(`${minutos} min`)
      if (id === 'curta-20') await expect(detalhes).toContainText('Disponibilidade: Sem expediente.')
      await detalhes.getByRole('button', { name: 'Fechar consulta' }).click()
      await expect(botao).toBeFocused()
    }
    await page.getByRole('button', { name: 'Ver dia inteiro' }).click()
    await page.getByRole('button', { name: 'Primeiro agendamento' }).click()
    await page.locator('.agenda-temporal-rolagem').evaluate(el => { el.scrollTop += 120 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `scratch/agenda-ux/fechamento/grade-curtas-${unidade}-${info.project.name}.png`, animations: 'disabled', fullPage: true })
  })
}

test('capturas finais: painéis preenchidos e sucesso externo após retorno sintético', async ({ page }, info) => {
  if (info.project.name === 'desktop') await page.setViewportSize({ width: 1440, height: 1180 })
  await abrir(page, '?complexa', 6)
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/lista-final-${info.project.name}.png`, animations: 'disabled', fullPage: true })
  let painel = await abrirCriacaoManual(page)
  await painel.getByRole('combobox', { name: 'Paciente', exact: true }).fill('Ana')
  await painel.getByRole('option', { name: 'Ana Exemplo Sintético', exact: true }).click()
  await painel.getByRole('checkbox', { name: /confirmo a marcação manual/ }).check()
  await expect(painel.getByRole('button', { name: 'Agendar', exact: true })).toBeEnabled()
  await painel.locator('.agenda-formulario-conteudo').evaluate(el => { el.scrollTop = 0 })
  await radioProfissional(painel, 'prof-2').focus()
  await geometria(painel)
  await visivelNoCorpo(painel, pacienteEscolhido(painel))
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/criacao-final-${info.project.name}.png`, animations: 'disabled' })
  await painel.getByRole('checkbox', { name: /confirmo a marcação manual/ }).focus()
  await visivelNoCorpo(painel, painel.getByRole('checkbox', { name: /confirmo a marcação manual/ }).locator('..'))
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/criacao-final-confirmacao-${info.project.name}.png`, animations: 'disabled' })
  await painel.getByRole('button', { name: 'Agendar', exact: true }).click()
  await expect(painel).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento criado' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await registro(page, 'ag-3').getByRole('button', { name: 'Editar agendamento' }).click()
  painel = page.getByRole('dialog', { name: 'Remarcar agendamento' })
  await painel.getByLabel('Novo horário', { exact: true }).fill('16:40')
  await painel.getByRole('button', { name: 'Outro', exact: true }).click()
  await painel.getByLabel('Motivo da correção').fill('Correção exclusivamente sintética para conferir a interface.')
  await painel.getByRole('checkbox', { name: /Conferi o horário/ }).check()
  await expect(painel.getByRole('button', { name: 'Confirmar remarcação' })).toBeEnabled()
  await painel.locator('.agenda-formulario-conteudo').evaluate(el => { el.scrollTop = 0 })
  await painel.getByLabel('Novo horário', { exact: true }).focus()
  await geometria(painel)
  await visivelNoCorpo(painel, painel.getByLabel('Novo horário', { exact: true }))
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/edicao-final-${info.project.name}.png`, animations: 'disabled' })
  await geometria(painel)
  await painel.getByRole('checkbox', { name: /Conferi o horário/ }).focus()
  await visivelNoCorpo(painel, painel.getByRole('checkbox', { name: /Conferi o horário/ }).locator('..'))
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/edicao-final-confirmacao-${info.project.name}.png`, animations: 'disabled' })
  await painel.getByRole('button', { name: 'Confirmar remarcação' }).click()
  await expect(painel).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Agendamento atualizado' })).toHaveCount(1)
  await expect(registro(page, 'ag-3')).toContainText('16:40–17:20')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `scratch/agenda-ux/fechamento/sucesso-final-${info.project.name}.png`, animations: 'disabled' })
})

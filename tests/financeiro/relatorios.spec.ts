import { expect, test, type Page } from '@playwright/test'

const item = {
  data: '2026-09-22T12:00:00Z', clinica: 'Clínica sintética', paciente: '=1+1', profissional: 'Dra. Sintética',
  formas_pagamento: [{ forma: 'dinheiro', valor: '0.00' }, { forma: 'pix', valor: '0.00' }],
  status: 'confirmado', valor_bruto: '0.00', valor_clinica: '0.00',
  valor_profissional: '0.00', valor_estornado: '0.00', valor_clinica_liquida: '0.00',
  valor_profissional_liquido: '0.00', valor_liquido_atual: '0.00', dinheiro: '0.00', pix: '0.00', cartao_credito: '0.00',
}

function pagina(itens: typeof item[], mais: boolean, marcador = 'marcador-estavel') {
  return { versao: 1, dataset: 'recebimentos', publico: 'proprietaria',
    inicio: '2026-09-01T03:00:00Z', fim: '2026-09-23T03:00:00Z', timezone: 'America/Bahia',
    contexto: 'contexto-sintetico', marcador, itens,
    totais: { quantidade: 2, bruto: '0.00', clinica_bruta: '0.00', profissional_bruta: '0.00',
      estornado: '0.00', clinica_liquida: '0.00', profissional_liquida: '0.00', liquido_atual: '0.00',
      dinheiro: '0.00', pix: '0.00', cartao_credito: '0.00' },
    pagina: { limite: 500, quantidade: itens.length, tem_mais: mais,
      proximo_cursor: mais ? { data: '2026-09-22T12:00:00Z', id: 'cursor-opaco', contexto: 'contexto-sintetico' } : null },
  }
}

async function preparar(page: Page, drift = false) {
  const chamadas: Array<{ nome: string; parametros: Record<string, unknown> }> = []
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    if (nome === 'profissionais') return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'prof-sintetico', nome_completo: 'Dra. Sintética' }]) })
    if (nome === 'pacientes') return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'pac-sintetico', nome_completo: 'Paciente Sintético' }]) })
    const parametros = route.request().method() === 'POST' ? route.request().postDataJSON() as Record<string, unknown> : {}
    if (nome.startsWith('financeiro_registrar_solicitacao_exportacao') || nome.startsWith('financeiro_relatorio_')) chamadas.push({ nome, parametros })
    let data: unknown = null
    if (nome === 'financeiro_registrar_solicitacao_exportacao') data = { solicitacao_id: 'solicitacao-sintetica', registrado_em: '2026-09-22T12:00:00Z' }
    else if (nome === 'financeiro_relatorio_recebimentos_proprietaria') {
      const cursor = parametros.p_cursor_id
      data = cursor ? pagina([item], false, drift ? 'marcador-alterado' : undefined)
        : parametros.p_limite === 1 ? pagina([item], true) : pagina([item], true)
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto('/tests/financeiro/relatorios.html')
  await page.getByRole('button', { name: 'Relatórios' }).click()
  await expect(page.getByRole('heading', { name: 'Relatórios financeiros' })).toBeVisible()
  await page.getByLabel('Relatório').selectOption('recebimentos')
  return chamadas
}

test('PDF coleta múltiplas páginas, revalida e registra solicitação antes da coleta', async ({ page }, info) => {
  test.setTimeout(90_000)
  const chamadas = await preparar(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Gerar PDF' }).click()
  const arquivo = await download
  expect(arquivo.suggestedFilename()).toMatch(/^FINANCEIRO_RECEBIMENTOS_\d{14}\.pdf$/)
  await expect(page.getByText('Arquivo PDF preparado para download.')).toBeVisible()
  expect(chamadas[0].nome).toBe('financeiro_registrar_solicitacao_exportacao')
  expect(chamadas[0].parametros.p_filtros).not.toHaveProperty('paciente_id')
  const coletas = chamadas.filter((chamada) => chamada.nome === 'financeiro_relatorio_recebimentos_proprietaria')
  expect(coletas).toHaveLength(3)
  expect(coletas[1].parametros.p_cursor_id).toBe('cursor-opaco')
  expect(coletas[2].parametros.p_limite).toBe(1)
  await page.screenshot({ path: `scratch/financeiro-relatorios-${info.project.name}.png`, fullPage: true })
})

test('drift bloqueia geração do arquivo e orienta repetir', async ({ page }) => {
  const chamadas = await preparar(page, true)
  let downloads = 0
  page.on('download', () => { downloads += 1 })
  await page.getByRole('button', { name: 'Gerar PDF' }).click()
  await expect(page.getByRole('alert')).toContainText('dados financeiros mudaram')
  expect(downloads).toBe(0)
  expect(chamadas[0].nome).toBe('financeiro_registrar_solicitacao_exportacao')
})

test('filtros por pessoa, forma e estado seguem para a RPC sem nomes na auditoria', async ({ page }) => {
  const chamadas = await preparar(page)
  await page.getByRole('combobox', { name: 'Profissional', exact: true }).selectOption('prof-sintetico')
  await page.getByRole('combobox', { name: 'Paciente', exact: true }).selectOption('pac-sintetico')
  await page.getByLabel('Forma').selectOption('pix')
  await page.getByLabel('Status do recebimento').selectOption('confirmado')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Gerar PDF' }).click()
  await download
  const auditoria = chamadas.find((c) => c.nome === 'financeiro_registrar_solicitacao_exportacao')!
  expect(auditoria.parametros.p_filtros).toMatchObject({ profissional_filtrado: true, paciente_filtrado: true,
    forma_pagamento: 'pix', status_recebimento: 'confirmado' })
  expect(JSON.stringify(auditoria.parametros)).not.toContain('Paciente Sintético')
  const coleta = chamadas.find((c) => c.nome === 'financeiro_relatorio_recebimentos_proprietaria')!
  expect(coleta.parametros).toMatchObject({ p_profissional_id: 'prof-sintetico', p_paciente_id: 'pac-sintetico',
    p_forma_pagamento: 'pix', p_status_recebimento: 'confirmado' })
})

test('médico exporta XLSX vazio do próprio universo sem enviar profissional_id', async ({ page }, info) => {
  const chamadas: Array<{ nome: string; parametros: Record<string, unknown> }> = []
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    if (route.request().method() !== 'POST') return route.fulfill({ contentType: 'application/json', body: '[]' })
    const parametros = route.request().postDataJSON() as Record<string, unknown>
    if (nome.startsWith('financeiro_registrar_solicitacao_exportacao') || nome.startsWith('financeiro_relatorio_')) chamadas.push({ nome, parametros })
    const data = nome === 'financeiro_registrar_solicitacao_exportacao'
      ? { solicitacao_id: 'solicitacao-sintetica', registrado_em: '2026-09-22T12:00:00Z' }
      : { versao: 1, dataset: 'repasses', publico: 'profissional', inicio: '2026-09-01T03:00:00Z',
        fim: '2026-09-23T03:00:00Z', timezone: 'America/Bahia', contexto: 'medico-contexto', marcador: 'vazio',
        itens: [], totais: { quantidade: 0, valor_bruto_profissional: '0.00', valor_estornos_antes_pagamento: '0.00',
          valor_ajustes_aplicados: '0.00', valor_liquido: '0.00' },
        pagina: { limite: 500, quantidade: 0, tem_mais: false, proximo_cursor: null } }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto('/tests/financeiro/relatorios.html?papel=medico')
  await page.getByRole('button', { name: 'Relatórios' }).click()
  await page.getByLabel('Relatório').selectOption('repasses')
  await expect(page.getByRole('option', { name: 'Fiscal interno' })).toHaveCount(0)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Gerar Excel' }).click()
  expect((await download).suggestedFilename()).toMatch(/^FINANCEIRO_REPASSES_\d{14}\.xlsx$/)
  await expect(page.getByText('Arquivo XLSX preparado para download.')).toBeVisible()
  expect(chamadas[0].parametros.p_dataset).toBe('financeiro_profissional')
  for (const chamada of chamadas.filter((c) => c.nome === 'financeiro_relatorio_repasses_profissional')) {
    expect(chamada.parametros).not.toHaveProperty('p_profissional_id')
  }
  await page.screenshot({ path: `scratch/financeiro-relatorios-medico-${info.project.name}.png`, fullPage: true })
})

import { expect, test, type Page } from '@playwright/test'

// Dados somente em memória, interceptados antes de qualquer serviço externo.
const comum = {
  producao: { quantidade: 24, pacientes_distintos: 24, bruto: '12480.00', clinica_bruta: '2496.00', profissional_bruta: '9984.00', estornos_coorte: '320.00', estornos_clinica: '64.00', estornos_profissional: '256.00', liquido_atual_coorte: '12160.00', clinica_liquida: '2432.00', profissional_liquida: '9728.00' },
  estornos_periodo: { quantidade: 2, total: '320.00', clinica: '64.00', profissional: '256.00' },
  pagamentos: { dinheiro: '2496.00', pix: '6240.00', cartao_credito: '3744.00' },
  repasses: { repasses_gerados_periodo: 3, valor_liquido_repasses_gerados_periodo: '9728.00', repasses_ajustados_gerados_periodo: 0, repasses_pagos_periodo: 2, valor_repasses_pagos_periodo: '4800.00', repasses_pendentes_atual: 3, valor_repasses_pendentes_atual: '4928.00', aplicacoes_ajustes_periodo: '0.00', aplicacoes_provisorias_repasses_gerados_periodo: '0.00', aplicacoes_compensadas_repasses_gerados_periodo: '0.00' },
  ajustes: { quantidade_pendente: 0, valor_pendente_atual: '0.00', saldo_contabil_negativo_pendente: '0.00' },
  series: [200, 500, 200, 600, 450, 200, 550, 650, 1100, 650, 1200, 980, 1700, 800, 1100, 1600].map((valor, i) => ({ dia: `2026-09-${String(i + 1).padStart(2, '0')}`, bruto: String(valor), liquido_atual_coorte: String(valor), estornos_eventos: '0.00', clinica_bruta: '0.00', profissional_bruta: '0.00', clinica_liquida: '0.00', profissional_liquida: '0.00', estornos_eventos_clinica: '0.00', estornos_eventos_profissional: '0.00' })),
}
function dashboard(medico = false, vazio = false) {
  const resumo = vazio ? { ...comum, producao: { ...comum.producao, quantidade: 0, bruto: '0.00', clinica_liquida: '0.00', profissional_liquida: '0.00', liquido_atual_coorte: '0.00' }, series: [] } : comum
  return { versao: 1, inicio: '2026-09-01T03:00:00Z', fim: '2026-10-01T03:00:00Z', timezone_series: 'America/Bahia', clinicas_autorizadas: ['clinica-sintetica'], consultado_em: '2026-09-23T12:00:00Z', escopos: {},
    resumo: medico ? { ...resumo, lista_repasses: [], lista_repasses_total: 0, lista_repasses_limite: 100 } : { ...resumo,
      fiscal: { pendente: 1, emissao_solicitada: 0, emitida: 0, erro_emissao: 0, cancelamento_solicitado: 0, cancelada: 0, erro_cancelamento: 0 },
      caixa: { situacao_operacional_atual: { aberto: 1, em_fechamento: 0, aguardando_aprovacao: 0, devolvido_para_correcao: 0 }, aprovados_periodo: { quantidade: 0, fechamentos_com_diferenca: 0, diferenca_total: '0.00', diferencas_positivas: '0.00', diferencas_negativas: '0.00' } } },
    ...(medico ? {} : { por_clinica: [], clinicas_total: 0, por_profissional: [], profissionais_total: 0, breakdown_limite: 100, alertas: [], alertas_total: 0, alertas_limite: 100 }) }
}
async function preparar(page: Page, estado: 'aberto' | 'legado' | 'erro' | 'vazio' = 'aberto') {
  const chamadas: string[] = []
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    chamadas.push(nome)
    const clinicaId = route.request().postDataJSON()?.p_clinica_id ?? 'clinica-sintetica'
    let data: unknown = []
    if (nome === 'financeiro_dashboard_proprietaria') data = dashboard(false, estado === 'vazio')
    else if (nome === 'financeiro_dashboard_profissional') data = dashboard(true)
    else if (nome === 'sessoes_caixa') {
      if (estado === 'erro') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Consulta indisponível.' }) })
      data = estado === 'vazio' ? null : { id: 'sessao-sintetica', status: 'aberto', aberto_em: '2026-09-23T11:15:00Z', valor_abertura: '100.00', idempotency_key: estado === 'legado' ? null : 'chave-sintetica' }
    }
    else if (nome === 'financeiro_resumo_caixa') data = { sessao_caixa_id: 'sessao-sintetica', clinica_id: clinicaId, clinica_nome: 'Clínica Brotas', status: 'aberto', aberto_em: '2026-09-23T11:15:00Z', aberto_por_nome: 'Recepção', resumo: { valor_abertura: '100.00', total_dinheiro: '580.00', total_pix: '300.00', total_cartao_credito: '200.00', total_recebimentos_brutos: '1080.00', total_suprimentos: '0.00', total_sangrias: '0.00', total_estornos_dinheiro: '0.00', valor_esperado: '680.00', total_clinica: '216.00', total_profissionais: '864.00' } }
    else if (nome === 'recebimentos') data = [
      { id: 'recebimento-sintetico', paciente_id: 'paciente-sintetico', profissional_id: 'profissional-sintetico', registrado_em: '2026-09-23T17:32:00Z', valor_bruto: '250.00', status: 'confirmado', recebimentos_pagamentos: [{ forma_pagamento: 'pix', valor: '250.00' }] },
      { id: 'recebimento-dois', paciente_id: 'paciente-dois', profissional_id: 'profissional-sintetico', registrado_em: '2026-09-23T14:15:00Z', valor_bruto: '180.00', status: 'confirmado', recebimentos_pagamentos: [{ forma_pagamento: 'dinheiro', valor: '180.00' }] },
    ]
    else if (nome === 'pacientes') data = [{ id: 'paciente-sintetico', nome_completo: 'Maria Exemplo' }, { id: 'paciente-dois', nome_completo: 'João Exemplo' }]
    else if (nome === 'profissionais') data = [{ id: 'profissional-sintetico', nome_completo: 'Dra. Ana Exemplo' }]
    else if (nome === 'estornos') data = [{ id: 'estorno-sintetico', recebimento_id: 'recebimento-sintetico', status: 'solicitado', valor_total: '50.00', motivo: 'Solicitação para revisão', solicitado_em: '2026-09-23T14:00:00Z', estornos_pagamentos: [{ forma_pagamento: 'pix', valor: '50.00' }] }]
    else if (nome === 'repasses') data = [{ id: 'repasse-sintetico', profissional_id: 'profissional-sintetico', gerado_em: '2026-09-22T12:00:00Z', confirmado_em: null, status: 'pendente', valor_bruto_profissional: '400.00', valor_estornos_antes_pagamento: '50.00', valor_ajustes_aplicados: '25.00', valor_liquido: '325.00', meio_pagamento: null, referencia_pagamento: null, observacao: null }]
    else if (nome === 'documentos_fiscais') data = [{ id: 'documento-sintetico', recebimento_id: 'recebimento-sintetico', status: 'pendente', created_at: '2026-09-23T12:00:00Z', updated_at: '2026-09-23T12:00:00Z', solicitado_em: null, emitido_em: null, cancelamento_solicitado_em: null, cancelado_em: null, numero_documento: null, serie: null }]
    else if (nome === 'fechamentos_caixa') data = null
    else if (nome === 'financeiro_relatorio_recebimentos_proprietaria') data = { versao: 1, dataset: 'recebimentos', publico: 'proprietaria', inicio: '2026-09-01T03:00:00Z', fim: '2026-10-01T03:00:00Z', timezone: 'America/Bahia', contexto: 'visual-sintetico', marcador: 'visual-sintetico', itens: [{ data: '2026-09-23T12:00:00Z', paciente: 'Maria Exemplo', profissional: 'Dra. Ana Exemplo', valor_bruto: '250.00' }], totais: { quantidade: 1 }, pagina: { limite: 20, quantidade: 1, tem_mais: false, proximo_cursor: null } }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  return chamadas
}
test('conceito aprovado: seis telas, navegação, contraste da sidebar e responsividade', async ({ page }, info) => {
  const chamadas = await preparar(page)
  const erros: string[] = []
  page.on('pageerror', (erro) => erros.push(erro.message))
  await page.goto('/tests/financeiro/visual.html')
  await expect(page.getByText('R$ 12.480,00', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Iniciar fechamento', exact: true })).toBeVisible()
  const corMenu = await page.locator('#app-sidebar').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(corMenu).toBe('rgb(23, 36, 75)')
  const telas = [['Visão geral', 'visao-geral'], ['Caixa', 'caixa'], ['Estornos', 'estornos'], ['Repasses', 'repasses'], ['Fiscal', 'fiscal'], ['Relatórios', 'relatorios']]
  for (const [nome, arquivo] of telas) {
    await page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: nome, exact: true }).click()
    if (nome === 'Caixa') await expect(page.getByText('Dinheiro esperado', { exact: true })).toBeVisible()
    if (nome === 'Estornos') await expect(page.getByRole('heading', { name: 'Aguardando sua revisão' })).toBeVisible()
    if (nome === 'Repasses') await expect(page.getByText('Dra. Ana Exemplo', { exact: true })).toBeVisible()
    if (nome === 'Fiscal') await expect(page.getByText('Maria Exemplo', { exact: true })).toBeVisible()
    if (nome === 'Relatórios') { await page.getByRole('button', { name: 'Aplicar filtros' }).click(); await expect(page.getByRole('region', { name: 'Resultado do relatório' }).getByText('Maria Exemplo').filter({ visible: true })).toBeVisible() }
    await expect(page.locator('.finance-skeleton')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: `scratch/fase14-approved-concept/${info.project.name}-${arquivo}.png`, fullPage: true })
  }
  if (info.project.name !== 'desktop') {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await expect(page.getByRole('dialog', { name: 'Menu principal' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused()
  }
  await page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: 'Visão geral' }).click()
  await page.getByRole('button', { name: 'Iniciar fechamento', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: 'Caixa' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(chamadas.some((nome) => /financeiro_(iniciar|abrir|registrar|solicitar|confirmar)/.test(nome))).toBe(false)
  await page.getByRole('combobox', { name: 'Selecionar clínica', exact: true }).selectOption('clinica-alternativa')
  await expect.poll(() => page.locator('#app-sidebar').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(22, 52, 71)')
  expect(erros).toEqual([])
})
test('médico não faz consultas operacionais e estados sem dados não inventam números', async ({ page }, info) => {
  const chamadas = await preparar(page, 'vazio')
  await page.goto('/tests/financeiro/visual.html?papel=medico')
  await expect(page.getByRole('heading', { name: 'Meu financeiro' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Meus repasses' })).toBeVisible()
  expect(chamadas).toEqual(['financeiro_dashboard_profissional'])
  await expect(page.getByRole('button', { name: 'Caixa', exact: true })).toHaveCount(0)
  await page.screenshot({ path: `scratch/fase14-approved-concept/${info.project.name}-medico.png`, fullPage: true })
  await page.goto('/tests/financeiro/visual.html')
  await expect(page.getByText('Seu movimento começa aqui')).toBeVisible()
  await expect(page.getByText('Nenhum pagamento no período')).toBeVisible()
  await page.screenshot({ path: `scratch/fase14-approved-concept/${info.project.name}-vazio.png`, fullPage: true })
})
test('caixa legado e erro de consulta não viram saldo zero nem abertura disponível', async ({ page }) => {
  await preparar(page, 'legado')
  await page.goto('/tests/financeiro/visual.html')
  await expect(page.getByText('Caixa anterior aguardando transição')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir caixa', exact: true })).toHaveCount(0)
  await page.unrouteAll()
  await preparar(page, 'erro')
  await page.reload()
  await expect(page.getByText('Não foi possível consultar o caixa')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir caixa', exact: true })).toHaveCount(0)
})

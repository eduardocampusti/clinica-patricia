import { expect, test, type Page } from '@playwright/test'

const comum = {
  producao: { quantidade: 2, pacientes_distintos: 2, bruto: '500.00', clinica_bruta: '100.00',
    profissional_bruta: '400.00', estornos_coorte: '50.00', estornos_clinica: '10.00',
    estornos_profissional: '40.00', liquido_atual_coorte: '450.00', clinica_liquida: '90.00', profissional_liquida: '360.00' },
  estornos_periodo: { quantidade: 1, total: '50.00', clinica: '10.00', profissional: '40.00' },
  pagamentos: { dinheiro: '200.00', pix: '300.00', cartao_credito: '0.00' },
  repasses: { repasses_gerados_periodo: 1, valor_liquido_repasses_gerados_periodo: '360.00',
    repasses_ajustados_gerados_periodo: 0, repasses_pagos_periodo: 1, valor_repasses_pagos_periodo: '360.00',
    repasses_pendentes_atual: 0, valor_repasses_pendentes_atual: '0.00', aplicacoes_ajustes_periodo: '0.00',
    aplicacoes_provisorias_repasses_gerados_periodo: '0.00', aplicacoes_compensadas_repasses_gerados_periodo: '0.00' },
  ajustes: { quantidade_pendente: 0, valor_pendente_atual: '0.00', saldo_contabil_negativo_pendente: '0.00' },
  series: [{ dia: '2026-09-22', bruto: '500.00', liquido_atual_coorte: '450.00', estornos_eventos: '50.00',
    clinica_bruta: '100.00', profissional_bruta: '400.00', clinica_liquida: '90.00', profissional_liquida: '360.00',
    estornos_eventos_clinica: '10.00', estornos_eventos_profissional: '40.00' }],
}

async function preparar(page: Page, papel: 'medico' | 'proprietaria') {
  const chamadas: Array<{ nome: string; parametros: Record<string, unknown> }> = []
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    chamadas.push({ nome, parametros: route.request().postDataJSON() })
    const proprietaria = nome === 'financeiro_dashboard_proprietaria'
    const data = { versao: 1, inicio: '2026-09-01T03:00:00Z', fim: '2026-10-01T03:00:00Z',
      timezone_series: 'America/Bahia', clinicas_autorizadas: ['clinica-sintetica'],
      consultado_em: '2026-09-22T12:00:00Z', escopos: {},
      resumo: proprietaria ? { ...comum,
        fiscal: { pendente: 1, emissao_solicitada: 0, emitida: 0, erro_emissao: 0,
          cancelamento_solicitado: 0, cancelada: 0, erro_cancelamento: 0 },
        caixa: { situacao_operacional_atual: { aberto: 1, em_fechamento: 0, aguardando_aprovacao: 0, devolvido_para_correcao: 0 },
          aprovados_periodo: { quantidade: 0, fechamentos_com_diferenca: 0, diferenca_total: '0.00', diferencas_positivas: '0.00', diferencas_negativas: '0.00' } },
      } : { ...comum, lista_repasses: [{ id: 'repasse-sintetico', data: '2026-09-22T12:00:00Z',
        clinica_id: 'clinica-sintetica', clinica_nome: 'Clínica demonstração', valor_bruto_profissional: '400.00',
        valor_estornos_antes_pagamento: '40.00', valor_ajustes_aplicados: '0.00', valor_liquido: '360.00',
        status: 'pago', confirmado_em: '2026-09-22T13:00:00Z', meio_pagamento: 'pix' }], lista_repasses_total: 1, lista_repasses_limite: 100 },
      ...(proprietaria ? { por_clinica: [{ clinica_id: 'clinica-sintetica', nome: 'Clínica demonstração', resumo: { ...comum,
        fiscal: { pendente: 1 }, caixa: { situacao_operacional_atual: { aberto: 1 }, aprovados_periodo: { diferenca_total: '0.00' } } } }],
        clinicas_total: 1, por_profissional: [{ profissional_id: 'profissional-sintetico', nome: 'Médica demonstração', resumo: comum }], profissionais_total: 1, breakdown_limite: 100,
        alertas: [], alertas_total: 0, alertas_limite: 100 } : {}),
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto(`/tests/financeiro/painel.html?papel=${papel}`)
  return chamadas
}

test('médico vê exclusivamente próprio painel sem parâmetro profissional nem caixa', async ({ page }, info) => {
  const chamadas = await preparar(page, 'medico')
  await expect(page.getByRole('heading', { name: 'Meu financeiro' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Meus repasses' })).toBeVisible()
  await expect(page.getByText('Bruto R$ 400,00 · Estornos antes do pagamento R$ 40,00 · Ajustes R$ 0,00')).toBeVisible()
  await expect(page.getByText('Líquido R$ 360,00')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fiscal e caixa' })).toHaveCount(0)
  await expect(page.getByText('R$ 450,00', { exact: true }).first()).toBeVisible()
  await page.screenshot({ path: `scratch/financeiro-painel-medico-${info.project.name}.png`, fullPage: true })
  expect(chamadas[0].nome).toBe('financeiro_dashboard_profissional')
  expect(chamadas[0].parametros.p_clinica_id).toBe('clinica-sintetica')
  expect(chamadas[0].parametros).not.toHaveProperty('p_profissional_id')
})

test('proprietária vê fiscal, caixa e escopo de todas as clínicas autorizadas', async ({ page }, info) => {
  const chamadas = await preparar(page, 'proprietaria')
  await expect(page.getByRole('heading', { name: 'Painel financeiro' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fiscal e caixa' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Por profissional' })).toBeVisible()
  await expect(page.getByText('Médica demonstração')).toBeVisible()
  await expect(page.getByText('Produção líquida R$ 450,00')).toBeVisible()
  await page.getByLabel('Todas as minhas clínicas').check()
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect.poll(() => chamadas.length).toBeGreaterThan(1)
  expect(chamadas.at(-1)?.parametros.p_clinica_id).toBeNull()
  await page.screenshot({ path: `scratch/financeiro-painel-proprietaria-${info.project.name}.png`, fullPage: true })
})

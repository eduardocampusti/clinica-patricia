import { expect, test, type Page } from '@playwright/test'

type Estado = 'vazio' | 'legado' | 'aberto'
async function preparar(page: Page, estadoInicial: Estado, papel = 'recepcao') {
  let estado = estadoInicial
  const chamadas: Array<{ nome: string; parametros: Record<string, unknown> }> = []
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    let data: unknown = []
    if (nome === 'sessoes_caixa') data = estado === 'vazio' ? null : {
      id: 'sessao-sintetica', status: 'aberto', aberto_em: '2026-09-22T12:00:00Z',
      valor_abertura: estado === 'legado' ? '150.50' : '0.00',
      idempotency_key: estado === 'legado' ? null : 'chave-sintetica',
    }
    else if (nome === 'financeiro_resumo_caixa') data = {
      sessao_caixa_id: 'sessao-sintetica', clinica_id: 'clinica-sintetica', clinica_nome: 'Clínica demonstração',
      status: 'aberto', aberto_em: '2026-09-22T12:00:00Z', aberto_por_nome: 'Recepção',
      resumo: { valor_abertura: '0.00', total_dinheiro: '200.00', total_pix: '300.00',
        total_cartao_credito: '0.00', total_recebimentos_brutos: '500.00',
        total_suprimentos: '0.00', total_sangrias: '0.00', total_estornos_dinheiro: '0.00',
        valor_esperado: '200.00', total_clinica: '123.45', total_profissionais: '376.55' },
    }
    else if (nome === 'sangrias_caixa') data = []
    else if (nome === 'fechamentos_caixa') data = null
    else if (nome === 'financeiro_abrir_caixa' || nome === 'financeiro_registrar_suprimento') {
      chamadas.push({ nome, parametros: route.request().postDataJSON() })
      if (nome === 'financeiro_abrir_caixa') estado = 'aberto'
      data = { nova_operacao: true, status: 'aberto' }
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto(`/tests/financeiro/caixa.html?papel=${papel}`)
  return chamadas
}

test('sessão legada fica isolada, sem ação de abertura ou mutação', async ({ page }) => {
  const chamadas = await preparar(page, 'legado')
  await expect(page.getByRole('heading', { name: 'Sessão legada em aberto' })).toBeVisible()
  await expect(page.getByText('R$ 150,50')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir caixa' })).toHaveCount(0)
  expect(chamadas).toHaveLength(0)
})

test('médico não consulta nem opera caixa', async ({ page }) => {
  const chamadas = await preparar(page, 'aberto', 'medico')
  await expect(page.getByText('O caixa operacional é restrito')).toBeVisible()
  await expect(page.getByText('Dinheiro esperado')).toHaveCount(0)
  expect(chamadas).toHaveLength(0)
})

test('abre caixa por RPC e mostra resumo oficial sem soma local', async ({ page }, info) => {
  const chamadas = await preparar(page, 'vazio')
  await expect(page.getByRole('heading', { name: 'Nenhum caixa ativo' })).toBeVisible()
  await page.getByRole('button', { name: 'Abrir caixa' }).click()
  await page.getByLabel('Valor em reais').fill('0,00')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('R$ 200,00', { exact: true }).first()).toBeVisible()
  await page.screenshot({ path: `scratch/financeiro-caixa-${info.project.name}.png`, fullPage: true })
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].nome).toBe('financeiro_abrir_caixa')
  expect(Object.keys(chamadas[0].parametros).sort()).toEqual(['p_clinica_id', 'p_idempotency_key', 'p_valor_abertura'])
})

test('suprimento envia valor e motivo por RPC com chave estável', async ({ page }) => {
  const chamadas = await preparar(page, 'aberto')
  await expect(page.getByText('Dinheiro esperado')).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar suprimento' }).click()
  await page.getByLabel('Valor em reais').fill('35,25')
  await page.getByLabel('Motivo').fill('Troco para a recepção')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Adicionar suprimento concluído' })).toBeVisible()
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].nome).toBe('financeiro_registrar_suprimento')
  expect(chamadas[0].parametros.p_valor).toBe(35.25)
  expect(chamadas[0].parametros.p_motivo).toBe('Troco para a recepção')
})

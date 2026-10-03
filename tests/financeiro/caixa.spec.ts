import { expect, test, type Page } from '@playwright/test'

type Estado = 'vazio' | 'legado' | 'aberto'
async function preparar(page: Page, estadoInicial: Estado, papel = 'recepcao') {
  let estado = estadoInicial
  let status = 'aberto'
  let sangria: Record<string, unknown> | null = null
  let fechamento: Record<string, unknown> | null = null
  let revisaoObservacao: string | null = null
  let tentativaFechamento = 0
  const chamadas: Array<{ nome: string; parametros: Record<string, unknown> }> = []
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    let data: unknown = []
    if (nome === 'sessoes_caixa') data = estado === 'vazio' || status === 'aprovado' ? null : {
      id: 'sessao-sintetica', status, aberto_em: '2026-09-22T12:00:00Z',
      valor_abertura: estado === 'legado' ? '150.50' : '0.00',
      idempotency_key: estado === 'legado' ? null : 'chave-sintetica',
    }
    else if (nome === 'financeiro_resumo_caixa') data = {
      sessao_caixa_id: 'sessao-sintetica', clinica_id: 'clinica-sintetica', clinica_nome: 'Clínica demonstração',
      status, aberto_em: '2026-09-22T12:00:00Z', aberto_por_nome: 'Recepção',
      resumo: { valor_abertura: '0.00', total_dinheiro: '200.00', total_pix: '300.00',
        total_cartao_credito: '0.00', total_recebimentos_brutos: '500.00',
        total_suprimentos: '0.00', total_sangrias: '0.00', total_estornos_dinheiro: '0.00',
        valor_esperado: '200.00', total_clinica: '123.45', total_profissionais: '376.55' },
    }
    else if (nome === 'sangrias_caixa') data = sangria ? [sangria] : []
    else if (nome === 'fechamentos_caixa') data = fechamento
    else if (nome === 'revisoes_fechamento_caixa') data = revisaoObservacao ? { observacao: revisaoObservacao } : null
    else if (nome.startsWith('financeiro_') && nome !== 'financeiro_resumo_caixa') {
      chamadas.push({ nome, parametros: route.request().postDataJSON() })
      if (nome === 'financeiro_abrir_caixa') estado = 'aberto'
      if (nome === 'financeiro_solicitar_sangria') sangria = {
        id: 'sangria-sintetica', valor: '25.00', motivo: 'Retirada autorizada', status: 'solicitada',
        solicitado_em: '2026-09-22T12:00:00Z', observacao_revisao: null,
      }
      if (nome === 'financeiro_revisar_sangria' && sangria) sangria.status = route.request().postDataJSON().p_acao === 'aprovar' ? 'aprovada' : 'rejeitada'
      if (nome === 'financeiro_efetivar_sangria' && sangria) sangria.status = 'efetivada'
      if (nome === 'financeiro_iniciar_fechamento') status = 'em_fechamento'
      if (nome === 'financeiro_enviar_fechamento') {
        status = 'aguardando_aprovacao'
        tentativaFechamento++
        revisaoObservacao = null
        fechamento = { id: `fechamento-sintetico-${tentativaFechamento}`, tentativa: tentativaFechamento, status: 'aguardando_aprovacao',
          valor_esperado: '200.00', valor_contado: '190.00', diferenca: '-10.00',
          justificativa_diferenca: 'Diferença conferida', enviado_em: '2026-09-22T12:00:00Z' }
      }
      if (nome === 'financeiro_revisar_fechamento' && fechamento) {
        status = route.request().postDataJSON().p_acao === 'aprovar' ? 'aprovado' : 'devolvido_para_correcao'
        revisaoObservacao = route.request().postDataJSON().p_observacao
        fechamento.status = status === 'aprovado' ? 'aprovado' : 'devolvido'
      }
      data = { nova_operacao: true, status }
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto(`/tests/financeiro/caixa.html?papel=${papel}`)
  return chamadas
}

test('sessão legada fica isolada, sem ação de abertura ou mutação', async ({ page }) => {
  const chamadas = await preparar(page, 'legado')
  await expect(page.getByRole('heading', { name: 'Caixa antigo em aberto' })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Caixa fechado' })).toBeVisible()
  await page.getByRole('button', { name: 'Abrir caixa' }).click()
  await page.getByLabel('Valor disponível para troco').fill('0,00')
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
  await page.getByLabel('Valor', { exact: true }).fill('35,25')
  await page.getByLabel('Motivo').fill('Troco para a recepção')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Adicionar suprimento concluído' })).toBeVisible()
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].nome).toBe('financeiro_registrar_suprimento')
  expect(chamadas[0].parametros.p_valor).toBe(35.25)
  expect(chamadas[0].parametros.p_motivo).toBe('Troco para a recepção')
})

test('sangria percorre solicitação, revisão e efetivação antes do fechamento', async ({ page }) => {
  const chamadas = await preparar(page, 'aberto', 'proprietaria')
  await expect(page.getByText('Dinheiro esperado')).toBeVisible()
  await page.getByRole('button', { name: 'Solicitar sangria' }).click()
  await page.getByLabel('Valor', { exact: true }).fill('25,00')
  await page.getByLabel('Motivo').fill('Retirada autorizada')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('button', { name: 'Iniciar fechamento' })).toBeDisabled()
  await page.getByRole('button', { name: 'Aprovar', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.getByRole('button', { name: 'Efetivar' }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('button', { name: 'Iniciar fechamento' })).toBeEnabled()
  expect(chamadas.map((chamada) => chamada.nome)).toEqual([
    'financeiro_solicitar_sangria', 'financeiro_revisar_sangria', 'financeiro_efetivar_sangria',
  ])
})

test('fechamento divergente exige justificativa e revisão da proprietária', async ({ page }) => {
  const chamadas = await preparar(page, 'aberto', 'proprietaria')
  await expect(page.getByText('Dinheiro esperado')).toBeVisible()
  await page.getByRole('button', { name: 'Iniciar fechamento' }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.getByRole('button', { name: 'Conferir e enviar fechamento' }).click()
  await page.getByLabel('Dinheiro contado').fill('190,00')
  await expect(page.getByLabel('Justificativa da diferença')).toBeVisible()
  await page.getByLabel('Justificativa da diferença').fill('Diferença conferida')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Tentativa 1')).toBeVisible()
  await page.getByRole('button', { name: 'Aprovar fechamento' }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('heading', { name: 'Caixa fechado' })).toBeVisible()
  expect(chamadas.map((chamada) => chamada.nome)).toEqual([
    'financeiro_iniciar_fechamento', 'financeiro_enviar_fechamento', 'financeiro_revisar_fechamento',
  ])
  expect(chamadas[1].parametros.p_justificativa_diferenca).toBe('Diferença conferida')
})

test('devolução preserva orientação e gera nova tentativa de fechamento', async ({ page }) => {
  const chamadas = await preparar(page, 'aberto', 'proprietaria')
  await expect(page.getByText('Dinheiro esperado')).toBeVisible()
  await page.getByRole('button', { name: 'Iniciar fechamento' }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.getByRole('button', { name: 'Conferir e enviar fechamento' }).click()
  await page.getByLabel('Dinheiro contado').fill('200,00')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.getByRole('button', { name: 'Devolver para correção' }).click()
  await page.getByLabel('Observação').fill('Conferir cédulas novamente')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Orientação da revisão: Conferir cédulas novamente')).toBeVisible()
  await page.getByRole('button', { name: 'Conferir e enviar fechamento' }).click()
  await page.getByLabel('Dinheiro contado').fill('200,00')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Tentativa 2')).toBeVisible()
  expect(chamadas.filter((chamada) => chamada.nome === 'financeiro_enviar_fechamento')).toHaveLength(2)
})

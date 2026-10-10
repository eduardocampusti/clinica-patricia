import { expect, test, type Page, type Locator } from '@playwright/test'

type Opcoes = { estado?: string; papel?: string; mais?: boolean; erro?: boolean; extratoErro?: boolean; pendente?: boolean; incerto?: boolean; demora?: number; vazio?: boolean; restrito?: boolean; nomesLongos?: boolean }
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export async function prepararIntegracao(page: Page, opcoes: Opcoes = {}) {
  const mutacoes: { nome: string; parametros: Record<string, unknown> }[] = []
  const leituras: URL[] = []
  let status = opcoes.estado ?? 'aberto'
  let sangriaStatus = opcoes.pendente ? 'solicitada' : 'efetivada'
  let ultimo: Record<string, unknown> | null = null
  let suprimento = opcoes.mais ? 180 : 0
  let pago = false
  let sessaoIpupiara = id(100)
  const pacienteNome = opcoes.nomesLongos ? 'Luiza Exemplo com nome sintético extenso para conferir quebra de linhas no recebimento' : 'Luiza Exemplo'
  const profissionalNome = opcoes.nomesLongos ? 'Helena Exemplo com nome profissional sintético extenso para conferir o painel' : 'Helena Exemplo'
  const atendidas = new Set<string>()
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    const q = url.searchParams
    const corpo = route.request().postDataJSON()
    const clinicaId = q.get('clinica_id')?.replace('eq.', '') ?? corpo?.p_clinica_id ?? (corpo?.p_sessao_caixa_id === id(101) ? 'demo-brotas' : 'demo-ipupiara')
    const sessaoAtiva = clinicaId === 'demo-brotas' ? id(101) : sessaoIpupiara
    let data: unknown = []
    if (route.request().method() === 'GET') leituras.push(url)
    if (nome === 'sessoes_caixa') {
      if (q.get('select') === 'id,aberto_em') data = [{ id: id(100), aberto_em: '2026-10-03T10:42:00Z' }, { id: id(99), aberto_em: '2026-10-02T10:00:00Z' }]
      else if (q.has('status')) data = ['sem_caixa', 'aprovado'].includes(status) ? null : { id: sessaoAtiva, status, aberto_em: '2026-10-03T10:42:00Z', valor_abertura: '150.00', idempotency_key: status === 'legado' ? null : 'synthetic-key' }
      else data = [{ id: id(100), clinica_id: clinicaId, status, aberto_em: '2026-10-03T10:42:00Z', fechado_em: null, valor_abertura: '150.00', idempotency_key: 'synthetic-key' }, { id: id(99), clinica_id: clinicaId, status: 'aprovado', aberto_em: '2026-10-02T10:00:00Z', fechado_em: '2026-10-02T20:00:00Z', valor_abertura: '80.00', idempotency_key: 'old-key' }, { id: id(98), clinica_id: clinicaId, status: 'fechado', aberto_em: '2026-10-01T10:00:00Z', fechado_em: '2026-10-01T20:00:00Z', valor_abertura: '50.00', idempotency_key: null }]
    } else if (nome === 'financeiro_resumo_caixa') {
      const body = route.request().postDataJSON()
      leituras.push(url)
      if (opcoes.demora) await new Promise(r => setTimeout(r, opcoes.demora))
      if (opcoes.erro) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Serviço indisponível"}' })
      if (opcoes.restrito) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"code":"42501","message":"acesso negado"}' })
      data = { sessao_caixa_id: body.p_sessao_caixa_id, clinica_id: clinicaId, clinica_nome: clinicaId === 'demo-brotas' ? 'Clínica Brotas' : 'Clínica Ipupiara', status,
        aberto_em: '2026-10-03T10:42:00Z', aberto_por_nome: 'Ana Exemplo',
        resumo: { valor_abertura: '150.00', total_dinheiro: pago ? '470.00' : '370.00', total_pix: pago ? '450.00' : '330.00', total_cartao_credito: '200.00', total_recebimentos_brutos: pago ? '1120.00' : '900.00', total_suprimentos: suprimento.toFixed(2), total_sangrias: '100.00', total_estornos_dinheiro: '50.00', valor_esperado: (370 + suprimento + (pago ? 100 : 0)).toFixed(2), total_clinica: '180.00', total_profissionais: '720.00' } }
      if (opcoes.vazio) (data as { resumo: Record<string, string> }).resumo = Object.fromEntries(['valor_abertura', 'total_dinheiro', 'total_pix', 'total_cartao_credito', 'total_recebimentos_brutos', 'total_suprimentos', 'total_sangrias', 'total_estornos_dinheiro', 'valor_esperado', 'total_clinica', 'total_profissionais'].map(k => [k, '0.00']))
    } else if (nome === 'sangrias_caixa') {
      const sangria = { id: id(70), valor: '100.00', motivo: 'Guarda do dinheiro', status: sangriaStatus, solicitado_em: '2026-10-03T10:00:00Z', observacao_revisao: null }
      data = opcoes.vazio ? [] : q.has('status') ? ['solicitada', 'aprovada'].includes(sangriaStatus) ? [{ id: id(70) }] : [] : [sangria]
    } else if (nome === 'fechamentos_caixa') data = q.get('limit') === '21' ? ultimo ? [ultimo] : [] : ultimo
    else if (nome === 'revisoes_fechamento_caixa') data = null
    else if (nome === 'movimentos_caixa') {
      if (opcoes.extratoErro) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"code":"42501","message":"acesso negado"}' })
      const recebimentos = [220, 270, 210, 200].map((valor, i) => ({ id: id(30 - i), recebimento_id: id(50 + i), estorno_id: null, tipo: 'recebimento', valor: valor.toFixed(2), motivo: null }))
      let itens = [...recebimentos, { id: id(26), recebimento_id: null, estorno_id: null, tipo: 'sangria', valor: '100.00', motivo: 'Guarda do dinheiro' }, { id: id(25), recebimento_id: id(60), estorno_id: id(80), tipo: 'estorno', valor: '50.00', motivo: 'Correção aprovada' },
        ...Array.from({ length: opcoes.mais ? 18 : 0 }, (_, i) => ({ id: id(24 - i), recebimento_id: null, estorno_id: null, tipo: 'suprimento', valor: '10.00', motivo: `Reforço de troco ${i + 1}` }))]
      const cursor = q.get('or')?.match(/id\.lt\.([\w-]+)/)?.[1]
      if (cursor) itens = itens.filter(m => m.id < cursor)
      if (q.has('tipo')) itens = itens.filter(m => m.tipo === q.get('tipo')!.replace('eq.', ''))
      data = itens.slice(0, Number(q.get('limit') ?? 21)).map(m => ({ ...m, clinica_id: clinicaId, sessao_caixa_id: sessaoAtiva, registrado_em: '2026-10-03T11:00:00Z' }))
      if (opcoes.vazio) data = []
    } else if (nome === 'recebimentos') {
      if (q.get('select') === 'agendamento_id') data = pago ? [{ agendamento_id: id(200) }] : []
      else data = [
        { id: id(50), pagamentos: [{ forma_pagamento: 'dinheiro', valor: '100.00' }, { forma_pagamento: 'pix', valor: '120.00' }] },
        { id: id(51), pagamentos: [{ forma_pagamento: 'dinheiro', valor: '270.00' }] }, { id: id(52), pagamentos: [{ forma_pagamento: 'pix', valor: '210.00' }] }, { id: id(53), pagamentos: [{ forma_pagamento: 'cartao_credito', valor: '200.00' }] }, { id: id(60), pagamentos: [{ forma_pagamento: 'dinheiro', valor: '100.00' }, { forma_pagamento: 'pix', valor: '120.00' }] },
      ].filter(r => q.get('id')?.includes(r.id)).map(r => ({ id: r.id, clinica_id: clinicaId, paciente_id: id(10), profissional_id: id(11), sessao_caixa_id: r.id === id(60) ? id(99) : sessaoAtiva, recebimentos_pagamentos: r.pagamentos }))
    } else if (nome === 'estornos') data = [{ id: id(80), recebimento_id: id(60), estornos_pagamentos: [{ forma_pagamento: 'dinheiro', valor: '50.00' }] }]
    else if (nome === 'pacientes') data = [{ id: id(10), nome_completo: pacienteNome }]
    else if (nome === 'profissionais') data = [{ id: id(11), nome_completo: profissionalNome }]
    else if (nome === 'usuarios_clinicas') data = { papel: opcoes.papel ?? 'recepcao' }
    else if (nome === 'profissionais_clinicas') data = q.get('select') === 'valor_consulta' ? { valor_consulta: '220.00' } : [{ profissionais: { id: id(11), nome_completo: profissionalNome, duracao_consulta_minutos: 30, valor_consulta: 999, especialidades: { nome: 'Clínica geral' } } }]
    else if (nome === 'disponibilidade_padrao') data = [{ id: id(13), profissional_id: id(11), dia_semana: new Date().getDay(), hora_inicio: '07:00', hora_fim: '19:00' }]
    else if (nome === 'agendamentos') data = [{ id: id(200), profissional_id: id(11), paciente_id: id(10), data: '2026-10-04', hora_inicio: '08:00', hora_fim: '08:30', status: 'confirmado', observacoes: null, pacientes: { nome_completo: pacienteNome } }]
    else if (nome.startsWith('financeiro_')) {
      const parametros = route.request().postDataJSON()
      mutacoes.push({ nome, parametros })
      const chave = String(parametros.p_idempotency_key ?? `${nome}:${parametros.p_sessao_caixa_id}`)
      if (!atendidas.has(chave)) {
        atendidas.add(chave)
        if (nome === 'financeiro_registrar_suprimento') suprimento += parametros.p_valor
        if (nome === 'financeiro_solicitar_sangria') sangriaStatus = 'solicitada'
        if (nome === 'financeiro_abrir_caixa') status = 'aberto'
        if (nome === 'financeiro_iniciar_fechamento') status = 'em_fechamento'
        if (nome === 'financeiro_enviar_fechamento') { status = 'aguardando_aprovacao'; ultimo = { id: id(300), tentativa: 1, status: 'aguardando_aprovacao', valor_esperado: '370.00', valor_contado: String(parametros.p_valor_contado), diferenca: (parametros.p_valor_contado - 370).toFixed(2), justificativa_diferenca: parametros.p_justificativa_diferenca, enviado_em: '2026-10-04T11:00:00Z' } }
        if (nome === 'financeiro_registrar_recebimento') pago = true
      }
      if (opcoes.demora) await new Promise(r => setTimeout(r, opcoes.demora))
      if (opcoes.incerto && mutacoes.length === 1) return route.abort('failed')
      data = nome === 'financeiro_registrar_recebimento' ? { recebimento_id: id(500), agendamento_id: id(200), clinica_id: clinicaId, paciente_id: id(10), profissional_id: id(11), sessao_caixa_id: id(100), valor_bruto: '220.00', valor_clinica: '44.00', valor_profissional: '176.00', status: 'confirmado', status_fiscal: 'pendente', registrado_em: '2026-10-04T11:00:00Z', pagamentos: parametros.p_pagamentos, nova_operacao: mutacoes.length === 1 } : { nova_operacao: true, status }
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto(`/tests/financeiro/recepcao-integracao.html?papel=${opcoes.papel ?? 'recepcao'}`)
  return { mutacoes, leituras, trocarSessao: () => { sessaoIpupiara = id(102) }, operacoesEfetivadas: () => atendidas.size }
}

async function receber(page: Page) {
  await page.getByRole('button', { name: 'Receber pagamento', exact: true }).click()
  await expect(page.getByText('Selecione o agendamento de')).toBeVisible()
  await page.getByRole('button', { name: /08:00 Luiza Exemplo/ }).click()
  await page.getByRole('button', { name: 'Receber pagamento', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Dinheiro', exact: true })).toBeVisible()
}

test('resumo oficial, sessão atravessando dias, estorno sem reduzir bruto', async ({ page }, info) => {
  const c = await prepararIntegracao(page)
  await expect(page.getByTestId('esperado')).toHaveText('R$ 370,00')
  await expect(page.getByTestId('recebido')).toHaveText('R$ 900,00')
  await expect(page.getByText('Abertura 03/10/2026, 07:42')).toBeVisible()
  await expect(page.getByText(/A receber hoje/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Conferir fechamento', exact: true })).toBeVisible()
  expect(c.mutacoes).toHaveLength(0)
  await expect(page.getByRole('heading', { name: 'Movimentações desta sessão' })).toBeVisible()
  await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(6)
  await page.screenshot({ path: `scratch/caixa-integracao/${info.project.name}-aberto.png`, fullPage: true })
  await page.getByRole('button', { name: 'Alternar tema do teste' }).click()
  await page.screenshot({ path: `scratch/caixa-integracao/${info.project.name}-escuro.png`, fullPage: true })
})

test('paginação por cursor e filtro global sem duplicar split ou estorno', async ({ page }) => {
  const c = await prepararIntegracao(page, { mais: true })
  await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(20)
  const primeira = await page.locator('.cr-tabela tbody tr').allTextContents()
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(4)
  expect(await page.locator('.cr-tabela tbody tr').allTextContents()).not.toEqual(primeira)
  await expect(page.getByTestId('esperado')).toHaveText('R$ 550,00')
  await page.getByLabel('Tipo de movimento').selectOption('estorno')
  await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: /^Detalhes de Luiza/ }).click()
  await expect(page.getByRole('dialog')).toContainText('Recebimento original em outra sessão')
  await expect(page.getByRole('dialog')).toContainText('R$ 50,00')
  await expect(page.getByRole('dialog').getByText('Pix', { exact: true })).toHaveCount(0)
  expect(c.leituras.filter(u => u.pathname.endsWith('movimentos_caixa')).every(u => u.searchParams.get('clinica_id') === 'eq.demo-ipupiara' && u.searchParams.get('sessao_caixa_id') === `eq.${id(100)}`)).toBeTruthy()
  expect(c.leituras.some(u => u.searchParams.get('or')?.includes('id.lt.'))).toBeTruthy()
  expect(c.mutacoes).toHaveLength(0)
})

test('Agenda, formas escolhidas, split 120+100, troco 50 e duplo envio', async ({ page }, info) => {
  const c = await prepararIntegracao(page, { demora: 200 })
  await receber(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('input[inputmode="decimal"]')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Dinheiro', exact: true }).click()
  await dialog.getByLabel('Dinheiro', { exact: true }).fill('100,00')
  await dialog.getByLabel('Adicionar forma').selectOption('pix')
  await expect(dialog.getByLabel('Adicionar forma').locator('option[value="dinheiro"]')).toHaveCount(0)
  await dialog.getByLabel('PIX', { exact: true }).fill('120,00')
  await dialog.getByLabel('Dinheiro entregue pelo paciente').fill('150,00')
  await expect(dialog.getByText('R$ 50,00', { exact: true })).toBeVisible()
  await page.screenshot({ path: `scratch/caixa-integracao/${info.project.name}-split-troco.png` })
  await dialog.getByRole('button', { name: 'Revisar recebimento' }).click()
  await dialog.getByRole('button', { name: 'Confirmar pagamento' }).evaluate((el: HTMLButtonElement) => { el.click(); el.click() })
  await expect(dialog.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible()
  expect(c.mutacoes).toHaveLength(1)
  expect(c.mutacoes[0].parametros.p_pagamentos).toEqual([{ forma_pagamento: 'dinheiro', valor: 100 }, { forma_pagamento: 'pix', valor: 120 }])
  expect(Object.keys(c.mutacoes[0].parametros).sort()).toEqual(['p_agendamento_id', 'p_idempotency_key', 'p_pagamentos'])
  await expect(dialog.getByRole('button', { name: /Imprimir|recibo/i })).toHaveCount(0)
})

test('resposta incerta conserva solicitação e chave no retry manual', async ({ page }) => {
  const c = await prepararIntegracao(page, { incerto: true })
  await receber(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'PIX', exact: true }).click()
  await dialog.getByRole('button', { name: 'Revisar recebimento' }).click()
  await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Pagamento confirmado' })).toHaveCount(0)
  await page.waitForTimeout(250)
  expect(c.mutacoes).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible()
  expect(c.mutacoes).toHaveLength(2)
  expect(c.mutacoes[0]).toEqual(c.mutacoes[1])
  expect(c.operacoesEfetivadas()).toBe(1)
})

test('painel não inicia fechamento; continuar após fechar e recarregar', async ({ page }, info) => {
  const c = await prepararIntegracao(page)
  await page.getByRole('button', { name: 'Conferir fechamento', exact: true }).click()
  expect(c.mutacoes).toHaveLength(0)
  await expect(page.getByRole('dialog')).toContainText('Fechar esta janela depois não desfaz')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Conferir fechamento', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Conferir fechamento', exact: true }).click()
  await page.getByRole('button', { name: 'Iniciar fechamento', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continuar conferência' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar conferência' }).click()
  await page.getByLabel('Dinheiro contado').fill('367,00')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continuar conferência' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Abrir caixa', exact: true })).toHaveCount(0)
  expect(c.mutacoes.map(m => m.nome)).toEqual(['financeiro_iniciar_fechamento'])
  await page.reload()
  await page.getByRole('button', { name: 'Continuar conferência' }).click()
  await expect(page.getByLabel('Dinheiro contado')).toHaveValue('')
  await page.getByLabel('Dinheiro contado').fill('368,00')
  await page.getByLabel('Justificativa da diferença').fill('Diferença identificada na contagem.')
  await expect(page.getByRole('dialog')).toContainText('-R$ 2,00')
  await page.screenshot({ path: `scratch/caixa-integracao/${info.project.name}-fechamento.png` })
  await page.getByRole('button', { name: 'Enviar para aprovação', exact: true }).click()
  await expect(page.getByText('Contagem enviada; aguardando revisão da proprietária.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir caixa' })).toHaveCount(0)
  expect(c.mutacoes.map(m => m.nome)).toEqual(['financeiro_iniciar_fechamento', 'financeiro_enviar_fechamento'])
})

test('sangria solicitada não reduz esperado e bloqueia fechamento', async ({ page }) => {
  const c = await prepararIntegracao(page)
  await page.getByRole('button', { name: 'Sangria', exact: true }).click()
  await page.getByLabel('Valor', { exact: true }).fill('80,00')
  await page.getByLabel('Motivo').fill('Guarda pela gestão')
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Conferir fechamento' })).toBeDisabled()
  await expect(page.getByTestId('esperado')).toHaveText('R$ 370,00')
  expect(c.mutacoes[0].nome).toBe('financeiro_solicitar_sangria')
})

test('suprimento altera dinheiro, preserva bruto e descarta resposta de outra clínica', async ({ page }) => {
  const c = await prepararIntegracao(page, { demora: 200 })
  await page.getByRole('button', { name: 'Suprimento', exact: true }).click()
  await page.getByLabel('Valor', { exact: true }).fill('30,00')
  await page.getByLabel('Motivo').fill('Reforço de troco')
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(page.getByTestId('esperado')).toHaveText('R$ 400,00')
  await expect(page.getByTestId('recebido')).toHaveText('R$ 900,00')
  await page.getByRole('button', { name: 'Suprimento', exact: true }).click()
  await page.getByLabel('Valor', { exact: true }).fill('10,00')
  await page.getByLabel('Motivo').fill('Outra entrada')
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('teste-trocar-clinica')))
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.cr-identificacao')).toContainText('Clínica Brotas')
  await page.waitForTimeout(300)
  await expect(page.getByText('Adicionar suprimento concluído')).toHaveCount(0)
  expect(c.mutacoes).toHaveLength(2)
})

for (const estado of ['sem_caixa', 'legado', 'erro', 'extratoErro']) {
  test(`estado ${estado} distinto de zero e sem operação automática`, async ({ page }) => {
    const c = await prepararIntegracao(page, { estado: estado === 'erro' || estado === 'extratoErro' ? 'aberto' : estado, erro: estado === 'erro', extratoErro: estado === 'extratoErro' })
    if (estado === 'sem_caixa') await expect(page.getByRole('heading', { name: 'Caixa fechado' })).toBeVisible()
    else if (estado === 'legado') { await expect(page.getByRole('heading', { name: 'Caixa antigo em aberto' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Abrir caixa' })).toHaveCount(0) }
    else if (estado === 'erro') { await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByRole('heading', { name: 'Caixa fechado' })).toHaveCount(0); await expect(page.getByTestId('esperado')).toHaveCount(0) }
    else { await expect(page.getByText('Movimentações indisponíveis')).toBeVisible(); await expect(page.getByTestId('esperado')).toHaveText('R$ 370,00') }
    expect(c.mutacoes).toHaveLength(0)
  })
}

test('histórico autorizado, legado preservado e fundo anterior não reutilizado', async ({ page }) => {
  const c = await prepararIntegracao(page, { estado: 'sem_caixa' })
  await page.getByRole('button', { name: 'Histórico de caixas' }).click()
  await page.getByRole('button', { name: 'Detalhes do caixa aberto em 01/10/2026, 07:00' }).click()
  await expect(page.getByRole('dialog')).toContainText('Caixa legado preservado')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Abrir caixa', exact: true }).click()
  await expect(page.getByLabel('Fundo inicial contado')).toHaveValue('')
  await page.getByLabel('Fundo inicial contado').fill('0,00')
  await page.getByRole('button', { name: 'Abrir caixa com R$ 0,00' }).click()
  await expect(page.getByTestId('esperado')).toBeVisible()
  expect(c.mutacoes[0].parametros.p_valor_abertura).toBe(0)
})

test('perfil gerencial e médico preservados; Recepção mantém Caixa Estornos Fiscal', async ({ page }) => {
  await prepararIntegracao(page)
  const nav = page.getByRole('navigation', { name: 'Áreas do Financeiro' })
  await expect(nav.getByRole('button')).toHaveCount(3)
  await page.getByLabel('Perfil do teste').selectOption('proprietaria')
  await expect(nav.getByRole('button')).toHaveCount(6)
  await nav.getByRole('button', { name: 'Caixa', exact: true }).click()
  await expect(page.getByText('Parcela dos profissionais')).toBeVisible()
  await page.getByLabel('Perfil do teste').selectOption('medico')
  await expect(nav.getByRole('button')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Caixa da recepção' })).toHaveCount(0)
})

test('formulários 360/390/430, teclado, foco e ações acessíveis', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Larguras adicionais exercitadas somente no projeto móvel.')
  await prepararIntegracao(page)
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.locator('details.cr-composicao[open]')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    await page.getByRole('button', { name: 'Suprimento', exact: true }).click()
    const d = page.getByRole('dialog')
    await expect(d.locator('h2')).toBeFocused()
    for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); expect(await d.evaluate(el => el.contains(document.activeElement))).toBeTruthy() }
    await d.getByRole('button', { name: 'Confirmar', exact: true }).scrollIntoViewIfNeeded()
    const b = await d.getByRole('button', { name: 'Confirmar', exact: true }).boundingBox()
    expect(b!.y + b!.height).toBeLessThanOrEqual(844)
    expect(await d.evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Suprimento', exact: true })).toBeFocused()
    await page.screenshot({ path: `scratch/caixa-integracao/mobile-${width}.png`, fullPage: true })
  }
})

test('carregamento, caixa vazio e recusa de acesso têm mensagens próprias', async ({ page }) => {
  let c = await prepararIntegracao(page, { vazio: true, demora: 350 })
  await expect(page.getByRole('status', { name: 'Carregando caixa' })).toBeVisible()
  await expect(page.getByTestId('esperado')).toHaveText('R$ 0,00')
  await expect(page.getByText('Recebimentos, suprimentos, sangrias e estornos efetivados aparecerão aqui.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Caixa fechado' })).toHaveCount(0)
  expect(c.mutacoes).toHaveLength(0)
  await page.unrouteAll({ behavior: 'wait' })
  c = await prepararIntegracao(page, { restrito: true })
  await expect(page.getByText('Acesso ao caixa restrito')).toBeVisible()
  await expect(page.getByTestId('esperado')).toHaveCount(0)
  expect(c.mutacoes).toHaveLength(0)
})

for (const estado of ['em_fechamento', 'devolvido_para_correcao', 'aguardando_aprovacao']) {
  test(`recupera estado ${estado} sem criar nova abertura nem receber`, async ({ page }) => {
    const c = await prepararIntegracao(page, { estado })
    await expect(page.getByTestId('esperado')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Receber pagamento', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Abrir caixa', exact: true })).toHaveCount(0)
    if (estado === 'aguardando_aprovacao') await expect(page.getByText('Contagem enviada; aguardando revisão da proprietária.')).toBeVisible()
    else await expect(page.getByRole('button', { name: 'Continuar conferência', exact: true })).toBeVisible()
    expect(c.mutacoes).toHaveLength(0)
  })
}

test('remover forma limpa parcela; quitação e dinheiro insuficiente bloqueiam', async ({ page }) => {
  const c = await prepararIntegracao(page)
  await receber(page)
  const d = page.getByRole('dialog')
  await d.getByRole('button', { name: 'Dinheiro', exact: true }).click()
  await d.getByLabel('Dinheiro', { exact: true }).fill('100,00')
  await d.getByLabel('Adicionar forma').selectOption('pix')
  await d.getByLabel('PIX', { exact: true }).fill('120,00')
  await d.getByLabel('Dinheiro entregue pelo paciente').fill('90,00')
  await expect(d.getByRole('button', { name: 'Revisar recebimento' })).toBeDisabled()
  await expect(d.getByRole('alert')).toContainText('cobrir a parcela em dinheiro')
  await d.getByLabel('Dinheiro entregue pelo paciente').fill('150,00')
  await d.getByRole('button', { name: 'Remover PIX', exact: true }).click()
  await expect(d.getByLabel('PIX', { exact: true })).toHaveCount(0)
  await expect(d.getByRole('button', { name: 'Revisar recebimento' })).toBeDisabled()
  await d.getByLabel('Adicionar forma').selectOption('pix')
  await expect(d.getByLabel('PIX', { exact: true })).toHaveValue('')
  expect(c.mutacoes).toHaveLength(0)
})

test('clínica muda durante confirmação e descarta sucesso tardio do recebimento', async ({ page }) => {
  const c = await prepararIntegracao(page, { demora: 500 })
  await receber(page)
  const d = page.getByRole('dialog')
  await d.getByRole('button', { name: 'PIX', exact: true }).click()
  await d.getByRole('button', { name: 'Revisar recebimento' }).click()
  await d.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('teste-trocar-clinica')))
  await expect(d).toHaveCount(0)
  await page.waitForTimeout(600)
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toHaveCount(0)
  expect(c.mutacoes).toHaveLength(1)
})

test('revisão: parcelas relacionadas indisponíveis não geram composição falsa', async ({ page }) => {
  const c = await prepararIntegracao(page)
  await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(6)
  await page.route('**/rest/v1/recebimentos?*', async route => {
    const url = new URL(route.request().url())
    if (!url.searchParams.get('select')?.includes('recebimentos_pagamentos')) return route.fallback()
    const recebimentos = [[], [{ forma_pagamento: 'dinheiro', valor: '270.00' }], [{ forma_pagamento: 'pix', valor: '210.00' }], [{ forma_pagamento: 'cartao_credito', valor: '200.00' }]]
      .map((pagamentos, i) => ({ id: id(50 + i), clinica_id: 'demo-ipupiara', paciente_id: id(10), profissional_id: id(11), sessao_caixa_id: id(100), recebimentos_pagamentos: pagamentos }))
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(recebimentos) })
  })
  await page.getByLabel('Tipo de movimento').selectOption('recebimento')
  await expect(page.getByRole('alert')).toContainText('Movimentações indisponíveis')
  await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(0)
  await expect(page.getByTestId('esperado')).toHaveText('R$ 370,00')
  expect(c.mutacoes).toHaveLength(0)
})

async function controleAlcancavel(controle: Locator, altura: number) {
  await expect(controle).toBeVisible()
  const caixa = await controle.boundingBox()
  expect(caixa!.y).toBeGreaterThanOrEqual(0)
  expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(altura)
  expect(await controle.evaluate(el => {
    const r = el.getBoundingClientRect()
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
  })).toBeTruthy()
}

test('revisão: recebimento longo tem rolagem, teclado, validação e confirmação alcançáveis', async ({ page }, info) => {
  test.setTimeout(90000)
  const widths = info.project.name === 'desktop' ? [1440] : [360, 390, 430]
  for (const width of widths) {
    await page.unrouteAll({ behavior: 'wait' })
    await page.setViewportSize({ width, height: info.project.name === 'desktop' ? 1000 : 844 })
    const c = await prepararIntegracao(page, { nomesLongos: true })
    await receber(page)
    let d = page.getByRole('dialog')
    await expect(d.getByRole('heading', { name: 'Receber pagamento', exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(d).toHaveCount(0)
    await expect(page.getByRole('button', { name: /08:00 Luiza Exemplo/ })).toBeFocused()
    await page.getByRole('button', { name: /08:00 Luiza Exemplo/ }).click()
    await page.getByRole('button', { name: 'Receber pagamento', exact: true }).click()
    d = page.getByRole('dialog')
    await d.getByRole('button', { name: 'Dinheiro', exact: true }).click()
    await d.getByLabel('Dinheiro', { exact: true }).fill('100,00')
    await d.getByLabel('Adicionar forma').selectOption('pix')
    await d.getByLabel('PIX', { exact: true }).fill('110,00')
    const resumo = d.locator('[aria-live="polite"].numero-tabular')
    await resumo.scrollIntoViewIfNeeded()
    await expect(resumo).toContainText('Total distribuídoR$ 210,00')
    await expect(resumo).toContainText('RestanteR$ 10,00')
    await expect(d.getByRole('button', { name: 'Revisar recebimento' })).toBeDisabled()
    await d.getByLabel('PIX', { exact: true }).fill('130,00')
    await resumo.scrollIntoViewIfNeeded()
    await expect(resumo).toContainText('ExcedenteR$ 10,00')
    await expect(d.getByRole('button', { name: 'Revisar recebimento' })).toBeDisabled()
    await d.getByLabel('PIX', { exact: true }).fill('120,00')
    await d.getByLabel('Adicionar forma').selectOption('cartao_credito')
    await expect(d.getByLabel('Cartão de crédito', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    await expect(d.getByText(/Informe um valor maior que zero/)).toBeVisible()
    await d.getByRole('button', { name: 'Remover Cartão de crédito' }).click()
    await d.getByLabel('Dinheiro entregue pelo paciente').fill('99,00')
    await expect(d.getByRole('alert')).toContainText('cobrir a parcela em dinheiro')
    await expect(d.getByLabel('Dinheiro entregue pelo paciente')).toHaveAttribute('aria-describedby', 'troco-ajuda')
    await expect(d.getByRole('button', { name: 'Revisar recebimento' })).toBeDisabled()
    await d.getByLabel('Dinheiro entregue pelo paciente').fill('150,00')
    await expect(d.getByText('R$ 50,00', { exact: true })).toBeVisible()
    // Navegação real por Tab traz o botão abaixo da captura inicial para a área visível.
    const revisar = d.getByRole('button', { name: 'Revisar recebimento' })
    for (let i = 0; i < 25 && !await revisar.evaluate(el => el === document.activeElement); i++) {
      await page.keyboard.press('Tab')
      expect(await d.evaluate(el => el.contains(document.activeElement))).toBeTruthy()
    }
    await expect(revisar).toBeFocused()
    await controleAlcancavel(revisar, page.viewportSize()!.height)
    expect(await d.evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy()
    await resumo.scrollIntoViewIfNeeded()
    await expect(resumo).toContainText('Total distribuídoR$ 220,00')
    await expect(resumo).toContainText('RestanteR$ 0,00ExcedenteR$ 0,00')
    await revisar.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `scratch/caixa-revisao/recebimento-${width}-rodape.png` })
    await revisar.press('Enter')
    await expect(d.getByRole('heading', { name: 'Confirmar recebimento' })).toBeFocused()
    const confirmar = d.getByRole('button', { name: 'Confirmar pagamento' })
    for (let i = 0; i < 8 && !await confirmar.evaluate(el => el === document.activeElement); i++) await page.keyboard.press('Tab')
    await expect(confirmar).toBeFocused()
    await controleAlcancavel(confirmar, page.viewportSize()!.height)
    await page.screenshot({ path: `scratch/caixa-revisao/recebimento-${width}-confirmacao.png` })
    await confirmar.press('Enter')
    await expect(d.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible()
    await expect(d.locator('dl').filter({ hasText: 'Valor recebido' })).toContainText('Valor recebidoR$ 220,00')
    expect(c.mutacoes).toHaveLength(1)
    expect(c.mutacoes[0].parametros.p_pagamentos).toEqual([{ forma_pagamento: 'dinheiro', valor: 100 }, { forma_pagamento: 'pix', valor: 120 }])
    expect(Object.keys(c.mutacoes[0].parametros).sort()).toEqual(['p_agendamento_id', 'p_idempotency_key', 'p_pagamentos'])
  }
})

test('revisão: histórico com 45 sessões tem cursor completo, desempate e retorno', async ({ page }) => {
  const c = await prepararIntegracao(page)
  await expect(page.getByTestId('esperado')).toBeVisible()
  const leituras: URL[] = []
  const sessoes = Array.from({ length: 45 }, (_, i) => ({ id: id(900 - i), clinica_id: 'demo-ipupiara', status: 'aprovado', aberto_em: `2026-09-${String(30 - Math.floor(i / 3)).padStart(2, '0')}T10:00:00Z`, fechado_em: '2026-10-01T20:00:00Z', valor_abertura: '0.00', idempotency_key: 'synthetic-history' }))
  await page.route('**/rest/v1/sessoes_caixa?*', async route => {
    const u = new URL(route.request().url())
    if (!u.searchParams.get('select')?.includes('fechado_em')) return route.fallback()
    leituras.push(u)
    const cursor = u.searchParams.get('or')?.match(/aberto_em\.lt\.([^,]+),and\(aberto_em\.eq\.[^,]+,id\.lt\.([\w-]+)\)/)
    const itens = sessoes.filter(s => !cursor || s.aberto_em < cursor[1] || s.aberto_em === cursor[1] && s.id < cursor[2])
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(itens.slice(0, Number(u.searchParams.get('limit')))) })
  })
  await page.getByRole('button', { name: 'Histórico de caixas' }).click()
  const d = page.getByRole('dialog')
  const listas: string[][] = []
  for (const quantidade of [20, 20, 5]) {
    await expect(d.locator('li')).toHaveCount(quantidade)
    listas.push(await d.locator('li').allTextContents())
    if (quantidade !== 5) await d.getByRole('button', { name: 'Próxima', exact: true }).click()
  }
  await expect(d.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled()
  expect(listas.flat()).toEqual(sessoes.map(s => `Abertura ${new Date(s.aberto_em).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}Fechamento aprovadoDetalhes`))
  await d.getByRole('button', { name: 'Anterior', exact: true }).click()
  await expect(d.locator('li')).toHaveCount(20)
  expect(await d.locator('li').allTextContents()).toEqual(listas[1])
  expect(leituras.every(u => u.searchParams.get('clinica_id') === 'eq.demo-ipupiara' && u.searchParams.get('order') === 'aberto_em.desc,id.desc' && u.searchParams.get('limit') === '21')).toBeTruthy()
  expect(leituras.slice(1).every(u => u.searchParams.get('or')?.includes('id.lt.'))).toBeTruthy()
  expect(leituras[1].searchParams.get('or')).toContain(`id.lt.${sessoes[19].id}`)
  expect(leituras[2].searchParams.get('or')).toContain(`id.lt.${sessoes[39].id}`)
  expect(c.mutacoes).toHaveLength(0)
})

test('revisão: extrato atravessa páginas sem omitir ou duplicar movimentos', async ({ page }) => {
  const c = await prepararIntegracao(page, { mais: true })
  const tabela = page.locator('.cr-tabela tbody tr')
  await expect(tabela).toHaveCount(20)
  const primeira = await tabela.allTextContents()
  const motivos: string[] = []
  async function conferirSuprimentos() {
    for (const botao of await page.getByRole('button', { name: /^Detalhes de Suprimento/ }).all()) {
      await botao.click()
      const d = page.getByRole('dialog')
      motivos.push((await d.getByText(/^Motivo:/).innerText()).replace('Motivo: ', ''))
      await d.getByRole('button', { name: 'Fechar detalhes', exact: true }).click()
    }
  }
  await conferirSuprimentos()
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(tabela).toHaveCount(4)
  const segunda = await tabela.allTextContents()
  await conferirSuprimentos()
  expect(motivos).toEqual(Array.from({ length: 18 }, (_, i) => `Reforço de troco ${i + 1}`))
  expect(new Set(motivos).size).toBe(18)
  await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Anterior', exact: true }).click()
  await expect(tabela).toHaveCount(20)
  expect(await tabela.allTextContents()).toEqual(primeira)
  expect([...primeira, ...segunda]).toHaveLength(24)
  expect(primeira.filter(s => /R\$\s220,00/.test(s))).toHaveLength(1)
  await page.getByLabel('Tipo de movimento').selectOption('suprimento')
  await expect(tabela).toHaveCount(18)
  expect(await tabela.allTextContents()).toEqual([...primeira, ...segunda].filter(s => s.includes('Suprimento')))
  await expect(page.getByTestId('esperado')).toHaveText('R$ 550,00')
  await expect(page.getByText('Busca limitada a esta página', { exact: false })).toBeVisible()
  expect(c.leituras.filter(u => u.pathname.endsWith('movimentos_caixa')).every(u => u.searchParams.get('order') === 'registrado_em.desc,id.desc')).toBeTruthy()
  expect(c.mutacoes).toHaveLength(0)
})

test('revisão: sessão substituída reinicia página e seleção do extrato', async ({ page }) => {
  const c = await prepararIntegracao(page, { mais: true })
  await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(20)
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(4)
  c.trocarSessao()
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
  await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(20)
  await expect(page.getByText('Página 1 · 20 movimentos carregados')).toBeVisible()
  expect(c.leituras.some(u => u.searchParams.get('sessao_caixa_id') === `eq.${id(102)}`)).toBeTruthy()
  expect(c.mutacoes).toHaveLength(0)
})

for (const problema of ['soma divergente', 'forma repetida', 'estorno sem parcelas']) {
  test(`revisão: composição inválida bloqueia extrato (${problema})`, async ({ page }) => {
    const c = await prepararIntegracao(page)
    await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(6)
    if (problema === 'estorno sem parcelas') {
      await page.route('**/rest/v1/estornos?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: id(80), recebimento_id: id(60), estornos_pagamentos: [] }]) }))
      await page.getByLabel('Tipo de movimento').selectOption('estorno')
    } else {
      await page.route('**/rest/v1/recebimentos?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { id: id(50), clinica_id: 'demo-ipupiara', paciente_id: id(10), profissional_id: id(11), sessao_caixa_id: id(100), recebimentos_pagamentos: [{ forma_pagamento: 'dinheiro', valor: '100.00' }, { forma_pagamento: problema === 'forma repetida' ? 'dinheiro' : 'pix', valor: problema === 'soma divergente' ? '119.00' : '120.00' }] },
        ...[270, 210, 200].map((v, i) => ({ id: id(51 + i), clinica_id: 'demo-ipupiara', paciente_id: id(10), profissional_id: id(11), sessao_caixa_id: id(100), recebimentos_pagamentos: [{ forma_pagamento: ['dinheiro', 'pix', 'cartao_credito'][i], valor: v.toFixed(2) }] })),
      ]) }))
      await page.getByLabel('Tipo de movimento').selectOption('recebimento')
    }
    await expect(page.getByRole('alert')).toContainText('Movimentações indisponíveis')
    await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(0)
    await expect(page.getByTestId('esperado')).toHaveText('R$ 370,00')
    await expect(page.getByTestId('recebido')).toHaveText('R$ 900,00')
    expect(c.mutacoes).toHaveLength(0)
  })
}

for (const contexto of ['filtro', 'clínica', 'sessão']) {
  test(`revisão: resposta atrasada descartada ao mudar ${contexto}`, async ({ page }) => {
    const c = await prepararIntegracao(page)
    await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(6)
    let liberar!: () => void
    let iniciou!: () => void
    let terminou!: () => void
    const espera = new Promise<void>(resolve => { liberar = resolve })
    const inicio = new Promise<void>(resolve => { iniciou = resolve })
    const fim = new Promise<void>(resolve => { terminou = resolve })
    await page.route('**/rest/v1/movimentos_caixa?*', async route => {
      const u = new URL(route.request().url())
      if (u.searchParams.get('tipo') !== 'eq.estorno' || u.searchParams.get('sessao_caixa_id') !== `eq.${id(100)}`) return route.fallback()
      iniciou()
      await espera
      await route.fallback()
      terminou()
    })
    await page.getByLabel('Tipo de movimento').selectOption('estorno')
    await inicio
    if (contexto === 'filtro') await page.getByLabel('Tipo de movimento').selectOption('recebimento')
    else if (contexto === 'clínica') await page.getByRole('button', { name: 'Trocar clínica do teste' }).click()
    else { c.trocarSessao(); await page.getByRole('button', { name: 'Atualizar', exact: true }).click() }
    await expect(page.locator('.cr-tabela tbody tr')).toHaveCount(contexto === 'filtro' ? 4 : 6)
    const atual = await page.locator('.cr-tabela tbody tr').allTextContents()
    liberar()
    await fim
    await page.waitForTimeout(100)
    expect(await page.locator('.cr-tabela tbody tr').allTextContents()).toEqual(atual)
    await expect(page.getByLabel('Tipo de movimento')).toHaveValue(contexto === 'filtro' ? 'recebimento' : '')
    if (contexto === 'clínica') await expect(page.locator('.cr-identificacao')).toContainText('Clínica Brotas')
    await expect(page.getByTestId('esperado')).toHaveText('R$ 370,00')
    expect(c.mutacoes).toHaveLength(0)
  })
}

test('revisão: tentativas de fechamento paginam além de vinte com revisões vinculadas', async ({ page }) => {
  const c = await prepararIntegracao(page)
  await expect(page.getByTestId('esperado')).toBeVisible()
  const leituras: URL[] = []
  const tentativas = Array.from({ length: 23 }, (_, i) => ({ id: id(600 - i), tentativa: 23 - i, status: 'devolvido', valor_esperado: '370.00', valor_contado: '368.00', diferenca: '-2.00', justificativa_diferenca: `Contagem ${23 - i}`, enviado_em: '2026-10-03T11:00:00Z' }))
  await page.route('**/rest/v1/fechamentos_caixa?*', async route => {
    const u = new URL(route.request().url())
    if (u.searchParams.get('limit') !== '21') return route.fallback()
    leituras.push(u)
    const limite = Number(u.searchParams.get('tentativa')?.replace('lt.', '') ?? Infinity)
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(tentativas.filter(t => t.tentativa < limite).slice(0, 21)) })
  })
  await page.route('**/rest/v1/revisoes_fechamento_caixa?*', route => {
    const u = new URL(route.request().url())
    if (!u.searchParams.get('fechamento_id')?.startsWith('in.')) return route.fallback()
    leituras.push(u)
    const revisoes = tentativas.filter(t => u.searchParams.get('fechamento_id')?.includes(t.id)).map(t => ({ fechamento_id: t.id, observacao: `Revisão da tentativa ${t.tentativa}`, revisado_em: '2026-10-03T12:00:00Z', acao: 'devolver' }))
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(revisoes) })
  })
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
  await page.getByText('Histórico das tentativas de fechamento', { exact: true }).click()
  const historico = page.locator('details').filter({ hasText: 'Histórico das tentativas de fechamento' })
  await expect(historico.locator('li')).toHaveCount(20)
  await expect(historico.locator('li').first()).toContainText('Tentativa 23')
  await expect(historico.locator('li').first()).toContainText('Revisão da tentativa 23')
  await historico.getByRole('button', { name: 'Tentativas mais antigas' }).click()
  await expect(historico.locator('li')).toHaveCount(3)
  expect(await historico.locator('li strong').allTextContents()).toEqual(['Tentativa 3 · Devolvida', 'Tentativa 2 · Devolvida', 'Tentativa 1 · Devolvida'])
  await expect(historico.getByRole('button', { name: 'Tentativas mais antigas' })).toBeDisabled()
  expect(leituras.every(u => u.searchParams.get('clinica_id') === 'eq.demo-ipupiara')).toBeTruthy()
  expect(leituras.filter(u => u.pathname.endsWith('fechamentos_caixa')).every(u => u.searchParams.get('sessao_caixa_id') === `eq.${id(100)}` && u.searchParams.get('order') === 'tentativa.desc')).toBeTruthy()
  expect(c.mutacoes).toHaveLength(0)
})

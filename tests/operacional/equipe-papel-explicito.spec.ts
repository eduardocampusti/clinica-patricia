import { expect, test, type Page } from '@playwright/test'
import { abrirAcessoFicha } from './equipe-ficha-helpers'

// Serviços simulados; destinos externos não previstos são bloqueados.
const clinicas = [{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }]
const pessoas = [
  { id: 'admin', nome_completo: 'Administrativa Sintética', tipo: 'administrativo', cargo: 'Administração', profissao: null },
  { id: 'saude', nome_completo: 'Enfermagem Sintética', tipo: 'profissional_saude', cargo: 'Enfermagem', profissao: 'Enfermagem' },
].map((pessoa) => ({ ...pessoa, clinicas, revisao: 1, acesso_status: 'sem_conta', email_contato: 'pessoa@synthetic.invalid',
  telefone: null, conselho_classe: null, registro_conselho: null, conselho_uf: null, especialidade_id: null, especialidade_nome: null }))
type Pedido = { acao: string; membroId?: string; clinicaContextoId: string; clinicaAlvoId?: string; acaoAcesso?: string; papel?: string; modo?: string; conviteId?: string; clinicasPapeis?: { clinica_id: string; papel: string }[] }

async function preparar(page: Page) {
  const estado = { conta: false, pendente: false, conviteStatus: 'enviado' as 'enviado' | 'erro', escritas: [] as Pedido[], falha: '' as '' | 'validacao' | 'rede',
    antesEscrita: null as null | (() => Promise<void>), papeis: {} as Record<string, string> }
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const responder = (corpo: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(corpo) })
    if (url.pathname.endsWith('/rpc/equipe_listar')) return responder(pessoas)
    if (url.pathname.endsWith('/rpc/equipe_detalhar')) return responder({ ...pessoas.find((pessoa) => pessoa.id === route.request().postDataJSON().p_membro_id), cpf: null, cpf_situacao: 'ausente' })
    if (url.pathname.endsWith('/clinicas')) return responder(clinicas)
    if (url.pathname.endsWith('/functions/v1/equipe-acessos')) {
      const pedido = route.request().postDataJSON() as Pedido
      if (pedido.acao === 'listar') return responder({ membro_id: pedido.membroId, usuario_id: estado.conta ? 'usuario-sintetico' : null,
        login_email: estado.conta ? 'pessoa@synthetic.invalid' : null, conta_confirmada: estado.conta,
        clinicas: clinicas.map((clinica) => ({ ...clinica, usuario_id: estado.conta ? 'usuario-sintetico' : null,
          papel: estado.papeis[clinica.id] ?? null, ativo: Boolean(estado.papeis[clinica.id]),
          status: estado.papeis[clinica.id] ? 'acesso_ativo' : estado.pendente && clinica.id === 'clinica-a' ? 'convite_pendente' : 'sem_acesso' })),
        convites: estado.pendente ? [{ id: 'solicitacao-original', status: estado.conviteStatus, clinicas_papeis: [{ clinica_id: 'clinica-a', papel: 'medico' }] }] : [] })
      estado.escritas.push(pedido)
      if (estado.antesEscrita) await estado.antesEscrita()
      if (estado.falha === 'rede') return route.abort('internetdisconnected')
      if (estado.falha === 'validacao') return responder({ codigo: 'DADOS_INVALIDOS', erro: 'detalhe-interno-sintetico' }, 422)
      if (pedido.acao === 'alterar') {
        estado.papeis[pedido.clinicaAlvoId!] = pedido.papel!
        return responder({ clinica_id: pedido.clinicaAlvoId, status: 'acesso_ativo', papel: pedido.papel })
      }
      estado.pendente = true
      return responder({ id: 'solicitacao-original', status: 'enviado' })
    }
    return responder([])
  })
  await page.goto('/tests/operacional/equipe-contexto.html')
  return estado
}
async function abrir(page: Page, nome = 'Administrativa Sintética') {
  await page.getByRole('button', { name: `Ver cadastro de ${nome}`, exact: true }).click()
  await abrirAcessoFicha(page.getByRole('dialog'))
  await expect(page.getByTestId('painel-gestao-acessos')).toBeVisible()
  return page.getByRole('dialog')
}
const papel = (page: Page, clinica = 'A') => page.getByRole('combobox', { name: `Papel para Clínica ${clinica}`, exact: true })

test('administrativo e enfermagem começam sem papel; fechar, reabrir e F5 não reaproveitam escolha', async ({ page }) => {
  const estado = await preparar(page)
  for (const nome of ['Administrativa Sintética', 'Enfermagem Sintética']) {
    const ficha = await abrir(page, nome)
    await expect(papel(page)).toHaveValue('')
    await expect(ficha.getByRole('button', { name: 'Enviar convite', exact: true })).toBeDisabled()
    // Mesmo um submit pelo formulário não contorna a validação.
    await ficha.getByRole('form', { name: 'Conceder acesso ao membro' }).evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(ficha.getByRole('alert')).toContainText('Selecione ao menos uma clínica')
    expect(estado.escritas).toEqual([])
    await papel(page).selectOption('proprietaria')
    await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
    // Seleção de papel feita pelo próprio teste e não salva: a ficha pede descarte (comportamento mantido).
    await expect(page.getByRole('alertdialog')).toContainText('Descartar alterações desta ficha?')
    await page.getByRole('button', { name: 'Descartar e fechar', exact: true }).click()
  }
  await abrir(page)
  await expect(papel(page)).toHaveValue('')
  await page.reload()
  await abrir(page)
  await expect(papel(page)).toHaveValue('')
  expect(estado.escritas).toEqual([])
})

test('duas clínicas exigem escolhas independentes e convite envia exatamente o resumo', async ({ page }) => {
  const estado = await preparar(page)
  const ficha = await abrir(page, 'Enfermagem Sintética')
  await papel(page).selectOption('recepcao')
  const campos = ficha.getByRole('group', { name: 'Clínicas e papéis' })
  await campos.getByRole('checkbox', { name: 'Clínica B', exact: true }).check()
  await expect(papel(page, 'B')).toHaveValue('')
  const enviar = ficha.getByRole('button', { name: 'Enviar convite', exact: true })
  await expect(enviar).toBeDisabled()
  await ficha.getByRole('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
  expect(estado.escritas).toEqual([])
  await papel(page, 'B').selectOption('proprietaria')
  await expect(papel(page)).toHaveValue('recepcao')
  const resumo = ficha.getByTestId('resumo-novo-acesso')
  await expect(resumo).toContainText('Enfermagem Sintética')
  await expect(resumo).toContainText('Clínica A · Recepção')
  await expect(resumo).toContainText('Clínica B · Administradora')
  await enviar.scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('convite-explicito.png'), fullPage: true })
  await enviar.click()
  await expect(ficha.getByText('Convite enviado. O acesso ficará pendente até o aceite.', { exact: true })).toBeVisible()
  expect(estado.escritas).toHaveLength(1)
  expect(estado.escritas[0]).toMatchObject({ acao: 'preparar', membroId: 'saude', modo: 'convite', clinicaContextoId: 'clinica-a',
    clinicasPapeis: [{ clinica_id: 'clinica-a', papel: 'recepcao' }, { clinica_id: 'clinica-b', papel: 'proprietaria' }] })
})

test('vínculo por confirmação exige papel; trocar clínica ou desmarcar limpa a seleção', async ({ page }) => {
  const estado = await preparar(page)
  let ficha = await abrir(page)
  await papel(page).selectOption('medico')
  await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
  // Seleção de papel feita pelo próprio teste e não salva: a ficha pede descarte (comportamento mantido).
  await expect(page.getByRole('alertdialog')).toContainText('Descartar alterações desta ficha?')
  await page.getByRole('button', { name: 'Descartar e fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Trocar para Clínica B', exact: true }).click()
  ficha = await abrir(page)
  await expect(papel(page, 'B')).toHaveValue('')
  await expect(papel(page)).toHaveCount(0)
  await ficha.getByRole('radio', { name: 'Vincular conta existente por confirmação' }).check()
  const confirmar = ficha.getByRole('button', { name: 'Solicitar confirmação', exact: true })
  await expect(confirmar).toBeDisabled()
  await papel(page, 'B').selectOption('recepcao')
  const marcar = ficha.getByRole('group', { name: 'Clínicas e papéis' }).getByRole('checkbox', { name: 'Clínica B', exact: true })
  await marcar.uncheck()
  await marcar.check()
  await expect(papel(page, 'B')).toHaveValue('')
  await expect(confirmar).toBeDisabled()
  await papel(page, 'B').selectOption('proprietaria')
  await confirmar.click()
  await expect(ficha.getByText('Confirmação enviada ao titular da conta.', { exact: true })).toBeVisible()
  expect(estado.escritas).toHaveLength(1)
  expect(estado.escritas[0]).toMatchObject({ acao: 'preparar', modo: 'vinculo', clinicaContextoId: 'clinica-b', clinicasPapeis: [{ clinica_id: 'clinica-b', papel: 'proprietaria' }] })
})

test('conta vinculada: concessão explícita, clique duplo bloqueado, falhas mantêm escolha e sucesso reconsulta', async ({ page }) => {
  const estado = await preparar(page)
  estado.conta = true
  estado.falha = 'validacao'
  let liberar!: () => void
  const espera = new Promise<void>((resolve) => { liberar = resolve })
  estado.antesEscrita = () => espera
  const ficha = await abrir(page)
  const seletor = ficha.getByRole('combobox', { name: 'Papel para concessão em Clínica A', exact: true })
  const conceder = ficha.getByRole('button', { name: 'Conceder acesso', exact: true }).first()
  await expect(seletor).toHaveValue('')
  await expect(conceder).toBeDisabled()
  await conceder.evaluate((button: HTMLButtonElement) => button.click())
  expect(estado.escritas).toEqual([])
  await seletor.selectOption('medico')
  await expect(ficha.getByTestId('resumo-concessao-clinica-a')).toHaveText('Administrativa Sintética · Clínica A · Médico')
  await conceder.scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('concessao-explicita.png'), fullPage: true })
  await conceder.evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect.poll(() => estado.escritas.length).toBe(1)
  await expect(ficha.getByRole('button', { name: 'Processando…' })).toBeDisabled()
  await expect(seletor).toBeDisabled()
  liberar()
  await expect(ficha.getByRole('alert')).toContainText('Revise os campos')
  await expect(ficha.getByRole('alert')).not.toContainText('detalhe-interno')
  await expect(seletor).toHaveValue('medico')
  estado.antesEscrita = null
  estado.falha = 'rede'
  await conceder.click()
  await expect(ficha.getByRole('alert')).toContainText('Confira a conexão')
  await expect(seletor).toHaveValue('medico')
  await expect(conceder).toBeEnabled()
  await expect(ficha.getByText('Operação concluída', { exact: true })).toHaveCount(0)
  expect(estado.escritas).toHaveLength(2)
  estado.falha = ''
  await conceder.click()
  await expect(ficha.getByRole('combobox', { name: 'Papel de Clínica A', exact: true })).toHaveValue('medico')
  await expect(ficha.getByRole('button', { name: 'Salvar papel', exact: true })).toBeDisabled()
  expect(estado.escritas).toHaveLength(3)
  for (const pedido of estado.escritas) expect(pedido).toMatchObject({ acao: 'alterar', acaoAcesso: 'conceder', clinicaAlvoId: 'clinica-a', papel: 'medico' })
})

test('pendente mostra papel original e reenvio não envia nova escolha nem concede acesso', async ({ page }) => {
  const estado = await preparar(page)
  estado.pendente = true
  estado.conviteStatus = 'erro'
  const ficha = await abrir(page)
  await expect(ficha.getByText('Papel da solicitação: Médico', { exact: true })).toBeVisible()
  await expect(papel(page)).toHaveCount(0)
  await expect(ficha.getByRole('group', { name: 'Clínicas e papéis' }).getByRole('checkbox', { name: 'Clínica A', exact: true })).toBeDisabled()
  await ficha.getByRole('button', { name: 'Reenviar convite', exact: true }).click()
  await expect(ficha.getByText('Solicitação reenviada.', { exact: true })).toBeVisible()
  expect(estado.escritas).toEqual([{ acao: 'reenviar', conviteId: 'solicitacao-original', clinicaContextoId: 'clinica-a' }])
  await expect(ficha.getByText('Papel da solicitação: Médico', { exact: true })).toBeVisible()
  await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
  estado.conviteStatus = 'enviado'
  await abrir(page)
  await expect(ficha.getByText('Papel da solicitação: Médico', { exact: true })).toBeVisible()
})

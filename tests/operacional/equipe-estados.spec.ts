import { expect, test, type Page } from '@playwright/test'
import { resumoAcesso } from './equipe-listagem-helpers'

const clinicas = [{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }]
const nomes = { sem: 'Cadastro Sintético', vinculada: 'Conta Sintética', ativa: 'Acesso Sintético', pendente: 'Convite Sintético', desconhecida: 'Informação Sintética' }
type Id = keyof typeof nomes
type EstadoClinica = { status: string; papel: string | null }
type Pedido = { acao: string; membroId?: Id; clinicaContextoId: string; clinicaAlvoId?: string; acaoAcesso?: string; papel?: string; clinicasPapeis?: { clinica_id: string; papel: string }[] }

async function preparar(page: Page) {
  const estado = {
    contas: { sem: null, vinculada: 'u-vinculada', ativa: 'u-ativa', pendente: null, desconhecida: undefined } as Record<Id, string | null | undefined>,
    clinicas: Object.fromEntries(Object.keys(nomes).map((id) => [id, clinicas.map(() => ({ status: 'sem_acesso', papel: null }))])) as Record<Id, EstadoClinica[]>,
    escritas: [] as Pedido[], leiturasLista: 0, leiturasAcesso: [] as Pedido[], falha: '' as '' | 'validacao' | 'rede', falharConsulta: false, falharLista: false, semEmailLogin: false,
  }
  estado.clinicas.ativa = [{ status: 'acesso_ativo', papel: 'recepcao' }, { status: 'acesso_suspenso', papel: 'medico' }]
  estado.clinicas.pendente[0] = { status: 'convite_pendente', papel: 'proprietaria' }
  function membro(id: Id, contexto: string) {
    const conta = estado.contas[id]
    const clinica = estado.clinicas[id][contexto === 'clinica-a' ? 0 : 1]
    return { id, nome_completo: nomes[id], cargo: 'Administração', tipo: 'administrativo', profissao: null, telefone: null,
      email_contato: 'pessoa@synthetic.invalid', conselho_classe: null, registro_conselho: null, conselho_uf: null,
      especialidade_id: null, especialidade_nome: null, clinicas, revisao: 1,
      acesso_status: conta === undefined ? undefined : conta === null ? 'sem_conta' : clinica.status === 'acesso_ativo' ? 'ativo_na_unidade' : 'sem_acesso_na_unidade' }
  }
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const json = (data: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) })
    if (url.pathname.endsWith('/rpc/equipe_listar')) {
      estado.leiturasLista++
      if (estado.falharLista) return json({ code: '42501' }, 403)
      return json((Object.keys(nomes) as Id[]).map((id) => membro(id, route.request().postDataJSON().p_clinica_contexto_id)))
    }
    if (url.pathname.endsWith('/rpc/equipe_detalhar')) {
      const body = route.request().postDataJSON()
      return json({ ...membro(body.p_membro_id, body.p_clinica_contexto_id), cpf: null, cpf_situacao: 'ausente' })
    }
    if (url.pathname.endsWith('/clinicas')) return json(clinicas)
    if (url.pathname.endsWith('/functions/v1/equipe-acessos')) {
      const pedido = route.request().postDataJSON() as Pedido
      const id = pedido.membroId ?? 'pendente'
      if (pedido.acao === 'listar') {
        estado.leiturasAcesso.push(pedido)
        if (estado.falharConsulta) return json({ codigo: 'NAO_AUTORIZADO' }, 403)
        const conta = estado.contas[id]
        return json({ membro_id: id, usuario_id: conta, login_email: conta && !estado.semEmailLogin ? 'login@synthetic.invalid' : null, conta_confirmada: Boolean(conta),
          clinicas: clinicas.map((clinica, i) => ({ ...clinica, ...estado.clinicas[id][i], usuario_id: conta, ativo: estado.clinicas[id][i].status === 'acesso_ativo' })),
          convites: estado.clinicas[id].some((c) => c.status === 'convite_pendente') ? [{ id: 'convite-original', status: 'enviado',
            clinicas_papeis: estado.clinicas[id].flatMap((c, i) => c.status === 'convite_pendente' ? [{ clinica_id: clinicas[i].id, papel: c.papel }] : []) }] : [] })
      }
      estado.escritas.push(pedido)
      if (estado.falha === 'rede') return route.abort('internetdisconnected')
      if (estado.falha === 'validacao') return json({ codigo: 'DADOS_INVALIDOS', erro: 'detalhe-sintetico-interno' }, 422)
      if (pedido.acao === 'alterar') {
        const indice = pedido.clinicaAlvoId === 'clinica-a' ? 0 : 1
        const antes = estado.clinicas[id][indice]
        estado.clinicas[id][indice] = { status: pedido.acaoAcesso === 'suspender' ? 'acesso_suspenso' : 'acesso_ativo', papel: pedido.papel ?? antes.papel }
        return json({ clinica_id: pedido.clinicaAlvoId, ...estado.clinicas[id][indice] })
      }
      if (pedido.acao === 'preparar') for (const item of pedido.clinicasPapeis ?? []) estado.clinicas[id][item.clinica_id === 'clinica-a' ? 0 : 1] = { status: 'convite_pendente', papel: item.papel }
      return json({ id: 'convite-original', status: 'enviado' })
    }
    return json([])
  })
  await page.goto('/tests/operacional/equipe-contexto.html')
  return estado
}
const linha = (page: Page, id: Id) => page.getByTestId(`equipe-pessoa-${id}`)
async function abrir(page: Page, id: Id) {
  // Na grade, expande a linha antes da ficha para o resumo da lista ficar legível com o diálogo aberto.
  await resumoAcesso(page, id, nomes[id])
  await page.getByRole('button', { name: `Ver cadastro de ${nomes[id]}`, exact: true }).click()
  await expect(page.getByTestId('painel-gestao-acessos')).toBeVisible()
  return page.getByRole('dialog')
}

test('operação confirmada atualiza painel e lista sem F5 e preserva filtros', async ({ page }) => {
  const estado = await preparar(page)
  await page.getByLabel('Buscar por nome').fill('Conta Sintética')
  const ficha = await abrir(page, 'vinculada')
  await ficha.getByRole('combobox', { name: 'Papel para concessão em Clínica A', exact: true }).selectOption('medico')
  const leiturasAntes = estado.leiturasLista
  await ficha.getByRole('button', { name: 'Conceder acesso', exact: true }).first().click()
  await expect(ficha.getByRole('combobox', { name: 'Papel de Clínica A', exact: true })).toHaveValue('medico')
  await expect(page.getByTestId('resumo-acesso-vinculada')).toContainText('Acesso ativo')
  await expect(page.getByTestId('resumo-acesso-vinculada')).toContainText('Papel atual: Médico')
  await expect.poll(() => estado.leiturasLista).toBeGreaterThan(leiturasAntes)
  await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(page.getByLabel('Buscar por nome')).toHaveValue('Conta Sintética')
  expect(estado.escritas).toHaveLength(1)
})

test('conta, convite e acesso por clínica são distintos e nenhum campo ausente vira ausência', async ({ page }) => {
  const estado = await preparar(page)
  await expect(linha(page, 'desconhecida')).toContainText('Não confirmado')
  await expect(await resumoAcesso(page, 'desconhecida', nomes.desconhecida)).toContainText('Conta e acesso não confirmados')
  expect(estado.leiturasAcesso).toEqual([])
  for (const id of ['sem', 'vinculada', 'ativa', 'pendente', 'desconhecida'] as Id[]) {
    const ficha = await abrir(page, id)
    const conta = ficha.getByTestId('situacao-conta')
    await expect(conta).toContainText(id === 'desconhecida' ? 'Não foi possível confirmar a conta' : id === 'sem' || id === 'pendente' ? 'Sem conta vinculada' : 'Conta de acesso vinculada')
    await expect(ficha.getByTestId('ficha-secao-acesso')).not.toContainText(/\bAuth\b|RPC|Status retornado|Não confirmado por esta consulta/)
    if (id === 'vinculada') await expect(ficha.getByTestId('painel-gestao-acessos')).toContainText('Sem acesso a esta clínica')
    if (id === 'ativa') {
      await expect(ficha).toContainText('Papel atual: Recepção')
      await expect(ficha).toContainText('Acesso suspenso')
      await expect(ficha).toContainText('Papel do acesso suspenso: Médico')
    }
    if (id === 'pendente') await expect(ficha).toContainText('Papel da solicitação: Administradora')
    if (id === 'desconhecida') {
      await expect(ficha.getByRole('button', { name: 'Enviar convite', exact: true })).toHaveCount(0)
      await expect(ficha.getByRole('button', { name: 'Conceder acesso', exact: true })).toHaveCount(0)
    }
    await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
    if (id !== 'sem' && id !== 'pendente') await expect(page.getByTestId(`resumo-acesso-${id}`)).not.toContainText('Sem conta vinculada')
    else await expect(page.getByTestId(`resumo-acesso-${id}`)).toContainText('Sem conta vinculada')
  }
  expect(estado.escritas).toEqual([])
  // Apenas as fichas abertas são consultadas, sem consulta individual por cada linha no carregamento.
  expect(new Set(estado.leiturasAcesso.map((pedido) => pedido.membroId))).toEqual(new Set(Object.keys(nomes)))
})

test('falha de leitura e conta sem e-mail não são apresentadas como sem conta', async ({ page }) => {
  const estado = await preparar(page)
  estado.semEmailLogin = true
  let ficha = await abrir(page, 'ativa')
  await expect(ficha.getByTestId('situacao-conta')).toContainText('Conta de acesso vinculada')
  await expect(ficha.getByTestId('situacao-conta')).toContainText('Não foi possível confirmar o e-mail de login')
  await expect(ficha.getByRole('button', { name: 'Enviar convite', exact: true })).toHaveCount(0)
  await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
  estado.falharConsulta = true
  await page.getByRole('button', { name: `Ver cadastro de ${nomes.ativa}`, exact: true }).click()
  ficha = page.getByRole('dialog')
  await expect(ficha.getByText('Consulta de acessos não concluída', { exact: true })).toBeVisible()
  await expect(page.getByTestId('resumo-acesso-ativa').locator('.equipe-conta')).toHaveText('Conta e acesso não confirmados')
  await expect(ficha.getByRole('button', { name: 'Conceder acesso', exact: true })).toHaveCount(0)
  expect(estado.escritas).toEqual([])
})

test('falha conhecida mantém estado confirmado; resultado incerto não inventa estado novo', async ({ page }) => {
  const estado = await preparar(page)
  const ficha = await abrir(page, 'vinculada')
  const seletor = ficha.getByRole('combobox', { name: 'Papel para concessão em Clínica A', exact: true })
  await seletor.selectOption('recepcao')
  estado.falha = 'validacao'
  await ficha.getByRole('button', { name: 'Conceder acesso', exact: true }).first().click()
  await expect(ficha.getByRole('alert')).toContainText('Revise os campos')
  await expect(page.getByTestId('resumo-acesso-vinculada')).toContainText('Sem acesso a esta clínica')
  estado.falha = 'rede'
  const leiturasAntes = estado.leiturasLista
  await ficha.getByRole('button', { name: 'Conceder acesso', exact: true }).first().click()
  await expect(ficha).toContainText('Situação da última consulta')
  await expect(page.getByTestId('resumo-acesso-vinculada').locator('.equipe-conta')).toHaveText('Conta e acesso não confirmados')
  await expect(seletor).toHaveValue('recepcao')
  await expect(ficha.getByText('Operação concluída', { exact: true })).toHaveCount(0)
  expect(estado.escritas).toHaveLength(2)
  expect(estado.leiturasLista).toBe(leiturasAntes)
})

test('resumo orienta antes da escolha e mostra novo acesso depois; teclado e larguras 360/390', async ({ page }) => {
  const estado = await preparar(page)
  await page.getByLabel('Buscar por nome').fill('Conta Sintética')
  const ficha = await abrir(page, 'vinculada')
  const larguraInicial = page.viewportSize()!.width
  for (const largura of test.info().project.name === 'mobile' ? [360, 390] : [larguraInicial]) {
    await page.setViewportSize({ width: largura, height: 950 })
    const seletor = ficha.getByRole('combobox', { name: 'Papel para concessão em Clínica A', exact: true })
    const resumo = ficha.getByTestId('resumo-concessao-clinica-a')
    await seletor.selectOption('')
    await expect(resumo).toHaveText('Escolha o papel para o novo acesso em Clínica A.')
    await expect(resumo).not.toContainText('· Selecione')
    await expect(ficha.getByRole('button', { name: 'Conceder acesso', exact: true }).first()).toBeDisabled()
    await resumo.scrollIntoViewIfNeeded()
    await expect(resumo).toBeInViewport()
    await page.screenshot({ path: test.info().outputPath(`resumo-vazio-${largura}.png`), fullPage: true })
    await seletor.focus()
    await seletor.press('ArrowDown')
    await expect(seletor).toHaveValue('proprietaria')
    await expect(resumo).toHaveText('Conta Sintética · Clínica A · Administradora')
    await seletor.press('Tab')
    await expect(ficha.getByRole('button', { name: 'Conceder acesso', exact: true }).first()).toBeFocused()
    await page.screenshot({ path: test.info().outputPath(`resumo-escolhido-${largura}.png`), fullPage: true })
    const limites = await ficha.getByTestId('painel-gestao-acessos').evaluate((painel) => ({ largura: painel.clientWidth, conteudo: painel.scrollWidth }))
    expect(limites.conteudo).toBeLessThanOrEqual(limites.largura + 1)
  }
  expect(estado.escritas).toEqual([])
})

test('pessoa e clínica não reaproveitam conta, estado ou papel do contexto anterior', async ({ page }) => {
  const estado = await preparar(page)
  let ficha = await abrir(page, 'ativa')
  await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
  ficha = await abrir(page, 'desconhecida')
  await expect(ficha.getByTestId('situacao-conta')).toContainText('Não foi possível confirmar a conta')
  await expect(ficha.getByRole('combobox', { name: 'Papel de Clínica A', exact: true })).toHaveCount(0)
  await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Trocar para Clínica B', exact: true }).click()
  await expect(page.getByTestId('equipe-pessoa-ativa')).toBeVisible()
  await expect(await resumoAcesso(page, 'ativa', nomes.ativa)).toContainText('Sem acesso nesta clínica')
  ficha = await abrir(page, 'ativa')
  await expect(ficha).toContainText('Papel do acesso suspenso: Médico')
  await expect(page.getByTestId('resumo-acesso-ativa')).toContainText('Acesso suspenso')
  expect(estado.escritas).toEqual([])
})

test('convite simulado atualiza resumo da lista; falha de atualização não apresenta estado falso', async ({ page }) => {
  const estado = await preparar(page)
  let ficha = await abrir(page, 'sem')
  await expect(ficha.getByTestId('resumo-novo-acesso')).toContainText('Escolha o papel para Clínica A.')
  await ficha.getByRole('combobox', { name: 'Papel para Clínica A', exact: true }).selectOption('medico')
  await expect(ficha.getByTestId('resumo-novo-acesso')).toContainText('Clínica A · Médico')
  await ficha.getByRole('button', { name: 'Enviar convite', exact: true }).click()
  await expect(page.getByTestId('resumo-acesso-sem')).toContainText('Convite pendente')
  await expect(ficha).toContainText('Papel da solicitação: Médico')
  await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
  ficha = await abrir(page, 'vinculada')
  await ficha.getByRole('combobox', { name: 'Papel para concessão em Clínica A', exact: true }).selectOption('recepcao')
  estado.falharLista = true
  await ficha.getByRole('button', { name: 'Conceder acesso', exact: true }).first().click()
  await expect(ficha.getByRole('combobox', { name: 'Papel de Clínica A', exact: true })).toHaveValue('recepcao')
  await ficha.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(page.getByText('Consulta da equipe não concluída', { exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
  expect(estado.escritas).toHaveLength(2)
})

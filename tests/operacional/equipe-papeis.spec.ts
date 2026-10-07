import { expect, test, type Page } from '@playwright/test'
import { abrirAcessoFicha } from './equipe-ficha-helpers'

// Todos os serviços são sintéticos. Qualquer destino externo não previsto é bloqueado.
const clinicas = [{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }]
const membros = [
  { id: 'admin', nome_completo: 'Administrativa Sintética', tipo: 'administrativo', cargo: 'Administração', profissao: null },
  { id: 'saude', nome_completo: 'Profissional Sintético', tipo: 'profissional_saude', cargo: 'Enfermagem', profissao: 'Enfermagem' },
].map((membro) => ({ ...membro, clinicas, revisao: 1, acesso_status: 'conta_vinculada',
  telefone: null, email_contato: null, conselho_classe: null, registro_conselho: null,
  conselho_uf: null, especialidade_id: null, especialidade_nome: null }))

type Pedido = { acao: string; membroId: string; clinicaContextoId: string; clinicaAlvoId?: string; acaoAcesso?: string; papel?: string }
function esperaControlada() {
  let liberar!: () => void
  const promessa = new Promise<void>((resolve) => { liberar = resolve })
  return { promessa, liberar }
}

async function preparar(page: Page) {
  const estado = {
    papeis: { admin: ['proprietaria', 'recepcao'], saude: ['recepcao', 'medico'] } as Record<string, (string | null)[]>,
    alteracoes: [] as Pedido[], leituras: [] as Pedido[],
    falharAlteracao: false, falharReconsulta: false, respostaAlteracaoInvalida: false, semConta: false, pendente: false,
    antesLeitura: null as null | ((pedido: Pedido) => Promise<void>),
    antesAlteracao: null as null | (() => Promise<void>),
  }
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
    const responder = (data: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) })
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (url.pathname.endsWith('/functions/v1/equipe-acessos')) {
      const pedido = route.request().postDataJSON() as Pedido
      if (pedido.acao === 'listar') {
        estado.leituras.push(pedido)
        const papeis = [...estado.papeis[pedido.membroId]]
        if (estado.antesLeitura) await estado.antesLeitura(pedido)
        if (estado.falharReconsulta && estado.alteracoes.length) return responder({ erro: 'Consulta sintética indisponível' }, 503)
        return responder({ membro_id: pedido.membroId, usuario_id: estado.semConta ? null : `usuario-${pedido.membroId}`,
          login_email: estado.semConta ? null : `${pedido.membroId}@synthetic.invalid`, conta_confirmada: !estado.semConta,
          clinicas: clinicas.map((clinica, index) => ({ ...clinica, papel: papeis[index],
            usuario_id: estado.semConta ? null : `usuario-${pedido.membroId}`, ativo: !estado.semConta,
            status: estado.pendente ? 'convite_pendente' : estado.semConta ? 'sem_acesso' : 'acesso_ativo' })),
          convites: estado.pendente ? [{ id: 'convite-sintetico', status: 'enviado', clinicas_papeis: [{ clinica_id: 'clinica-a', papel: 'recepcao' }] }] : [],
        })
      }
      estado.alteracoes.push(pedido)
      if (estado.antesAlteracao) await estado.antesAlteracao()
      if (estado.falharAlteracao) return responder({ codigo: 'TESTE', erro: 'Falha sintética' }, 422)
      if (pedido.acao === 'alterar' && pedido.acaoAcesso === 'papel') {
        estado.papeis[pedido.membroId][pedido.clinicaAlvoId === 'clinica-a' ? 0 : 1] = pedido.papel!
        return responder(estado.respostaAlteracaoInvalida ? null : { status: 'acesso_ativo', clinica_id: pedido.clinicaAlvoId, papel: pedido.papel })
      }
      return responder({ mensagem: 'Operação sintética concluída' })
    }
    if (url.pathname.endsWith('/rpc/equipe_listar')) return responder(membros)
    if (url.pathname.endsWith('/rpc/equipe_detalhar')) {
      const pedido = route.request().postDataJSON() as { p_membro_id: string }
      return responder({ ...membros.find((membro) => membro.id === pedido.p_membro_id), cpf: null, cpf_situacao: 'ausente' })
    }
    if (url.pathname.endsWith('/clinicas')) return responder(clinicas)
    return responder([])
  })
  await page.goto('/tests/operacional/equipe-contexto.html')
  return estado
}

async function abrir(page: Page, nome = 'Administrativa Sintética') {
  await page.getByRole('button', { name: `Ver cadastro de ${nome}`, exact: true }).click()
  await abrirAcessoFicha(page.getByRole('dialog'))
  return page.getByRole('dialog')
}
const seletorA = (page: Page) => page.getByRole('combobox', { name: 'Papel de Clínica A', exact: true })
const seletorB = (page: Page) => page.getByRole('combobox', { name: 'Papel de Clínica B', exact: true })
const salvarA = (page: Page) => page.getByRole('button', { name: 'Salvar papel', exact: true }).nth(0)
const salvarB = (page: Page) => page.getByRole('button', { name: 'Salvar papel', exact: true }).nth(1)

test('administrativa mantém Administradora; abrir e escolher não grava; voltar ao original bloqueia', async ({ page }) => {
  const estado = await preparar(page)
  await abrir(page)
  await expect(seletorA(page)).toHaveValue('proprietaria')
  await expect(salvarA(page)).toBeDisabled()
  await seletorA(page).selectOption('medico')
  await expect(salvarA(page)).toBeEnabled()
  await seletorA(page).selectOption('proprietaria')
  await expect(salvarA(page)).toBeDisabled()
  expect(estado.alteracoes).toEqual([])
  await seletorA(page).scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('papel-confirmado.png'), fullPage: true })
})

test('profissional de saúde mantém Recepção em vez de Médico', async ({ page }) => {
  const estado = await preparar(page)
  await abrir(page, 'Profissional Sintético')
  await expect(seletorA(page)).toHaveValue('recepcao')
  await expect(seletorB(page)).toHaveValue('medico')
  await expect(salvarA(page)).toBeDisabled()
  expect(estado.alteracoes).toEqual([])
})

test('papéis por clínica são independentes e sucesso usa nova leitura, inclusive após F5', async ({ page }) => {
  const estado = await preparar(page)
  await abrir(page)
  await expect(seletorB(page)).toHaveValue('recepcao')
  await seletorB(page).selectOption('medico')
  await expect(salvarA(page)).toBeDisabled()
  await salvarB(page).click()
  await expect(page.getByText('Papel atualizado nesta clínica.', { exact: true })).toBeVisible()
  await expect(seletorB(page)).toHaveValue('medico')
  await expect(salvarB(page)).toBeDisabled()
  await expect(seletorA(page)).toHaveValue('proprietaria')
  expect(estado.alteracoes).toEqual([{ acao: 'alterar', membroId: 'admin', clinicaContextoId: 'clinica-a', clinicaAlvoId: 'clinica-b', acaoAcesso: 'papel', papel: 'medico' }])
  expect(estado.leituras.length).toBeGreaterThan(1)
  await page.reload()
  await abrir(page)
  await expect(seletorB(page)).toHaveValue('medico')
  await expect(salvarB(page)).toBeDisabled()
})

test('falha não altera o papel confirmado nem anuncia sucesso', async ({ page }) => {
  const estado = await preparar(page)
  estado.falharAlteracao = true
  const dialog = await abrir(page)
  await seletorA(page).selectOption('recepcao')
  await salvarA(page).click()
  await expect(dialog.getByText('Não foi possível concluir', { exact: true })).toBeVisible()
  await expect(dialog).toContainText('Papel atual: Administradora')
  await expect(dialog.getByText('Papel atualizado nesta clínica.', { exact: true })).toHaveCount(0)
  await expect(salvarA(page)).toBeEnabled()
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  // Seleção de papel feita pelo próprio teste e não salva: a ficha pede descarte (comportamento mantido).
  await expect(page.getByRole('alertdialog')).toContainText('Descartar alterações desta ficha?')
  await page.getByRole('button', { name: 'Descartar e fechar', exact: true }).click()
  await abrir(page)
  await expect(seletorA(page)).toHaveValue('proprietaria')
  await expect(salvarA(page)).toBeDisabled()
})

test('gravação confirmada com falha da releitura bloqueia novas alterações sem presumir papel', async ({ page }) => {
  const estado = await preparar(page)
  estado.falharReconsulta = true
  await abrir(page)
  await seletorA(page).selectOption('recepcao')
  await salvarA(page).click()
  await expect(page.getByText(/A alteração foi confirmada, mas não foi possível consultar o papel atual/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar papel', exact: true })).toHaveCount(0)
  await expect(page.getByText('Papel atualizado nesta clínica.', { exact: true })).toHaveCount(0)
  expect(estado.alteracoes).toHaveLength(1)
})

test('resposta sem confirmação válida não anuncia sucesso nem libera outra tentativa', async ({ page }) => {
  const estado = await preparar(page)
  estado.respostaAlteracaoInvalida = true
  await abrir(page)
  await seletorA(page).selectOption('recepcao')
  await salvarA(page).click()
  await expect(page.getByText(/Não foi possível confirmar o resultado da alteração/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar papel', exact: true })).toHaveCount(0)
  await expect(page.getByText('Papel atualizado nesta clínica.', { exact: true })).toHaveCount(0)
  expect(estado.alteracoes).toHaveLength(1)
})

test('reabrir, trocar membro e trocar contexto descartam seleção não salva', async ({ page }) => {
  const estado = await preparar(page)
  let dialog = await abrir(page)
  await seletorA(page).selectOption('medico')
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  // Seleção de papel feita pelo próprio teste e não salva: a ficha pede descarte (comportamento mantido).
  await expect(page.getByRole('alertdialog')).toContainText('Descartar alterações desta ficha?')
  await page.getByRole('button', { name: 'Descartar e fechar', exact: true }).click()
  dialog = await abrir(page)
  await expect(seletorA(page)).toHaveValue('proprietaria')
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  dialog = await abrir(page, 'Profissional Sintético')
  await expect(seletorA(page)).toHaveValue('recepcao')
  await seletorA(page).selectOption('proprietaria')
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  // Seleção de papel feita pelo próprio teste e não salva: a ficha pede descarte (comportamento mantido).
  await expect(page.getByRole('alertdialog')).toContainText('Descartar alterações desta ficha?')
  await page.getByRole('button', { name: 'Descartar e fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Trocar para Clínica B', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Clínica ativa' })).toContainText('Clínica B')
  await abrir(page, 'Profissional Sintético')
  await expect(seletorA(page)).toHaveValue('recepcao')
  await expect(salvarA(page)).toBeDisabled()
  expect(estado.alteracoes).toEqual([])
})

for (const papel of [null, 'gestor']) {
  test(`papel ${papel ?? 'ausente'} bloqueia seletor e salvamento sem usar padrão`, async ({ page }) => {
    const estado = await preparar(page)
    estado.papeis.admin[0] = papel
    await abrir(page)
    await expect(seletorA(page)).toHaveValue('')
    await expect(seletorA(page)).toBeDisabled()
    await expect(salvarA(page)).toBeDisabled()
    await expect(page.getByText(/O papel deste acesso não foi confirmado/)).toBeVisible()
    expect(estado.alteracoes).toEqual([])
  })
}

test('carregamento e leitura atrasada da ficha anterior não substituem a atual', async ({ page }) => {
  const estado = await preparar(page)
  const espera = esperaControlada()
  estado.antesLeitura = async (pedido) => { if (pedido.membroId === 'admin') await espera.promessa }
  let dialog = await abrir(page)
  await expect(dialog.getByTestId('acesso-carregando')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar papel', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  dialog = await abrir(page, 'Profissional Sintético')
  await expect(seletorA(page)).toHaveValue('recepcao')
  // Marcador de entrega, em vez de depender apenas de um atraso fixo.
  const resposta = page.waitForResponse((response) => response.url().includes('/functions/v1/equipe-acessos') && response.request().postDataJSON()?.membroId === 'admin')
  espera.liberar()
  await resposta
  await expect(seletorA(page)).toHaveValue('recepcao')
  await expect(dialog).not.toContainText('admin@synthetic.invalid')
  expect(estado.alteracoes).toEqual([])
})

test('salvamento e releitura mantêm controles bloqueados e impedem envio repetido', async ({ page }) => {
  const estado = await preparar(page)
  const salvar = esperaControlada()
  const reler = esperaControlada()
  estado.antesAlteracao = () => salvar.promessa
  await abrir(page)
  await seletorA(page).selectOption('recepcao')
  await salvarA(page).click()
  await expect(salvarA(page)).toBeDisabled()
  await expect(seletorA(page)).toBeDisabled()
  expect(estado.alteracoes).toHaveLength(1)
  estado.antesLeitura = () => reler.promessa
  salvar.liberar()
  await expect.poll(() => estado.leituras.length).toBeGreaterThan(1)
  await expect(salvarA(page)).toBeDisabled()
  await expect(page.getByText('Papel atualizado nesta clínica.', { exact: true })).toHaveCount(0)
  reler.liberar()
  await expect(salvarA(page)).toBeDisabled()
  await expect(page.getByText('Papel atualizado nesta clínica.', { exact: true })).toBeVisible()
  expect(estado.alteracoes).toHaveLength(1)
})

test('resultado atrasado de salvamento não aparece em outra pessoa ou clínica', async ({ page }) => {
  const estado = await preparar(page)
  const espera = esperaControlada()
  estado.antesAlteracao = () => espera.promessa
  const dialog = await abrir(page)
  await seletorA(page).selectOption('recepcao')
  await salvarA(page).click()
  await expect.poll(() => estado.alteracoes.length).toBe(1)
  // A ficha não fecha durante o salvamento (comportamento mantido): espera o fim antes de trocar de pessoa e clínica.
  await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeDisabled()
  const resposta = page.waitForResponse((response) => response.url().includes('/functions/v1/equipe-acessos') && response.request().postDataJSON()?.acao === 'alterar')
  espera.liberar()
  await resposta
  await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Trocar para Clínica B', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Clínica ativa' })).toContainText('Clínica B')
  await abrir(page, 'Profissional Sintético')
  await expect(seletorA(page)).toHaveValue('recepcao')
  await expect(seletorB(page)).toHaveValue('medico')
  await expect(page.getByText('Papel atualizado nesta clínica.', { exact: true })).toHaveCount(0)
  await expect(salvarA(page)).toBeDisabled()
})

test('sem acesso e convite pendente preservam formulário e reenvio separados da edição de papel', async ({ page }) => {
  const estado = await preparar(page)
  estado.semConta = true
  let dialog = await abrir(page)
  await expect(page.getByRole('combobox', { name: 'Papel para Clínica A', exact: true })).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Salvar papel', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  estado.pendente = true
  dialog = await abrir(page)
  await expect(dialog.getByRole('button', { name: 'Reenviar convite', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar papel', exact: true })).toHaveCount(0)
  expect(estado.alteracoes).toEqual([])
})

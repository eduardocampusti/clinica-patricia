import { expect, test, type Page } from '@playwright/test'
import { abrirAcessoFicha } from './equipe-ficha-helpers'

const clinicas = [{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }]
const pessoa = { id: 'pessoa-sintetica', nome_completo: 'Pessoa Sintética', cargo: 'Administração', tipo: 'administrativo',
  clinicas, revisao: 1, acesso_status: 'sem_conta', telefone: null, email_contato: null, profissao: null,
  conselho_classe: null, registro_conselho: null, conselho_uf: null, especialidade_id: null, especialidade_nome: null }
const privado = 'SQL tabela_interna CPF 000.000.000-00 terceiro@synthetic.invalid segredo-sintetico'
type Falha = { status: number; corpo?: unknown; rede?: boolean; texto?: string }

async function preparar(page: Page) {
  const estado = { lista: null as Falha | null, escrita: null as Falha | null, vazio: false, legados: 0, escritas: 0 }
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const json = (corpo: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(corpo) })
    const falhar = (falha: Falha) => falha.rede ? route.abort('internetdisconnected') : falha.texto !== undefined
      ? route.fulfill({ status: falha.status, headers, contentType: 'text/plain', body: falha.texto }) : json(falha.corpo ?? { erro: privado }, falha.status)
    if (url.pathname.endsWith('/rpc/equipe_listar')) return estado.lista ? falhar(estado.lista) : json(estado.vazio ? [] : [pessoa])
    if (url.pathname.endsWith('/rpc/equipe_detalhar')) return json({ ...pessoa, cpf: null, cpf_situacao: 'ausente' })
    if (url.pathname.endsWith('/profissionais_clinicas')) { estado.legados += 1; return json([]) }
    if (url.pathname.endsWith('/clinicas')) return json(clinicas)
    if (url.pathname.endsWith('/functions/v1/equipe-acessos')) {
      const pedido = route.request().postDataJSON() as { acao: string }
      if (pedido.acao === 'listar') return json({ membro_id: pessoa.id, usuario_id: null, login_email: null, conta_confirmada: false,
        clinicas: clinicas.map((clinica) => ({ ...clinica, usuario_id: null, papel: null, ativo: false, status: 'sem_acesso' })), convites: [] })
      estado.escritas += 1
      return estado.escrita ? falhar(estado.escrita) : json({ mensagem: 'Operação sintética concluída' })
    }
    return json([])
  })
  return estado
}

test('permissão, sessão, rede e erro desconhecido não acionam legado nem apresentam lista vazia', async ({ page }) => {
  test.setTimeout(60000)
  const estado = await preparar(page)
  for (const falha of [
    { status: 403, corpo: { code: '42501', message: privado } },
    { status: 401, corpo: { code: 'PGRST301', message: privado } },
    { status: 0, rede: true }, { status: 404, corpo: { code: 'ERRO_DESCONHECIDO', message: privado } },
  ]) {
    estado.lista = falha
    await page.goto('/tests/operacional/equipe-contexto.html')
    await expect(page.getByText(falha.status === 403 ? 'Sem permissão para consultar a equipe' : 'Consulta da equipe não concluída', { exact: true })).toBeVisible()
    await expect(page.getByRole('alert')).not.toContainText(privado)
    await expect(page.getByText('Nenhum membro encontrado')).toHaveCount(0)
    await expect(page.getByText('Consulta de cadastros antigos', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Novo membro' })).toBeDisabled()
    expect(estado.legados).toBe(0)
  }
})

test('lista realmente vazia é distinta de compatibilidade confirmada', async ({ page }) => {
  const estado = await preparar(page)
  estado.vazio = true
  await page.goto('/tests/operacional/equipe-contexto.html')
  await expect(page.getByText('Nenhum membro cadastrado neste escopo')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(estado.legados).toBe(0)
  estado.lista = { status: 404, corpo: { code: 'PGRST202', message: 'equipe_listar ausente' } }
  await page.reload()
  await expect(page.getByText('Consulta de cadastros antigos', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo membro' })).toBeDisabled()
  expect(estado.legados).toBeGreaterThan(0)
})

test('troca de clínica/perfil com recusa limpa lista e ficha anteriores; Recepção não ganha gestão', async ({ page }) => {
  const estado = await preparar(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await page.getByRole('button', { name: 'Ver cadastro de Pessoa Sintética' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  estado.lista = { status: 403, corpo: { code: '42501', message: privado } }
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Trocar para Clínica B' }).click()
  await expect(page.getByText('Sem permissão para consultar a equipe', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ver cadastro de Pessoa Sintética' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Simular perfil de recepção' }).click()
  await expect(page.getByRole('alert')).toContainText('Proprietária/Administradora')
  await expect(page.getByRole('button', { name: 'Novo membro' })).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(estado.legados).toBe(0)
})

test('falhas do serviço preservam preenchimento, liberam botão e não repetem escrita; alerta dentro da ficha', async ({ page }) => {
  const estado = await preparar(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await page.getByRole('button', { name: 'Ver cadastro de Pessoa Sintética' }).click()
  const ficha = page.getByRole('dialog')
  await abrirAcessoFicha(ficha)
  const email = ficha.getByLabel('E-mail de login')
  await email.fill('pessoa@synthetic.invalid')
  await ficha.getByRole('combobox', { name: 'Papel para Clínica A', exact: true }).selectOption('medico')
  const enviar = ficha.getByRole('button', { name: 'Enviar convite', exact: true })
  const casos = [
    { status: 422, corpo: { codigo: 'DADOS_INVALIDOS', erro: privado }, esperado: 'Revise os campos' },
    { status: 422, corpo: { codigo: 'DUPLICIDADE', erro: privado }, esperado: 'conflito' },
    { status: 429, esperado: 'limite de tentativas' },
    { status: 422, corpo: { codigo: 'DADOS_INVALIDOS', erro: 'Aguarde um minuto antes de reenviar o convite.' }, esperado: 'limite de tentativas' },
    { status: 503, esperado: 'Não foi possível confirmar o resultado' },
    { status: 0, rede: true, esperado: 'Confira a conexão' },
    { status: 200, texto: '', esperado: 'Não foi possível confirmar o resultado' },
    { status: 200, texto: 'resposta inesperada', esperado: 'Não foi possível confirmar o resultado' },
    { status: 200, corpo: {}, esperado: 'Não foi possível confirmar o resultado' },
    { status: 200, corpo: { surpresa: true }, esperado: 'Não foi possível confirmar o resultado' },
  ]
  for (const [indice, caso] of casos.entries()) {
    estado.escrita = caso
    await enviar.click()
    const alerta = ficha.getByRole('alert')
    await expect(alerta).toContainText(caso.esperado)
    await expect(alerta).not.toContainText(privado)
    await expect(enviar).toBeEnabled()
    await expect(email).toHaveValue('pessoa@synthetic.invalid')
    await expect(ficha.getByRole('combobox', { name: 'Papel para Clínica A', exact: true })).toHaveValue('medico')
    expect(estado.escritas).toBe(indice + 1)
    if (indice === 0 || caso.status === 503 || caso.rede) {
      await expect(alerta).toBeInViewport()
      const caixa = await alerta.boundingBox()
      expect(caixa!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
      await page.screenshot({ path: test.info().outputPath(`falha-${caso.rede ? 'rede' : caso.status === 503 ? 'servico' : 'validacao'}.png`) })
    }
  }
})

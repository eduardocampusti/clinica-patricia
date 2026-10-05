import { expect, test, type Page } from '@playwright/test'

type Clinica = { id: string; nome: string }
const clinicas: Clinica[] = [{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }]
type Opcoes = { tipo?: 'profissional_saude' | 'administrativo'; doisVinculos?: boolean; inativo?: boolean; omitido?: boolean; foraEscopo?: boolean; falha?: boolean; detalheAlterado?: Record<string, unknown> }

async function simular(page: Page, opcoes: Opcoes = {}) {
  const profissional = opcoes.tipo !== 'administrativo'
  const estado = {
    pessoa: {
      id: 'pessoa-edicao', nome_completo: 'Pessoa Sintética', cargo: profissional ? 'Médico(a)' : 'Recepcionista',
      tipo: profissional ? 'profissional_saude' : 'administrativo', profissao: profissional ? 'Medicina' : null,
      telefone: null as string | null, email_contato: null as string | null,
      conselho_classe: profissional ? 'CRM' : null, registro_conselho: profissional ? '12345' : null,
      conselho_uf: profissional ? 'BA' : null, especialidade_id: null, especialidade_nome: null,
      acesso_status: 'sem_conta', revisao: 3,
    },
    vinculos: new Map<string, boolean>([['clinica-a', true], ...((opcoes.doisVinculos || opcoes.inativo || opcoes.omitido || opcoes.foraEscopo) ? [['clinica-b', !opcoes.inativo] as [string, boolean]] : [])]),
    envios: [] as Record<string, any>[],
    falha: opcoes.falha ?? false,
  }
  const visivel = () => ({ ...estado.pessoa, clinicas: clinicas.filter((clinica) => estado.vinculos.get(clinica.id) === true && !(clinica.id === 'clinica-b' && (opcoes.omitido || opcoes.foraEscopo))) })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(data) })
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' } })
    if (url.pathname.endsWith('/rpc/equipe_listar')) return json([visivel()])
    if (url.pathname.endsWith('/rpc/equipe_detalhar')) return json({ ...visivel(), cpf: null, cpf_situacao: 'indisponivel', ...opcoes.detalheAlterado })
    if (url.pathname.endsWith('/rpc/equipe_salvar')) {
      const corpo = route.request().postDataJSON()
      estado.envios.push(corpo)
      const dados = corpo.p_dados
      if (opcoes.foraEscopo) return json({ code: '42501', message: 'A alteração global requer autorização em todas as unidades vinculadas. Detalhe sintético privado.' }, 403)
      if (estado.falha) return json({ code: '22023', message: 'Erro sintético privado que não deve aparecer.' }, 400)
      if (corpo.p_membro_id && dados.tipo !== estado.pessoa.tipo) return json({ code: '22023', message: 'A alteração do tipo funcional exige fluxo específico.' }, 400)
      if (dados.clinicas_ids.some((id: string) => estado.vinculos.get(id) === false)) return json({ code: '22023', message: 'Há vínculo inativo; use o fluxo explícito de reativação.' }, 400)
      if (corpo.p_membro_id && corpo.p_revisao_esperada !== estado.pessoa.revisao) return json({ code: '40001', message: 'Cadastro alterado por outra sessão.' }, 409)
      for (const id of dados.clinicas_ids) if (!estado.vinculos.has(id)) estado.vinculos.set(id, true)
      Object.assign(estado.pessoa, dados, { revisao: estado.pessoa.revisao + 1 })
      return json('pessoa-edicao')
    }
    if (url.pathname.endsWith('/clinicas')) return json(opcoes.foraEscopo ? [clinicas[0]] : clinicas)
    if (url.pathname.endsWith('/especialidades')) return json([])
    if (url.pathname.includes('/functions/')) return json({ membro_id: estado.pessoa.id, usuario_id: null, clinicas: [], convites: [] })
    return json([])
  })
  await page.goto('/tests/operacional/equipe-contexto.html')
  await expect(page.getByRole('button', { name: 'Editar cadastro de Pessoa Sintética' })).toBeVisible()
  return estado
}

async function editar(page: Page) {
  await page.getByRole('button', { name: 'Editar cadastro de Pessoa Sintética' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar membro da equipe', exact: true })
  await expect(dialog).toBeVisible()
  return dialog
}

test('criação conserva escolha do tipo e campos profissionais com envio sintético', async ({ page }) => {
  const estado = await simular(page)
  await page.getByRole('button', { name: 'Novo membro' }).click()
  const dialog = page.getByRole('dialog', { name: 'Novo membro da equipe' })
  await dialog.getByLabel('Nome completo *').fill('Nova Pessoa Sintética')
  await dialog.getByLabel('Tipo de função *').selectOption('apoio')
  await expect(dialog.getByLabel('Profissão *')).toHaveCount(0)
  await dialog.getByLabel('Tipo de função *').selectOption('profissional_saude')
  await dialog.getByLabel('Cargo ou função *').selectOption('Médico(a)')
  await dialog.getByLabel('Profissão *').fill('Medicina')
  await dialog.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(dialog).toHaveCount(0)
  expect(estado.envios[0].p_membro_id).toBeNull()
  expect(estado.envios[0].p_dados.tipo).toBe('profissional_saude')
  expect(estado.envios[0].p_dados.clinicas_ids).toEqual(['clinica-a'])
})

test('edição mantém tipo e vínculo existente; demais campos e acréscimo persistem ao reabrir', async ({ page }) => {
  const estado = await simular(page)
  let dialog = await editar(page)
  await expect(dialog.getByTestId('tipo-membro-atual')).toContainText('Profissional de saúde')
  await expect(dialog.getByLabel('Tipo de função *')).toHaveCount(0)
  await expect(dialog.getByTestId('vinculos-existentes')).toContainText('Clínica A')
  await expect(dialog.getByRole('checkbox', { name: 'Clínica A', exact: true })).toHaveCount(0)
  await dialog.getByLabel('Cargo ou função *').selectOption('Outro')
  await dialog.getByLabel('Outro cargo *').fill('Médica da equipe')
  await dialog.getByLabel('Profissão *').fill('Medicina de família')
  await dialog.getByLabel('Tel/WhatsApp').fill('71999998888')
  await dialog.getByLabel('E-mail de contato').fill('contato@synthetic.invalid')
  await dialog.getByRole('checkbox', { name: 'Acrescentar vínculo: Clínica B' }).check()
  await dialog.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(dialog).toHaveCount(0)
  const envio = estado.envios[0]
  expect(envio.p_membro_id).toBe('pessoa-edicao')
  expect(envio.p_revisao_esperada).toBe(3)
  expect(envio.p_dados).toMatchObject({ tipo: 'profissional_saude', cargo: 'Médica da equipe', profissao: 'Medicina de família', email_contato: 'contato@synthetic.invalid', cpf_modo: 'preservar', cpf: null, clinicas_ids: ['clinica-a', 'clinica-b'] })
  expect(envio.p_dados.telefone).toContain('99999-8888')
  expect(envio.p_dados.edicao).toBeUndefined()
  dialog = await editar(page)
  await expect(dialog.getByLabel('Outro cargo *')).toHaveValue('Médica da equipe')
  await expect(dialog.getByLabel('Profissão *')).toHaveValue('Medicina de família')
  await expect(dialog.getByTestId('vinculos-existentes')).toContainText('Clínica B')
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
})

test('administrativo conserva tipo, permite cargo e contato e não oferece remover vínculos', async ({ page }) => {
  const estado = await simular(page, { tipo: 'administrativo', doisVinculos: true })
  const dialog = await editar(page)
  await expect(dialog.getByTestId('tipo-membro-atual')).toContainText('Administrativo ou recepção')
  await expect(dialog.getByLabel('Profissão *')).toHaveCount(0)
  await expect(dialog.getByTestId('vinculos-existentes')).toContainText('Clínica B')
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
  await dialog.getByLabel('Cargo ou função *').selectOption('Auxiliar administrativo')
  await dialog.getByLabel('E-mail de contato').fill('apoio@synthetic.invalid')
  await dialog.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(dialog).toHaveCount(0)
  expect(estado.envios[0].p_dados).toMatchObject({ tipo: 'administrativo', cargo: 'Auxiliar administrativo', profissao: null, clinicas_ids: ['clinica-a', 'clinica-b'] })
})

test('vínculo inativo omitido não é declarado livre nem reativado; recusa mantém preenchimento', async ({ page }) => {
  const estado = await simular(page, { inativo: true })
  const dialog = await editar(page)
  await expect(dialog.getByTestId('vinculos-existentes')).not.toContainText('Clínica B')
  await expect(dialog.getByTestId('novos-vinculos')).toContainText('O vínculo anterior dessas clínicas não é informado')
  await dialog.getByLabel('Profissão *').fill('Medicina de família')
  await dialog.getByRole('checkbox', { name: 'Acrescentar vínculo: Clínica B' }).check()
  await dialog.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Existe um vínculo inativo')
  await expect(dialog.getByRole('alert')).toContainText('Este formulário não o reativa')
  await expect(dialog.getByLabel('Profissão *')).toHaveValue('Medicina de família')
  await expect(dialog.getByRole('checkbox', { name: 'Acrescentar vínculo: Clínica B' })).toBeChecked()
  expect(estado.vinculos.get('clinica-b')).toBe(false)
  expect(estado.pessoa.profissao).toBe('Medicina')
  expect(estado.envios).toHaveLength(1)
  await dialog.getByRole('checkbox', { name: 'Acrescentar vínculo: Clínica B' }).uncheck()
  await dialog.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(dialog).toHaveCount(0)
  expect(estado.envios[1].p_dados.clinicas_ids).toEqual(['clinica-a'])
  expect(estado.vinculos.get('clinica-b')).toBe(false)
})

test('vínculo omitido é preservado pelo contrato aditivo sem inventar remoção no payload', async ({ page }) => {
  const estado = await simular(page, { omitido: true })
  const dialog = await editar(page)
  await dialog.getByLabel('Profissão *').fill('Medicina de família')
  await dialog.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(dialog).toHaveCount(0)
  expect(estado.envios[0].p_dados.clinicas_ids).toEqual(['clinica-a'])
  expect(estado.vinculos.get('clinica-b')).toBe(true)
})

test('falta de autorização global recusa sem revelar unidade oculta ou ajustar payload para contornar', async ({ page }) => {
  const estado = await simular(page, { foraEscopo: true })
  const dialog = await editar(page)
  await expect(dialog).not.toContainText('Clínica B')
  await dialog.getByLabel('Profissão *').fill('Medicina de família')
  await dialog.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Você não tem autorização')
  await expect(dialog).not.toContainText('Detalhe sintético privado')
  await expect(dialog.getByLabel('Profissão *')).toHaveValue('Medicina de família')
  await expect(dialog.getByRole('button', { name: 'Salvar cadastro' })).toBeEnabled()
  expect(estado.envios).toHaveLength(1)
  expect(estado.pessoa.profissao).toBe('Medicina')
  expect(estado.vinculos.size).toBe(2)
})

test('detalhe incompleto bloqueia edição e não envia campos vazios', async ({ page }) => {
  const estado = await simular(page, { detalheAlterado: { telefone: undefined } })
  await page.getByRole('button', { name: 'Editar cadastro de Pessoa Sintética' }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar todos os dados para editar')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(estado.envios).toHaveLength(0)
})

test('falha de salvamento preserva campos, seleção e referência; não expõe texto remoto nem repete', async ({ page }) => {
  const estado = await simular(page, { falha: true })
  const dialog = await editar(page)
  await dialog.getByLabel('Profissão *').fill('Medicina de família')
  await dialog.getByRole('checkbox', { name: 'Acrescentar vínculo: Clínica B' }).check()
  await dialog.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Revise os campos')
  await expect(dialog).not.toContainText('Erro sintético privado')
  await expect(dialog.getByLabel('Profissão *')).toHaveValue('Medicina de família')
  await expect(dialog.getByRole('checkbox', { name: 'Acrescentar vínculo: Clínica B' })).toBeChecked()
  await expect(dialog.getByTestId('vinculos-existentes')).not.toContainText('Clínica B')
  expect(estado.envios).toHaveLength(1)
  expect(estado.vinculos.has('clinica-b')).toBe(false)
})

test('controles de edição são legíveis no computador e celular; teclado distingue vínculo e acréscimo', async ({ page }, info) => {
  const estado = await simular(page)
  const dialog = await editar(page)
  const larguras = info.project.name === 'mobile' ? [360, 390] : [page.viewportSize()!.width]
  for (const largura of larguras) {
    await page.setViewportSize({ width: largura, height: info.project.name === 'mobile' ? 950 : 1000 })
    await dialog.getByTestId('tipo-membro-atual').scrollIntoViewIfNeeded()
    await expect(dialog.getByTestId('tipo-membro-atual')).toBeInViewport()
    await page.screenshot({ path: info.outputPath(`tipo-edicao-${largura}.png`) })
    await dialog.getByTestId('novos-vinculos').scrollIntoViewIfNeeded()
    const opcao = dialog.getByRole('checkbox', { name: 'Acrescentar vínculo: Clínica B' })
    await opcao.focus()
    await opcao.press('Space')
    await expect(opcao).toBeChecked()
    await opcao.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused()
    const geometria = await dialog.evaluate((elemento) => ({ client: elemento.clientWidth, scroll: elemento.scrollWidth }))
    expect(geometria.scroll).toBeLessThanOrEqual(geometria.client + 1)
    await page.screenshot({ path: info.outputPath(`vinculos-edicao-${largura}.png`) })
    await opcao.uncheck()
  }
  expect(estado.envios).toHaveLength(0)
})

import { expect, test, type Locator, type Page } from '@playwright/test'
import { editarCadastro } from './equipe-listagem-helpers'

const pasta = 'scratch/equipe-29'
const clinicas = [{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }]
const nome = 'Pessoa Sintética com Nome Extenso para Conferência da Ficha e dos Formulários'
const email = `contato.${'exemplo'.repeat(9)}@synthetic.invalid`

async function preparar(page: Page) {
  const estado = { falha: false, lenta: false, liberar: [] as (() => void)[], escritas: 0 }
  const pessoa = { id: 'pessoa-visual', nome_completo: nome, tipo: 'profissional_saude', cargo: 'Médico(a)', profissao: 'Medicina',
    telefone: null, email_contato: email, conselho_classe: 'CRM', registro_conselho: '12345', conselho_uf: 'BA',
    especialidade_id: null, especialidade_nome: null, clinicas, revisao: 1, acesso_status: 'ativo_na_unidade' }
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const json = (data: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) })
    if (url.pathname.endsWith('/rpc/equipe_listar')) return json(['ativa', 'sem', 'pendente'].map(id => ({ ...pessoa, id, nome_completo: id === 'ativa' ? nome : id === 'sem' ? 'Pessoa Sem Conta Sintética' : 'Convite Sintético', acesso_status: id === 'ativa' ? 'ativo_na_unidade' : 'sem_conta' })))
    if (url.pathname.endsWith('/rpc/equipe_detalhar')) {
      if (estado.lenta) await new Promise<void>(resolve => estado.liberar.push(resolve))
      if (estado.falha) return json({ code: '42501', message: 'Detalhe interno sintético' }, 403)
      const id = route.request().postDataJSON().p_membro_id
      return json({ ...pessoa, id, nome_completo: id === 'ativa' ? nome : id === 'sem' ? 'Pessoa Sem Conta Sintética' : 'Convite Sintético', cpf: null, cpf_situacao: 'ausente' })
    }
    if (url.pathname.endsWith('/clinicas')) return json(clinicas)
    if (url.pathname.endsWith('/especialidades')) return json([])
    if (url.pathname.includes('/functions/')) {
      const pedido = route.request().postDataJSON()
      if (pedido.acao !== 'listar') { estado.escritas++; return json({}, 400) }
      const ativa = pedido.membroId === 'ativa'
      const pendente = pedido.membroId === 'pendente'
      return json({ membro_id: pedido.membroId, usuario_id: ativa ? 'usuario-sintetico' : null, login_email: ativa ? email : null, conta_confirmada: ativa,
        clinicas: clinicas.map((c, i) => ({ ...c, status: ativa && i === 0 ? 'acesso_ativo' : pendente && i === 0 ? 'convite_pendente' : 'sem_acesso', papel: ativa && i === 0 ? 'medico' : null })),
        convites: pendente ? [{ id: 'convite-sintetico', status: 'enviado', clinicas_papeis: [{ clinica_id: 'clinica-a', papel: 'recepcao' }] }] : [] })
    }
    if (url.pathname.endsWith('/rpc/equipe_salvar')) { estado.escritas++; return json({}, 400) }
    return json([])
  })
  await page.goto('/tests/operacional/equipe-contexto.html')
  await expect(page.getByRole('button', { name: `Ver cadastro de ${nome}`, exact: true })).toBeVisible({ timeout: 30_000 })
  return estado
}

async function conferirLargura(dialog: Locator, largura: number) {
  const medidas = await dialog.evaluate(el => {
    const d = el.getBoundingClientRect()
    const cortados = Array.from(el.querySelectorAll('input, select, button, h2, dd, .app-alert')).filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect()).filter(r => r.left < d.left || r.right > d.right + 1).length
    const rolagens = Array.from(el.querySelectorAll('*')).filter(e => !e.matches('input, select, textarea') && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1).length
    return { largura: d.width, esquerda: d.left, direita: d.right, transborda: el.scrollWidth > el.clientWidth + 1, cortados, rolagens }
  })
  expect(medidas.esquerda).toBeGreaterThanOrEqual(15)
  expect(medidas.direita).toBeLessThanOrEqual(largura - 15)
  expect(medidas.transborda).toBe(false)
  expect(medidas.cortados).toBe(0)
  expect(medidas.rolagens).toBe(0)
  if (largura >= 1000) { expect(medidas.largura).toBeGreaterThanOrEqual(880); expect(medidas.largura).toBeLessThanOrEqual(960) }
}

async function conferirContraste(alvo: Locator) {
  const contraste = await alvo.evaluate(el => {
    const estilo = getComputedStyle(el)
    const contexto = document.createElement('canvas').getContext('2d')!
    const luminancia = (cor: string) => {
      contexto.clearRect(0, 0, 1, 1); contexto.fillStyle = cor; contexto.fillRect(0, 0, 1, 1)
      const canais = [...contexto.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 })
      return canais[0] * .2126 + canais[1] * .7152 + canais[2] * .0722
    }
    const texto = luminancia(estilo.color), fundo = luminancia(estilo.backgroundColor)
    return (Math.max(texto, fundo) + .05) / (Math.min(texto, fundo) + .05)
  })
  expect(contraste).toBeGreaterThanOrEqual(4.5)
}

test('acabamento Equipe: formulários sem cortes, uma rolagem, teclado e viewport reduzida', async ({ page }, info) => {
  test.setTimeout(120_000)
  const inicial = page.viewportSize()!
  const tamanhos = info.project.name === 'mobile' ? [360, 390, 430].map(width => ({ width, height: 844 })) : [inicial]
  for (const tamanho of tamanhos) {
    await page.setViewportSize(tamanho)
    const estado = await preparar(page)
    await page.getByRole('button', { name: 'Novo membro', exact: true }).click()
    let dialog = page.getByRole('dialog', { name: 'Novo membro da equipe', exact: true })
    await dialog.getByLabel('Tipo de função *').selectOption('administrativo')
    await expect(dialog.getByLabel('Profissão *')).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Salvar cadastro' })).toBeDisabled()
    await conferirLargura(dialog, tamanho.width)
    await page.screenshot({ path: `${pasta}/${info.project.name}-${tamanho.width}-novo-admin.png` })
    await dialog.getByLabel('Tipo de função *').selectOption('profissional_saude')
    await dialog.getByLabel('Nome completo *').fill('Maria Exemplo Sintético')
    await dialog.getByLabel('Cargo ou função *').selectOption('Médico(a)')
    await dialog.getByLabel('Profissão *').fill('Medicina')
    await conferirContraste(dialog.getByRole('button', { name: 'Salvar cadastro' }))
    await dialog.evaluate(el => { el.scrollTop = 0 })
    await page.screenshot({ path: `${pasta}/${info.project.name}-${tamanho.width}-novo-saude.png` })
    await dialog.getByLabel('Especialidade', { exact: true }).scrollIntoViewIfNeeded()
    await expect(dialog.getByLabel('Especialidade', { exact: true })).toBeInViewport()
    await dialog.getByRole('button', { name: 'Salvar cadastro' }).scrollIntoViewIfNeeded()
    await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeInViewport()
    await page.screenshot({ path: `${pasta}/${info.project.name}-${tamanho.width}-novo-fim.png` })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toContainText('Descartar alterações não salvas?')
    await page.getByRole('button', { name: 'Descartar alterações', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    const origemEdicao = await editarCadastro(page, nome)
    dialog = page.getByRole('dialog', { name: 'Editar membro da equipe', exact: true })
    await expect(dialog.getByTestId('vinculos-existentes')).toContainText('Clínica B')
    await expect(dialog.getByTestId('tipo-membro-atual')).toContainText('Profissional de saúde')
    await conferirLargura(dialog, tamanho.width)
    await dialog.getByRole('button', { name: 'Fechar', exact: true }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('button', { name: 'Salvar cadastro' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused()
    await dialog.evaluate(el => { el.scrollTop = 0 })
    await page.screenshot({ path: `${pasta}/${info.project.name}-${tamanho.width}-edicao.png` })
    if (tamanho.width < 500) {
      await page.setViewportSize({ ...tamanho, height: 420 })
      await dialog.getByLabel('E-mail de contato').focus()
      await expect(dialog.getByLabel('E-mail de contato')).toBeInViewport()
      await dialog.getByRole('button', { name: 'Salvar cadastro' }).scrollIntoViewIfNeeded()
      await expect(dialog.getByRole('button', { name: 'Salvar cadastro' })).toBeInViewport()
      await page.screenshot({ path: `${pasta}/mobile-${tamanho.width}-altura-reduzida.png` })
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(origemEdicao).toBeFocused()
    expect(estado.escritas).toBe(0)
    await page.unrouteAll({ behavior: 'wait' })
  }
})

test('acabamento Equipe: fichas, nomes longos, controles de acesso, alerta e carregamento', async ({ page }, info) => {
  test.setTimeout(120_000)
  const inicial = page.viewportSize()!
  const tamanhos = info.project.name === 'mobile' ? [360, 390, 430].map(width => ({ width, height: 844 })) : [inicial]
  for (const tamanho of tamanhos) {
  await page.setViewportSize(tamanho)
  const estado = await preparar(page)
  for (const [id, nomePessoa] of [['ativa', nome], ['sem', 'Pessoa Sem Conta Sintética'], ['pendente', 'Convite Sintético']]) {
    await page.getByRole('button', { name: `Ver cadastro de ${nomePessoa}`, exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByTestId('painel-gestao-acessos')).toBeVisible()
    await conferirLargura(dialog, page.viewportSize()!.width)
    await page.screenshot({ path: `${pasta}/${info.project.name}-${tamanho.width}-ficha-${id}-inicio.png` })
    if (id === 'ativa') {
      await expect(dialog.getByLabel('Papel de Clínica A', { exact: true })).toHaveValue('medico')
      await expect(dialog.getByRole('button', { name: 'Salvar papel' })).toBeDisabled()
      await conferirContraste(dialog.getByText('Acesso ativo', { exact: true }))
      await dialog.getByTestId('ficha-secao-acesso').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `${pasta}/${info.project.name}-${tamanho.width}-ficha-ativa-acessos.png` })
      await expect(dialog.getByLabel('Papel para concessão em Clínica B')).toHaveValue('')
      await expect(dialog.getByRole('button', { name: 'Conceder acesso' })).toBeDisabled()
    } else {
      if (id === 'pendente') await conferirContraste(dialog.getByText('Convite pendente', { exact: true }))
      await dialog.getByRole('button', { name: 'Enviar convite', exact: true }).scrollIntoViewIfNeeded()
      await expect(dialog.getByRole('button', { name: 'Enviar convite', exact: true })).toBeDisabled()
      await page.screenshot({ path: `${pasta}/${info.project.name}-${tamanho.width}-ficha-${id}-fim.png` })
    }
    await page.keyboard.press('Escape')
  }
  estado.lenta = true
  await page.getByRole('button', { name: `Ver cadastro de ${nome}`, exact: true }).click()
  await expect(page.getByTestId('ficha-carregando')).toBeVisible()
  await page.screenshot({ path: `${pasta}/${info.project.name}-${tamanho.width}-carregamento.png` })
  estado.falha = true
  estado.lenta = false
  estado.liberar.forEach(liberar => liberar())
  await expect(page.getByTestId('ficha-erro')).toBeVisible()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('alert').scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('alert')).toBeInViewport()
  await conferirLargura(dialog, page.viewportSize()!.width)
  await page.screenshot({ path: `${pasta}/${info.project.name}-${tamanho.width}-erro.png` })
  expect(estado.escritas).toBe(0)
  await page.unrouteAll({ behavior: 'wait' })
  }
})

test('acabamento Equipe: ModalBase padrão da Agenda mantém apresentação e largura', async ({ page }, info) => {
  await page.goto('/tests/operacional/agenda-preview.html')
  await page.addStyleTag({ path: 'src/pages/cadastros/equipe.css' })
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  await page.getByRole('button', { name: /: marcar folga ou horário especial/ }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Marcar folga / horário especial' })
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate(el => el.classList.contains('equipe-modal'))).toBe(false)
  expect(await dialog.evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(448)
  await page.screenshot({ path: `${pasta}/${info.project.name}-agenda-modal-padrao.png` })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

import { expect, test, type Page } from '@playwright/test'

type OpcoesEquipe = { compatibilidade?: boolean }

function membro(clinicaId: string) {
  const sufixo = clinicaId === 'clinica-a' ? 'A' : 'B'
  return {
    id: `membro-${sufixo.toLowerCase()}`,
    nome_completo: `Profissional ${sufixo}`,
    cargo: 'Médico(a)',
    tipo: 'profissional_saude',
    profissao: 'Medicina',
    telefone: null,
    email_contato: `profissional${sufixo.toLowerCase()}@sintetico.invalid`,
    conselho_classe: 'CRM',
    registro_conselho: `123${sufixo}`,
    conselho_uf: 'BA',
    especialidade_id: 'esp-clinica-geral',
    especialidade_nome: 'Clínica geral',
    acesso_status: 'conta_vinculada',
    clinicas: [{ id: clinicaId, nome: `Clínica ${sufixo}` }],
    revisao: 1,
  }
}

async function interceptarEquipe(page: Page, opcoes: OpcoesEquipe = {}) {
  let salvamentos = 0
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const json = (body: string, status = 200) => route.fulfill({ status, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' }, contentType: 'application/json', body })
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' } })
    }
    if (url.pathname.endsWith('/rpc/equipe_listar')) {
      const corpo = route.request().postDataJSON() as { p_clinica_contexto_id: string }
      if (opcoes.compatibilidade) return json(JSON.stringify({ code: 'PGRST202', message: 'função indisponível' }), 404)
      return json(JSON.stringify([membro(corpo.p_clinica_contexto_id)]))
    }
    if (url.pathname.endsWith('/rpc/equipe_detalhar')) {
      const corpo = route.request().postDataJSON() as { p_membro_id?: string }
      return json(JSON.stringify({ ...membro(corpo.p_membro_id === 'membro-b' ? 'clinica-b' : 'clinica-a'), cpf: null, cpf_situacao: 'ausente' }))
    }
    if (url.pathname.endsWith('/rpc/equipe_salvar')) {
      salvamentos += 1
      await new Promise((resolve) => setTimeout(resolve, 180))
      return json('null')
    }
    if (url.pathname.endsWith('/profissionais_clinicas')) {
      return json(JSON.stringify([{ profissional_id: 'legado-a', clinica_id: 'clinica-a', profissionais: { id: 'legado-a', nome_completo: 'Profissional legado', conselho_classe: 'CRM', registro_conselho: '99', usuario_id: null, especialidades: { nome: 'Clínica geral' } }, clinicas: { nome: 'Clínica A' } }]))
    }
    if (url.pathname.endsWith('/clinicas')) return json(JSON.stringify([{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }]))
    if (url.pathname.endsWith('/especialidades')) return json(JSON.stringify([{ id: 'esp-clinica-geral', nome: 'Clínica geral' }]))
    return json('[]')
  })
  return () => salvamentos
}

test('formulário valida perto do campo, mantém dados e confirma descarte', async ({ page }) => {
  await interceptarEquipe(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await expect(page.getByRole('status', { name: 'Clínica ativa' })).toContainText('Clínica A')
  await expect(page.getByText('Profissional A')).toBeVisible()
  await page.getByRole('button', { name: 'Novo membro' }).click()
  await expect(page.getByRole('dialog', { name: 'Novo membro da equipe' })).toBeVisible()
  await page.getByLabel('Cargo ou função *').selectOption({ label: 'Recepcionista' })
  await page.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(page.getByRole('alert')).toContainText('Revise o cadastro')
  await expect(page.locator('#equipe-erro-nomeCompleto')).toContainText('Informe o nome completo.')
  await expect(page.getByLabel('Nome completo *')).toBeFocused()
  await page.getByLabel('Nome completo *').fill('Pessoa Sintética')
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('alertdialog', { name: 'Descartar alterações não salvas?' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(page.getByLabel('Nome completo *')).toHaveValue('Pessoa Sintética')
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await page.getByRole('button', { name: 'Descartar alterações' }).click()
  await expect(page.getByRole('dialog', { name: 'Novo membro da equipe' })).toHaveCount(0)
})

test('troca de clínica limpa a lista anterior e o salvamento sintético bloqueia repetição', async ({ page }) => {
  const contarSalvamentos = await interceptarEquipe(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await page.getByRole('button', { name: 'Trocar para Clínica B' }).click()
  await expect(page.getByRole('status', { name: 'Clínica ativa' })).toContainText('Clínica B')
  await expect(page.getByText('Profissional B')).toBeVisible()
  await expect(page.getByText('Profissional A')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver cadastro de Profissional B' }).click()
  await expect(page.getByRole('dialog', { name: /Ficha de Profissional B/ })).toContainText('Clínica B')
  await page.getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('button', { name: 'Novo membro' }).click()
  await page.getByLabel('Nome completo *').fill('Funcionário Sintético')
  await page.getByLabel('Cargo ou função *').selectOption({ label: 'Recepcionista' })
  await page.getByRole('button', { name: 'Salvar cadastro' }).dblclick()
  await expect(page.getByRole('status').filter({ hasText: 'Funcionário cadastrado com sucesso.' })).toBeVisible()
  expect(contarSalvamentos()).toBe(1)
})

test('modo de compatibilidade explica o bloqueio e mantém consulta legada somente leitura', async ({ page }) => {
  await interceptarEquipe(page, { compatibilidade: true })
  await page.goto('/tests/operacional/equipe-contexto.html')
  await expect(page.getByRole('status').filter({ hasText: 'Cadastro e edição aguardam homologação do banco' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Cadastro e edição aguardam homologação do banco' })).toContainText('nenhuma alteração será salva')
  await expect(page.getByRole('button', { name: 'Novo membro' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Editar cadastro de Profissional legado' })).toBeDisabled()
})

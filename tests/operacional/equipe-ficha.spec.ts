import { expect, test, type Page } from '@playwright/test'
import { abrirSecaoFicha } from './equipe-ficha-helpers'

type MembroSintetico = Record<string, unknown> & { id: string; nome_completo: string; clinicas: { id: string; nome: string }[] }

const profissional: MembroSintetico = {
  id: 'membro-saude', nome_completo: 'Dra. Saúde Sintética', cargo: 'Médico(a)', tipo: 'profissional_saude', profissao: 'Medicina',
  telefone: '(75) 99999-0000', email_contato: 'saude@sintetico.invalid', conselho_classe: 'CRM', registro_conselho: '12345', conselho_uf: 'BA',
  especialidade_id: 'esp-clinica-geral', especialidade_nome: 'Clínica geral', acesso_status: 'conta_vinculada',
  clinicas: [{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }], revisao: 2,
}

const recepcao: MembroSintetico = {
  id: 'membro-recepcao', nome_completo: 'Recepção Sintética', cargo: 'Recepcionista', tipo: 'administrativo', profissao: null,
  telefone: null, email_contato: null, conselho_classe: null, registro_conselho: null, conselho_uf: null,
  especialidade_id: null, especialidade_nome: null, acesso_status: 'sem_conta', clinicas: [{ id: 'clinica-a', nome: 'Clínica A' }], revisao: 1,
}

const apoio: MembroSintetico = {
  id: 'membro-apoio', nome_completo: 'Apoio Sintético', cargo: 'Serviços gerais', tipo: 'apoio', profissao: null,
  telefone: null, email_contato: null, conselho_classe: null, registro_conselho: null, conselho_uf: null,
  especialidade_id: null, especialidade_nome: null, acesso_status: 'conta_vinculada',
  clinicas: [{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }], revisao: 1,
}

const falha: MembroSintetico = {
  id: 'membro-falha', nome_completo: 'Ficha indisponível Sintética', cargo: 'Auxiliar administrativo', tipo: 'administrativo', profissao: null,
  telefone: null, email_contato: 'falha@sintetico.invalid', conselho_classe: null, registro_conselho: null, conselho_uf: null,
  especialidade_id: null, especialidade_nome: null, acesso_status: 'sem_acesso_na_unidade', clinicas: [{ id: 'clinica-a', nome: 'Clínica A' }], revisao: 1,
}

function detalhe(membro: MembroSintetico) {
  if (membro.id === profissional.id) return { ...membro, cpf: '52998224725', cpf_situacao: 'informado' }
  if (membro.id === apoio.id) return { ...membro, cpf: null, cpf_situacao: 'indisponivel' }
  return { ...membro, cpf: null, cpf_situacao: 'ausente' }
}

async function interceptarFicha(page: Page) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const json = (body: string, status = 200) => route.fulfill({
      status,
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' },
      contentType: 'application/json', body,
    })
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' } })
    if (url.pathname.endsWith('/functions/v1/equipe-acessos')) {
      const corpo = route.request().postDataJSON() as { acao?: string; membroId?: string }
      if (corpo.acao === 'listar') {
        const membro = [profissional, recepcao, apoio, falha].find((item) => item.id === corpo.membroId) ?? recepcao
        const clinicas = membro.clinicas.map((clinica) => ({ id: clinica.id, nome: clinica.nome, usuario_id: membro.id === recepcao.id ? null : `usuario-${membro.id}`, papel: membro.id === profissional.id ? 'medico' : 'recepcao', ativo: membro.id !== falha.id, status: membro.id === recepcao.id ? 'sem_acesso' : membro.id === falha.id ? 'acesso_suspenso' : 'acesso_ativo' }))
        return json(JSON.stringify({ membro_id: membro.id, usuario_id: membro.id === recepcao.id ? null : `usuario-${membro.id}`, login_email: membro.id === recepcao.id ? null : `login-${membro.id}@synthetic.invalid`, conta_confirmada: membro.id !== recepcao.id, clinicas, convites: [] }))
      }
      return json(JSON.stringify({ mensagem: 'Operação sintética concluída.' }))
    }
    if (url.pathname.endsWith('/rpc/equipe_listar')) {
      const corpo = route.request().postDataJSON() as { p_clinica_contexto_id: string }
      return json(JSON.stringify(corpo.p_clinica_contexto_id === 'clinica-b' ? [profissional] : [profissional, recepcao, apoio, falha]))
    }
    if (url.pathname.endsWith('/rpc/equipe_detalhar')) {
      const corpo = route.request().postDataJSON() as { p_membro_id?: string }
      const membro = [profissional, recepcao, apoio, falha].find((item) => item.id === corpo.p_membro_id) ?? profissional
      if (membro.id === falha.id) return json(JSON.stringify({ code: 'PGRST000', message: 'falha sintética de leitura' }), 500)
      if (membro.id === profissional.id) await new Promise((resolve) => setTimeout(resolve, 240))
      return json(JSON.stringify(detalhe(membro)))
    }
    if (url.pathname.endsWith('/clinicas')) return json(JSON.stringify([{ id: 'clinica-a', nome: 'Clínica A' }, { id: 'clinica-b', nome: 'Clínica B' }]))
    if (url.pathname.endsWith('/especialidades')) return json(JSON.stringify([{ id: 'esp-clinica-geral', nome: 'Clínica geral' }]))
    if (url.pathname.endsWith('/profissionais_clinicas')) return json('[]')
    return json('[]')
  })
}

test('ficha de profissional mostra seções, CPF mascarado, acesso não confirmado e dois vínculos', async ({ page }) => {
  await interceptarFicha(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await page.getByRole('button', { name: 'Ver cadastro de Dra. Saúde Sintética' }).click()
  const dialog = page.getByRole('dialog', { name: /Dra\. Saúde Sintética/ })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByTestId('ficha-secao-identificacao')).toContainText('Médico(a)')
  await expect(dialog.getByTestId('ficha-secao-profissional')).toContainText('Medicina')
  await expect(dialog.getByTestId('ficha-secao-clinicas')).toContainText('Clínica A')
  await expect(dialog.getByTestId('ficha-secao-clinicas')).toContainText('Clínica B')
  await expect(dialog.getByTestId('ficha-secao-acesso')).toContainText('Conta de acesso vinculada')
  await expect(dialog).toContainText('529.***.***-25')
  await expect(dialog).not.toContainText('52998224725')
})

test('ficha de recepção e apoio explicita campos não aplicáveis e indisponíveis', async ({ page }) => {
  await interceptarFicha(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await page.getByRole('button', { name: 'Ver cadastro de Recepção Sintética' }).click()
  let dialog = page.getByRole('dialog', { name: /Recepção Sintética/ })
  await expect(dialog.getByTestId('ficha-secao-profissional')).toContainText('não se aplicam')
  // Campo vazio agora aparece como "Não informado" (antes "Não cadastrado").
  await expect(dialog.getByTestId('ficha-secao-identificacao')).toContainText('Não informado')
  await expect(dialog.getByTestId('ficha-secao-acesso')).toContainText('Sem conta vinculada')
  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('button', { name: 'Ver cadastro de Apoio Sintético' }).click()
  dialog = page.getByRole('dialog', { name: /Apoio Sintético/ })
  await expect(dialog.getByTestId('ficha-secao-profissional')).toContainText('não se aplicam')
  await expect(dialog.getByTestId('ficha-secao-identificacao')).toContainText('Indisponível nesta consulta')
  await expect(dialog.getByTestId('ficha-secao-acesso')).toContainText('Conta de acesso vinculada')
})

test('gestão sintética diferencia acesso ativo e sem acesso sem gravar no banco', async ({ page }) => {
  await interceptarFicha(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await page.getByRole('button', { name: 'Ver cadastro de Dra. Saúde Sintética' }).click()
  let dialog = page.getByRole('dialog', { name: /Dra\. Saúde Sintética/ })
  await expect(dialog.getByTestId('painel-gestao-acessos')).toContainText('Acesso ativo')
  await expect(dialog.getByTestId('painel-gestao-acessos')).toContainText('login-membro-saude@synthetic.invalid')
  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('button', { name: 'Ver cadastro de Recepção Sintética' }).click()
  dialog = page.getByRole('dialog', { name: /Recepção Sintética/ })
  await expect(dialog.getByTestId('painel-gestao-acessos')).toContainText('Sem acesso')
  await expect(dialog.getByTestId('painel-gestao-acessos')).toContainText('Iniciar acesso')
  await expect(dialog.getByTestId('painel-gestao-acessos')).toContainText('O cadastro pode permanecer sem login')
})

test('fechar a ficha sem alteração não pede descarte quando o e-mail de login difere do contato', async ({ page }) => {
  await interceptarFicha(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await page.getByRole('button', { name: 'Ver cadastro de Dra. Saúde Sintética' }).click()
  const dialog = page.getByRole('dialog', { name: /Dra\. Saúde Sintética/ })
  // Login (login-membro-saude@…) diferente do contato (saude@…), já carregado no painel de acesso.
  await expect(dialog.getByTestId('painel-gestao-acessos')).toContainText('login-membro-saude@synthetic.invalid')
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(dialog).toHaveCount(0)
  // Alteração real do e-mail de login continua protegida pelo aviso de descarte.
  await page.getByRole('button', { name: 'Ver cadastro de Recepção Sintética' }).click()
  const recepcao = page.getByRole('dialog', { name: /Recepção Sintética/ })
  await expect(recepcao.getByTestId('painel-gestao-acessos')).toContainText('Iniciar acesso')
  await abrirSecaoFicha(recepcao, 'Acesso ao sistema')
  await recepcao.getByLabel('E-mail de login').fill('outro@synthetic.invalid')
  await recepcao.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText('Descartar alterações desta ficha?')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(recepcao.getByLabel('E-mail de login')).toHaveValue('outro@synthetic.invalid')
})

test('falha de leitura mostra erro compreensível sem detalhes técnicos', async ({ page }) => {
  await interceptarFicha(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await page.getByRole('button', { name: 'Ver cadastro de Ficha indisponível Sintética' }).click()
  const dialog = page.getByRole('dialog', { name: /Ficha indisponível Sintética/ })
  await expect(dialog.getByTestId('ficha-erro')).toContainText('Não foi possível carregar a ficha')
  await expect(dialog).not.toContainText('PGRST000')
  await expect(dialog).not.toContainText('falha sintética')
})

test('resposta antiga de membro ou clínica não reaparece após troca rápida', async ({ page }) => {
  await interceptarFicha(page)
  await page.goto('/tests/operacional/equipe-contexto.html')
  await page.getByRole('button', { name: 'Ver cadastro de Dra. Saúde Sintética' }).click()
  await page.getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('button', { name: 'Ver cadastro de Recepção Sintética' }).click()
  const dialog = page.getByRole('dialog', { name: /Recepção Sintética/ })
  await expect(dialog).toContainText('Recepção Sintética')
  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('button', { name: 'Clínica A' }).click()
  await page.getByRole('button', { name: 'Ver cadastro de Dra. Saúde Sintética' }).click()
  await page.getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('button', { name: 'Trocar para Clínica B' }).click()
  await expect(page.getByRole('status', { name: 'Clínica ativa' })).toContainText('Clínica B')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.waitForTimeout(280)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Recepção Sintética')).toHaveCount(0)
})

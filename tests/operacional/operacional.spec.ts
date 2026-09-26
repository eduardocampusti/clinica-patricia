import { expect, test, type Page } from '@playwright/test'

async function abrirMenuMobile(page: Page) {
  const botao = page.getByRole('button', { name: 'Abrir menu' })
  if (await botao.isVisible()) {
    await botao.click()
    await page.waitForTimeout(250)
  }
}

test('navegação apresenta somente funções operacionais do papel', async ({ page }, info) => {
  const papel = info.project.name === 'tablet' ? 'recepcao' : info.project.name === 'mobile' ? 'medico' : 'proprietaria'
  await page.goto(`/tests/operacional/shell.html?papel=${papel}`)
  await abrirMenuMobile(page)
  const navegacao = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(navegacao).toBeVisible()
  await expect(navegacao).not.toContainText(/Atendimentos|Configurações|Especialidades|Relatórios/)
  await expect(page.getByText('Buscar paciente ou agenda...')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /notifica/i })).toHaveCount(0)
  if (papel === 'medico') {
    await expect(navegacao).toContainText('Prontuários')
    await expect(navegacao).not.toContainText(/Pacientes|Equipe/)
    await expect(page.getByText('Visão do profissional')).toBeVisible()
  } else if (papel === 'recepcao') {
    await expect(navegacao).not.toContainText('Prontuários')
    await expect(page.getByText('Visão da recepção')).toBeVisible()
  } else {
    await expect(page.getByText('Visão de proprietário(a)')).toBeVisible()
  }
  await page.screenshot({ path: `scratch/fase11-operacional/navegacao-${papel}-${info.project.name}.png`, fullPage: true })
})

test('pacientes não baixa CPFs e faz busca exata segura na clínica ativa', async ({ page }, info) => {
  let chamadasBuscaCpf = 0
  let chamadasDecrypt = 0
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    if (url.pathname.endsWith('/pacientes')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: 'paciente-1', nome_completo: 'Paciente Sintética', data_nascimento: '1990-01-02', telefone: '(71) 90000-0000', endereco: 'Rua Sintética, 10, Centro, Salvador - BA, CEP 40000-000', foto_path: null },
      { id: 'paciente-2', nome_completo: 'Outra Pessoa', data_nascimento: null, telefone: null, endereco: null, foto_path: null },
    ]) })
    if (url.pathname.endsWith('/rpc/paciente_responsavel_legal_resumo')) {
      const consulta = route.request().postDataJSON()
      expect(consulta.p_clinica_id).toBe('clinica-sintetica')
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(consulta.p_paciente_id === 'paciente-1'
        ? [{ id: 'responsavel-1', nome_completo: 'Responsável Sintético', vinculo: 'Mãe', telefone: '71900000000', email: null }]
        : []) })
    }
    if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) return route.fulfill({ contentType: 'application/json', body: 'true' })
    if (url.pathname.endsWith('/rpc/paciente_buscar_por_cpf')) {
      chamadasBuscaCpf += 1
      expect(route.request().postDataJSON()).toEqual({ p_clinica_id: 'clinica-sintetica', p_cpf: '52998224725' })
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { id: 'paciente-inativo', nome_completo: 'Paciente Inativo', data_nascimento: null, telefone: null, endereco: null, ativo: false },
      ]) })
    }
    if (url.pathname.endsWith('/rpc/cpf_decrypt')) {
      chamadasDecrypt += 1
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'não deve chamar' }) })
    }
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })
  await page.goto('/tests/operacional/pacientes.html')
  await expect(page.locator('body')).not.toContainText(/cpf-cifrado|123\.456\.789/)
  expect(chamadasDecrypt).toBe(0)
  await page.getByRole('searchbox', { name: 'Buscar paciente por nome' }).fill('não existe')
  await expect(page.getByText('Nenhum resultado nesta clínica')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar paciente por nome' }).fill('Paciente')
  await expect(page.locator('body')).toContainText('Paciente Sintética')
  await expect(page.locator('body')).not.toContainText('Outra Pessoa')
  await page.getByRole('button', { name: 'Ver resumo de Paciente Sintética' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /Resumo do cadastro de Paciente Sintética/ }).or(page.getByRole('complementary', { name: /Resumo do cadastro de Paciente Sintética/ }))).toBeVisible()
  await expect(page.getByText('Rua Sintética, 10, Centro, Salvador - BA, CEP 40000-000')).toBeVisible()
  await expect(page.getByText('Responsável Sintético')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adicionar CPF' })).toBeVisible()
  await page.screenshot({ path: `scratch/pacientes-lista-${info.project.name}.png`, fullPage: true })
  if (info.project.name === 'mobile') {
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /Resumo do cadastro/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ver resumo de Paciente Sintética' })).toBeFocused()
    await page.getByRole('button', { name: 'Ver resumo de Paciente Sintética' }).press('Enter')
  }
  await page.getByRole('button', { name: 'Fechar resumo', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Buscar paciente por nome' }).fill('')
  await page.getByRole('button', { name: 'Ver resumo de Outra Pessoa' }).click()
  await expect(page.getByText('Idade não informada').first()).toBeVisible()
  await page.getByRole('button', { name: 'Fechar resumo', exact: true }).click()

  await page.getByRole('button', { name: 'CPF exato' }).click()
  const buscaCpf = page.getByLabel('Buscar por CPF exato')
  await buscaCpf.fill('11111111111')
  await page.getByRole('button', { name: 'Buscar CPF' }).click()
  await expect(page.getByRole('alert')).toContainText('11 dígitos válidos')
  expect(chamadasBuscaCpf).toBe(0)
  await buscaCpf.fill('52998224725')
  await page.getByRole('button', { name: 'Buscar CPF' }).click()
  await expect(page.getByText('Paciente Inativo').filter({ visible: true })).toBeVisible()
  await expect(page.locator('.pacientes-status--inativo')).toBeVisible()
  expect(chamadasBuscaCpf).toBe(1)
  expect(chamadasDecrypt).toBe(0)
  await page.screenshot({ path: `scratch/fase11-operacional/pacientes-${info.project.name}.png`, fullPage: true })
})

test('Pacientes limpa seleção e resumo imediatamente na troca de clínica com respostas atrasadas', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    if (url.pathname.endsWith('/pacientes')) {
      const clinicaB = url.searchParams.get('clinica_id') === 'eq.clinica-b'
      if (clinicaB) await new Promise((resolve) => setTimeout(resolve, 300))
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: clinicaB ? 'paciente-b' : 'paciente-a', nome_completo: clinicaB ? 'Paciente Clínica B' : 'Paciente Clínica A', data_nascimento: null, telefone: null, endereco: clinicaB ? 'Endereço B' : 'Endereço A', foto_path: null }]) })
    }
    if (url.pathname.endsWith('/rpc/paciente_responsavel_legal_resumo')) {
      const corpo = route.request().postDataJSON()
      if (corpo.p_clinica_id === 'clinica-a') await new Promise((resolve) => setTimeout(resolve, 500))
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'r', nome_completo: corpo.p_clinica_id === 'clinica-a' ? 'Responsável A' : 'Responsável B', vinculo: 'Mãe', telefone: '71900000000' }]) })
    }
    if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) return route.fulfill({ contentType: 'application/json', body: 'false' })
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })
  await page.goto('/tests/operacional/pacientes-contexto.html')
  await page.getByRole('button', { name: 'Ver resumo de Paciente Clínica A' }).click()
  // A troca externa de contexto também pode ocorrer enquanto o painel móvel cobre a tela.
  await page.getByRole('button', { name: 'Trocar para Clínica B' }).evaluate((botao: HTMLButtonElement) => botao.click())
  await expect(page.getByText('Carregando contexto da clínica...')).toBeVisible()
  await expect(page.getByText('Paciente Clínica A')).toHaveCount(0)
  await expect(page.getByText('Endereço A')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ver resumo de Paciente Clínica B' })).toBeVisible()
  await page.waitForTimeout(600)
  await expect(page.getByText('Responsável A')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver resumo de Paciente Clínica B' }).click()
  await expect(page.getByText('Responsável B')).toBeVisible()
})

test('cadastro de paciente valida antes de gravar, aceita CPF vazio e protege endereço manual', async ({ page }, info) => {
  let chamadasCpf = 0
  let pacienteInserido: Record<string, unknown> | null = null

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()

    if (url.hostname === 'viacep.com.br') {
      const cep = url.pathname.split('/')[2]
      if (cep === '99999999') {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ erro: true }) })
      }
      if (cep === '88888888') return route.abort('failed')
      if (cep === '11111111') {
        await new Promise((resolve) => setTimeout(resolve, 350))
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
          cep: '11111-111', logradouro: 'Rua Antiga', bairro: 'Bairro Antigo', localidade: 'Cidade Antiga', uf: 'BA',
        }) }).catch(() => undefined)
      }
      if (cep === '40010000') {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
          cep: '40010-000', logradouro: 'Avenida XV de Novembro', bairro: 'Dois de Julho', localidade: 'Salvador', uf: 'BA',
        }) })
      }
      if (cep === '20000000') {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
          cep: '20000-000', logradouro: '', bairro: '', localidade: 'Rio de Janeiro', uf: 'RJ',
        }) })
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP',
      }) })
    }

    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    if (url.pathname.endsWith('/rpc/cpf_encrypt') || url.pathname.endsWith('/rpc/cpf_hash')) {
      chamadasCpf += 1
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify('valor-protegido') })
    }
    if (url.pathname.endsWith('/pacientes')) {
      if (route.request().method() === 'POST') {
        const corpo = route.request().postDataJSON() as Record<string, unknown> | Record<string, unknown>[]
        pacienteInserido = Array.isArray(corpo) ? corpo[0] : corpo
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'paciente-novo', nome_completo: pacienteInserido.nome_completo }) })
      }
      return route.fulfill({ contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })

  await page.goto('/tests/operacional/pacientes.html')
  await page.getByRole('button', { name: /Novo paciente/ }).click()

  const nome = page.getByLabel('Nome completo')
  const avatar = page.locator('.paciente-avatar')
  await expect(avatar.locator('svg')).toBeVisible()
  await nome.fill("mARIA dA silva e d'ÁVILA")
  await expect(nome).toHaveValue("Maria da Silva e D'Ávila")
  await page.getByLabel('Data de nascimento', { exact: true }).fill('1990-02-05')
  await expect(avatar).toHaveText('MD')
  await nome.evaluate((campo: HTMLInputElement) => {
    const indice = campo.value.indexOf('vila')
    campo.focus()
    campo.setSelectionRange(indice, indice + 1)
  })
  await nome.press('V')
  await expect(nome).toHaveValue("Maria da Silva e D'ÁVila")
  await nome.fill('OUTRO NOME')
  await expect(nome).toHaveValue('Outro Nome')
  await nome.fill("mARIA dA silva e d'ÁVILA")
  await expect(nome).toHaveValue("Maria da Silva e D'Ávila")

  const cpf = page.getByLabel(/CPF/)
  await cpf.fill('52998224725')
  await expect(cpf).toHaveValue('529.982.247-25')
  await cpf.press('End')
  await cpf.press('Backspace')
  await expect(cpf).toHaveValue('529.982.247-2')
  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
  await expect(page.getByRole('alert')).toContainText('Confira o CPF informado')
  await expect(cpf).toHaveValue('529.982.247-2')
  expect(chamadasCpf).toBe(0)
  await cpf.fill('')
  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()

  const telefone = page.getByLabel('Telefone / WhatsApp')
  await telefone.fill('7133334444')
  await expect(telefone).toHaveValue('(71) 3333-4444')
  await telefone.fill('71999998888')
  await expect(telefone).toHaveValue('(71) 99999-8888')

  const cep = page.getByLabel('CEP')
  await cep.fill('99999999')
  await expect(page.getByRole('alert')).toContainText('CEP não encontrado')
  await cep.fill('88888888')
  await expect(page.getByRole('alert')).toContainText('Não foi possível consultar o CEP')

  await cep.fill('11111111')
  await cep.fill('01001000')
  await expect(page.getByLabel('Cidade')).toHaveValue('São Paulo')
  await expect(page.getByLabel('UF')).toHaveValue('SP')
  await page.waitForTimeout(450)
  await expect(page.getByLabel('Cidade')).toHaveValue('São Paulo')

  await cep.fill('20000000')
  await expect(page.getByLabel('Rua / logradouro')).toHaveValue('')
  await expect(page.getByLabel('Bairro')).toHaveValue('')
  await expect(page.getByLabel('Cidade')).toHaveValue('Rio de Janeiro')

  const cidade = page.getByLabel('Cidade')
  await cidade.fill('sÃO paULO especial')
  await cidade.press('Tab')
  await expect(cidade).toHaveValue('São Paulo Especial')
  await cep.fill('40010000')
  await expect(page.getByLabel('Rua / logradouro')).toHaveValue('Avenida XV de Novembro')
  await expect(cidade).toHaveValue('São Paulo Especial')
  await expect(page.getByLabel('UF')).toHaveValue('BA')

  await page.getByLabel('Número').fill('100')
  await page.getByLabel('Complemento').fill('SALA VIP')
  const email = page.getByLabel('E-mail')
  await email.fill('email-invalido')
  await page.getByRole('button', { name: 'Salvar paciente' }).click()

  expect(await email.evaluate((campo) => (campo as HTMLInputElement).checkValidity())).toBe(false)
  expect(pacienteInserido).toBeNull()
  await email.fill('')
  await page.getByRole('button', { name: 'Salvar paciente' }).click()

  await expect(page.getByText('Paciente cadastrado com sucesso.')).toBeVisible()
  expect(chamadasCpf).toBe(0)
  expect(pacienteInserido).toMatchObject({
    nome_completo: "Maria da Silva e D'Ávila",
    cpf_encrypted: null,
    cpf_hash: null,
    telefone: '(71) 99999-8888',
    endereco: 'Avenida XV de Novembro, 100, SALA VIP, Dois de Julho, São Paulo Especial - BA, CEP 40010-000',
  })

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `scratch/fase11-operacional/pacientes-formulario-${info.project.name}.png`, fullPage: true })
})

test('foto opcional tem prévia, trata webcam negada e persiste sem URL pública', async ({ page }) => {
  let uploads = 0
  let vinculos = 0
  await page.addInitScript(() => {
    const cabecalho = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replaceAll('=', '')
    const corpo = btoa(JSON.stringify({ sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).replaceAll('=', '')
    localStorage.setItem('sb-operacional-auth-token', JSON.stringify({
      access_token: `${cabecalho}.${corpo}.assinatura-sintetica`,
      refresh_token: 'refresh-sintetico',
      token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated' },
    }))
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException('negada', 'NotAllowedError')) },
    })
  })

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    if (url.pathname.includes('/storage/v1/object/pacientes-fotos/')) {
      uploads += 1
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: url.pathname }) })
    }
    if (url.pathname.endsWith('/rpc/paciente_definir_foto')) {
      vinculos += 1
      return route.fulfill({ contentType: 'application/json', body: 'null' })
    }
    if (url.pathname.endsWith('/pacientes')) {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
          id: '00000000-0000-4000-8000-000000000010', nome_completo: 'Pessoa Foto Sintética',
        }) })
      }
      return route.fulfill({ contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })

  await page.goto('/tests/operacional/pacientes.html')
  await page.getByRole('button', { name: /Novo paciente/ }).click()
  await page.getByLabel('Nome completo').fill('PESSOA FOTO SINTÉTICA')
  await page.getByLabel('Data de nascimento', { exact: true }).fill('1990-02-05')
  await page.getByRole('button', { name: 'Tirar foto com webcam' }).click()
  await expect(page.getByRole('alert')).toContainText('permissão do navegador')

  await page.locator('.paciente-arquivo-oculto').setInputFiles({
    name: 'paciente-sintetica.png',
    mimeType: 'image/png',
    buffer: Buffer.from('imagem-sintetica-sem-dados-reais'),
  })
  await expect(page.getByAltText('Prévia da foto do paciente')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar foto' }).click()
  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
  await page.getByRole('button', { name: /Voltar/ }).click()
  await expect(page.getByAltText('Prévia da foto do paciente')).toBeVisible()
  await expect(page.getByLabel('Nome completo')).toHaveValue('Pessoa Foto Sintética')
  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
  await page.getByRole('button', { name: 'Salvar paciente' }).click()

  await expect(page.getByText('Paciente cadastrado com sucesso.')).toBeVisible()
  expect(uploads).toBe(1)
  expect(vinculos).toBe(1)
})

test('menor exige responsável e envia vínculo atômico na mesma clínica', async ({ page }, info) => {
  let criacoes = 0
  let argumentos: Record<string, unknown> | null = null
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    if (url.pathname.endsWith('/rpc/paciente_menor_criar_com_responsavel')) {
      criacoes += 1
      argumentos = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'paciente-menor-sintetico', nome_completo: 'Paciente Menor', clinica_id: 'clinica-sintetica' }]) })
    }
    if (url.pathname.endsWith('/pacientes')) return route.fulfill({ contentType: 'application/json', body: '[]' })
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })
  await page.goto('/tests/operacional/pacientes.html')
  await page.getByRole('button', { name: /Novo paciente/ }).click()
  await page.getByLabel('Nome completo').fill('PACIENTE MENOR')
  const nascimento = page.getByLabel('Data de nascimento', { exact: true })
  await nascimento.fill('')
  await expect(page.getByLabel('Idade calculada pela data de nascimento')).toHaveValue('')
  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
  await expect(page.getByRole('alert')).toContainText('data de nascimento válida')
  await nascimento.fill('2014-09-25')
  await expect(page.locator('.paciente-etapas').getByRole('button', { name: /Responsável legal/ })).toHaveCount(1)
  await page.getByRole('button', { name: /Avançar para Responsável legal/ }).click()
  await expect(page.getByRole('group', { name: 'Responsável legal' })).toBeVisible()
  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
  await expect(page.getByRole('alert')).toContainText('responsável legal')
  await page.getByLabel('Nome completo *', { exact: true }).last().fill('PESSOA RESPONSÁVEL')
  await page.getByLabel('Vínculo com o paciente').fill('MÃE')
  await page.getByLabel('Telefone / WhatsApp *').fill('71999998888')
  if (info.project.name === 'desktop') {
    await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = elemento.scrollHeight })
    await page.locator('.paciente-modal-backdrop').screenshot({ path: 'scratch/pacientes-menor-responsavel-desktop.png' })
  }
  await page.getByRole('button', { name: /Voltar para Identificação/ }).click()
  await nascimento.fill('1990-09-25')
  await expect(page.getByRole('group', { name: 'Responsável legal' })).toHaveCount(0)
  await nascimento.fill('2014-09-25')
  await page.getByRole('button', { name: /Avançar para Responsável legal/ }).click()
  await expect(page.getByLabel('Nome completo *', { exact: true }).last()).toHaveValue('Pessoa Responsável')
  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
  await page.getByRole('button', { name: 'Salvar paciente' }).click()
  await expect(page.getByText('Paciente cadastrado com sucesso.')).toBeVisible()
  expect(criacoes).toBe(1)
  expect(argumentos).toMatchObject({ p_clinica_id: 'clinica-sintetica', p_nome_completo: 'Paciente Menor', p_responsavel_nome: 'Pessoa Responsável', p_responsavel_telefone: '(71) 99999-8888', p_cpf: null, p_responsavel_cpf: null })
})

test('login mantém erro técnico encapsulado e bloqueia duplo envio', async ({ page }, info) => {
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid login credentials', code: 'invalid_credentials' }) })
  })
  await page.goto('/tests/operacional/login.html')
  await page.getByLabel('E-mail').fill('usuario@example.invalid')
  await page.getByLabel('Senha').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Entrando...' })).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos.')
  await expect(page.locator('body')).not.toContainText(/Invalid login credentials|invalid_credentials|Supabase/i)
  await page.screenshot({ path: `scratch/fase11-operacional/login-${info.project.name}.png`, fullPage: true })
})

test('Agenda descarta respostas antigas depois da troca de clínica', async ({ page }, info) => {
  const consultasCpf: Array<Record<string, unknown>> = []
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const consulta = decodeURIComponent(url.search)
    const clinicaA = consulta.includes('clinica-a')
    const sufixo = clinicaA ? 'A' : 'B'
    if (clinicaA) await new Promise((resolve) => setTimeout(resolve, 450))
    else await new Promise((resolve) => setTimeout(resolve, 200))
    if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) {
      consultasCpf.push(route.request().postDataJSON() as Record<string, unknown>)
      return route.fulfill({ contentType: 'application/json', body: 'false' })
    }
    if (url.pathname.endsWith('/usuarios_clinicas')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ papel: 'recepcao' }) })
    if (url.pathname.endsWith('/profissionais_clinicas')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { profissionais: { id: `prof-${sufixo}`, nome_completo: `Profissional ${sufixo}`, duracao_consulta_minutos: 30, valor_consulta: 200, especialidades: { nome: 'Clínica geral' } } },
    ]) })
    if (url.pathname.endsWith('/pacientes')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: `paciente-${sufixo}`, nome_completo: `Paciente ${sufixo}` },
    ]) })
    if (url.pathname.endsWith('/disponibilidade_padrao')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: `disp-${sufixo}`, profissional_id: `prof-${sufixo}`, dia_semana: new Date().getDay(), hora_inicio: '08:00:00', hora_fim: '18:00:00' },
    ]) })
    if (url.pathname.endsWith('/agendamentos')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: `agenda-${sufixo}`, profissional_id: `prof-${sufixo}`, paciente_id: `paciente-${sufixo}`, hora_inicio: '10:00:00', hora_fim: '10:30:00', status: 'confirmado', observacoes: null, pacientes: { nome_completo: `Paciente ${sufixo}` } },
    ]) })
    return route.fulfill({ contentType: 'application/json', body: '[]' })
  })
  await page.goto('/tests/operacional/agenda-contexto.html')
  await page.getByRole('button', { name: 'Trocar para Clínica B' }).click()
  const textoDuranteTroca = await page.locator('body').innerText()
  expect(textoDuranteTroca).not.toMatch(/Profissional A|Paciente A/)
  await expect(page.getByRole('status')).toContainText('Carregando contexto da clínica')
  await expect(page.getByText('Profissional B')).toBeVisible()
  await page.waitForTimeout(550)
  await expect(page.locator('body')).not.toContainText(/Profissional A|Paciente A/)
  await expect(page.locator('body')).toContainText('Paciente B')
  await page.getByRole('button', { name: /Novo agendamento/ }).click()
  await page.getByRole('combobox', { name: /^Paciente/ }).selectOption('paciente-B')
  await expect.poll(() => consultasCpf.length).toBe(1)
  expect(consultasCpf[0]).toEqual({ p_paciente_id: 'paciente-B', p_clinica_id: 'clinica-b' })
  await page.screenshot({ path: `scratch/fase11-operacional/agenda-troca-clinica-${info.project.name}.png`, fullPage: true })
})

test('novo paciente retorna à Agenda preservando o formulário e respeitando a clínica', async ({ page }) => {
  let pacienteInserido: Record<string, unknown> | null = null

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.continue()
    if (url.hostname === 'viacep.com.br') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ erro: true }) })
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const consulta = decodeURIComponent(url.search)
    const clinicaB = consulta.includes('clinica-b')
    const sufixo = clinicaB ? 'B' : 'A'

    if (url.pathname.endsWith('/usuarios_clinicas')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ papel: 'recepcao' }) })
    if (url.pathname.endsWith('/profissionais_clinicas')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { profissionais: { id: `prof-${sufixo}`, nome_completo: `Profissional ${sufixo}`, duracao_consulta_minutos: 30, valor_consulta: 200, especialidades: { nome: 'Clínica geral' } } },
    ]) })
    if (url.pathname.endsWith('/pacientes')) {
      if (route.request().method() === 'POST') {
        const corpo = route.request().postDataJSON() as Record<string, unknown> | Record<string, unknown>[]
        pacienteInserido = Array.isArray(corpo) ? corpo[0] : corpo
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'paciente-novo', nome_completo: pacienteInserido.nome_completo }) })
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { id: `paciente-${sufixo}`, nome_completo: `Paciente ${sufixo}` },
      ]) })
    }
    if (url.pathname.endsWith('/disponibilidade_padrao') || url.pathname.endsWith('/agenda_excecoes') || url.pathname.endsWith('/agendamentos') || url.pathname.endsWith('/lista_espera')) {
      return route.fulfill({ contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })

  await page.goto('/tests/operacional/agenda-contexto.html')
  await page.getByRole('button', { name: /Novo agendamento/ }).click()
  await page.getByRole('combobox', { name: /^Profissional/ }).selectOption('prof-A')
  await page.getByLabel(/^Data/).fill('2026-10-20')
  await page.getByLabel(/^Início/).fill('14:30')
  await page.getByLabel('Observações').fill('Retorno sintético preservado')

  await page.getByRole('button', { name: '+ Novo paciente' }).click()
  await expect(page.getByRole('form', { name: 'Cadastrar novo paciente' })).toBeVisible()
  await expect(page.locator('form form')).toHaveCount(0)
  await page.getByRole('button', { name: 'Fechar cadastro de paciente' }).click()
  await expect(page.getByRole('heading', { name: 'Novo agendamento' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: /^Profissional/ })).toHaveValue('prof-A')
  await expect(page.getByLabel(/^Data/)).toHaveValue('2026-10-20')
  await expect(page.getByLabel(/^Início/)).toHaveValue('14:30')
  await expect(page.getByLabel('Observações')).toHaveValue('Retorno sintético preservado')

  await page.getByRole('button', { name: '+ Novo paciente' }).click()
  await page.getByLabel('Nome completo').fill('Paciente Nova Sintética')
  await page.getByLabel('Data de nascimento', { exact: true }).fill('1990-05-18')
  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
  await page.getByRole('button', { name: 'Salvar paciente' }).click()
  await expect(page.getByRole('heading', { name: 'Novo agendamento' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: /^Paciente/ })).toHaveValue('paciente-novo')
  await expect(page.getByRole('combobox', { name: /^Profissional/ })).toHaveValue('prof-A')
  await expect(page.getByLabel(/^Data/)).toHaveValue('2026-10-20')
  await expect(page.getByLabel(/^Início/)).toHaveValue('14:30')
  await expect(page.getByLabel('Observações')).toHaveValue('Retorno sintético preservado')
  expect(pacienteInserido).toMatchObject({ clinica_id: 'clinica-a', nome_completo: 'Paciente Nova Sintética' })
  expect(pacienteInserido).not.toHaveProperty('consentimento_lgpd')

  await page.getByRole('button', { name: '+ Novo paciente' }).click()
  await page.getByRole('button', { name: 'Trocar para Clínica B' }).evaluate((botao: HTMLButtonElement) => botao.click())
  await expect(page.getByRole('form', { name: 'Cadastrar novo paciente' })).toHaveCount(0)
  await expect(page.getByText('Clínica B', { exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Paciente Nova Sintética')
})

test('Agenda lembra CPF uma vez por interação e preserva o agendamento ao adicionar', async ({ page }) => {
  let cpfSalvo = false
  let chamadasDefinirCpf = 0
  const consultasPendencia: Array<Record<string, unknown>> = []

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()

    if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) {
      consultasPendencia.push(route.request().postDataJSON() as Record<string, unknown>)
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(!cpfSalvo) })
    }
    if (url.pathname.endsWith('/rpc/paciente_definir_cpf')) {
      chamadasDefinirCpf += 1
      const corpo = route.request().postDataJSON() as Record<string, unknown>
      expect(corpo.p_paciente_id).toBe('paciente-A')
      expect(corpo.p_clinica_id).toBe('clinica-a')
      if (corpo.p_cpf === '52998224725') {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ code: '23505', message: 'conflito sintético, inclusive inativo' }),
        })
      }
      cpfSalvo = true
      return route.fulfill({ contentType: 'application/json', body: 'null' })
    }
    if (url.pathname.endsWith('/usuarios_clinicas')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ papel: 'recepcao' }) })
    if (url.pathname.endsWith('/profissionais_clinicas')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { profissionais: { id: 'prof-A', nome_completo: 'Profissional A', duracao_consulta_minutos: 30, valor_consulta: 200, especialidades: { nome: 'Clínica geral' } } },
    ]) })
    if (url.pathname.endsWith('/pacientes')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: 'paciente-A', nome_completo: 'Paciente A' },
    ]) })
    if (url.pathname.endsWith('/disponibilidade_padrao')) return route.fulfill({ contentType: 'application/json', body: '[]' })
    if (url.pathname.endsWith('/agendamentos')) return route.fulfill({ contentType: 'application/json', body: '[]' })
    return route.fulfill({ contentType: 'application/json', body: '[]' })
  })

  await page.goto('/tests/operacional/agenda-contexto.html')
  await page.getByRole('button', { name: /Novo agendamento/ }).click()
  await page.getByRole('combobox', { name: /^Profissional/ }).selectOption('prof-A')
  await page.getByLabel(/^Data/).fill('2026-10-15')
  await page.getByLabel(/^Início/).fill('09:30')
  await page.getByRole('combobox', { name: /^Paciente/ }).selectOption('paciente-A')
  await expect(page.getByLabel('CPF pendente de Paciente A')).toBeVisible()

  await page.getByRole('button', { name: 'Lembrar na próxima visita' }).click()
  await expect(page.getByLabel('CPF pendente de Paciente A')).toHaveCount(0)
  await page.getByRole('combobox', { name: /^Paciente/ }).selectOption('')
  await page.getByRole('combobox', { name: /^Paciente/ }).selectOption('paciente-A')
  await expect(page.getByLabel('CPF pendente de Paciente A')).toHaveCount(0)
  expect(consultasPendencia).toHaveLength(1)
  await expect(page.getByRole('combobox', { name: /^Profissional/ })).toHaveValue('prof-A')
  await expect(page.getByLabel(/^Data/)).toHaveValue('2026-10-15')
  await expect(page.getByLabel(/^Início/)).toHaveValue('09:30')

  await page.getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('button', { name: /Novo agendamento/ }).click()
  await page.getByRole('combobox', { name: /^Profissional/ }).selectOption('prof-A')
  await page.getByLabel(/^Data/).fill('2026-10-16')
  await page.getByLabel(/^Início/).fill('10:00')
  await page.getByRole('combobox', { name: /^Paciente/ }).selectOption('paciente-A')
  await expect(page.getByLabel('CPF pendente de Paciente A')).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar CPF' }).click()
  const cpf = page.getByLabel('CPF de Paciente A')
  await cpf.fill('11111111111')
  await page.getByRole('button', { name: 'Salvar CPF' }).click()
  await expect(page.getByRole('alert')).toContainText('11 dígitos válidos')
  expect(chamadasDefinirCpf).toBe(0)

  await cpf.fill('52998224725')
  await page.getByRole('button', { name: 'Salvar CPF' }).click()
  await expect(page.getByRole('alert')).toContainText('inclusive entre os inativos')
  expect(chamadasDefinirCpf).toBe(1)

  await cpf.fill('11144477735')
  await page.getByRole('button', { name: 'Salvar CPF' }).click()
  await expect(page.getByLabel('CPF pendente de Paciente A')).toHaveCount(0)
  expect(chamadasDefinirCpf).toBe(2)
  await expect(page.getByRole('combobox', { name: /^Profissional/ })).toHaveValue('prof-A')
  await expect(page.getByLabel(/^Data/)).toHaveValue('2026-10-16')
  await expect(page.getByLabel(/^Início/)).toHaveValue('10:00')
  expect(consultasPendencia.every((corpo) => corpo.p_clinica_id === 'clinica-a')).toBe(true)
})

test('registro de chegada exibe lembrete não bloqueante uma única vez', async ({ page }) => {
  let status = 'confirmado'
  let consultasPendencia = 0
  let atualizacaoIsolada = false

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const consulta = decodeURIComponent(url.search)

    if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) {
      consultasPendencia += 1
      expect(route.request().postDataJSON()).toEqual({ p_paciente_id: 'paciente-A', p_clinica_id: 'clinica-a' })
      return route.fulfill({ contentType: 'application/json', body: 'true' })
    }
    if (url.pathname.endsWith('/usuarios_clinicas')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ papel: 'recepcao' }) })
    if (url.pathname.endsWith('/profissionais_clinicas')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { profissionais: { id: 'prof-A', nome_completo: 'Profissional A', duracao_consulta_minutos: 30, valor_consulta: 200, especialidades: { nome: 'Clínica geral' } } },
    ]) })
    if (url.pathname.endsWith('/pacientes')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: 'paciente-A', nome_completo: 'Paciente A' },
    ]) })
    if (url.pathname.endsWith('/disponibilidade_padrao')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: 'disp-A', profissional_id: 'prof-A', dia_semana: new Date().getDay(), hora_inicio: '08:00:00', hora_fim: '18:00:00' },
    ]) })
    if (url.pathname.endsWith('/agendamentos')) {
      if (route.request().method() === 'PATCH') {
        atualizacaoIsolada = consulta.includes('id=eq.agenda-A') && consulta.includes('clinica_id=eq.clinica-a')
        status = 'aguardando'
        return route.fulfill({ contentType: 'application/json', body: '[]' })
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { id: 'agenda-A', profissional_id: 'prof-A', paciente_id: 'paciente-A', hora_inicio: '10:00:00', hora_fim: '10:30:00', status, observacoes: null, pacientes: { nome_completo: 'Paciente A' } },
      ]) })
    }
    return route.fulfill({ contentType: 'application/json', body: '[]' })
  })

  await page.goto('/tests/operacional/agenda-contexto.html')
  const agendamento = page.getByRole('button', { name: /^10:00 Paciente A/ })
  await agendamento.click()
  await page.getByRole('button', { name: 'Aguardando' }).click()
  await expect(page.getByLabel('Lembrete de CPF na chegada')).toBeVisible()
  expect(atualizacaoIsolada).toBe(true)
  expect(consultasPendencia).toBe(1)
  await page.getByRole('button', { name: 'Lembrar na próxima visita' }).click()
  await expect(page.getByLabel('Lembrete de CPF na chegada')).toHaveCount(0)

  await agendamento.click()
  await page.getByRole('button', { name: 'Aguardando' }).click()
  await page.waitForTimeout(150)
  expect(consultasPendencia).toBe(1)
  await expect(page.getByLabel('Lembrete de CPF na chegada')).toHaveCount(0)
})

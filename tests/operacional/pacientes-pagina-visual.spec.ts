import { expect, test } from '@playwright/test'

test('página completa de Pacientes mantém busca, resumo e cadastro em desktop e celular', async ({ page }, info) => {
  let chamadasDecrypt = 0
  const pacientes = [
    { id: 'exemplo-01', nome_completo: 'Adulto Exemplo', data_nascimento: '1990-01-02', telefone: '71900000000', endereco: 'Rua de Exemplo, 10, Centro, Cidade Fictícia - BA', foto_path: null },
    { id: 'exemplo-02', nome_completo: 'Contato Modelo', data_nascimento: '1982-01-30', telefone: '71900000001', endereco: null, foto_path: null },
    { id: 'exemplo-03', nome_completo: 'Menor Sintético', data_nascimento: '2014-09-12', telefone: null, endereco: 'Endereço sintético', foto_path: null },
    { id: 'exemplo-04', nome_completo: 'Nascimento Ausente', data_nascimento: null, telefone: '71900000003', endereco: null, foto_path: null },
    { id: 'exemplo-05', nome_completo: 'Registro Demonstrativo', data_nascimento: '1961-03-10', telefone: '71900000004', endereco: null, foto_path: null },
  ]

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    if (url.pathname.endsWith('/pacientes')) {
      expect(url.searchParams.get('clinica_id')).toBe('eq.clinica-sintetica')
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(pacientes) })
    }
    if (url.pathname.endsWith('/rpc/paciente_responsavel_legal_resumo')) {
      expect(route.request().postDataJSON().p_clinica_id).toBe('clinica-sintetica')
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { id: 'responsavel-exemplo', nome_completo: 'Responsável Exemplo', vinculo: 'Mãe', telefone: '71900000005', email: null },
      ]) })
    }
    if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) return route.fulfill({ contentType: 'application/json', body: 'true' })
    if (url.pathname.endsWith('/rpc/cpf_decrypt')) {
      chamadasDecrypt += 1
      return route.fulfill({ status: 500, contentType: 'application/json', body: 'null' })
    }
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })

  await page.goto('/tests/operacional/pacientes-pagina.html')
  await expect(page.getByRole('heading', { name: 'Pacientes', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ver resumo de Adulto Exemplo' })).toBeVisible()
  await expect(page.locator('.pacientes-lista-linha')).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Nome', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.pacientes-pagina-cabecalho .pacientes-botao-primario')).toHaveCSS('background-color', 'rgb(0, 97, 148)')
  await expect(page.locator('.pacientes-busca-modos button[aria-pressed="true"]')).toHaveCSS('background-color', 'rgb(0, 97, 148)')
  if (info.project.name === 'desktop') {
    const alinhamento = await page.evaluate(() => {
      const titulo = document.querySelector('.pacientes-lista-colunas span:last-child')?.getBoundingClientRect()
      const acao = document.querySelector('.pacientes-lista-acao')?.getBoundingClientRect()
      return titulo && acao ? Math.abs(titulo.right - acao.right) : Infinity
    })
    expect(alinhamento).toBeLessThan(2)
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth))
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `scratch/pacientes-pagina-${info.project.name}.png`, fullPage: true })

  await page.getByRole('button', { name: 'Ver resumo de Menor Sintético' }).click()
  await expect(page.getByRole('dialog', { name: /Resumo do cadastro de Menor Sintético/ }).or(page.getByRole('complementary', { name: /Resumo do cadastro de Menor Sintético/ }))).toBeVisible()
  await expect(page.getByText('Responsável Exemplo')).toBeVisible()
  await expect(page.getByText('Endereço sintético')).toBeVisible()
  await page.screenshot({ path: `scratch/pacientes-pagina-${info.project.name}-resumo.png`, fullPage: true })
  await page.getByRole('button', { name: 'Fechar resumo', exact: true }).click()

  await page.getByRole('searchbox', { name: 'Buscar paciente por nome' }).fill('sem correspondência')
  await expect(page.getByText('Nenhum resultado nesta clínica')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar paciente por nome' }).fill('')
  await page.getByRole('button', { name: 'CPF exato' }).click()
  await expect(page.getByText('Busca exata por CPF', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nome', exact: true }).click()
  await page.getByRole('button', { name: 'Novo paciente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Cadastrar Novo Paciente' })).toBeVisible()
  await expect(page.getByRole('note', { name: 'Convênios — Em planejamento' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar cadastro de paciente' }).click()
  await expect(page.getByRole('heading', { name: 'Pacientes', exact: true })).toBeVisible()
  expect(chamadasDecrypt).toBe(0)
})

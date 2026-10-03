import { expect, test } from '@playwright/test'

const tamanhos = [
  { nome: 'desktop-768', largura: 1366, altura: 768 },
  { nome: 'desktop-1000', largura: 1440, altura: 1000 },
  { nome: 'desktop-baixo', largura: 1366, altura: 600 },
  { nome: 'tablet', largura: 820, altura: 1180 },
  { nome: 'celular', largura: 390, altura: 844 },
] as const

const fotoSintetica = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9rM9sAAAAASUVORK5CYII=',
  'base64',
)

for (const perfil of ['adulto', 'menor'] as const) {
test(`endereço e contatos de ${perfil} preserva dados e controles acessíveis`, async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'O cenário percorre todos os tamanhos de tela internamente.')
  test.setTimeout(180_000)
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.continue()
    if (url.hostname === 'viacep.com.br') {
      if (url.pathname.includes('/99999999/')) {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ cep: '99999-999', logradouro: 'Rua Sintética', bairro: 'Bairro Sintético', localidade: 'Cidade Sintética', uf: 'BA' }) })
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ erro: true }) })
    }
    if (url.hostname === 'operacional.synthetic.invalid' && url.pathname.endsWith('/pacientes')) {
      return route.fulfill({ contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })

  for (const tamanho of tamanhos) {
      await page.setViewportSize({ width: tamanho.largura, height: tamanho.altura })
      await page.goto('/tests/operacional/pacientes.html', { waitUntil: 'commit' })
      await page.getByRole('button', { name: /Novo paciente/ }).click()
      await page.locator('#paciente-nome').fill('Paciente Sintético')
      await page.getByLabel('Data de nascimento', { exact: true }).fill(perfil === 'adulto' ? '1990-05-18' : '2014-05-18')
      if (tamanho.nome === 'desktop-768') {
        await page.locator('.paciente-arquivo-oculto').setInputFiles({ name: 'foto-sintetica.png', mimeType: 'image/png', buffer: fotoSintetica })
        await page.getByRole('button', { name: 'Confirmar foto' }).click()
      }
      if (perfil === 'menor') {
        await page.getByRole('button', { name: /Avançar para Responsável legal/ }).click()
        await page.getByLabel('Nome completo *', { exact: true }).last().fill('Responsável Sintético')
        await page.getByLabel('Vínculo com o paciente').fill('Mãe')
        await page.getByLabel('Telefone / WhatsApp *').fill('71999998888')
      }
      await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
      await expect(page.getByRole('heading', { name: 'Endereço Residencial e Contatos' })).toBeVisible()
      await page.getByLabel('CEP', { exact: true }).fill('99999999')
      await expect(page.getByLabel('Cidade', { exact: true })).toHaveValue('Cidade Sintética')
      await expect(page.getByLabel('UF', { exact: true })).toHaveValue('BA')
      await page.getByLabel('Número', { exact: true }).fill('42')
      await page.getByLabel('Telefone / WhatsApp', { exact: true }).fill('71999998888')
      await page.getByLabel('Observações').fill('Observação sintética')

      const medidas = await page.locator('.paciente-modal-scroll').evaluate((elemento) => ({
        visivel: elemento.clientHeight,
        conteudo: elemento.scrollHeight,
        rolagem: Math.max(0, elemento.scrollHeight - elemento.clientHeight),
      }))
      console.log(`${perfil} ${tamanho.nome}: área ${medidas.visivel}px; conteúdo ${medidas.conteudo}px; rolagem ${medidas.rolagem}px`)
      if (tamanho.nome === 'desktop-768') expect(medidas.rolagem, `${perfil}: 1366×768`).toBe(0)
      if (tamanho.nome === 'desktop-baixo' || tamanho.nome === 'celular') expect(medidas.rolagem).toBeGreaterThan(0)
      await expect(page.locator('.paciente-modal-rodape')).toBeInViewport()
      await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = 0 })
      await page.locator('.paciente-modal-backdrop').screenshot({ path: `scratch/pacientes-endereco-${perfil}-${tamanho.nome}-cep.png` })
      await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = elemento.scrollHeight })
      await expect(page.getByLabel('Observações')).toBeInViewport()
      const ultimoCampoLivre = await page.evaluate(() => {
        const campo = document.querySelector('#paciente-observacoes')!.getBoundingClientRect()
        const rodape = document.querySelector('.paciente-modal-rodape')!.getBoundingClientRect()
        return campo.bottom <= rodape.top && campo.top >= 0
      })
      expect(ultimoCampoLivre, `${perfil} ${tamanho.nome}: Observações acima do rodapé`).toBe(true)
      await expect(page.getByRole('button', { name: 'Salvar paciente' })).toBeInViewport()
      if (medidas.rolagem > 1) {
        await page.locator('.paciente-modal-backdrop').screenshot({ path: `scratch/pacientes-endereco-${perfil}-${tamanho.nome}-fim.png` })
      }

      await page.getByLabel('CEP', { exact: true }).fill('88888888')
      await expect(page.locator('#paciente-cep-status')).toContainText('CEP não encontrado')
      await page.getByLabel('E-mail', { exact: true }).fill('invalido@')
      expect(await page.getByLabel('E-mail', { exact: true }).evaluate((elemento: HTMLInputElement) => elemento.validity.valid)).toBe(false)
      const rolagemComErro = await page.locator('.paciente-modal-scroll').evaluate((elemento) => elemento.scrollHeight - elemento.clientHeight)
      console.log(`${perfil} ${tamanho.nome}: rolagem com validação ${Math.max(0, rolagemComErro)}px`)
      await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = elemento.scrollHeight })
      await expect(page.getByLabel('Observações')).toBeInViewport()
      expect(await page.evaluate(() => {
        const campo = document.querySelector('#paciente-observacoes')!.getBoundingClientRect()
        const rodape = document.querySelector('.paciente-modal-rodape')!.getBoundingClientRect()
        return campo.bottom <= rodape.top && campo.top >= 0
      }), `${perfil} ${tamanho.nome}: Observações acessível com validação`).toBe(true)
      await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = 0 })
      await page.locator('.paciente-modal-backdrop').screenshot({ path: `scratch/pacientes-endereco-${perfil}-${tamanho.nome}-validacao.png` })

      await page.getByLabel('CEP', { exact: true }).fill('99999999')
      await expect(page.getByLabel('Cidade', { exact: true })).toHaveValue('Cidade Sintética')
      await expect(page.getByLabel('Número', { exact: true })).toHaveValue('42')
      await page.getByRole('button', { name: perfil === 'adulto' ? /Voltar para Identificação/ : /Voltar para Responsável legal/ }).click()
      if (perfil === 'menor') {
        await expect(page.getByLabel('Nome completo *', { exact: true }).last()).toHaveValue('Responsável Sintético')
        await page.getByRole('button', { name: /Voltar para Identificação/ }).click()
      }
      await expect(page.locator('#paciente-nome')).toHaveValue('Paciente Sintético')
      if (tamanho.nome === 'desktop-768') await expect(page.getByAltText('Prévia da foto do paciente')).toBeVisible()
      await page.getByRole('button', { name: /Avançar para/ }).last().click()
      if (perfil === 'menor') await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
      await expect(page.getByLabel('Número', { exact: true })).toHaveValue('42')
      await expect(page.locator('.paciente-modal-rodape')).toBeInViewport()
  }
})
}

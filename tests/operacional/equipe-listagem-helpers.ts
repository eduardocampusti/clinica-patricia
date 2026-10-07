import { expect, type Locator, type Page } from '@playwright/test'

// Auxiliares da listagem de Equipe compartilhados pelas specs.

const rotulosTipo: Record<string, string> = { '': 'Todos', profissional_saude: 'Saúde', administrativo: 'Administrativo', apoio: 'Apoio', outro: 'Outro' }
const segmento = (page: Page, valor: string) => page.getByRole('radio', { name: new RegExp(`^${rotulosTipo[valor]}\\b`) })

/** Abaixo de 1024px o tipo é o select "Tipo de membro"; acima, um controle segmentado ligado ao mesmo filtro. */
export async function filtrarTipo(page: Page, valor: string) {
  const select = page.getByLabel('Tipo de membro', { exact: true })
  if (await select.count()) return select.selectOption(valor)
  // O rádio fica visualmente oculto; o clique acontece no segmento (rótulo), como para quem usa a tela.
  await page.locator('.equipe-segmento').filter({ has: segmento(page, valor) }).click()
  await expect(segmento(page, valor)).toBeChecked()
}

export async function conferirTipo(page: Page, valor: string) {
  const select = page.getByLabel('Tipo de membro', { exact: true })
  if (await select.count()) return expect(select).toHaveValue(valor)
  await expect(segmento(page, valor)).toBeChecked()
}

/** Na grade (768px ou mais) o acesso por clínica fica na linha expandida; nos cartões, sempre visível. */
export async function resumoAcesso(page: Page, id: string, nome: string): Promise<Locator> {
  const detalhes = page.getByRole('button', { name: `Detalhes de ${nome}`, exact: true })
  if (await detalhes.count() && await detalhes.getAttribute('aria-expanded') === 'false') await detalhes.click()
  return page.getByTestId(`resumo-acesso-${id}`)
}

/** Na grade a edição fica em "Mais ações"; nos cartões, no botão Editar da própria pessoa. */
export async function editarCadastro(page: Page, nome: string) {
  const menu = page.getByRole('button', { name: `Mais ações para ${nome}`, exact: true })
  if (await menu.count()) {
    await menu.click()
    await page.getByRole('menuitem', { name: 'Editar cadastro', exact: true }).click()
    return menu
  }
  const botao = page.getByRole('button', { name: `Editar cadastro de ${nome}`, exact: true })
  await botao.click()
  return botao
}

/** Item ou botão de edição de uma pessoa, para conferir estado desabilitado. */
export async function controleEdicao(page: Page, nome: string): Promise<Locator> {
  const menu = page.getByRole('button', { name: `Mais ações para ${nome}`, exact: true })
  if (await menu.count()) {
    await menu.click()
    return page.getByRole('menuitem', { name: 'Editar cadastro', exact: true })
  }
  return page.getByRole('button', { name: `Editar cadastro de ${nome}`, exact: true })
}

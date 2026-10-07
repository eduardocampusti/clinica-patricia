import { expect, type Locator, type Page } from '@playwright/test'

// Auxiliar da ficha da Equipe: só navega até a seção pelo menu "Seções da ficha"
// (lateral no computador, faixa horizontal abaixo de 900px). Nenhuma verificação aqui.
export async function abrirSecaoFicha(raiz: Page | Locator, rotulo: string) {
  await raiz.getByRole('navigation', { name: 'Seções da ficha' }).getByRole('button', { name: rotulo, exact: true }).click()
}

/**
 * Leva à seção "Acesso ao sistema" quando a ficha tem o menu. Sem o menu (ficha simples:
 * erro, indisponível, legado ou perfil sem gestão) o acesso já aparece na própria ficha.
 * Espera uma das duas formas aparecer antes de decidir; nenhuma verificação aqui.
 */
export async function abrirAcessoFicha(raiz: Page | Locator) {
  const menu = raiz.getByRole('navigation', { name: 'Seções da ficha' })
  const direto = raiz.getByTestId('ficha-secao-acesso').filter({ visible: true })
  await expect(menu.or(direto).first()).toBeVisible()
  if (await menu.isVisible()) await abrirSecaoFicha(raiz, 'Acesso ao sistema')
}

import type { Locator, Page } from '@playwright/test'

// Auxiliar da ficha da Equipe: só navega até a seção pelo menu "Seções da ficha"
// (lateral no computador, faixa horizontal abaixo de 900px). Nenhuma verificação aqui.
export async function abrirSecaoFicha(raiz: Page | Locator, rotulo: string) {
  await raiz.getByRole('navigation', { name: 'Seções da ficha' }).getByRole('button', { name: rotulo, exact: true }).click()
}

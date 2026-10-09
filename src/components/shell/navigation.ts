import { TELAS_POR_PAPEL, TITULOS_TELA, type Tela } from './types'
import type { Papel } from '../../hooks/usePapelNaClinica'
import { IconeGrid, IconeCalendario, IconePessoas, IconeArquivo, IconeDinheiro, IconeEquipe, IconeAjuda, IconeConfiguracoes } from './icons'
import { caminhoInterno } from '../../lib/routePaths'
import type { ClinicBrandSlug } from '../../config/clinicBrands'
export const ITENS_NAVEGACAO = [
  { tela: 'dashboard', Icone: IconeGrid }, { tela: 'agenda', Icone: IconeCalendario },
  { tela: 'pacientes', Icone: IconePessoas }, { tela: 'prontuario', Icone: IconeArquivo },
  { tela: 'financeiro', Icone: IconeDinheiro }, { tela: 'equipe', Icone: IconeEquipe }, { tela: 'configuracoes', Icone: IconeConfiguracoes }, { tela: 'sobre', Icone: IconeAjuda },
] satisfies { tela: Tela; Icone: typeof IconeGrid }[]
export function itensParaPapel(papel: Papel | null, unidade: ClinicBrandSlug) {
  // Desconhecido não é permissão. App.tsx continua protegendo as rotas.
  return ITENS_NAVEGACAO.filter(item => papel && TELAS_POR_PAPEL[papel].includes(item.tela)).map(item => ({ ...item, titulo: TITULOS_TELA[item.tela], href: caminhoInterno(unidade, item.tela) }))
}
export function itemAtivo(caminho: string, destino: string) { return caminho === destino || caminho === `${destino}/` || caminho.startsWith(`${destino}/`) }

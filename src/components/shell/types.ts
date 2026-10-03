import type { Papel } from '../../hooks/usePapelNaClinica'

export type Tela =
  | 'dashboard'
  | 'agenda'
  | 'atendimentos'
  | 'pacientes'
  | 'prontuario'
  | 'financeiro'
  | 'relatorios'
  | 'equipe'
  | 'especialidades'
  | 'configuracoes'
  | 'sobre'

// Mesmos destinos já oferecidos pelo menu, incluindo Sobre para todos os perfis.
export const TELAS_POR_PAPEL: Record<Papel, readonly Tela[]> = {
  proprietaria: ['dashboard', 'agenda', 'pacientes', 'prontuario', 'financeiro', 'equipe', 'sobre'],
  recepcao: ['dashboard', 'agenda', 'pacientes', 'financeiro', 'equipe', 'sobre'],
  medico: ['dashboard', 'agenda', 'prontuario', 'financeiro', 'sobre'],
}

export const TITULOS_TELA: Record<Tela, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda',
  atendimentos: 'Atendimentos',
  pacientes: 'Pacientes',
  prontuario: 'Prontuários',
  financeiro: 'Financeiro',
  relatorios: 'Relatórios',
  equipe: 'Equipe',
  especialidades: 'Especialidades',
  configuracoes: 'Configurações',
  sobre: 'Sobre o sistema',
}

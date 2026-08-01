export type Tela =
  | 'dashboard'
  | 'agenda'
  | 'pacientes'
  | 'prontuario'
  | 'financeiro'
  | 'relatorios'
  | 'configuracoes'

export const TITULOS_TELA: Record<Tela, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda',
  pacientes: 'Pacientes',
  prontuario: 'Prontuário',
  financeiro: 'Financeiro',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
}

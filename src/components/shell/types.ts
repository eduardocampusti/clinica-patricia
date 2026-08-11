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
}

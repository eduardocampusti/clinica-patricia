import { inicioDiaFinanceiro } from './financeiro/financeiro.date'

// Mesmo fuso já adotado pelos relatórios do sistema; não usa o fuso do navegador.
export const FUSO_PACIENTES = 'America/Bahia'
export const LIMITE_CONSULTA_PACIENTES = 1000
export const ORDENACOES_PACIENTES = {
  nome_asc: 'Nome: A → Z', nome_desc: 'Nome: Z → A',
  cadastro_desc: 'Cadastro: mais recentes primeiro', cadastro_asc: 'Cadastro: mais antigos primeiro',
  nascimento_desc: 'Idade: mais novos primeiro', nascimento_asc: 'Idade: mais velhos primeiro',
} as const
export type OrdemPacientes = keyof typeof ORDENACOES_PACIENTES
export interface FiltrosPacientes {
  inicio: string; fim: string; idadeMin: string; idadeMax: string
  nascimento: 'todos' | 'informado' | 'ausente'
}
export const FILTROS_PACIENTES_INICIAIS: FiltrosPacientes = {
  inicio: '', fim: '', idadeMin: '', idadeMax: '', nascimento: 'todos',
}
export interface PacienteOrdenavel {
  id: string; nome_completo: string; data_nascimento: string | null; created_at?: string | null
}
const nomes = new Intl.Collator('pt-BR', { sensitivity: 'base', usage: 'sort' })
const compararId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
export function padraoBuscaNome(valor: string): string {
  // Regex escapada, sem curingas. Evita também o alias '*' do ilike no PostgREST.
  return valor.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
export function ordenarPacientes<T extends PacienteOrdenavel>(itens: T[], ordem: OrdemPacientes): T[] {
  const descendente = ordem.endsWith('_desc')
  return [...itens].sort((a, b) => {
    const nome = nomes.compare(a.nome_completo, b.nome_completo)
    if (ordem.startsWith('nome')) return (descendente ? -nome : nome) || compararId(a.id, b.id)
    const campo = ordem.startsWith('cadastro') ? 'created_at' : 'data_nascimento'
    const av = a[campo] ? Date.parse(a[campo]!) : NaN
    const bv = b[campo] ? Date.parse(b[campo]!) : NaN
    // Valores ausentes/ilegíveis sempre no final, nunca uma idade ou data fictícia.
    if (!Number.isFinite(av) && Number.isFinite(bv)) return 1
    if (Number.isFinite(av) && !Number.isFinite(bv)) return -1
    return (Number.isFinite(av) && Number.isFinite(bv) ? (av - bv) * (descendente ? -1 : 1) : 0)
      || nome || compararId(a.id, b.id)
  })
}
export function hojeNaBahia(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_PACIENTES, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora)
}
function dataValida(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !isNaN(Date.parse(data)) && new Date(data).toISOString().slice(0, 10) === data
}
export function validarFiltrosPacientes(f: FiltrosPacientes): string | null {
  if ((f.inicio && !dataValida(f.inicio)) || (f.fim && !dataValida(f.fim))) return 'Informe datas de cadastro válidas.'
  try {
    for (const data of [f.inicio, f.fim].filter(Boolean)) inicioDiaFinanceiro(data, FUSO_PACIENTES)
    if (f.fim) inicioDiaFinanceiro(new Date(Date.parse(`${f.fim}T12:00:00Z`) + 86400000).toISOString().slice(0, 10), FUSO_PACIENTES)
  } catch { return 'O período informado está fora do calendário suportado.' }
  if (f.inicio && f.fim && f.inicio > f.fim) return 'A data inicial não pode superar a data final.'
  if ([f.idadeMin, f.idadeMax].some((v) => v !== '' && (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)) || Number(v) > 9998))) return 'As idades devem ser anos inteiros, iguais ou maiores que zero, dentro do calendário suportado.'
  if (f.idadeMin !== '' && f.idadeMax !== '' && Number(f.idadeMin) > Number(f.idadeMax)) return 'A idade mínima não pode superar a máxima.'
  if (f.nascimento === 'ausente' && (f.idadeMin !== '' || f.idadeMax !== '')) return 'Nascimento não informado não pode ser combinado com limites de idade.'
  return null
}
function aniversarioLimite(hoje: string, anos: number): string {
  const [ano, mes, dia] = hoje.split('-').map(Number)
  const alvo = Math.max(1, ano - anos)
  const ultimo = new Date(Date.UTC(alvo, mes, 0)).getUTCDate()
  return `${String(alvo).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}
export type RestricaoPaciente = { campo: 'created_at' | 'data_nascimento'; operador: 'gte' | 'lt' | 'lte' | 'gt' | 'is' | 'not.is'; valor: string | null }
export function restricoesPacientes(f: FiltrosPacientes, hoje = hojeNaBahia()): RestricaoPaciente[] {
  const erro = validarFiltrosPacientes(f)
  if (erro) throw new Error(erro)
  const regras: RestricaoPaciente[] = []
  if (f.inicio) regras.push({ campo: 'created_at', operador: 'gte', valor: inicioDiaFinanceiro(f.inicio, FUSO_PACIENTES) })
  if (f.fim) {
    const diaSeguinte = new Date(Date.parse(`${f.fim}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)
    regras.push({ campo: 'created_at', operador: 'lt', valor: inicioDiaFinanceiro(diaSeguinte, FUSO_PACIENTES) })
  }
  if (f.nascimento !== 'todos') regras.push({ campo: 'data_nascimento', operador: f.nascimento === 'ausente' ? 'is' : 'not.is', valor: null })
  if (f.idadeMin !== '' || f.idadeMax !== '') {
    regras.push({ campo: 'data_nascimento', operador: 'lte', valor: aniversarioLimite(hoje, Number(f.idadeMin || 0)) })
    if (f.idadeMax !== '') regras.push({ campo: 'data_nascimento', operador: 'gt', valor: aniversarioLimite(hoje, Number(f.idadeMax) + 1) })
  }
  return regras
}
export function correspondeAosFiltros(p: PacienteOrdenavel, regras: RestricaoPaciente[]): boolean {
  return regras.every(({ campo, operador, valor }) => {
    const dado = p[campo]
    if (operador === 'is') return dado == null
    if (operador === 'not.is') return dado != null
    if (!dado || !valor) return false
    const a = Date.parse(dado), b = Date.parse(valor)
    return operador === 'gte' ? a >= b : operador === 'lt' ? a < b : operador === 'gt' ? a > b : a <= b
  })
}
export function resumoFiltrosPacientes(f: FiltrosPacientes): string[] {
  const data = (v: string) => v.split('-').reverse().join('/')
  return [f.inicio && `Cadastro desde ${data(f.inicio)}`, f.fim && `Cadastro até ${data(f.fim)}`,
    f.idadeMin !== '' && `Idade mínima: ${f.idadeMin} anos`, f.idadeMax !== '' && `Idade máxima: ${f.idadeMax} anos`,
    f.nascimento !== 'todos' && `Nascimento ${f.nascimento === 'ausente' ? 'não informado' : 'informado'}`].filter(Boolean) as string[]
}
export function respostaCompletaPacientes(quantidade: number, total: number | null): boolean {
  return total !== null && quantidade === total && quantidade <= LIMITE_CONSULTA_PACIENTES
}

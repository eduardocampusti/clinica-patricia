import type { IdentidadeConta } from '../hooks/useIdentidadeConta'

export const FUSO_IDENTIDADE = 'America/Bahia'

export function rotuloIdentidade(identidade: IdentidadeConta): string {
  return identidade.carregando ? 'Carregando perfil…' : identidade.erroNome ? 'Nome indisponível' : identidade.nome ?? 'Conta conectada'
}

export function detalheIdentidade(identidade: IdentidadeConta): string | undefined {
  if (identidade.erroNome) return 'Não foi possível consultar seu nome cadastrado.'
  if (identidade.erroFoto) return identidade.avisoFoto ?? 'Foto indisponível. Exibindo iniciais.'
  if (!identidade.carregando && !identidade.nome) return 'Nome de exibição não informado.'
}

export function nomeCadastrado(valor: unknown): string | null {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/gu, ' ') || null : null
}

export function iniciaisConta(nome: string | null): string {
  const partes = nomeCadastrado(nome)?.split(' ') ?? []
  return [partes[0], partes.length > 1 ? partes.at(-1) : undefined]
    .filter(Boolean).map(parte => Array.from(parte!)[0]).join('').toLocaleUpperCase('pt-BR') || '?'
}

export function saudacaoConta(nome: string | null, agora: Date): string {
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: FUSO_IDENTIDADE, hour: '2-digit', hourCycle: 'h23' }).format(agora))
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = nomeCadastrado(nome)?.split(' ')[0]
  return primeiroNome ? `${saudacao}, ${primeiroNome}!` : `${saudacao}!`
}

export function dataDaDashboard(agora: Date): string {
  const data = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO_IDENTIDADE, weekday: 'long', day: '2-digit', month: 'long' }).format(agora)
  return data.charAt(0).toLocaleUpperCase('pt-BR') + data.slice(1)
}

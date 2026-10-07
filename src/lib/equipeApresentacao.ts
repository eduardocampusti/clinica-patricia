import type { MembroEquipe } from './equipe'
import type { AcessoEquipe } from './equipeAcessos'
import { estadosListaEquipe } from './equipeLista'
import { camposDoTipo } from './equipeFichaFormulario'

// Regras de apresentação da Equipe (listagem e ficha). Só formatam o que já existe; nenhum dado é alterado.

export type Tom = 'ativo' | 'alerta' | 'erro' | 'neutro'

/** Só apresentação: "Clínica Brotas" vira "Brotas" na pílula; o nome completo continua no título. */
export function nomeCurtoClinica(nome: string) {
  return nome.replace(/^cl[ií]nicas?\s+/iu, '').trim() || nome
}

// Traduz os rótulos já derivados por estadosListaEquipe; nenhum estado novo é inferido aqui.
export function seloDoStatus(status: string): { tom: Tom; texto: string } {
  if (status.startsWith('Acesso ativo')) return { tom: 'ativo', texto: 'Acesso ativo' }
  if (status === 'Acesso não confirmado' || status === 'Conta e acesso não confirmados') return { tom: 'neutro', texto: 'Não confirmado' }
  if (status === 'Acesso suspenso') return { tom: 'erro', texto: status }
  if (status === 'Conta inativa' || status === 'Convite pendente') return { tom: 'alerta', texto: status }
  return { tom: 'neutro', texto: status }
}

/** Um selo por pessoa, baseado na clínica ativa (relatório 27). */
export function seloPessoa(membro: MembroEquipe, acesso: AcessoEquipe | null | undefined, contexto: string | null): { tom: Tom; texto: string } {
  const estado = estadosListaEquipe(membro, acesso, contexto, '')
  const status = estado.clinicas.find(c => c.id === contexto)?.status
  if (status?.startsWith('Acesso ativo')) return { tom: 'ativo', texto: 'Acesso ativo' }
  // Convite pendente e acesso suspenso só chegam aqui quando a ficha já confirmou o estado.
  if (status === 'Acesso suspenso') return { tom: 'erro', texto: status }
  if (status === 'Convite pendente') return { tom: 'alerta', texto: status }
  if (estado.conta === 'Conta inativa' || status === 'Conta inativa') return { tom: 'alerta', texto: 'Conta inativa' }
  if (estado.conta === 'Sem conta vinculada') return { tom: 'neutro', texto: 'Sem conta' }
  if (status === 'Sem acesso nesta clínica' || status === 'Sem acesso a esta clínica') return { tom: 'neutro', texto: 'Sem acesso nesta clínica' }
  return { tom: 'neutro', texto: 'Não confirmado' }
}

/** "aaaa-mm-dd" vira "dd/mm/aaaa"; outros valores seguem como estão. */
export function formatarData(valor: unknown): string {
  const s = typeof valor === 'string' ? valor : ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}

/** Instante ISO vira "dd/mm/aaaa às hh:mm" no fuso do navegador. */
export function formatarDataHora(valor: string): string {
  const d = new Date(valor)
  if (!Number.isFinite(d.getTime())) return valor
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/** "acesso_ativo" vira "Acesso ativo". */
export function rotuloLegivel(valor: unknown): string {
  const s = String(valor ?? '').replaceAll('_', ' ').trim()
  return s ? s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1) : s
}

/** Rótulo da opção já definida no formulário da ficha (ex.: "clt" vira "CLT"). */
export function rotuloOpcao(tipo: 'contrato' | 'pessoal', chave: string, valor: unknown): string {
  return camposDoTipo(tipo).find(c => c.chave === chave)?.opcoes?.find(o => o[0] === valor)?.[1] ?? rotuloLegivel(valor)
}

/** Seção de origem de cada pendência, pelo mesmo critério já usado no botão Conferir. */
export function secaoDaPendencia(p: string): string {
  return p.startsWith('Documento') ? 'documentos' : p.startsWith('Contrato') ? 'contratos' : p.startsWith('Inscrição') ? 'formacao' : 'recebimento'
}

/** Mesmo texto da pendência, com datas em dd/mm/aaaa e categorias sem sublinhado. */
export function textoPendencia(p: string): string {
  return p.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1').replaceAll('_', ' ')
}

export interface ResumoAtuacao { duracao_minutos: number; valor_consulta: number | null; percentual_clinica: number | null }
export interface ResumoRecebimento { preferencia: 'pix' | 'transferencia'; favorecido: string }

/** Preposição da unidade: "na Clínica Brotas", "no Laboratório …"; sem regra conhecida, "em". */
export function naUnidade(nome: string): string {
  if (/^(cl[ií]nica|unidade)\b/iu.test(nome)) return `na ${nome}`
  if (/^(laborat[óo]rio|consult[óo]rio|centro|hospital|posto)\b/iu.test(nome)) return `no ${nome}`
  return `em ${nome}`
}

/** Valor vazio, pelo mesmo critério usado no campo e na ação do cartão. */
export function valorVazio(valor: unknown): boolean {
  return valor === null || valor === undefined || valor === false || (typeof valor === 'string' && !valor.trim())
}

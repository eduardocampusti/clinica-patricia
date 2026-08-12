import { supabase } from './supabase'

// Chamadas ao servidor próprio (/server) — usadas só para escritas
// financeiras (cálculo/regra de negócio não roda no frontend). Leitura
// continua direto no Supabase, protegida pela RLS já existente.

interface ErroApi {
  erro?: string
}

type Metodo = 'GET' | 'POST'

async function tokenDaSessao(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return token
}

async function chamarApi<T>(
  caminho: string,
  clinicaId: string,
  metodo: Metodo = 'POST',
  body?: Record<string, unknown>,
  idempotencyKey = crypto.randomUUID(),
): Promise<T> {
  const token = await tokenDaSessao()
  const resp = await fetch(`${import.meta.env.VITE_API_URL}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Clinica-Id': clinicaId,
      ...(metodo === 'POST' ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const resposta = (await resp.json()) as T & ErroApi
  if (!resp.ok) throw new Error(resposta.erro ?? 'Não foi possível concluir a operação.')
  return resposta
}

export interface SessaoCaixa {
  id: string
  clinica_id: string
  aberto_por: string | null
  valor_abertura: number
  aberto_em: string
  status: 'aberto' | 'fechado'
}

export async function abrirCaixa(clinicaId: string, valorAbertura: number): Promise<SessaoCaixa> {
  return chamarApi('/api/caixa/abrir', clinicaId, 'POST', { valor_abertura: valorAbertura })
}

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_debito'
  | 'cartao_credito'
  | 'transferencia'
  | 'convenio'
  | 'cortesia'

export interface EntradaCaixa {
  id: string
  sessao_caixa_id: string
  clinica_id: string
  forma_pagamento: FormaPagamento
  valor: number
  descricao: string | null
  paciente_id: string
  profissional_id: string
  registrado_por: string | null
  registrado_em: string
}

export async function registrarEntradaCaixa(
  clinicaId: string,
  formaPagamento: FormaPagamento,
  valor: number,
  descricao: string | null,
  pacienteId: string,
  profissionalId: string,
  agendamentoId?: string,
): Promise<ResultadoFinanceiro> {
  const cortesia = formaPagamento === 'cortesia'
  return chamarApi('/api/caixa/entrada', clinicaId, 'POST', {
    paciente_id: pacienteId,
    profissional_id: profissionalId,
    agendamento_id: agendamentoId ?? null,
    valor_total: valor,
    status: cortesia ? 'cortesia' : 'paga',
    motivo_cortesia: cortesia ? descricao : null,
    descricao,
    pagamentos: cortesia ? [] : [{ forma_pagamento: formaPagamento, valor }],
  })
}

export type CategoriaDespesa =
  | 'aluguel' | 'energia' | 'agua' | 'internet' | 'material_limpeza'
  | 'material_clinico' | 'manutencao' | 'honorarios' | 'impostos' | 'outras'

export interface ResultadoFinanceiro { id: string; status?: string; [chave: string]: unknown }

export function registrarDespesa(
  clinicaId: string,
  dados: { categoria: CategoriaDespesa; descricao: string; valor: number; status: 'pendente' | 'paga'; forma_pagamento?: Exclude<FormaPagamento, 'cortesia'> },
) {
  return chamarApi<ResultadoFinanceiro>('/api/financeiro/despesas', clinicaId, 'POST', dados)
}

export function registrarMovimentoCaixa(clinicaId: string, tipo: 'sangria' | 'suprimento', valor: number, motivo: string) {
  return chamarApi<ResultadoFinanceiro>(`/api/caixa/${tipo === 'sangria' ? 'sangrias' : 'suprimentos'}`, clinicaId, 'POST', { valor, motivo })
}

export interface FechamentoCaixa extends ResultadoFinanceiro {
  dinheiro_esperado: number
  dinheiro_contado: number
  diferenca: number
}

export function fecharCaixa(clinicaId: string, valorContado: number, justificativa: string | null) {
  return chamarApi<FechamentoCaixa>('/api/caixa/fechar', clinicaId, 'POST', {
    valor_contado: valorContado,
    justificativa_diferenca: justificativa,
  })
}

export function estornarLancamento(
  clinicaId: string,
  origemTipo: 'entrada' | 'despesa' | 'pagamento_repasse',
  origemId: string,
  motivo: string,
) {
  return chamarApi<ResultadoFinanceiro>('/api/financeiro/estornos', clinicaId, 'POST', {
    origem_tipo: origemTipo,
    origem_id: origemId,
    motivo,
  })
}

export function pagarRepasseIntegral(
  clinicaId: string,
  repasseId: string,
  formaPagamento: Exclude<FormaPagamento, 'cortesia'>,
) {
  return chamarApi<ResultadoFinanceiro>(`/api/financeiro/repasses/${repasseId}/pagar`, clinicaId, 'POST', {
    forma_pagamento: formaPagamento,
  })
}

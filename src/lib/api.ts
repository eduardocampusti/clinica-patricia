import { supabase } from './supabase'

// Chamadas ao servidor próprio (/server) — usadas só para escritas
// financeiras (cálculo/regra de negócio não roda no frontend). Leitura
// continua direto no Supabase, protegida pela RLS já existente.

interface ErroApi {
  erro?: string
}

async function tokenDaSessao(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')
  return token
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
  const token = await tokenDaSessao()

  const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/caixa/abrir`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Clinica-Id': clinicaId,
    },
    body: JSON.stringify({ valor_abertura: valorAbertura }),
  })

  const body = (await resp.json()) as SessaoCaixa & ErroApi

  if (!resp.ok) {
    throw new Error(body.erro ?? 'Não foi possível abrir o caixa.')
  }

  return body
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
  registrado_por: string | null
  registrado_em: string
}

export async function registrarEntradaCaixa(
  clinicaId: string,
  formaPagamento: FormaPagamento,
  valor: number,
  descricao: string | null,
): Promise<EntradaCaixa> {
  const token = await tokenDaSessao()

  const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/caixa/entrada`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Clinica-Id': clinicaId,
    },
    body: JSON.stringify({ forma_pagamento: formaPagamento, valor, descricao }),
  })

  const body = (await resp.json()) as EntradaCaixa & ErroApi

  if (!resp.ok) {
    throw new Error(body.erro ?? 'Não foi possível registrar a entrada.')
  }

  return body
}

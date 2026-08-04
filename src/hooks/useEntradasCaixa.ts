import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { EntradaCaixa } from '../lib/api'

export interface EntradaCaixaComNomes extends EntradaCaixa {
  paciente_nome: string
  profissional_nome: string
}

interface EntradaCaixaRow {
  id: string
  sessao_caixa_id: string
  clinica_id: string
  forma_pagamento: EntradaCaixa['forma_pagamento']
  valor: number
  descricao: string | null
  paciente_id: string
  profissional_id: string
  registrado_por: string | null
  registrado_em: string
  pacientes: { nome_completo: string } | { nome_completo: string }[] | null
  profissionais: { nome_completo: string } | { nome_completo: string }[] | null
}

function extrairNome(valor: { nome_completo: string } | { nome_completo: string }[] | null): string {
  const item = Array.isArray(valor) ? valor[0] : valor
  return item?.nome_completo ?? '—'
}

// Lê as entradas da sessão de caixa atual, mais recente primeiro. Leitura
// direta no Supabase — não é escrita, protegida pela mesma RLS de SELECT
// de entradas_caixa.
export function useEntradasCaixa(sessaoCaixaId: string | null) {
  const [entradas, setEntradas] = useState<EntradaCaixaComNomes[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!sessaoCaixaId) {
      setEntradas([])
      setCarregando(false)
      return
    }

    setCarregando(true)
    const { data } = await supabase
      .from('entradas_caixa')
      .select(
        'id, sessao_caixa_id, clinica_id, forma_pagamento, valor, descricao, paciente_id, profissional_id, registrado_por, registrado_em, pacientes(nome_completo), profissionais(nome_completo)',
      )
      .eq('sessao_caixa_id', sessaoCaixaId)
      .order('registrado_em', { ascending: false })

    const linhas = (data ?? []) as unknown as EntradaCaixaRow[]
    setEntradas(
      linhas.map((linha) => ({
        id: linha.id,
        sessao_caixa_id: linha.sessao_caixa_id,
        clinica_id: linha.clinica_id,
        forma_pagamento: linha.forma_pagamento,
        valor: linha.valor,
        descricao: linha.descricao,
        paciente_id: linha.paciente_id,
        profissional_id: linha.profissional_id,
        registrado_por: linha.registrado_por,
        registrado_em: linha.registrado_em,
        paciente_nome: extrairNome(linha.pacientes),
        profissional_nome: extrairNome(linha.profissionais),
      })),
    )
    setCarregando(false)
  }, [sessaoCaixaId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { entradas, carregando, recarregar }
}

import type { QueryResultRow } from 'pg'
import { obterFinanceiroPool } from '../database.js'
import type { OperacaoFinanceira } from './tipos.js'

const FUNCOES: Record<OperacaoFinanceira, string> = {
  abrir_caixa: 'abrir_caixa',
  registrar_cobranca: 'registrar_cobranca',
  receber_cobranca: 'receber_cobranca',
  registrar_despesa: 'registrar_despesa',
  pagar_despesa: 'pagar_despesa',
  registrar_sangria: 'registrar_sangria',
  registrar_suprimento: 'registrar_suprimento',
  estornar_lancamento: 'estornar_lancamento',
  fechar_caixa: 'fechar_caixa',
  pagar_repasse_integral: 'pagar_repasse_integral',
}

interface LinhaResultado extends QueryResultRow { resultado: unknown }

export async function executarRpcFinanceira(operacao: OperacaoFinanceira, texto: string, assinatura: string) {
  // O identificador vem exclusivamente do mapa estático acima. Texto e
  // assinatura seguem como parâmetros; não há interpolação de dados do cliente.
  const funcao = FUNCOES[operacao]
  const consulta = `select financeiro_privado.${funcao}($1::text, $2::text) as resultado`
  const { rows } = await obterFinanceiroPool().query<LinhaResultado>({
    name: `financeiro-${funcao}-v1`,
    text: consulta,
    values: [texto, assinatura],
  })
  return rows[0]?.resultado
}

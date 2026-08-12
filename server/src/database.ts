import { Pool } from 'pg'
import { obterConfiguracaoFinanceira } from './env.js'

// Credencial exclusiva do papel técnico financeiro_api. Este pool nunca usa
// postgres, service_role ou qualquer papel com acesso direto amplo às tabelas.
let financeiroPool: Pool | undefined

export function obterFinanceiroPool(): Pool {
  if (financeiroPool) return financeiroPool

  const configuracao = obterConfiguracaoFinanceira()
  financeiroPool = new Pool({
    connectionString: configuracao.databaseUrl,
    max: Number(process.env.FINANCEIRO_DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'clinica-patricia-fastify-financeiro',
    ssl: process.env.FINANCEIRO_DB_SSL === 'disable' ? false : { rejectUnauthorized: true },
  })

  financeiroPool.on('error', (error) => {
    // Não incluir connection string nem parâmetros SQL nos logs.
    console.error('Falha inesperada no pool PostgreSQL financeiro', error.message)
  })
  return financeiroPool
}

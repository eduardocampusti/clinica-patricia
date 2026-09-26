import 'dotenv/config'

function obrigatoria(nome: string): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome} (ver server/.env.example)`)
  }
  return valor
}

export const env = {
  supabaseUrl: obrigatoria('SUPABASE_URL'),
  supabaseAnonKey: obrigatoria('SUPABASE_ANON_KEY'),
  port: Number(process.env.PORT ?? 3333),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
}

export class ConfiguracaoFinanceiraAusenteError extends Error {
  constructor(readonly variaveisAusentes: string[]) {
    super(`Configuração financeira ausente: ${variaveisAusentes.join(', ')}`)
    this.name = 'ConfiguracaoFinanceiraAusenteError'
  }
}

export function obterConfiguracaoFinanceira() {
  const databaseUrl = process.env.FINANCEIRO_DATABASE_URL
  const assertionHmacKey = process.env.FINANCEIRO_ASSERTION_HMAC_KEY
  if (!databaseUrl || !assertionHmacKey) {
    const variaveisAusentes = [
      !databaseUrl && 'FINANCEIRO_DATABASE_URL',
      !assertionHmacKey && 'FINANCEIRO_ASSERTION_HMAC_KEY',
    ].filter((nome): nome is string => Boolean(nome))
    throw new ConfiguracaoFinanceiraAusenteError(variaveisAusentes)
  }

  return {
    databaseUrl,
    assertionHmacKey,
    assertionKeyId: process.env.FINANCEIRO_ASSERTION_KEY_ID ?? 'financeiro-hmac-v1',
  }
}

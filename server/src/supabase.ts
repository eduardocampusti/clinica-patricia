import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

// Cria um client do Supabase escopado ao token JWT da requisição. Nenhum
// bypass de RLS aqui: toda consulta feita com este client respeita
// exatamente a mesma RLS que o frontend já respeita — o servidor não usa
// (e não tem) chave privilegiada nesta etapa (ver server/README.md).
export function criarClientDaRequisicao(token: string) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabasePublicKey) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e uma chave pública do Supabase. Confira o arquivo .env na raiz do projeto.',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublicKey)

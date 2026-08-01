import { supabase } from './supabase'

// Wrappers finos sobre as RPCs de criptografia de CPF do banco.
// O frontend nunca implementa a própria lógica de cripto — só chama estas funções.

export async function criptografarCpf(cpf: string): Promise<string> {
  const { data, error } = await supabase.rpc('cpf_encrypt', { p_cpf: cpf })
  if (error) throw error
  return data as string
}

export async function gerarHashCpf(cpf: string): Promise<string> {
  const { data, error } = await supabase.rpc('cpf_hash', { p_cpf: cpf })
  if (error) throw error
  return data as string
}

export async function descriptografarCpf(cpfEncrypted: string): Promise<string> {
  const { data, error } = await supabase.rpc('cpf_decrypt', { p_enc: cpfEncrypted })
  if (error) throw error
  return data as string
}

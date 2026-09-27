import type { Papel } from '../hooks/usePapelNaClinica'
import { supabase } from './supabase'

export interface AcessoClinica {
  clinicaId: string
  nome: string
  papel: Papel
}

const PAPEIS_SUPORTADOS: Papel[] = ['medico', 'recepcao', 'proprietaria']

export async function carregarAcessosClinicas(usuarioId: string): Promise<AcessoClinica[]> {
  const { data: acessos, error: erroVinculos } = await supabase
    .from('usuarios_clinicas')
    .select('clinica_id, papel')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true)

  if (erroVinculos || !acessos?.length) throw new Error('Vínculos indisponíveis')

  const ids = [...new Set(acessos.map(acesso => acesso.clinica_id))]
  const { data: clinicas, error: erroClinicas } = await supabase
    .from('clinicas')
    .select('id, nome')
    .in('id', ids)
    .order('nome', { ascending: true })

  if (erroClinicas || !clinicas?.length) throw new Error('Unidades indisponíveis')

  return clinicas.flatMap(clinica => acessos
    .filter(acesso => acesso.clinica_id === clinica.id && PAPEIS_SUPORTADOS.includes(acesso.papel as Papel))
    .map(acesso => ({ clinicaId: clinica.id, nome: clinica.nome, papel: acesso.papel as Papel })))
}

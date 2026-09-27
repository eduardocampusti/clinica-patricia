import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { validarFotoPaciente } from './pacienteFotoValidacao'

export const BUCKET_FOTOS_PACIENTES = 'pacientes-fotos'

export interface ResultadoPersistenciaFoto {
  objectPath: string
  limpezaPendente: boolean
}

async function clienteDaClinica(clinicaId: string): Promise<SupabaseClient> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('Sua sessão expirou. Entre novamente para acessar a foto.')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabasePublicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabasePublicKey) {
    throw new Error('A configuração pública do Supabase não está disponível.')
  }

  return createClient(supabaseUrl, supabasePublicKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        'x-clinica-id': clinicaId,
      },
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
      storageKey: `foto-${clinicaId}`,
    },
  })
}

export async function persistirFotoPaciente(params: {
  pacienteId: string
  clinicaId: string
  arquivo: File
}): Promise<ResultadoPersistenciaFoto> {
  const foto = validarFotoPaciente(params.arquivo)
  const cliente = await clienteDaClinica(params.clinicaId)
  const objectPath = `${params.clinicaId}/${params.pacienteId}/${crypto.randomUUID()}.${foto.extensao}`

  const { error: erroUpload } = await cliente.storage
    .from(BUCKET_FOTOS_PACIENTES)
    .upload(objectPath, foto.arquivo, {
      cacheControl: '3600',
      contentType: foto.arquivo.type,
      upsert: false,
    })
  if (erroUpload) throw new Error('Não foi possível enviar a foto. O cadastro foi preservado.')

  const { data: caminhoAnterior, error: erroRegistro } = await cliente.rpc('paciente_definir_foto', {
    p_paciente_id: params.pacienteId,
    p_clinica_id: params.clinicaId,
    p_object_path: objectPath,
  })

  if (erroRegistro) {
    const { error: erroLimpeza } = await cliente.storage.from(BUCKET_FOTOS_PACIENTES).remove([objectPath])
    throw new Error(erroLimpeza
      ? 'Não foi possível vincular a foto; a limpeza do arquivo temporário precisa ser verificada.'
      : 'Não foi possível vincular a foto ao paciente. O arquivo temporário foi descartado.')
  }

  let limpezaPendente = false
  if (typeof caminhoAnterior === 'string' && caminhoAnterior && caminhoAnterior !== objectPath) {
    const { error: erroLimpeza } = await cliente.storage
      .from(BUCKET_FOTOS_PACIENTES)
      .remove([caminhoAnterior])
    limpezaPendente = Boolean(erroLimpeza)
  }

  return { objectPath, limpezaPendente }
}

export async function carregarFotoPaciente(params: {
  clinicaId: string
  objectPath: string
}): Promise<Blob> {
  const cliente = await clienteDaClinica(params.clinicaId)
  const { data, error } = await cliente.storage
    .from(BUCKET_FOTOS_PACIENTES)
    .download(params.objectPath)
  if (error || !data) throw new Error('Não foi possível carregar a foto deste paciente.')
  return data
}

export async function obterCaminhoFotoPaciente(params: {
  pacienteId: string
  clinicaId: string
}): Promise<string | null> {
  const cliente = await clienteDaClinica(params.clinicaId)
  const { data, error } = await cliente.rpc('paciente_obter_foto', {
    p_paciente_id: params.pacienteId,
    p_clinica_id: params.clinicaId,
  })
  if (error) throw new Error('Não foi possível consultar a foto deste paciente.')
  return typeof data === 'string' && data ? data : null
}

export async function removerFotoPaciente(params: {
  pacienteId: string
  clinicaId: string
}): Promise<{ limpezaPendente: boolean }> {
  const cliente = await clienteDaClinica(params.clinicaId)
  const { data: caminhoAnterior, error: erroRegistro } = await cliente.rpc('paciente_remover_foto', {
    p_paciente_id: params.pacienteId,
    p_clinica_id: params.clinicaId,
  })
  if (erroRegistro) throw new Error('Não foi possível remover o vínculo da foto.')
  if (typeof caminhoAnterior !== 'string' || !caminhoAnterior) return { limpezaPendente: false }

  const { error: erroLimpeza } = await cliente.storage
    .from(BUCKET_FOTOS_PACIENTES)
    .remove([caminhoAnterior])
  return { limpezaPendente: Boolean(erroLimpeza) }
}

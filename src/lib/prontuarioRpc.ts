import { supabase } from './supabase'

export type StatusAtendimento = 'em_andamento' | 'finalizado'
export type TipoDocumentoClinico = 'receita' | 'atestado' | 'encaminhamento' | 'solicitacao_exame'

export interface AtendimentoResumo {
  id: string
  paciente_id: string
  paciente_nome: string
  agendamento_id: string | null
  status: StatusAtendimento
  created_at: string
  finalizado_em: string | null
}

export interface AtendimentoCompleto {
  id: string
  paciente_id: string
  paciente_nome: string
  agendamento_id: string | null
  queixa_principal: string | null
  anamnese: string | null
  exame_fisico: string | null
  hipotese_diagnostica: string | null
  cid: string | null
  conduta_evolucao: string | null
  prescricao: string | null
  status: StatusAtendimento
  finalizado_em: string | null
  created_at: string
  updated_at: string
}

export interface Adendo {
  id: string
  texto: string
  created_at: string
}

export interface DocumentoClinico {
  id: string
  tipo: TipoDocumentoClinico
  conteudo: string
  created_at: string
}

export interface ProntuarioAberto {
  atendimento: AtendimentoCompleto
  adendos: Adendo[]
  documentos: DocumentoClinico[]
}

export interface CamposAtendimento {
  queixa_principal: string
  anamnese: string
  exame_fisico: string
  hipotese_diagnostica: string
  cid: string
  conduta_evolucao: string
  prescricao: string
}

interface ResultadoRpc<T> {
  data: T | null
  error: unknown | null
}

const TIPOS_DOCUMENTO = new Set<TipoDocumentoClinico>([
  'receita',
  'atestado',
  'encaminhamento',
  'solicitacao_exame',
])

function registro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function texto(valor: unknown): valor is string {
  return typeof valor === 'string'
}

function textoOuNulo(valor: unknown): valor is string | null {
  return valor === null || texto(valor)
}

function status(valor: unknown): valor is StatusAtendimento {
  return valor === 'em_andamento' || valor === 'finalizado'
}

function tipoDocumento(valor: unknown): valor is TipoDocumentoClinico {
  return texto(valor) && TIPOS_DOCUMENTO.has(valor as TipoDocumentoClinico)
}

function atendimentoResumo(valor: unknown): valor is AtendimentoResumo {
  return (
    registro(valor) &&
    texto(valor.id) &&
    texto(valor.paciente_id) &&
    texto(valor.paciente_nome) &&
    textoOuNulo(valor.agendamento_id) &&
    status(valor.status) &&
    texto(valor.created_at) &&
    textoOuNulo(valor.finalizado_em)
  )
}

function atendimentoCompleto(valor: unknown): valor is AtendimentoCompleto {
  return (
    registro(valor) &&
    texto(valor.id) &&
    texto(valor.paciente_id) &&
    texto(valor.paciente_nome) &&
    textoOuNulo(valor.agendamento_id) &&
    status(valor.status) &&
    texto(valor.created_at) &&
    textoOuNulo(valor.finalizado_em) &&
    textoOuNulo(valor.queixa_principal) &&
    textoOuNulo(valor.anamnese) &&
    textoOuNulo(valor.exame_fisico) &&
    textoOuNulo(valor.hipotese_diagnostica) &&
    textoOuNulo(valor.cid) &&
    textoOuNulo(valor.conduta_evolucao) &&
    textoOuNulo(valor.prescricao) &&
    texto(valor.updated_at)
  )
}

function adendo(valor: unknown): valor is Adendo {
  return registro(valor) && texto(valor.id) && texto(valor.texto) && texto(valor.created_at)
}

function documento(valor: unknown): valor is DocumentoClinico {
  return (
    registro(valor) &&
    texto(valor.id) &&
    tipoDocumento(valor.tipo) &&
    texto(valor.conteudo) &&
    texto(valor.created_at)
  )
}

function erroContrato(nome: string): Error {
  return new Error(`Resposta incompatível da RPC ${nome}.`)
}

function argumentosCampos(atendimentoId: string, campos: CamposAtendimento) {
  return {
    p_atendimento_id: atendimentoId,
    p_queixa_principal: campos.queixa_principal,
    p_anamnese: campos.anamnese,
    p_exame_fisico: campos.exame_fisico,
    p_hipotese_diagnostica: campos.hipotese_diagnostica,
    p_cid: campos.cid,
    p_conduta_evolucao: campos.conduta_evolucao,
    p_prescricao: campos.prescricao,
  }
}

export async function listarAtendimentosProntuario(clinicaId: string): Promise<ResultadoRpc<AtendimentoResumo[]>> {
  const { data, error } = await supabase.rpc('listar_atendimentos_prontuario', { p_clinica_id: clinicaId })
  if (error) return { data: null, error }
  if (!Array.isArray(data) || !data.every(atendimentoResumo)) {
    return { data: null, error: erroContrato('listar_atendimentos_prontuario') }
  }
  return { data, error: null }
}

export async function abrirProntuario(atendimentoId: string): Promise<ResultadoRpc<ProntuarioAberto>> {
  const { data, error } = await supabase.rpc('abrir_prontuario', { p_atendimento_id: atendimentoId })
  if (error) return { data: null, error }
  if (
    !registro(data) ||
    !atendimentoCompleto(data.atendimento) ||
    !Array.isArray(data.adendos) ||
    !data.adendos.every(adendo) ||
    !Array.isArray(data.documentos) ||
    !data.documentos.every(documento)
  ) {
    return { data: null, error: erroContrato('abrir_prontuario') }
  }
  return { data: data as unknown as ProntuarioAberto, error: null }
}

export async function iniciarAtendimentoAvulso(clinicaId: string, pacienteId: string): Promise<ResultadoRpc<string>> {
  const { data, error } = await supabase.rpc('iniciar_atendimento_avulso', {
    p_clinica_id: clinicaId,
    p_paciente_id: pacienteId,
  })
  if (error) return { data: null, error }
  return texto(data) ? { data, error: null } : { data: null, error: erroContrato('iniciar_atendimento_avulso') }
}

export async function iniciarAtendimentoAgendado(clinicaId: string, agendamentoId: string): Promise<ResultadoRpc<string>> {
  const { data, error } = await supabase.rpc('iniciar_atendimento_agendado', {
    p_clinica_id: clinicaId,
    p_agendamento_id: agendamentoId,
  })
  if (error) return { data: null, error }
  return texto(data) ? { data, error: null } : { data: null, error: erroContrato('iniciar_atendimento_agendado') }
}

export async function salvarRascunhoAtendimento(
  atendimentoId: string,
  campos: CamposAtendimento,
): Promise<ResultadoRpc<string>> {
  const { data, error } = await supabase.rpc('salvar_rascunho_atendimento', argumentosCampos(atendimentoId, campos))
  if (error) return { data: null, error }
  return texto(data) ? { data, error: null } : { data: null, error: erroContrato('salvar_rascunho_atendimento') }
}

export async function finalizarAtendimentoSeguro(
  atendimentoId: string,
  campos: CamposAtendimento,
): Promise<ResultadoRpc<string>> {
  const { data, error } = await supabase.rpc('finalizar_atendimento_seguro', argumentosCampos(atendimentoId, campos))
  if (error) return { data: null, error }
  return texto(data) ? { data, error: null } : { data: null, error: erroContrato('finalizar_atendimento_seguro') }
}

export async function adicionarAdendoProntuario(atendimentoId: string, conteudo: string): Promise<ResultadoRpc<Adendo>> {
  const { data, error } = await supabase.rpc('adicionar_adendo_prontuario', {
    p_atendimento_id: atendimentoId,
    p_texto: conteudo,
  })
  if (error) return { data: null, error }
  return adendo(data) ? { data, error: null } : { data: null, error: erroContrato('adicionar_adendo_prontuario') }
}

export async function criarDocumentoProntuario(
  atendimentoId: string,
  tipo: TipoDocumentoClinico,
  conteudo: string,
): Promise<ResultadoRpc<DocumentoClinico>> {
  const { data, error } = await supabase.rpc('criar_documento_prontuario', {
    p_atendimento_id: atendimentoId,
    p_tipo: tipo,
    p_conteudo: conteudo,
  })
  if (error) return { data: null, error }
  return documento(data) ? { data, error: null } : { data: null, error: erroContrato('criar_documento_prontuario') }
}

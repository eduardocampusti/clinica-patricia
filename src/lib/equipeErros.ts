import { FunctionsFetchError, FunctionsRelayError } from '@supabase/supabase-js'

export type CategoriaErroEquipe = 'sessao' | 'permissao' | 'validacao' | 'conflito' | 'limite' | 'rede' | 'servico' | 'desconhecido'
export interface ErroAcessoEquipe {
  codigo: string
  status?: number
  categoria: CategoriaErroEquipe
  mensagem: string
  resultadoIncerto: boolean
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : null
}

function codigoSeguro(valor: unknown): string | undefined {
  return typeof valor === 'string' && /^[A-Z0-9_]{1,64}$/u.test(valor) ? valor : undefined
}

function statusSeguro(valor: unknown): number | undefined {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= 599 ? valor : undefined
}

const categorias: Record<string, CategoriaErroEquipe> = {
  NAO_AUTORIZADO: 'permissao', '42501': 'permissao', PGRST301: 'sessao', PGRST302: 'sessao', PGRST303: 'sessao',
  DADOS_INVALIDOS: 'validacao', ACAO_INVALIDA: 'validacao', '22023': 'validacao', CONVITE_ENCERRADO: 'validacao',
  CONTA_AUTH_DIVERGENTE: 'validacao', CONTA_AUTH_INDISPONIVEL: 'servico', EMAIL_NAO_CONFIRMADO: 'permissao',
  DUPLICIDADE: 'conflito', '23505': 'conflito', '40001': 'conflito',
  OPERACAO_INDISPONIVEL: 'servico', SERVICO_NAO_CONFIGURADO: 'servico', CONVITE_NAO_CONFIGURADO: 'servico',
  VINCULO_NAO_CONCLUIDO: 'servico', CONFIRMACAO_NAO_ENVIADA: 'servico', CONVITE_NAO_ENVIADO: 'servico',
}

/** O texto remoto nunca vira mensagem da interface, nem determina a categoria. */
export function erroEquipeSeguro(error: unknown, escrita = false, statusInformado?: number): ErroAcessoEquipe {
  const valor = objeto(error)
  const codigo = codigoSeguro(valor?.codigo) ?? codigoSeguro(valor?.code) ?? 'ERRO_DESCONHECIDO'
  const status = statusSeguro(statusInformado) ?? statusSeguro(valor?.status)
  let categoria: CategoriaErroEquipe
  if (status === 401) categoria = 'sessao'
  else if (status === 403) categoria = 'permissao'
  else if (status === 429) categoria = 'limite'
  else if (status === 408) categoria = 'rede'
  else if (error instanceof FunctionsFetchError || status === 0) categoria = 'rede'
  else if (error instanceof FunctionsRelayError) categoria = 'servico'
  else categoria = categorias[codigo] ?? (status === 409 ? 'conflito' : status === 400 || status === 422 ? 'validacao' : status !== undefined && status >= 500 ? 'servico' : 'desconhecido')

  // O contrato atual reutiliza DADOS_INVALIDOS/422 nestas duas recusas.
  // Reconhecimento exato + código + status; nenhuma busca por palavras soltas.
  const aguardandoEnvio = codigo === 'DADOS_INVALIDOS' && status === 422 && valor?.erro === 'Aguarde o envio atual terminar.'
  const intervaloEnvio = codigo === 'DADOS_INVALIDOS' && status === 422 && valor?.erro === 'Aguarde um minuto antes de reenviar o convite.'
  if (aguardandoEnvio || intervaloEnvio) categoria = 'limite'

  const resultadoIncerto = escrita && (categoria === 'rede' || categoria === 'servico' || (categoria === 'desconhecido' && (status === undefined || status < 400)))
  const mensagens: Record<CategoriaErroEquipe, string> = {
    sessao: 'Sua sessão não permite concluir esta operação. Entre novamente no sistema.',
    permissao: 'Você não tem autorização para esta operação nesta clínica. A gestão da equipe é restrita à Proprietária/Administradora.',
    validacao: 'Não foi possível concluir com os dados informados. Revise os campos e as opções desta solicitação.',
    conflito: 'A operação encontrou um conflito. Reabra a ficha e confira os dados atuais antes de tentar novamente.',
    limite: 'O limite de tentativas foi atingido. Aguarde antes de tentar novamente.',
    rede: 'Não foi possível comunicar com o serviço. Confira a conexão e tente consultar novamente.',
    servico: 'O serviço não conseguiu concluir esta operação agora. Tente consultar novamente mais tarde.',
    desconhecido: 'Não foi possível concluir esta operação. Confira seu acesso e tente consultar novamente.',
  }
  let mensagem = mensagens[categoria]
  if (aguardandoEnvio) mensagem = 'Aguarde a tentativa em andamento terminar antes de tentar novamente.'
  if (codigo === 'EMAIL_NAO_CONFIRMADO' && categoria === 'permissao') mensagem = 'Confirme o e-mail da sua sessão antes de confirmar este acesso.'
  if (codigo === 'CONVITE_ENCERRADO' && categoria === 'validacao') mensagem = 'Esta solicitação está encerrada. Reabra a ficha para conferir o estado atual.'
  if (resultadoIncerto) mensagem += ' Não foi possível confirmar o resultado. Confira o estado atual antes de repetir a operação; nenhuma repetição automática será feita.'
  return { codigo, status, categoria, mensagem, resultadoIncerto }
}

/** FunctionsHttpError.context é Response no SDK instalado, e não um JSON em body. */
export async function interpretarErroAcessoEquipe(error: unknown, escrita = false): Promise<ErroAcessoEquipe> {
  try {
    const valor = objeto(error)
    const contexto = valor?.context
    if (error instanceof FunctionsFetchError) return erroEquipeSeguro(error, escrita)
    if (contexto instanceof Response) {
      let corpo: unknown = null
      try { corpo = await contexto.clone().json() } catch { /* Status continua útil sem corpo legível. */ }
      const dados = objeto(corpo)
      return erroEquipeSeguro(error instanceof FunctionsRelayError ? { ...dados, codigo: codigoSeguro(dados?.codigo) ?? 'OPERACAO_INDISPONIVEL' } : dados, escrita, contexto.status)
    }
    // Compatibilidade com erros já interpretados; streams e texto não são exibidos.
    const corpo = objeto(objeto(contexto)?.body) ?? objeto(contexto)
    return erroEquipeSeguro(corpo ?? error, escrita, statusSeguro(objeto(contexto)?.status) ?? statusSeguro(valor?.status))
  } catch {
    return erroEquipeSeguro(null, escrita)
  }
}

/** Só na chamada de equipe_listar: 42883 pode apontar uma função interna distinta. */
export function consultaLegadaEquipePermitida(error: unknown): boolean {
  const valor = objeto(error)
  return valor?.code === 'PGRST202' || (valor?.code === '42883' && typeof valor.message === 'string' && /\bequipe_listar\b/u.test(valor.message))
}

export function respostaAcessoEquipeReconhecida(data: unknown, acao: unknown): boolean {
  const valor = objeto(data)
  if (!valor || 'erro' in valor || 'codigo' in valor) return false
  if (acao === 'listar') return typeof valor.membro_id === 'string' && Array.isArray(valor.clinicas) && Array.isArray(valor.convites)
  if (acao === 'alterar') return typeof valor.clinica_id === 'string' && ['acesso_ativo', 'acesso_suspenso'].includes(String(valor.status))
  if (acao === 'aceitar') return valor.status === 'aceito'
  if (acao === 'preparar' || acao === 'reenviar') return typeof valor.id === 'string' && valor.status === 'enviado'
  return false
}

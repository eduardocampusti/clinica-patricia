export type CodigoErroFinanceiro =
  | 'nao_autenticado'
  | 'nao_autorizado'
  | 'clinica_nao_autorizada'
  | 'caixa_indisponivel'
  | 'sessao_legada'
  | 'configuracao_ausente'
  | 'pagamento_inconsistente'
  | 'recebimento_duplicado'
  | 'estorno_excede_saldo'
  | 'idempotencia_conflitante'
  | 'timezone_invalida'
  | 'cursor_invalido'
  | 'dados_alterados'
  | 'registro_inexistente'
  | 'conflito_estado'
  | 'entrada_invalida'
  | 'servico_indisponivel'
  | 'resposta_invalida'
  | 'desconhecido'

export class ErroFinanceiro extends Error {
  readonly codigo: CodigoErroFinanceiro
  readonly podeTentarNovamente: boolean
  readonly causaTecnica?: unknown

  constructor(
    codigo: CodigoErroFinanceiro,
    mensagem: string,
    podeTentarNovamente = false,
    causaTecnica?: unknown,
  ) {
    super(mensagem)
    this.name = 'ErroFinanceiro'
    this.codigo = codigo
    this.podeTentarNovamente = podeTentarNovamente
    this.causaTecnica = causaTecnica
  }
}

interface ErroRpcLike {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function textoErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message
  if (erro && typeof erro === 'object') {
    const candidato = erro as ErroRpcLike
    return [candidato.message, candidato.details, candidato.hint].filter(Boolean).join(' ')
  }
  return String(erro ?? '')
}

function codigoSql(erro: unknown): string | undefined {
  if (!erro || typeof erro !== 'object') return undefined
  return (erro as ErroRpcLike).code
}

export function mapearErroFinanceiro(erro: unknown): ErroFinanceiro {
  if (erro instanceof ErroFinanceiro) return erro
  const texto = textoErro(erro).toLocaleLowerCase('pt-BR')
  const sqlstate = codigoSql(erro)

  if (sqlstate === '28000' || /nao autenticad|não autenticad|sessao expirada/.test(texto)) {
    return new ErroFinanceiro('nao_autenticado', 'Sua sessão expirou. Entre novamente para continuar.', false, erro)
  }
  if (sqlstate === '42501' || /sem permissao|somente proprietaria|acesso negado/.test(texto)) {
    const clinica = /clinica/.test(texto)
    return new ErroFinanceiro(
      clinica ? 'clinica_nao_autorizada' : 'nao_autorizado',
      clinica ? 'Você não tem autorização para operar nesta clínica.' : 'Você não tem autorização para esta operação.',
      false,
      erro,
    )
  }
  if (/sessao de caixa legada|transicao controlada/.test(texto)) {
    return new ErroFinanceiro('sessao_legada', 'Esta clínica possui um caixa antigo ainda em aberto. Ele precisa ser regularizado antes de usar o novo Financeiro.', false, erro)
  }
  if (/nao existe caixa aberto|caixa fechado|exige caixa aberto|sessao nao esta pronta/.test(texto)) {
    return new ErroFinanceiro('caixa_indisponivel', 'Não há um caixa financeiro aberto para esta clínica. Abra o caixa antes de receber pagamentos.', false, erro)
  }
  if (/preco da consulta nao configurado|configuracao financeira vigente nao encontrada/.test(texto)) {
    return new ErroFinanceiro('configuracao_ausente', 'O preço ou a configuração financeira desta clínica está ausente. Solicite a configuração à proprietária.', false, erro)
  }
  if (/soma dos pagamentos|pagamentos.*valor|quitar|componente de pagamento/.test(texto)) {
    return new ErroFinanceiro('pagamento_inconsistente', 'A soma das formas de pagamento deve corresponder ao valor integral.', false, erro)
  }
  if (/agendamento ja possui recebimento|recebimento duplicad/.test(texto)) {
    return new ErroFinanceiro('recebimento_duplicado', 'Este atendimento já possui um recebimento registrado.', false, erro)
  }
  if (/estorno.*excede|saldo estornavel|limite.*estorno/.test(texto)) {
    return new ErroFinanceiro('estorno_excede_saldo', 'O estorno solicitado excede o saldo disponível.', false, erro)
  }
  if (/chave de idempotencia ja utilizada|idempotency.*used/.test(texto)) {
    return new ErroFinanceiro('idempotencia_conflitante', 'A tentativa já foi usada em outra operação. Atualize os dados antes de tentar novamente.', false, erro)
  }
  if (/timezone|fuso horario/.test(texto)) {
    return new ErroFinanceiro('timezone_invalida', 'O fuso horário informado é inválido.', false, erro)
  }
  if (/cursor/.test(texto)) {
    return new ErroFinanceiro('cursor_invalido', 'A paginação perdeu o contexto. Reinicie a consulta.', true, erro)
  }
  if (/dados financeiros mudaram|dataset.*mudou|marcador|reconcilia/.test(texto)) {
    return new ErroFinanceiro('dados_alterados', 'Os dados financeiros mudaram durante a operação. Gere novamente.', true, erro)
  }
  if (sqlstate === 'P0002' || /inexistente|nao encontrad|não encontrad/.test(texto)) {
    return new ErroFinanceiro('registro_inexistente', 'O registro financeiro não foi encontrado ou não está mais disponível.', false, erro)
  }
  if (sqlstate === '23505' || /estado incompativel|estado inválido|nao esta aguardando|não está aguardando/.test(texto)) {
    return new ErroFinanceiro('conflito_estado', 'A operação não é compatível com o estado atual. Atualize os dados.', true, erro)
  }
  if (sqlstate === '22023' || sqlstate === '23514') {
    return new ErroFinanceiro('entrada_invalida', 'Revise os dados informados e tente novamente.', false, erro)
  }
  if (/fetch|network|timeout|indisponivel|failed to fetch/.test(texto)) {
    return new ErroFinanceiro('servico_indisponivel', 'O serviço financeiro está temporariamente indisponível.', true, erro)
  }
  return new ErroFinanceiro('desconhecido', 'Não foi possível concluir a operação financeira.', true, erro)
}

export function mensagemErroFinanceiro(erro: unknown): string {
  return mapearErroFinanceiro(erro).message
}

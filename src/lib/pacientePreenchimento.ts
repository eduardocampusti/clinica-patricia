export type EstadoItemCadastro = 'informado' | 'ausente' | 'desconhecido'
export interface DadosPreenchimento {
  nome_completo?: string | null
  data_nascimento?: string | null
  telefone?: string | null
  sexo?: string | null
  endereco?: string | null
  endereco_historico?: string | null
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
}
const texto = (v: unknown) => typeof v === 'string' && v.trim().length > 0
function item(dados: DadosPreenchimento, campo: keyof DadosPreenchimento): EstadoItemCadastro {
  return dados[campo] === undefined ? 'desconhecido' : texto(dados[campo]) ? 'informado' : 'ausente'
}
export function avaliarPreenchimento(dados: DadosPreenchimento | null, cpfPendente: boolean | null) {
  const cadastro = dados ?? {}
  const estruturados = ['logradouro', 'numero', 'bairro', 'cidade', 'uf'] as const
  const temEstruturado = estruturados.some(c => texto(cadastro[c]))
  const endereco: EstadoItemCadastro = texto(cadastro.endereco_historico) ? 'informado' : temEstruturado
    ? estruturados.some(c => cadastro[c] === undefined) ? 'desconhecido'
      : estruturados.every(c => texto(cadastro[c])) ? 'informado' : 'ausente'
    : texto(cadastro.endereco_historico) || texto(cadastro.endereco) ? 'informado'
      : estruturados.some(c => cadastro[c] === undefined) || cadastro.endereco === undefined ? 'desconhecido' : 'ausente'
  const sexo = cadastro.sexo === undefined ? 'desconhecido'
    : !texto(cadastro.sexo) || cadastro.sexo === 'nao_informado' ? 'ausente'
      : ['feminino', 'masculino', 'outro'].includes(cadastro.sexo!) ? 'informado' : 'desconhecido'
  const itens: { nome: string; estado: EstadoItemCadastro }[] = [
    { nome: 'Nome', estado: item(cadastro, 'nome_completo') },
    { nome: 'Nascimento', estado: item(cadastro, 'data_nascimento') },
    { nome: 'Telefone', estado: item(cadastro, 'telefone') },
    { nome: 'Sexo', estado: sexo }, { nome: 'Endereço', estado: endereco },
    { nome: 'CPF (opcional)', estado: cpfPendente === null ? 'desconhecido' : cpfPendente ? 'ausente' : 'informado' },
  ]
  return { itens, informados: itens.filter(i => i.estado === 'informado').length,
    conclusivo: itens.every(i => i.estado !== 'desconhecido'), pendencias: itens.filter(i => i.estado === 'ausente').map(i => i.nome) }
}

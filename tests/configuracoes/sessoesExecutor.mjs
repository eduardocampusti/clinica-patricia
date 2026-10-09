// Somente executor de homologação; não importa credenciais nem muda a aplicação.
export async function renovarSessaoAuxiliarAposLogin(cliente, fixture) {
  const r = await cliente.auth.signInWithPassword({email: fixture.email, password: fixture.password})
  if (r.error || !r.data?.session) throw Error('Novo login auxiliar da fixture não confirmado')
  const guarda = await cliente.rpc('acesso_direto_exigir_sessao')
  if (guarda.error || guarda.data !== true) throw Error('Sessão auxiliar recusada pela guarda')
}

export async function encerrarSessaoAuxiliar(cliente) {
  const r = await cliente.auth.signOut({scope: 'local'})
  if (r.error) throw Error('Encerramento da sessão auxiliar não confirmado')
}

export function exigirConsulta(resultado, etapa) {
  if (resultado.error || !resultado.data || !Number.isInteger(resultado.data.revisao)) {
    throw Error(`${etapa}: consulta não confirmada (HTTP ${resultado.status ?? 'sem resposta'})`)
  }
  return resultado.data
}

export function encerramentoCompleto(relatorio, quantidade = 2) {
  return relatorio.contas.length === quantidade && relatorio.encerramento.length >= quantidade
    && relatorio.encerramento.every(item => item.aprovado === true)
    && relatorio.contextos_finais?.length === quantidade
    && relatorio.contextos_finais.every(item => item.clinica_ativa === false && item.contexto_ativo === false
      && item.publico_encerrado === true && item.vinculos_ativos === 0)
}

// Ativar este gate em TODAS as funções autenticadas antes do provisionamento.
// Publicar somente após as migrações: ausência da RPC falha de forma fechada.
export async function exigirAtivacaoServico(cliente: { rpc: (nome: string) => PromiseLike<{ data: unknown; error: unknown }> }): Promise<void> {
  const { data, error } = await cliente.rpc('acesso_direto_exigir_sessao')
  if (error || data !== true) throw { code: '42501' }
}

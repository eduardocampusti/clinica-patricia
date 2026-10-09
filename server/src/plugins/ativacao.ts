export async function exigirAtivacaoServidor(cliente: { rpc: (nome: string) => PromiseLike<{ data: unknown; error: unknown }> }): Promise<boolean> {
  const { data, error } = await cliente.rpc('acesso_direto_exigir_sessao')
  return !error && data === true
}

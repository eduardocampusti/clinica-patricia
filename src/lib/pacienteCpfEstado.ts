/** Somente o SQLSTATE específico da RPC confirma CPF legado inválido. */
export function cpfLegadoInvalidoConfirmado(erro: unknown): boolean {
  return typeof erro === 'object' && erro !== null && 'code' in erro && erro.code === 'PC422'
}

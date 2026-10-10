import { ErroConfiguracao } from './configuracoes.ts'

// PT409 é conflito funcional, sem repetir a transação como serialization_failure.
export function conferirRpcConfiguracoes(error: { code?: string } | null) {
  if (!error) return
  const conflito = error.code === 'PT409' || error.code === '40001'
  const negado = error.code === '42501'
  const invalido = error.code === '22023'
  throw new ErroConfiguracao(negado ? 403 : conflito ? 409 : invalido ? 422 : 503,
    conflito ? 'Outra edição alterou a configuração ou seus dados oficiais. Reconsulte.' :
      negado ? 'Operação não autorizada neste alcance.' : 'Operação não confirmada. Reconsulte antes de repetir.',
    !(negado || conflito || invalido))
}

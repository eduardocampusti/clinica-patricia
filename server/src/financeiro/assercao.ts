import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { canonicalizar, type ValorCanonico } from './canonicalizacao.js'

export interface DadosAssercaoFinanceira {
  v: 1
  kid: string
  sub: string
  clinica_id: string
  operacao: string
  idempotency_key: string
  request_hash: string
  jti: string
  iat: number
  exp: number
  payload: ValorCanonico
}

interface CriarAssercaoParams {
  usuarioId: string
  clinicaId: string
  operacao: string
  idempotencyKey: string
  payload: ValorCanonico
  chave: string
  keyId: string
  agora?: Date
  jti: string
}

export function hashPayload(payload: ValorCanonico): string {
  return createHash('sha256').update(canonicalizar(payload), 'utf8').digest('hex')
}

export function criarAssercaoFinanceira(params: CriarAssercaoParams) {
  const agoraSegundos = Math.floor((params.agora ?? new Date()).getTime() / 1000)
  const dados: DadosAssercaoFinanceira = {
    v: 1,
    kid: params.keyId,
    sub: params.usuarioId,
    clinica_id: params.clinicaId,
    operacao: params.operacao,
    idempotency_key: params.idempotencyKey,
    request_hash: hashPayload(params.payload),
    jti: params.jti,
    iat: agoraSegundos,
    exp: agoraSegundos + 30,
    payload: params.payload,
  }
  const texto = canonicalizar(dados as unknown as ValorCanonico)
  const assinatura = createHmac('sha256', params.chave).update(texto, 'utf8').digest('hex')
  return { texto, assinatura, dados }
}

export function assinaturaValidaParaTeste(texto: string, assinaturaHex: string, chave: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(assinaturaHex)) return false
  const esperada = createHmac('sha256', chave).update(texto, 'utf8').digest()
  const recebida = Buffer.from(assinaturaHex, 'hex')
  return recebida.length === esperada.length && timingSafeEqual(recebida, esperada)
}

// Estado de leitura compartilhado pelos painéis de início.
// Releitura no mesmo contexto conserva o resultado anterior para não piscar
// esqueleto; contexto novo nunca reaproveita dado de outra clínica, papel ou dia.

export type ErroLeitura = 'permissao' | 'leitura'

export interface Leitura<T> {
  chave: string
  dado?: T
  /** Instante da última leitura bem-sucedida. Falha não o avança. */
  em?: string
  erro?: ErroLeitura
  carregando: boolean
}

/**
 * `conservar` acompanha o modelo de interação, não a preferência visual.
 * Atualização automática conserva o resultado anterior para não piscar esqueleto
 * durante uma releitura que o usuário não pediu. Atualização manual retira os
 * valores: quem clicou em Atualizar não pode ler o número antigo como se fosse
 * a resposta da consulta que ainda está em andamento.
 */
export function iniciarLeitura<T>(anterior: Leitura<T>, chave: string, conservar = true): Leitura<T> {
  return conservar && anterior.chave === chave ? { ...anterior, erro: undefined, carregando: true } : { chave, carregando: true }
}

export function concluirLeitura<T>(chave: string, dado: T, em: string): Leitura<T> {
  return { chave, dado, em, carregando: false }
}

/**
 * Falha nunca publica número defasado como atual: o dado sai da tela e sobra o
 * aviso. Só o instante da última leitura bem-sucedida permanece, e apenas quando
 * pertence ao contexto atual; recusa de permissão também o descarta.
 */
export function falharLeitura<T>(anterior: Leitura<T>, chave: string, erro: ErroLeitura): Leitura<T> {
  if (erro === 'permissao') return { chave, erro, carregando: false }
  return { chave, em: anterior.chave === chave ? anterior.em : undefined, erro, carregando: false }
}

/** Resultado publicável apenas quando pertence ao contexto atual. */
export function leituraDoContexto<T>(leitura: Leitura<T>, chave: string): Leitura<T> {
  return leitura.chave === chave ? leitura : { chave, carregando: true }
}

/**
 * Instante conservador entre leituras independentes: a mais antiga entre as
 * bem-sucedidas, porque nenhuma afirmação pode ser mais recente que ela.
 */
export function instanteConservador(...instantes: (string | undefined)[]): string | undefined {
  const validos = instantes.filter((valor): valor is string => Boolean(valor) && Number.isFinite(Date.parse(valor!)))
  return validos.length ? validos.reduce((x, y) => (Date.parse(x) <= Date.parse(y) ? x : y)) : undefined
}

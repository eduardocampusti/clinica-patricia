export interface ArmazenamentoChaves {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

export interface TentativaIdempotente {
  intencao: string
  chave: string
}

class ArmazenamentoMemoria implements ArmazenamentoChaves {
  private readonly valores = new Map<string, string>()

  getItem(chave: string): string | null { return this.valores.get(chave) ?? null }
  setItem(chave: string, valor: string): void { this.valores.set(chave, valor) }
  removeItem(chave: string): void { this.valores.delete(chave) }
}

function armazenamentoPadrao(): ArmazenamentoChaves {
  if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage
  return new ArmazenamentoMemoria()
}

function gerarChavePadrao(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error('Gerador seguro de idempotência indisponível.')
  return globalThis.crypto.randomUUID()
}

export class GerenciadorIdempotencia {
  private readonly armazenamento: ArmazenamentoChaves
  private readonly gerarChave: () => string
  private readonly prefixo: string

  constructor(
    armazenamento: ArmazenamentoChaves = armazenamentoPadrao(),
    gerarChave: () => string = gerarChavePadrao,
    prefixo = 'clinica-patricia:financeiro:idempotencia:',
  ) {
    this.armazenamento = armazenamento
    this.gerarChave = gerarChave
    this.prefixo = prefixo
  }

  iniciar(intencao: string): TentativaIdempotente {
    const normalizada = intencao.trim()
    if (!normalizada) throw new Error('Intenção idempotente obrigatória.')
    const chaveArmazenamento = this.prefixo + encodeURIComponent(normalizada)
    const existente = this.armazenamento.getItem(chaveArmazenamento)
    if (existente) return { intencao: normalizada, chave: existente }
    const chave = this.gerarChave()
    this.armazenamento.setItem(chaveArmazenamento, chave)
    return { intencao: normalizada, chave }
  }

  concluir(tentativa: TentativaIdempotente): void {
    const chaveArmazenamento = this.prefixo + encodeURIComponent(tentativa.intencao)
    if (this.armazenamento.getItem(chaveArmazenamento) === tentativa.chave) {
      this.armazenamento.removeItem(chaveArmazenamento)
    }
  }

  cancelar(tentativa: TentativaIdempotente): void {
    this.concluir(tentativa)
  }
}

export const idempotenciaFinanceira = new GerenciadorIdempotencia()

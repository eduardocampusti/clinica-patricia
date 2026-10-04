// Serviço em memória exclusivo da prévia. Nenhuma importação de Supabase/RPC.
export type Forma = 'Dinheiro' | 'Pix' | 'Crédito'
export type Movimento = { id: string; hora: string; descricao: string; forma: Forma; valor: bigint; tipo: 'recebimento' | 'sangria' | 'suprimento' | 'estorno'; origem?: string }
export const base: Movimento[] = [
  { id: 'REC005', hora: '11:05', descricao: 'Pedro Exemplo', forma: 'Pix', valor: 15000n, tipo: 'recebimento' },
  { id: 'REC004', hora: '10:40', descricao: 'Carla Exemplo', forma: 'Dinheiro', valor: 25000n, tipo: 'recebimento' },
  { id: 'SAN001', hora: '10:15', descricao: 'Sangria efetivada', forma: 'Dinheiro', valor: -10000n, tipo: 'sangria' },
  { id: 'REC003', hora: '09:30', descricao: 'Ana Exemplo', forma: 'Crédito', valor: 20000n, tipo: 'recebimento' },
  { id: 'REC002', hora: '08:45', descricao: 'José Exemplo', forma: 'Dinheiro', valor: 12000n, tipo: 'recebimento' },
  { id: 'REC001', hora: '08:10', descricao: 'Maria Exemplo', forma: 'Pix', valor: 18000n, tipo: 'recebimento' },
]
export function resumo(movimentos: Movimento[], fundo: bigint) {
  const recebimentos = movimentos.filter(m => m.tipo === 'recebimento')
  const porForma = (forma: Forma) => recebimentos.filter(m => m.forma === forma).reduce((s, m) => s + m.valor, 0n)
  const tipo = (tipo: Movimento['tipo']) => movimentos.filter(m => m.tipo === tipo).reduce((s, m) => s + m.valor, 0n)
  return { dinheiro: porForma('Dinheiro'), pix: porForma('Pix'), credito: porForma('Crédito'), bruto: tipo('recebimento'),
    suprimentos: tipo('suprimento'), sangrias: tipo('sangria'), estornos: movimentos.filter(m => m.tipo === 'estorno' && m.forma === 'Dinheiro').reduce((s, m) => s + m.valor, 0n),
    esperado: fundo + movimentos.filter(m => m.forma === 'Dinheiro').reduce((s, m) => s + m.valor, 0n), quantidade: new Set(recebimentos.map(m => m.id)).size }
}
export class ServicoSintetico {
  private respostas = new Map<string, Promise<{ confirmado: true; referencia: string }>>()
  confirmacoes = 0
  confirmar(chave: string, falhar = false) {
    const existente = this.respostas.get(chave)
    if (existente) return existente
    const resposta = new Promise<{ confirmado: true; referencia: string }>((resolve, reject) => setTimeout(() => {
      if (falhar) { this.respostas.delete(chave); reject(new Error('Falha simulada do serviço. Dados preservados; nenhuma confirmação.')); return }
      this.confirmacoes++
      resolve({ confirmado: true, referencia: `DEMO${String(this.confirmacoes).padStart(3, '0')}` })
    }, 650))
    this.respostas.set(chave, resposta)
    return resposta
  }
}

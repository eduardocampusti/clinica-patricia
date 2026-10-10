import { useEffect, useState, type ReactNode } from 'react'
import { FinanceIcon } from './FinanceVisual'
import { decimalBancoParaCentavos, formatarCentavos } from '../../lib/financeiro/financeiro.money'
import type { ResumoOperacionalCaixa } from '../../lib/financeiro/financeiro.caixa-leitura'
import './caixa-recepcao.css'

const moeda = (valor: string | number) => formatarCentavos(decimalBancoParaCentavos(valor))

export function IndicadoresCaixa({ resumo }: { resumo: ResumoOperacionalCaixa }) {
  return <div className="cr-indicadores">
    <section className="cr-indicador cr-dinheiro"><FinanceIcon name="cash" /><div>
      <h2>Dinheiro esperado</h2><strong data-testid="esperado">{moeda(resumo.valor_esperado)}</strong>
      <p>A conferir na contagem física.</p></div></section>
    <section className="cr-indicador"><FinanceIcon name="wallet" /><div>
      <h2>Recebido neste caixa</h2><strong data-testid="recebido">{moeda(resumo.total_recebimentos_brutos)}</strong>
      <p>Valor bruto de toda a sessão.</p></div></section>
  </div>
}

function SecaoRecolhivel({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [aberto, setAberto] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const atualizar = () => setAberto(media.matches)
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])
  return <details className="cr-composicao" open={aberto} onToggle={e => setAberto(e.currentTarget.open)}>
    <summary>{titulo}</summary><div>{children}</div>
  </details>
}

export function ComposicaoCaixa({ resumo }: { resumo: ResumoOperacionalCaixa }) {
  const dinheiro = [
    ['Fundo inicial', resumo.valor_abertura], ['Recebimentos em dinheiro', resumo.total_dinheiro],
    ['Suprimentos', resumo.total_suprimentos],
    ['Sangrias efetivadas', -decimalBancoParaCentavos(resumo.total_sangrias)],
    ['Estornos em dinheiro', -decimalBancoParaCentavos(resumo.total_estornos_dinheiro)],
  ] as const
  return <aside className="cr-lateral" aria-label="Composição do caixa">
    <SecaoRecolhivel titulo="Composição do dinheiro"><dl className="cr-valores">
      {dinheiro.map(([nome, valor]) => <div key={nome}><dt>{nome}</dt><dd>{typeof valor === 'bigint' ? formatarCentavos(valor) : moeda(valor)}</dd></div>)}
      <div className="cr-total"><dt>Esperado neste caixa</dt><dd>{moeda(resumo.valor_esperado)}</dd></div>
    </dl></SecaoRecolhivel>
    <SecaoRecolhivel titulo="Recebimentos por forma"><dl className="cr-valores">
      {([['Dinheiro', resumo.total_dinheiro], ['Pix', resumo.total_pix], ['Crédito', resumo.total_cartao_credito]] as const)
        .map(([nome, valor]) => <div key={nome}><dt>{nome}</dt><dd>{moeda(valor)}</dd></div>)}
    </dl><p className="cr-nota">Valores brutos registrados no sistema. Pix e crédito dependem de conferência externa.</p></SecaoRecolhivel>
  </aside>
}

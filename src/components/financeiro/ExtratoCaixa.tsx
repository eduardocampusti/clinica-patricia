import { useCallback, useEffect, useState } from 'react'
import { useFinanceiroConsulta } from '../../hooks/useFinanceiroConsulta'
import { assinarInvalidacaoFinanceira } from '../../lib/financeiro/financeiro.cache'
import { listarMovimentosCaixa, TIPOS_MOVIMENTO, valorAssinadoMovimento, type CursorCaixa, type MovimentoCaixa, type TipoMovimento } from '../../lib/financeiro/financeiro.movimentos-leitura'
import { formatarCentavos, decimalBancoParaCentavos } from '../../lib/financeiro/financeiro.money'
import { formatarDataFinanceira } from '../../lib/financeiro/financeiro.date'
import { ModalBase } from '../ModalBase'
import { FeedbackAlert } from '../feedback/FeedbackAlert'

const ROTULOS_MOVIMENTO: Record<TipoMovimento, string> = { recebimento: 'Recebimento', suprimento: 'Suprimento', sangria: 'Sangria efetivada', estorno: 'Estorno efetivado', ajuste: 'Ajuste' }
const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', cartao_credito: 'Crédito' }
const botao = 'finance-button'

function PaginaExtrato({ clinicaId, sessaoId, tipo, cursor, pagina, voltar, avancar }: {
  clinicaId: string; sessaoId: string; tipo?: TipoMovimento; cursor: CursorCaixa | null; pagina: number
  voltar: () => void; avancar: (cursor: CursorCaixa) => void
}) {
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<MovimentoCaixa | null>(null)
  const carregar = useCallback(() => listarMovimentosCaixa(clinicaId, sessaoId, cursor, tipo), [clinicaId, sessaoId, cursor, tipo])
  const consulta = useFinanceiroConsulta(`${clinicaId}:${sessaoId}:${tipo}:${cursor?.id ?? 'inicio'}`, carregar)
  const dados = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  const itens = dados?.itens.filter(m => `${m.paciente ?? ''} ${m.motivo ?? ''} ${ROTULOS_MOVIMENTO[m.tipo]}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')))
  return <>
    <label className="block text-sm">Buscar nesta página<input className="cr-campo mt-2" placeholder="Paciente ou descrição" value={busca} onChange={e => setBusca(e.target.value)} /></label>
    <p className="cr-nota mt-2">Uma linha por movimento. Busca limitada a esta página; o filtro de tipo consulta toda a sessão.</p>
    {consulta.resultado.estado === 'carregando' && <div className="finance-skeleton" role="status" aria-label="Carregando movimentações" />}
    {consulta.resultado.estado === 'erro' && <FeedbackAlert variant="destructive" title="Movimentações indisponíveis" description={consulta.resultado.erro.message}
      action={<button className={botao} onClick={() => void consulta.recarregar()}>Tentar novamente</button>} urgent />}
    {dados && (!itens?.length ? <div className="finance-empty"><strong>{busca ? 'Nenhum resultado nesta página' : 'Nenhuma movimentação nesta seleção'}</strong>
      <p>{busca ? 'Altere a busca ou navegue para outra página.' : 'Recebimentos, suprimentos, sangrias e estornos efetivados aparecerão aqui.'}</p></div>
      : <div className="cr-tabela"><table><thead><tr><th>Data e hora</th><th>Descrição</th><th>Forma</th><th>Valor</th><th>Ação</th></tr></thead>
        <tbody>{itens.map(m => <tr key={m.id}><td>{formatarDataFinanceira(m.registrado_em)}</td>
          <td><strong>{m.paciente ?? ROTULOS_MOVIMENTO[m.tipo]}</strong><small>{ROTULOS_MOVIMENTO[m.tipo]}{m.outraSessao ? ' · recebido em outra sessão' : ''}</small></td>
          <td>{m.tipo === 'ajuste' ? 'Não classificada' : m.pagamentos.map(p => FORMAS[p.forma_pagamento]).join(' + ')}</td>
          <td className={valorAssinadoMovimento(m) < 0n ? 'cr-negativo' : ''}>{formatarCentavos(valorAssinadoMovimento(m))}</td>
          <td><button className={botao} aria-label={`Detalhes de ${m.paciente ?? ROTULOS_MOVIMENTO[m.tipo]} em ${formatarDataFinanceira(m.registrado_em)}`} onClick={() => setSelecionado(m)}>Detalhes</button></td>
        </tr>)}</tbody></table></div>)}
    <div className="cr-paginacao"><span className="cr-nota">Página {pagina + 1}{dados ? ` · ${dados.itens.length} movimentos carregados` : ''}</span>
      <div className="flex gap-2"><button className={botao} disabled={!pagina} onClick={voltar}>Anterior</button><button className={botao} disabled={!dados?.proximo} onClick={() => dados?.proximo && avancar(dados.proximo)}>Próxima</button></div></div>
    {selecionado && <ModalBase titulo="Detalhes da movimentação" onFechar={() => setSelecionado(null)} largura="lg">
      <div className="cr-formulario"><p>{selecionado.paciente ?? ROTULOS_MOVIMENTO[selecionado.tipo]} · {formatarDataFinanceira(selecionado.registrado_em)}</p>
        <dl className="cr-valores"><div><dt>Movimentação</dt><dd>{ROTULOS_MOVIMENTO[selecionado.tipo]}</dd></div><div><dt>Valor registrado</dt><dd>{formatarCentavos(valorAssinadoMovimento(selecionado))}</dd></div>
          {selecionado.tipo !== 'ajuste' && selecionado.pagamentos.map(p => <div key={p.forma_pagamento}><dt>{FORMAS[p.forma_pagamento]}</dt><dd>{formatarCentavos(decimalBancoParaCentavos(p.valor))}</dd></div>)}</dl>
        {selecionado.profissional && <p>Profissional: {selecionado.profissional}</p>}
        {selecionado.motivo && <p>Motivo: {selecionado.motivo}</p>}
        {selecionado.tipo === 'ajuste' && <p className="cr-nota">A direção deste ajuste não está classificada. O valor exibido não representa o efeito no dinheiro.</p>}
        {selecionado.outraSessao && <p className="cr-nota">Recebimento original em outra sessão{selecionado.aberturaOrigem ? `, aberta em ${formatarDataFinanceira(selecionado.aberturaOrigem)}` : ''}. Este estorno pertence à sessão atual; não reduz o bruto recebido nela.</p>}
        <p className="cr-nota">Este resumo é uma consulta do registro. Documentos fiscais ficam na aba Fiscal.</p>
        <button className={botao} onClick={() => setSelecionado(null)}>Fechar detalhes</button>
      </div></ModalBase>}
  </>
}

export function ExtratoCaixa({ clinicaId, sessaoId }: { clinicaId: string; sessaoId: string }) {
  const [tipo, setTipo] = useState<TipoMovimento | ''>('')
  const [cursores, setCursores] = useState<(CursorCaixa | null)[]>([null])
  const [revisao, setRevisao] = useState(0)
  function atualizar() { setCursores([null]); setRevisao(r => r + 1) }
  useEffect(() => assinarInvalidacaoFinanceira(evento => {
    if (evento.clinicaId === clinicaId && evento.leituras.includes('caixa')) { setCursores([null]); setRevisao(r => r + 1) }
  }), [clinicaId])
  return <section className="finance-surface">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="texto-titulo-secao">Movimentações desta sessão</h2><button className={botao} onClick={atualizar}>Atualizar movimentações</button></div>
    <div className="cr-filtros"><label>Tipo de movimento<select className="cr-campo" value={tipo} onChange={e => { setTipo(e.target.value as TipoMovimento | ''); setCursores([null]) }}><option value="">Todos os tipos</option>{TIPOS_MOVIMENTO.map(t => <option key={t} value={t}>{ROTULOS_MOVIMENTO[t]}</option>)}</select></label></div>
    <PaginaExtrato key={`${tipo}:${cursores.at(-1)?.id ?? ''}:${revisao}`} clinicaId={clinicaId} sessaoId={sessaoId} tipo={tipo || undefined} cursor={cursores.at(-1)!} pagina={cursores.length - 1}
      voltar={() => setCursores(c => c.slice(0, -1))} avancar={cursor => setCursores(c => [...c, cursor])} />
  </section>
}

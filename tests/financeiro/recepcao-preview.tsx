import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { Tabs } from '@base-ui/react/tabs'
import AppShell from '../../src/components/shell/AppShell'
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider'
import { ModalBase } from '../../src/components/ModalBase'
import { FeedbackAlert } from '../../src/components/feedback/FeedbackAlert'
import { CLINIC_BRANDS } from '../../src/config/clinicBrands'
import { formatarCentavos as moeda, textoMonetarioParaCentavos as centavos } from '../../src/lib/financeiro/financeiro.money'
import { base, resumo, ServicoSintetico, type Movimento, type Forma } from './recepcao-modelo'
import { ComposicaoCaixa, IndicadoresCaixa } from '../../src/components/financeiro/CaixaRecepcaoVisual'
import { centavosParaDecimal } from '../../src/lib/financeiro/financeiro.money'
import '../../src/index.css'
import './recepcao-preview.css'

const clinicas = ['ipupiara', 'brotas'].map(slug => { const b = CLINIC_BRANDS[slug as keyof typeof CLINIC_BRANDS]; return { id: `demo-${slug}`, nome: b.nome, cor_primaria: b.cores.primaria, cor_secundaria: b.cores.primariaHover, cor_menu: b.cores.visual } })
const cenarios = { aberto: 'Caixa aberto', fechado: 'Sem caixa aberto', divergencia: 'Fechamento divergente', erro: 'Erro de leitura', carregando: 'Carregando', vazio: 'Sem movimentações', permissao: 'Sem permissão', legado: 'Caixa legado', aprovacao: 'Aguardando aprovação', devolvido: 'Devolvido para correção' }
type Cenario = keyof typeof cenarios
type Fluxo = 'receber' | 'fechamento' | 'sangria' | 'suprimento' | 'historico' | 'detalhes' | 'estorno'
const formas: Forma[] = ['Dinheiro', 'Pix', 'Crédito']
// Rota real somente no servidor sintético dedicado, para o realce do shell existente.
const urlPrevia = new URLSearchParams(location.search)
urlPrevia.set('previa', 'caixa-recepcao')
history.replaceState(null, '', `/sistema/${urlPrevia.get('clinica') === 'brotas' ? 'brotas' : 'ipupiara'}/financeiro?${urlPrevia}`)
function valorSeguro(texto: string) { try { return centavos(texto) } catch { return 0n } }
function Campo({ nome, valor, onChange, required = true, disabled = false }: { nome: string; valor: string; onChange: (v: string) => void; required?: boolean; disabled?: boolean }) { return <label className="cp-campo">{nome}<input inputMode="decimal" placeholder="0,00" value={valor} onChange={e => onChange(e.target.value)} required={required} disabled={disabled} /></label> }
function Linhas({ itens }: { itens: [string, bigint][] }) { return <dl className="cp-valores">{itens.map(([nome, valor]) => <div key={nome}><dt>{nome}</dt><dd>{moeda(valor)}</dd></div>)}</dl> }
function Superficie({ titulo, children }: { titulo: string; children: ReactNode }) { return <section className="cp-superficie"><h2>{titulo}</h2>{children}</section> }

export function Previa() {
  const parametros = new URLSearchParams(location.search)
  const inicial = parametros.get('cenario') as Cenario
  const [cenario, setCenario] = useState<Cenario>(inicial in cenarios ? inicial : 'aberto')
  const [clinicaId, setClinicaId] = useState(parametros.get('clinica') === 'brotas' ? clinicas[1].id : clinicas[0].id)
  const clinica = clinicas.find(c => c.id === clinicaId)!
  const { aplicarCoresClinica } = useTheme()
  const [papel, setPapel] = useState<'recepcao' | 'proprietaria'>('recepcao')
  const [aba, setAba] = useState('caixa')
  const [fluxo, setFluxo] = useState<Fluxo | null>(null)
  const [movimentos, setMovimentos] = useState<Movimento[]>(inicial === 'vazio' ? [] : base)
  const [fundo, setFundo] = useState(15000n)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('Todas as formas')
  const [pagina, setPagina] = useState(0)
  const [proposta, setProposta] = useState(parametros.has('proposta'))
  const [erroServico, setErroServico] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [selecionado, setSelecionado] = useState<Movimento>(base[0])
  const [solicitacoes, setSolicitacoes] = useState<string[]>([])
  const [estornoEstado, setEstornoEstado] = useState<'solicitado' | 'efetivado' | 'rejeitado'>('solicitado')
  const [ocupado, setOcupado] = useState(false)
  const contexto = useRef(0)
  const servico = useRef(new ServicoSintetico())
  const total = resumo(movimentos, fundo)
  const oficialSintetico = { valor_abertura: centavosParaDecimal(fundo), total_dinheiro: centavosParaDecimal(total.dinheiro), total_pix: centavosParaDecimal(total.pix), total_cartao_credito: centavosParaDecimal(total.credito), total_recebimentos_brutos: centavosParaDecimal(total.bruto), total_suprimentos: centavosParaDecimal(total.suprimentos), total_sangrias: centavosParaDecimal(-total.sangrias), total_estornos_dinheiro: centavosParaDecimal(-total.estornos), valor_esperado: centavosParaDecimal(total.esperado), total_clinica: '0.00', total_profissionais: '0.00' }
  const permitido = cenario !== 'permissao'
  const aberto = ['aberto', 'vazio', 'divergencia'].includes(cenario)
  useEffect(() => { aplicarCoresClinica(clinica) }, [clinica, aplicarCoresClinica])
  function reiniciar(novo: Cenario, id = clinicaId) {
    contexto.current++; setClinicaId(id); setCenario(novo); setFluxo(null); setFeedback(''); setOcupado(false)
    setMovimentos(novo === 'vazio' ? [] : [...base]); setFundo(15000n); setPagina(0); setBusca(''); setFiltro('Todas as formas'); setSolicitacoes([]); setEstornoEstado('solicitado'); servico.current = new ServicoSintetico()
  }
  function trocarClinica(id: string) { reiniciar('aberto', id); const params = new URLSearchParams(location.search); params.set('clinica', id.replace('demo-', '')); params.delete('cenario'); history.replaceState(null, '', `/sistema/${id.replace('demo-', '')}/financeiro?${params}`); window.dispatchEvent(new PopStateEvent('popstate')); setFeedback('Contexto alterado: formulário e resposta da clínica anterior descartados nesta simulação.') }
  const visiveis = movimentos.filter(m => m.descricao.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')) && (filtro === 'Todas as formas' || m.forma === filtro))
  const iniciar = (tipo: Fluxo) => { setFeedback(''); if (tipo === 'fechamento' && solicitacoes.some(s => s.startsWith('Sangria solicitada'))) { setFeedback('Existem sangrias pendentes. Resolva aprovação e efetivação antes de iniciar o fechamento.'); return }; setFluxo(tipo) }
  async function confirmar(chave: string) {
    const versao = contexto.current
    const resposta = await servico.current.confirmar(`${clinicaId}:${chave}`, erroServico)
    if (versao !== contexto.current) throw new Error('Contexto da clínica mudou. A resposta anterior foi descartada.')
    return resposta
  }
  function recebido(parcelas: { forma: Forma; valor: bigint }[], nome: string, referencia: string) {
    setMovimentos(anteriores => [...parcelas.map(p => ({ id: referencia, hora: '11:20', descricao: nome, forma: p.forma, valor: p.valor, tipo: 'recebimento' as const })), ...anteriores])
  }
  return <AppShell tela="financeiro" papel={cenario === 'permissao' ? 'medico' : papel} clinicaAtiva={clinica} clinicasDoUsuario={papel === 'proprietaria' ? clinicas : [clinica]} onSelecionarClinica={trocarClinica} emailUsuario="ana@exemplo.invalid" onSair={() => setFeedback('Saída demonstrativa. Nenhuma sessão real existe nesta prévia.')} onNavegar={() => setFeedback('Navegação externa desativada nesta prévia isolada.')}>
    <div className="cp-previa">
      <div className="cp-demo"><strong>Prévia isolada · dados fictícios</strong><span>Nenhuma consulta ou operação financeira real.</span><details><summary>Cenários de demonstração</summary><div className="cp-controles">
        <label>Cenário<select aria-label="Cenário" value={cenario} onChange={e => reiniciar(e.target.value as Cenario)}>{Object.entries(cenarios).map(([v, nome]) => <option key={v} value={v}>{nome}</option>)}</select></label>
        <label>Perfil simulado<select value={papel} onChange={e => { setPapel(e.target.value as typeof papel); setFluxo(null) }}><option value="recepcao">Recepção</option><option value="proprietaria">Proprietária</option></select></label>
        <button className="cp-botao" onClick={() => trocarClinica(clinicas.find(c => c.id !== clinicaId)!.id)}>Simular mudança de clínica</button>
        <label className="cp-check"><input type="checkbox" checked={proposta} onChange={e => setProposta(e.target.checked)} />Exibir proposta de cobranças</label>
        <label className="cp-check"><input type="checkbox" checked={erroServico} onChange={e => setErroServico(e.target.checked)} />Simular falha do serviço</label>
      </div></details></div>
      <header className="cp-intro"><h1>Caixa da recepção</h1><p>03/10/2026 · {clinica.nome}</p></header>
      <Tabs.Root value={aba} onValueChange={v => { setAba(String(v)); setBusca(''); setPagina(0) }}>
        <Tabs.List activateOnFocus className="cp-abas" aria-label="Áreas do Caixa">{[['caixa', 'Caixa'], ['estornos', 'Estornos'], ['fiscal', 'Fiscal']].map(([v, nome]) => <Tabs.Tab value={v} key={v}>{nome}</Tabs.Tab>)}</Tabs.List>
        {feedback && <FeedbackAlert title={feedback} variant="info" />}
        {!permitido ? <Superficie titulo="Acesso restrito"><p>Este perfil não pode consultar nem operar o caixa da clínica.</p></Superficie> : <>
        <Tabs.Panel value="caixa">
          {cenario === 'carregando' ? <div role="status" aria-label="Carregando caixa" className="cp-carregando"><div/><div/><div/><p>Carregando dados demonstrativos…</p></div> : cenario === 'erro' ? <FeedbackAlert variant="destructive" title="Não foi possível carregar o caixa" description="Falha de leitura simulada. Não representa saldo zero." action={<button className="cp-botao" onClick={() => reiniciar('aberto')}>Tentar novamente</button>} /> : cenario === 'legado' ? <Superficie titulo="Caixa legado preservado"><p>Operações novas bloqueadas. A transição precisa de acompanhamento; nenhum encerramento ou conversão automática.</p><button className="cp-botao" onClick={() => iniciar('historico')}>Histórico demonstrativo</button></Superficie> : cenario === 'fechado' ? <div className="cp-grade"><Abertura clinica={clinica.nome} confirmar={confirmar} onAberto={valor => { setFundo(valor); setMovimentos([]); setCenario('vazio'); setFeedback('Abertura confirmada pelo serviço sintético. Nenhuma operação real.')}} ocupado={ocupado} setOcupado={setOcupado} trocar={() => trocarClinica(clinicas.find(c => c.id !== clinicaId)!.id)} /><Historico /></div> : <>
          <section className="cp-barra"><div><span className="cp-status">{aberto ? '● Aberto' : cenario === 'devolvido' ? 'Correção solicitada' : 'Aguardando aprovação'}</span><strong>Caixa 024</strong><span>Ana · abertura 07:42</span></div><div className="cp-acoes">
            <details className="cp-outras"><summary className="cp-botao">Outras ações ▾</summary><div><button disabled={!aberto} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); iniciar('sangria') }}>Solicitar sangria</button><button disabled={!aberto} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); iniciar('suprimento') }}>Suprimento</button><button onClick={() => iniciar('historico')}>Histórico</button></div></details>
            <button className="cp-botao" disabled={cenario === 'aprovacao'} onClick={() => iniciar('fechamento')}>Conferir fechamento</button><button className="cp-botao cp-primario" disabled={!aberto} onClick={() => iniciar('receber')}>＋ Receber pagamento</button>
          </div></section>
          {cenario === 'devolvido' && <FeedbackAlert variant="warning" title="Contagem devolvida pela proprietária" description="Reconte as cédulas e informe a justificativa. Segunda tentativa preserva a anterior." />}
          {cenario === 'aprovacao' && <Superficie titulo="Fechamento enviado"><p>Dinheiro contado: R$ 418,00. Diferença: −R$ 2,00. Aguardando revisão.</p>{papel === 'proprietaria' ? <><button className="cp-botao" onClick={() => iniciar('fechamento')}>Revisar fechamento</button></> : <p>Somente a proprietária pode aprovar ou devolver.</p>}</Superficie>}
          <IndicadoresCaixa resumo={oficialSintetico} />{proposta && <div className="cp-indicador"><span>A receber hoje · proposta</span><strong>R$ 310,00</strong><small>Exemplo independente; fonte agregada não comprovada.</small></div>}
          <div className="cr-grade"><div className="cp-coluna">
            {proposta && <Superficie titulo="Recebimentos a resolver · proposta"><p className="cp-nota">Cobranças fictícias. Não representam contas a receber existentes.</p>{[['Luiza Exemplo', '220,00'], ['Rafael Exemplo', '90,00']].map(([nome, valor]) => <div className="cp-linha" key={nome}><div><strong>{nome}</strong><p>Consulta · R$ {valor}</p></div><button className="cp-botao" onClick={() => iniciar('receber')}>Ver demonstração</button></div>)}</Superficie>}
            <Superficie titulo="Movimentações deste caixa"><div className="cp-filtros"><label>Buscar movimentação<input placeholder="Paciente ou descrição" value={busca} onChange={e => { setBusca(e.target.value); setPagina(0) }} /></label><label>Forma<select value={filtro} onChange={e => { setFiltro(e.target.value); setPagina(0) }}><option>Todas as formas</option>{formas.map(f => <option key={f}>{f}</option>)}</select></label></div>
            {!visiveis.length ? <div className="cp-vazio"><strong>{movimentos.length ? 'Nenhum resultado para este filtro' : 'Nenhuma movimentação'}</strong><p>{movimentos.length ? 'Altere a busca ou a forma.' : 'Recebimentos, suprimentos, sangrias e estornos efetivados aparecerão aqui.'}</p></div> : <div className="cp-tabela"><table><thead><tr><th>Hora</th><th>Descrição</th><th>Forma</th><th>Valor</th><th>Detalhes</th></tr></thead><tbody>{visiveis.slice(pagina * 5, pagina * 5 + 5).map((m, i) => <tr key={`${m.id}-${i}`}><td>{m.hora}</td><td><strong>{m.descricao}</strong><small>{m.tipo === 'recebimento' ? 'Consulta · confirmado' : m.tipo}</small></td><td>{m.forma}</td><td className={m.valor < 0n ? 'cp-negativo' : ''}>{moeda(m.valor)}</td><td><button className="cp-botao" aria-label={`Detalhes de ${m.descricao}`} onClick={() => { setSelecionado(m); iniciar('detalhes') }}>Detalhes</button></td></tr>)}</tbody></table></div>}
            <div className="cp-paginacao"><span>{visiveis.length} movimentos · página {pagina + 1} de {Math.max(1, Math.ceil(visiveis.length / 5))}</span><button className="cp-botao" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</button><button className="cp-botao" disabled={(pagina + 1) * 5 >= visiveis.length} onClick={() => setPagina(p => p + 1)}>Próxima</button></div></Superficie>
          </div><div className="cr-lateral"><ComposicaoCaixa resumo={oficialSintetico} />{solicitacoes.length > 0 && <Superficie titulo="Solicitações simuladas">{solicitacoes.map((s, i) => <p key={i}>{s}</p>)}<p className="cp-nota">Solicitar não efetiva retirada ou devolução.</p></Superficie>}</div></div>
          </>}
        </Tabs.Panel>
        <Tabs.Panel value="estornos"><div className="cp-grade"><Superficie titulo="Solicitações de estorno"><p className="cp-nota">Somente a recepção solicita. A proprietária revisa e decide.</p><div className="cp-linha"><div><strong>EST003 · Luiza Exemplo</strong><p>R$ 50,00 · {estornoEstado} · 03/10/2026</p></div><button className="cp-botao" disabled={estornoEstado !== 'solicitado'} onClick={() => iniciar('estorno')}>{papel === 'proprietaria' ? 'Revisar solicitação' : 'Detalhes'}</button></div><h3>Localizar recebimento</h3><p>Exemplo de outra sessão na mesma clínica: REC018 · Caixa 023.</p><button className="cp-botao" disabled={papel !== 'recepcao' || estornoEstado !== 'solicitado' || solicitacoes.some(s => s.startsWith('Estorno solicitado'))} onClick={() => iniciar('estorno')}>Solicitar estorno</button></Superficie><Superficie titulo="Recebimento original preservado"><Linhas itens={[[ 'Recebido', 22000n ], ['Pix original', 12000n], ['Dinheiro original', 10000n], ['Reserva solicitada em dinheiro', estornoEstado === 'solicitado' ? 5000n : 0n], ['Estorno em dinheiro efetivado', estornoEstado === 'efetivado' ? 5000n : 0n], ['Disponível em dinheiro', estornoEstado === 'rejeitado' ? 10000n : solicitacoes.some(s => s.startsWith('Estorno solicitado')) ? 0n : 5000n]]}/><p>Não existe edição ou exclusão destrutiva.</p><p className="cp-nota">{estornoEstado === 'solicitado' ? 'A solicitação de R$ 50,00 ainda não representa devolução ao paciente.' : `Decisão ${estornoEstado} apenas no serviço sintético. Original preservado.`}</p></Superficie></div></Tabs.Panel>
        <Tabs.Panel value="fiscal"><FeedbackAlert variant="info" title="Emissão externa não configurada" description="Solicitações internas não são notas fiscais emitidas."/><div className="cp-grade"><Superficie titulo="Fiscal interno"><div className="cp-linha"><div><strong>FIS012 · Luiza Exemplo</strong><p>R$ 220,00 · emissão solicitada</p></div><span className="finance-status" data-tone="info">Solicitado</span></div><p>Clínica: {clinica.nome} · recebimento REC018</p></Superficie><Superficie titulo="Documento fiscal"><div className="cp-vazio"><strong>Nenhum documento vinculado</strong><p>Provedor e vínculo com arquivo externo dependem de contrato autorizado.</p></div><button className="cp-botao" disabled>Emitir externamente · indisponível</button></Superficie></div></Tabs.Panel>
        </>}
      </Tabs.Root>
      <p className="cp-nota">Demonstração em memória. Recarregar reinicia os dados. Histórico, recibos e cobranças incluem propostas identificadas.</p>
    </div>
    {fluxo && <ModalBase titulo={{ receber: 'Receber pagamento', fechamento: 'Conferir fechamento', sangria: 'Solicitar sangria', suprimento: 'Suprimento', historico: 'Histórico de caixas', detalhes: 'Detalhes da movimentação', estorno: 'Estorno de recebimento' }[fluxo]} subtitulo={`${clinica.nome} · Caixa 024 · dados fictícios`} onFechar={() => setFluxo(null)} ocupado={ocupado} apresentacao="painel">
      <FluxoCaixa key={`${clinicaId}-${fluxo}`} tipo={fluxo} total={total} selecionado={selecionado} clinica={clinica.nome} confirmar={confirmar} fechar={() => setFluxo(null)} recebido={recebido} ocupado={ocupado} setOcupado={setOcupado} papel={papel} estornoEstado={estornoEstado} saldoEstorno={solicitacoes.some(s => s.startsWith('Estorno solicitado')) ? 0n : 5000n} aguardando={cenario === 'aprovacao'} divergencia={cenario === 'divergencia'} trocar={() => trocarClinica(clinicas.find(c => c.id !== clinicaId)!.id)} concluir={(mensagem, valor) => {
        if (fluxo === 'suprimento') setMovimentos(m => [{ id: `SUP${m.length}`, hora: '11:30', descricao: 'Reforço de troco', forma: 'Dinheiro', valor: valor!, tipo: 'suprimento' }, ...m])
        if (fluxo === 'fechamento') setCenario(mensagem.includes('devolvido') ? 'devolvido' : mensagem.includes('aprovado') ? 'fechado' : 'aprovacao')
        if (fluxo === 'sangria' || fluxo === 'estorno') setSolicitacoes(s => [...s, mensagem])
        if (fluxo === 'estorno' && mensagem.includes('efetivado')) {
          setEstornoEstado('efetivado')
          setMovimentos(m => [{ id: 'EST003', hora: '11:40', descricao: 'Estorno REC018 · Caixa 023', forma: 'Dinheiro', valor: -5000n, tipo: 'estorno' }, ...m])
        }
        if (fluxo === 'estorno' && mensagem.includes('rejeitado')) setEstornoEstado('rejeitado')
        setFeedback(mensagem)
      }}/>
    </ModalBase>}
  </AppShell>
}

function Historico() { return <Superficie titulo="Histórico de caixas · proposta">{[['023', '02/10/2026', 'Fechado'], ['022', '01/10/2026', 'Em conferência'], ['021', '30/09/2026', 'Fechado']].map(([numero, data, estado]) => <details className="cp-historico" key={numero}><summary>Caixa {numero} · {estado}<small>{data}</small></summary><p>Abertura histórica R$ 150,00. Referência demonstrativa, nunca aplicada à nova abertura.</p></details>)}<p className="cp-nota">Leitura completa do histórico depende de adaptação paginada.</p></Superficie> }

function Abertura({ clinica, confirmar, onAberto, ocupado, setOcupado, trocar }: { clinica: string; confirmar: (c: string) => Promise<unknown>; onAberto: (v: bigint) => void; ocupado: boolean; setOcupado: (v: boolean) => void; trocar: () => void }) {
  const [valor, setValor] = useState(''); const [confirmacao, setConfirmacao] = useState(false); const [erro, setErro] = useState(''); const trava = useRef(false)
  async function enviar(e: FormEvent) { e.preventDefault(); if (trava.current) return; try { const v = centavos(valor); if (!confirmacao) throw new Error('Confirme a clínica e o valor contado.'); trava.current = true; setOcupado(true); await confirmar(`abertura:${v}`); onAberto(v) } catch (f) { setErro((f as Error).message) } finally { trava.current = false; setOcupado(false) } }
  return <Superficie titulo="Nenhum caixa aberto"><p>Conte o dinheiro físico disponível antes de informar o fundo inicial.</p><p className="cp-nota">Último fechamento demonstrativo: 02/10/2026 às 18:04. Valores históricos são apenas referência.</p><form onSubmit={enviar} className="cp-form"><Campo nome="Fundo inicial contado" valor={valor} onChange={v => { setValor(v); setConfirmacao(false) }}/><p>{clinica} · Operadora Ana · 03/10/2026</p><label className="cp-check"><input type="checkbox" checked={confirmacao} onChange={e => setConfirmacao(e.target.checked)} />Confirmo {clinica} e o fundo de {moeda(valorSeguro(valor))} após a contagem.</label>{erro && <FeedbackAlert title="Abertura não confirmada" description={erro} variant="destructive"/>}<button className="cp-botao cp-primario" disabled={ocupado || !valor || !confirmacao}>{ocupado ? 'Confirmando…' : `Abrir caixa com ${moeda(valorSeguro(valor))}`}</button><button type="button" className="cp-botao" onClick={trocar}>Simular mudança de clínica durante a abertura</button></form></Superficie>
}

function FluxoCaixa({ tipo, total, selecionado, clinica, confirmar, fechar, recebido, ocupado, setOcupado, concluir, papel, estornoEstado, saldoEstorno, aguardando, divergencia, trocar }: {
  tipo: Fluxo; total: ReturnType<typeof resumo>; selecionado: Movimento; clinica: string; confirmar: (c: string) => Promise<{referencia: string}>; fechar: () => void; recebido: (p: {forma: Forma; valor: bigint}[], nome: string, referencia: string) => void; ocupado: boolean; setOcupado: (v: boolean) => void; concluir: (mensagem: string, valor?: bigint) => void; papel: string; estornoEstado: string; saldoEstorno: bigint; aguardando: boolean; divergencia: boolean; trocar: () => void
}) {
  const [forma, setForma] = useState<Forma>('Pix'); const [dividido, setDividido] = useState(false); const [valores, setValores] = useState<Record<Forma, string>>({ Dinheiro: '100,00', Pix: '120,00', Crédito: '' })
  const [paciente, setPaciente] = useState('Luiza Exemplo'); const alvo = paciente === 'Luiza Exemplo' ? 22000n : 9000n
  const [entregue, setEntregue] = useState(''); const [valor, setValor] = useState(tipo === 'estorno' && papel === 'proprietaria' ? '50,00' : divergencia ? '418,00' : ''); const [motivo, setMotivo] = useState(tipo === 'estorno' && papel === 'proprietaria' ? 'Correção solicitada para conferência.' : ''); const [etapa, setEtapa] = useState(1); const [erro, setErro] = useState(''); const [sucesso, setSucesso] = useState(''); const [impressao, setImpressao] = useState(''); const [pixConferido, setPixConferido] = useState(false)
  const [decisao, setDecisao] = useState('aprovar'); const [referencia, setReferencia] = useState(''); const [finalizado, setFinalizado] = useState(false)
  const trava = useRef(false); const chave = useRef(crypto.randomUUID()); const registro = useRef<{referencia: string} | null>(null)
  const vigente = useRef(true)
  useEffect(() => () => { vigente.current = false }, [])
  const parcelas = dividido ? formas.filter(f => valorSeguro(valores[f]) > 0n).map(f => ({ forma: f, valor: valorSeguro(valores[f]) })) : [{ forma, valor: alvo }]
  const soma = parcelas.reduce((s, p) => s + p.valor, 0n), dinheiro = parcelas.find(p => p.forma === 'Dinheiro')?.valor ?? 0n
  const troco = valorSeguro(entregue) - dinheiro, diferenca = valorSeguro(valor) - total.esperado
  async function enviar(e: FormEvent) {
    e.preventDefault(); if (trava.current || registro.current || finalizado) return; setErro('')
    try {
      if (tipo === 'receber') {
        if (dividido) for (const f of formas) if (valores[f].trim()) centavos(valores[f])
        if (soma !== alvo) throw new Error('Distribua o valor integral da consulta. Não existe saldo para pagamento posterior.')
        if (dinheiro && (!entregue || centavos(entregue) < dinheiro)) throw new Error('Informe dinheiro entregue suficiente para a parcela em dinheiro.')
        if (parcelas.some(p => p.forma === 'Pix') && !pixConferido) throw new Error('Confirme que o Pix foi conferido antes de registrar.')
      } else if (tipo === 'fechamento') {
        if (aguardando) { if (decisao === 'devolver' && !motivo.trim()) throw new Error('Informe a orientação para correção.') }
        else { centavos(valor); if (etapa === 1) { setEtapa(2); return }; if (diferenca !== 0n && !motivo.trim()) throw new Error('Justifique a diferença da contagem.') }
      } else { const v = centavos(valor); if (v <= 0n) throw new Error('Informe um valor maior que zero.'); if (!motivo.trim()) throw new Error('Informe o motivo.'); if (tipo === 'estorno') { if (estornoEstado !== 'solicitado') throw new Error('Esta solicitação já foi decidida.'); if (papel === 'recepcao' && v > saldoEstorno) throw new Error('Saldo elegível em dinheiro insuficiente, após reservas anteriores.'); if (papel === 'proprietaria' && v !== 5000n) throw new Error('A revisão preserva o valor solicitado: R$ 50,00.'); if (papel === 'proprietaria' && decisao === 'aprovar' && v > total.esperado) throw new Error('Dinheiro insuficiente no caixa atual.'); }; if (tipo === 'sangria' && v > total.esperado) throw new Error('O valor excede o dinheiro esperado nesta demonstração.'); if (etapa === 1) { setEtapa(2); return } }
      trava.current = true; setOcupado(true)
      const resposta = await confirmar(chave.current)
      registro.current = resposta; setReferencia(resposta.referencia); setFinalizado(true)
      if (tipo === 'receber') { recebido(parcelas, paciente, resposta.referencia); setSucesso(`Recebimento de ${moeda(alvo)} confirmado pelo serviço sintético.`) }
      else { const msg = tipo === 'fechamento' ? aguardando ? `Fechamento ${decisao === 'aprovar' ? 'aprovado' : 'devolvido para correção'} no serviço sintético.` : 'Contagem enviada para aprovação no serviço sintético.' : tipo === 'sangria' ? `Sangria solicitada: ${moeda(valorSeguro(valor))}. Aguardando aprovação, sem retirada.` : tipo === 'estorno' && papel === 'proprietaria' ? (decisao === 'aprovar' ? 'Estorno EST003 efetivado no caixa atual pelo serviço sintético. Original preservado.' : 'Estorno EST003 rejeitado no serviço sintético. Original preservado.') : tipo === 'estorno' ? `Estorno solicitado: ${moeda(valorSeguro(valor))}. Sem devolução efetivada.` : `Suprimento de ${moeda(valorSeguro(valor))} confirmado pelo serviço sintético.`; concluir(msg, valorSeguro(valor)); setSucesso(msg) }
    } catch (f) { if (vigente.current) setErro((f as Error).message) } finally { trava.current = false; if (vigente.current) setOcupado(false) }
  }
  const imprimir = () => setImpressao(impressao ? 'Reimpressão simulada concluída. O recebimento não foi repetido.' : 'Impressão não concluída. O recebimento permanece registrado. Tente novamente.')
  if (tipo === 'historico') return <div className="cp-fluxo"><Historico/><button className="cp-botao" onClick={fechar}>Fechar histórico</button></div>
  if (tipo === 'detalhes') return <div className="cp-fluxo"><h3>{selecionado.descricao}</h3><p>{selecionado.id} · {selecionado.hora} · {clinica}</p><Linhas itens={[[ 'Valor registrado', selecionado.valor ]]}/><p>Forma: {selecionado.forma}. Registro original preservado.</p>{selecionado.tipo === 'recebimento' && <><p className="cp-nota">Recibo e impressão: proposta de novo contrato, simulação independente.</p><button className="cp-botao cp-primario" onClick={imprimir}>Imprimir recibo demonstrativo</button>{impressao && <FeedbackAlert title={impressao} variant="warning" action={<button className="cp-botao" onClick={imprimir}>Tentar impressão novamente</button>}/>}</>}<button className="cp-botao" onClick={fechar}>Fechar detalhes</button></div>
  return <form className="cp-fluxo" onSubmit={enviar}>
    {sucesso ? <><FeedbackAlert variant="success" title={sucesso}/>{tipo === 'receber' && <><p>{referencia} · {paciente} · {clinica}</p><Linhas itens={parcelas.map(p => [p.forma, p.valor])}/>{dinheiro > 0n && <Linhas itens={[[ 'Dinheiro entregue', valorSeguro(entregue) ], ['Troco devolvido', troco]]}/>}<p className="cp-nota">Recibo demonstrativo · proposta de contrato. Documentos fiscais são tratados no Fiscal.</p><button type="button" className="cp-botao cp-primario" onClick={imprimir}>Imprimir recibo demonstrativo</button>{impressao && <FeedbackAlert title={impressao} variant="warning" action={<button type="button" className="cp-botao" onClick={imprimir}>Tentar impressão novamente</button>}/>}</>}<button type="button" className="cp-botao" onClick={fechar}>Concluir demonstração</button></> : <>
    <fieldset disabled={ocupado} className="cp-campos">
    {tipo === 'receber' ? <>
      <div className="cp-origem"><label>Agendamento de origem<select value={paciente} onChange={e => { setPaciente(e.target.value); setDividido(false); setPixConferido(false); setEntregue('') }}><option>Luiza Exemplo</option><option>Rafael Exemplo</option></select></label><p>Consulta · Dra. Helena · 03/10/2026 às 11:20<br/>{clinica} · agendamento confirmado</p><strong>{moeda(alvo)}</strong><p className="cp-nota">Agendamento demonstrativo · preço somente leitura.</p></div>
      <h3>Forma de pagamento</h3><div className="cp-formas">{formas.map(f => <button type="button" className="cp-botao" aria-pressed={forma === f && !dividido} key={f} onClick={() => { setForma(f); setDividido(false); setPixConferido(false) }}>{f}</button>)}</div>
      <label className="cp-check"><input type="checkbox" checked={dividido} onChange={e => { setDividido(e.target.checked); setPixConferido(false) }}/>Dividir pagamento</label>
      {dividido && formas.map(f => <Campo key={f} nome={`${f} no pagamento`} valor={valores[f]} required={false} onChange={v => setValores(p => ({ ...p, [f]: v }))}/>)}
      {dinheiro > 0n && <><Campo nome="Dinheiro entregue pelo paciente" valor={entregue} onChange={setEntregue}/><div className="cp-total"><span>Troco a devolver</span><strong data-testid="troco">{moeda(troco > 0n ? troco : 0n)}</strong></div><p className="cp-nota">O troco não aumenta o valor registrado. Dinheiro entregue e troco são auxiliares demonstrativos, sem salvamento.</p></>}
      <Linhas itens={[[ 'Total distribuído', soma ], ['Restante', alvo - soma]]}/>
      {parcelas.some(p => p.forma === 'Pix') && <label className="cp-check"><input type="checkbox" checked={pixConferido} onChange={e => setPixConferido(e.target.checked)}/>Conferi o Pix externamente (demonstração)</label>}
    </> : tipo === 'fechamento' ? <>
      {aguardando ? <><Linhas itens={[[ 'Esperado', total.esperado ], ['Contado na tentativa', 41800n], ['Diferença', 41800n - total.esperado]]}/><p>Justificativa: diferença identificada na contagem.</p><label className="cp-campo">Decisão da proprietária<select value={decisao} onChange={e => setDecisao(e.target.value)}><option value="aprovar">Aprovar fechamento</option><option value="devolver">Devolver para correção</option></select></label><label className="cp-campo">Observação / orientação<textarea value={motivo} onChange={e => setMotivo(e.target.value)}/></label></> : <>
      <ol className="cp-etapas"><li aria-current={etapa === 1 ? 'step' : undefined}>1. Contagem física</li><li aria-current={etapa === 2 ? 'step' : undefined}>2. Revisão e envio</li></ol>
      {etapa === 1 ? <><p>Conte somente o dinheiro físico. O fluxo atual não possui contagem cega; esperado disponível no caixa.</p><Campo nome="Dinheiro físico contado" valor={valor} onChange={setValor}/></> : <><Linhas itens={[[ 'Dinheiro esperado', total.esperado ], ['Dinheiro contado', valorSeguro(valor)], ['Diferença', diferenca]]}/>{diferenca !== 0n && <><FeedbackAlert variant="warning" title="Revise a diferença antes de enviar"/><label className="cp-campo">Justificativa da diferença<textarea required value={motivo} maxLength={500} onChange={e => setMotivo(e.target.value)}/></label></>}<details><summary>Composição do dinheiro</summary><p>Fundo + recebimentos + suprimentos − sangrias − estornos em dinheiro. Nenhuma destinação automática.</p></details><h3>Registros eletrônicos</h3><Linhas itens={[[ 'Pix', total.pix ], ['Crédito', total.credito]]}/><FeedbackAlert title="Conferência externa não informada" description="Igualdade com o sistema não confirma conciliação bancária." variant="info"/></>}
      </>}
    </> : <>
      {tipo === 'estorno' && <><p><strong>REC018 · Luiza Exemplo · Caixa 023</strong><br/>Recebimento de outra sessão, na mesma clínica.</p><Linhas itens={[[ 'Dinheiro original', 10000n ], ['Reserva anterior solicitada', 5000n], ['Dinheiro elegível', 5000n]]}/><p>Forma original: dinheiro. Sem conversão para outra forma.</p></>}
      {tipo === 'estorno' && papel === 'proprietaria' && <label className="cp-campo">Decisão da proprietária<select value={decisao} onChange={e => setDecisao(e.target.value)}><option value="aprovar">Aprovar e efetivar</option><option value="rejeitar">Rejeitar</option></select></label>}
      {etapa === 1 ? <><Campo nome={tipo === 'estorno' ? 'Valor a estornar em dinheiro' : 'Valor'} valor={valor} onChange={setValor} disabled={tipo === 'estorno' && papel === 'proprietaria'}/><label className="cp-campo">Motivo<textarea required value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={500} readOnly={tipo === 'estorno' && papel === 'proprietaria'}/></label></> : <><h3>Revise {tipo === 'sangria' ? 'a solicitação' : 'os dados'}</h3><Linhas itens={[[ 'Valor', valorSeguro(valor) ], ['Dinheiro esperado antes', total.esperado], ['Projeção após efetivação', tipo === 'estorno' && papel === 'proprietaria' && decisao === 'rejeitar' ? total.esperado : tipo === 'suprimento' ? total.esperado + valorSeguro(valor) : total.esperado - valorSeguro(valor)]]}/><p>{motivo}</p><p className="cp-nota">{tipo === 'suprimento' ? 'Entrada para troco, separada da receita.' : 'Projeção apenas: solicitação não movimenta dinheiro. Aprovação depende da proprietária.'}</p></>}
    </>}
    </fieldset>
    {erro && <FeedbackAlert variant="destructive" title="Operação não confirmada" description={erro}/>}
    <p className="cp-nota">Todos os envios usam somente o serviço em memória.</p>
    <div className="cp-rodape"><button type="button" className="cp-botao" disabled={ocupado} onClick={etapa === 2 && !aguardando ? () => setEtapa(1) : fechar}>{etapa === 2 && !aguardando ? 'Voltar' : 'Cancelar'}</button><button className="cp-botao cp-primario" disabled={ocupado || (tipo === 'estorno' && estornoEstado !== 'solicitado') || (aguardando && papel !== 'proprietaria')}>{ocupado ? 'Confirmando…' : tipo === 'receber' ? `Registrar ${moeda(alvo)}` : tipo === 'fechamento' ? aguardando ? 'Confirmar decisão' : etapa === 1 ? 'Revisar contagem' : 'Enviar para aprovação' : etapa === 1 ? 'Revisar dados' : 'Confirmar simulação'}</button></div>
    <button type="button" className="cp-botao cp-contexto" onClick={trocar}>Simular mudança de clínica durante o formulário</button>
    </>}
  </form>
}

createRoot(document.getElementById('root')!).render(<ThemeProvider><Previa/></ThemeProvider>)

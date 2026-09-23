import { useCallback, useRef, useState, type FormEvent } from 'react'
import { ModalBase } from '../components/ModalBase'
import { useFinanceiroConsulta } from '../hooks/useFinanceiroConsulta'
import { invalidarFinanceiro } from '../lib/financeiro/financeiro.cache'
import { formatarDataFinanceira } from '../lib/financeiro/financeiro.date'
import { mensagemErroFinanceiro } from '../lib/financeiro/financeiro.errors'
import { listarDocumentosFiscais, type DocumentoFiscalOperacional } from '../lib/financeiro/financeiro.fiscal-leitura'
import { solicitarCancelamentoFiscal, solicitarEmissaoFiscal } from '../lib/financeiro/financeiro.fiscal'
import { idempotenciaFinanceira, type TentativaIdempotente } from '../lib/financeiro/financeiro.idempotency'
import type { StatusFiscal } from '../lib/financeiro/financeiro.types'

const card = 'rounded-[18px] border border-[var(--borda)] bg-[var(--fundo-card)] p-5 shadow-[var(--sombra-baixa)] sm:p-6'
const botao = 'min-h-11 rounded-lg border border-[var(--borda)] px-4 py-2 text-sm font-semibold focus-visible:outline-2 disabled:opacity-50'
const primario = 'min-h-11 rounded-lg bg-[var(--texto-principal)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50'
const campo = 'min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 text-[var(--texto-principal)] focus-visible:outline-2'
const nuncaVazio = () => false

const rotulos: Record<StatusFiscal, string> = {
  pendente: 'Pendente', emissao_solicitada: 'Emissão solicitada', emitida: 'Emitida', erro_emissao: 'Erro na emissão',
  cancelamento_solicitado: 'Cancelamento solicitado', cancelada: 'Cancelada', erro_cancelamento: 'Erro no cancelamento',
}
const rotulosTentativa = { solicitada: 'Solicitada', processando: 'Em processamento', sucesso: 'Concluída', erro: 'Erro interno' } as const

function DialogoFiscal({ documento, acao, clinicaId, usuarioId, onFechar, onConcluido }: {
  documento: DocumentoFiscalOperacional; acao: 'emissao' | 'cancelamento'; clinicaId: string; usuarioId: string;
  onFechar: () => void; onConcluido: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const tentativa = useRef<TentativaIdempotente | null>(null)
  const trava = useRef(false)
  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (trava.current) return
    if (acao === 'cancelamento' && !motivo.trim()) { setErro('Informe o motivo do cancelamento.'); return }
    trava.current = true
    setOcupado(true)
    setEnviado(true)
    setErro(null)
    try {
      if (!tentativa.current) tentativa.current = idempotenciaFinanceira.iniciar(`fiscal:${acao}:${usuarioId}:${clinicaId}:${documento.id}`)
      if (acao === 'emissao') await solicitarEmissaoFiscal({ documentoFiscalId: documento.id, tentativa: tentativa.current })
      else await solicitarCancelamentoFiscal({ documentoFiscalId: documento.id, motivo, tentativa: tentativa.current })
      try { idempotenciaFinanceira.concluir(tentativa.current) } catch { /* solicitação bancária já concluída */ }
      invalidarFinanceiro('fiscal', clinicaId)
      onConcluido()
    } catch (falha) { setErro(mensagemErroFinanceiro(falha)) }
    finally { trava.current = false; setOcupado(false) }
  }
  function fechar() {
    if (ocupado) return
    if (tentativa.current) idempotenciaFinanceira.cancelar(tentativa.current)
    onFechar()
  }
  return <ModalBase titulo={acao === 'emissao' ? 'Solicitar emissão fiscal' : 'Solicitar cancelamento fiscal'} largura="lg" ocupado={ocupado} onFechar={fechar}>
    <form onSubmit={enviar} className="space-y-4">
      <p className="text-sm">{documento.paciente} · estado atual: {rotulos[documento.status]}</p>
      <p className="rounded-lg bg-[var(--cor-alerta-suave)] p-3 text-sm">Esta ação registra apenas uma solicitação interna. Não emite nem cancela nota na prefeitura ou em provedor externo.</p>
      {acao === 'cancelamento' && <label className="block text-sm font-medium">Motivo do cancelamento
        <textarea className={`${campo} mt-1 py-2`} rows={3} maxLength={1000} required disabled={ocupado || enviado}
          value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>}
      {erro && <p role="alert" className="text-sm text-[var(--cor-erro)]">{erro}</p>}
      {enviado && erro && <p className="text-xs text-[var(--texto-secundario)]">A mesma solicitação e chave foram preservadas para repetição segura.</p>}
      <div className="flex justify-end gap-2"><button type="button" className={botao} disabled={ocupado} onClick={fechar}>Cancelar</button>
        <button type="submit" className={primario} disabled={ocupado}>{ocupado ? 'Processando…' : enviado ? 'Tentar novamente' : 'Confirmar solicitação'}</button></div>
    </form>
  </ModalBase>
}

export default function FinanceiroFiscal({ clinicaId, usuarioId }: { clinicaId: string; usuarioId: string }) {
  const [pagina, setPagina] = useState(0)
  const [status, setStatus] = useState<'todos' | StatusFiscal>('todos')
  const [selecionado, setSelecionado] = useState<{ documento: DocumentoFiscalOperacional; acao: 'emissao' | 'cancelamento' } | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const carregar = useCallback(() => listarDocumentosFiscais(clinicaId, pagina, status), [clinicaId, pagina, status])
  const consulta = useFinanceiroConsulta(`${clinicaId}:${pagina}:${status}`, carregar, nuncaVazio, { clinicaId, leitura: 'fiscal' })
  const dados = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  return <div className="space-y-6">
    <header><h1 className="texto-titulo-tela">Fiscal interno</h1><p className="mt-1 text-sm text-[var(--texto-secundario)]">Acompanhe documentos e registre solicitações. Integração com emissor externo ainda não está configurada.</p></header>
    <div className={`${card} flex flex-wrap items-end gap-3`}><label className="text-sm font-medium">Situação
      <select className={`${campo} mt-1 block`} value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPagina(0) }}>
        <option value="todos">Todas</option>{Object.entries(rotulos).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
      </select></label><button type="button" className={botao} onClick={() => void consulta.recarregar()}>Atualizar</button></div>
    {sucesso && <p role="status" className="rounded-lg bg-[var(--cor-sucesso-suave)] p-3 text-sm">{sucesso}</p>}
    {consulta.resultado.estado === 'carregando' && <p role="status" className={card}>Carregando documentos fiscais…</p>}
    {consulta.resultado.estado === 'erro' && <div role="alert" className={card}><p>{consulta.resultado.erro.message}</p><button type="button" className={`${botao} mt-3`} onClick={() => void consulta.recarregar()}>Tentar novamente</button></div>}
    {dados && <section className={card}><h2 className="texto-titulo-secao">Documentos da clínica</h2>
      {!dados.itens.length ? <p className="mt-3 text-sm text-[var(--texto-secundario)]">Nenhum documento nesta seleção.</p> :
        <ul className="mt-3 divide-y divide-[var(--borda)]">{dados.itens.map((documento) => <li key={documento.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div><p className="font-medium">{documento.paciente} · {rotulos[documento.status]}</p>
            <p className="text-sm text-[var(--texto-secundario)]">Atualizado {formatarDataFinanceira(documento.updated_at)}</p>
            {documento.ultima_tentativa && <p className="text-xs text-[var(--texto-secundario)]">Última tentativa de {documento.ultima_tentativa.tipo === 'emissao' ? 'emissão' : 'cancelamento'}: {rotulosTentativa[documento.ultima_tentativa.status]} · {formatarDataFinanceira(documento.ultima_tentativa.finalizado_em ?? documento.ultima_tentativa.created_at)}</p>}
            {(documento.status === 'erro_emissao' || documento.status === 'erro_cancelamento') && <p className="text-xs text-[var(--cor-erro)]">Falha interna registrada. Consulte a equipe responsável antes de repetir.</p>}
            {documento.numero_documento && <p className="text-xs text-[var(--texto-secundario)]">Número {documento.numero_documento}{documento.serie ? ` · série ${documento.serie}` : ''}</p>}</div>
          {(documento.status === 'pendente' || documento.status === 'erro_emissao') &&
            <button type="button" className={botao} onClick={() => setSelecionado({ documento, acao: 'emissao' })}>Solicitar emissão</button>}
          {(documento.status === 'emitida' || documento.status === 'erro_cancelamento') &&
            <button type="button" className={botao} onClick={() => setSelecionado({ documento, acao: 'cancelamento' })}>Solicitar cancelamento</button>}
        </li>)}</ul>}
      <div className="mt-4 flex items-center justify-between gap-2"><button type="button" className={botao} disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span className="text-sm text-[var(--texto-secundario)]">Página {pagina + 1}</span>
        <button type="button" className={botao} disabled={!dados.haMais} onClick={() => setPagina((p) => p + 1)}>Próxima</button></div>
    </section>}
    {selecionado && <DialogoFiscal documento={selecionado.documento} acao={selecionado.acao} clinicaId={clinicaId} usuarioId={usuarioId}
      onFechar={() => setSelecionado(null)} onConcluido={() => { setSelecionado(null); setSucesso('Solicitação fiscal registrada; emissão/cancelamento externo ainda pendente.'); void consulta.recarregar() }} />}
  </div>
}

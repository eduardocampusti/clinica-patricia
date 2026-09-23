import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import type { Papel } from '../hooks/usePapelNaClinica'
import { carregarDashboardProfissional, carregarDashboardProprietaria } from '../lib/financeiro/financeiro.dashboard'
import { intervaloPorDias, TIMEZONE_FINANCEIRO_PADRAO } from '../lib/financeiro/financeiro.date'
import { mensagemErroFinanceiro } from '../lib/financeiro/financeiro.errors'
import { montarRelatorioFinanceiro, type RelatoriosColetados } from '../lib/financeiro/financeiro.relatorios-apresentacao'
import {
  coletarFiscalProprietaria, coletarRecebimentosProfissional, coletarRecebimentosProprietaria,
  coletarRepassesProfissional, coletarRepassesProprietaria, gerarPdfFinanceiroSobDemanda,
  gerarXlsxFinanceiroSobDemanda, registrarSolicitacaoExportacao,
} from '../lib/financeiro/financeiro.relatorios'
import { FORMAS_PAGAMENTO, STATUS_FISCAL, STATUS_RECEBIMENTO, STATUS_REPASSE,
  type FormaPagamento, type ModoRelatorioRepasse, type StatusFiscal, type StatusRecebimento,
  type StatusRepasse } from '../lib/financeiro/financeiro.types'

type PapelRelatorio = Extract<Papel, 'proprietaria' | 'medico'>
type Dataset = 'consolidado' | 'recebimentos' | 'repasses' | 'fiscal'
type FiltroNome = { id: string; nome: string }
const card = 'rounded-[18px] border border-[var(--borda)] bg-[var(--fundo-card)] p-5 shadow-[var(--sombra-baixa)] sm:p-6'
const campo = 'min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 text-[var(--texto-principal)] focus-visible:outline-2'
const botao = 'min-h-11 rounded-lg border border-[var(--borda)] px-4 py-2 text-sm font-semibold focus-visible:outline-2 disabled:opacity-50'
const principal = 'min-h-11 rounded-lg bg-[var(--texto-principal)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50'
const rotulo = (valor: string) => valor.replaceAll('_', ' ')

function hojeBahia(): string {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE_FINANCEIRO_PADRAO,
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const campoData = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? ''
  return `${campoData('year')}-${campoData('month')}-${campoData('day')}`
}

function haTrintaDias(): string {
  const [ano, mes, dia] = hojeBahia().split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia - 29)).toISOString().slice(0, 10)
}

function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export default function FinanceiroRelatorios({ clinicaId, papel }: { clinicaId: string; papel: PapelRelatorio }) {
  const proprietaria = papel === 'proprietaria'
  const [dataset, setDataset] = useState<Dataset>('consolidado')
  const [inicio, setInicio] = useState(haTrintaDias)
  const [fim, setFim] = useState(hojeBahia)
  const [todasClinicas, setTodasClinicas] = useState(false)
  const [buscaProfissional, setBuscaProfissional] = useState('')
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [profissionais, setProfissionais] = useState<FiltroNome[]>([])
  const [pacientes, setPacientes] = useState<FiltroNome[]>([])
  const [profissionalId, setProfissionalId] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [forma, setForma] = useState<'' | FormaPagamento>('')
  const [statusRecebimento, setStatusRecebimento] = useState<'' | StatusRecebimento>('')
  const [statusRepasse, setStatusRepasse] = useState<'' | StatusRepasse>('')
  const [statusFiscal, setStatusFiscal] = useState<'' | StatusFiscal>('')
  const [modoRepasse, setModoRepasse] = useState<ModoRelatorioRepasse>('gerados_periodo')
  const [ocupado, setOcupado] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erroOpcoes, setErroOpcoes] = useState<string | null>(null)
  const controle = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!proprietaria || todasClinicas) { setProfissionais([]); setPacientes([]); return }
    let ativo = true
    const timer = window.setTimeout(async () => {
      try {
        const { supabase } = await import('../lib/supabase')
        const [resProf, resPac] = await Promise.all([
          supabase.from('profissionais').select('id,nome_completo,profissionais_clinicas!inner(clinica_id)')
            .eq('profissionais_clinicas.clinica_id', clinicaId).ilike('nome_completo', `%${buscaProfissional}%`)
            .order('nome_completo').limit(30),
          supabase.from('pacientes').select('id,nome_completo').eq('clinica_id', clinicaId)
            .ilike('nome_completo', `%${buscaPaciente}%`).order('nome_completo').limit(30),
        ])
        if (resProf.error) throw resProf.error
        if (resPac.error) throw resPac.error
        if (ativo) {
          setProfissionais((resProf.data ?? []).map((item) => ({ id: item.id, nome: item.nome_completo })))
          setPacientes((resPac.data ?? []).map((item) => ({ id: item.id, nome: item.nome_completo })))
          setErroOpcoes(null)
        }
      } catch { if (ativo) setErroOpcoes('Não foi possível carregar nomes para os filtros. Tente novamente.') }
    }, 250)
    return () => { ativo = false; window.clearTimeout(timer) }
  }, [proprietaria, todasClinicas, clinicaId, buscaProfissional, buscaPaciente])

  function mudarTodas(ativo: boolean) {
    setTodasClinicas(ativo)
    if (ativo) { setProfissionalId(''); setPacienteId(''); setBuscaProfissional(''); setBuscaPaciente('') }
  }

  async function gerar(evento: SyntheticEvent, formato: 'pdf' | 'xlsx') {
    evento.preventDefault()
    if (ocupado) return
    const abortador = new AbortController()
    controle.current = abortador
    setOcupado(true); setErro(null); setSucesso(null); setProgresso('Validando filtros…')
    try {
      const intervalo = intervaloPorDias(inicio, fim)
      const clinicaFiltro = todasClinicas ? null : clinicaId
      const publico = proprietaria ? 'proprietaria' : 'profissional'
      const datasetAuditoria = proprietaria ? (dataset === 'consolidado' ? 'financeiro_consolidado' : dataset) : 'financeiro_profissional'
      const usarRecebimentos = dataset === 'consolidado' || dataset === 'recebimentos'
      const usarRepasses = dataset === 'consolidado' || dataset === 'repasses'
      const usarFiscal = proprietaria && (dataset === 'consolidado' || dataset === 'fiscal')
      const filtroProfissional = proprietaria && !todasClinicas && profissionalId ? profissionalId : null
      const filtroPaciente = proprietaria && !todasClinicas && pacienteId ? pacienteId : null
      const filtroStatusRepasse = modoRepasse === 'gerados_periodo' && statusRepasse ? statusRepasse : null
      const filtrosAuditoria: Record<string, string | boolean | null> = {
        timezone: intervalo.timezone, clinica_filtrada: !todasClinicas,
        profissional_filtrado: !!filtroProfissional, paciente_filtrado: !!filtroPaciente,
        forma_pagamento: usarRecebimentos || usarFiscal ? forma || null : null,
        status_recebimento: usarRecebimentos || usarFiscal ? statusRecebimento || null : null,
        status_repasse: usarRepasses ? filtroStatusRepasse : null,
        status_fiscal: usarRecebimentos || usarFiscal ? statusFiscal || null : null,
        modo_repasse: usarRepasses ? modoRepasse : null,
      }
      setProgresso('Registrando solicitação de exportação…')
      await registrarSolicitacaoExportacao({ publico, dataset: datasetAuditoria, formato,
        inicio: intervalo.inicio, fim: intervalo.fim, clinicaId: clinicaFiltro, filtros: filtrosAuditoria })
      if (abortador.signal.aborted) throw new Error('Exportação cancelada. Nenhum arquivo foi gerado.')
      const coletados: RelatoriosColetados = {}
      const opcoes = (nome: string) => ({ sinal: abortador.signal, aoProgredir: (n: number, total: number | null) =>
        setProgresso(`${nome}: ${n}${total === null ? '' : ` de ${total}`} registros carregados`) })
      if (usarRecebimentos) coletados.recebimentos = proprietaria
        ? await coletarRecebimentosProprietaria(intervalo, { clinicaId: clinicaFiltro,
          profissionalId: filtroProfissional, pacienteId: filtroPaciente, formaPagamento: forma || null,
          statusRecebimento: statusRecebimento || null, statusFiscal: statusFiscal || null }, opcoes('Recebimentos'))
        : await coletarRecebimentosProfissional(intervalo, { clinicaId: clinicaFiltro,
          formaPagamento: forma || null, statusRecebimento: statusRecebimento || null }, opcoes('Recebimentos'))
      if (usarRepasses) coletados.repasses = proprietaria
        ? await coletarRepassesProprietaria(intervalo, { clinicaId: clinicaFiltro,
          profissionalId: filtroProfissional, statusRepasse: filtroStatusRepasse, evento: modoRepasse }, opcoes('Repasses'))
        : await coletarRepassesProfissional(intervalo, { clinicaId: clinicaFiltro,
          statusRepasse: filtroStatusRepasse, evento: modoRepasse }, opcoes('Repasses'))
      if (usarFiscal) coletados.fiscal = await coletarFiscalProprietaria(intervalo, { clinicaId: clinicaFiltro,
        profissionalId: filtroProfissional, pacienteId: filtroPaciente, formaPagamento: forma || null,
        statusRecebimento: statusRecebimento || null, statusFiscal: statusFiscal || null }, opcoes('Fiscal'))
      if (abortador.signal.aborted) throw new Error('Exportação cancelada. Nenhum arquivo foi gerado.')
      const dashboard = dataset === 'consolidado' ? (proprietaria
        ? await carregarDashboardProprietaria(intervalo, { clinicaId: clinicaFiltro,
          profissionalId: filtroProfissional, pacienteId: filtroPaciente, formaPagamento: forma || null,
          statusRecebimento: statusRecebimento || null, statusRepasse: filtroStatusRepasse,
          statusFiscal: statusFiscal || null })
        : await carregarDashboardProfissional(intervalo, clinicaFiltro)) : undefined
      if (abortador.signal.aborted) throw new Error('Exportação cancelada. Nenhum arquivo foi gerado.')
      const filtrosVisiveis = [`Período: ${inicio} a ${fim}`, `Clínicas: ${todasClinicas ? 'todas autorizadas' : 'selecionada'}`,
        ...(filtroProfissional ? [`Profissional: ${profissionais.find((p) => p.id === filtroProfissional)?.nome ?? 'selecionado'}`] : []),
        ...(filtroPaciente ? [`Paciente: ${pacientes.find((p) => p.id === filtroPaciente)?.nome ?? 'selecionado'}`] : []),
        ...(forma && (usarRecebimentos || usarFiscal) ? [`Forma: ${rotulo(forma)}`] : []),
        ...(statusRecebimento && (usarRecebimentos || usarFiscal) ? [`Recebimento: ${rotulo(statusRecebimento)}`] : []),
        ...(statusFiscal && (usarRecebimentos || usarFiscal) ? [`Fiscal: ${rotulo(statusFiscal)}`] : []),
        ...(usarRepasses ? [`Repasses: ${rotulo(modoRepasse)}`] : []),
        ...(filtroStatusRepasse && usarRepasses ? [`Estado do repasse: ${rotulo(filtroStatusRepasse)}`] : [])]
      const relatorio = montarRelatorioFinanceiro({
        titulo: `Relatório financeiro · ${dataset === 'consolidado' ? 'consolidado' : dataset}`,
        publico, inicio: intervalo.inicio, fim: intervalo.fim, timezone: intervalo.timezone,
        clinicas: [todasClinicas ? 'Clínicas autorizadas' : 'Clínica selecionada'],
        filtros: filtrosVisiveis, coletados, dashboard,
      })
      setProgresso(`Gerando ${formato.toUpperCase()}…`)
      const blob = formato === 'pdf' ? await gerarPdfFinanceiroSobDemanda(relatorio)
        : await gerarXlsxFinanceiroSobDemanda(relatorio)
      if (abortador.signal.aborted) throw new Error('Exportação cancelada. Nenhum arquivo foi gerado.')
      const { nomeArquivoRelatorio } = await import('../lib/financeiroRelatorios')
      baixar(blob, nomeArquivoRelatorio(`financeiro_${dataset}`, formato))
      setSucesso(`Arquivo ${formato.toUpperCase()} preparado para download. A auditoria registra a solicitação, não a conclusão do download.`)
    } catch (falha) { setErro(mensagemErroFinanceiro(falha)) }
    finally { if (controle.current === abortador) controle.current = null; setOcupado(false); setProgresso('') }
  }

  return <div className="space-y-6">
    <header><h1 className="texto-titulo-tela">Relatórios financeiros</h1>
      <p className="mt-1 text-sm text-[var(--texto-secundario)]">Dados oficiais paginados, revalidados e reconciliados antes do arquivo. O download ocorre somente neste navegador.</p></header>
    <form className={`${card} space-y-5`} onSubmit={(e) => void gerar(e, 'pdf')}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">Relatório<select className={`${campo} mt-1`} value={dataset} disabled={ocupado}
          onChange={(e) => setDataset(e.target.value as Dataset)}>
          <option value="consolidado">{proprietaria ? 'Consolidado financeiro' : 'Meu financeiro'}</option>
          <option value="recebimentos">Recebimentos</option><option value="repasses">Repasses</option>
          {proprietaria && <option value="fiscal">Fiscal interno</option>}
        </select></label>
        <label className="text-sm font-medium">De<input type="date" className={`${campo} mt-1`} value={inicio} onChange={(e) => setInicio(e.target.value)} required disabled={ocupado} /></label>
        <label className="text-sm font-medium">Até<input type="date" className={`${campo} mt-1`} value={fim} onChange={(e) => setFim(e.target.value)} required disabled={ocupado} /></label>
        <label className="flex min-h-11 items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={todasClinicas} onChange={(e) => mudarTodas(e.target.checked)} disabled={ocupado} />Todas as minhas clínicas</label>
      </div>
      {proprietaria && !todasClinicas && <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="text-sm font-medium">Buscar profissional<input className={`${campo} mt-1`} value={buscaProfissional} onChange={(e) => setBuscaProfissional(e.target.value)} disabled={ocupado} /></label>
          <label className="mt-2 block text-sm font-medium">Profissional<select className={`${campo} mt-1`} value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} disabled={ocupado}>
            <option value="">Todos</option>{profissionais.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select></label></div>
        <div><label className="text-sm font-medium">Buscar paciente<input className={`${campo} mt-1`} value={buscaPaciente} onChange={(e) => setBuscaPaciente(e.target.value)} disabled={ocupado} /></label>
          <label className="mt-2 block text-sm font-medium">Paciente<select className={`${campo} mt-1`} value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} disabled={ocupado}>
            <option value="">Todos</option>{pacientes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select></label></div>
        <p className="text-xs text-[var(--texto-terciario)] sm:col-span-2">A busca mostra até 30 nomes por vez na clínica selecionada; refine o texto para localizar outro nome. Para todas as clínicas, os filtros por pessoa ficam indisponíveis.</p>
        {erroOpcoes && <p role="alert" className="text-sm text-[var(--cor-erro)] sm:col-span-2">{erroOpcoes}</p>}
      </div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(dataset === 'consolidado' || dataset === 'recebimentos' || dataset === 'fiscal') && <>
          <label className="text-sm font-medium">Forma<select className={`${campo} mt-1`} value={forma} onChange={(e) => setForma(e.target.value as typeof forma)} disabled={ocupado}>
            <option value="">Todas</option>{FORMAS_PAGAMENTO.map((item) => <option key={item} value={item}>{rotulo(item)}</option>)}
          </select></label>
          <label className="text-sm font-medium">Status do recebimento<select className={`${campo} mt-1`} value={statusRecebimento} onChange={(e) => setStatusRecebimento(e.target.value as typeof statusRecebimento)} disabled={ocupado}>
            <option value="">Todos</option>{STATUS_RECEBIMENTO.map((item) => <option key={item} value={item}>{rotulo(item)}</option>)}
          </select></label>
          {proprietaria && <label className="text-sm font-medium">Status fiscal<select className={`${campo} mt-1`} value={statusFiscal} onChange={(e) => setStatusFiscal(e.target.value as typeof statusFiscal)} disabled={ocupado}>
            <option value="">Todos</option>{STATUS_FISCAL.map((item) => <option key={item} value={item}>{rotulo(item)}</option>)}
          </select></label>}
        </>}
        {(dataset === 'consolidado' || dataset === 'repasses') && <>
          <label className="text-sm font-medium">Modo de repasse<select className={`${campo} mt-1`} value={modoRepasse} onChange={(e) => { setModoRepasse(e.target.value as ModoRelatorioRepasse); setStatusRepasse('') }} disabled={ocupado}>
            <option value="gerados_periodo">Gerados no período</option><option value="pagos_periodo">Pagos no período</option><option value="pendentes_atuais">Pendentes agora</option>
          </select></label>
          {modoRepasse === 'gerados_periodo' && <label className="text-sm font-medium">Status do repasse<select className={`${campo} mt-1`} value={statusRepasse} onChange={(e) => setStatusRepasse(e.target.value as typeof statusRepasse)} disabled={ocupado}>
            <option value="">Todos</option>{STATUS_REPASSE.map((item) => <option key={item} value={item}>{rotulo(item)}</option>)}
          </select></label>}
        </>}
      </div>
      <p className="text-xs text-[var(--texto-terciario)]">Período inclusivo em Bahia; o banco recebe o começo do dia seguinte como limite exclusivo. “Pendentes agora” é posição atual, sem filtro pela data de geração.</p>
      <div className="flex flex-wrap gap-2"><button type="submit" className={principal} disabled={ocupado}>Gerar PDF</button>
        <button type="button" className={botao} disabled={ocupado} onClick={(e) => void gerar(e, 'xlsx')}>Gerar Excel</button>
        {ocupado && <button type="button" className={botao} onClick={() => controle.current?.abort()}>Cancelar exportação</button>}
      </div>
    </form>
    {progresso && <p role="status" className={card}>{progresso}</p>}
    {erro && <p role="alert" className={`${card} text-[var(--cor-erro)]`}>{erro}</p>}
    {sucesso && <p role="status" className={`${card} text-[var(--cor-sucesso)]`}>{sucesso}</p>}
  </div>
}

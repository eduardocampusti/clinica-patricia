import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import writeXlsxFile, {
  type CellObject,
  type Sheet,
  type SheetData,
} from 'write-excel-file/universal'

export type TipoCelulaRelatorio =
  | 'texto'
  | 'inteiro'
  | 'monetario'
  | 'percentual'
  | 'data_hora'
  | 'status'

export type ValorRelatorio = string | number | Date | null

export interface ColunaRelatorio {
  chave: string
  titulo: string
  tipo: TipoCelulaRelatorio
  largura?: number
}

export interface MetricaRelatorio {
  rotulo: string
  valor: ValorRelatorio
  tipo: TipoCelulaRelatorio
}

export interface SecaoRelatorio {
  nomeAba: string
  titulo: string
  colunas: ColunaRelatorio[]
  linhas: Array<Record<string, ValorRelatorio>>
}

export interface RelatorioFinanceiro {
  titulo: string
  publico: 'proprietaria' | 'profissional'
  periodoInicio: string
  periodoFim: string
  timezone: string
  geradoEm: string
  clinicas: string[]
  filtros: string[]
  metricas: MetricaRelatorio[]
  secoes: SecaoRelatorio[]
  observacoes?: string[]
}

export interface OpcoesRelatorio {
  nomeOrganizacao?: string
  logoDataUrl?: string
}

const CORES = {
  primaria: '#5B3479',
  secundaria: '#F0E7F6',
  texto: '#2D2433',
  textoSuave: '#6B6270',
  borda: '#D9CFDF',
  branco: '#FFFFFF',
} as const

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Bahia',
  dateStyle: 'short',
  timeStyle: 'short',
})

function numeroSeguro(valor: ValorRelatorio): number {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) throw new Error('Valor numérico inválido no relatório.')
    return valor
  }
  if (typeof valor !== 'string' || !/^-?\d{1,12}(\.\d{1,2})?$/.test(valor)) {
    throw new Error('Valor decimal inválido no relatório.')
  }
  const resultado = Number(valor)
  if (!Number.isFinite(resultado)) throw new Error('Valor decimal fora do intervalo seguro.')
  return resultado
}

function dataSegura(valor: ValorRelatorio): Date {
  const resultado = valor instanceof Date ? valor : new Date(String(valor))
  if (Number.isNaN(resultado.getTime())) throw new Error('Data inválida no relatório.')
  return resultado
}

function statusLegivel(valor: ValorRelatorio): string {
  if (valor === null) return 'Não informado'
  return String(valor)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase())
}

export function formatarValorRelatorio(
  valor: ValorRelatorio,
  tipo: TipoCelulaRelatorio,
  timezone = 'America/Bahia',
): string {
  if (valor === null || valor === '') return '—'
  if (tipo === 'monetario') return moeda.format(numeroSeguro(valor))
  if (tipo === 'inteiro') return numero.format(numeroSeguro(valor))
  if (tipo === 'percentual') return `${numero.format(numeroSeguro(valor))}%`
  if (tipo === 'status') return statusLegivel(valor)
  if (tipo === 'data_hora') {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(dataSegura(valor))
  }
  return String(valor)
}

export function validarRelatorioFinanceiro(relatorio: RelatorioFinanceiro): void {
  if (!relatorio.titulo.trim()) throw new Error('Título do relatório é obrigatório.')
  if (!relatorio.timezone.trim()) throw new Error('Timezone do relatório é obrigatório.')
  dataSegura(relatorio.periodoInicio)
  dataSegura(relatorio.periodoFim)
  dataSegura(relatorio.geradoEm)
  if (relatorio.secoes.length === 0) throw new Error('Relatório deve possuir ao menos uma seção.')

  for (const metrica of relatorio.metricas) {
    formatarValorRelatorio(metrica.valor, metrica.tipo, relatorio.timezone)
  }
  for (const secao of relatorio.secoes) {
    if (!secao.nomeAba.trim() || secao.nomeAba.length > 31) {
      throw new Error('Nome de aba inválido no relatório.')
    }
    if (secao.colunas.length === 0) throw new Error(`Seção ${secao.titulo} sem colunas.`)
    for (const coluna of secao.colunas) {
      if (/\b(uuid|id técnico|cpf)\b/i.test(coluna.titulo)) {
        throw new Error(`Coluna sensível ou técnica não permitida: ${coluna.titulo}.`)
      }
    }
    for (const linha of secao.linhas) {
      for (const coluna of secao.colunas) {
        formatarValorRelatorio(linha[coluna.chave] ?? null, coluna.tipo, relatorio.timezone)
      }
    }
  }
}

function desenharCabecalhoRodape(
  doc: jsPDF,
  relatorio: RelatorioFinanceiro,
  opcoes: OpcoesRelatorio,
): void {
  const paginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina)
    doc.setDrawColor(CORES.borda)
    doc.line(12, 12, 285, 12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(CORES.primaria)
    doc.text(opcoes.nomeOrganizacao ?? 'Clínica Patrícia', 12, 9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(CORES.textoSuave)
    doc.text(`Gerado em ${dataHora.format(dataSegura(relatorio.geradoEm))}`, 285, 9, {
      align: 'right',
    })
    doc.line(12, 198, 285, 198)
    doc.text(`Página ${pagina} de ${paginas}`, 285, 202, { align: 'right' })
    doc.text('Valores consolidados pelo banco. Documento sem dados clínicos.', 12, 202)
  }
}

export function gerarRelatorioFinanceiroPdf(
  relatorio: RelatorioFinanceiro,
  opcoes: OpcoesRelatorio = {},
): Blob {
  validarRelatorioFinanceiro(relatorio)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  if (opcoes.logoDataUrl) {
    doc.addImage(opcoes.logoDataUrl, 'PNG', 12, 17, 25, 12, undefined, 'FAST')
  }
  const inicioTitulo = opcoes.logoDataUrl ? 42 : 12
  doc.setTextColor(CORES.primaria)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(relatorio.titulo, inicioTitulo, 23)
  doc.setTextColor(CORES.textoSuave)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    `Período: ${formatarValorRelatorio(relatorio.periodoInicio, 'data_hora', relatorio.timezone)} até ${formatarValorRelatorio(relatorio.periodoFim, 'data_hora', relatorio.timezone)} (fim exclusivo)`,
    inicioTitulo,
    29,
  )
  doc.text(`Clínicas: ${relatorio.clinicas.join(', ') || 'Consolidado autorizado'}`, inicioTitulo, 34)
  doc.text(`Filtros: ${relatorio.filtros.join(' | ') || 'Nenhum filtro adicional'}`, inicioTitulo, 39)

  let y = 47
  const larguraCard = 52
  relatorio.metricas.forEach((metrica, indice) => {
    const x = 12 + (indice % 5) * 55
    if (indice > 0 && indice % 5 === 0) y += 19
    doc.setFillColor(CORES.secundaria)
    doc.roundedRect(x, y, larguraCard, 15, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(CORES.textoSuave)
    doc.text(metrica.rotulo, x + 3, y + 5)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(CORES.primaria)
    doc.text(
      formatarValorRelatorio(metrica.valor, metrica.tipo, relatorio.timezone),
      x + 3,
      y + 12,
    )
    doc.setFont('helvetica', 'normal')
  })
  y += 23

  for (const secao of relatorio.secoes) {
    if (y > 174) {
      doc.addPage()
      y = 20
    }
    doc.setTextColor(CORES.primaria)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(secao.titulo, 12, y)
    doc.setFont('helvetica', 'normal')
    y += 3

    if (secao.linhas.length === 0) {
      doc.setFillColor('#F7F4F8')
      doc.roundedRect(12, y + 2, 273, 14, 2, 2, 'F')
      doc.setTextColor(CORES.textoSuave)
      doc.setFontSize(9)
      doc.text('Sem dados para os filtros selecionados.', 16, y + 11)
      y += 23
      continue
    }

    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12, top: 18, bottom: 14 },
      head: [secao.colunas.map((coluna) => coluna.titulo)],
      body: secao.linhas.map((linha) =>
        secao.colunas.map((coluna) =>
          formatarValorRelatorio(linha[coluna.chave] ?? null, coluna.tipo, relatorio.timezone),
        ),
      ),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 1.7,
        textColor: CORES.texto,
        lineColor: CORES.borda,
        lineWidth: 0.1,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: CORES.primaria,
        textColor: CORES.branco,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: '#FAF8FB' },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9
  }

  if (relatorio.observacoes?.length) {
    if (y > 180) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(CORES.primaria)
    doc.text('Observações', 12, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(CORES.textoSuave)
    relatorio.observacoes.forEach((observacao, indice) => {
      doc.text(`• ${observacao}`, 14, y + 6 + indice * 5)
    })
  }

  desenharCabecalhoRodape(doc, relatorio, opcoes)
  return doc.output('blob')
}

function celulaXlsx(valor: ValorRelatorio, tipo: TipoCelulaRelatorio): CellObject {
  if (valor === null || valor === '') return { value: '' }
  if (tipo === 'monetario') {
    return { value: numeroSeguro(valor), type: Number, format: 'R$ #,##0.00', align: 'right' }
  }
  if (tipo === 'percentual') {
    return { value: numeroSeguro(valor) / 100, type: Number, format: '0.00%', align: 'right' }
  }
  if (tipo === 'inteiro') {
    return { value: numeroSeguro(valor), type: Number, format: '#,##0', align: 'right' }
  }
  if (tipo === 'data_hora') {
    return { value: dataSegura(valor), type: Date, format: 'dd/mm/yyyy hh:mm', align: 'center' }
  }
  if (tipo === 'status') return { value: statusLegivel(valor), type: String }
  return { value: String(valor), type: String }
}

function cabecalho(titulo: string): CellObject {
  return {
    value: titulo,
    type: String,
    fontWeight: 'bold',
    textColor: CORES.branco,
    backgroundColor: CORES.primaria,
    borderColor: CORES.primaria,
    borderStyle: 'thin',
    alignVertical: 'center',
    wrap: true,
  }
}

function planilhaResumo(relatorio: RelatorioFinanceiro): SheetData {
  const largura = 4
  const linhas: SheetData = [
    [{
      value: relatorio.titulo,
      type: String,
      fontWeight: 'bold',
      fontSize: 18,
      textColor: CORES.primaria,
      columnSpan: largura,
      height: 28,
      alignVertical: 'center',
    }],
    [{ value: 'Período', fontWeight: 'bold' }, {
      value: `${formatarValorRelatorio(relatorio.periodoInicio, 'data_hora', relatorio.timezone)} até ${formatarValorRelatorio(relatorio.periodoFim, 'data_hora', relatorio.timezone)} (fim exclusivo)`,
      columnSpan: 3,
    }],
    [{ value: 'Clínicas', fontWeight: 'bold' }, { value: relatorio.clinicas.join(', ') || 'Consolidado autorizado', columnSpan: 3 }],
    [{ value: 'Filtros', fontWeight: 'bold' }, { value: relatorio.filtros.join(' | ') || 'Nenhum filtro adicional', columnSpan: 3 }],
    [],
    [cabecalho('Indicador'), cabecalho('Valor'), cabecalho('Tipo'), cabecalho('Fonte')],
  ]
  for (const metrica of relatorio.metricas) {
    linhas.push([
      { value: metrica.rotulo, type: String },
      celulaXlsx(metrica.valor, metrica.tipo),
      { value: metrica.tipo, type: String },
      { value: 'Supabase / snapshots financeiros', type: String },
    ])
  }
  linhas.push([])
  linhas.push([{ value: 'Observações', fontWeight: 'bold', textColor: CORES.primaria, columnSpan: largura }])
  for (const observacao of relatorio.observacoes ?? []) {
    linhas.push([{ value: observacao, type: String, columnSpan: largura, wrap: true }])
  }
  return linhas
}

function planilhaDetalhe(secao: SecaoRelatorio): SheetData {
  const linhas: SheetData = [
    [{
      value: secao.titulo,
      type: String,
      fontWeight: 'bold',
      fontSize: 15,
      textColor: CORES.primaria,
      columnSpan: secao.colunas.length,
      height: 24,
    }],
    secao.colunas.map((coluna) => cabecalho(coluna.titulo)),
  ]
  if (secao.linhas.length === 0) {
    linhas.push([{ value: 'Sem dados para os filtros selecionados.', columnSpan: secao.colunas.length }])
    return linhas
  }
  secao.linhas.forEach((linha, indice) => {
    linhas.push(secao.colunas.map((coluna) => ({
      ...celulaXlsx(linha[coluna.chave] ?? null, coluna.tipo),
      backgroundColor: indice % 2 === 1 ? '#FAF8FB' : CORES.branco,
      borderColor: CORES.borda,
      borderStyle: 'thin' as const,
      alignVertical: 'center' as const,
      wrap: true,
    })))
  })
  return linhas
}

export async function gerarRelatorioFinanceiroXlsx(
  relatorio: RelatorioFinanceiro,
): Promise<Blob> {
  validarRelatorioFinanceiro(relatorio)
  const folhas: Sheet<Blob>[] = [
    {
      sheet: 'Resumo',
      data: planilhaResumo(relatorio),
      columns: [{ width: 28 }, { width: 24 }, { width: 20 }, { width: 34 }],
      stickyRowsCount: 1,
      showGridLines: false,
      zoomScale: 1,
    },
    ...relatorio.secoes.map((secao) => ({
      sheet: secao.nomeAba,
      data: planilhaDetalhe(secao),
      columns: secao.colunas.map((coluna) => ({ width: coluna.largura ?? 18 })),
      stickyRowsCount: 2,
      showGridLines: false,
      orientation: 'landscape' as const,
      zoomScale: 0.9,
    })),
  ]
  return writeXlsxFile(folhas, { fontFamily: 'Arial', fontSize: 10 }).toBlob()
}

export function nomeArquivoRelatorio(
  prefixo: string,
  formato: 'pdf' | 'xlsx',
  agora = new Date(),
): string {
  const carimbo = agora.toISOString().slice(0, 19).replaceAll(/[-:T]/g, '')
  const nomeSeguro = prefixo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 80)
  const base = nomeSeguro || 'RELATORIO_FINANCEIRO'
  return `${base}_${carimbo}.${formato}`
}

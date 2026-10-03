import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import {
  gerarRelatorioFinanceiroPdf,
  gerarRelatorioFinanceiroXlsx,
  nomeArquivoRelatorio,
  type RelatorioFinanceiro,
} from '../src/lib/financeiroRelatorios.ts'
import { reconciliarRelatorioDetalhado } from '../src/lib/financeiroRelatoriosReconciliacao.ts'

const saida = resolve('scratch', 'fase9-relatorios')
const caminhoPdf = resolve(saida, 'RELATORIO_FINANCEIRO_EXEMPLO_SINTETICO.pdf')
const caminhoXlsx = resolve(saida, 'RELATORIO_FINANCEIRO_EXEMPLO_SINTETICO.xlsx')

const recebimentos = Array.from({ length: 48 }, (_, indice) => {
  const numero = String(indice + 1).padStart(3, '0')
  const comEstorno = indice % 12 === 0
  const dinheiro = indice === 0 ? '100.00' : indice % 2 === 0 ? '250.00' : '0.00'
  const pix = indice === 0 ? '150.00' : indice % 2 === 1 ? '250.00' : '0.00'
  return {
    data: new Date(Date.UTC(2026, 8, 1 + Math.floor(indice / 3), 12 + (indice % 3), 0)),
    clinica: indice === 0 ? '../CLINICA/"TESTE"' : indice % 2 === 0 ? 'Clínica Centro - Sintética' : 'Clínica Unidade 2 - Sintética',
    paciente: indice === 0 ? '=1+1'
      : indice === 1 ? '+SUM(A1:A2)'
        : indice === 2 ? '-1+1'
          : indice === 3 ? '@TESTE'
            : indice === 4 ? '+CMD|\' /C calc\'!A0'
              : `Paciente Sintético ${numero}`,
    profissional: indice === 0 ? '<script>alert(1)</script>' : indice % 2 === 0 ? 'Dra. Exemplo A' : 'Dr. Exemplo B',
    forma: indice === 0 ? 'Dinheiro + PIX' : indice % 2 === 0 ? 'Dinheiro' : 'PIX',
    status: comEstorno ? 'parcialmente_estornado' : 'confirmado',
    bruto: '250.00',
    clinicaValor: '50.00',
    profissionalValor: '200.00',
    estornado: comEstorno ? '25.00' : '0.00',
    liquido: comEstorno ? '225.00' : '250.00',
    dinheiro,
    pix,
    cartaoCredito: '0.00',
  }
})

const relatorio: RelatorioFinanceiro = {
  titulo: 'Relatório financeiro consolidado - Exemplo sintético',
  publico: 'proprietaria',
  periodoInicio: '2026-09-01T00:00:00-03:00',
  periodoFim: '2026-10-01T00:00:00-03:00',
  timezone: 'America/Bahia',
  geradoEm: '2026-09-22T00:30:00-03:00',
  clinicas: ['Clínica Centro - Sintética', 'Clínica Unidade 2 - Sintética'],
  filtros: ['Período mensal', 'Todas as formas', 'Todos os estados'],
  metricas: [
    { rotulo: 'Recebimentos', valor: 48, tipo: 'inteiro' },
    { rotulo: 'Valor bruto', valor: '12000.00', tipo: 'monetario' },
    { rotulo: 'Parte da clínica', valor: '2400.00', tipo: 'monetario' },
    { rotulo: 'Parte profissional', valor: '9600.00', tipo: 'monetario' },
    { rotulo: 'Estornos', valor: '100.00', tipo: 'monetario' },
    { rotulo: 'Líquido atual', valor: '11900.00', tipo: 'monetario' },
    { rotulo: 'Dinheiro', valor: '5950.00', tipo: 'monetario' },
    { rotulo: 'PIX', valor: '6150.00', tipo: 'monetario' },
    { rotulo: 'Repasses pagos', valor: '9520.00', tipo: 'monetario' },
  ],
  secoes: [
    {
      nomeAba: 'Recebimentos',
      titulo: 'Recebimentos detalhados',
      colunas: [
        { chave: 'data', titulo: 'Data/hora', tipo: 'data_hora', largura: 19 },
        { chave: 'clinica', titulo: 'Clínica', tipo: 'texto', largura: 28 },
        { chave: 'paciente', titulo: 'Paciente', tipo: 'texto', largura: 25 },
        { chave: 'profissional', titulo: 'Profissional', tipo: 'texto', largura: 23 },
        { chave: 'forma', titulo: 'Forma', tipo: 'texto', largura: 14 },
        { chave: 'dinheiro', titulo: 'Dinheiro', tipo: 'monetario', largura: 15 },
        { chave: 'pix', titulo: 'PIX', tipo: 'monetario', largura: 15 },
        { chave: 'cartaoCredito', titulo: 'Cartão', tipo: 'monetario', largura: 15 },
        { chave: 'status', titulo: 'Status', tipo: 'status', largura: 23 },
        { chave: 'bruto', titulo: 'Bruto', tipo: 'monetario', largura: 16 },
        { chave: 'clinicaValor', titulo: 'Clínica', tipo: 'monetario', largura: 16 },
        { chave: 'profissionalValor', titulo: 'Profissional', tipo: 'monetario', largura: 16 },
        { chave: 'estornado', titulo: 'Estornado', tipo: 'monetario', largura: 16 },
        { chave: 'liquido', titulo: 'Líquido atual', tipo: 'monetario', largura: 17 },
      ],
      linhas: recebimentos,
    },
    {
      nomeAba: 'Repasses',
      titulo: 'Repasses do período',
      colunas: [
        { chave: 'data', titulo: 'Gerado em', tipo: 'data_hora', largura: 20 },
        { chave: 'clinica', titulo: 'Clínica', tipo: 'texto', largura: 28 },
        { chave: 'profissional', titulo: 'Profissional', tipo: 'texto', largura: 24 },
        { chave: 'status', titulo: 'Status', tipo: 'status', largura: 15 },
        { chave: 'bruto', titulo: 'Bruto profissional', tipo: 'monetario', largura: 20 },
        { chave: 'estornos', titulo: 'Estornos', tipo: 'monetario', largura: 16 },
        { chave: 'ajustes', titulo: 'Ajustes', tipo: 'monetario', largura: 16 },
        { chave: 'liquido', titulo: 'Líquido', tipo: 'monetario', largura: 16 },
      ],
      linhas: [
        { data: '2026-09-21T18:00:00-03:00', clinica: 'Clínica Centro - Sintética', profissional: 'Dra. Exemplo A', status: 'pago', bruto: '2400.00', estornos: '20.00', ajustes: '0.00', liquido: '2380.00' },
        { data: '2026-09-20T18:00:00-03:00', clinica: 'Clínica Unidade 2 - Sintética', profissional: 'Dr. Exemplo B', status: 'pago', bruto: '2400.00', estornos: '20.00', ajustes: '0.00', liquido: '2380.00' },
        { data: '2026-09-19T18:00:00-03:00', clinica: 'Clínica Centro - Sintética', profissional: 'Dra. Exemplo A', status: 'pago', bruto: '2400.00', estornos: '20.00', ajustes: '0.00', liquido: '2380.00' },
        { data: '2026-09-18T18:00:00-03:00', clinica: 'Clínica Unidade 2 - Sintética', profissional: 'Dr. Exemplo B', status: 'pago', bruto: '2400.00', estornos: '20.00', ajustes: '0.00', liquido: '2380.00' },
      ],
    },
    {
      nomeAba: 'Fiscal',
      titulo: 'Situação fiscal',
      colunas: [
        { chave: 'data', titulo: 'Recebimento', tipo: 'data_hora', largura: 20 },
        { chave: 'clinica', titulo: 'Clínica', tipo: 'texto', largura: 28 },
        { chave: 'paciente', titulo: 'Paciente', tipo: 'texto', largura: 25 },
        { chave: 'profissional', titulo: 'Profissional', tipo: 'texto', largura: 24 },
        { chave: 'valor', titulo: 'Valor', tipo: 'monetario', largura: 16 },
        { chave: 'status', titulo: 'Status fiscal', tipo: 'status', largura: 27 },
        { chave: 'numero', titulo: 'Número do documento', tipo: 'texto', largura: 22 },
      ],
      linhas: [
        ['pendente', 'emissao_solicitada', 'emitida', 'erro_emissao', 'cancelamento_solicitado', 'cancelada', 'erro_cancelamento'].map((status, indice) => ({
          data: new Date(Date.UTC(2026, 8, 15 + indice, 14, 0)),
          clinica: indice % 2 === 0 ? 'Clínica Centro - Sintética' : 'Clínica Unidade 2 - Sintética',
          paciente: `Paciente Fiscal Sintético ${indice + 1}`,
          profissional: indice % 2 === 0 ? 'Dra. Exemplo A' : 'Dr. Exemplo B',
          valor: '250.00',
          status,
          numero: status === 'emitida' || status === 'cancelada' ? `SINT-${1000 + indice}` : null,
        })),
      ].flat(),
    },
  ],
  observacoes: [
    'Dados exclusivamente sintéticos. Nenhum dado real de paciente ou operação foi utilizado.',
    'Valores e totais foram recebidos como snapshots do banco; os geradores apenas formatam a apresentação.',
    'O fim do período é exclusivo e a timezone do relatório é America/Bahia.',
    '@SUM(A1:A2), <script>alert("teste")</script> e =HYPERLINK("https://invalid.example") devem permanecer texto literal.',
  ],
}

const nomeHostil = nomeArquivoRelatorio('../=PACIENTE "Teste" <script>', 'xlsx', new Date('2026-09-22T03:00:00Z'))
if (!/^[A-Z0-9_-]+\.xlsx$/.test(nomeHostil) || nomeHostil.includes('..')) {
  throw new Error(`Nome de arquivo não foi sanitizado: ${nomeHostil}`)
}

const recebimentoSplit = [{
  valor_bruto: '500.00', valor_clinica: '100.00', valor_profissional: '400.00',
  valor_estornado: '100.00', valor_clinica_liquida: '80.00', valor_profissional_liquido: '320.00',
  valor_liquido_atual: '400.00', dinheiro: '200.00', pix: '300.00', cartao_credito: '0.00',
}]
const totaisSplit = {
  quantidade: 1, bruto: '500.00', clinica_bruta: '100.00', profissional_bruta: '400.00',
  estornado: '100.00', clinica_liquida: '80.00', profissional_liquida: '320.00',
  liquido_atual: '400.00', dinheiro: '200.00', pix: '300.00', cartao_credito: '0.00',
}
reconciliarRelatorioDetalhado('recebimentos', recebimentoSplit, totaisSplit)
assert.throws(
  () => reconciliarRelatorioDetalhado('recebimentos', recebimentoSplit, { ...totaisSplit, bruto: '500.01' }),
  /Reconciliação do relatório falhou/,
)

await mkdir(saida, { recursive: true })
const pdf = gerarRelatorioFinanceiroPdf(relatorio, { nomeOrganizacao: 'Clínica Patrícia' })
const xlsx = await gerarRelatorioFinanceiroXlsx(relatorio)
const pdfBytes = Buffer.from(await pdf.arrayBuffer())
const xlsxBytes = Buffer.from(await xlsx.arrayBuffer())

if (pdfBytes.subarray(0, 4).toString('ascii') !== '%PDF') throw new Error('Assinatura PDF inválida.')
if (xlsxBytes.subarray(0, 2).toString('ascii') !== 'PK') throw new Error('Contêiner XLSX inválido.')

await writeFile(caminhoPdf, pdfBytes)
await writeFile(caminhoXlsx, xlsxBytes)

process.stdout.write(JSON.stringify({ caminhoPdf, caminhoXlsx, pdfBytes: pdfBytes.length, xlsxBytes: xlsxBytes.length }))

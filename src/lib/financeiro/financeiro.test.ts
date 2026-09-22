import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { carregarDashboardProfissional } from './financeiro.dashboard'
import { consultarResumoCaixa } from './financeiro.caixa-leitura'
import { mapearErroFinanceiro } from './financeiro.errors'
import { GerenciadorIdempotencia, type ArmazenamentoChaves } from './financeiro.idempotency'
import {
  centavosParaDecimal,
  pagamentosFechamValor,
  textoMonetarioParaCentavos,
} from './financeiro.money'
import { registrarRecebimento } from './financeiro.recebimentos'
import { PARAMETROS_RPC_FINANCEIRO, validarParametrosRpc, type ExecutorRpcFinanceiro } from './financeiro.rpc'
import { pertenceAoIntervalo, validarIntervaloFinanceiro } from './financeiro.date'
import { coletarRelatorioCompleto, type ExecutorRelatorio } from '../financeiroRelatoriosRpc'

class Memoria implements ArmazenamentoChaves {
  readonly dados = new Map<string, string>()
  getItem(chave: string): string | null { return this.dados.get(chave) ?? null }
  setItem(chave: string, valor: string): void { this.dados.set(chave, valor) }
  removeItem(chave: string): void { this.dados.delete(chave) }
}

test('dinheiro usa centavos inteiros e aceita entrada pt-BR', () => {
  assert.equal(textoMonetarioParaCentavos('R$ 1.234,56'), 123456n)
  assert.equal(textoMonetarioParaCentavos('1234.56'), 123456n)
  assert.equal(centavosParaDecimal(-105n), '-1.05')
  assert.equal(pagamentosFechamValor([
    { formaPagamento: 'dinheiro', valorCentavos: 20000n },
    { formaPagamento: 'pix', valorCentavos: 30000n },
  ], 50000n), true)
  assert.throws(() => textoMonetarioParaCentavos('10,999'))
})

test('intervalo financeiro respeita [inicio, fim) e exige offset', () => {
  const intervalo = validarIntervaloFinanceiro({
    inicio: '2026-09-22T00:00:00-03:00',
    fim: '2026-09-23T00:00:00-03:00',
    timezone: 'America/Bahia',
  })
  assert.equal(pertenceAoIntervalo(intervalo.inicio, intervalo), true)
  assert.equal(pertenceAoIntervalo(intervalo.fim, intervalo), false)
  assert.throws(() => validarIntervaloFinanceiro({ ...intervalo, inicio: '2026-09-22T00:00:00' }))
})

test('erro RPC é sanitizado sem SQLSTATE, constraint ou UUID', () => {
  const erro = mapearErroFinanceiro({
    code: '42501',
    message: 'Usuario sem permissao para esta clinica constraint xyz 00000000-0000-0000-0000-000000000000',
  })
  assert.equal(erro.codigo, 'clinica_nao_autorizada')
  assert.equal(erro.message, 'Você não tem autorização para operar nesta clínica.')
  assert.doesNotMatch(erro.message, /42501|constraint|00000000/)
})

test('idempotência reutiliza a chave na mesma intenção até conclusão', () => {
  const memoria = new Memoria()
  let sequencia = 0
  const gerenciador = new GerenciadorIdempotencia(memoria, () => `chave-${++sequencia}`)
  const primeira = gerenciador.iniciar('recebimento:agendamento-1')
  const retry = gerenciador.iniciar('recebimento:agendamento-1')
  assert.equal(retry.chave, primeira.chave)
  gerenciador.concluir(primeira)
  assert.notEqual(gerenciador.iniciar('recebimento:agendamento-1').chave, primeira.chave)
})

test('wrapper de recebimento envia apenas agendamento, componentes e mesma chave', async () => {
  let chamada: { nome: string; parametros: Record<string, unknown> } | null = null
  const executor: ExecutorRpcFinanceiro = async (nome, parametros) => {
    chamada = { nome, parametros }
    return {
      data: {
        recebimento_id: 'r', agendamento_id: 'a', clinica_id: 'c', paciente_id: 'p',
        profissional_id: 'm', sessao_caixa_id: 's', valor_bruto: '500.00',
        percentual_clinica: '20.00', valor_clinica: '100.00', valor_profissional: '400.00',
        status: 'confirmado', pagamentos: [], status_fiscal: 'pendente',
        registrado_em: '2026-09-22T10:00:00-03:00', nova_operacao: true,
      },
      error: null,
    }
  }
  await registrarRecebimento({
    agendamentoId: 'a',
    tentativa: { intencao: 'recebimento:a', chave: 'idem-a' },
    pagamentos: [
      { formaPagamento: 'dinheiro', valorCentavos: 20000n },
      { formaPagamento: 'pix', valorCentavos: 30000n },
    ],
  }, executor)
  assert.deepEqual(chamada, {
    nome: 'financeiro_registrar_recebimento',
    parametros: {
      p_agendamento_id: 'a',
      p_pagamentos: [
        { forma_pagamento: 'dinheiro', valor: 200 },
        { forma_pagamento: 'pix', valor: 300 },
      ],
      p_idempotency_key: 'idem-a',
    },
  })
})

test('dashboard médico nunca envia profissional_id ou papel', async () => {
  let parametrosRecebidos: Record<string, unknown> = {}
  const executor: ExecutorRpcFinanceiro = async (_nome, parametros) => {
    parametrosRecebidos = parametros
    return {
      data: {
        versao: 1, inicio: parametros.p_inicio, fim: parametros.p_fim,
        timezone_series: parametros.p_timezone, clinicas_autorizadas: [],
        consultado_em: '2026-09-22T10:00:00-03:00', escopos: {}, resumo: {},
      },
      error: null,
    }
  }
  await carregarDashboardProfissional({
    inicio: '2026-09-01T00:00:00-03:00', fim: '2026-10-01T00:00:00-03:00',
    timezone: 'America/Bahia',
  }, null, executor)
  assert.equal('p_profissional_id' in parametrosRecebidos, false)
  assert.equal('p_papel' in parametrosRecebidos, false)
})

test('resumo do caixa usa somente o identificador da sessão na RPC oficial', async () => {
  let chamada: { nome: string; parametros: Record<string, unknown> } | null = null
  const executor: ExecutorRpcFinanceiro = async (nome, parametros) => {
    chamada = { nome, parametros }
    return { data: {
      sessao_caixa_id: 'sessao', clinica_id: 'clinica', clinica_nome: 'Clínica',
      status: 'aberto', aberto_em: '2026-09-22T10:00:00-03:00', aberto_por_nome: 'Recepção',
      resumo: { valor_abertura: 150.5, total_dinheiro: 200, total_pix: 300,
        total_cartao_credito: 0, total_recebimentos_brutos: 500,
        total_suprimentos: 0, total_sangrias: 0, total_estornos_dinheiro: 0,
        valor_esperado: 350.5, total_clinica: 100, total_profissionais: 400 },
    }, error: null }
  }
  const resultado = await consultarResumoCaixa('sessao', executor)
  assert.deepEqual(chamada, { nome: 'financeiro_resumo_caixa', parametros: { p_sessao_caixa_id: 'sessao' } })
  assert.equal(resultado.resumo.valor_esperado, 350.5)
})

test('allowlist de RPC rejeita parâmetro inexistente', () => {
  assert.throws(() => validarParametrosRpc('financeiro_dashboard_profissional', {
    p_inicio: 'x', p_fim: 'y', p_profissional_id: 'indevido',
  }), /Parâmetro não homologado/)
})

test('contratos frontend coincidem com as assinaturas finais das migrations aplicadas', () => {
  const diretorio = join(process.cwd(), 'supabase', 'migrations')
  const assinaturas = new Map<string, string[]>()
  for (const arquivo of readdirSync(diretorio).filter((nome) => /^2026092[12].*\.sql$/.test(nome)).sort()) {
    const sql = readFileSync(join(diretorio, arquivo), 'utf8')
    const regex = /^create(?:\s+or\s+replace)?\s+function\s+public\.(financeiro_[a-z0-9_]+)\s*\((.*?)\)\s*returns/gims
    for (const correspondencia of sql.matchAll(regex)) {
      const parametros = [...correspondencia[2].matchAll(/\b(p_[a-z0-9_]+)\s+[a-z]/gi)].map((item) => item[1])
      assinaturas.set(correspondencia[1], parametros)
    }
  }
  for (const [nome, parametros] of Object.entries(PARAMETROS_RPC_FINANCEIRO)) {
    assert.deepEqual(assinaturas.get(nome), [...parametros], `Assinatura divergente: ${nome}`)
  }
})

function pagina(
  itens: Array<Record<string, unknown>>,
  temMais: boolean,
  cursor: Record<string, string> | null,
  marcador = 'marcador-1',
) {
  return {
    versao: 1, dataset: 'recebimentos', publico: 'proprietaria',
    inicio: '2026-09-01T03:00:00Z', fim: '2026-10-01T03:00:00Z',
    timezone: 'America/Bahia', contexto: 'contexto-1', marcador,
    itens,
    totais: {
      quantidade: 2, bruto: '0.00', clinica_bruta: '0.00', profissional_bruta: '0.00',
      estornado: '0.00', clinica_liquida: '0.00', profissional_liquida: '0.00',
      liquido_atual: '0.00', dinheiro: '0.00', pix: '0.00', cartao_credito: '0.00',
    },
    pagina: { limite: 1, quantidade: itens.length, tem_mais: temMais, proximo_cursor: cursor },
  }
}

const itemRecebimentoZero = {
  valor_bruto: '0.00', valor_clinica: '0.00', valor_profissional: '0.00',
  valor_estornado: '0.00', valor_clinica_liquida: '0.00', valor_profissional_liquido: '0.00',
  valor_liquido_atual: '0.00', dinheiro: '0.00', pix: '0.00', cartao_credito: '0.00',
}

test('paginação usa cursor, revalida e reconcilia total completo', async () => {
  let chamada = 0
  const executor: ExecutorRelatorio = async (_rpc, parametros) => {
    chamada += 1
    if (chamada === 1) return { data: pagina([itemRecebimentoZero], true, { data: 'd', id: 'i', contexto: 'contexto-1' }), error: null }
    if (chamada === 2) {
      assert.equal(parametros.p_cursor_contexto, 'contexto-1')
      return { data: pagina([itemRecebimentoZero], false, null), error: null }
    }
    return { data: pagina([itemRecebimentoZero], true, { data: 'd', id: 'i', contexto: 'contexto-1' }), error: null }
  }
  const resultado = await coletarRelatorioCompleto('financeiro_relatorio_recebimentos_proprietaria', {}, {
    limitePagina: 1, executorRpc: executor,
  })
  assert.equal(resultado.itens.length, 2)
  assert.equal(resultado.paginasCarregadas, 2)
  assert.equal(chamada, 3)
})

test('drift de marcador cancela coleta paginada', async () => {
  let chamada = 0
  const executor: ExecutorRelatorio = async () => {
    chamada += 1
    return {
      data: chamada === 1
        ? pagina([itemRecebimentoZero], true, { data: 'd', id: 'i', contexto: 'contexto-1' })
        : pagina([itemRecebimentoZero], false, null, 'mudou'),
      error: null,
    }
  }
  await assert.rejects(
    coletarRelatorioCompleto('financeiro_relatorio_recebimentos_proprietaria', {}, {
      limitePagina: 1, executorRpc: executor,
    }),
    /dados financeiros mudaram/i,
  )
})

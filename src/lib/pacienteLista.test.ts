import assert from 'node:assert/strict'
import test from 'node:test'
import { FILTROS_PACIENTES_INICIAIS as vazio, correspondeAosFiltros, filtrosAtivosPacientes, hojeNaBahia, ordenarPacientes, padraoBuscaNome, removerFiltroPaciente, respostaCompletaPacientes, restricoesPacientes, resumoFiltrosPacientes, validarFiltrosPacientes, type PacienteOrdenavel } from './pacienteLista'

const pessoas: PacienteOrdenavel[] = [
  { id: '4', nome_completo: 'Zélia Modelo', data_nascimento: null, created_at: null },
  { id: '2', nome_completo: 'Álvaro Exemplo', data_nascimento: '2000-09-27', created_at: '2026-01-02T03:00:00Z' },
  { id: '1', nome_completo: 'alvaro exemplo', data_nascimento: '2000-09-26', created_at: '2026-01-01T03:00:00Z' },
  { id: '3', nome_completo: 'Beatriz Modelo', data_nascimento: '2010-06-01', created_at: '2026-01-03T03:00:00Z' },
]

test('remoção individual relaxa somente o critério escolhido e não altera o original', () => {
  const original = { inicio: '2026-01-01', fim: '2026-01-03', idadeMin: '20', idadeMax: '30', nascimento: 'informado' as const }
  for (const { campo } of filtrosAtivosPacientes(original)) {
    const resultado = removerFiltroPaciente(original, campo)
    assert.equal(resultado[campo], vazio[campo])
    for (const outro of Object.keys(original) as (keyof typeof original)[]) if (outro !== campo) assert.equal(resultado[outro], original[outro])
    assert.equal(validarFiltrosPacientes(resultado), null)
    assert.equal(filtrosAtivosPacientes(original).length, 5)
  }
})
test('seis ordenações pt-BR, desempate por ID, datas completas e nulos no fim', () => {
  const esperados = { nome_asc: '1234', nome_desc: '4312', cadastro_desc: '3214', cadastro_asc: '1234', nascimento_desc: '3214', nascimento_asc: '1234' } as const
  for (const ordem of Object.keys(esperados) as (keyof typeof esperados)[]) {
    assert.equal(ordenarPacientes(pessoas, ordem).map((p) => p.id).join(''), esperados[ordem])
  }
  assert.equal(pessoas[0].id, '4', 'não altera o array nem os nomes originais')
  assert.equal(ordenarPacientes([{ ...pessoas[0], created_at: 'inválida' }, ...pessoas.slice(1)], 'cadastro_asc').at(-1)?.id, '4')
})
test('faixa etária usa aniversário e não dias / 365, incluindo zero e bissexto', () => {
  const filtrar = (data: string | null, min: string, max: string, hoje = '2026-09-26') => correspondeAosFiltros(
    { id: 'sintetico', nome_completo: 'Teste', data_nascimento: data }, restricoesPacientes({ ...vazio, idadeMin: min, idadeMax: max }, hoje))
  assert.equal(filtrar('2000-09-26', '26', '26'), true)
  assert.equal(filtrar('2000-09-27', '26', ''), false)
  assert.equal(filtrar('2000-09-27', '', '25'), true)
  assert.equal(filtrar('2026-09-26', '0', '0'), true)
  assert.equal(filtrar('2026-09-27', '0', '0'), false)
  assert.equal(filtrar(null, '0', ''), false)
  assert.equal(filtrar('2008-02-29', '18', '', '2026-02-28'), false)
  assert.equal(filtrar('2008-02-29', '18', '', '2026-03-01'), true)
})
test('cadastro inclui todo último dia na Bahia, sem updated_at nem timezone do computador', () => {
  const regras = restricoesPacientes({ ...vazio, inicio: '2026-09-25', fim: '2026-09-25' })
  assert.deepEqual(regras, [
    { campo: 'created_at', operador: 'gte', valor: '2026-09-25T03:00:00.000Z' },
    { campo: 'created_at', operador: 'lt', valor: '2026-09-26T03:00:00.000Z' },
  ])
  for (const [data, esperado] of [['2026-09-25T02:59:59Z', false], ['2026-09-26T02:59:59.999Z', true], ['2026-09-26T03:00:00Z', false]] as const) {
    assert.equal(correspondeAosFiltros({ ...pessoas[0], created_at: data }, regras), esperado)
  }
  assert.equal(hojeNaBahia(new Date('2026-09-26T02:00:00Z')), '2026-09-25')
})
test('valida limites isolados, inválidos e incompatibilidade sem presumir maioridade', () => {
  assert.equal(validarFiltrosPacientes({ ...vazio, idadeMin: '0' }), null)
  assert.equal(validarFiltrosPacientes({ ...vazio, fim: '2026-09-26' }), null)
  for (const alteracao of [{ idadeMin: '-1' }, { idadeMax: '1.5' }, { idadeMin: '19', idadeMax: '18' }, { inicio: '2026-09-26', fim: '2026-09-25' }, { inicio: '2026-02-30' }, { nascimento: 'ausente' as const, idadeMin: '0' }]) {
    assert.ok(validarFiltrosPacientes({ ...vazio, ...alteracao }))
  }
  assert.equal(correspondeAosFiltros(pessoas[0], restricoesPacientes({ ...vazio, nascimento: 'ausente' })), true)
  assert.equal(correspondeAosFiltros(pessoas[1], restricoesPacientes({ ...vazio, nascimento: 'ausente' })), false)
  assert.equal(resumoFiltrosPacientes({ ...vazio, idadeMin: '0', fim: '2026-09-26' }).length, 2)
})
test('recorte nunca é aceito como conjunto global, inclusive limite remoto menor', () => {
  assert.equal(respostaCompletaPacientes(0, 0), true)
  assert.equal(respostaCompletaPacientes(1000, 1000), true)
  assert.equal(respostaCompletaPacientes(1000, 1001), false)
  assert.equal(respostaCompletaPacientes(50, 200), false)
  assert.equal(respostaCompletaPacientes(50, null), false)
})
test('busca nominal trata caracteres especiais literalmente, sem expressão fornecida pelo usuário', () => {
  for (const nome of ['Ana* Exemplo', 'José (Modelo)', 'Maria [Teste]', 'X.Y', 'Nome%_', 'A+B', 'A\\B']) {
    const padrao = new RegExp(padraoBuscaNome(nome), 'i')
    assert.ok(padrao.test(nome))
    assert.equal(padrao.test('outra pessoa'), false)
  }
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpfLegadoInvalidoConfirmado } from './pacienteCpfEstado'
import { alteracoesAdministrativas, alteracoesEnderecoEstruturado, validarEdicao, mensagemErroEdicao, RESPONSAVEL_VAZIO, type DadosEdicao } from './pacienteEdicao'
const base: DadosEdicao = { nome_completo: 'Pessoa Sintética', data_nascimento: null, sexo: null, telefone: null, email: null, endereco: 'Rua A,  10\nComplemento literal', observacoes: null }
const hoje = new Date('2026-09-26T12:00:00')
test('somente o código específico confirma CPF legado inválido', () => {
  assert.equal(cpfLegadoInvalidoConfirmado({ code: 'PC422' }), true)
  for (const code of ['22000', '42501', 'PGRST000', 'XX000']) {
    assert.equal(cpfLegadoInvalidoConfirmado({ code }), false)
  }
  assert.equal(cpfLegadoInvalidoConfirmado(new Error('CPF inválido')), false)
})
test('patch permite corrigir telefone sem nascimento e preserva endereço, CPF, foto e imutáveis', () => {
  const cheio = { ...base, id: 'p', cpf_hash: 'nao-enviar', foto_path: 'privada', created_by: 'autor' }
  const atual = { ...cheio, telefone: '(77) 90000-0010', cpf_hash: 'indevido', id: 'outro' }
  assert.deepEqual(alteracoesAdministrativas(cheio, atual), { telefone: '(77) 90000-0010' })
  assert.equal(validarEdicao(base, atual, null, hoje), null)
})
test('valida todos os campos preenchidos sem exigir nascimento do legado', () => {
  assert.ok(validarEdicao({ ...base, email: 'legado' }, { ...base, email: 'legado', telefone: '77900000010' }, null, hoje))
  for (const patch of [{ email: 'invalido' }, { telefone: '12' }, { data_nascimento: '2026-02-30' }, { data_nascimento: '2027-01-01' }, { nome_completo: '' }]) assert.ok(validarEdicao(base, { ...base, ...patch }, null, hoje))
  assert.ok(validarEdicao({ ...base, data_nascimento: '2015-01-01' }, base, null, hoje))
})
test('primeiro responsável exige contato, nome e vínculo; CPF opcional', () => {
  assert.ok(validarEdicao(base, base, RESPONSAVEL_VAZIO, hoje))
  const r = { ...RESPONSAVEL_VAZIO, nome_completo: 'Responsável Sintético', vinculo: 'Mãe', telefone: '77900000010' }
  assert.equal(validarEdicao(base, base, r, hoje), null)
  assert.ok(validarEdicao(base, base, { ...r, cpf: '11111111111' }, hoje))
  assert.ok(validarEdicao(base, base, { ...r, email: 'invalido' }, hoje))
})
test('conflito, autorização e contrato ausente não são sucesso', () => {
  assert.match(mensagemErroEdicao('40001'), /outra operação/)
  assert.match(mensagemErroEdicao('PT409'), /outra operação/)
  assert.match(mensagemErroEdicao('PGRST202'), /ainda não está disponível/)
  assert.equal(mensagemErroEdicao('42501'), mensagemErroEdicao('P0002'))
})
test('endereço estruturado gera composição legível somente quando algum componente mudou', () => {
  const original = { cep: '46100-000', logradouro: 'Rua da Matriz', numero: '10', complemento: '', bairro: 'Centro', cidade: 'Brotas de Macaúbas', uf: 'BA' }
  assert.deepEqual(alteracoesEnderecoEstruturado(original, { ...original }), {})
  assert.deepEqual(alteracoesEnderecoEstruturado(original, { ...original, numero: '12', complemento: 'Sala 2' }), {
    endereco: 'Rua da Matriz, 12, Sala 2, Centro, Brotas de Macaúbas - BA, CEP 46100-000',
    cep: '46100-000', logradouro: 'Rua da Matriz', numero: '12', complemento: 'Sala 2', bairro: 'Centro', cidade: 'Brotas de Macaúbas', uf: 'BA',
  })
})

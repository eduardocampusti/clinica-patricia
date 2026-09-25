import assert from 'node:assert/strict'
import test from 'node:test'
import {
  comporEnderecoPaciente,
  consultarCep,
  formatarCep,
  formatarTelefoneBrasil,
  formatarTextoPortugues,
  obterIniciaisPaciente,
} from './pacienteFormulario.ts'
import { cpfValido, formatarCpf } from './cpf.ts'

test('formata nomes portugueses com partículas, acentos, hífen e apóstrofo', () => {
  assert.equal(formatarTextoPortugues('  joÃO   dA silva e d\'ávila  '), "João da Silva e D'Ávila")
  assert.equal(formatarTextoPortugues('ana-mARIA DOS santos'), 'Ana-Maria dos Santos')
  assert.equal(formatarTextoPortugues('de souza'), 'De Souza')
})

test('gera iniciais do primeiro e último nome e mantém estado neutro sem nome', () => {
  assert.equal(obterIniciaisPaciente(''), '')
  assert.equal(obterIniciaisPaciente('  Érica  '), 'É')
  assert.equal(obterIniciaisPaciente('Marina Pereira de Souza'), 'MS')
  assert.equal(obterIniciaisPaciente('ana-maria dos santos'), 'AS')
})

test('máscara de CPF aceita entrada crua, pontuada e exclusão progressiva', () => {
  assert.equal(formatarCpf('52998224725'), '529.982.247-25')
  assert.equal(formatarCpf('529.982.247-25'), '529.982.247-25')
  assert.equal(formatarCpf('5299822472'), '529.982.247-2')
  assert.equal(formatarCpf(''), '')
  assert.equal(cpfValido('529.982.247-25'), true)
  assert.equal(cpfValido('529.982.247-24'), false)
  assert.equal(cpfValido('111.111.111-11'), false)
})

test('formata telefone fixo e celular brasileiro a partir de colagem', () => {
  assert.equal(formatarTelefoneBrasil('7133334444'), '(71) 3333-4444')
  assert.equal(formatarTelefoneBrasil('(71) 99999-8888'), '(71) 99999-8888')
  assert.equal(formatarTelefoneBrasil('71 99999 8888 000'), '(71) 99999-8888')
})

test('formata CEP e compõe endereço legível para a coluna única', () => {
  assert.equal(formatarCep('01001000'), '01001-000')
  assert.equal(comporEnderecoPaciente({
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    numero: '100',
    complemento: 'Sala 2',
    bairro: 'Sé',
    cidade: 'São Paulo',
    uf: 'sp',
  }), 'Praça da Sé, 100, Sala 2, Sé, São Paulo - SP, CEP 01001-000')
})

test('consulta CEP encontrado e não envia outros dados ao serviço', async () => {
  let urlConsultada = ''
  const resultado = await consultarCep('01001-000', undefined, async (url) => {
    urlConsultada = url
    return new Response(JSON.stringify({
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
    }), { status: 200 })
  })

  assert.equal(urlConsultada, 'https://viacep.com.br/ws/01001000/json/')
  assert.deepEqual(resultado, {
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    bairro: 'Sé',
    cidade: 'São Paulo',
    uf: 'SP',
  })
})

test('distingue CEP inexistente e falha de rede', async () => {
  await assert.rejects(consultarCep('12345'), /CEP inválido/)

  const inexistente = await consultarCep('00000000', undefined, async () => (
    new Response(JSON.stringify({ erro: true }), { status: 200 })
  ))
  assert.equal(inexistente, null)

  await assert.rejects(
    consultarCep('01001000', undefined, async () => { throw new Error('rede indisponível') }),
    /rede indisponível/,
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { cargoEfetivo, formularioEquipeVazio, mascararCpfEquipe, montarDadosEquipe, validarFormularioEquipe, validarFormularioEquipeDetalhada } from './equipe'

test('novo membro exige nome, cargo e clínica', () => {
  assert.equal(validarFormularioEquipe(formularioEquipeVazio()), 'Informe o nome completo.')
})

test('CPF é opcional até decisão funcional e, quando informado, precisa ser válido', () => {
  const form = { ...formularioEquipeVazio('bro'), nomeCompleto: 'Ana Souza', cargo: 'Recepcionista' }
  assert.equal(validarFormularioEquipe(form), null)
  form.cpf = '123'
  assert.equal(validarFormularioEquipe(form), 'Informe um CPF válido, com 11 dígitos, ou deixe o campo vazio.')
})

test('funcionário de apoio não recebe campos profissionais', () => {
  const form = { ...formularioEquipeVazio('bro'), nomeCompleto: 'maria da silva', cargo: 'Serviços gerais',
    tipo: 'apoio' as const, cpf: '529.982.247-25', profissao: 'Não deve persistir', conselhoClasse: 'CRM',
    registroConselho: '123', conselhoUf: 'BA' }
  assert.equal(validarFormularioEquipe(form), null)
  const dados = montarDadosEquipe(form)
  assert.equal(dados.nome_completo, 'Maria da Silva')
  assert.equal(dados.profissao, null)
  assert.equal(dados.conselho_classe, null)
})

test('payload da RPC preserva tipos e nulos explícitos do contrato JSON', () => {
  const form = { ...formularioEquipeVazio('bro'), nomeCompleto: 'Ana Souza', cargo: 'Recepcionista' }
  const dados = montarDadosEquipe(form)

  assert.equal(typeof dados.nome_completo, 'string')
  assert.equal(typeof dados.cargo, 'string')
  assert.equal(typeof dados.tipo, 'string')
  assert.equal(typeof dados.cpf_modo, 'string')
  assert.deepEqual(dados.clinicas_ids, ['bro'])
  assert.equal(dados.cpf, null)
  assert.equal(dados.telefone, null)
  assert.equal(dados.email_contato, null)
  assert.equal(dados.conselho_uf, null)
  assert.equal(dados.especialidade_id, null)
})

test('outro cargo usa o texto informado', () => {
  const form = { ...formularioEquipeVazio('bro'), cargo: 'Outro', outroCargo: 'Técnico de manutenção' }
  assert.equal(cargoEfetivo(form), 'Técnico de manutenção')
})

test('profissional de saúde exige profissão e conselho completo quando iniciado', () => {
  const form = { ...formularioEquipeVazio('bro'), nomeCompleto: 'João Souza', cargo: 'Médico(a)',
    tipo: 'profissional_saude' as const, cpf: '52998224725' }
  assert.equal(validarFormularioEquipe(form), 'Informe a profissão do profissional de saúde.')
  form.profissao = 'Medicina'; form.conselhoClasse = 'CRM'
  assert.equal(validarFormularioEquipe(form), 'Preencha conselho, número do registro e UF juntos.')
})

test('validação detalhada aponta o campo e mantém a regra de clínicas', () => {
  const form = { ...formularioEquipeVazio('bro'), nomeCompleto: 'Ana Souza', cargo: 'Recepcionista', emailContato: 'invalido' }
  assert.deepEqual(validarFormularioEquipeDetalhada(form), { campo: 'emailContato', mensagem: 'Informe um e-mail de contato válido.' })
  form.emailContato = ''
  form.clinicasIds = []
  assert.deepEqual(validarFormularioEquipeDetalhada(form), { campo: 'clinicas', mensagem: 'Selecione ao menos uma clínica.' })
})

test('ficha mascara CPF e diferencia ausência de indisponibilidade', () => {
  assert.equal(mascararCpfEquipe('52998224725', 'informado'), '529.***.***-25')
  assert.equal(mascararCpfEquipe(null, 'ausente'), 'Não cadastrado')
  assert.equal(mascararCpfEquipe(null, 'indisponivel'), 'Indisponível nesta consulta')
  assert.equal(mascararCpfEquipe('123', 'informado'), 'Informação protegida')
})

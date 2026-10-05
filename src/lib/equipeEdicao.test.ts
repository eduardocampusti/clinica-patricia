import assert from 'node:assert/strict'
import test from 'node:test'
import { detalheEquipePermiteEdicao, formularioAPartirDoDetalhe, mensagemVinculoInativoEquipe, montarDadosEquipe, type DetalheMembroEquipe } from './equipe'

const detalhe: DetalheMembroEquipe = {
  id: 'pessoa-sintetica', nome_completo: 'Pessoa Sintética', cargo: 'Médico(a)', tipo: 'profissional_saude', profissao: 'Medicina',
  telefone: null, email_contato: null, conselho_classe: null, registro_conselho: null, conselho_uf: null,
  especialidade_id: null, especialidade_nome: null, acesso_status: 'sem_conta', revisao: 4,
  cpf: null, cpf_situacao: 'indisponivel', clinicas: [{ id: 'a', nome: 'Clínica A' }],
}

test('edição conserva tipo, campos profissionais, vínculos existentes e revisão no contrato', () => {
  const form = formularioAPartirDoDetalhe(detalhe)
  form.tipo = 'administrativo'
  form.clinicasIds = ['b']
  form.profissao = 'Medicina de família'
  const dados = montarDadosEquipe(form)
  assert.equal(dados.tipo, 'profissional_saude')
  assert.equal(dados.profissao, 'Medicina de família')
  assert.deepEqual(dados.clinicas_ids, ['a', 'b'])
  assert.equal(form.revisao, 4)
  assert.equal(dados.cpf_modo, 'preservar')
  assert.equal(dados.cpf, null)
  assert.equal('edicao' in dados, false)
})

test('resposta parcial não autoriza abrir edição nem transforma campos ausentes em vazios', () => {
  assert.equal(detalheEquipePermiteEdicao(detalhe, detalhe.id, 'a'), true)
  for (const campo of ['telefone', 'profissao', 'conselho_uf', 'email_contato', 'cpf', 'clinicas', 'revisao']) {
    const parcial = { ...detalhe } as Record<string, unknown>
    delete parcial[campo]
    assert.equal(detalheEquipePermiteEdicao(parcial, detalhe.id, 'a'), false, campo)
  }
  assert.equal(detalheEquipePermiteEdicao({ ...detalhe, id: 'outra-pessoa' }, detalhe.id, 'a'), false)
  assert.equal(detalheEquipePermiteEdicao({ ...detalhe, tipo: 'desconhecido' }, detalhe.id, 'a'), false)
  assert.equal(detalheEquipePermiteEdicao({ ...detalhe, revisao: null }, detalhe.id, 'a'), false)
  assert.equal(detalheEquipePermiteEdicao({ ...detalhe, clinicas: [{ id: 'b', nome: 'Clínica B' }] }, detalhe.id, 'a'), false)
})

test('nulos confirmados são válidos; cópia da referência não modifica o detalhe original', () => {
  const form = formularioAPartirDoDetalhe(detalhe)
  form.edicao!.clinicas[0].nome = 'Nome local'
  assert.equal(detalhe.clinicas[0].nome, 'Clínica A')
  assert.equal(detalheEquipePermiteEdicao({ ...detalhe, telefone: null }, detalhe.id, 'a'), true)
  assert.equal(detalheEquipePermiteEdicao({ ...detalhe, telefone: {} }, detalhe.id, 'a'), false)
})

test('vínculo inativo só recebe orientação específica nas recusas exatas; permissão não é contornada', () => {
  for (const message of ['Há vínculo inativo; use o fluxo explícito de reativação.', 'Há vínculo profissional inativo; use o fluxo explícito de reativação.']) {
    assert.match(mensagemVinculoInativoEquipe({ code: '22023', message }, 400)!, /Este formulário não o reativa/)
    assert.equal(mensagemVinculoInativoEquipe({ code: '42501', message }, 403), null)
    assert.equal(mensagemVinculoInativoEquipe({ code: '22023', message }, 403), null)
  }
  assert.equal(mensagemVinculoInativoEquipe({ code: '22023', message: 'inativo e segredo sintético' }, 400), null)
})

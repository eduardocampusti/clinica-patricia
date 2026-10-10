import fs from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
const sql=fs.readFileSync('supabase/migrations/20261006150000_equipe_atuacao.sql','utf8')
test('contrato SQL mantém autorização explícita e nenhum grant de tabela',()=>{
  assert.match(sql,/equipe_recurso_pode\(p_membro_id,p_clinica_id,auth.uid\(\),false\)/)
  assert.match(sql,/equipe_recurso_pode\(v_membro,p_clinica_id,auth.uid\(\),false\)/)
  assert.match(sql,/equipe_pode_editar_profissional_global\(v_prof\)/)
  assert.match(sql,/from public,anon,authenticated/)
  assert.doesNotMatch(sql,/grant\s+(all|select|insert|update|delete)\s+on\s+(table\s+)?public\./i)
})
test('fontes preservadas e sem escrita em agenda, histórico financeiro ou acessos',()=>{
  assert.match(sql,/'servicos_vinculados',null/)
  assert.match(sql,/configuracoes_financeiras_clinica where clinica_id=p_clinica_id/)
  assert.match(sql,/set duracao_consulta_minutos=p_valor/)
  assert.match(sql,/set valor_consulta=p_valor/)
  assert.doesNotMatch(sql,/(update|insert into|delete from)\s+(public\.)?(agendamentos|recebimentos|repasses|usuarios|usuarios_clinicas|auth\.users|servicos)\b/i)
})
test('concorrência, horários atômicos e recuperação sem exclusão física',()=>{
  assert.match(sql,/errcode='PT409'/)
  assert.match(sql,/p_atualizado_em is null or v_data is distinct from p_atualizado_em/)
  assert.match(sql,/for update/)
  assert.match(sql,/update public.disponibilidade_padrao set ativo=false/)
  assert.doesNotMatch(sql,/delete\s+from/i)
  assert.match(sql,/begin;[\s\S]*commit;/)
  assert.match(sql,/jsonb_build_array\('horarios'\)/)
})

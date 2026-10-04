import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESCOPOS, gerar, validarPreparo } from './preparar.mjs';

const pendente = JSON.parse(readFileSync(new URL('./manifesto-revisao.exemplo.json', import.meta.url), 'utf8'));
// Dados EXCLUSIVAMENTE SINTÉTICOS, em memória. Não comprovam catálogo ou execução PostgreSQL.
function exemplo() {
  const m = structuredClone(pendente);
  Object.assign(m, { estado: 'EM_REVISAO_CONCLUIDA', clinica_id: '11111111-1111-4111-8111-111111111111', sessao_id: '22222222-2222-4222-8222-222222222222', responsavel_id: '33333333-3333-4333-8333-333333333333', execucao_id: '44444444-4444-4444-8444-444444444444', catalogo_md5: 'a'.repeat(32), motivo: 'Exemplo sintético de preparo administrativo', autorizacao_execucao: 'SINTETICA: sem autorização no principal' });
  for (const chave of Object.keys(m)) if (typeof m[chave] === 'boolean') m[chave] = true;
  m.sessao_original = { id: m.sessao_id, clinica_id: m.clinica_id, status: 'aberto', idempotency_key: null, aberto_em: '2026-08-03T17:55:00Z', valor_abertura: '150.50', fechado_por: null, fechado_em: null, valor_esperado: null, valor_contado: null, diferenca: null };
  m.snapshot = Object.fromEntries(Object.keys(ESCOPOS).map(t => [t, { quantidade: t === 'entradas_caixa' ? 2 : 0, md5: 'b'.repeat(32) }]));
  m.decisoes_humanas = { origem_natureza_entradas: 'Desconhecidas no exemplo; não descartadas', dinheiro_sob_responsabilidade: 'nao_comprovado', pendencias_conhecidas: 'Exemplo registrado para revisão humana', limitacoes_historicas: 'Contagem histórica não comprovada' };
  return m;
}
test('exemplo versionado continua bloqueado sem aprovação ou contagem fabricada', () => {
  assert.ok(validarPreparo(pendente).length > 0);
  assert.equal(pendente.autorizacao_execucao, null);
  assert.equal(pendente.responsavel_id, null);
  assert.equal(pendente.execucao_id, null);
  assert.equal(pendente.motivo, null);
  assert.equal(pendente.homologacao_postgresql_isolado, true); // Evidência PostgreSQL isolada, não autorização principal.
  assert.equal(pendente.sessao_original?.valor_contado ?? null, null);
});
test('exemplo sintético completo permite somente preparar para revisão', () => assert.deepEqual(validarPreparo(exemplo()), []));
test('outra clínica ou projeto são recusados', () => {
  for (const [chave, valor] of [['clinica_subdomain','ipupiara'],['project_ref','outro']]) { const m=exemplo(); m[chave]=valor; assert.ok(validarPreparo(m).length>0); }
});
test('sessão moderna é recusada', () => { const m=exemplo(); m.sessao_original.idempotency_key='nova'; assert.ok(validarPreparo(m).length>0); });
test('estado inesperado ou identidade divergente são recusados', () => {
  for (const [chave, valor] of [['status','aprovado'],['id','55555555-5555-4555-8555-555555555555']]) { const m=exemplo(); m.sessao_original[chave]=valor; assert.ok(validarPreparo(m).length>0); }
});
test('falta de abrangência, catálogo ou homologação não vira ausência', () => {
  for (const flag of ['abrangencia_confirmada','catalogo_revisado','homologacao_postgresql_isolado']) { const m=exemplo(); m[flag]=false; assert.ok(validarPreparo(m).length>0); }
});
test('cada relação moderna encontrada bloqueia o recorte simples', () => {
  for (const tabela of Object.keys(ESCOPOS).filter(t=>t!=='entradas_caixa')) { const m=exemplo(); m.snapshot[tabela].quantidade=1; assert.ok(validarPreparo(m).some(e=>e.includes(tabela))); }
});
test('inventário faltante ou truncado não pode ser aceito', () => { const m=exemplo(); delete m.snapshot.estornos_pagamentos; assert.ok(validarPreparo(m).length>0); });
test('contagem histórica não comprovada permanece desconhecida; zero fabricado é recusado', () => {
  const m=exemplo(); assert.deepEqual(validarPreparo(m), []); m.sessao_original.valor_contado='0.00'; assert.ok(validarPreparo(m).length>0);
});
test('decisão humana pendente bloqueia preparo; desconhecido explícito pode ser registrado', () => {
  const m=exemplo(); m.decisoes_humanas.dinheiro_sob_responsabilidade='nao_informado'; assert.ok(validarPreparo(m).length>0);
});
test('gerador nunca habilita execução mesmo com manifesto sintético completo', () => {
  const {alteracao}=gerar(exemplo()); assert.match(alteracao,/v_permitir_execucao constant boolean := false/); assert.match(alteracao,/rollback;\s*$/); assert.equal((alteracao.match(/^\s*update public\./gm)||[]).length,1); assert.equal((alteracao.match(/^\s*insert into public\./gm)||[]).length,1);
  assert.match(alteracao,/MESMA_EXECUCAO_JA_CONCLUIDA/);
  assert.ok(alteracao.indexOf('PREPARO BLOQUEADO')<alteracao.indexOf('update public.sessoes_caixa'));
  assert.match(alteracao,/pg_advisory_xact_lock/); assert.match(alteracao,/for update/);
});
test('valores originais não são zerados nem transferidos; repetição usa evento fixo', () => {
  const {alteracao}=gerar(exemplo()); assert.doesNotMatch(alteracao,/set[^;]*(valor_abertura|valor_contado|valor_esperado|diferenca)\s*=/i); assert.doesNotMatch(alteracao,/insert into public\.(recebimentos|movimentos_caixa|sessoes_caixa)/i); assert.match(alteracao,/v_evento\.dados->'manifesto' = v_manifesto/);
});

test('leitura exportável usa SELECT e contexto explícito, sem DO ou função financeira', () => {
  const {leitura}=gerar(exemplo());
  assert.match(leitura,/begin isolation level repeatable read read only/);
  assert.match(leitura,/select 'contexto' secao/);
  assert.match(leitura,/rolsuper or rolbypassrls/);
  assert.doesNotMatch(leitura,/^\s*(insert|update|delete|alter|create|drop|truncate|do|call)\b/im);
  assert.doesNotMatch(leitura,/\bfinanceiro_(abrir|iniciar|enviar|revisar|calcular|resumo)[a-z_]*\s*\(/i);
  const sqls=leitura.split('\n').filter(l=>l.startsWith("select '") && l.includes('tabela,jsonb_build_object'));
  assert.equal(sqls.length+1,Object.keys(ESCOPOS).length); // primeiro é "snaps as (select".
  assert.ok(sqls.every(l=>/where \(.+\) and exists\(select 1 from contexto where valido\)/.test(l)));
});

test('alvo não identificado permanece explícito e não produz UUID inválido ou escrita', () => {
  const m=exemplo(); m.sessao_id=null; m.clinica_id=null;
  const {leitura,alteracao}=gerar(m);
  assert.match(leitura,/s\.id=null::uuid and s\.clinica_id=null::uuid/);
  assert.doesNotMatch(leitura,/''::uuid/);
  assert.match(alteracao,/v_permitir_execucao constant boolean := false/);
});

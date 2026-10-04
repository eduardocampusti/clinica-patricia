// Contratos OFFLINE dos arquivos. Não executa PostgreSQL nem simula sua concorrência.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALVO, gerarCandidato, gerarPosVerificacao, gerarReinventarioPos } from './candidato.mjs';
import { ESCOPOS, gerar } from './preparar.mjs';
const m = JSON.parse(readFileSync(new URL('./manifesto-revisao.exemplo.json', import.meta.url), 'utf8'));
const h = JSON.parse(readFileSync(new URL('./homologacao-casos.json', import.meta.url), 'utf8'));
const sql = gerarCandidato(m);
// Hashes/SQL congelados da execução são privados e não constituem pré-requisito
// destes contratos offline. Sua preservação foi verificada na sincronização.
test('candidato nega execução antes de locks ou DML e termina rollback', () => {
  assert.match(sql, /v_permitir_execucao constant boolean := false/);
  assert.ok(sql.indexOf('CANDIDATO BLOQUEADO') < sql.indexOf('lock table'));
  assert.ok(sql.indexOf('CANDIDATO BLOQUEADO') < sql.indexOf('update public.'));
  assert.match(sql, /rollback;\s*$/);
  assert.doesNotMatch(sql, /^\s*commit;/im);
});
test('manifesto preenchido artificialmente nunca habilita o candidato', () => {
  const s = gerarCandidato({ ...m, estado: 'EM_REVISAO_CONCLUIDA', autorizacao_execucao: 'EXEMPLO' });
  assert.match(s, /v_permitir_execucao constant boolean := false/);
});
test('identidade é fixada independentemente dos parâmetros do manifesto', () => {
  const s = gerarCandidato({ ...m, clinica_id: h.fixture.outra_clinica_id, sessao_id: h.fixture.sessao_id });
  assert.ok(s.includes(`v_clinica is distinct from '${ALVO.clinica_id}'::uuid`));
  assert.ok(s.includes(`v_sessao is distinct from '${ALVO.sessao_id}'::uuid`));
  assert.ok(s.includes(`v_manifesto->>'project_ref' is distinct from '${ALVO.project_ref}'`));
});
test('legacy, estado original e14 vínculos modernos têm guardas explícitas', () => {
  assert.match(sql, /Sessao moderna/);
  assert.match(sql, /v_antes is distinct from v_manifesto->'sessao_original'/);
  for (const t of Object.keys(ESCOPOS)) assert.ok(sql.includes(t));
  assert.match(sql, /v_reg.tabela<>'entradas_caixa'.*quantidade/);
});
test('locks abrangem catálogo financeiro e auditoria; isolamento renova snapshot após locks', () => {
  assert.match(sql, /begin isolation level read committed/);
  assert.match(sql, /pg_advisory_xact_lock/);
  const lock = sql.slice(sql.indexOf('lock table'), sql.indexOf('in share row exclusive mode'));
  for (const t of [...Object.keys(ESCOPOS), 'sessoes_caixa', 'auditoria', 'eventos_auditoria_financeira']) assert.ok(lock.includes(`public.${t}`));
  assert.match(sql, /lock_timeout='5s'/);
});
test('auditoria antiga inclui entrada excluída e fingerprint anterior é verificado', () => {
  assert.match(sql, /a\.dados_antes->>'sessao_caixa_id'=v_sessao::text/);
  assert.match(sql, /auditoria_fingerprints,auditoria/);
  assert.match(sql, /auditoria_fingerprints,eventos_financeiros/);
});
test('auditoria nova tem referência, motivo, estado e hash; nenhuma falsa identidade', () => {
  assert.match(sql, /set_config\('audit.motivo'/);
  assert.match(sql, /v_linhas<>1 then raise exception 'Esperado exatamente um novo evento/);
  assert.match(sql, /auditoria_nova_md5/);
  assert.match(sql, /identidade_auth',auth.uid\(\)/);
  assert.doesNotMatch(sql, /request\.jwt|set\s+role|set_config\('request/i);
});
test('repetição valida snapshot/catálogo e auditoria antes de retornar, sem nova abertura', () => {
  assert.ok(sql.indexOf('Inventário/catálogo mudou') < sql.indexOf('MESMA_EXECUCAO_JA_CONCLUIDA'));
  const repeticao = sql.slice(sql.indexOf('if found then'), sql.indexOf('return;') + 7);
  assert.match(repeticao, /Auditoria histórica mudou/);
  assert.match(repeticao, /v_evento.estado_novo is distinct from v_antes/);
  assert.doesNotMatch(repeticao, /^\s*(update|insert|delete)\b/im);
});
test('única sessão alterada em3 campos; nenhum valor/lançamento é fabricado', () => {
  assert.equal((sql.match(/^\s*update public\./gm) ?? []).length, 1);
  assert.equal((sql.match(/^\s*insert into public\./gm) ?? []).length, 1);
  assert.match(sql, /set status='fechado',fechado_por=.*fechado_em=transaction_timestamp\(\)/);
  assert.doesNotMatch(sql, /set[^;]*(valor_abertura|valor_contado|valor_esperado|diferenca)\s*=/i);
  assert.doesNotMatch(sql, /^\s*(delete|truncate|alter|create|drop|grant|revoke|call)\b/im);
  assert.doesNotMatch(sql, /\bfinanceiro_(abrir|iniciar|enviar|revisar)[a-z_]*\s*\(/);
});
test('autorização/avaliação humana não foi preenchida e custódia desconhecida exige plano', () => {
  for (const t of ['autorizacao_execucao', 'execucao_id', 'responsavel_id', 'motivo']) assert.equal(m[t], null);
  assert.equal(m.avaliacao_pendencias.estado, null);
  assert.equal(m.homologacao_postgresql_isolado, true); // Depende da proteção proposta; principal bloqueado.
  assert.match(sql, /avaliacao_pendencias,tratamento_custodia_definido/);
  assert.match(sql, /Responsável sem vínculo ativo de proprietária/);
});
test('leitor pós-candidato é somente leitura e explicita ausência de UUID de execução', () => {
  const p = gerarPosVerificacao(m);
  assert.match(p, /begin isolation level repeatable read read only/);
  assert.match(p, /execucao_identificada/);
  assert.doesNotMatch(p, /^\s*(do|insert|update|delete|alter|create|drop|truncate|call|commit)\b/im);
  assert.match(p, /financeiro_conciliado',false/);
  assert.match(p, /exige_conferencia_grafo_catalogo',true/);
});
test('pós-inventário aceita fechado, preserva grafo e não enfraquece leitor de aberto', () => {
  assert.match(gerarReinventarioPos(m), /s.status='fechado'/);
  assert.match(gerar(m).leitura, /s.status='aberto'/);
  for (const t of Object.keys(ESCOPOS)) assert.ok(gerarReinventarioPos(m).includes(t));
  assert.doesNotMatch(gerarReinventarioPos(m), /^\s*(insert|update|delete|create|alter|do|call)\b/im);
});
test('fixture e12 casos são somente dados sintéticos/planejados, sem aprovação real', () => {
  assert.equal(h.casos.length, 12);
  assert.equal(new Set(h.casos.map(c => c.id)).size, 12);
  assert.equal(h.resultados_postgresql.length, 12); // Evidência externa de SQL real, sem simulá-la aqui.
  assert.ok(h.resultados_postgresql.every(c => c.resultado === 'APROVADO'));
  assert.equal(h.alvo_isolado.host, '127.0.0.1');
  for (const t of ['clinica_id', 'sessao_id', 'responsavel_id']) assert.notEqual(h.fixture[t], m[t]);
  assert.equal(h.fixture.entradas_atuais_centavos.reduce((a, b) => a + b, 0), 100000);
  assert.equal(h.fixture.auditoria.length, 7);
  assert.equal(h.fixture.valor_contado, null);
});

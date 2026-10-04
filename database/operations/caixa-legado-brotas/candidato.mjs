// Gerador OFFLINE do candidato separado. Sem conexão, .env, credenciais ou execução SQL.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fragmentosCandidato, gerar } from './preparar.mjs';

const pasta = dirname(fileURLToPath(import.meta.url));
export const ALVO = Object.freeze({
  project_ref: 'xftnkusbyqzyvzrovroj',
  clinica_id: '7c2a450d-7b9a-4701-8d5a-982eda331c58',
  sessao_id: 'a4a18e49-6634-4058-9fd8-07f3b065fd63',
});

// Scope idêntico ao inventário conectado. Inclui a entrada excluída pelo JSON da auditoria.
const escopoAuditoria = `a.entidade_id=v_sessao::text
    or a.entidade_id in(select e.id::text from public.entradas_caixa e where e.sessao_caixa_id=v_sessao)
    or a.dados_antes->>'sessao_caixa_id'=v_sessao::text or a.dados_depois->>'sessao_caixa_id'=v_sessao::text`;
const escopoEventos = `a.entidade_id=v_sessao or a.dados->>'sessao_caixa_id'=v_sessao::text
    or a.entidade_id in(select r.id from public.recebimentos r where r.sessao_caixa_id=v_sessao)`;
const auditarOriginais = `select jsonb_build_object('quantidade',count(*),'md5',md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'[]')))
    into v_auditoria_original from public.auditoria a
    where (${escopoAuditoria}) and (v_auditoria_nova_id is null or to_jsonb(a.id) is distinct from v_auditoria_nova_id);
  select jsonb_build_object('quantidade',count(*),'md5',md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'[]')))
    into v_eventos_originais from public.eventos_auditoria_financeira a
    where (${escopoEventos}) and a.id<>(v_manifesto->>'execucao_id')::uuid;
  if v_auditoria_original is distinct from v_manifesto#>'{auditoria_fingerprints,auditoria}'
    or v_eventos_originais is distinct from v_manifesto#>'{auditoria_fingerprints,eventos_financeiros}' then
    raise exception 'Auditoria histórica mudou ou acesso incompleto: abortar.';
  end if;`;

export function gerarCandidato(m) {
  const f = fragmentosCandidato(m);
  const travaTabelas = f.tabelasCatalogo.toSorted().map(t => `public.${t}`).join(',\n    ');
  const flags = JSON.stringify(f.flags).replaceAll("'", "''");
  const sql = `-- CANDIDATO HOMOLOGADO SOMENTE NO RECORTE POSTGRESQL ISOLADO.
-- Principal NÃO autorizado. 03-encerramento.sql.disabled permanece intacto.
-- Falha incondicional ANTES dos locks/DML; ROLLBACK final. NÃO remover estas travas.
-- Não cria função/RPC/migration/status/permissão. Nunca registrar COMMIT nesta etapa.
begin isolation level read committed;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $candidato$ declare
  v_permitir_execucao constant boolean := false;
  ${f.declarar}
  v_auditoria_original jsonb; v_eventos_originais jsonb;
  v_auditoria_ids jsonb; v_auditoria_nova_id jsonb; v_auditoria_nova jsonb;
begin
  if not v_permitir_execucao then raise exception 'CANDIDATO BLOQUEADO: sem homologação/autorizações; nenhuma escrita.'; end if;
  if v_manifesto->>'project_ref' is distinct from '${ALVO.project_ref}'
    or v_clinica is distinct from '${ALVO.clinica_id}'::uuid
    or v_sessao is distinct from '${ALVO.sessao_id}'::uuid
    or v_manifesto->>'clinica_subdomain' is distinct from 'brotas'
    or v_manifesto->>'estado' is distinct from 'EM_REVISAO_CONCLUIDA' then raise exception 'Alvo/estado de revisão proibido.'; end if;
  for v_reg in select jsonb_array_elements_text('${flags}'::jsonb) flag loop
    if v_manifesto->>v_reg.flag is distinct from 'true' then raise exception 'Pré-condição pendente: %',v_reg.flag; end if;
  end loop;
  if nullif(btrim(v_manifesto->>'motivo'),'') is null or nullif(btrim(v_manifesto->>'autorizacao_execucao'),'') is null
    or nullif(v_manifesto->>'execucao_id','') is null or nullif(v_manifesto->>'responsavel_id','') is null then
    raise exception 'Motivo, autorização específica, responsável ou UUID fixo ausente.';
  end if;
  if nullif(btrim(v_manifesto#>>'{decisoes_humanas,origem_natureza_entradas}'),'') is null
    or nullif(btrim(v_manifesto#>>'{decisoes_humanas,pendencias_conhecidas}'),'') is null
    or nullif(btrim(v_manifesto#>>'{decisoes_humanas,limitacoes_historicas}'),'') is null
    or coalesce(v_manifesto#>>'{decisoes_humanas,dinheiro_sob_responsabilidade}','') not in ('sim','nao','nao_comprovado')
    or v_manifesto#>>'{avaliacao_pendencias,estado}' is distinct from 'concluida'
    or nullif(btrim(v_manifesto#>>'{avaliacao_pendencias,plano_responsabilidade}'),'') is null
    or v_manifesto#>>'{avaliacao_pendencias,tratamento_custodia_definido}' is distinct from 'true' then
    raise exception 'Decisões/avaliação de obrigações e custódia pendentes. Desconhecido não significa zero.';
  end if;
  if not exists(select 1 from pg_catalog.pg_roles where rolname=current_user and (rolsuper or rolbypassrls)) then
    raise exception 'Abrangência insuficiente; não alterar role ou RLS.';
  end if;
  -- Mesmo lock da RPC de abertura. Janela sem writers/transactions antigos é pré-condição externa.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('financeiro_abrir_caixa:'||v_clinica::text,0));
  -- Impede INSERT/UPDATE/DELETE/TRUNCATE/DDL concorrentes durante a transação.
  -- Escopo de LOCK é a relação inteira: pausa gravações de AMBAS as clínicas nestas tabelas.
  -- Não cancela sessões nem drena writers sozinho. Timeout/deadlock => rollback, nunca contornar.
  lock table ${travaTabelas} in share row exclusive mode;
  ${f.contexto}
  perform 1 from public.sessoes_caixa where id=v_sessao and clinica_id=v_clinica for update;
  if not exists(select 1 from public.usuarios u join public.usuarios_clinicas uc on uc.usuario_id=u.id
    where u.id=(v_manifesto->>'responsavel_id')::uuid and u.ativo and uc.ativo and uc.clinica_id=v_clinica
    and uc.papel='proprietaria') then raise exception 'Responsável sem vínculo ativo de proprietária.'; end if;
  if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.sessoes_caixa'::regclass
    and tgname='trg_audit_sessoes_caixa' and tgenabled in ('O','A') and not tgisinternal)
    or not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.auditoria'::regclass
    and tgname='trg_auditoria_imutavel' and tgenabled in ('O','A') and not tgisinternal) then
    raise exception 'Triggers esperadas ausentes/inativas.';
  end if;
  if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.entradas_caixa'::regclass
    and tgname='entradas_caixa_legado_administrativo' and tgenabled in ('O','A') and not tgisinternal
    and tgfoid=to_regprocedure('private.financeiro_proteger_entrada_legado_administrativo()')) then
    raise exception 'Proteção de escritores privilegiados ausente: adaptação mínima deve ser revisada/homologada/aprovada.';
  end if;
  ${f.inventariar}
  if v_snapshot is distinct from v_manifesto->'snapshot' or v_catalogo is distinct from v_manifesto->>'catalogo_md5' then
    raise exception 'Inventário/catálogo mudou; refazer leitura e revisão.';
  end if;
  for v_reg in select key tabela,value item from jsonb_each(v_snapshot) loop
    if v_reg.tabela<>'entradas_caixa' and (v_reg.item->>'quantidade')::bigint<>0 then raise exception 'Novo vínculo moderno em %.',v_reg.tabela; end if;
  end loop;
  select * into v_evento from public.eventos_auditoria_financeira where id=(v_manifesto->>'execucao_id')::uuid;
  if found then
    if v_evento.clinica_id is distinct from v_clinica or v_evento.entidade_id is distinct from v_sessao
      or v_evento.entidade is distinct from 'sessao_caixa' or v_evento.acao is distinct from 'encerrar_caixa_legado_administrativamente'
      or v_evento.usuario_id is distinct from (v_manifesto->>'responsavel_id')::uuid
      or v_evento.papel::text is distinct from 'proprietaria' or v_evento.valor is not null
      or v_evento.motivo is distinct from v_manifesto->>'motivo' or v_evento.dados->'manifesto' is distinct from v_manifesto
      or v_evento.dados->>'natureza' is distinct from 'administrativo'
      or v_evento.dados->>'conciliacao_financeira' is distinct from 'nao_comprovada'
      or v_evento.estado_anterior is distinct from v_manifesto->'sessao_original' or v_evento.estado_novo is distinct from v_antes
      or v_antes->>'status' is distinct from 'fechado' or v_antes->>'fechado_em' is null
      or v_antes->>'fechado_por' is distinct from v_manifesto->>'responsavel_id' then raise exception 'Evento/estado conflitante: não repetir nem reabrir.'; end if;
    v_auditoria_nova_id := v_evento.dados->'auditoria_nova_id';
    if v_auditoria_nova_id is null or v_auditoria_nova_id='null'::jsonb then raise exception 'Evento sem referência auditável.'; end if;
    select to_jsonb(a) into v_auditoria_nova from public.auditoria a where to_jsonb(a.id)=v_auditoria_nova_id;
    if v_auditoria_nova is null or md5(v_auditoria_nova::text) is distinct from v_evento.dados->>'auditoria_nova_md5' then raise exception 'Auditoria da execução divergente.'; end if;
    ${auditarOriginais}
    raise notice 'MESMA_EXECUCAO_JA_CONCLUIDA: originais/evento verificados, sem nova escrita; novas sessões posteriores preservadas.';
    return;
  end if;
  if v_antes is distinct from v_manifesto->'sessao_original' or v_antes->>'status' is distinct from 'aberto'
    or v_antes->>'fechado_por' is not null or v_antes->>'fechado_em' is not null
    or v_antes->>'valor_esperado' is not null or v_antes->>'valor_contado' is not null or v_antes->>'diferenca' is not null then
    raise exception 'Sessão/contagem/estado mudou desde o inventário.';
  end if;
  if exists(select 1 from public.sessoes_caixa where clinica_id=v_clinica and id<>v_sessao
    and status in ('aberto','em_fechamento','aguardando_aprovacao','devolvido_para_correcao')) then raise exception 'Outra sessão ativa.'; end if;
  ${auditarOriginais}
  select coalesce(jsonb_agg(to_jsonb(a.id)),'[]') into v_auditoria_ids from public.auditoria a where (${escopoAuditoria});
  perform pg_catalog.set_config('audit.motivo',v_manifesto->>'motivo',true);
  update public.sessoes_caixa set status='fechado',fechado_por=(v_manifesto->>'responsavel_id')::uuid,fechado_em=transaction_timestamp()
    where id=v_sessao and clinica_id=v_clinica and status='aberto' and idempotency_key is null;
  get diagnostics v_linhas=row_count;
  if v_linhas<>1 then raise exception 'Esperada exatamente uma sessão.'; end if;
  select to_jsonb(s) into v_depois from public.sessoes_caixa s where id=v_sessao and clinica_id=v_clinica;
  if (v_antes - array['status','fechado_por','fechado_em']) is distinct from (v_depois - array['status','fechado_por','fechado_em']) then
    raise exception 'Campo não autorizado alterado por trigger: rollback.';
  end if;
  select count(*) into v_linhas from public.auditoria a where (${escopoAuditoria}) and not v_auditoria_ids @> jsonb_build_array(a.id);
  if v_linhas<>1 then raise exception 'Esperado exatamente um novo evento de auditoria geral.'; end if;
  select to_jsonb(a) into v_auditoria_nova from public.auditoria a where (${escopoAuditoria}) and not v_auditoria_ids @> jsonb_build_array(a.id);
  v_auditoria_nova_id := v_auditoria_nova->'id';
  if v_auditoria_nova->>'acao' is distinct from 'UPDATE' or v_auditoria_nova->>'entidade' is distinct from 'sessoes_caixa'
    or v_auditoria_nova->>'entidade_id' is distinct from v_sessao::text or v_auditoria_nova->>'clinica_id' is distinct from v_clinica::text
    or v_auditoria_nova->'dados_antes' is distinct from v_antes or v_auditoria_nova->'dados_depois' is distinct from v_depois
    or v_auditoria_nova->>'motivo' is distinct from v_manifesto->>'motivo' then raise exception 'Auditoria nova não representa o encerramento.'; end if;
  insert into public.eventos_auditoria_financeira(id,clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,estado_anterior,estado_novo,dados,motivo)
    values((v_manifesto->>'execucao_id')::uuid,v_clinica,(v_manifesto->>'responsavel_id')::uuid,'proprietaria',
      'encerrar_caixa_legado_administrativamente','sessao_caixa',v_sessao,null,v_antes,v_depois,
      jsonb_build_object('natureza','administrativo','conciliacao_financeira','nao_comprovada','contagem_historica','nao_comprovada',
        'executor_sql',current_user,'login_sql',session_user,'identidade_auth',auth.uid(),
        'auditoria_nova_id',v_auditoria_nova_id,'auditoria_nova_md5',md5(v_auditoria_nova::text),'manifesto',v_manifesto),v_manifesto->>'motivo');
  ${auditarOriginais}
  v_snapshot := '{}'::jsonb;
  ${f.inventariar}
  if v_snapshot is distinct from v_manifesto->'snapshot' or v_catalogo is distinct from v_manifesto->>'catalogo_md5' then raise exception 'Pós-condição de preservação falhou.'; end if;
  if exists(select 1 from public.sessoes_caixa where clinica_id=v_clinica and status in ('aberto','em_fechamento','aguardando_aprovacao','devolvido_para_correcao')) then raise exception 'Sessão ativa permaneceu.'; end if;
  raise notice 'CANDIDATO_ADMINISTRATIVO_VERIFICADO; sem conciliação, quitação ou próxima abertura automática.';
end $candidato$;
-- Principal permanece NÃO AUTORIZADO. Não trocar por COMMIT. Criar futuro artefato aprovado separado.
rollback;
`;
  return sql;
}

export function gerarPosVerificacao(m) {
  const alvo = `'${JSON.stringify({ clinica_id: ALVO.clinica_id, sessao_id: ALVO.sessao_id, execucao_id: m.execucao_id, snapshot: m.snapshot, auditoria_fingerprints: m.auditoria_fingerprints }).replaceAll("'", "''")}'::jsonb`;
  return `-- SOMENTE LEITURA após futura execução APROVADA. Hoje execucao_id continua NULL.
-- Confirmar projeto/canal/branch antes de consultar; não comprova quitação ou contagem.
begin isolation level repeatable read read only;
with parametros as (select ${alvo} m),
alvo as (select (m->>'clinica_id')::uuid clinica,(m->>'sessao_id')::uuid sessao,(m->>'execucao_id')::uuid execucao,m from parametros),
contexto as (select current_setting('transaction_read_only') ro,
 exists(select 1 from pg_roles where rolname=current_user and (rolsuper or rolbypassrls)) abrangencia),
s as (select to_jsonb(s) estado from public.sessoes_caixa s,alvo p where s.id=p.sessao and s.clinica_id=p.clinica),
e as (select e.* from public.eventos_auditoria_financeira e,alvo p where e.id=p.execucao and e.clinica_id=p.clinica and e.entidade_id=p.sessao),
a as (select a.* from public.auditoria a,alvo p where a.entidade_id=p.sessao::text
 or a.dados_antes->>'sessao_caixa_id'=p.sessao::text or a.dados_depois->>'sessao_caixa_id'=p.sessao::text
 or a.entidade_id in(select id::text from public.entradas_caixa where sessao_caixa_id=p.sessao)),
a_original as (select jsonb_build_object('quantidade',count(*),'md5',md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'[]'))) estado
 from a where to_jsonb(a.id) is distinct from (select dados->'auditoria_nova_id' from e))
select 'contexto' secao,to_jsonb(c) dados from contexto c
union all select 'resultado',jsonb_build_object('execucao_identificada',p.execucao is not null,
 'estado_evento_compativeis',exists(select 1 from e,s where e.estado_novo=s.estado and e.estado_anterior=e.dados#>'{manifesto,sessao_original}'
 and s.estado->>'status'='fechado' and s.estado->>'fechado_por'=e.usuario_id::text and s.estado->>'fechado_em' is not null
 and e.entidade='sessao_caixa' and e.acao='encerrar_caixa_legado_administrativamente' and e.valor is null
 and e.dados->>'natureza'='administrativo' and e.dados->>'conciliacao_financeira'='nao_comprovada'),
 'auditoria_anterior_preservada',exists(select 1 from a_original where estado=p.m#>'{auditoria_fingerprints,auditoria}'),
 'auditoria_nova_integra',exists(select 1 from e join a on to_jsonb(a.id)=e.dados->'auditoria_nova_id' where md5(to_jsonb(a)::text)=e.dados->>'auditoria_nova_md5'),
 'financeiro_conciliado',false,'exige_conferencia_grafo_catalogo',true) from alvo p
union all select 'sessoes_ativas_posteriores',coalesce(jsonb_agg(jsonb_build_object('id',s.id,'status',s.status,'aberto_em',s.aberto_em) order by s.aberto_em,s.id),'[]')
 from public.sessoes_caixa s,alvo p where s.clinica_id=p.clinica and s.id<>p.sessao
 and s.status in ('aberto','em_fechamento','aguardando_aprovacao','devolvido_para_correcao');
-- Não exibir nomes/documentos/pacientes. Não repetir DML por falta de resposta.
-- Esta leitura parcial não sela preservação sozinha: repetir snapshot dos15 objetos e catálogo
-- com leitor de abrangência integral, aceitando a sessão agora fechada, e comparar ao aprovado.
rollback;
`;
}

export function gerarReinventarioPos(m) {
  const anterior = "and c.subdomain='brotas' and c.ativo and s.status='aberto'";
  const leitura = gerar(m).leitura;
  if (leitura.split(anterior).length !== 2) throw new Error('Contrato de leitura mudou: revisar pós-inventário.');
  return leitura.replace(anterior, "and c.subdomain='brotas' and c.ativo and s.status='fechado'")
    .replace('-- SOMENTE LEITURA.', '-- SOMENTE LEITURA PÓS-CANDIDATO: sessão fechada; comparar snapshot/catalogo ao aprovado.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = JSON.parse(readFileSync(join(pasta, 'manifesto-revisao.json'), 'utf8'));
  writeFileSync(join(pasta, '05-candidato.sql.disabled'), gerarCandidato(m));
  writeFileSync(join(pasta, '06-pos-candidato.sql'), gerarPosVerificacao(m));
  writeFileSync(join(pasta, '07-reinventario-pos.sql'), gerarReinventarioPos(m));
  console.log('Candidato separado BLOQUEADO e leitor pós-candidato gerados localmente. Nenhum SQL executado; 03/04 intactos.');
}

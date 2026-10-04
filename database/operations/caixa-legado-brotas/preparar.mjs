// Preparador OFFLINE. Não conecta a banco, não lê .env e não executa SQL.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const pasta = dirname(fileURLToPath(import.meta.url));
const sqlLiteral = value => `'${String(value).replaceAll("'", "''")}'`;
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
const md5 = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
export const ESCOPOS = {
  entradas_caixa: 't.sessao_caixa_id = v_sessao',
  recebimentos: 't.id in (select id from rids)',
  recebimentos_pagamentos: 't.recebimento_id in (select id from rids)',
  movimentos_caixa: 't.id in (select id from mids)',
  estornos: 't.id in (select id from eids)',
  estornos_pagamentos: 't.estorno_id in (select id from eids)',
  sangrias_caixa: 't.sessao_caixa_id = v_sessao or t.id in (select sangria_id from public.movimentos_caixa where id in (select id from mids))',
  fechamentos_caixa: 't.id in (select id from fids)',
  revisoes_fechamento_caixa: 't.fechamento_id in (select id from fids)',
  repasses: 't.id in (select id from rpids)',
  repasses_itens: 't.repasse_id in (select id from rpids) or t.recebimento_id in (select id from rids)',
  ajustes_repasse: 't.id in (select id from aids)',
  aplicacoes_ajuste_repasse: 't.ajuste_id in (select id from aids) or t.repasse_id in (select id from rpids)',
  documentos_fiscais: 't.id in (select id from dids)',
  tentativas_documento_fiscal: 't.documento_fiscal_id in (select id from dids)',
};
const modernas = Object.keys(ESCOPOS).filter(t => t !== 'entradas_caixa');
const flags = ['catalogo_revisado', 'canal_projeto_confirmados', 'abrangencia_confirmada', 'inventario_completo', 'vinculos_conferidos', 'originais_cruzados', 'escritores_antigos_controlados', 'homologacao_postgresql_isolado', 'backup_recuperacao_verificados'];
export function validarPreparo(m) {
  const erros = [];
  if (m.estado !== 'EM_REVISAO_CONCLUIDA') erros.push('Estado do preparo bloqueado.');
  if (m.project_ref !== 'xftnkusbyqzyvzrovroj' || m.clinica_subdomain !== 'brotas') erros.push('Projeto/clínica divergentes.');
  for (const campo of ['clinica_id', 'sessao_id', 'responsavel_id', 'execucao_id']) if (!uuid(m[campo])) erros.push(`${campo} não confirmado.`);
  for (const flag of flags) if (m[flag] !== true) erros.push(`${flag} pendente.`);
  const s = m.sessao_original;
  if (!s || s.id !== m.sessao_id || s.clinica_id !== m.clinica_id || s.status !== 'aberto' || s.idempotency_key !== null || !s.aberto_em || s.valor_abertura == null) erros.push('Snapshot da sessão legada incompleto/divergente.');
  if (s && ['fechado_por', 'fechado_em', 'valor_esperado', 'valor_contado', 'diferenca'].some(c => s[c] !== null)) erros.push('Sessão já tem dados de encerramento/conferência; revisão separada.');
  if (!md5(m.catalogo_md5)) erros.push('Catálogo atual não confirmado.');
  for (const tabela of Object.keys(ESCOPOS)) {
    const item = m.snapshot?.[tabela];
    if (!item || !Number.isSafeInteger(item.quantidade) || item.quantidade < 0 || !md5(item.md5)) erros.push(`Inventário integral de ${tabela} ausente.`);
    else if (modernas.includes(tabela) && item.quantidade !== 0) erros.push(`Relação moderna em ${tabela}: recorte administrativo simples bloqueado.`);
  }
  if (!m.motivo?.trim() || !m.autorizacao_execucao?.trim()) erros.push('Motivo/autorização futura ausentes.');
  const d = m.decisoes_humanas;
  if (!d?.origem_natureza_entradas?.trim() || !d?.pendencias_conhecidas?.trim() || !d?.limitacoes_historicas?.trim() || !['sim', 'nao', 'nao_comprovado'].includes(d?.dinheiro_sob_responsabilidade)) erros.push('Decisões humanas não registradas; desconhecido não significa zero.');
  return erros;
}

const ctes = `with
rids as (select id from public.recebimentos where sessao_caixa_id = $1
  union select recebimento_id from public.movimentos_caixa where sessao_caixa_id = $1 and recebimento_id is not null),
eids as (select id from public.estornos where recebimento_id in (select id from rids)
  union select estorno_id from public.movimentos_caixa where sessao_caixa_id = $1 and estorno_id is not null),
mids as (select id from public.movimentos_caixa where sessao_caixa_id = $1
  or recebimento_id in (select id from rids) or estorno_id in (select id from eids)),
fids as (select id from public.fechamentos_caixa where sessao_caixa_id = $1),
rpids as (select id from public.repasses where sessao_caixa_id = $1 or fechamento_id in (select id from fids)
  or id in (select repasse_id from public.repasses_itens where recebimento_id in (select id from rids))),
aids as (select id from public.ajustes_repasse where estorno_id in (select id from eids) or repasse_origem_id in (select id from rpids)),
dids as (select id from public.documentos_fiscais where recebimento_id in (select id from rids))`;

const tabelasCatalogo = [...Object.keys(ESCOPOS), 'sessoes_caixa', 'auditoria', 'eventos_auditoria_financeira', 'clinicas', 'usuarios', 'usuarios_clinicas'];
const tabelasArray = `array[${tabelasCatalogo.map(sqlLiteral).join(',')}]`;
// Inclui catálogo de entrada (FKs adicionais), corpos dos triggers, ACLs, RLS e enum.
const catalogo = `with objs as (select c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname=any(${tabelasArray})), itens as (
  select 'tabela:'||relname chave, jsonb_build_object('rls',relrowsecurity,'force',relforcerowsecurity,'acl',relacl)::text valor from objs
  union all select 'coluna:'||a.attrelid::regclass::text||':'||a.attnum, jsonb_build_object('nome',a.attname,'tipo',pg_catalog.format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid))::text
    from pg_catalog.pg_attribute a left join pg_catalog.pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid in(select oid from objs) and a.attnum>0 and not a.attisdropped
  union all select 'constraint:'||c.conrelid::regclass::text||':'||c.conname,pg_catalog.pg_get_constraintdef(c.oid)||':'||c.convalidated::text from pg_catalog.pg_constraint c where c.conrelid in(select oid from objs) or c.confrelid in(select oid from objs)
  union all select 'indice:'||i.indexrelid::regclass::text,pg_catalog.pg_get_indexdef(i.indexrelid)||':'||i.indisvalid::text from pg_catalog.pg_index i where i.indrelid in(select oid from objs)
  union all select 'trigger:'||t.tgrelid::regclass::text||':'||t.tgname,pg_catalog.pg_get_triggerdef(t.oid)||':'||t.tgenabled::text from pg_catalog.pg_trigger t where t.tgrelid in(select oid from objs) and not t.tgisinternal
  union all select 'funcao:'||p.oid::regprocedure::text,pg_catalog.pg_get_functiondef(p.oid)||':'||coalesce(p.proacl::text,'') from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where p.prokind='f' and (p.oid in(select tgfoid from pg_catalog.pg_trigger where tgrelid in(select oid from objs)) or (n.nspname in ('public','private') and p.proname like 'financeiro_%'))
  union all select 'policy:'||p.polrelid::regclass::text||':'||p.polname,jsonb_build_object('cmd',polcmd,'roles',polroles,'permissiva',polpermissive,'using',pg_catalog.pg_get_expr(polqual,polrelid),'check',pg_catalog.pg_get_expr(polwithcheck,polrelid))::text from pg_catalog.pg_policy p where polrelid in(select oid from objs)
  union all select 'enum:'||e.enumsortorder::text,e.enumlabel from pg_catalog.pg_enum e where e.enumtypid='public.status_sessao_caixa'::regtype
) select pg_catalog.md5(coalesce(jsonb_agg(jsonb_build_array(chave,valor) order by chave)::text,'[]')) from itens`;

const declarar = m => `v_manifesto jsonb := ${sqlLiteral(JSON.stringify(m))}::jsonb;
  v_sessao uuid := nullif(v_manifesto->>'sessao_id','')::uuid;
  v_clinica uuid := nullif(v_manifesto->>'clinica_id','')::uuid;
  v_antes jsonb; v_depois jsonb; v_snapshot jsonb := '{}'::jsonb;
  v_item jsonb; v_reg record; v_sql text; v_catalogo text; v_linhas integer;
  v_evento public.eventos_auditoria_financeira%rowtype;`;
const contexto = `if v_sessao is null or v_clinica is null then raise exception 'BLOQUEADO: UUIDs não confirmados; executar primeiro 01-catalogo pelo canal oficial.'; end if;
  if not exists(select 1 from pg_catalog.pg_roles where rolname=current_user and (rolsuper or rolbypassrls)) then
    raise exception 'ABRANGENCIA INSUFICIENTE: role sujeita a RLS. Não interpretar vazio como ausência.';
  end if;
  if not exists(select 1 from public.clinicas where id=v_clinica and subdomain='brotas' and ativo) then raise exception 'Clinica incorreta/inativa.'; end if;
  select to_jsonb(s) into v_antes from public.sessoes_caixa s where s.id=v_sessao and s.clinica_id=v_clinica;
  if v_antes is null then raise exception 'Sessao exata não encontrada.'; end if;
  if v_antes->>'idempotency_key' is not null then raise exception 'Sessao moderna: procedimento proibido.'; end if;`;
const inventariar = `for v_reg in select key tabela,value #>> '{}' filtro from jsonb_each(${sqlLiteral(JSON.stringify(ESCOPOS))}::jsonb) order by key loop
    if not pg_catalog.has_table_privilege(current_user,'public.'||v_reg.tabela,'SELECT') then raise exception 'Sem leitura integral de %',v_reg.tabela; end if;
    v_sql := ${sqlLiteral(ctes)} || format(' select jsonb_build_object(''quantidade'',count(*),''md5'',pg_catalog.md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,''[]''))) from public.%I t where %s',v_reg.tabela,replace(v_reg.filtro,'v_sessao','$1'));
    execute v_sql into v_item using v_sessao;
    v_snapshot := v_snapshot || jsonb_build_object(v_reg.tabela,v_item);
  end loop;
  ${catalogo.replace('select pg_catalog.md5', 'select pg_catalog.md5').replace(' from itens', ' into v_catalogo from itens')};`;
const cabecalho = `-- RASCUNHO LOCAL. NÃO APLICADO. Confirmar project ref na URL e no .env antes de SQL.
-- Único canal real: Chrome/Supabase + extensão Claude Code, projeto xftnkusbyqzyvzrovroj.
-- Não contém credenciais. MD5 detecta mudanças do snapshot; não é prova de autorização.
`;

// Fragmentos compartilhados para o candidato separado. Exportar não executa SQL.
// O CLI histórico continua sempre gerando 03 com trava falsa; não rodá-lo nesta etapa.
export function fragmentosCandidato(m) {
  return { declarar: declarar(m), contexto, inventariar, flags: [...flags], tabelasCatalogo: [...tabelasCatalogo] };
}

export function gerar(m) {
  // SELECT único: SQL Editor exibe/exporta todas as seções, sem depender de NOTICE
  // ou do último resultado de um lote. Falha de contexto é explícita, nunca "vazio".
  const sessaoLiteral = m.sessao_id == null ? 'null' : sqlLiteral(m.sessao_id);
  const clinicaLiteral = m.clinica_id == null ? 'null' : sqlLiteral(m.clinica_id);
  const grafoLeitura = ctes.replaceAll('$1', `${sessaoLiteral}::uuid`);
  const linhasSnapshot = Object.entries(ESCOPOS).map(([t, filtro]) =>
    `select ${sqlLiteral(t)} tabela,jsonb_build_object('quantidade',count(*),'md5',pg_catalog.md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]'))) dados from public.${t} t where (${filtro.replaceAll('v_sessao', `${sessaoLiteral}::uuid`)}) and exists(select 1 from contexto where valido)`
  ).join('\nunion all\n');
  const leitura = `-- SOMENTE LEITURA. Canal IAB autorizado exclusivamente para este inventário em 04/10/2026.
-- Confirmar xftnkusbyqzyvzrovroj/main na interface. Não executar o arquivo 03.disabled.
-- Contexto.valido deve ser true; caso contrário nenhum vazio comprova ausência.
begin isolation level repeatable read read only;
set local statement_timeout='60s';
${grafoLeitura},
contexto as (select current_user::text usuario_sql,current_setting('transaction_read_only') somente_leitura,
  (exists(select 1 from pg_catalog.pg_roles where rolname=current_user and (rolsuper or rolbypassrls))
   and exists(select 1 from public.sessoes_caixa s join public.clinicas c on c.id=s.clinica_id
      where s.id=${sessaoLiteral}::uuid and s.clinica_id=${clinicaLiteral}::uuid
      and c.subdomain='brotas' and c.ativo and s.status='aberto' and s.idempotency_key is null)
   and not exists(select 1 from unnest(${tabelasArray}) nome where not pg_catalog.has_table_privilege(current_user,'public.'||nome,'SELECT'))) valido),
snaps as (${linhasSnapshot}),
entradas as (select e.id,e.clinica_id,e.forma_pagamento,(e.valor*100)::bigint valor_centavos,e.registrado_em,e.registrado_por,
  exists(select 1 from public.pacientes p where p.id=e.paciente_id and p.clinica_id=e.clinica_id) paciente_contexto_valido,
  exists(select 1 from public.profissionais_clinicas pc where pc.profissional_id=e.profissional_id and pc.clinica_id=e.clinica_id) profissional_contexto_valido
 from public.entradas_caixa e where e.sessao_caixa_id=${sessaoLiteral}::uuid),
recebimentos_detalhes as (select r.id,r.clinica_id,r.sessao_caixa_id,r.status,(r.valor_bruto*100)::bigint bruto_centavos,r.registrado_em,
 (select count(*) from public.recebimentos_pagamentos p where p.recebimento_id=r.id) parcelas_quantidade,
 (select sum(p.valor*100)::bigint from public.recebimentos_pagamentos p where p.recebimento_id=r.id) parcelas_centavos
 from public.recebimentos r where r.id in(select id from rids)),
movimentos_detalhes as (select m.id,m.clinica_id,m.sessao_caixa_id,m.tipo,(m.valor*100)::bigint valor_centavos,m.recebimento_id,m.estorno_id,m.sangria_id,m.registrado_em
 from public.movimentos_caixa m where m.id in(select id from mids)),
auditoria_alvo as (select a.* from public.auditoria a where a.entidade_id=${sessaoLiteral}
 or a.entidade_id in(select id::text from entradas)
 or a.dados_antes->>'sessao_caixa_id'=${sessaoLiteral} or a.dados_depois->>'sessao_caixa_id'=${sessaoLiteral}),
auditoria_detalhes as (select a.id,a.clinica_id,a.acao,a.entidade,a.entidade_id,a.usuario_id,a.created_at from auditoria_alvo a),
eventos_alvo as (select a.* from public.eventos_auditoria_financeira a where a.entidade_id=${sessaoLiteral}::uuid
 or a.dados->>'sessao_caixa_id'=${sessaoLiteral} or a.entidade_id in(select id from rids)),
eventos_detalhes as (select a.id,a.clinica_id,a.acao,a.entidade,a.entidade_id,a.usuario_id,a.created_at from eventos_alvo a)
select 'contexto' secao,to_jsonb(c) dados from contexto c
union all select 'sessao_original',to_jsonb(s) from public.sessoes_caixa s where s.id=${sessaoLiteral}::uuid and s.clinica_id=${clinicaLiteral}::uuid and exists(select 1 from contexto where valido)
union all select 'snapshot',jsonb_object_agg(tabela,dados order by tabela) from snaps where exists(select 1 from contexto where valido)
union all select 'catalogo_md5',to_jsonb((${catalogo})) where exists(select 1 from contexto where valido)
union all select 'entradas',coalesce(jsonb_agg(to_jsonb(e) order by e.registrado_em,e.id),'[]') from entradas e where exists(select 1 from contexto where valido)
union all select 'entradas_por_forma',coalesce(jsonb_agg(to_jsonb(x) order by forma_pagamento),'[]') from (select forma_pagamento,count(*) quantidade,sum(valor_centavos)::bigint total_registrado_centavos from entradas where exists(select 1 from contexto where valido) group by forma_pagamento) x
union all select 'recebimentos',coalesce(jsonb_agg(to_jsonb(r) order by r.registrado_em,r.id),'[]') from recebimentos_detalhes r where exists(select 1 from contexto where valido)
union all select 'movimentos',coalesce(jsonb_agg(to_jsonb(m) order by m.registrado_em,m.id),'[]') from movimentos_detalhes m where exists(select 1 from contexto where valido)
union all select 'auditoria',coalesce(jsonb_agg(to_jsonb(a) order by a.created_at,a.id),'[]') from auditoria_detalhes a where exists(select 1 from contexto where valido)
union all select 'eventos_financeiros',coalesce(jsonb_agg(to_jsonb(a) order by a.created_at,a.id),'[]') from eventos_detalhes a where exists(select 1 from contexto where valido)
union all select 'auditoria_fingerprints',jsonb_build_object(
 'auditoria',(select jsonb_build_object('quantidade',count(*),'md5',md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'[]'))) from auditoria_alvo a),
 'eventos_financeiros',(select jsonb_build_object('quantidade',count(*),'md5',md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'[]'))) from eventos_alvo a)) where exists(select 1 from contexto where valido);
-- Valores registrados não comprovam dinheiro físico. Não somar pai, parcelas e movimentos.
-- Se houver relação moderna, ampliar auditoria para todos os IDs antes de concluir.
rollback;
`;
  const alteracao = `${cabecalho}-- EXTENSAO .disabled + trava incondicional + parâmetros pendentes + ROLLBACK final.
-- Somente revisão. Gerar outro arquivo após inventário, homologação e aprovação futura.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $encerramento$ declare
  v_permitir_execucao constant boolean := false;
  ${declarar(m)}
begin
  if not v_permitir_execucao then raise exception 'PREPARO BLOQUEADO: encerramento não autorizado/homologado; nenhum DML permitido.'; end if;
  if v_manifesto->>'estado' is distinct from 'EM_REVISAO_CONCLUIDA'
    or v_manifesto->>'project_ref' is distinct from 'xftnkusbyqzyvzrovroj'
    or v_manifesto->>'clinica_subdomain' is distinct from 'brotas' then raise exception 'Manifesto inválido.'; end if;
  for v_reg in select jsonb_array_elements_text(${sqlLiteral(JSON.stringify(flags))}::jsonb) flag loop
    if v_manifesto->>v_reg.flag is distinct from 'true' then raise exception 'Pré-condição pendente: %',v_reg.flag; end if;
  end loop;
  if nullif(btrim(v_manifesto->>'motivo'),'') is null or nullif(btrim(v_manifesto->>'autorizacao_execucao'),'') is null
    or nullif(v_manifesto->>'execucao_id','') is null or nullif(v_manifesto->>'responsavel_id','') is null then raise exception 'Motivo/responsável/autorização/identificador pendentes.'; end if;
  if nullif(btrim(v_manifesto#>>'{decisoes_humanas,origem_natureza_entradas}'),'') is null
    or nullif(btrim(v_manifesto#>>'{decisoes_humanas,pendencias_conhecidas}'),'') is null
    or nullif(btrim(v_manifesto#>>'{decisoes_humanas,limitacoes_historicas}'),'') is null
    or coalesce(v_manifesto#>>'{decisoes_humanas,dinheiro_sob_responsabilidade}','') not in ('sim','nao','nao_comprovado') then raise exception 'Decisões humanas incompletas.'; end if;
  ${contexto}
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('financeiro_abrir_caixa:'||v_clinica::text,0));
  perform 1 from public.sessoes_caixa where id=v_sessao and clinica_id=v_clinica for update;
  perform 1 from public.entradas_caixa where sessao_caixa_id=v_sessao order by id for update;
  perform 1 from public.clinicas where id=v_clinica for share;
  perform 1 from public.usuarios u join public.usuarios_clinicas uc on uc.usuario_id=u.id
    where u.id=(v_manifesto->>'responsavel_id')::uuid and uc.clinica_id=v_clinica for share of u,uc;
  -- Janela sem escritores antigos continua obrigatória: advisory lock não obriga código antigo.
  select to_jsonb(s) into v_antes from public.sessoes_caixa s where id=v_sessao and clinica_id=v_clinica;
  if not exists(select 1 from public.usuarios u join public.usuarios_clinicas uc on uc.usuario_id=u.id
    where u.id=(v_manifesto->>'responsavel_id')::uuid and u.ativo and uc.ativo and uc.clinica_id=v_clinica and uc.papel='proprietaria') then raise exception 'Responsável sem vínculo autorizado ativo.'; end if;
  if v_antes->>'idempotency_key' is not null then raise exception 'Sessão moderna proibida.'; end if;
  select * into v_evento from public.eventos_auditoria_financeira where id=(v_manifesto->>'execucao_id')::uuid;
  if found then
    if v_evento.clinica_id=v_clinica and v_evento.entidade_id=v_sessao and v_evento.entidade='sessao_caixa'
      and v_evento.acao='encerrar_caixa_legado_administrativamente' and v_antes->>'status'='fechado'
      and v_evento.usuario_id=(v_manifesto->>'responsavel_id')::uuid
      and v_evento.motivo=v_manifesto->>'motivo' and v_evento.dados->'manifesto' = v_manifesto
      and v_evento.estado_anterior=v_manifesto->'sessao_original' and v_evento.estado_novo=v_antes then
      raise notice 'MESMA_EXECUCAO_JA_CONCLUIDA: nenhuma nova escrita.'; return;
    end if;
    raise exception 'Identificador/estado divergente: não repetir nem reabrir.';
  end if;
  if v_antes is distinct from v_manifesto->'sessao_original' or v_antes->>'status' <> 'aberto' then raise exception 'Sessão mudou desde o inventário.'; end if;
  if (v_antes - array['fechado_por','fechado_em','valor_esperado','valor_contado','diferenca']) = v_antes
    or v_antes->>'fechado_por' is not null or v_antes->>'fechado_em' is not null
    or v_antes->>'valor_esperado' is not null or v_antes->>'valor_contado' is not null or v_antes->>'diferenca' is not null then raise exception 'Dados prévios de fechamento/conferência exigem revisão específica.'; end if;
  if exists(select 1 from public.sessoes_caixa where clinica_id=v_clinica and id<>v_sessao and status in ('aberto','em_fechamento','aguardando_aprovacao','devolvido_para_correcao')) then raise exception 'Outra sessão ativa na clínica.'; end if;
  if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.sessoes_caixa'::regclass
    and tgname='trg_audit_sessoes_caixa' and tgenabled in ('O','A') and not tgisinternal)
    or not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.auditoria'::regclass
    and tgname='trg_auditoria_imutavel' and tgenabled in ('O','A') and not tgisinternal) then raise exception 'Auditoria geral esperada ausente/inativa: revisar modelo.'; end if;
  ${inventariar}
  if v_snapshot is distinct from v_manifesto->'snapshot' or v_catalogo is distinct from v_manifesto->>'catalogo_md5' then raise exception 'Inventário/catálogo mudou: abortar e refazer leitura.'; end if;
  for v_reg in select key tabela,value item from jsonb_each(v_snapshot) loop
    if v_reg.tabela<>'entradas_caixa' and (v_reg.item->>'quantidade')::bigint<>0 then raise exception 'Relação moderna em %: não encerrar pelo recorte simples.',v_reg.tabela; end if;
  end loop;
  update public.sessoes_caixa set status='fechado',fechado_por=(v_manifesto->>'responsavel_id')::uuid,fechado_em=transaction_timestamp()
    where id=v_sessao and clinica_id=v_clinica and status='aberto' and idempotency_key is null;
  get diagnostics v_linhas=row_count;
  if v_linhas<>1 then raise exception 'Esperada exatamente uma sessão.'; end if;
  select to_jsonb(s) into v_depois from public.sessoes_caixa s where id=v_sessao and clinica_id=v_clinica;
  if (v_antes - array['status','fechado_por','fechado_em']) is distinct from (v_depois - array['status','fechado_por','fechado_em']) then raise exception 'Trigger alterou campo não autorizado: rollback.'; end if;
  insert into public.eventos_auditoria_financeira(id,clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,estado_anterior,estado_novo,dados,motivo)
    values((v_manifesto->>'execucao_id')::uuid,v_clinica,(v_manifesto->>'responsavel_id')::uuid,'proprietaria',
      'encerrar_caixa_legado_administrativamente','sessao_caixa',v_sessao,null,v_antes,v_depois,
      jsonb_build_object('natureza','administrativo','conciliacao_financeira','nao_comprovada','contagem_historica','nao_comprovada',
        'executor_sql',current_user,'login_sql',session_user,'identidade_auth',auth.uid(),'manifesto',v_manifesto),v_manifesto->>'motivo');
  -- Auditoria geral do trigger permanece ativa. Não configurar claims/JWT para inventar executor.
  v_snapshot := '{}'::jsonb;
  ${inventariar}
  if v_snapshot is distinct from v_manifesto->'snapshot' or v_catalogo is distinct from v_manifesto->>'catalogo_md5' then raise exception 'Originais/relações/catálogo alterados durante execução.'; end if;
  if exists(select 1 from public.sessoes_caixa where clinica_id=v_clinica and status in ('aberto','em_fechamento','aguardando_aprovacao','devolvido_para_correcao')) then raise exception 'Sessão ativa permaneceu: revisar.'; end if;
  raise notice 'PRE_VERIFICACOES_E_POS_VERIFICACOES_OK: sem abertura automática.';
end $encerramento$;
-- NÃO substituir por COMMIT nesta etapa. Nunca executar este rascunho no principal.
rollback;
`;
  const pos = `${cabecalho}-- Somente leitura após eventual execução futura; sem nova abertura.
begin isolation level repeatable read read only;
set local statement_timeout='60s';
do $pos$ declare ${declarar(m)} begin
  ${contexto}
  ${inventariar}
  select * into v_evento from public.eventos_auditoria_financeira where id=(v_manifesto->>'execucao_id')::uuid;
  if not found then raise exception 'Sem evento desta execução: não afirmar encerramento persistido.'; end if;
  if v_evento.clinica_id is distinct from v_clinica or v_evento.entidade_id is distinct from v_sessao
    or v_evento.acao <> 'encerrar_caixa_legado_administrativamente'
    or v_evento.dados->'manifesto' is distinct from v_manifesto
    or v_evento.estado_anterior is distinct from v_manifesto->'sessao_original'
    or v_evento.estado_novo is distinct from v_antes or v_antes->>'status' <> 'fechado'
    or v_antes->>'fechado_por' is distinct from v_manifesto->>'responsavel_id'
    or v_antes->>'fechado_em' is null then raise exception 'Sessão/evento divergentes.'; end if;
  if (v_antes - array['status','fechado_por','fechado_em']) is distinct from (v_evento.estado_anterior - array['status','fechado_por','fechado_em'])
    or v_snapshot is distinct from v_manifesto->'snapshot' or v_catalogo is distinct from v_manifesto->>'catalogo_md5' then raise exception 'Originais ou catálogo divergentes do aprovado.'; end if;
  raise notice 'ENCERRAMENTO_ADMINISTRATIVO_COMPROVADO_POR_ESTADO_E_EVENTO; contagem/conciliação permanecem não comprovadas.';
  raise notice 'SNAPSHOT_POS=%',v_snapshot;
end $pos$;
select s.id,s.status,s.aberto_em,s.fechado_em,s.idempotency_key from public.sessoes_caixa s
where s.clinica_id=${sqlLiteral(m.clinica_id ?? '')}::uuid and s.status in ('aberto','em_fechamento','aguardando_aprovacao','devolvido_para_correcao') order by s.aberto_em,s.id;
-- Nova sessão posterior é operação separada. Não encerrá-la nem interpretar sua presença como reversão.
select a.id,a.acao,a.entidade,a.entidade_id,a.usuario_id,a.created_at from public.auditoria a
where a.entidade='sessoes_caixa' and a.entidade_id=${sqlLiteral(m.sessao_id ?? '')} order by a.created_at,a.id;
rollback;
`;
  return { leitura, alteracao, pos };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = JSON.parse(readFileSync(join(pasta, 'manifesto-revisao.json'), 'utf8'));
  const { leitura, alteracao, pos } = gerar(m);
  writeFileSync(join(pasta, '02-inventario.sql'), leitura);
  writeFileSync(join(pasta, '03-encerramento.sql.disabled'), alteracao);
  writeFileSync(join(pasta, '04-pos-verificacoes.sql'), pos);
  console.log('Arquivos locais preparados; nenhum SQL executado.');
  console.log(`Pendências de preparo: ${validarPreparo(m).length}. Trava SQL permanece falsa em qualquer manifesto.`);
}

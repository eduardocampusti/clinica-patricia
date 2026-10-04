// Gera somente SELECT/READ ONLY para a exportação oficial do SQL Editor.
// Não conecta ao principal, não lê credenciais e não contém dados exportados.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=join(dirname(fileURLToPath(import.meta.url)),'..');
const m=JSON.parse(readFileSync(join(dir,'manifesto-revisao.json'),'utf8'));
const source=readFileSync(join(dir,'02-inventario.sql'),'utf8');
const core=source.slice(source.indexOf('with\n'),source.indexOf('\n-- Valores registrados')).trim().replace(/;\s*$/,'');
if(!core.startsWith('with\n')||!core.includes("select 'contexto'"))throw new Error('Formato de02 não reconhecido');
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const S=q(m.sessao_id),C=q(m.clinica_id);
const sql=`-- EXPORTAÇÃO MÍNIMA AUTORIZADA: SQL Editor oficial, xftnkusbyqzyvzrovroj/main.
-- Download CSV oficial. Não divulgar células/chunks: base64 não é criptografia.
-- A cópia deve ser guardada em scratch privado/DPAPI, fora de Git/public/logs.
begin isolation level repeatable read read only;
set local statement_timeout='60s';
with inventario as (${core}), inv as(select jsonb_object_agg(secao,dados) j from inventario),
objs as(select c.* from pg_class c where c.relnamespace='public'::regnamespace and c.relname in('sessoes_caixa','entradas_caixa','auditoria','eventos_auditoria_financeira')),
defs as(select jsonb_build_object(
 'tabelas',(select jsonb_agg(jsonb_build_object('nome',o.relname,'owner',pg_get_userbyid(o.relowner),'rls',o.relrowsecurity,'force',o.relforcerowsecurity,'acl',o.relacl::text,
   'colunas',(select jsonb_agg(jsonb_build_object('nome',a.attname,'tipo',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=o.oid and a.attnum>0 and not a.attisdropped)) order by o.relname) from objs o),
 'constraints',(select jsonb_agg(jsonb_build_object('tabela',c.conrelid::regclass::text,'nome',c.conname,'tipo',c.contype,'validada',c.convalidated,'definicao',pg_get_constraintdef(c.oid)) order by c.conrelid::regclass::text,c.conname) from pg_constraint c where c.conrelid in(select oid from objs) or c.confrelid in(select oid from objs)),
 'indices',(select jsonb_agg(jsonb_build_object('tabela',i.indrelid::regclass::text,'valido',i.indisvalid,'definicao',pg_get_indexdef(i.indexrelid)) order by i.indexrelid::regclass::text) from pg_index i where i.indrelid in(select oid from objs)),
 'triggers',(select jsonb_agg(jsonb_build_object('tabela',t.tgrelid::regclass::text,'nome',t.tgname,'enabled',t.tgenabled,'definicao',pg_get_triggerdef(t.oid)) order by t.tgrelid::regclass::text,t.tgname) from pg_trigger t where t.tgrelid in(select oid from objs) and not t.tgisinternal),
 'funcoes',(select jsonb_agg(jsonb_build_object('assinatura',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'definicao',pg_get_functiondef(p.oid)) order by p.oid::regprocedure::text) from pg_proc p where p.oid in(select tgfoid from pg_trigger where tgrelid in(select oid from objs) and not tgisinternal)),
 'policies',(select jsonb_agg(jsonb_build_object('tabela',p.polrelid::regclass::text,'nome',p.polname,'cmd',p.polcmd,'roles',p.polroles,'permissiva',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polrelid::regclass::text,p.polname) from pg_policy p where p.polrelid in(select oid from objs)),
 'enums',(select jsonb_agg(jsonb_build_object('tipo',e.enumtypid::regtype::text,'rotulo',e.enumlabel,'ordem',e.enumsortorder) order by e.enumtypid::regtype::text,e.enumsortorder) from pg_enum e where e.enumtypid in(select atttypid from pg_attribute where attrelid in(select oid from objs))),
 'protecao_funcao',to_regprocedure('private.financeiro_proteger_entrada_legado_administrativo()'),
 'protecao_trigger',(select count(*) from pg_trigger where tgrelid='public.entradas_caixa'::regclass and tgname='entradas_caixa_legado_administrativo')) j),
aud as(select a.* from public.auditoria a where a.entidade_id=${S}
 or a.entidade_id in(select e.id::text from public.entradas_caixa e where e.sessao_caixa_id=${S}::uuid)
 or a.dados_antes->>'sessao_caixa_id'=${S} or a.dados_depois->>'sessao_caixa_id'=${S}),
payload as(select jsonb_build_object('formato','RECUPERACAO_RECORTE_V1','project_ref','xftnkusbyqzyvzrovroj','branch_confirmada_interface','main','clinica_id',${C},'sessao_id',${S},'momento',transaction_timestamp(),'read_only',current_setting('transaction_read_only'),'versao',current_setting('server_version'),'inventario',inv.j,'definicoes',defs.j,
 'registros',jsonb_build_object('sessoes_caixa',(select jsonb_agg(to_jsonb(s) order by s.id) from public.sessoes_caixa s where s.id=${S}::uuid and s.clinica_id=${C}::uuid),
 'entradas_caixa',(select jsonb_agg(to_jsonb(e) order by e.id) from public.entradas_caixa e where e.sessao_caixa_id=${S}::uuid),
 'auditoria',(select jsonb_agg(to_jsonb(a) order by a.id) from aud a),
 'eventos_auditoria_financeira',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]') from public.eventos_auditoria_financeira e where e.entidade_id=${S}::uuid or e.dados->>'sessao_caixa_id'=${S}))) j,
 (inv.j#>>'{contexto,valido}'='true' and inv.j->'sessao_original'=${q(JSON.stringify(m.sessao_original))}::jsonb
  and inv.j->'snapshot'=${q(JSON.stringify(m.snapshot))}::jsonb
  and inv.j->>'catalogo_md5'=${q(m.catalogo_md5)}
  and inv.j->'auditoria_fingerprints'=${q(JSON.stringify(m.auditoria_fingerprints))}::jsonb) valido from inv,defs),
texto as(select case when valido then j::text else null end dado from payload),
encoded as(select dado,replace(encode(convert_to(dado,'UTF8'),'base64'),E'\\n','') b64 from texto)
select ord,ceil(length(b64)/6000.0)::integer total,octet_length(dado) bytes,md5(dado) md5,
 substring(b64 from (ord-1)*6000+1 for 6000) chunk
from encoded cross join lateral generate_series(1,coalesce(ceil(length(b64)/6000.0)::integer,1)) ord order by ord;
rollback;
`;
writeFileSync(join(dir,'11-exportacao-recuperacao.sql'),sql);
console.log('11: consulta READ ONLY de exportação gerada; nenhuma conexão ou dado exportado.');

// Executa exclusivamente no cluster novo protegido por identidade positiva.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { conectar, root } from './banco.mjs';
const db=conectar(process.argv[2]);
const identidade=await db.identidade();
const existentes=await db.sql("select datname from pg_database where not datistemplate order by datname",{database:'postgres'});
assert.equal(existentes,'postgres'); // Nunca reutilizar banco ou cluster em uso.
await db.sql(`create database ${db.r.database};`,{database:'postgres'});
await db.identidade(db.r.database);
const fontes=[];
async function aplicar(path){
 const source=readFileSync(join(root,path),'utf8');
 await db.sql(source);
 fontes.push({arquivo:path,sha256:createHash('sha256').update(source).digest('hex')});
 console.log('Aplicado isolado: '+path);
}
// Adapter já versionado: auth.uid lê claim de teste em GUC. Não há serviço Auth,
// login Supabase, JWT real, Vault criptográfico ou usuário de aplicação criado aqui.
await aplicar('supabase/tests/agenda_lab_bootstrap.sql');
for(const path of [
 '20260915010001_btree_gist.sql','20260915010002_baseline_instalacao_nova.sql',
 '20260915010003_acls_default_privileges.sql','20260915010004_hardening_geral.sql',
 '20260921014112_financeiro_fase1_fundacao.sql','20260921102203_financeiro_fase2_seguranca.sql',
 '20260921104621_financeiro_fase3_recebimento.sql','20260921115106_financeiro_fase4_caixa_estados.sql',
 '20260921115109_financeiro_fase4_caixa_operacoes.sql','20260921124154_financeiro_fase5_estornos.sql',
 '20260921132754_financeiro_fase6_repasses.sql','20260921141607_financeiro_fase7_fiscal_interno.sql',
 '20260922181438_financeiro_fase10c_resumo_caixa.sql','20260923143456_fase13_hardening_security_definer.sql'
])await aplicar('supabase/migrations/'+path);
const auditPath='supabase/migrations/20260927100000_pacientes_cpf_leitura_correcao.sql';
const auditSource=readFileSync(join(root,auditPath),'utf8');
const auditFn=auditSource.match(/create or replace function public\.fn_auditoria\(\)[\s\S]*?end \$\$;/)?.[0];
assert.ok(auditFn,'Corpo real de auditoria não encontrado');
await db.sql('alter table public.auditoria add column if not exists motivo text;\n'+auditFn);
fontes.push({arquivo:auditPath,recorte:'Coluna motivo e corpo exato de fn_auditoria; RPCs de CPF não aplicadas',sha256:createHash('sha256').update(auditFn).digest('hex')});
const catalogo=await db.json(`select jsonb_build_object(
 'tabelas',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
 'triggers',(select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal),
 'extensoes',(select jsonb_agg(jsonb_build_object('nome',extname,'versao',extversion)) from pg_extension),
 'rls_entradas',(select relrowsecurity from pg_class where oid='public.entradas_caixa'::regclass),
 'abertura_real',to_regprocedure('public.financeiro_abrir_caixa(uuid,numeric,text)') is not null,
 'auditoria_real',(select prosrc=${"'"+auditFn.match(/as \$\$([\s\S]*?)\$\$;/)[1].replaceAll("'","''")+"'"} and prosecdef and proconfig @> array['search_path=pg_catalog'] from pg_proc where oid='public.fn_auditoria()'::regprocedure))`);
writeFileSync(join(dirname(process.argv[2]),'estrutura.json'),JSON.stringify({identidade,fontes,catalogo,limites:['PostgreSQL17.11 vs principal17.6','Auth/Vault auxiliares de contrato, sem serviços Supabase/JWT real','Catálogo recomposto de migrations selecionadas, não clonagem remota completa','Funções/RLS/constraints/triggers financeiros reais do projeto; nenhuma substituição por funções vazias']},null,2)+'\n');
console.log(JSON.stringify({database:db.r.database,server:identidade.server,catalogo}));

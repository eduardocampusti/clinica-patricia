import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {alvo,cli,sql,dados,salvar,hash,raiz,pacote,REF} from './controle.mjs';
const nomes=['20261005170000_equipe_fotos_recebimento.sql','20261005210000_equipe_fichas_documentos.sql'];
const corpos=nomes.map(n=>readFileSync(resolve(raiz,'supabase/migrations',n),'utf8'));
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const esperados=corpos.map((texto,i)=>({arquivo:nomes[i],version:nomes[i].slice(0,14),sha256:hash(resolve(raiz,'supabase/migrations',nomes[i])),tabelas:[...texto.matchAll(/create table public\.([a-z_]+)/g)].map(m=>m[1]),funcoes:[...texto.matchAll(/create function public\.([a-z_]+)/g)].map(m=>m[1]),bucket:i===0?'equipe-fotos':'equipe-documentos'}));
export function integridade(fase){
  const source=readFileSync(resolve(raiz,'supabase/tools/verificar-integridade.sql'),'utf8');
  const selects=source.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean);
  if(selects.some(s=>!/^SELECT\b/i.test(s)))throw new Error('Integridade contém operação inesperada.');
  const consulta=selects.map((s,i)=>`select ${i+1} as secao,coalesce((select jsonb_agg(to_jsonb(q)) from (${s}) q),'[]'::jsonb) as resultado`).join('\nunion all\n');
  const r=dados(sql('begin read only;\n'+consulta+';\ncommit;'));salvar('integridade-'+fase+'.json',r);
  const ausentes=r.flatMap(s=>s.resultado.filter(v=>v.existe===false));
  if(ausentes.length)throw new Error('Verificação de integridade encontrou objetos ausentes.');
  console.log('Integridade '+fase+': '+selects.length+' consultas, nenhum objeto obrigatório ausente.');
}
export function verificar(e){
 const r=dados(sql(`select jsonb_build_object('registrada',exists(select 1 from supabase_migrations.schema_migrations where version=${quote(e.version)}),'tabelas',(select jsonb_agg(jsonb_build_object('nome',c.relname,'rls',c.relrowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any(array[${e.tabelas.map(quote)}])),'funcoes',(select jsonb_agg(p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array[${e.funcoes.map(quote)}])),'bucket',(select jsonb_build_object('id',id,'public',public,'limite',file_size_limit,'mime',allowed_mime_types) from storage.buckets where id=${quote(e.bucket)})) as estado;`))[0].estado;
 return r;
}
function snapshot(){
 const tabelas=['public.clinicas','public.usuarios','public.usuarios_clinicas','public.equipe_membros','public.equipe_membros_clinicas','public.profissionais','public.profissionais_clinicas','public.pacientes','auth.users','auth.identities','storage.buckets','storage.objects'];
 const fingerprint=tabelas.map(t=>`select ${quote(t)} as tabela,coalesce(jsonb_agg(jsonb_build_object('chave',coalesce(to_jsonb(t)->>'id',concat_ws(':',to_jsonb(t)->>'usuario_id',to_jsonb(t)->>'profissional_id',to_jsonb(t)->>'membro_id',to_jsonb(t)->>'clinica_id')),'hash',md5(to_jsonb(t)::text))),'[]'::jsonb) as registros from ${t} t`).join('\nunion all\n');
 salvar('preservacao-registros-antes.json',dados(sql('begin read only;\n'+fingerprint+';\ncommit;')));
 const r=dados(sql(`begin read only;
select jsonb_build_object('funcoes',(select jsonb_agg(jsonb_build_object('assinatura',p.oid::regprocedure::text,'definicao',pg_get_functiondef(p.oid),'acl',p.proacl)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array[${esperados.flatMap(e=>e.funcoes).map(quote)}])), 'politicas',(select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname='storage' and tablename='objects'), 'enum_auditoria',(select jsonb_agg(e.enumlabel) from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='acao_auditoria'), 'schema_migrations_colunas',(select jsonb_agg(column_name) from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations')) as snapshot;
commit;`));salvar('snapshot-objetos-antes.json',r);
 if(!r[0].snapshot.enum_auditoria.includes('READ_SENSIVEL'))throw new Error('Dependência READ_SENSIVEL ausente.');
 const funcs=dados(cli(['functions','list','--project-ref',REF,'--output','json']));salvar('funcoes-antes.json',funcs);
 // As duas funções novas não podem substituir silenciosamente uma versão anterior.
 if(funcs.some(f=>['equipe-recursos','equipe-fichas'].includes(f.slug)))throw new Error('Função já publicada: baixar versão anterior antes de atualizar.');
 salvar('pacote-aplicacao.json',{project:REF,migrations:esperados,funcoesNovas:['equipe-recursos','equipe-fichas'],recuperacao:'Migrations transacionais; após sucesso preservar estruturas/dados e corrigir aditivamente. Edges novas: não há versão anterior; equipe-acessos não é alterada.'});
 console.log('Estado anterior registrado: duas Edges ausentes; objetos/políticas anteriores preservados.');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(pacote,'aplicar.mjs')){
 try{
  alvo();
  if(process.argv[2]!=='--aplicar-autorizado'||process.argv[3]!==REF||process.argv.length!==4)throw new Error('Confirmação explícita do projeto exigida.');
  integridade('antes');snapshot();
  for(const e of esperados){
   const antes=verificar(e);
   if(antes.registrada){if(antes.tabelas?.length!==e.tabelas.length||antes.funcoes?.length!==e.funcoes.length||antes.bucket?.public!==false)throw new Error('Migration registrada mas objetos divergentes.');console.log(e.version+': já aplicada, não repetida.');continue;}
   if(antes.tabelas||antes.funcoes||antes.bucket)throw new Error('Objeto preexistente/estado parcial: aplicação interrompida.');
   const texto=readFileSync(resolve(raiz,'supabase/migrations',e.arquivo),'utf8');
   if(hash(resolve(raiz,'supabase/migrations',e.arquivo))!==e.sha256)throw new Error('Migration mudou após revisão.');
   const registrar=`insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(e.version)},${quote(e.arquivo.slice(15,-4))},array[${quote(texto)}]);\nnotify pgrst,'reload schema';\ncommit;`;
   // Callback preserva os $ de PL/pgSQL/regex; replacement string os reinterpretaria.
   salvar('aplicacao-'+e.version+'.json',dados(sql(texto.replace(/commit;\s*$/i,()=>registrar))));
   const depois=verificar(e);salvar('objetos-'+e.version+'.json',depois);
   if(!depois.registrada||depois.tabelas?.length!==e.tabelas.length||depois.funcoes?.length!==e.funcoes.length||depois.tabelas.some(t=>!t.rls)||depois.bucket?.public!==false)throw new Error('Pós-aplicação divergente.');
   integridade('apos-'+e.version);console.log(e.version+': aplicada e objetos/RLS/bucket conferidos.');
  }
 }catch(e){if(e.saida)salvar('erro-aplicacao-protegido.txt',e.saida);console.error('Aplicação interrompida: '+e.message+' Nenhum reset/limpeza geral realizado.');process.exitCode=1;}
}

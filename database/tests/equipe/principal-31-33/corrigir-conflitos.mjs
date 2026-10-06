import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {alvo,sql,dados,salvar,REF,raiz} from './controle.mjs';
import {integridade} from './aplicar.mjs';
const nomes=['equipe_foto_confirmar','equipe_recebimento_salvar','equipe_ficha_salvar','equipe_documento_reservar','equipe_documento_confirmar','equipe_documento_operar'];
const q=s=>"'"+s.replaceAll("'","''")+"'";
const fontes=['20261005170000_equipe_fotos_recebimento.sql','20261005210000_equipe_fichas_documentos.sql'].map(n=>readFileSync(resolve(raiz,'supabase/migrations',n),'utf8'));
const blocos=fontes.flatMap(s=>[...s.matchAll(/create function public\.([a-z_]+)\([\s\S]*?\$\$;/g)].filter(m=>nomes.includes(m[1])).map(m=>({nome:m[1],definicao:m[0],corpo:m[0].match(/as \$\$([\s\S]*)\$\$;/)[1]})));
if(blocos.length!==6)throw new Error('Seleção de funções divergente.');
const arquivo='20261006111000_equipe_conflitos_sem_retry.sql';
const guard=blocos.map(b=>`if (select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=${q(b.nome)}) is distinct from ${q(createHash('md5').update(b.corpo).digest('hex'))} then raise exception 'Fonte aplicada divergente: ${b.nome}';end if;`).join('\n');
const texto='-- Conflito de negócio não é falha de serialização transitória.\n-- Preserva corpos/permissões das seis funções32/33; só troca SQLSTATE40001 por PT409.\nbegin;\nset local lock_timeout=\'5s\';\nset local statement_timeout=\'30s\';\ndo $$ begin\n'+guard+'\nend $$;\n'+blocos.map(b=>b.definicao.replace('create function','create or replace function').replaceAll("errcode='40001'","errcode='PT409'")).join('\n')+"\nnotify pgrst,'reload schema';\ncommit;\n";
const modo=process.argv[2];
if(modo==='preparar'){writeFileSync(resolve(raiz,'supabase/migrations',arquivo),texto);console.log('Migration aditiva de seis funções preparada; originais32/33 preservadas.');}
else if(modo==='aplicar'&&process.argv[3]===REF&&process.argv.length===4){
 alvo();if(readFileSync(resolve(raiz,'supabase/migrations',arquivo),'utf8')!==texto)throw new Error('Migration não revisada.');
 salvar('sql-conflitos-antes.json',dados(sql("select p.oid::regprocedure::text as assinatura,pg_get_functiondef(p.oid) as definicao,p.proacl as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array["+nomes.map(q)+"]);")));
 integridade('antes-conflitos');
 const registrar=`insert into supabase_migrations.schema_migrations(version,name,statements) values('20261006111000','equipe_conflitos_sem_retry',array[${q(texto)}]);commit;`;
 salvar('aplicacao-conflitos.json',dados(sql(texto.replace(/commit;\s*$/,()=>registrar))));
 const depois=dados(sql("select p.proname as nome,position('40001' in p.prosrc)=0 as sem_retry,position('PT409' in p.prosrc)>0 as conflito409,p.proacl as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array["+nomes.map(q)+"]);"));salvar('sql-conflitos-depois.json',depois);
 if(depois.length!==6||depois.some(f=>!f.sem_retry||!f.conflito409))throw new Error('Pós-correção divergente.');
 integridade('apos-conflitos');console.log('Migration de conflitos aplicada, seis funções e integridade verificadas.');
}else throw new Error('Modo/projeto não permitido.');

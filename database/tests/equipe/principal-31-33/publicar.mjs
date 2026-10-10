import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {cli,sql,dados,salvar,REF,hash,raiz} from './controle.mjs';
const nomes=['equipe-recursos','equipe-fichas'];
try{
 if(process.argv[2]!=='--publicar-autorizado'||process.argv[3]!==REF||process.argv.length!==4)throw new Error('Projeto autorizado não confirmado.');
 const check=dados(sql("select count(*) as total from supabase_migrations.schema_migrations where version in ('20261005170000','20261005210000');"))[0];if(Number(check.total)!==2)throw new Error('Migrations não verificadas.');
 const anteriores=dados(cli(['functions','list','--project-ref',REF,'--output','json']));
 if(anteriores.some(f=>nomes.includes(f.slug)))throw new Error('Versão já publicada: preservar/download antes de atualizar.');
 const hashes={};function coletar(p){for(const n of readdirSync(resolve(raiz,p))){const f=p+'/'+n;if(statSync(resolve(raiz,f)).isDirectory())coletar(f);else hashes[f]=hash(resolve(raiz,f));}}
 for(const p of ['supabase/functions/equipe-recursos','supabase/functions/equipe-fichas','supabase/functions/_shared'])coletar(p);hashes['supabase/functions/equipe-acessos/conviteAuth.ts']=hash(resolve(raiz,'supabase/functions/equipe-acessos/conviteAuth.ts'));
 for(const nome of nomes){
  const fonte=readFileSync(resolve(raiz,'supabase/functions',nome,'index.ts'),'utf8');if(!fonte.includes('auth.getUser(')||!fonte.includes('Bearer '))throw new Error('Autenticação própria não encontrada.');
  // Só duas funções nomeadas; bundler oficial API, sem Docker, prune ou deploy geral.
  cli(['functions','deploy',nome,'--project-ref',REF,'--use-api','--no-verify-jwt']);
  const atuais=dados(cli(['functions','list','--project-ref',REF,'--output','json']));const f=atuais.find(f=>f.slug===nome);
  if(!f||f.status!=='ACTIVE'||f.verify_jwt!==false)throw new Error('Publicação/configuração divergente.');
  for(const antiga of anteriores){const a=atuais.find(f=>f.slug===antiga.slug);if(!a||a.version!==antiga.version||a.verify_jwt!==antiga.verify_jwt)throw new Error('Outra função mudou; não prosseguir.');}
  salvar('publicacao-'+nome+'.json',{project:REF,funcao:f,hashes,instante:new Date().toISOString()});console.log(nome+': ACTIVE, versão '+f.version+', Auth.getUser próprio, equipe-acessos anterior preservada.');
 }
 salvar('funcoes-depois.json',dados(cli(['functions','list','--project-ref',REF,'--output','json'])));
}catch(e){if(e.saida)salvar('erro-publicacao-protegido.txt',e.saida);console.error('Publicação interrompida: '+e.message+' Nenhum frontend/commit publicado.');process.exitCode=1;}

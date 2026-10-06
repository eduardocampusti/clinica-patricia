import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {alvo,sql,dados,salvar,hash,raiz,destino,pacote,REF,cli} from './controle.mjs';
alvo();
const antes=JSON.parse(readFileSync(resolve(destino,'preservacao-registros-antes.json'),'utf8'));
const q=s=>"'"+s.replaceAll("'","''")+"'";
if(antes.some(t=>!['public.clinicas','public.usuarios','public.usuarios_clinicas','public.equipe_membros','public.equipe_membros_clinicas','public.profissionais','public.profissionais_clinicas','public.pacientes','auth.users','auth.identities','storage.buckets','storage.objects'].includes(t.tabela)))throw new Error('Snapshot divergente.');
const consulta=antes.map(({tabela:t})=>`select ${q(t)} as tabela,coalesce(jsonb_agg(jsonb_build_object('chave',coalesce(to_jsonb(t)->>'id',concat_ws(':',to_jsonb(t)->>'usuario_id',to_jsonb(t)->>'profissional_id',to_jsonb(t)->>'membro_id',to_jsonb(t)->>'clinica_id')),'hash',md5(to_jsonb(t)::text))),'[]'::jsonb) as registros from ${t} t`).join('\nunion all\n');
const depois=dados(sql('begin read only;'+consulta+';commit;'));salvar('preservacao-registros-depois.json',depois);
const preservacao=antes.map(a=>{const d=depois.find(v=>v.tabela===a.tabela);const atuais=new Map(d.registros.map(v=>[v.chave,v.hash]));return {tabela:a.tabela,preexistentes:a.registros.length,ausentes:a.registros.filter(v=>!atuais.has(v.chave)).length,alterados:a.registros.filter(v=>atuais.has(v.chave)&&atuais.get(v.chave)!==v.hash).length,adicionados:d.registros.length-a.registros.length};});
const inventario=dados(sql(readFileSync(resolve(pacote,'inventario.sql'),'utf8')))[0].inventario;salvar('inventario-final.json',inventario);
const original=dados(readFileSync(resolve(destino,'inventario-antes.json'),'utf8'))[0].inventario;
const alteradas=original.funcoes.filter(a=>inventario.funcoes.find(f=>f.assinatura===a.assinatura)?.hash!==a.hash);
const politicasMudaram=original.politicas.filter(p=>JSON.stringify(inventario.politicas.find(a=>a.schema===p.schema&&a.tabela===p.tabela&&a.nome===p.nome))!==JSON.stringify(p));
const local=JSON.parse(readFileSync(resolve(destino,'baseline.json'),'utf8')).map(a=>({arquivo:a.arquivo,estado:!existsSync(resolve(raiz,a.arquivo))?'ausente':hash(resolve(raiz,a.arquivo))===a.sha256?'identico':'alterado'}));salvar('preservacao-local.json',local);
const publicacoes=[];
for(const dominio of ['clinicabrotas.com.br','clinicaipupiara.com.br']){
 const base='https://'+dominio;const html=await (await fetch(base)).text();const src=html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];if(!src)throw new Error('Bundle publicado não identificado.');
 const js=await(await fetch(new URL(src,base))).text();
 publicacoes.push({dominio,bundle:src,commit:js.match(/commit:["'`]([0-9a-f]{7,40})["'`]/)?.[1]??null,compiladoEm:js.match(/compiladoEm:["'`]([^"'`]+)["'`]/)?.[1]??null});
}
const git={branch:execFileSync('git',['branch','--show-current'],{cwd:raiz,encoding:'utf8'}).trim(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:raiz,encoding:'utf8'}).trim(),indiceVazio:execFileSync('git',['diff','--cached','--name-only'],{cwd:raiz,encoding:'utf8'}).trim()===''};
const resultado={projeto:REF,instante:new Date().toISOString(),preservacao,funcoesPreexistentesAlteradas:alteradas.length,politicasPreexistentesAlteradas:politicasMudaram.length,local:{total:local.length,idênticos:local.filter(a=>a.estado==='identico').length,ausentes:local.filter(a=>a.estado==='ausente').length,alterados:local.filter(a=>a.estado==='alterado').map(a=>a.arquivo)},funcoes:dados(cli(['functions','list','--project-ref',REF,'--output','json'])).map(f=>({slug:f.slug,version:f.version,status:f.status,verify_jwt:f.verify_jwt})),publicacoes,git};
salvar('consolidacao-preservacao.json',resultado);console.log(JSON.stringify(resultado,null,2));
if(preservacao.some(a=>a.ausentes||a.alterados)||alteradas.length||politicasMudaram.length||local.some(a=>a.estado==='ausente'))process.exitCode=1;

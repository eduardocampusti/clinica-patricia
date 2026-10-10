import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {alvo,sql,dados,salvar,destino} from './controle.mjs';
alvo();
const path=resolve(destino,'preservacao-registros-antes.json');
const a=JSON.parse(readFileSync(path,'utf8')).find(v=>v.tabela==='auth.users');
const d=JSON.parse(readFileSync(resolve(destino,'preservacao-registros-depois.json'),'utf8')).find(v=>v.tabela==='auth.users');
const ids=a.registros.filter(v=>d.registros.some(r=>r.chave===v.chave&&r.hash!==v.hash)).map(v=>v.chave);
if(ids.some(id=>!/^[a-f0-9-]{36}$/.test(id)))throw new Error('ID divergente.');
const instante=statSync(path).mtime.toISOString();
if(!ids.length){console.log('Nenhuma mudança Auth preexistente.');process.exit(0);}
const r=dados(sql(`begin read only;select jsonb_build_object('registros',count(*),'ultimo_login_durante_execucao',bool_and(last_sign_in_at>='${instante}'::timestamptz),'updated_durante_execucao',bool_and(updated_at>='${instante}'::timestamptz),'acoes_auth',(select coalesce(jsonb_agg(t),'[]'::jsonb) from (select payload->>'action' as acao,count(*) as total from auth.audit_log_entries where payload->>'actor_id'=any(array[${ids.map(id=>"'"+id+"'")}]) and created_at>='${instante}'::timestamptz group by payload->>'action') t)) as resumo from auth.users where id=any(array[${ids.map(id=>"'"+id+"'::uuid")}]);commit;`));
salvar('conferencia-auth-preexistente.json',{instanteSnapshot:instante,resumo:r});console.log(JSON.stringify(r));

import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {API,REF,alvo,sql,dados,salvar,destino} from './controle.mjs';
import {ler,guardar,confirmar,credenciais,opcoes} from './identidades.mjs';
confirmar();alvo();
const f=ler();if(f.fase!=='pronto')throw new Error('Execução não ativa.');
const resultados=JSON.parse(readFileSync(resolve(destino,'resultado-real.json'),'utf8'));
if(resultados.run!==f.run||resultados.resultados.length!==28||resultados.resultados.some(r=>r.resultado!=='aprovado_real'))throw new Error('Não encerrar antes de concluir os cenários.');
const anteriores=JSON.parse(readFileSync(resolve(destino,'preservacao-registros-antes.json'),'utf8')).find(t=>t.tabela==='auth.users').registros;
const ids=Object.values(f.usuarios).map(u=>u.id);if(ids.length!==5||ids.some(id=>anteriores.some(r=>r.chave===id)))throw new Error('Identidade preexistente recusada.');
const k=credenciais(),admin=createClient(API,k.service,opcoes),cliente=createClient(API,k.anon,opcoes);
const sessao=await cliente.auth.signInWithPassword({email:f.usuarios.admin_duas.email,password:f.usuarios.admin_duas.password});if(sessao.error)throw new Error('Sessão técnica indisponível.');
for(const u of Object.values(f.usuarios)){const r=await admin.auth.admin.getUserById(u.id);if(r.error||r.data.user?.email!==u.email||!u.email.endsWith('.'+f.run+'@example.invalid'))throw new Error('Identidade divergente.');}
const q=s=>"'"+s.replaceAll("'","''")+"'";
const prova=Object.values(f.usuarios).map(u=>`(${q(u.id)}::uuid,${q(u.email)})`).join(',');
sql(`begin;do $$ begin if (select count(*) from auth.users u join (values ${prova}) v(id,email) on u.id=v.id and u.email=v.email)<>5 then raise exception 'Identidades divergentes';end if;end $$;update public.usuarios_clinicas set ativo=false where usuario_id=any(array[${ids.map(id=>q(id)+'::uuid')}]);update public.equipe_ocupacional_autorizacoes set ativo=false where ator_id=any(array[${ids.map(id=>q(id)+'::uuid')}]);commit;`);
for(const u of Object.values(f.usuarios)){const r=await admin.auth.admin.updateUserById(u.id,{ban_duration:'8760h'});if(r.error)throw new Error('Bloqueio técnico não confirmado.');}
const semAcesso=await fetch(API+'/functions/v1/equipe-fichas',{method:'POST',headers:{apikey:k.anon,Authorization:'Bearer '+sessao.data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({acao:'obter',membroId:f.membros.medico_clt,clinicaId:f.clinicas.brotas})});
const novoLogin=await createClient(API,k.anon,opcoes).auth.signInWithPassword({email:f.usuarios.admin_duas.email,password:f.usuarios.admin_duas.password});
const ativos=dados(sql(`select count(*) as total from public.usuarios_clinicas where usuario_id=any(array[${ids.map(id=>q(id)+'::uuid')}]) and ativo;`))[0].total;
if(semAcesso.status!==403||!novoLogin.error||Number(ativos)!==0)throw new Error('Encerramento não confirmado.');
await cliente.auth.signOut();f.fase='encerrado';f.encerradoEm=new Date().toISOString();for(const u of Object.values(f.usuarios))delete u.password;guardar(f);
salvar('encerramento-identidades.json',{project:REF,run:f.run,instante:f.encerradoEm,contasTecnicas:5,bloqueadasAuth:true,vinculosTecnicosAtivos:0,sessaoAnteriorStatus:semAcesso.status,novoLoginNegado:!!novoLogin.error,cadastrosFicticiosPreservados:3,historicosPreservados:true});
console.log('Cinco contas técnicas bloqueadas, vínculos técnicos inativos e senha local descartada; três fichas/documentos/históricos preservados para conferência administrativa.');

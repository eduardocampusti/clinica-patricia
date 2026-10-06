import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {alvo,cli,sql,dados,salvar,API,REF,pacote} from './controle.mjs';
const perfis=['admin_duas','admin_brotas','recepcao','medico','sem_vinculo'];
export const opcoes={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const q=s=>"'"+s.replaceAll("'","''")+"'";
// Fora do projeto/raiz Vite: nem mesmo o servidor de desenvolvimento pode servir o journal.
const pastaPrivada=resolve(process.env.LOCALAPPDATA??resolve(homedir(),'AppData/Local'),'CodexClinicaEquipe3133',REF);
const journal=resolve(pastaPrivada,'identidades.json');
let protegida=false;
function protegerPasta(){
 if(protegida)return;mkdirSync(pastaPrivada,{recursive:true});
 const who=spawnSync('whoami.exe',['/user','/fo','csv','/nh'],{encoding:'utf8'});
 const sid=who.stdout?.match(/S-1-5-[0-9-]+/)?.[0];if(who.status!==0||!sid)throw new Error('Proteção Windows das identidades indisponível.');
 // Restringe apenas a nova pasta de credenciais técnicas; não afrouxa nenhuma ACL existente.
 const r=spawnSync('icacls.exe',[pastaPrivada,'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)F','/grant:r','*S-1-5-18:(OI)(CI)F'],{encoding:'utf8'});
 if(r.status!==0||r.error)throw new Error('Proteção Windows das identidades indisponível.');protegida=true;
}
export function guardar(f){alvo();protegerPasta();writeFileSync(journal,JSON.stringify(f),{mode:0o600});salvar('execucao.json',{project:REF,run:f.run,fase:f.fase,clinicas:f.clinicas,membros:f.membros,usuarios:Object.fromEntries(Object.entries(f.usuarios).map(([p,u])=>[p,{id:u.id,nome:'Homologação '+f.run+' '+p}]))});}
export function ler(){alvo();protegerPasta();const f=JSON.parse(readFileSync(journal,'utf8'));if(f.project!==REF||!/^equipe3133-20261006-[a-f0-9]{8}$/.test(f.run))throw new Error('Execução não reconhecida.');return f;}
export function credenciais(){
 alvo();const ks=dados(cli(['projects','api-keys','--project-ref',REF,'--reveal','--output','json']));
 const anon=ks.find(k=>k.name==='anon')?.api_key, service=ks.find(k=>k.name==='service_role')?.api_key;
 if(!anon||!service)throw new Error('Credenciais legadas necessárias indisponíveis; não solicitar chave ao usuário.');
 for(const k of [anon,service]){const c=JSON.parse(Buffer.from(k.split('.')[1],'base64url').toString('utf8'));if(c.ref!==REF)throw new Error('Credencial de outro projeto recusada.');}
 return {anon,service}; // Só em memória; nunca gravar service_role remoto no journal ou relatórios.
}
export function confirmar(){if(process.argv[2]!=='--executar-autorizado'||process.argv[3]!==REF||process.argv.length!==4)throw new Error('Confirmação do projeto autorizado ausente.');alvo();}
export async function criar(){
 confirmar();
 const i=dados(sql("select count(*) as total from storage.buckets where id in ('equipe-fotos','equipe-documentos') and not public;"))[0];if(Number(i.total)!==2)throw new Error('Aplicar/verificar migrations antes de criar identidades.');
 const k=credenciais(),admin=createClient(API,k.service,opcoes);
 const cs=dados(sql("select id,subdomain from public.clinicas where ativo and subdomain in ('brotas','ipupiara');"));if(cs.length!==2)throw new Error('Clínicas operacionais divergentes.');
 let f=existsSync(journal)?ler():{project:REF,run:'equipe3133-20261006-'+randomBytes(4).toString('hex'),fase:'criando',clinicas:Object.fromEntries(cs.map(c=>[c.subdomain,c.id])),usuarios:{},membros:{},tentativas:{}};
 if(f.fase==='pronto'||f.fase==='encerrado')throw new Error('Execução já pronta ou encerrada; não recriar nem reativar recursos.');guardar(f);
 for(const p of perfis){
  if(f.usuarios[p]?.id)continue;
  const email=p+'.'+f.run+'@example.invalid',password=f.usuarios[p]?.password??randomBytes(24).toString('base64url')+'Aa1!';
  f.usuarios[p]={id:'',email,password};guardar(f);
  const criado=dados(sql(`select id from auth.users where email=${q(email)};`));
  if(criado.length){f.usuarios[p].id=criado[0].id;guardar(f);continue;}
  const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nome_completo:'Homologação '+f.run+' '+p}});
  if(r.error||!r.data.user)throw new Error('Criação Auth técnica falhou; resposta suprimida.');f.usuarios[p].id=r.data.user.id;guardar(f);
 }
 // Escritas somente nos UUIDs das identidades criadas pela execução; nomes fictícios.
 const usuarios=Object.entries(f.usuarios).map(([p,u])=>`insert into public.usuarios(id,nome_completo) values(${q(u.id)},${q('Homologação '+f.run+' '+p)}) on conflict(id) do update set nome_completo=excluded.nome_completo;`).join('\n');
 const vinculos=[['admin_duas','brotas','proprietaria'],['admin_duas','ipupiara','proprietaria'],['admin_brotas','brotas','proprietaria'],['recepcao','brotas','recepcao'],['medico','brotas','medico']].map(([p,c,papel])=>`insert into public.usuarios_clinicas(usuario_id,clinica_id,papel) values(${q(f.usuarios[p].id)},${q(f.clinicas[c])},${q(papel)}) on conflict(usuario_id,clinica_id) do nothing;`).join('\n');
 const prova=Object.values(f.usuarios).map(u=>`(${q(u.id)}::uuid,${q(u.email)})`).join(',');
 sql(`begin;do $$ begin if (select count(*) from auth.users u join (values ${prova}) v(id,email) on u.id=v.id and u.email=v.email)<>5 then raise exception 'Identidade não pertence à execução';end if;end $$;${usuarios}\n${vinculos}\ncommit;`);
 const owner=createClient(API,k.anon,opcoes);if((await owner.auth.signInWithPassword(f.usuarios.admin_duas)).error)throw new Error('Login técnico falhou.');
 for(const [p,n,t,c] of [['funcionario','Funcionário CLT Fictício','administrativo','Recepção'],['prestador','Médico Prestador Fictício','profissional_saude','Médico'],['medico_clt','Médico CLT Fictício','profissional_saude','Médico']]){
  if(f.membros[p])continue;f.tentativas[p]??=randomUUID();guardar(f);
  const r=await owner.rpc('equipe_salvar',{p_membro_id:null,p_clinica_contexto_id:f.clinicas.brotas,p_revisao_esperada:0,p_chave_idempotencia:f.tentativas[p],p_dados:{nome_completo:n+' '+f.run,cargo:c,tipo:t,profissao:t==='profissional_saude'?'Medicina':null,cpf_modo:'remover',cpf:null,clinicas_ids:[f.clinicas.brotas,f.clinicas.ipupiara],telefone:null,email_contato:null,conselho_classe:null,registro_conselho:null,conselho_uf:null,especialidade_id:null}});
  if(r.error||typeof r.data!=='string')throw new Error('RPC de cadastro fictício falhou.');f.membros[p]=r.data;guardar(f);
 }
 f.fase='pronto';guardar(f);await owner.auth.signOut();console.log('Execução '+f.run+': cinco identidades técnicas e três cadastros fictícios criados, sem e-mails externos.');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(pacote,'identidades.mjs'))criar().catch(e=>{if(e.saida)salvar('erro-fixtures-protegido.txt',e.saida);const seguras=['Credenciais legadas necessárias indisponíveis; não solicitar chave ao usuário.','Credencial de outro projeto recusada.','Proteção Windows das identidades indisponível.','RPC de cadastro fictício falhou.','Criação Auth técnica falhou; resposta suprimida.','Login técnico falhou.','Aplicar/verificar migrations antes de criar identidades.','CLI falhou; saída privada suprimida.'];console.error('Fixtures técnicas interrompidas: '+(seguras.includes(e.message)?e.message:'pré-requisito não confirmado')+' Segredos não expostos. Código local: '+(e.subprocessCode??'não aplicável'));process.exitCode=1;});

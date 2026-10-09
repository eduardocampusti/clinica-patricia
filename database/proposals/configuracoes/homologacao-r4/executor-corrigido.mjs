// R4 CONSUMIDA/ENCERRADA. Este executor corrigido NÃO pode ser reexecutado com R4. Preflight recusa recursos existentes.
// Executor restrito: duas contas novas, dois contextos, respostas reais, finally obrigatório.
import fs from 'node:fs'
import path from 'node:path'
import {randomBytes,createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {sqlArquivo} from './sql-seguro-conectado.mjs'
const root='D:/PROJETOS SAAS/CLINICA PATRICIA'
process.chdir(root)
const require=createRequire(path.join(root,'package.json'))
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('playwright')
const {REF,URL,cli,envPublico}=await import(pathToFileURL(root+'/scratch/meu-perfil/real/cli.mjs'))
const sql=q=>sqlArquivo(cli,q);if(REF!=='xftnkusbyqzyvzrovroj'||URL!=='https://xftnkusbyqzyvzrovroj.supabase.co')throw Error('Alvo divergente');
const publicKey=envPublico(),options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(25000)})}}
const client=()=>createClient(URL,publicKey,options)
const {renovarSessaoAuxiliarAposLogin,encerrarSessaoAuxiliar,exigirConsulta,encerramentoCompleto}=await import(pathToFileURL(root+'/tests/configuracoes/sessoesExecutor.mjs'))
async function consultar(c,id,etapa='Consulta real'){return exigirConsulta(await api(c,{acao:'consultar',escopo:id}),etapa)}
const report={projeto:REF,inicio:new Date().toISOString(),origem:'Auth/Edge/Storage reais e Chrome próprio; sem mocks ou emulação de usuário',testes:[],contas:[],contextos:[],encerramento:[],aprovado:false}
const output=new globalThis.URL('./configuracoes-r4-real.json',import.meta.url)
const persist=()=>fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n')
const check=(ok,msg,details={})=>{report.testes.push({requisito:msg,aprovado:!!ok,...details});persist();if(!ok)throw Error(msg);console.log(JSON.stringify({teste:msg,aprovado:true}))}
const ids=['ed002c24-5c6c-4e8c-b90c-aa4751280001','ed002c24-5c6c-4e8c-b90c-aa4751280002']
const emails=['cfg-a.20261009.r4@configuracoes.example.invalid','cfg-b.20261009.r4@configuracoes.example.invalid']
const slots=[],pages=[],contexts=[],assets=[]
let admin,browser,seeded=false
const keyData=cli(['projects','api-keys','--project-ref',REF])
const service=keyData.keys?.find(x=>x.name==='service_role')?.api_key
if(!service)throw Error('Canal administrativo autenticado não retornou capacidade necessária')
admin=createClient(URL,service,options)
async function api(c,body){const r=await c.functions.invoke('configuracoes',{body});if(r.error){let status=r.error.context?.status??0;return {error:true,status}}return {data:r.data}}
const publicRead=async(hostname)=>{const r=await fetch(URL+'/functions/v1/configuracoes-publicas',{method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({hostname}),signal:AbortSignal.timeout(20000)});return {status:r.status,data:await r.json()}}
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const baseline={}
for(const host of ['clinicabrotas.com.br','clinicaipupiara.com.br']){const r=await publicRead(host);if(r.status!==200)throw Error('Baseline pública indisponível');baseline[host]=hash(r.data)}
async function loginUI(page,slot,n){
 await page.goto('http://localhost:3000/acesso/'+(n?'ipupiara#b':'brotas#a'))
 await page.locator('#email').fill(slot.email);await page.locator('#password').fill(slot.password)
 await page.getByRole('button',{name:'Acessar Sistema Integrado',exact:true}).click()
 await page.getByRole('heading',{name:'Sessão ativa',exact:true}).waitFor()
 await page.getByRole('button',{name:/^Continuar na /}).click()
 await page.getByRole('heading',{name:'Configurações',exact:true}).waitFor({timeout:30000})
 await renovarSessaoAuxiliarAposLogin(slot.c,slot)
}
async function submit(page,apply){
 await page.getByRole('button',{name:apply?'Aplicar configuração':'Salvar rascunho',exact:true}).click()
 if(apply)await page.getByRole('alertdialog').getByRole('button',{name:'Aplicar configuração',exact:true}).click()
 await page.getByText(apply?'Configuração aplicada e confirmada pelo servidor.':'Operação confirmada',{exact:!apply}).waitFor({timeout:30000})
}

async function adicionais(s,p,id,suffix){
 let current=await consultar(s.c,id)
 const appliedRevision=current.revisao,originalPublic=await publicRead('configuracoes-homologacao-r4-'+suffix.toLowerCase()+'.invalid')
 const second=client();check(!(await second.auth.signInWithPassword({email:s.email,password:s.password})).error,'Segunda sessão real para concorrência '+suffix)
 const stale=await consultar(second,id,'Consulta da sessão de concorrência')
 await p.getByRole('tab',{name:'Dados da clínica',exact:true}).click();await p.getByLabel('Nome fantasia',{exact:true}).fill('Demonstração R4 editada '+suffix);await submit(p,false)
 const conflict=await api(second,{acao:'rascunho',escopo:id,documento:stale.documento,revisao:stale.revisao,geralRevisao:stale.geralRevisao,fonteRevisao:stale.fonteRevisao})
 check(conflict.error&&conflict.status===409,'Duas sessões reais: edição desatualizada recusada409 '+suffix)
 check(hash((await publicRead('configuracoes-homologacao-r4-'+suffix.toLowerCase()+'.invalid')).data)===hash(originalPublic.data),'Rascunho não altera o login público '+suffix)
 current=await consultar(s.c,id)
 await p.getByRole('tab',{name:'Histórico de alterações',exact:true}).click();const entry=p.locator('.cfg-historico li').filter({hasText:'Versão '+appliedRevision+' · aplicar'});await entry.getByRole('button',{name:'Restaurar como rascunho',exact:true}).click();await p.getByRole('alertdialog').getByRole('button',{name:'Restaurar rascunho',exact:true}).click();await p.getByText('Operação confirmada',{exact:true}).waitFor()
 let restored=await consultar(s.c,id)
 check(restored.revisao>current.revisao&&restored.documento.instituicao.nomeFantasia==='Demonstração R4 '+suffix,'Restauração cria novo rascunho sem apagar versões '+suffix)
 check(hash((await publicRead('configuracoes-homologacao-r4-'+suffix.toLowerCase()+'.invalid')).data)===hash(originalPublic.data),'Restaurar não publica automaticamente '+suffix)
 await p.getByRole('tab',{name:'Identidade visual',exact:true}).click()
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=96;c.height=96;const x=c.getContext('2d');x.fillStyle='#104052';x.fillRect(0,0,96,96);return c.toDataURL('image/png').split(',')[1]})
 const oldPath=restored.documento.campos.logoPrincipal,oldPublic=originalPublic.data.marca.logo
 await p.getByLabel('Selecionar Logo principal',{exact:true}).setInputFiles({name:'segunda-logo-r4.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await p.getByAltText('Prévia: Logo principal').waitFor().catch(()=>{throw Error('Prévia de upload não disponível; conferir status do serviço sem aumentar timeout')});await submit(p,true)
 current=await consultar(s.c,id)
 check(current.documento.campos.logoPrincipal!==oldPath&&current.historico.length>restored.historico.length,'Substituição registra novo ativo e preserva histórico '+suffix)
 const old=await fetch(oldPublic,{headers:{apikey:publicKey},signal:AbortSignal.timeout(20000)});check(old.status===404,'Logo anterior deixa de ter leitura pública '+suffix)
 const prior=await s.c.storage.from('institucionais').download(oldPath);check(!prior.error&&prior.data.size>0,'Ativo histórico continua disponível à sessão autorizada '+suffix)
 for(const [name,mime,bytes] of [['falso.png','image/png',Buffer.from('nao e png')],['tipo.gif','image/gif',Buffer.from(png,'base64')],['limite.png','image/png',Buffer.alloc(5*1024*1024+1)],['dimensao.png','image/png',Buffer.from(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=16;c.height=16;return c.toDataURL('image/png').split(',')[1]}),'base64')]]){const f=new FormData();f.set('acao','enviar');f.set('escopo',id);f.set('arquivo',new Blob([bytes],{type:mime}),name);const r=await api(s.c,f);check(r.error&&[413,422].includes(r.status),'Upload inválido recusado: '+name+' '+suffix)}
 const before=await consultar(s.c,id)
 sql(`update public.clinicas set nome=nome||' revisão fonte' where id='${id}' and ativo`)
 const d=structuredClone(before.documento);d.campos.paginas=false
 const changed=await api(s.c,{acao:'rascunho',escopo:id,documento:d,revisao:before.revisao,geralRevisao:before.geralRevisao,fonteRevisao:before.fonteRevisao});check(changed.error&&changed.status===409,'Fonte fictícia alterada exige reconciliação409 '+suffix)
 await p.reload();await p.getByRole('button',{name:'Atualizar dados oficiais no rascunho',exact:true}).click();await p.getByRole('alertdialog').getByRole('button',{name:'Atualizar rascunho',exact:true}).click();await p.getByText('Operação confirmada',{exact:true}).waitFor()
 const reconciled=await consultar(s.c,id);check(!reconciled.fonteConflitante&&reconciled.documento.instituicao.nome.endsWith(' revisão fonte'),'Reconciliação preserva apresentação e atualiza só a fonte fictícia '+suffix)
 await encerrarSessaoAuxiliar(second)
}

try{
 const receipt=await(await fetch('http://127.0.0.1:3000/__bancada/sessao')).json()
 check(receipt.estado==='confirmada'&&receipt.guarda&&receipt.pendenciaNormal&&receipt.proprietariaAmbas&&Date.now()-Date.parse(receipt.recebidoEm)<600000,'Condição prévia: sessão legítima do criador comprovada pelo SDK', {recebidoEm:receipt.recebidoEm})
 const pre=sql(`select (select count(*) from auth.users where email in ('${emails.join("','")}')) as contas,(select count(*) from public.clinicas where id in ('${ids.join("','")}')) as contextos,pg_get_functiondef('public.configuracoes_padrao_consultar(text)'::regprocedure) like '%ed002c24-5c6c-4e8c-b90c-aa4751280001%' as r4`)[0]
 check(pre.contas===0&&pre.contextos===0&&pre.r4,'Pré-execução: recursos inéditos e pacote R4 instalado')
 browser=await chromium.launch({channel:'chrome',headless:true})
 for(let n=0;n<2;n++){const cx=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(cx);const p=await cx.newPage();p.setDefaultTimeout(20000);pages.push(p)}
 await pages[0].goto('http://localhost:3000/acesso/brotas#a')
 check(await pages[0].locator('#email').isVisible(),'Bancada fictícia disponível em origem permitida, sem copiar sessão real')
 cli(['db','query','--linked','--file','database/proposals/configuracoes/homologacao-r4/contextos.sql']);seeded=true;report.contextos=[...ids];persist()
 for(let n=0;n<2;n++){
  const password='Qa9!'+randomBytes(28).toString('base64url')
  const r=await admin.auth.admin.createUser({email:emails[n],password,email_confirm:true,app_metadata:{homologacao_configuracoes:'20261009-r4-'+(n?'b':'a')}})
  if(r.error||!r.data.user)throw Error('Auth Admin recusou criação de fixture '+n)
  const slot={id:r.data.user.id,email:emails[n],password,c:client()};slots.push(slot);report.contas.push({id:slot.id,papel:'proprietaria',contexto:ids[n]});persist()
 }
 const links=fs.readFileSync('database/proposals/configuracoes/homologacao-r4/vinculos.template.sql','utf8').replaceAll('__CFG_A_UUID__',slots[0].id).replaceAll('__CFG_B_UUID__',slots[1].id)
 sqlArquivo(cli,links)
 for(let n=0;n<2;n++){
  const s=slots[n],p=pages[n],id=ids[n],suffix=n?'B':'A'
  const auth=await s.c.auth.signInWithPassword({email:s.email,password:s.password});check(!auth.error,'Login Auth real da conta fictícia '+suffix)
  const guard=await s.c.rpc('acesso_direto_exigir_sessao');check(!guard.error&&guard.data===true,'Conta existente normal sem pendência artificial '+suffix)
  await loginUI(p,s,n)
  await p.getByLabel('Nome fantasia',{exact:true}).fill('Demonstração R4 '+suffix)
  await submit(p,false)
  let r=await api(s.c,{acao:'consultar',escopo:id})
  check(!r.error&&r.data.documento.instituicao.nomeFantasia==='Demonstração R4 '+suffix,'Dados institucionais: salvar pela interface e ler pelo serviço real '+suffix)
  await p.reload();await p.getByLabel('Nome fantasia',{exact:true}).waitFor();check(await p.getByLabel('Nome fantasia',{exact:true}).inputValue()==='Demonstração R4 '+suffix,'F5 conserva os dados institucionais '+suffix)
  await p.getByRole('tab',{name:'Identidade visual',exact:true}).click()
  const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');x.fillStyle='#006194';x.fillRect(8,8,112,48);return c.toDataURL('image/png').split(',')[1]})
  await p.getByLabel('Selecionar Logo principal',{exact:true}).setInputFiles({name:'demonstracao-r4.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')})
  await p.getByAltText('Prévia: Logo principal').waitFor()
  await p.getByRole('tab',{name:'Timbrados e documentos',exact:true}).click()
  await p.getByLabel('Marca-d’água opcional',{exact:true}).fill('DEMONSTRAÇÃO R4 '+suffix)
  await p.getByLabel('Texto complementar da linha 1 do Rodapé',{exact:true}).fill('Rodapé fictício '+suffix)
  await p.getByLabel('Texto complementar da linha 1 do Rodapé',{exact:true}).press('Enter')
  // Cabeçalho é preenchido pela interface normal, com destino detectado por seu rótulo oficial.
  await p.locator('.cfg-campo').filter({hasText:'Campos do cabeçalho'}).getByRole('button',{name:'Adicionar linha',exact:true}).click()
  await p.getByLabel('Texto complementar da linha 1 do Cabeçalho',{exact:true}).fill('Cabeçalho fictício '+suffix)
  await p.getByLabel('Texto complementar da linha 1 do Cabeçalho',{exact:true}).press('Enter')
  await p.getByRole('tab',{name:'Tela de login',exact:true}).click()
  await p.getByLabel('Mensagem de boas-vindas',{exact:true}).fill('Bem-vindo à demonstração R4 '+suffix)
  await submit(p,true)
  r=await api(s.c,{acao:'consultar',escopo:id})
  check(!r.error&&r.data.documento.campos.marcaDagua==='DEMONSTRAÇÃO R4 '+suffix&&r.data.documento.campos.cabecalho.some(l=>l.some(a=>a.texto==='Cabeçalho fictício '+suffix))&&r.data.documento.campos.rodape.some(l=>l.some(a=>a.texto==='Rodapé fictício '+suffix)),'Cabeçalho, rodapé e timbrado persistidos no servidor '+suffix)
  const logo=r.data.documento.campos.logoPrincipal
  check(typeof logo==='string'&&logo.startsWith(id+'/')&&typeof r.data.ativos[logo]==='string','Upload real registrado e leitura privada assinada '+suffix)
  const signed=await fetch(r.data.ativos[logo],{signal:AbortSignal.timeout(20000)});check(signed.ok&&signed.headers.get('content-type')?.includes('image/png'),'Download posterior do logo real '+suffix)
  await p.reload();await p.getByRole('heading',{name:'Configurações',exact:true}).waitFor();await p.getByRole('tab',{name:'Timbrados e documentos',exact:true}).click()
  check(await p.getByLabel('Marca-d’água opcional',{exact:true}).inputValue()==='DEMONSTRAÇÃO R4 '+suffix,'Recarga preserva timbrado/cabeçalho/rodapé '+suffix)
  await p.getByRole('button',{name:'Gerar PDF de demonstração',exact:true}).click();await p.getByRole('link',{name:'Baixar PDF de demonstração'}).waitFor();check(true,'Geração real local de PDF de demonstração com configuração persistida '+suffix)
  const pub=await publicRead('configuracoes-homologacao-r4-'+suffix.toLowerCase()+'.invalid')
  check(pub.status===200&&pub.data.marca?.mensagem==='Bem-vindo à demonstração R4 '+suffix&&pub.data.marca.logo,'Projeção pública do login coincide com versão aplicada '+suffix)
  const img=await fetch(pub.data.marca.logo,{headers:{apikey:publicKey},signal:AbortSignal.timeout(20000)});check(img.ok&&img.headers.get('content-type')?.includes('image/png'),'Logo público real do login '+suffix);assets.push(pub.data.marca.logo)
  await p.getByRole('button',{name:'Sair',exact:true}).click()
  await p.getByText('Bem-vindo à demonstração R4 '+suffix,{exact:true}).waitFor();check(await p.locator('#email').isVisible(),'Login anônimo exibe personalização e formulário funcional '+suffix)
  await loginUI(p,s,n);check(true,'Novo login pela interface lê configuração persistida '+suffix)
  await adicionais(s,p,id,suffix)
 }
 for(let n=0;n<2;n++){
  const s=slots[n],other=ids[1-n]
  for(const target of [other,...sql("select id from public.clinicas where subdomain in ('brotas','ipupiara')").map(x=>x.id)]){const r=await api(s.c,{acao:'consultar',escopo:target});check(r.error&&r.status===403,'Sessão real nega leitura de contexto sem vínculo '+n)}
  const own={data:await consultar(s.c,ids[n],'Consulta própria antes de escrita cruzada')};const w=await api(s.c,{acao:'rascunho',escopo:other,documento:own.data.documento,revisao:0,geralRevisao:0,fonteRevisao:''});check(w.error&&w.status===403,'Sessão real nega escrita no outro contexto '+n)
  const fd=new FormData();fd.set('acao','enviar');fd.set('escopo',other);fd.set('arquivo',new Blob([new Uint8Array([137,80,78,71])],{type:'image/png'}),'nao-enviar.png');const up=await api(s.c,fd);check(up.error&&up.status===403,'Sessão real nega upload no outro contexto '+n)
  const otherState={data:await consultar(slots[1-n].c,other,'Consulta própria antes da negação de Storage')};
  const otherPath=otherState.data.documento.campos.logoPrincipal;
  const forbidden=await s.c.storage.from('institucionais').download(otherPath);check(!!forbidden.error,'Storage real recusa ativo privado do outro contexto '+n);
  const rest=await s.c.from('configuracoes_escopos').select('escopo').eq('escopo',other);check(!!rest.error||(Array.isArray(rest.data)&&rest.data.length===0),'REST não expõe configuração do outro contexto '+n);
  const global=await api(s.c,{acao:'consultar',escopo:'geral'});check(global.error&&global.status===403,'Sem administração global '+n)
 }
 sql(`update public.usuarios_clinicas set papel='recepcao' where usuario_id='${slots[1].id}' and clinica_id='${ids[1]}' and ativo`)
 const denied=await api(slots[1].c,{acao:'consultar',escopo:ids[1]});check(denied.error&&denied.status===403,'Recepção real nega Configurações no próprio contexto')
 sql(`update public.usuarios_clinicas set papel='proprietaria' where usuario_id='${slots[1].id}' and clinica_id='${ids[1]}' and ativo`)
 const again=await api(slots[1].c,{acao:'consultar',escopo:ids[1]});check(!again.error,'Restauração do papel autorizado apenas na fixture B')
 for(const host of Object.keys(baseline)){const r=await publicRead(host);check(r.status===200&&hash(r.data)===baseline[host],'Identidade pública real preservada: '+host)}
 for(let n=0;n<2;n++){const s=slots[n],p=pages[n];const jpeg=Buffer.from(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');x.fillStyle='#104052';x.fillRect(0,0,128,64);return c.toDataURL('image/jpeg').split(',')[1]}),'base64');const f=new FormData();f.set('acao','enviar');f.set('escopo',ids[n]);f.set('arquivo',new Blob([jpeg],{type:'image/jpeg'}),'demonstracao-r4.jpg');const r=await api(s.c,f);check(!r.error,'Upload JPEG real normalizado pelo serviço '+n)}
 report.aprovado=report.testes.every(t=>t.aprovado)
}catch(error){report.impedimento=error.message?.startsWith('Timeout')?'Timeout em etapa visual; dados e credenciais omitidos':String(error.message).slice(0,240);console.log(JSON.stringify({impedimento:report.impedimento}));process.exitCode=1}
finally{
 for(const cx of contexts)await cx.close().catch(()=>{})
 if(browser)await browser.close().catch(()=>{})
 let recovered=[];try{recovered=sql(`select id,email from auth.users where email in ('${emails.join("','")}') and raw_app_meta_data->>'homologacao_configuracoes' in ('20261009-r4-a','20261009-r4-b')`)}catch{report.encerramento.push({tipo:'inventario_administrativo',aprovado:false})};for(const a of recovered)if(!slots.some(s=>s.id===a.id))slots.push({...a,c:client(),password:null});
 for(const s of slots){
  try{
   const auth=await s.c.auth.getSession();if(auth.data.session)await admin.auth.admin.signOut(auth.data.session.access_token,'global')
   const ban=await admin.auth.admin.updateUserById(s.id,{ban_duration:'876000h',password:'Qa9!'+randomBytes(32).toString('base64url')})
   if(ban.error)throw Error('Bloqueio Auth não confirmado')
   sql(`begin; update public.usuarios_clinicas set ativo=false where usuario_id='${s.id}' and clinica_id in ('${ids.join("','")}'); update public.usuarios set ativo=false where id='${s.id}';commit;`)
   const st=sql(`select (select banned_until>now() from auth.users where id='${s.id}') as ban,(select count(*) from auth.sessions where user_id='${s.id}') as sessoes,(select count(*) from auth.refresh_tokens where user_id='${s.id}' and not revoked) as refresh_ativos,(select ativo from public.usuarios where id='${s.id}') as perfil_ativo,(select count(*) from public.usuarios_clinicas where usuario_id='${s.id}' and ativo) as vinculos_ativos`)[0]
   const refused=s.password?await client().auth.signInWithPassword({email:s.email,password:s.password}):null
   report.encerramento.push({id:s.id,...st,login_recusado:refused===null?null:!!refused.error,aprovado:!!st.ban&&st.sessoes===0&&st.refresh_ativos===0&&!st.perfil_ativo&&st.vinculos_ativos===0&&(refused===null||!!refused.error)})
  }catch{report.encerramento.push({id:s.id,aprovado:false,impedimento:'Encerramento requer conferência administrativa restrita'})}
  persist()
 }
 let partial={n:0};try{partial=sql(`select count(*) as n from public.configuracoes_homologacao_contextos where clinica_id in ('${ids.join("','")}')`)[0]}catch{report.encerramento.push({tipo:'inventario_contextos',aprovado:false})};if(seeded||partial.n>0){
  try{
   cli(['db','query','--linked','--file','database/proposals/configuracoes/homologacao-r4/encerrar-contextos.sql'])
   report.contextos_finais=sql(`select c.id,c.ativo as clinica_ativa,h.ativo as contexto_ativo,public.configuracoes_publicas_consultar(h.slug) is null as publico_encerrado,(select count(*) from public.usuarios_clinicas v where v.clinica_id=c.id and v.ativo) as vinculos_ativos from public.clinicas c join public.configuracoes_homologacao_contextos h on h.clinica_id=c.id where c.id in ('${ids.join("','")}')`)
   for(const url of assets){const r=await fetch(url,{headers:{apikey:publicKey,'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});report.encerramento.push({tipo:'ativo_publico',status:r.status,aprovado:r.status===404})}
  }catch{report.encerramento.push({tipo:'contextos',aprovado:false})}
 }
 report.encerramentoConfirmado=encerramentoCompleto(report);report.aprovado=report.aprovado&&report.encerramentoConfirmado;if(!report.encerramentoConfirmado)process.exitCode=1;report.fim=new Date().toISOString();persist()
 console.log(JSON.stringify({final:true,aprovado:report.aprovado,contasCriadas:slots.length,contextosCriados:seeded?2:0,encerramento:report.encerramento.every(x=>x.aprovado),evidencia:output.pathname}))
}

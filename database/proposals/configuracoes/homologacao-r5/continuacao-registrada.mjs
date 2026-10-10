import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
export async function run(ctx){
const {slots,pages,ids,api,consultar,sql,client,publicRead,baseline,hash,check,report,loginUI,submit}=ctx;const assets=[];
const root='D:/PROJETOS SAAS/CLINICA PATRICIA';const {envPublico}=await import(pathToFileURL(root+'/scratch/meu-perfil/real/cli.mjs'));const publicKey=envPublico();const {encerrarSessaoAuxiliar}=await import(pathToFileURL(root+'/tests/configuracoes/sessoesExecutor.mjs'));
async function adicionais(s,p,id,suffix){
 let current=await consultar(s.c,id)
 const appliedRevision=current.historico.find(v=>v.acao==='aplicar').revisao,originalPublic=await publicRead('configuracoes-homologacao-r5-'+suffix.toLowerCase()+'.invalid')
 const second=client();check(!(await second.auth.signInWithPassword({email:s.email,password:s.password})).error,'Segunda sessão real para concorrência '+suffix)
 const stale=await consultar(second,id,'Consulta da sessão de concorrência')
 await p.getByRole('tab',{name:'Dados da clínica',exact:true}).click();await p.getByLabel('Nome fantasia',{exact:true}).fill('Demonstração R5 segunda edição '+suffix);await submit(p,false)
 const conflict=await api(second,{acao:'rascunho',escopo:id,documento:stale.documento,revisao:stale.revisao,geralRevisao:stale.geralRevisao,fonteRevisao:stale.fonteRevisao})
 check(conflict.error&&conflict.status===409,'Duas sessões reais: edição desatualizada recusada409 '+suffix)
 check(hash((await publicRead('configuracoes-homologacao-r5-'+suffix.toLowerCase()+'.invalid')).data)===hash(originalPublic.data),'Rascunho não altera o login público '+suffix)
 current=await consultar(s.c,id)
 await p.getByRole('tab',{name:'Histórico de alterações',exact:true}).click();const entry=p.locator('.cfg-historico li').filter({hasText:'Versão '+appliedRevision+' · aplicar'});await entry.getByRole('button',{name:'Restaurar como rascunho',exact:true}).click();await p.getByRole('alertdialog').getByRole('button',{name:'Restaurar rascunho',exact:true}).click();await p.getByText('Versão restaurada como novo rascunho no histórico. Confira os dados antes de aplicar.',{exact:true}).waitFor()
 let restored=await consultar(s.c,id)
 check(restored.revisao>current.revisao&&restored.documento.instituicao.nomeFantasia==='Demonstração R5 '+suffix,'Restauração cria novo rascunho sem apagar versões '+suffix)
 check(hash((await publicRead('configuracoes-homologacao-r5-'+suffix.toLowerCase()+'.invalid')).data)===hash(originalPublic.data),'Restaurar não publica automaticamente '+suffix)
 await p.getByRole('tab',{name:'Identidade visual',exact:true}).click()
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=96;c.height=96;const x=c.getContext('2d');x.fillStyle='#104052';x.fillRect(0,0,96,96);return c.toDataURL('image/png').split(',')[1]})
 const oldPath=restored.documento.campos.logoPrincipal,oldPublic=originalPublic.data.marca.logo
 await p.getByLabel('Selecionar Logo principal',{exact:true}).setInputFiles({name:'segunda-logo-r5.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await p.getByAltText('Prévia: Logo principal').waitFor().catch(()=>{throw Error('Prévia de upload não disponível; conferir status do serviço sem aumentar timeout')});await submit(p,true)
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

const s=slots[0],p=pages[0],id=ids[0],suffix='A';let current=await consultar(s.c,id);let restored=current;const originalPublic=await publicRead('configuracoes-homologacao-r5-a.invalid');
await p.getByText('Versão restaurada como novo rascunho no histórico. Confira os dados antes de aplicar.',{exact:true}).waitFor();
check(current.revisao===5&&current.documento.instituicao.nomeFantasia==='Demonstração R5 A'&&current.historico.length===5&&current.historico[0].acao==='restaurar','Restauração cria novo rascunho sem apagar versões A');
check(originalPublic.data.marca.mensagem==='Bem-vindo à demonstração R5 A','Restaurar não publica automaticamente A');
 await p.getByRole('tab',{name:'Identidade visual',exact:true}).click()
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=96;c.height=96;const x=c.getContext('2d');x.fillStyle='#104052';x.fillRect(0,0,96,96);return c.toDataURL('image/png').split(',')[1]})
 const oldPath=restored.documento.campos.logoPrincipal,oldPublic=originalPublic.data.marca.logo
 await p.getByLabel('Selecionar Logo principal',{exact:true}).setInputFiles({name:'segunda-logo-r5.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await p.getByAltText('Prévia: Logo principal').waitFor().catch(()=>{throw Error('Prévia de upload não disponível; conferir status do serviço sem aumentar timeout')});await submit(p,true)
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
 for(let n=1;n<2;n++){
  const s=slots[n],p=pages[n],id=ids[n],suffix=n?'B':'A'
  const auth=await s.c.auth.signInWithPassword({email:s.email,password:s.password});check(!auth.error,'Login Auth real da conta fictícia '+suffix)
  const guard=await s.c.rpc('acesso_direto_exigir_sessao');check(!guard.error&&guard.data===true,'Conta existente normal sem pendência artificial '+suffix)
  await loginUI(p,s,n)
  await p.getByLabel('Nome fantasia',{exact:true}).fill('Demonstração R5 '+suffix)
  await submit(p,false)
  let r=await api(s.c,{acao:'consultar',escopo:id})
  check(!r.error&&r.data.documento.instituicao.nomeFantasia==='Demonstração R5 '+suffix,'Dados institucionais: salvar pela interface e ler pelo serviço real '+suffix)
  await p.reload();await p.getByLabel('Nome fantasia',{exact:true}).waitFor();check(await p.getByLabel('Nome fantasia',{exact:true}).inputValue()==='Demonstração R5 '+suffix,'F5 conserva os dados institucionais '+suffix)
  await p.getByRole('tab',{name:'Identidade visual',exact:true}).click()
  const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');x.fillStyle='#006194';x.fillRect(8,8,112,48);return c.toDataURL('image/png').split(',')[1]})
  await p.getByLabel('Selecionar Logo principal',{exact:true}).setInputFiles({name:'demonstracao-r5.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')})
  await p.getByAltText('Prévia: Logo principal').waitFor()
  await p.getByRole('tab',{name:'Timbrados e documentos',exact:true}).click()
  await p.getByLabel('Marca-d’água opcional',{exact:true}).fill('DEMONSTRAÇÃO R5 '+suffix)
  await p.getByLabel('Texto complementar da linha 1 do Rodapé',{exact:true}).fill('Rodapé fictício '+suffix)
  await p.getByLabel('Texto complementar da linha 1 do Rodapé',{exact:true}).press('Enter')
  // Cabeçalho é preenchido pela interface normal, com destino detectado por seu rótulo oficial.
  await p.locator('.cfg-campo').filter({hasText:'Campos do cabeçalho'}).getByRole('button',{name:'Adicionar linha',exact:true}).click()
  await p.getByLabel('Texto complementar da linha 1 do Cabeçalho',{exact:true}).fill('Cabeçalho fictício '+suffix)
  await p.getByLabel('Texto complementar da linha 1 do Cabeçalho',{exact:true}).press('Enter')
  await p.getByRole('tab',{name:'Tela de login',exact:true}).click()
  await p.getByLabel('Mensagem de boas-vindas',{exact:true}).fill('Bem-vindo à demonstração R5 '+suffix)
  await submit(p,true)
  r=await api(s.c,{acao:'consultar',escopo:id})
  check(!r.error&&r.data.documento.campos.marcaDagua==='DEMONSTRAÇÃO R5 '+suffix&&r.data.documento.campos.cabecalho.some(l=>l.some(a=>a.texto==='Cabeçalho fictício '+suffix))&&r.data.documento.campos.rodape.some(l=>l.some(a=>a.texto==='Rodapé fictício '+suffix)),'Cabeçalho, rodapé e timbrado persistidos no servidor '+suffix)
  const logo=r.data.documento.campos.logoPrincipal
  check(typeof logo==='string'&&logo.startsWith(id+'/')&&typeof r.data.ativos[logo]==='string','Upload real registrado e leitura privada assinada '+suffix)
  const signed=await fetch(r.data.ativos[logo],{signal:AbortSignal.timeout(20000)});check(signed.ok&&signed.headers.get('content-type')?.includes('image/png'),'Download posterior do logo real '+suffix)
  await p.reload();await p.getByRole('heading',{name:'Configurações',exact:true}).waitFor();await p.getByRole('tab',{name:'Timbrados e documentos',exact:true}).click()
  check(await p.getByLabel('Marca-d’água opcional',{exact:true}).inputValue()==='DEMONSTRAÇÃO R5 '+suffix,'Recarga preserva timbrado/cabeçalho/rodapé '+suffix)
  await p.getByRole('button',{name:'Gerar PDF de demonstração',exact:true}).click();await p.getByRole('link',{name:'Baixar PDF de demonstração'}).waitFor();check(true,'Geração real local de PDF de demonstração com configuração persistida '+suffix)
  const pub=await publicRead('configuracoes-homologacao-r5-'+suffix.toLowerCase()+'.invalid')
  check(pub.status===200&&pub.data.marca?.mensagem==='Bem-vindo à demonstração R5 '+suffix&&pub.data.marca.logo,'Projeção pública do login coincide com versão aplicada '+suffix)
  const img=await fetch(pub.data.marca.logo,{headers:{apikey:publicKey},signal:AbortSignal.timeout(20000)});check(img.ok&&img.headers.get('content-type')?.includes('image/png'),'Logo público real do login '+suffix);assets.push(pub.data.marca.logo)
  await p.getByRole('button',{name:'Sair',exact:true}).click()
  await p.getByText('Bem-vindo à demonstração R5 '+suffix,{exact:true}).waitFor();check(await p.locator('#email').isVisible(),'Login anônimo exibe personalização e formulário funcional '+suffix)
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
 for(let n=0;n<2;n++){const s=slots[n],p=pages[n];const jpeg=Buffer.from(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');x.fillStyle='#104052';x.fillRect(0,0,128,64);return c.toDataURL('image/jpeg').split(',')[1]}),'base64');const f=new FormData();f.set('acao','enviar');f.set('escopo',ids[n]);f.set('arquivo',new Blob([jpeg],{type:'image/jpeg'}),'demonstracao-r5.jpg');const r=await api(s.c,f);check(!r.error,'Upload JPEG real normalizado pelo serviço '+n)}
report.conjuntoRestanteConcluido=true;return true;
}

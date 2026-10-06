// Testes conectados no principal explicitamente autorizado: somente IDs fictícios da execução.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { API, REF, destino, pacote, sql as sqlRemote, dados, alvo } from './controle.mjs';
import { ler, confirmar, credenciais } from './identidades.mjs';
let execucao: any;
function sql(texto: string): string {
  alvo();
  if(/\b(?:delete|drop|truncate|alter|create)\b/i.test(texto))throw new Error('Operação não autorizada no runner.');
  if(/\b(?:insert|update)\b/i.test(texto)&&!texto.includes(execucao.usuarios.admin_duas.id))throw new Error('Escrita fora do ator técnico recusada.');
  const prova=Object.values(execucao.usuarios).map((u: any)=>"'"+u.id+"'").join(',');
  const guard="do $$ begin if (select count(*) from auth.users where id in ("+prova+") and email like '%.'"+" || '"+execucao.run+"@example.invalid')<>5 then raise exception 'Identidades fora da execução';end if;end $$;";
  const r=dados(sqlRemote('begin;'+guard+'\n'+texto+'\ncommit;'));
  if(!r.length)return '';const values=Object.values(r[0]);return values.length===1?(typeof values[0]==='object'?JSON.stringify(values[0]):String(values[0])):JSON.stringify(r);
}
const selecionados=new Set((process.env.EQUIPE_CENARIOS??'').split(',').filter(Boolean));
let ultimaResposta: Record<string,unknown>={};
let persistir=()=>({});
const resultadoPath=destino+'/resultado-real.json';
const anteriores=existsSync(resultadoPath)?JSON.parse(readFileSync(resultadoPath,'utf8')):null;
const resultadoAnterior=anteriores?.project===REF?anteriores.resultados:[];
import { contratoVazio, pessoalVazio, formacaoVazia } from '../../../../supabase/functions/_shared/equipeFicha.ts';
const resultados: {cenario:string,resultado:string,evidencia?:Record<string,unknown>}[]=resultadoAnterior??[];
function exigir(v:unknown) { if(!v)throw new Error('Evidência esperada ausente.'); }
function pdf(texto:string) {
  const partes=['%PDF-1.4\n'];const offsets=[0];
  const stream=`BT /F1 12 Tf 20 100 Td (${texto}) Tj ET`;
  const objetos=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  objetos.forEach((o,i)=>{offsets.push(partes.join('').length);partes.push(`${i+1} 0 obj\n${o}\nendobj\n`);});
  const x=partes.join('').length;partes.push(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`);return new TextEncoder().encode(partes.join(''));
}
const codigoNegado=(r:{status:number})=>[401,403,404].includes(r.status);
async function testar(cenario:string,acao:()=>Promise<void>) {
  if(selecionados.size&&!selecionados.has(cenario))return;
  const index=resultados.findIndex(r=>r.cenario===cenario);if(index>=0)resultados.splice(index,1);
  try{await acao();resultados.push({cenario,resultado:'aprovado_real'});}catch(e){const classe=e instanceof Error&&/^[A-Za-z]{1,40}$/.test(e.name)?e.name:'Erro';resultados.push({cenario,resultado:'falhou_real',evidencia:{...ultimaResposta,classe}});}
  writeFileSync(destino+'/estado-testes.json',JSON.stringify({run:execucao.run,...persistir()},null,2),{mode:0o600});
  writeFileSync(destino+'/resultado-real.json',JSON.stringify({instante:new Date().toISOString(),ambiente:API,project:REF,run:execucao.run,resultados},null,2));
  console.log(cenario+': '+resultados.at(-1)!.resultado); // Somente ID/estado, sem dados/respostas/erros brutos.
}
async function main() {
  confirmar();const f={...ler(),...credenciais()};execucao=f;
  if(f.fase!=='pronto')throw new Error('Fixtures técnicas incompletas.');
  const B=f.clinicas.brotas,I=f.clinicas.ipupiara,M=f.membros;
  async function login(perfil='admin_duas') {
    const c=createClient(API,f.anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const r=await c.auth.signInWithPassword({email:f.usuarios[perfil].email,password:f.usuarios[perfil].password});
    exigir(!r.error && r.data.session);return {client:c,jwt:r.data.session!.access_token};
  }
  let owner=await login();const single=await login('admin_brotas');
  const semPermissao=await Promise.all(['recepcao','medico','sem_vinculo'].map(p=>login(p)));
  const headers=(jwt?:string)=>({apikey:f.anon,...(jwt?{Authorization:'Bearer '+jwt}:{})});
  async function edge(fn:string,body:Record<string,unknown>|FormData,jwt=owner.jwt) {
    if(!Object.values(M).includes(String(body instanceof FormData?JSON.parse(String(body.get('contexto')??'{"membroId":"'+body.get('membroId')+'"}')).membroId:body.membroId)))throw new Error('Membro fora da execução.');
    const acao=body instanceof FormData?'multipart':String(body.acao);
    ultimaResposta={funcao:fn,acao,estado:'aguardando_resposta'};
    const response=await fetch(API+'/functions/v1/'+fn,{method:'POST',headers:{...headers(jwt),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
    ultimaResposta={funcao:fn,acao,status:response.status};
    if(response.headers.get('content-type')?.includes('application/json')){const d=await response.clone().json();const codigo=d.codigo??d.code;if(typeof codigo==='string'&&/^[A-Z_]{1,40}$/.test(codigo))ultimaResposta.codigo=codigo;if(typeof d.campo==='string'&&/^[a-z_]{1,40}$/.test(d.campo))ultimaResposta.campo=d.campo;}
    return response;
  }
  async function ficha(membro=M.medico_clt,clinica=B,jwt=owner.jwt) {
    const r=await edge('equipe-fichas',{acao:'obter',membroId:membro,clinicaId:clinica},jwt);exigir(r.ok);return r.json();
  }
  async function salvar(tipo:string,dados:unknown,unidades=[B,I],membro=M.medico_clt,id:string=randomUUID(),revisao=0,referenciaId:string|null=null,jwt=owner.jwt) {
    const r=await edge('equipe-fichas',{acao:'salvar',membroId:membro,clinicaId:B,id,tipo,dados,unidades,revisao,referenciaId},jwt);exigir(r.ok);return r.json();
  }
  const imagem=readFileSync(pacote+'/../../../../tests/operacional/assets/avatar-equipe-ficticio.png');
  async function metaFoto(membro=M.medico_clt) {
    const r=await owner.client.rpc('equipe_foto_autorizar',{p_membro_id:membro,p_clinica_id:B,p_escrita:true});exigir(!r.error);return r.data;
  }
  async function foto(revisao:number,file:Uint8Array|null,jwt=owner.jwt) {
    let body:FormData|Record<string,unknown>={acao:'foto_remover',membroId:M.medico_clt,clinicaId:B,revisao};
    if(file){body=new FormData();body.set('acao','foto_salvar');body.set('membroId',M.medico_clt);body.set('clinicaId',B);body.set('revisao',String(revisao));body.set('foto',new File([new Uint8Array(file)],'foto-ficticia.png',{type:'image/png'}));}
    return edge('equipe-recursos',body,jwt);
  }
  const estadoPath=destino+'/estado-testes.json';
  const estado=existsSync(estadoPath)?JSON.parse(readFileSync(estadoPath,'utf8')):{};
  if(estado.run&&estado.run!==f.run)throw new Error('Estado de outra execução.');
  let caminhoFoto=estado.caminhoFoto??'',docId=estado.docId??'',docNovo=estado.docNovo??'',contratoId=estado.contratoId??'',contratoRevisao=estado.contratoRevisao??0,contratoDados:Record<string,unknown>=estado.contratoDados??{};
  persistir=()=>({caminhoFoto,docId,docNovo,contratoId,contratoRevisao,contratoDados});
  await testar('catalogo-objetos-grants-vault-buckets',async()=>{
    // Catálogo e integridade reais já foram verificados após cada migration.

    const c=sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity and c.relname in ('equipe_fotos','profissionais_recebimento','equipe_registros','equipe_registro_versoes','equipe_documentos','equipe_documento_tentativas','equipe_ocupacional_autorizacoes','equipe_ficha_eventos');").trim();exigir(c==='8');
    exigir(sql("select count(*) from storage.buckets where id in ('equipe-fotos','equipe-documentos') and not public;").trim()==='2');
    exigir(sql("select count(*) from vault.secrets where name in ('cpf_key','cpf_pepper');").trim()==='2');
    const r=await owner.client.from('equipe_registros').select('id').eq('membro_id',M.medico_clt);exigir(!!r.error||!r.data?.length);
  });
  await testar('foto-enviar-confirmar-nova-sessao',async()=>{
    const r=await foto((await metaFoto()).revisao,imagem);exigir(r.ok);const d=await r.json();caminhoFoto=d.caminho;exigir(d.revisao>0);
    await owner.client.auth.signOut();owner=await login();exigir((await metaFoto()).caminho===caminhoFoto);
    const bytes=await fetch(API+'/storage/v1/object/equipe-fotos/'+caminhoFoto,{headers:{...headers(owner.jwt),'x-clinica-id':B}});exigir(bytes.ok && (await bytes.arrayBuffer()).byteLength>0);
  });
  await testar('foto-falha-preserva-anterior',async()=>{const a=await metaFoto();exigir(typeof a.caminho==='string'&&a.caminho.length>0);const r=await foto(a.revisao,new Uint8Array([1,2,3]));exigir(r.status===422);exigir((await metaFoto()).caminho===a.caminho);});
  await testar('foto-substituir',async()=>{const a=await metaFoto();const r=await foto(a.revisao,imagem);exigir(r.ok);const d=await r.json();exigir(d.caminho!==a.caminho);caminhoFoto=d.caminho;});
  await testar('foto-negativas-perfis-unidade-caminho',async()=>{
    for(const p of [...semPermissao,single])exigir(codigoNegado(await foto((await metaFoto()).revisao,imagem,p.jwt)));
    for(const p of semPermissao){const r=await fetch(API+'/storage/v1/object/equipe-fotos/'+caminhoFoto,{headers:{...headers(p.jwt),'x-clinica-id':B}});exigir(!r.ok);}
    const r=await fetch(API+'/storage/v1/object/equipe-fotos/'+caminhoFoto,{headers:{...headers(single.jwt),'x-clinica-id':I}});exigir(!r.ok);
    const direto=await fetch(API+'/storage/v1/object/equipe-fotos/'+M.medico_clt+'/'+randomUUID()+'.jpg',{method:'POST',headers:{...headers(owner.jwt),'Content-Type':'image/jpeg'},body:new Uint8Array(imagem)});exigir(!direto.ok);
  });
  const pix=()=>({preferencia:'pix',pix:{tipo:'email',chave:'favorecido@equipe3133.example.invalid'},conta:null,favorecido:{tipo:'pf',nome:'Favorecido Fictício',documento:'',diferente:false}});
  const cpfSintetico=()=>{let s='741258963';for(let n=9;n<=10;n++){let soma=0;for(let i=0;i<n;i++)soma+=Number(s[i])*(n+1-i);let d=11-soma%11;s+=String(d>=10?0:d);}return s;};
  const banco=()=>({...pix(),preferencia:'transferencia',pix:null,conta:{instituicao:'Banco Fictício',codigo:'',agencia:'0001',digitoAgencia:'',numero:'00001234',digitoConta:'0',tipo:'pagamento'},favorecido:{...pix().favorecido,documento:cpfSintetico(),diferente:true}});
  async function recebimento(clinica=B,c:SupabaseClient=owner.client) { const r=await c.rpc('equipe_recebimento_obter',{p_membro_id:M.medico_clt,p_clinica_id:clinica});exigir(!r.error);return r.data; }
  async function gravarReceb(dados:unknown,clinica=B,revisao=0,jwt=owner.jwt) {return edge('equipe-recursos',{acao:'recebimento_salvar',membroId:M.medico_clt,clinicaId:clinica,revisao,dados,preservar:[]},jwt);}
  await testar('recebimento-pix-conta-ambos-persistencia-mascara',async()=>{
    for(const d of [pix(),banco(),{...banco(),pix:pix().pix}]){const r=await gravarReceb(d,B,(await recebimento()).revisao);exigir(r.ok);const v=await r.json();exigir(!JSON.stringify(v).includes('00001234'));}
    owner=await login();exigir((await recebimento()).dados.conta.numero.startsWith('••••'));
  });
  await testar('recebimento-isolamento-brotas-ipupiara',async()=>{const antes=await recebimento(I);exigir((await gravarReceb(pix(),B,(await recebimento()).revisao)).ok);exigir(JSON.stringify(await recebimento(I))===JSON.stringify(antes));exigir((await gravarReceb(banco(),I,antes.revisao)).ok);});
  await testar('recebimento-concorrencia',async()=>{const atual=await recebimento();const respostas=await Promise.all([gravarReceb({...pix(),pix:{tipo:'email',chave:randomUUID()+'@equipe3133.example.invalid'}},B,atual.revisao),gravarReceb({...pix(),pix:{tipo:'email',chave:randomUUID()+'@equipe3133.example.invalid'}},B,atual.revisao)]);ultimaResposta={funcao:'equipe-recursos',statuses:respostas.map(r=>r.status)};exigir(respostas.filter(r=>r.ok).length===1&&respostas.some(r=>r.status===409));});
  await testar('recebimento-negativas-perfis-e-outra-unidade',async()=>{for(const p of semPermissao){const r=await p.client.rpc('equipe_recebimento_obter',{p_membro_id:M.medico_clt,p_clinica_id:B});exigir(!!r.error);exigir(codigoNegado(await gravarReceb(pix(),B,0,p.jwt)));}const r=await single.client.rpc('equipe_recebimento_obter',{p_membro_id:M.medico_clt,p_clinica_id:I});exigir(!!r.error);});
  await testar('listagem-sem-valores-financeiros-contratos-historico',async()=>{const r=await owner.client.rpc('equipe_listar',{p_clinica_contexto_id:B});exigir(!r.error&&Array.isArray(r.data)&&r.data.filter((v:{id:string})=>Object.values(M).includes(v.id)).length===3);const texto=JSON.stringify(r.data);for(const v of ['dados_encrypted','remuneracao','favorecido','00001234','@equipe3133.example.invalid','jornada','cpf_key'])exigir(!texto.includes(v));});
  await testar('fichas-clt-prestador-medico-clt-jornada-formacao',async()=>{
    const empresa=await salvar('empresa',{nome:'Empresa Contratante Fictícia '+f.run,cnpj:''});
    for(const [tipo,membro] of [['clt',M.funcionario],['servicos_pf',M.prestador],['clt',M.medico_clt]]){
      const dados={...contratoVazio(),empresa_id:empresa.id,vinculo:tipo,admissao:'2026-10-01',inicio_atividades:'2026-10-01',cargo:'Função Fictícia',vigencia:'2026-10-01',situacao:'vigente',situacao_data:'2026-10-01',horas_semanais:'20',jornada:[{id:randomUUID(),unidade_id:B,dia:'1',inicio:'08:00',fim:'12:00',intervalo_inicio:'',intervalo_fim:''}]};
      const r=await salvar('contrato',dados,[B,I],membro);if(membro===M.medico_clt){contratoId=r.id;contratoRevisao=r.revisao;contratoDados=dados;}exigir((await ficha(membro)).registros.some((v:{id:string})=>v.id===r.id));
    }
    await salvar('pessoal',{...pessoalVazio(),nome_social:'Nome Fictício'});
    await salvar('formacao',{...formacaoVazia(),registros:[{id:randomUUID(),conselho:'CRM',numero:'SINTETICO-3133',uf:'BA',situacao_informada:'informado',conferencia:'aguardando',conferido_em:null,conferido_por:null,fonte:'',evidencia_id:'',proxima_conferencia:''}]});
    owner=await login();exigir((await ficha()).registros.some((v:{tipo:string})=>v.tipo==='formacao'));
  });
  await testar('contrato-concorrencia-historico-versao-antiga',async()=>{
    exigir(contratoId);const atual=(await ficha()).registros.find((r:{id:string})=>r.id===contratoId);exigir(atual);const previa=atual.revisao;
    const novos=await salvar('contrato',{...atual.dados,cargo:'Cargo Revisado Fictício '+randomUUID(),remuneracao:'1500.00'},[B,I],M.medico_clt,contratoId,previa);contratoRevisao=novos.revisao;
    const conflito=await edge('equipe-fichas',{acao:'salvar',membroId:M.medico_clt,clinicaId:B,id:contratoId,tipo:'contrato',dados:atual.dados,unidades:[B,I],revisao:previa});exigir(conflito.status===409);
    const antigo=await edge('equipe-fichas',{acao:'versao',membroId:M.medico_clt,clinicaId:B,id:contratoId,revisao:previa});exigir(antigo.ok&&(await antigo.json()).dados.cargo===atual.dados.cargo);
  });
  await testar('administradora-uma-unidade-contrato-exclusivo-sem-global',async()=>{
    const empresa=await salvar('empresa',{nome:'Empresa Fictícia Exclusiva de Brotas '+f.run,cnpj:''},[B],M.medico_clt,randomUUID(),0,null,single.jwt);
    const c=await salvar('contrato',{...contratoDados,empresa_id:empresa.id,cargo:'Exclusivo Fictício Brotas'},[B],M.medico_clt,randomUUID(),0,null,single.jwt);
    exigir((await ficha(M.medico_clt,B,single.jwt)).registros.some((r:{id:string})=>r.id===c.id));
    exigir(!(await ficha(M.medico_clt,I)).registros.some((r:{id:string})=>r.id===c.id));
    const negar=await edge('equipe-fichas',{acao:'salvar',membroId:M.medico_clt,clinicaId:B,id:randomUUID(),tipo:'pessoal',dados:pessoalVazio(),unidades:[B],revisao:0},single.jwt);exigir(codigoNegado(negar));
  });
  const meta=(substitui_id:string|null=null)=>({categoria:'contrato',contrato_id:contratoId,unidades:[B,I],emissao:'2026-10-01',validade:'',substitui_id});
  async function documento(id:string,bytes:Uint8Array,substitui_id:string|null=null) {const body=new FormData();body.set('contexto',JSON.stringify({acao:'documento_salvar',membroId:M.medico_clt,clinicaId:B,id,meta:meta(substitui_id)}));body.set('arquivo',new File([new Uint8Array(bytes)],'documento-ficticio.pdf',{type:'application/pdf'}));return edge('equipe-fichas',body);}
  const docBytes=pdf('Documento ficticio de homologacao');
  await testar('conflitos-pt409-foto-documentos-sem-repeticao',async()=>{
    const inicio=Date.now(),a=await metaFoto();exigir(a.revisao>0);
    const fotoAntes=a.caminho;const remover=await foto(a.revisao-1,null);exigir(remover.status===409);exigir((await metaFoto()).caminho===fotoAntes);
    const d=(await ficha()).documentos.find((v:{id:string})=>v.id===docNovo);exigir(d&&!d.arquivado);
    const conferir=await edge('equipe-fichas',{acao:'documento_conferir',membroId:M.medico_clt,clinicaId:B,id:docNovo,revisao:d.revisao-1,situacao:'conferido',fonte:'Conferência sintética de conflito'});exigir(conferir.status===409);
    const substituir=await documento(randomUUID(),pdf('Candidata ficticia recusada'),docId);exigir(substituir.status===409);
    const confirmado=(await ficha()).documentos.find((v:{id:string})=>v.id===docNovo);exigir(confirmado.revisao===d.revisao&&!confirmado.arquivado);exigir(Date.now()-inicio<60000);
  });
  await testar('documento-arquivo-registro-confirmados-nova-sessao',async()=>{const id=randomUUID(),r=await documento(id,docBytes);exigir(r.ok);const d=await r.json();docId=d.id;exigir(d.id===id&&d.armazenamento==='disponivel'&&d.conferencia==='aguardando'&&!('caminho'in d));owner=await login();exigir((await ficha()).documentos.some((v:{id:string})=>v.id===docId));});
  await testar('documento-download-binario-sem-url-publica',async()=>{const r=await edge('equipe-fichas',{acao:'documento_ler',membroId:M.medico_clt,clinicaId:B,id:docId});exigir(r.ok&&r.headers.get('cache-control')==='no-store');exigir(createHash('sha256').update(new Uint8Array(await r.arrayBuffer())).digest('hex')===createHash('sha256').update(docBytes).digest('hex'));});
  await testar('documento-repeticao-idempotente',async()=>{exigir((await documento(docId,docBytes)).ok);exigir((await ficha()).documentos.filter((v:{id:string})=>v.id===docId).length===1);});
  await testar('documento-conferir-substituir-versao-preservada',async()=>{const r=await edge('equipe-fichas',{acao:'documento_conferir',membroId:M.medico_clt,clinicaId:B,id:docId,revisao:1,situacao:'conferido',fonte:'Conferência sintética'});exigir(r.ok);const id=randomUUID(),s=await documento(id,pdf('Documento ficticio versao dois'),docId);exigir(s.ok);const d=await s.json();docNovo=d.id;exigir(d.conferencia==='aguardando'&&d.versao===2);const a=(await ficha()).documentos.find((v:{id:string})=>v.id===docId);exigir(a.arquivado);exigir((await edge('equipe-fichas',{acao:'documento_ler',membroId:M.medico_clt,clinicaId:B,id:docId})).ok);});
  await testar('documento-substituicao-falha-preserva-confirmado',async()=>{const r=await documento(randomUUID(),new Uint8Array([1,2,3]),docNovo);exigir(!r.ok);exigir(!(await ficha()).documentos.find((v:{id:string})=>v.id===docNovo).arquivado);});
  await testar('documento-falha-parcial-recuperacao-outra-sessao',async()=>{
    // Controle de falha só neste ambiente: executar reserva/upload reais, omitir confirmação.
    // Service_role prepara o ponto de interrupção; recuperação e leitura usam JWT da pessoa.
    const admin=createClient(API,f.service,{auth:{persistSession:false,autoRefreshToken:false}}),id=randomUUID();
    const args={p_membro_id:M.medico_clt,p_clinica_id:B,p_ator_id:f.usuarios.admin_duas.id,p_id:id};
    const hash=createHash('sha256').update(docBytes).digest('hex');const r=await admin.rpc('equipe_documento_reservar',{...args,p_meta:meta(),p_sha256:hash,p_mime:'application/pdf',p_tamanho:docBytes.length});exigir(!r.error);
    exigir(!(await ficha()).documentos.some((v:{id:string})=>v.id===id));
    const u=await admin.storage.from('equipe-documentos').upload(r.data.caminho,docBytes,{contentType:'application/pdf',upsert:false});exigir(!u.error);
    owner=await login();exigir((await ficha()).tentativas.some((v:{id:string})=>v.id===id));const recuperar={acao:'documento_recuperar',membroId:M.medico_clt,clinicaId:B,id};exigir((await edge('equipe-fichas',recuperar)).ok);exigir((await edge('equipe-fichas',recuperar)).ok);exigir((await ficha()).documentos.filter((v:{id:string})=>v.id===id).length===1);
  });
  await testar('documento-ids-clinica-caminho-e-perfis-negados',async()=>{
    for(const p of [...semPermissao,single])exigir(codigoNegado(await edge('equipe-fichas',{acao:'documento_ler',membroId:M.medico_clt,clinicaId:B,id:docNovo},p.jwt)));
    exigir(codigoNegado(await edge('equipe-fichas',{acao:'documento_ler',membroId:M.funcionario,clinicaId:B,id:docNovo})));
    const path=M.medico_clt+'/'+docNovo+'.pdf';for(const p of [owner,single,...semPermissao])exigir(!(await fetch(API+'/storage/v1/object/equipe-documentos/'+path,{headers:headers(p.jwt)})).ok);
    exigir(!(await fetch(API+'/storage/v1/object/public/equipe-documentos/'+path)).ok);
    exigir(!(await owner.client.storage.from('equipe-documentos').createSignedUrl(path,60)).data?.signedUrl);
  });
  await testar('ocupacional-autorizacao-especifica-por-unidade',async()=>{
    const id=randomUUID(),body=new FormData();body.set('contexto',JSON.stringify({acao:'documento_salvar',membroId:M.medico_clt,clinicaId:B,id,meta:{...meta(),categoria:'aso'}}));body.set('arquivo',new File([new Uint8Array(docBytes)],'aso-administrativo-ficticio.pdf',{type:'application/pdf'}));
    exigir(codigoNegado(await edge('equipe-fichas',body)));
    sql(`insert into public.equipe_ocupacional_autorizacoes(ator_id,clinica_id,finalidade,autorizado_por) values('${f.usuarios.admin_duas.id}','${B}','Teste administrativo sintético','${f.usuarios.admin_duas.id}');`);
    exigir(codigoNegado(await edge('equipe-fichas',body)));
    sql(`insert into public.equipe_ocupacional_autorizacoes(ator_id,clinica_id,finalidade,autorizado_por) values('${f.usuarios.admin_duas.id}','${I}','Teste administrativo sintético','${f.usuarios.admin_duas.id}');`);
    try{exigir((await edge('equipe-fichas',body)).ok);}finally{sql(`update public.equipe_ocupacional_autorizacoes set ativo=false where ator_id='${f.usuarios.admin_duas.id}';`);}
    exigir(codigoNegado(await edge('equipe-fichas',{acao:'documento_ler',membroId:M.medico_clt,clinicaId:B,id})));
  });
  await testar('fichas-contratos-historico-permissoes-atuais',async()=>{
    const corpo={acao:'versao',membroId:M.medico_clt,clinicaId:B,id:contratoId,revisao:1};
    exigir(codigoNegado(await edge('equipe-fichas',corpo,single.jwt)));
    sql(`update public.usuarios_clinicas set ativo=false where usuario_id='${f.usuarios.admin_duas.id}' and clinica_id='${I}';`);
    try{exigir(codigoNegado(await edge('equipe-fichas',corpo)));exigir(codigoNegado(await edge('equipe-fichas',{acao:'documento_ler',membroId:M.medico_clt,clinicaId:B,id:docNovo})));}
    finally{sql(`update public.usuarios_clinicas set ativo=true where usuario_id='${f.usuarios.admin_duas.id}' and clinica_id='${I}';`);}
  });
  await testar('consultas-diretas-tabelas-rpcs-internas-negadas',async()=>{
    for(const p of [owner,single,...semPermissao]){
      for(const tabela of ['equipe_registros','equipe_registro_versoes','equipe_documentos','equipe_ficha_eventos']){const campo=tabela==='equipe_registro_versoes'?'registro_id':'membro_id';const id=tabela==='equipe_registro_versoes'?contratoId:M.medico_clt;const r=await p.client.from(tabela).select('*').eq(campo,id);exigir(!!r.error||!r.data?.length);}
      const r=await p.client.rpc('equipe_ficha_versao',{p_membro_id:M.medico_clt,p_clinica_id:B,p_ator_id:f.usuarios.admin_duas.id,p_id:contratoId,p_revisao:1});exigir(!!r.error);
    }
  });
  await testar('sem-autenticacao-negado',async()=>{const r=await fetch(API+'/functions/v1/equipe-fichas',{method:'POST',headers:{apikey:f.anon,'Content-Type':'application/json'},body:JSON.stringify({acao:'obter',membroId:M.medico_clt,clinicaId:B})});exigir(codigoNegado(r));});
  await testar('jwt-invalido-e-arquivo-sem-token-negados',async()=>{
    // Não obtém segredo JWT remoto: assinatura inválida não prova expiração por tempo.
    const partes=owner.jwt.split('.');const invalido=partes[0]+'.'+partes[1]+'.assinatura-invalida';
    exigir(codigoNegado(await edge('equipe-fichas',{acao:'documento_ler',membroId:M.medico_clt,clinicaId:B,id:docNovo},invalido)));
    exigir(!(await fetch(API+'/storage/v1/object/equipe-fotos/'+caminhoFoto,{headers:{apikey:f.anon,'x-clinica-id':B}})).ok);
  });
  await testar('auditoria-sem-valores-ou-segredos',async()=>{
    const r=sql("select coalesce(jsonb_agg(jsonb_build_object('antes',dados_antes,'depois',dados_depois)),'[]'::jsonb) from public.auditoria where usuario_id='"+f.usuarios.admin_duas.id+"' and entidade in ('equipe_fotos','profissionais_recebimento','equipe_ficha');");
    for(const v of ['00001234',cpfSintetico(),'Documento ficticio','1500.00','dados_encrypted','cpf_key'])exigir(!r.includes(v));
    for(const v of [f.service,owner.jwt,...Object.values(f.usuarios).map(v=>(v as {password:string}).password)])exigir(!r.includes(v));exigir(r.length>2);

  });
  await testar('foto-remover-confirmar-nova-sessao',async()=>{const r=await foto((await metaFoto()).revisao,null);exigir(r.ok);owner=await login();exigir((await metaFoto()).caminho===null);});
  const failed=resultados.filter(r=>r.resultado!=='aprovado_real').length;console.log('Cenários reais: '+resultados.length+'; falhas: '+failed);if(failed)process.exitCode=1;
}
main().catch(()=>{console.error('Homologação não iniciada/concluída: destino ou pré-requisitos indisponíveis. Nenhuma credencial/resposta foi impressa.');process.exitCode=1;});

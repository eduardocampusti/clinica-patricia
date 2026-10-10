// Entry only in the existing isolated Vite test configuration. Never imported by src.
import { comporRecebimento, mascararRecebimento, type DadosRecebimento } from '../../supabase/functions/_shared/equipeRecebimento'
if(import.meta.env.VITE_SUPABASE_URL!=='https://operacional.synthetic.invalid')throw new Error('Esta demonstração exige o servidor sintético de testes.')
const clinicas=[{id:'clinica-a',nome:'Clínica Brotas'},{id:'clinica-b',nome:'Clínica Ipupiara'}]
const id='11111111-1111-4111-8111-111111111111'
const membros=['Médica Sintética','Recepção Sintética'].map((nome,i)=>({id:i?id.replace(/^1/,'2'):id,nome_completo:nome,cargo:i?'Recepção':'Médico(a)',tipo:i?'administrativo':'profissional_saude',profissao:i?null:'Clínica médica',clinicas,revisao:1,acesso_status:'sem_conta',telefone:null,email_contato:null,conselho_classe:null,registro_conselho:null,conselho_uf:null,especialidade_id:null,especialidade_nome:null}))
const fotos=new Map<string,{caminho:string|null;revisao:number;bytes:Uint8Array|null}>()
const recebimentos=new Map<string,{revisao:number;dados:DadosRecebimento}>()
const user={id:'usuario-sintetico',aud:'authenticated',role:'authenticated',email:'sintetico@example.invalid'}
// Keep the isolated entry when changing clinic and refreshing its route.
const pushState=history.pushState.bind(history)
history.pushState=(data,title,path)=>{if(path){const u=new URL(String(path),location.href);if(u.origin===location.origin&&u.pathname.startsWith('/sistema/')){u.searchParams.set('demo','recursos');path=u.toString()}}pushState(data,title,path)}
localStorage.setItem('sb-operacional-auth-token',JSON.stringify({access_token:'synthetic-session-not-a-credential',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}))
const realFetch=window.fetch.bind(window)
window.fetch=async(input,init)=>{
  const request=new Request(input,init);const url=new URL(request.url)
  if(url.origin===location.origin)return realFetch(input,init)
  if(url.hostname!=='operacional.synthetic.invalid')throw new Error('Rede externa bloqueada na demonstração.')
  const json=(d:unknown,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})
  if(url.pathname.endsWith('/auth/v1/user'))return json(user)
  if(url.pathname.endsWith('/usuarios_clinicas'))return json({papel:'proprietaria'})
  if(url.pathname.endsWith('/clinicas'))return json(clinicas)
  if(url.pathname.endsWith('/rpc/equipe_listar'))return json(membros)
  if(url.pathname.endsWith('/rpc/equipe_detalhar')){const b=await request.json();return json({...membros.find(m=>m.id===b.p_membro_id),cpf:null,cpf_situacao:'ausente'})}
  if(url.pathname.endsWith('/rpc/equipe_fotos_listar')){const b=await request.json();return json(membros.map(m=>({membro_id:m.id,clinica_id:b.p_clinica_id,caminho:fotos.get(m.id)?.caminho??null,revisao:fotos.get(m.id)?.revisao??0,pode_editar:true})))}
  if(url.pathname.includes('/storage/v1/object/')){const f=[...fotos.values()].find(f=>url.pathname.endsWith(f.caminho??'/ausente'));return f?.bytes?new Response(f.bytes as Uint8Array<ArrayBuffer>,{headers:{'Content-Type':'image/jpeg'}}):json({},404)}
  if(url.pathname.endsWith('/rpc/equipe_recebimento_obter')){const b=await request.json();if(b.p_membro_id!==id||!clinicas.some(c=>c.id===b.p_clinica_id))return json({code:'42501'},403);const r=recebimentos.get(b.p_clinica_id);return json({membro_id:id,clinica_id:b.p_clinica_id,profissional_id:'profissional-sintetico',revisao:r?.revisao??0,dados:mascararRecebimento(r?.dados??null)})}
  if(url.pathname.endsWith('/functions/v1/equipe-acessos')){const b=await request.json();if(b.acao!=='listar')return json({codigo:'NAO_AUTORIZADO'},403);return json({membro_id:b.membroId,usuario_id:null,login_email:null,conta_confirmada:false,clinicas:clinicas.map(c=>({...c,usuario_id:null,ativo:false,status:'sem_acesso',papel:null})),convites:[]})}
  if(url.pathname.endsWith('/functions/v1/equipe-recursos')){
    try{
      if(request.headers.get('content-type')?.includes('multipart/form-data')){
        const form=await request.formData();const membroId=String(form.get('membroId'));const clinic=String(form.get('clinicaId'));const rev=Number(form.get('revisao'));const file=form.get('foto') as File
        if(!membros.some(m=>m.id===membroId)||!clinicas.some(c=>c.id===clinic))return json({codigo:'NAO_AUTORIZADO'},403)
        if((fotos.get(membroId)?.revisao??0)!==rev)return json({codigo:'CONFLITO'},409)
        // Browser decodes only synthetic preview data. Production sanitizes on Edge.
        const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d')!.drawImage(bitmap,0,0);bitmap.close()
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Foto inválida')),'image/jpeg',.85));const bytes=new Uint8Array(await blob.arrayBuffer())
        const caminho=`${membroId}/${crypto.randomUUID()}.jpg`;fotos.set(membroId,{caminho,revisao:rev+1,bytes});return json({membro_id:membroId,clinica_id:clinic,caminho,revisao:rev+1,limpeza_pendente:false})
      }
      const b=await request.json()
      if(b.acao==='foto_remover'){if((fotos.get(b.membroId)?.revisao??0)!==b.revisao)return json({codigo:'CONFLITO'},409);fotos.set(b.membroId,{caminho:null,revisao:b.revisao+1,bytes:null});return json({membro_id:b.membroId,clinica_id:b.clinicaId,caminho:null,revisao:b.revisao+1,limpeza_pendente:false})}
      if(b.acao==='recebimento_salvar'&&b.membroId===id&&clinicas.some(c=>c.id===b.clinicaId)){
        const r=recebimentos.get(b.clinicaId);if((r?.revisao??0)!==b.revisao)return json({codigo:'CONFLITO'},409);const dados=comporRecebimento({dados:b.dados,preservar:b.preservar},r?.dados??null);recebimentos.set(b.clinicaId,{revisao:b.revisao+1,dados});return json({membro_id:id,clinica_id:b.clinicaId,profissional_id:'profissional-sintetico',revisao:b.revisao+1,dados:mascararRecebimento(dados)})
      }
    }catch{return json({codigo:'DADOS_INVALIDOS'},422)}
    return json({codigo:'NAO_AUTORIZADO'},403)
  }
  // Forbid unrelated writes, including member/access operations.
  if(request.method!=='GET')return json({codigo:'NAO_AUTORIZADO'},403)
  return json([])
}
// Dynamic import ensures all Supabase clients receive the synthetic fetch.
await import('./cadastros-contexto')

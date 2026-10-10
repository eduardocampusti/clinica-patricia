import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { comporRecebimento, validarRecebimento, mascararRecebimento, cpfRecebimentoValido, cnpjRecebimentoValido, ErroRecursoEquipe } from './equipeRecebimento.ts'
import { processarFotoEquipe, verificarCabecalhoFoto, FOTO_MAX_BYTES, type ImagemEquipe } from './equipeFoto.ts'
import { erroServidorRecurso, gravarFotoEquipe, gravarRecebimentoEquipe, type ContextoRecurso, type PortasRecursosEquipe } from './equipeRecursosServico.ts'

// Only synthetic documents generated for validation, never identities from the project.
const cpf='52998224725',cnpj='11222333000181'
const pix=()=>({preferencia:'pix',pix:{tipo:'email',chave:'favorecido@example.invalid'},conta:null,favorecido:{tipo:'pf',nome:'Favorecido Sintético',documento:'',diferente:false}})
const banco=()=>({...pix(),preferencia:'transferencia',pix:null,conta:{instituicao:'Instituição Sintética',codigo:'001',agencia:'0001',digitoAgencia:'X',numero:'00001234',digitoConta:'0',tipo:'pagamento'},favorecido:{...pix().favorecido,documento:cpf,diferente:true}})
const codigo=(esperado:string)=>(e:unknown)=>e instanceof ErroRecursoEquipe&&e.codigo===esperado
test('PT409 comunica conflito sem autorizar repetição automática da gravação',()=>{
  assert.equal(erroServidorRecurso({code:'PT409'},true).codigo,'CONFLITO')
})
test('configuração admite PIX, conta e ambos; zeros, dígitos e campos opcionais preservados',()=>{
  assert.equal(validarRecebimento(pix()).pix?.tipo,'email')
  const b=validarRecebimento(banco());assert.equal(b.conta?.numero,'00001234');assert.equal(b.conta?.agencia,'0001');assert.equal(b.conta?.codigo,'001');assert.equal(b.conta?.digitoAgencia,'X')
  assert.ok(validarRecebimento({...banco(),pix:pix().pix}).pix)
  assert.equal(validarRecebimento({...banco(),conta:{...banco().conta,agencia:'',digitoAgencia:'',digitoConta:'',codigo:''}}).conta?.agencia,'')
})
test('documentos PF/PJ, CNPJ numérico e alfanumérico 2026 e todos os tipos PIX',()=>{
  assert.ok(cpfRecebimentoValido(cpf));assert.ok(cnpjRecebimentoValido(cnpj));assert.ok(cnpjRecebimentoValido('12ABC34501DE35'))
  for(const [tipo,chave] of [['cpf',cpf],['cnpj',cnpj],['cnpj','12ABC34501DE35'],['telefone','+5511999999999'],['aleatoria','123e4567-e89b-42d3-a456-426614174000'],['email','teste@example.invalid']])assert.equal(validarRecebimento({...pix(),pix:{tipo,chave}}).pix?.tipo,tipo)
  assert.equal(validarRecebimento({...banco(),favorecido:{tipo:'pj',nome:'Empresa Sintética',documento:cnpj,diferente:true}}).favorecido.tipo,'pj')
})
test('formatos/preferência incompatível/documento faltante/controle/tipos falsos são recusados',()=>{
  for(const v of [{...pix(),pix:null},{...pix(),preferencia:'transferencia'}, {...pix(),pix:{tipo:'cpf',chave:'11111111111'}},{...pix(),pix:{tipo:'telefone',chave:'11999999999'}},{...pix(),pix:{tipo:'cnpj',chave:'11222333000180'}},{...pix(),pix:{tipo:'aleatoria',chave:'inválida'}},{...pix(),favorecido:{...pix().favorecido,nome:'x\u0000y'}},{...banco(),favorecido:{...banco().favorecido,documento:''}},{...banco(),conta:{...banco().conta,numero:123}},{...banco(),conta:{...banco().conta,numero:''}}])assert.throws(()=>validarRecebimento(v),codigo('DADOS_INVALIDOS'))
})
test('máscaras não são aceitas como dados; preservação usa o confirmado e exige o mesmo tipo/instituição',()=>{
  const original=validarRecebimento({...banco(),pix:pix().pix});const masked=mascararRecebimento(original)!
  assert.ok(masked.pix!.chave.startsWith('••••'));assert.notEqual(masked.conta!.numero,original.conta!.numero);assert.equal(masked.favorecido.documento.length,6)
  assert.throws(()=>validarRecebimento(masked),codigo('DADOS_INVALIDOS'))
  const edit=structuredClone(original);edit.pix!.chave='';edit.conta!.numero='';edit.favorecido.documento=''
  assert.deepEqual(comporRecebimento({dados:edit,preservar:['pix.chave','conta.numero','favorecido.documento']},original),original)
  assert.throws(()=>comporRecebimento({dados:{...edit,pix:{tipo:'cpf',chave:''}},preservar:['pix.chave']},original),codigo('DADOS_INVALIDOS'))
  assert.throws(()=>comporRecebimento({dados:{...edit,conta:{...edit.conta,instituicao:'Outra instituição'}},preservar:['conta.numero']},original),codigo('DADOS_INVALIDOS'))
  assert.throws(()=>comporRecebimento({dados:edit,preservar:['__proto__.x']},original),codigo('DADOS_INVALIDOS'))
  assert.throws(()=>comporRecebimento({dados:edit,preservar:['pix.chave']},null),codigo('DADOS_INVALIDOS'))
})
const c:ContextoRecurso={membroId:'11111111-1111-4111-8111-111111111111',clinicaId:'22222222-2222-4222-8222-222222222222',atorId:'33333333-3333-4333-8333-333333333333',revisao:0}
function portas(){
  const chamadas:string[]=[];let revision=0;let caminho:string|null=null;let rece=validarRecebimento(pix());const descartados:string[]=[]
  const p:PortasRecursosEquipe={async autorizarFoto(contexto){chamadas.push('autorizar');if(contexto.atorId!==c.atorId||contexto.clinicaId!==c.clinicaId||contexto.membroId!==c.membroId)throw {code:'42501'}},async upload(path){chamadas.push('upload');assert.equal(caminho,null);assert.ok(path.startsWith(c.membroId+'/'))},async confirmarFoto(contexto,path){chamadas.push('confirmar');if(contexto.revisao!==revision)throw {code:'40001'};const anterior=caminho;caminho=path;revision++;return {membro_id:contexto.membroId,clinica_id:contexto.clinicaId,revisao:revision,caminho,anterior}},async podeDescartar(_,path){chamadas.push('prova');return path!==caminho&&path.startsWith(c.membroId+'/')},async descartar(path){chamadas.push('descartar');descartados.push(path)},async consultarRecebimento(contexto){await p.autorizarFoto(contexto);return {membro_id:c.membroId,clinica_id:c.clinicaId,profissional_id:'prof-sintetico',revisao:revision,dados:rece}},async salvarRecebimento(contexto,dados){if(contexto.revisao!==revision)throw {code:'40001'};rece=dados;revision++;return {membro_id:c.membroId,clinica_id:c.clinicaId,profissional_id:'prof-sintetico',revisao:revision,dados:mascararRecebimento(rece)}}}
  return {p,chamadas,descartados,get caminho(){return caminho}}
}
const fakeFile={bytes:new Uint8Array([1]),mime:'image/png'}
const processar=async(b:Uint8Array)=>b
const id=()=> '44444444-4444-4444-8444-444444444444'
test('orquestração foto: autoriza antes de processar/upload; confirma antes de descartar',async()=>{
  const e=portas();await gravarFotoEquipe(e.p,c,fakeFile,async b=>{e.chamadas.push('processar');return b},id)
  assert.deepEqual(e.chamadas,['autorizar','processar','upload','confirmar']);assert.ok(e.caminho)
  await gravarFotoEquipe(e.p,{...c,revisao:1},null,processar,id)
  assert.deepEqual(e.chamadas.slice(-4),['autorizar','confirmar','prova','descartar']);assert.equal(e.caminho,null);assert.equal(e.descartados.length,1)
})
test('negativa de leitura/escrita/direct ID/outra clínica impede upload e recebimento',async()=>{
  for(const ctx of [{...c,atorId:'recepcao'},{...c,atorId:'medico'},{...c,membroId:'outro-membro'},{...c,clinicaId:'outra-clinica'}]){
    const e=portas();await assert.rejects(gravarFotoEquipe(e.p,ctx,fakeFile,processar,id),e=>Boolean(e&&typeof e==='object'&&'code'in e&&e.code==='42501'));assert.ok(!e.chamadas.includes('upload'))
    await assert.rejects(gravarRecebimentoEquipe(e.p,ctx,{dados:pix(),preservar:[]}));assert.ok(!e.chamadas.includes('confirmar'))
  }
})
test('concorrência recusa revisão vencida; resposta de recebimento só contém máscaras',async()=>{
  const e=portas();const r=await gravarRecebimentoEquipe(e.p,c,{dados:banco(),preservar:[]})
  assert.equal(r.dados?.conta?.numero,'••••34');assert.ok(!JSON.stringify(r).includes(cpf))
  await assert.rejects(gravarRecebimentoEquipe(e.p,c,{dados:pix(),preservar:[]}),codigo('CONFLITO'))
  const f=portas();f.p.salvarRecebimento=async(ctx,dados)=>({membro_id:c.membroId,clinica_id:c.clinicaId,profissional_id:'prof-sintetico',revisao:ctx.revisao+1,dados})
  const defensivo=await gravarRecebimentoEquipe(f.p,c,{dados:banco(),preservar:[]});assert.equal(defensivo.dados?.conta?.numero,'••••34');assert.ok(!JSON.stringify(defensivo).includes(cpf))
})
test('confirmação perdida conserva foto confirmada; negativa conhecida limpa só a candidata',async()=>{
  const e=portas();const confirmar=e.p.confirmarFoto;e.p.confirmarFoto=async(ctx,path)=>{await confirmar(ctx,path);throw new Error('transporte')}
  await assert.rejects(gravarFotoEquipe(e.p,c,fakeFile,processar,id),codigo('RESULTADO_INCERTO'));assert.ok(e.caminho);assert.equal(e.descartados.length,0)
  const f=portas();f.p.confirmarFoto=async()=>{throw {code:'40001'}}
  await assert.rejects(gravarFotoEquipe(f.p,c,fakeFile,processar,id),codigo('CONFLITO'));assert.equal(f.caminho,null);assert.equal(f.descartados.length,1)
  const lento=portas();lento.p.confirmarFoto=async()=>{throw new Error('confirmação ainda em trânsito')}
  await assert.rejects(gravarFotoEquipe(lento.p,c,fakeFile,processar,id),codigo('RESULTADO_INCERTO'));assert.ok(!lento.chamadas.includes('prova'));assert.equal(lento.descartados.length,0)
})
test('falha de upload/limpeza não remove confirmado, não oculta confirmação e não repete gravação',async()=>{
  const e=portas();e.p.upload=async()=>{throw new Error('transporte')}
  await assert.rejects(gravarFotoEquipe(e.p,c,fakeFile,processar,id),codigo('RESULTADO_INCERTO'));assert.ok(!e.chamadas.includes('confirmar'))
  const f=portas();await gravarFotoEquipe(f.p,c,fakeFile,processar,id);f.p.descartar=async()=>{throw new Error('limpeza')}
  const r=await gravarFotoEquipe(f.p,{...c,revisao:1},null,processar,id);assert.equal(r.limpeza_pendente,true);assert.equal(f.caminho,null)
})
test('limpeza expirada autorizada antecede upload e falha informa pendência sem falsear confirmação',async()=>{
  const e=portas();e.p.limparTemporarias=async()=>{e.chamadas.push('limpar-expiradas');return false}
  const r=await gravarFotoEquipe(e.p,c,fakeFile,processar,id)
  assert.deepEqual(e.chamadas,['autorizar','limpar-expiradas','upload','confirmar']);assert.equal(r.limpeza_pendente,true);assert.ok(e.caminho)
})
test('contrato SQL preparado isola estruturas, revoga cliente e audita nomes sem valores',()=>{
  const sql=readFileSync(new URL('../../migrations/20261005170000_equipe_fotos_recebimento.sql',import.meta.url),'utf8')
  assert.match(sql,/enable row level security/g);assert.match(sql,/revoke all on public\.equipe_fotos,public\.profissionais_recebimento from public,anon,authenticated/)
  assert.match(sql,/auth\.role\(\) is distinct from 'service_role'/);assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/pgp_sym_encrypt/)
  assert.match(sql,/bucket_id='equipe-fotos' and public.equipe_foto_objeto_autorizado\(name\)/)
  const audit=sql.slice(sql.indexOf('insert into public.auditoria'),sql.indexOf('return new;'))
  assert.ok(!/chave|documento|dados_encrypted|v_novo|caminho/i.test(audit));assert.match(audit,/campos_alterados/)
  assert.ok(!/create policy .* for (insert|update|delete)/i.test(sql))
  assert.match(sql,/o.created_at>clock_timestamp\(\)-interval '15 minutes'/);assert.match(sql,/o.created_at<clock_timestamp\(\)-interval '30 minutes'/)
  assert.ok(!/create (or replace )?function public.equipe_(listar|detalhar)/i.test(sql))
})
// Actual codec tests use the pinned MIT/AGPL dual-licensed package downloaded to
// ignored scratch, never a product dependency. The runner below explains setup.
const require=createRequire(import.meta.url)
type ImagemTeste=ImagemEquipe&{fill(c:number):unknown;encode():Promise<Uint8Array>;setPixelAt(x:number,y:number,c:number):unknown;getPixelAt(x:number,y:number):number}
const {Image}=require('../../../scratch/equipe-fotos-recebimento/imagescript/package/ImageScript.js') as {Image:{new(w:number,h:number):ImagemTeste;decode(b:Uint8Array):Promise<ImagemTeste>}}
test('codec real reencoda PNG/JPEG, limita tamanho e rejeita arquivo falso/SVG/mime/tamanho/APNG',async()=>{
  const imagem=new Image(1200,600);imagem.fill(0x006194ff);const png=await imagem.encode()
  const jpeg=await processarFotoEquipe(png,b=>Image.decode(b),'image/png');const h=verificarCabecalhoFoto(jpeg);assert.equal(h.largura,1024);assert.equal(h.altura,512);assert.equal(h.formato,'image/jpeg')
  for(const b of [new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),new Uint8Array(FOTO_MAX_BYTES+1),png.slice(0,24)])await assert.rejects(processarFotoEquipe(b,b=>Image.decode(b)),codigo('FOTO_INVALIDA'))
  assert.throws(()=>verificarCabecalhoFoto(png,'image/jpeg'),codigo('FOTO_INVALIDA'))
  await processarFotoEquipe(jpeg,b=>Image.decode(b),'image/jpeg')
  const apng=png.slice();new DataView(apng.buffer).setUint32(37,0x6163544c);assert.throws(()=>verificarCabecalhoFoto(apng),codigo('FOTO_INVALIDA'))
})
function exif(jpeg:Uint8Array,orientation:number):Uint8Array {
  const app=new Uint8Array(36);const d=new DataView(app.buffer);app.set([255,225,0,34,69,120,105,102,0,0,73,73]);d.setUint16(12,42,true);d.setUint32(14,8,true);d.setUint16(18,1,true);d.setUint16(20,0x112,true);d.setUint16(22,3,true);d.setUint32(24,1,true);d.setUint16(28,orientation,true)
  const result=new Uint8Array(jpeg.length+app.length);result.set(jpeg.slice(0,2));result.set(app,2);result.set(jpeg.slice(2),38);return result
}
test('oito orientações EXIF são corrigidas e metadata não permanece no JPEG confirmado',async()=>{
  const image=new Image(80,40);const cores=[0xff0000ff,0x00ff00ff,0x0000ffff,0xffffffff]
  for(let x=1;x<=80;x++)for(let y=1;y<=40;y++)image.setPixelAt(x,y,cores[(y>20?2:0)+(x>40?1:0)])
  const base=await image.encodeJPEG(85)
  const cantos=[[0,1,2,3],[1,0,3,2],[3,2,1,0],[2,3,0,1],[0,2,1,3],[2,0,3,1],[3,1,2,0],[1,3,0,2]]
  for(let n=1;n<=8;n++){
    const original=exif(base,n);assert.equal(verificarCabecalhoFoto(original).orientacao,n)
    const confirmado=await processarFotoEquipe(original,b=>Image.decode(b),'image/jpeg',(w,h)=>new Image(w,h));const h=verificarCabecalhoFoto(confirmado)
    assert.equal(h.largura,n>=5?40:80);assert.equal(h.altura,n>=5?80:40);assert.equal(h.orientacao,1);assert.ok(!Buffer.from(confirmado).includes(Buffer.from('Exif')))
    const rotacionada=await Image.decode(confirmado);const pixels=[[5,5],[h.largura-5,5],[5,h.altura-5],[h.largura-5,h.altura-5]].map(([x,y])=>rotacionada.getPixelAt(x,y))
    pixels.forEach((p,i)=>{const cor=cores[cantos[n-1][i]];for(const shift of [24,16,8])assert.ok(Math.abs((p>>>shift&255)-(cor>>>shift&255))<30,`Orientação ${n}, canto ${i}`)})
  }
})

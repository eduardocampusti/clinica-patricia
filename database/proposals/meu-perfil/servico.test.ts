import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ErroPerfil, gravarPerfilProprio, type PerfilServidor, type PortasPerfil } from './servico.ts'
const ator='11111111-1111-4111-8111-111111111111'
const novo='22222222-2222-4222-8222-222222222222'
function ambiente() {
  let perfil:PerfilServidor={versao:1,usuario_id:ator,nome:'Nome Fictício',foto_caminho:`${ator}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`,revisao:2}
  const eventos:string[]=[]
  const portas:PortasPerfil={consultar:async()=>({...perfil}),processar:async bytes=>{eventos.push('validar');return bytes},enviar:async path=>{assert.equal(path,`${ator}/${novo}.jpg`);eventos.push('enviar')},confirmar:async(nome,path,revisao)=>{assert.equal(revisao,perfil.revisao);eventos.push('confirmar');perfil={...perfil,nome,foto_caminho:path,revisao:revisao+1};return {...perfil}}}
  const campos={acao:'salvar',nome:' Nome Fictício Novo ',revisao:'2',fotoAcao:'manter'}
  const foto=new File([new Uint8Array([1,2,3])],'foto.png',{type:'image/png'})
  return {portas,campos,eventos,foto,perfil:()=>perfil}
}
test('persiste somente campos permitidos e preserva ponteiro ao editar nome',async()=>{
  const a=ambiente();const salvo=await gravarPerfilProprio(ator,a.campos,null,a.portas,()=>novo)
  assert.equal(salvo.nome,'Nome Fictício Novo');assert.equal(salvo.revisao,3);assert.equal(salvo.foto_caminho,a.perfil().foto_caminho);assert.deepEqual(a.eventos,['confirmar'])
})
for(const campo of ['usuarioId','usuario_id','papel','clinicaId','email','ativo','permissoes'])test(`recusa seleção externa de ${campo}`,async()=>{
  const a=ambiente();await assert.rejects(gravarPerfilProprio(ator,{...a.campos,[campo]:'fictício'},null,a.portas,()=>novo),e=>e instanceof ErroPerfil&&e.status===422);assert.deepEqual(a.eventos,[])
})
test('recusa outra conta mesmo com resposta indevida da porta de consulta',async()=>{
  const a=ambiente();a.portas.consultar=async()=>({...a.perfil(),usuario_id:novo})
  await assert.rejects(gravarPerfilProprio(ator,a.campos,null,a.portas,()=>novo),e=>e instanceof ErroPerfil&&e.status===403);assert.deepEqual(a.eventos,[])
})
test('substituição valida e envia nova imagem antes da transação, sem apagar antiga',async()=>{
  const a=ambiente();const salvo=await gravarPerfilProprio(ator,{...a.campos,fotoAcao:'substituir'},a.foto,a.portas,()=>novo)
  assert.equal(salvo.foto_caminho,`${ator}/${novo}.jpg`);assert.deepEqual(a.eventos,['validar','enviar','confirmar'])
})
test('falha de upload preserva nome e foto anteriores',async()=>{
  const a=ambiente();const anterior={...a.perfil()};a.portas.enviar=async()=>{throw new Error('Erro fictício')}
  await assert.rejects(gravarPerfilProprio(ator,{...a.campos,fotoAcao:'substituir'},a.foto,a.portas,()=>novo));assert.deepEqual(a.perfil(),anterior);assert.deepEqual(a.eventos,['validar'])
})
test('remoção limpa ponteiro em transação sem operação destrutiva em arquivos',async()=>{
  const a=ambiente();const salvo=await gravarPerfilProprio(ator,{...a.campos,fotoAcao:'remover'},null,a.portas,()=>novo)
  assert.equal(salvo.foto_caminho,null);assert.deepEqual(a.eventos,['confirmar'])
})
test('revisão antiga não sobrescreve edição concorrente',async()=>{
  const a=ambiente();await assert.rejects(gravarPerfilProprio(ator,{...a.campos,revisao:'1'},null,a.portas,()=>novo),e=>e instanceof ErroPerfil&&e.status===409);assert.deepEqual(a.eventos,[])
})
test('resposta incerta de confirmação não apaga objeto antigo ou novo',async()=>{
  const a=ambiente();a.portas.confirmar=async()=>{throw new Error('Resposta perdida')}
  await assert.rejects(gravarPerfilProprio(ator,{...a.campos,fotoAcao:'substituir'},a.foto,a.portas,()=>novo));assert.deepEqual(a.eventos,['validar','enviar']);assert.equal(a.perfil().revisao,2)
})

for (const fotoAcao of [['manter'], ['remover']]) test(`recusa ação de foto em array: ${fotoAcao[0]}`, async()=>{
  const a=ambiente()
  await assert.rejects(gravarPerfilProprio(ator,{...a.campos,fotoAcao},null,a.portas,()=>novo),e=>e instanceof ErroPerfil&&e.status===422)
  assert.deepEqual(a.eventos,[])
  assert.equal(a.perfil().revisao,2)
})

import { test, expect, type Page } from '@playwright/test'
import { preparar, abrirMenu, fecharMenu, clinicas, type PerfilSintetico } from './dashboard-fixture'

const id='11111111-1111-4111-8111-111111111111', outroId='55555555-5555-4555-8555-555555555555'
const perfil=()=>({versao:1,usuario_id:id,nome:'Pessoa Fictícia',foto_caminho:null as string|null,revisao:0})
async function imagem(page:Page,tipo='image/png') {
  const url=await page.evaluate(tipo=>{const c=document.createElement('canvas');c.width=64;c.height=64;const ctx=c.getContext('2d')!;ctx.fillStyle='#52768e';ctx.fillRect(0,0,64,64);return c.toDataURL(tipo)},tipo)
  return Buffer.from(url.split(',')[1],'base64')
}
async function ambiente(page:Page,opcoes:{foto?:boolean;semServico?:boolean;perfil?:PerfilSintetico}={}) {
  const identidade=opcoes.perfil ?? {nome:'Pessoa Fictícia'}
  const anterior=await preparar(page,'proprietaria','normal',identidade)
  const estado={p:perfil(),salvamentos:0,falhar:false,statusFalha:503,semGravacao:true,gravarAntesDaFalha:false,demora:0,forjar:false,forjarArquivo:false,consultas:0,segundo:perfil()}
  estado.segundo={...perfil(),usuario_id:outroId,nome:'Outra Pessoa Fictícia'}
  if(opcoes.foto)estado.p.foto_caminho=`${id}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`
  let jpeg:Buffer
  await page.route('**/storage/v1/object/contas-fotos/**',async route=>{
    if(!jpeg)jpeg=await imagem(page,'image/jpeg')
    return route.fulfill({contentType:'image/jpeg',body:jpeg})
  })
  await page.route('**/functions/v1/meu-perfil',async route=>{
    const r=route.request()
    if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}})
    const json=(data:unknown,status=200)=>route.fulfill({status,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(data)})
    if(opcoes.semServico)return json({message:'Function not found'},404)
    const p=identidade.segundaConta?estado.segundo:estado.p
    if(r.headers()['content-type']?.includes('application/json')) {
      expect(r.postDataJSON()).toEqual({acao:'consultar'});estado.consultas++
      return json(estado.forjar?{...p,usuario_id:outroId,foto_caminho:`${outroId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`}:estado.forjarArquivo?{...p,foto_caminho:`${outroId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`}:p)
    }
    const formulario=await new Response(r.postDataBuffer(),{headers:{'content-type':r.headers()['content-type']}}).formData()
    expect([...formulario.keys()].sort()).toEqual(formulario.has('foto')?['acao','foto','fotoAcao','nome','revisao']:['acao','fotoAcao','nome','revisao'])
    estado.salvamentos++
    if(estado.demora)await new Promise(resolve=>setTimeout(resolve,estado.demora))
    if(estado.falhar){
      if(estado.gravarAntesDaFalha){p.nome=String(formulario.get('nome'));p.revisao++}
      return json({erro:'Falha fictícia no envio',...(estado.semGravacao?{erro_tipo:'sem_gravacao'}:{})},estado.statusFalha)
    }
    if(Number(formulario.get('revisao'))!==p.revisao)return json({erro:'Conflito'},409)
    p.nome=String(formulario.get('nome'));p.revisao++
    if(formulario.get('fotoAcao')==='remover')p.foto_caminho=null
    if(formulario.get('fotoAcao')==='substituir')p.foto_caminho=`${p.usuario_id}/${String(p.revisao).padStart(8,'0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`
    return json(p)
  })
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.getByRole('heading',{level:1})).toContainText('Pessoa')
  return {estado,identidade,...anterior}
}
async function abrir(page:Page) {
  await page.getByRole('button',{name:'Meu perfil pelo avatar'}).click()
  await expect(page.getByRole('heading',{name:'Meu perfil',exact:true})).toBeVisible()
  await expect(page.getByText('Consultando seu perfil…')).toHaveCount(0)
}
async function descartar(page:Page) {
  await page.getByRole('button',{name:'Cancelar',exact:true}).first().click()
  await page.getByRole('button',{name:'Descartar alterações',exact:true}).click()
}
test('editar, selecionar e cancelar preserva perfil e foto; reabrir pela identificação',async({page})=>{
  const {estado}=await ambiente(page,{foto:true});await abrir(page)
  const anterior=await page.locator('.app-shell-header img').getAttribute('src')
  await page.getByLabel('Nome de exibição',{exact:true}).fill('Nome preparado fictício')
  await page.getByLabel('Arquivo da foto pessoal').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:await imagem(page)})
  await expect(page.getByText('Nova foto em prévia. Ainda não foi salva.')).toBeVisible()
  await descartar(page)
  expect(estado.salvamentos).toBe(0)
  await expect(page.locator('.app-shell-header img')).toHaveAttribute('src',anterior!)
  await page.getByRole('button',{name:'Meu perfil pela identificação'}).click()
  await expect(page.getByLabel('Nome de exibição',{exact:true})).toHaveValue('Pessoa Fictícia')
})
test('salvar nome/foto só confirma depois de persistir; reabrir, F5 e clínicas com papéis diferentes',async({page})=>{
  const {estado}=await ambiente(page,{perfil:{nome:'Pessoa Fictícia',papeis:['proprietaria','recepcao']}});estado.demora=450
  await abrir(page);await page.getByLabel('Nome de exibição',{exact:true}).fill('Identidade Fictícia')
  await page.getByLabel('Arquivo da foto pessoal').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:await imagem(page)})
  await expect(page.getByRole('button',{name:'Salvar perfil',exact:true})).toBeEnabled()
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).click()
  await expect(page.getByText('Perfil salvo',{exact:true})).toHaveCount(0)
  await expect(page.getByText('Perfil salvo',{exact:true})).toBeVisible()
  await expect(page.getByLabel('Nome de exibição',{exact:true})).toHaveValue('Identidade Fictícia')
  await page.getByRole('button',{name:'Fechar',exact:true}).last().click()
  await expect(page.getByRole('heading',{level:1})).toContainText('Identidade!')
  await expect(page.locator('[data-slot="sidebar-footer"]')).toContainText('Identidade Fictícia')
  await expect(page.locator('.app-shell-header img')).toHaveAttribute('src',/^blob:/)
  await abrir(page);await expect(page.getByLabel('Nome de exibição',{exact:true})).toHaveValue('Identidade Fictícia')
  await page.getByRole('button',{name:'Cancelar',exact:true}).click()
  await page.reload();await expect(page.getByRole('heading',{level:1})).toContainText('Identidade!')
  await page.getByRole('combobox',{name:'Selecionar clínica',exact:true}).selectOption(clinicas[1].id)
  await expect(page).toHaveURL(/ipupiara\/dashboard$/)
  await expect(page.locator('.app-shell-header img')).toHaveAttribute('src',/^blob:/)
  await abrir(page);await expect(page.getByRole('dialog',{name:'Meu perfil',exact:true}).getByText('Recepção',{exact:true})).toBeVisible()
  await expect(page.getByLabel('Nome de exibição',{exact:true})).toHaveValue('Identidade Fictícia')
  expect(estado.salvamentos).toBe(1)
})
test('falha no envio conserva foto anterior e rascunho; substituição e remoção persistidas',async({page})=>{
  const {estado}=await ambiente(page,{foto:true});const original=estado.p.foto_caminho
  await abrir(page);await page.getByLabel('Arquivo da foto pessoal').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:await imagem(page)})
  estado.falhar=true
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).click()
  await expect(page.getByText('Alteração não confirmada',{exact:true})).toBeVisible()
  expect(estado.p.foto_caminho).toBe(original)
  await expect(page.getByText('Nova foto em prévia. Ainda não foi salva.')).toBeVisible()
  await expect(page.getByText('Perfil salvo',{exact:true})).toHaveCount(0)
  estado.falhar=false
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).click()
  await expect(page.getByText('Perfil salvo',{exact:true})).toBeVisible()
  expect(estado.p.foto_caminho).not.toBe(original)
  await expect(page.getByRole('button',{name:'Salvar perfil',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Remover foto',exact:true}).click()
  await page.getByRole('alertdialog').getByRole('button',{name:'Remover foto',exact:true}).click()
  expect(estado.p.foto_caminho).not.toBeNull()
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).click()
  await expect(page.getByText('Perfil salvo',{exact:true})).toBeVisible()
  expect(estado.p.foto_caminho).toBeNull()
  await page.getByRole('button',{name:'Fechar',exact:true}).last().click()
  await expect(page.locator('.app-shell-header img')).toHaveCount(0)
  await page.reload();await abrir(page)
  await expect(page.getByRole('button',{name:'Selecionar foto'})).toBeVisible()
})
for(const status of [422,503])test(`erro genérico ${status} não presume dados mantidos nem permite repetição sem consultar`,async({page})=>{
  const {estado}=await ambiente(page);await abrir(page)
  await page.getByLabel('Nome de exibição',{exact:true}).fill('Nome após resposta incerta')
  estado.falhar=true;estado.statusFalha=status;estado.semGravacao=false;estado.gravarAntesDaFalha=true
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).click()
  await expect(page.getByText('O salvamento não foi confirmado. Reabra o perfil para conferir antes de tentar novamente.',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Salvar perfil',exact:true})).toBeDisabled()
  await expect(page.getByLabel('Nome de exibição',{exact:true})).toHaveValue('Nome após resposta incerta')
  await expect(page.getByText(/dados anteriores foram mantidos/i)).toHaveCount(0)
  await expect(page.getByText('Perfil salvo',{exact:true})).toHaveCount(0)
  await descartar(page);await abrir(page)
  await expect(page.getByLabel('Nome de exibição',{exact:true})).toHaveValue('Nome após resposta incerta')
  expect(estado.salvamentos).toBe(1)
})

test('serviço ausente desabilita salvamento e deixa cancelar prévia sem mutações',async({page})=>{
  const {estado,escritas}=await ambiente(page,{semServico:true});await abrir(page)
  await expect(page.getByText('Salvamento ainda indisponível',{exact:true})).toBeVisible()
  await page.getByLabel('Nome de exibição',{exact:true}).fill('Teste de prévia')
  await page.getByLabel('Arquivo da foto pessoal').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:await imagem(page)})
  await expect(page.getByRole('button',{name:'Salvar perfil',exact:true})).toBeDisabled()
  await descartar(page);expect(estado.salvamentos).toBe(0);expect(escritas).toEqual([])
})
test('recusa perfil ou caminho de outra pessoa sem solicitar arquivo alheio',async({page})=>{
  const {estado}=await ambiente(page);estado.forjar=true
  const arquivos:string[]=[];page.on('request',r=>{if(r.url().includes('contas-fotos'))arquivos.push(r.url())})
  await page.reload();await abrir(page)
  await expect(page.getByText('Serviço de perfil indisponível',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Salvar perfil',exact:true})).toBeDisabled()
  expect(arquivos).toEqual([])
})
test('recusa arquivo alheio mesmo quando a resposta identifica a própria conta',async({page})=>{
  const {estado}=await ambiente(page);estado.forjarArquivo=true
  const arquivos:string[]=[];page.on('request',r=>{if(r.url().includes('contas-fotos'))arquivos.push(r.url())})
  await page.reload();await abrir(page)
  await expect(page.getByText('Serviço de perfil indisponível',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Salvar perfil',exact:true})).toBeDisabled();expect(arquivos).toEqual([])
})
test('resultado incerto mantém rascunho, não confirma sucesso e impede repetição sem reabrir',async({page})=>{
  const {estado}=await ambiente(page);estado.falhar=true;estado.statusFalha=502;await abrir(page)
  await page.getByLabel('Nome de exibição',{exact:true}).fill('Rascunho Fictício')
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).click()
  await expect(page.getByText('Alteração não confirmada',{exact:true})).toBeVisible()
  await expect(page.getByLabel('Nome de exibição',{exact:true})).toHaveValue('Rascunho Fictício')
  await expect(page.getByRole('button',{name:'Salvar perfil',exact:true})).toBeDisabled()
  await expect(page.getByText('Perfil salvo',{exact:true})).toHaveCount(0)
  await descartar(page);await abrir(page)
  await expect(page.getByLabel('Nome de exibição',{exact:true})).toHaveValue('Pessoa Fictícia')
})
test('imagem inválida não substitui a foto nem habilita salvamento',async({page})=>{
  await ambiente(page,{foto:true});await abrir(page)
  const foto=await page.getByRole('img',{name:'Prévia da foto pessoal'}).locator('img').getAttribute('src')
  await page.getByLabel('Arquivo da foto pessoal').setInputFiles({name:'falsa.png',mimeType:'image/png',buffer:Buffer.from('Arquivo fictício inválido')})
  await expect(page.getByText('Alteração não confirmada',{exact:true})).toBeVisible()
  await expect(page.getByRole('img',{name:'Prévia da foto pessoal'}).locator('img')).toHaveAttribute('src',foto!)
  await expect(page.getByRole('button',{name:'Salvar perfil',exact:true})).toBeDisabled()
})
test('logout e segundo login não reutilizam nome/foto da primeira conta',async({page})=>{
  const {identidade}=await ambiente(page,{foto:true});await expect(page.locator('.app-shell-header img')).toBeVisible()
  await page.getByRole('button',{name:'Sair',exact:true}).click();identidade.segundaConta=true
  await page.getByLabel('E-mail institucional ou CRM / Identificador').fill('outro-login@example.invalid');await page.getByLabel('Senha de Acesso',{exact:true}).fill('senha-ficticia')
  await page.getByRole('radio',{name:'Proprietário(a)',exact:true}).check()
  await page.getByRole('button',{name:'Acessar Sistema Integrado',exact:true}).click()
  await expect(page.getByRole('heading',{level:1})).toContainText('Outra!')
  await expect(page.locator('.app-shell-header img')).toHaveCount(0)
  await abrir(page);await expect(page.getByLabel('Nome de exibição',{exact:true})).toHaveValue('Outra Pessoa Fictícia')
})
test('novo login da mesma conta reconsulta nome e foto persistidos no servidor simulado',async({page})=>{
  const {estado}=await ambiente(page);await abrir(page)
  await page.getByLabel('Nome de exibição',{exact:true}).fill('Nome Persistido Fictício')
  await page.getByLabel('Arquivo da foto pessoal').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:await imagem(page)})
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).click()
  await expect(page.getByText('Perfil salvo',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Salvar perfil',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Fechar',exact:true}).last().click()
  await page.getByRole('button',{name:'Sair',exact:true}).click()
  await page.getByLabel('E-mail institucional ou CRM / Identificador').fill('login@example.invalid')
  await page.getByLabel('Senha de Acesso',{exact:true}).fill('senha-ficticia')
  await page.getByRole('radio',{name:'Proprietário(a)',exact:true}).check()
  await page.getByRole('button',{name:'Acessar Sistema Integrado',exact:true}).click()
  await expect(page.getByRole('heading',{level:1})).toContainText('Nome!')
  await expect(page.locator('.app-shell-header img')).toBeVisible()
  expect(estado.salvamentos).toBe(1)
})
for(const largura of [360,430])test(`nome longo e perfil móvel ${largura}px pelos dois acessos`,async({page})=>{
  await page.setViewportSize({width:largura,height:844});await ambiente(page,{semServico:true})
  await abrirMenu(page);await page.getByRole('button',{name:'Meu perfil pela identificação'}).click()
  await expect(page.getByRole('dialog',{name:'Meu perfil',exact:true})).toBeVisible()
  await expect(page.getByRole('navigation',{name:'Navegação principal'})).not.toBeVisible()
  await page.getByLabel('Nome de exibição',{exact:true}).fill('NomeFicticioMuitoLongoSemEspacos'.repeat(3))
  expect(await page.getByRole('dialog',{name:'Meu perfil',exact:true}).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true)
  await descartar(page);await fecharMenu(page);await abrir(page)
  await page.screenshot({path:`scratch/meu-perfil/evidencias/sintetico-mobile-${largura}.png`})
})
test('captura desktop e teclado: foco contido e retorno ao avatar',async({page})=>{
  await ambiente(page,{semServico:true});await abrir(page)
  for(let n=0;n<12;n++){await page.keyboard.press('Tab');expect(await page.getByRole('dialog',{name:'Meu perfil',exact:true}).evaluate(e=>e.contains(document.activeElement))).toBe(true)}
  await page.screenshot({path:'scratch/meu-perfil/evidencias/sintetico-desktop.png'})
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Meu perfil pelo avatar'})).toBeFocused()
})

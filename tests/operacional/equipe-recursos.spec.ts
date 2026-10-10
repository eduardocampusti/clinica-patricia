import { expect, test, type Page } from '@playwright/test'
import { abrirSecaoFicha } from './equipe-ficha-helpers'
import { readFileSync } from 'node:fs'
import { mascararRecebimento, comporRecebimento, type DadosRecebimento } from '../../supabase/functions/_shared/equipeRecebimento'
test.setTimeout(90_000)
const clinicas=[{id:'clinica-a',nome:'Clínica Brotas'},{id:'clinica-b',nome:'Clínica Ipupiara'}]
const mid='11111111-1111-4111-8111-111111111111'
const nomes=['Médica Sintética','Recepção Sintética',...Array.from({length:10},(_,i)=>`Pessoa Sintética ${i+3}`)]
const membros=nomes.map((nome,i)=>({id:i===0?mid:`membro-${i}`,nome_completo:nome,cargo:i===0?'Médico(a)':'Recepção',tipo:i===0?'profissional_saude':'administrativo',profissao:i===0?'Clínica médica':null,clinicas,revisao:1,acesso_status:'sem_conta',telefone:null,email_contato:null,conselho_classe:null,registro_conselho:null,conselho_uf:null,especialidade_id:null,especialidade_nome:null}))
const arquivo='scratch/equipe-fotos-recebimento/foto-sintetica.jpg'
async function preparar(page:Page,opcoes:{papel?:string;erroConsulta?:boolean}={}) {
  let liberar!:()=>void;const espera=new Promise<void>(r=>{liberar=r})
  const e={photos:0,lista:0,receReads:0,writes:0,accessWrites:0,fail:'',adiar:false,liberar:()=>liberar(),path:null as string|null,fotoRev:0,role:opcoes.papel??'proprietaria',rece:new Map<string,{revisao:number;dados:DadosRecebimento}>()}
  await page.addInitScript(()=>localStorage.setItem('sb-operacional-auth-token',JSON.stringify({access_token:'synthetic-session-not-a-credential',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:'usuario-sintetico',aud:'authenticated',role:'authenticated',email:'sintetico@example.invalid'}})))
  await page.route('**/*',async route=>{
    const req=route.request();const u=new URL(req.url());if(u.hostname==='127.0.0.1')return route.continue()
    if(u.hostname!=='operacional.synthetic.invalid')return route.abort()
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'}
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers})
    const json=(body:unknown,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)})
    if(u.pathname.endsWith('/usuarios_clinicas'))return json({papel:e.role})
    if(u.pathname.endsWith('/clinicas'))return json(clinicas)
    if(u.pathname.endsWith('/rpc/equipe_listar')){e.lista++;return json(membros)}
    if(u.pathname.endsWith('/rpc/equipe_detalhar'))return json({...membros.find(m=>m.id===req.postDataJSON().p_membro_id),cpf:null,cpf_situacao:'ausente'})
    if(u.pathname.endsWith('/rpc/equipe_fotos_listar')){
      e.photos++;const b=req.postDataJSON()
      if(opcoes.erroConsulta||e.role!=='proprietaria')return json({code:'42501'},403)
      return json(membros.map(m=>({membro_id:m.id,clinica_id:b.p_clinica_id,revisao:m.id===mid?e.fotoRev:0,caminho:m.id===mid?e.path:null,pode_editar:true})))
    }
    if(u.pathname.includes('/storage/v1/object/')){expect(req.headers()['x-clinica-id']).toMatch(/^clinica-[ab]$/);return route.fulfill({headers,contentType:'image/jpeg',body:readFileSync(arquivo)})}
    if(u.pathname.endsWith('/rpc/equipe_recebimento_obter')){
      e.receReads++;const b=req.postDataJSON()
      if(opcoes.erroConsulta||e.role!=='proprietaria'||b.p_membro_id!==mid||!clinicas.some(c=>c.id===b.p_clinica_id))return json({code:'42501'},403)
      const r=e.rece.get(b.p_clinica_id);return json({membro_id:mid,clinica_id:b.p_clinica_id,profissional_id:'profissional-sintetico',revisao:r?.revisao??0,dados:mascararRecebimento(r?.dados??null)})
    }
    if(u.pathname.endsWith('/functions/v1/equipe-acessos')){
      const b=req.postDataJSON();if(b.acao!=='listar'){e.accessWrites++;return json({})}
      return json({membro_id:b.membroId,usuario_id:null,login_email:null,conta_confirmada:false,clinicas:clinicas.map(c=>({...c,usuario_id:null,ativo:false,status:'sem_acesso',papel:null})),convites:[]})
    }
    if(u.pathname.endsWith('/functions/v1/equipe-recursos')){
      e.writes++;if(e.adiar)await espera;let b:Record<string,unknown>
      if(req.headers()['content-type']?.includes('multipart/form-data')){
        const f=await new Response(new Uint8Array(req.postDataBuffer() ?? []),{headers:{'content-type':req.headers()['content-type']}}).formData();b={acao:f.get('acao'),membroId:f.get('membroId'),clinicaId:f.get('clinicaId'),revisao:Number(f.get('revisao'))};expect((f.get('foto') as File).type).toBe('image/jpeg')
      }else b=req.postDataJSON()
      if(e.fail && e.fail!=='RESULTADO_INCERTO')return json({codigo:e.fail},e.fail==='CONFLITO'?409:403)
      if(b.acao==='recebimento_salvar'){
        const anterior=e.rece.get(String(b.clinicaId));if((anterior?.revisao??0)!==b.revisao)return json({codigo:'CONFLITO'},409)
        const dados=comporRecebimento({dados:b.dados,preservar:b.preservar},anterior?.dados??null);const revisao=(anterior?.revisao??0)+1;e.rece.set(String(b.clinicaId),{revisao,dados})
        if(e.fail)return json({codigo:e.fail},502)
        return json({membro_id:mid,clinica_id:b.clinicaId,profissional_id:'profissional-sintetico',revisao,dados:mascararRecebimento(dados)})
      }
      if(b.revisao!==e.fotoRev)return json({codigo:'CONFLITO'},409)
      e.fotoRev++;e.path=b.acao==='foto_remover'?null:`${mid}/${String(e.fotoRev).padStart(8,'0')}-4444-4444-8444-444444444444.jpg`
      if(e.fail)return json({codigo:e.fail},502)
      return json({membro_id:mid,clinica_id:b.clinicaId,revisao:e.fotoRev,caminho:e.path,limpeza_pendente:false})
    }
    return json([])
  })
  await page.goto('/sistema/brotas/equipe?previa=cadastros')
  await expect(page.getByTestId(`equipe-pessoa-${mid}`)).toBeVisible()
  return e
}
const foto=(p:Page)=>p.getByTestId('equipe-foto-painel')
const rece=(p:Page)=>p.getByTestId('equipe-recebimento-painel')
// Recebimento fica na própria seção e a foto abre pelo avatar do cabeçalho (Fase 2).
async function irParaRecursos(p:Page){await abrirSecaoFicha(p,'Recebimento');const avatar=p.getByRole('button',{name:'Gerenciar foto',exact:true});if(await avatar.getAttribute('aria-expanded')==='false')await avatar.click()}
const ver=async(p:Page)=>{await p.getByRole('button',{name:'Ver cadastro de Médica Sintética',exact:true}).click();await irParaRecursos(p);await expect(rece(p).getByRole('button',{name:'Cadastrar dados de recebimento'})).toBeVisible()}
async function preencherPix(p:Page){await rece(p).getByRole('button',{name:'Cadastrar dados de recebimento'}).click();await p.getByLabel('Chave PIX',{exact:true}).fill('favorecido@example.invalid');await p.getByLabel('Nome completo do favorecido',{exact:true}).fill('Favorecido Sintético')}
async function conta(p:Page){await p.getByLabel('Cadastrar conta para transferência',{exact:true}).check();await p.getByLabel('Banco ou instituição',{exact:true}).fill('Instituição Sintética');await p.getByLabel('Número da conta',{exact:true}).fill('00001234');await p.getByLabel('CPF do favorecido',{exact:true}).fill('52998224725');await p.getByLabel('Agência (opcional)',{exact:true}).fill('0001')}

test('foto: seleção e cancelamento, confirmação/avatar, substituição/remoção e grade preservada',async({page})=>{
  const e=await preparar(page);await page.getByRole('searchbox').fill('Sintética');await page.getByRole('checkbox',{name:'Selecionar todas as pessoas desta página',exact:true}).check();const lista=e.lista
  await ver(page);await expect(foto(page).getByRole('button',{name:'Salvar foto',exact:true})).toBeDisabled()
  await foto(page).getByLabel('Adicionar foto').setInputFiles(arquivo);await expect(page.getByAltText('Prévia da foto selecionada')).toBeVisible()
  await foto(page).getByRole('button',{name:'Cancelar foto'}).click();expect(e.writes).toBe(0)
  await foto(page).getByLabel('Adicionar foto').setInputFiles(arquivo);await foto(page).getByRole('button',{name:'Salvar foto',exact:true}).click();await expect(foto(page).getByText('Foto salva e atualizada na equipe.')).toBeVisible();await expect(foto(page).locator('.equipe-avatar-imagem')).toBeVisible();await foto(page).screenshot({path:'scratch/equipe-fotos-recebimento/foto-confirmada-sintetica.png'})
  await page.getByRole('button',{name:'Fechar',exact:true}).click();await expect(page.getByTestId(`equipe-pessoa-${mid}`).locator('.equipe-avatar-imagem')).toBeVisible();await expect(page.getByRole('searchbox')).toHaveValue('Sintética');expect(e.lista).toBe(lista)
  await expect(page.getByRole('status').filter({hasText:'10 pessoas selecionadas'})).toBeVisible()
  await ver(page);await foto(page).getByLabel('Substituir foto').setInputFiles(arquivo);await foto(page).getByRole('button',{name:'Salvar foto',exact:true}).click();await expect.poll(()=>e.fotoRev).toBe(2)
  await foto(page).getByRole('button',{name:'Remover foto',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Remover foto',exact:true}).click();await expect(foto(page).getByText('Foto removida.')).toBeVisible();await expect(foto(page).locator('.equipe-avatar-imagem')).toHaveCount(0);expect(e.accessWrites).toBe(0)
})
test('foto inválida não envia; falha preserva prévia, resultado incerto exige consulta sem repetição',async({page})=>{
  const e=await preparar(page);await ver(page)
  await foto(page).getByLabel('Adicionar foto').setInputFiles({name:'foto.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg></svg>')});await expect(foto(page).getByText('Confira a foto')).toBeVisible();expect(e.writes).toBe(0)
  e.fail='NAO_AUTORIZADO';await foto(page).getByLabel('Adicionar foto').setInputFiles(arquivo);await foto(page).getByRole('button',{name:'Salvar foto',exact:true}).click();await expect(page.getByAltText('Prévia da foto selecionada')).toBeVisible();await expect(foto(page).getByRole('button',{name:'Salvar foto',exact:true})).toBeDisabled()
  e.fail='';await foto(page).getByRole('button',{name:'Reconsultar foto'}).click();await expect(page.getByAltText('Prévia da foto selecionada')).toHaveCount(0)
  e.fail='RESULTADO_INCERTO';await foto(page).getByLabel('Adicionar foto').setInputFiles(arquivo);await foto(page).getByRole('button',{name:'Salvar foto',exact:true}).click();await expect(foto(page).getByText(/A confirmação não chegou/)).toBeVisible();await expect(foto(page).getByRole('button',{name:'Salvar foto',exact:true})).toBeDisabled();const n=e.writes
  e.fail='';await foto(page).getByRole('button',{name:'Reconsultar foto'}).click();await expect(foto(page).locator('.equipe-avatar-imagem')).toBeVisible();expect(e.writes).toBe(n)
})
test('recebimento: validação, PIX, reabertura mascarada, conta+PIX e contexto separado',async({page})=>{
  const e=await preparar(page);expect(e.receReads).toBe(0);await ver(page);await preencherPix(page)
  await page.getByLabel('Chave PIX',{exact:true}).fill('inválida');await rece(page).getByRole('button',{name:'Salvar recebimento'}).click();await expect(page.getByLabel('Chave PIX',{exact:true})).toBeFocused();expect(e.writes).toBe(0)
  await page.getByLabel('Chave PIX',{exact:true}).fill('favorecido@example.invalid');await rece(page).getByRole('button',{name:'Salvar recebimento'}).click();await expect(rece(page).getByText('Dados de recebimento salvos nesta clínica.')).toBeVisible();await expect(rece(page).getByText('••••id',{exact:true})).toBeVisible();await expect(rece(page).getByText('favorecido@example.invalid',{exact:true})).toHaveCount(0)
  await page.getByRole('button',{name:'Fechar',exact:true}).click();await verExistente(page);await rece(page).getByRole('button',{name:'Editar recebimento'}).click();await expect(page.getByLabel('Chave PIX',{exact:true})).toHaveValue('');await conta(page);await rece(page).getByRole('button',{name:'Salvar recebimento'}).click();await expect(rece(page).getByText('Dados de recebimento salvos nesta clínica.')).toBeVisible();expect(e.rece.get('clinica-a')?.dados.conta?.numero).toBe('00001234')
  await page.getByLabel('Clínica dos dados de recebimento').selectOption('clinica-b');await expect(rece(page).getByText(/Não há dados de recebimento cadastrados/)).toBeVisible();await preencherPix(page);await page.getByLabel('Meio preferencial').selectOption('transferencia');await conta(page);await page.getByLabel('Cadastrar PIX',{exact:true}).uncheck();await rece(page).getByRole('button',{name:'Salvar recebimento'}).click();await expect(rece(page).getByText('Transferência',{exact:true})).toBeVisible();expect(e.rece.size).toBe(2)
  await page.getByLabel('Clínica dos dados de recebimento').selectOption('clinica-a');await expect(rece(page).getByText('PIX',{exact:true})).toBeVisible();await expect(rece(page).getByText('••••id',{exact:true})).toBeVisible()
  await rece(page).screenshot({path:'scratch/equipe-fotos-recebimento/recebimento-confirmado-mascarado.png'})
  await page.getByRole('button',{name:'Fechar',exact:true}).click();await expect(page.locator('.equipe-listagem')).not.toContainText('Instituição Sintética');expect(e.accessWrites).toBe(0)
})
async function verExistente(p:Page){await p.getByRole('button',{name:'Ver cadastro de Médica Sintética',exact:true}).click();await irParaRecursos(p);await expect(rece(p).getByRole('button',{name:'Editar recebimento'})).toBeVisible()}
test('recebimento: falha/conflito/incerteza preservam edição, reconsulta e descarte são explícitos',async({page})=>{
  const e=await preparar(page);await ver(page);await preencherPix(page);e.fail='CONFLITO';await rece(page).getByRole('button',{name:'Salvar recebimento'}).click();await expect(rece(page).getByText(/Os dados mudaram em outra sessão/)).toBeVisible();await expect(page.getByLabel('Chave PIX',{exact:true})).toHaveValue('favorecido@example.invalid');await expect(rece(page).getByRole('button',{name:'Salvar recebimento'})).toBeDisabled();await expect(page.getByLabel('Clínica dos dados de recebimento')).toBeDisabled()
  await rece(page).getByRole('button',{name:'Reconsultar configuração'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Descartar edição e reconsultar'}).click();await expect(rece(page).getByRole('button',{name:'Cadastrar dados de recebimento'})).toBeVisible()
  e.fail='RESULTADO_INCERTO';await preencherPix(page);await rece(page).getByRole('button',{name:'Salvar recebimento'}).click();await expect(rece(page).getByText(/A confirmação não chegou/)).toBeVisible();const n=e.writes
  e.fail='';await rece(page).getByRole('button',{name:'Reconsultar configuração'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Descartar edição e reconsultar'}).click();await expect(rece(page).getByRole('button',{name:'Editar recebimento'})).toBeVisible();expect(e.writes).toBe(n)
  await rece(page).getByRole('button',{name:'Editar recebimento'}).click();await page.getByLabel('Chave PIX',{exact:true}).fill('outro@example.invalid');await page.getByRole('button',{name:'Fechar',exact:true}).click();await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('alertdialog').getByRole('button',{name:'Cancelar',exact:true}).click();await expect(page.getByLabel('Chave PIX',{exact:true})).toHaveValue('outro@example.invalid');await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('button',{name:'Descartar e fechar'}).click();expect(e.writes).toBe(n)
})
test('serviço ausente não vira cadastro vazio; administrativos não consultam recebimento',async({page})=>{
  const e=await preparar(page,{erroConsulta:true});await page.getByRole('button',{name:'Ver cadastro de Médica Sintética',exact:true}).click();await irParaRecursos(page);await expect(rece(page).getByText('Recebimento indisponível')).toBeVisible();await expect(rece(page).getByRole('button',{name:'Cadastrar dados de recebimento'})).toHaveCount(0);await page.getByRole('button',{name:'Fechar',exact:true}).click();const reads=e.receReads
  await page.getByRole('searchbox').fill('Pessoa Sintética 3');await page.getByRole('button',{name:'Ver cadastro de Pessoa Sintética 3',exact:true}).click();await expect(rece(page)).toHaveCount(0);expect(e.receReads).toBe(reads);expect(e.writes).toBe(0)
})
test('logout elimina edição sensível e prévia; seleção de outra clínica não leva dados anteriores',async({page})=>{
  const e=await preparar(page);await ver(page);await preencherPix(page);await foto(page).getByLabel('Adicionar foto').setInputFiles(arquivo)
  await page.evaluate(async()=>{const {supabase}=await import('/src/lib/supabase.ts');await supabase.auth.signOut({scope:'local'})})
  await expect(page.getByLabel('Chave PIX',{exact:true})).toHaveCount(0);await expect(page.getByAltText('Prévia da foto selecionada')).toHaveCount(0);await expect(rece(page).getByText('Recebimento indisponível')).toBeVisible();expect(e.writes).toBe(0)
  const armazenado=await page.evaluate(()=>JSON.stringify(localStorage));expect(armazenado).not.toContain('favorecido@example.invalid');expect(armazenado).not.toContain('Favorecido Sintético')
})
test('confirmação atrasada após logout não repovoa a ficha nem deixa o fechamento bloqueado',async({page})=>{
  const e=await preparar(page);await ver(page);await preencherPix(page);e.adiar=true
  await rece(page).getByRole('button',{name:'Salvar recebimento'}).click();await expect(rece(page).getByRole('button',{name:'Salvando…',exact:true})).toBeDisabled()
  await expect(page.getByRole('button',{name:'Fechar',exact:true})).toBeDisabled()
  await page.evaluate(async()=>{const {supabase}=await import('/src/lib/supabase.ts');await supabase.auth.signOut({scope:'local'})})
  await expect(rece(page).getByText('Recebimento indisponível')).toBeVisible();await expect(page.getByRole('button',{name:'Fechar',exact:true})).toBeEnabled()
  const resposta=page.waitForResponse(r=>r.url().endsWith('/functions/v1/equipe-recursos'));e.liberar();await resposta
  await expect(rece(page).getByRole('button',{name:'Editar recebimento'})).toHaveCount(0);await expect(rece(page)).not.toContainText('Favorecido Sintético');expect(e.writes).toBe(1)
})
for(const width of [360,390,430])test(`celular ${width}: foto, campos em uma coluna, cancelamento e botões alcançáveis`,async({page})=>{
  await page.setViewportSize({width,height:844});const e=await preparar(page);await ver(page);await foto(page).getByLabel('Adicionar foto').setInputFiles(arquivo);await expect(page.getByAltText('Prévia da foto selecionada')).toBeVisible();await foto(page).getByRole('button',{name:'Salvar foto',exact:true}).click();await expect(foto(page).getByText('Foto salva e atualizada na equipe.')).toBeVisible()
  await preencherPix(page);await conta(page);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect.poll(()=>rece(page).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
  await rece(page).getByRole('button',{name:'Cancelar recebimento'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Descartar edição',exact:true}).click();await expect(rece(page).getByRole('button',{name:'Cadastrar dados de recebimento'})).toBeVisible()
  await page.locator('dialog').screenshot({path:`scratch/equipe-fotos-recebimento/ficha-mobile-${width}.png`});await page.getByRole('button',{name:'Fechar',exact:true}).click();await expect(page.getByTestId(`equipe-pessoa-${mid}`).locator('.equipe-avatar-imagem')).toBeVisible();await page.reload();await ver(page);await expect(foto(page).locator('.equipe-avatar-imagem')).toBeVisible();expect(e.accessWrites).toBe(0)
})

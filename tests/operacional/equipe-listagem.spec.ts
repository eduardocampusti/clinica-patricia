import { expect, test, type Page } from '@playwright/test'

test.setTimeout(90_000)
const clinicas = [{id:'clinica-a',nome:'Clínica Brotas'},{id:'clinica-b',nome:'Clínica Ipupiara'}]
const nomes = ['Álvaro de Sá','Lívia Recepção Sintética','Nome sintético muito extenso para conferir a leitura e o comportamento da listagem em telas estreitas']
const criar = (id:string, i:number) => ({id,nome_completo:nomes[i],cargo:i===0?'Médico(a)':i===1?'Recepcionista':'Serviços gerais',tipo:i===0?'profissional_saude':i===1?'administrativo':'apoio',profissao:i===0?'Clínica médica':null,clinicas:i===0?clinicas:[clinicas[0]],acesso_status:i===0?'ativo_na_unidade':i===1?'sem_conta':undefined,revisao:1,telefone:null,email_contato:null,conselho_classe:null,registro_conselho:null,conselho_uf:null,especialidade_id:null,especialidade_nome:null})

async function preparar(page:Page, opcoes:{vazio?:boolean;erro?:number;unidade?:string}={}) {
  const estado={lista:0,detalhes:[] as string[],acessos:[] as string[],escritas:0,erro:opcoes.erro??0,vazio:opcoes.vazio??false,papel:'recepcao'}
  const membros=[criar('um',0),criar('dois',1),criar('tres',2)].map(m => opcoes.unidade === 'ipupiara' && m.id !== 'um' ? {...m,clinicas:[clinicas[1]]} : m)
  await page.route('**/*',async route=>{
    const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue()
    if(u.hostname!=='operacional.synthetic.invalid')return route.abort()
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'}
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers})
    const json=(body:unknown,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)})
    if(u.pathname.endsWith('/usuarios_clinicas'))return json({papel:'proprietaria'})
    if(u.pathname.endsWith('/clinicas'))return json(clinicas)
    if(u.pathname.endsWith('/rpc/equipe_listar')){estado.lista++;return estado.erro?json({code:estado.erro===403?'42501':'XX000',message:'Detalhe interno que não pode aparecer'},estado.erro):json(estado.vazio?[]:[...membros,membros[0]])}
    if(u.pathname.endsWith('/rpc/equipe_detalhar')){const id=route.request().postDataJSON().p_membro_id;estado.detalhes.push(id);return json({...membros.find(m=>m.id===id),cpf:null,cpf_situacao:'ausente'})}
    if(u.pathname.includes('/functions/')){
      const b=route.request().postDataJSON();if(b.acao==='listar'){
        estado.acessos.push(b.membroId)
        return json({membro_id:b.membroId,usuario_id:b.membroId==='um'?'u-sintetico':null,login_email:null,conta_confirmada:false,clinicas:clinicas.map((c,i)=>({...c,usuario_id:b.membroId==='um'?'u-sintetico':null,ativo:b.membroId==='um'&&i===0,status:b.membroId==='um'?(i===0?'acesso_ativo':'acesso_suspenso'):i===0?'convite_pendente':'sem_acesso',papel:b.membroId==='um'?(i===0?estado.papel:'medico'):null})),convites:[]})
      }
      estado.escritas++; if(b.acao==='alterar'){estado.papel=b.papel;return json({clinica_id:b.clinicaAlvoId,status:'acesso_ativo',papel:estado.papel})}
      return json({})
    }
    return json([])
  })
  await page.goto(`/sistema/${opcoes.unidade??'brotas'}/equipe?previa=cadastros`)
  await expect(page.getByRole('heading',{name:'Equipe & acessos',exact:true})).toBeVisible()
  if(!estado.erro&&!estado.vazio)await expect(page.getByTestId('equipe-pessoa-um')).toBeVisible()
  return estado
}
const busca=(page:Page)=>page.getByRole('searchbox',{name:'Buscar por nome, cargo ou profissão'})
const limpar=(page:Page)=>page.getByRole('button',{name:'Limpar filtros',exact:true}).first()

test('busca normalizada, combinação e limpeza; contagens por pessoa e sem consultas por linha',async({page})=>{
  const e=await preparar(page);expect(e.acessos).toEqual([])
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('3')
  await expect(page.getByTestId('equipe-contagem-saude')).toHaveText('1')
  await expect(page.getByTestId('equipe-contagem-demais')).toHaveText('2')
  const leituras=e.lista
  for(const termo of ['  ALVARO   DE   SA  ','clinica MEDICA','MEDICO']){
    await busca(page).fill(termo);await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('1');await expect(page.getByTestId('equipe-pessoa-um')).toBeVisible()
  }
  await page.getByLabel('Tipo de membro',{exact:true}).selectOption('administrativo')
  await expect(page.getByText('Nenhum resultado para os filtros',{exact:true})).toBeVisible()
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('0')
  await limpar(page).click();await expect(busca(page)).toHaveValue('')
  await page.getByLabel('Vínculo cadastral com clínica',{exact:true}).selectOption('clinica-b')
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('1')
  await expect(page.getByLabel('Selecionar clínica',{exact:true})).toHaveValue('clinica-a')
  await expect(page.getByTestId('resumo-acesso-um')).toContainText('Acesso não confirmado')
  await expect(page.getByTestId('resumo-acesso-um')).not.toContainText('Acesso ativo')
  await limpar(page).click();await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('3')
  expect(e.lista).toBe(leituras);expect(e.acessos).toEqual([]);expect(e.escritas).toBe(0)
})

test('estado por clínica, desconhecido, contexto e foco preservados ao fechar ficha; ações corretas',async({page})=>{
  const e=await preparar(page)
  await expect(page.getByTestId('resumo-acesso-tres')).toContainText('Conta e acesso não confirmados')
  await expect(page.getByTestId('resumo-acesso-tres')).not.toContainText('Sem conta vinculada')
  await busca(page).fill('ALVARO');await page.getByLabel('Vínculo cadastral com clínica',{exact:true}).selectOption('clinica-b')
  const botao=page.getByRole('button',{name:`Ver cadastro de ${nomes[0]}`,exact:true});await botao.click()
  await expect(page.getByLabel('Papel de Clínica Brotas')).toHaveValue('recepcao')
  await expect(page.getByRole('dialog')).toContainText('Acesso suspenso')
  await page.getByRole('button',{name:'Fechar',exact:true}).click()
  await expect(busca(page)).toHaveValue('ALVARO');await expect(page.getByLabel('Vínculo cadastral com clínica',{exact:true})).toHaveValue('clinica-b')
  await expect(botao).toBeFocused();await expect(page.getByTestId('resumo-acesso-um')).toContainText('Clínica Ipupiara')
  await expect(page.getByTestId('resumo-acesso-um')).toContainText('Acesso suspenso');await expect(page.getByTestId('resumo-acesso-um')).not.toContainText('Acesso ativo')
  await page.getByRole('button',{name:`Editar cadastro de ${nomes[0]}`,exact:true}).click()
  await expect(page.getByTestId('tipo-membro-atual')).toContainText('Profissional de saúde');await page.getByRole('button',{name:'Cancelar',exact:true}).click()
  expect(e.detalhes.every(id=>id==='um')).toBe(true);expect(e.acessos.every(id=>id==='um')).toBe(true);expect(e.escritas).toBe(0)
})

test('vazio, erro com recuperação e permissão recusada são estados distintos',async({page})=>{
  const e=await preparar(page,{vazio:true})
  await expect(page.getByText('Nenhum membro cadastrado neste escopo',{exact:true})).toBeVisible()
  e.erro=500;await page.reload();await expect(page.getByText('Consulta da equipe não concluída',{exact:true})).toBeVisible()
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveCount(0)
  await expect(page.getByRole('alert')).not.toContainText('Detalhe interno')
  e.erro=0;e.vazio=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click()
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('3')
  e.erro=403;await page.reload();await expect(page.getByText('Sem permissão para consultar a equipe',{exact:true})).toBeVisible()
  await expect(page.getByText('Consulta de cadastros antigos',{exact:true})).toHaveCount(0)
  expect(e.acessos).toEqual([]);expect(e.escritas).toBe(0)
})

test('operação simulada recarrega a lista sem perder filtros ou duplicar pessoas',async({page})=>{
  const e=await preparar(page);await busca(page).fill('Álvaro');await page.getByLabel('Tipo de membro',{exact:true}).selectOption('profissional_saude')
  await page.getByRole('button',{name:`Ver cadastro de ${nomes[0]}`,exact:true}).click()
  await page.getByLabel('Papel de Clínica Brotas').selectOption('medico')
  const antes=e.lista;await page.getByRole('button',{name:'Salvar papel',exact:true}).click()
  await expect(page.getByLabel('Papel de Clínica Brotas')).toHaveValue('medico')
  await expect.poll(()=>e.lista).toBeGreaterThan(antes)
  await expect(page.getByTestId('resumo-acesso-um')).toContainText('Papel atual: Médico')
  await page.getByRole('button',{name:'Fechar',exact:true}).click()
  await expect(busca(page)).toHaveValue('Álvaro');await expect(page.getByLabel('Tipo de membro',{exact:true})).toHaveValue('profissional_saude')
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('1');expect(e.escritas).toBe(1)
})

for(const largura of [360,390,430,820,1440])test(`layout ${largura}px, cards/tabela e navegação de Cadastros`,async({page})=>{
  await page.setViewportSize({width:largura,height:1000});const e=await preparar(page)
  await expect(page.getByRole('table')).toHaveCount(largura<768?0:1)
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  for(const m of ['um','dois','tres']){
    const pessoa=page.getByTestId(`equipe-pessoa-${m}`);await expect(pessoa).toBeVisible()
    for(const b of await pessoa.getByRole('button').all())expect(await b.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
  }
  await page.screenshot({path:`scratch/equipe-listagem/${largura}-lista.png`,fullPage:true})
  if(largura===820)for(const botao of await page.getByTestId('equipe-pessoa-um').getByRole('button').all())expect(await botao.evaluate(el=>{const r=el.getBoundingClientRect(),a=el.closest('.equipe-tabela-area')!.getBoundingClientRect();return r.left>=a.left&&r.right<=a.right})).toBe(true)
  await page.getByRole('button',{name:`Ver cadastro de ${nomes[1]}`,exact:true}).click();await expect(page.getByTestId('painel-gestao-acessos')).toBeVisible();await page.getByRole('button',{name:'Fechar',exact:true}).click()
  await expect(page.getByTestId('resumo-acesso-dois')).toContainText('Convite pendente')
  await page.getByRole('button',{name:`Editar cadastro de ${nomes[1]}`,exact:true}).click();await expect(page.getByTestId('tipo-membro-atual')).toContainText('Administrativo ou recepção');await page.getByRole('button',{name:'Cancelar',exact:true}).click()
  expect(e.detalhes).toEqual(['dois','dois'])
  const nav=page.getByRole('navigation',{name:'Seções de Cadastros'});await nav.getByRole('button',{name:'Serviços',exact:true}).click();await expect(nav.getByRole('button',{name:'Serviços',exact:true})).toHaveAttribute('aria-pressed','true')
  await nav.getByRole('button',{name:'Equipe & acessos',exact:true}).click();await expect(page.getByTestId('equipe-pessoa-um')).toBeVisible()
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(e.escritas).toBe(0)
})

test('Ipupiara e tema escuro: textos/foco, contraste e resultado contido',async({page})=>{
  await page.setViewportSize({width:390,height:844});await preparar(page,{unidade:'ipupiara'})
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','escuro'))
  await busca(page).focus();expect(await busca(page).evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none')
  await expect(page.getByLabel('Selecionar clínica',{exact:true})).toHaveValue('clinica-b')
  for (const tema of ['claro','escuro']) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme',t),tema)
    const contrastes = await page.evaluate(() => {
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!
      const luz = (rgb:number[]) => rgb.slice(0,3).map(n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0)
      return ['.equipe-botao-principal','#equipe-busca','.equipe-contagem','.equipe-estado-ativo'].map(seletor=>{
        const el=document.querySelector(seletor)!, estilo=getComputedStyle(el), ancestrais:Element[]=[]
        for(let n:Element|null=el;n;n=n.parentElement)ancestrais.unshift(n)
        ctx.clearRect(0,0,1,1);for(const n of ancestrais){ctx.fillStyle=getComputedStyle(n).backgroundColor;ctx.fillRect(0,0,1,1)}
        const fundo=luz([...ctx.getImageData(0,0,1,1).data]);ctx.clearRect(0,0,1,1)
        ctx.fillStyle=seletor==='#equipe-busca'?getComputedStyle(el,'::placeholder').color:estilo.color;ctx.fillRect(0,0,1,1)
        const texto=luz([...ctx.getImageData(0,0,1,1).data]);return {seletor,valor:(Math.max(texto,fundo)+.05)/(Math.min(texto,fundo)+.05)}
      })
    })
    for(const c of contrastes)expect(c.valor,`${tema}: ${c.seletor}`).toBeGreaterThanOrEqual(4.5)
  }
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','escuro'))
  await page.screenshot({path:'scratch/equipe-listagem/ipupiara-escuro.png',fullPage:true})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

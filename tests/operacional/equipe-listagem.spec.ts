import { expect, test, type Page } from '@playwright/test'
import { abrirAcessoFicha } from './equipe-ficha-helpers'
import { conferirTipo, editarCadastro, filtrarTipo, resumoAcesso } from './equipe-listagem-helpers'

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
    if(u.pathname.endsWith('/functions/v1/equipe-fichas'))return json({codigo:'CONSULTA_INDISPONIVEL'},503)
    if(u.pathname.endsWith('/functions/v1/equipe-acessos')){
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
  // Saúde sem conselho/registro sinaliza a pendência; demais mostram e-mail ou a ausência dele.
  await expect(page.getByTestId('equipe-pessoa-um')).toContainText('Conselho e registro pendentes')
  await expect(page.getByTestId('equipe-pessoa-dois')).toContainText('Sem e-mail de contato')
  const segmentado=await page.getByLabel('Tipo de membro',{exact:true}).count()===0
  if(segmentado)for(const [valor,n] of [['todos','3'],['profissional_saude','1'],['administrativo','1'],['apoio','1'],['outro','0']])await expect(page.getByTestId(`equipe-segmento-${valor}`)).toHaveText(n)
  const leituras=e.lista
  for(const termo of ['  ALVARO   DE   SA  ','clinica MEDICA','MEDICO']){
    await busca(page).fill(termo);await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('1');await expect(page.getByTestId('equipe-pessoa-um')).toBeVisible()
  }
  await filtrarTipo(page,'administrativo')
  await expect(page.getByText('Nenhuma pessoa encontrada',{exact:true})).toBeVisible()
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('0')
  // Os números dos segmentos seguem a busca e ignoram o tipo escolhido.
  if(segmentado)await expect(page.getByTestId('equipe-segmento-todos')).toHaveText('1')
  await limpar(page).click();await expect(busca(page)).toHaveValue('')
  await page.getByLabel('Vínculo cadastral com clínica',{exact:true}).selectOption('clinica-b')
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('1')
  await expect(page.getByLabel('Selecionar clínica',{exact:true})).toHaveValue('clinica-a')
  await expect(await resumoAcesso(page,'um',nomes[0])).toContainText('Não confirmado')
  // A nota só acompanha clínicas não confirmadas.
  await expect(page.getByText(/^Não confirmado não significa sem acesso/)).toBeVisible()
  await expect(page.getByTestId('resumo-acesso-um')).not.toContainText('Acesso ativo')
  await limpar(page).click();await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('3')
  expect(e.lista).toBe(leituras);expect(e.acessos).toEqual([]);expect(e.escritas).toBe(0)
})

test('estado por clínica, desconhecido, contexto e foco preservados ao fechar ficha; ações corretas',async({page})=>{
  const e=await preparar(page)
  await expect(await resumoAcesso(page,'tres',nomes[2])).toContainText('Conta e acesso não confirmados')
  await expect(page.getByTestId('resumo-acesso-tres')).not.toContainText('Sem conta vinculada')
  await busca(page).fill('ALVARO');await page.getByLabel('Vínculo cadastral com clínica',{exact:true}).selectOption('clinica-b')
  const botao=page.getByRole('button',{name:`Ver cadastro de ${nomes[0]}`,exact:true});await botao.click()
  await expect(page.getByLabel('Papel de Clínica Brotas')).toHaveValue('recepcao')
  await expect(page.getByRole('dialog')).toContainText('Acesso suspenso')
  await page.getByRole('button',{name:'Fechar',exact:true}).click()
  await expect(busca(page)).toHaveValue('ALVARO');await expect(page.getByLabel('Vínculo cadastral com clínica',{exact:true})).toHaveValue('clinica-b')
  await expect(botao).toBeFocused();await expect(await resumoAcesso(page,'um',nomes[0])).toContainText('Clínica Ipupiara')
  await expect(page.getByTestId('resumo-acesso-um')).toContainText('Acesso suspenso');await expect(page.getByTestId('resumo-acesso-um')).not.toContainText('Acesso ativo')
  await expect(page.getByText(/^Não confirmado não significa sem acesso/)).toHaveCount(0)
  await editarCadastro(page,nomes[0])
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
  const e=await preparar(page);await busca(page).fill('Álvaro');await filtrarTipo(page,'profissional_saude')
  await resumoAcesso(page,'um',nomes[0])
  await page.getByRole('button',{name:`Ver cadastro de ${nomes[0]}`,exact:true}).click()
  await abrirAcessoFicha(page.getByRole('dialog'));
  await page.getByLabel('Papel de Clínica Brotas').selectOption('medico')
  const antes=e.lista;await page.getByRole('button',{name:'Salvar papel',exact:true}).click()
  await expect(page.getByLabel('Papel de Clínica Brotas')).toHaveValue('medico')
  await expect.poll(()=>e.lista).toBeGreaterThan(antes)
  await expect(page.getByTestId('resumo-acesso-um')).toContainText('Papel atual: Médico')
  await page.getByRole('button',{name:'Fechar',exact:true}).click()
  await expect(busca(page)).toHaveValue('Álvaro');await conferirTipo(page,'profissional_saude')
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('1');expect(e.escritas).toBe(1)
})

test('linha expandida continua aberta quando a lista recarrega',async({page})=>{
  const e=await preparar(page)
  const resumo=await resumoAcesso(page,'um',nomes[0]);await expect(resumo).toBeVisible()
  const detalhes=page.getByRole('button',{name:`Detalhes de ${nomes[0]}`,exact:true})
  const naGrade=await detalhes.count()>0
  if(naGrade)await expect(detalhes).toHaveAttribute('aria-expanded','true')
  // Recarga forçada: operação confirmada na ficha relê a lista.
  await page.getByRole('button',{name:`Ver cadastro de ${nomes[0]}`,exact:true}).click()
  await abrirAcessoFicha(page.getByRole('dialog'))
  await page.getByLabel('Papel de Clínica Brotas').selectOption('medico')
  const antes=e.lista;await page.getByRole('button',{name:'Salvar papel',exact:true}).click()
  await expect.poll(()=>e.lista).toBeGreaterThan(antes)
  await page.getByRole('button',{name:'Fechar',exact:true}).click()
  await expect(page.getByTestId('resumo-acesso-um')).toBeVisible()
  await expect(page.getByTestId('resumo-acesso-um')).toContainText('Papel atual: Médico')
  if(naGrade)await expect(detalhes).toHaveAttribute('aria-expanded','true')
})

for(const largura of [360,390,430,820,1440])test(`layout ${largura}px, cards/tabela e navegação de Cadastros`,async({page})=>{
  await page.setViewportSize({width:largura,height:1000});const e=await preparar(page)
  await expect(page.getByRole('table')).toHaveCount(largura<768?0:1)
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  for(const m of ['um','dois','tres']){
    const pessoa=page.getByTestId(`equipe-pessoa-${m}`);await expect(pessoa).toBeVisible()
    // Alvos de no mínimo 36px na grade e 44px nos cartões.
    for(const b of await pessoa.getByRole('button').all())expect(await b.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(largura<768?44:36)
  }
  await page.screenshot({path:`scratch/equipe-reui-visual/${largura}-lista.png`,fullPage:true})
  // Tablet: sem a coluna Clínicas, Acesso e ações cabem sem rolagem horizontal.
  if(largura===820){
    await expect(page.getByRole('columnheader',{name:'Clínicas'})).toHaveCount(0)
    await expect(page.getByRole('columnheader',{name:'Acesso'})).toBeInViewport({ratio:1})
    expect(await page.locator('.equipe-tabela-area [data-slot=scroll-area-viewport]').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)
    await expect(page.locator('.equipe-tabela-area [data-slot=data-grid-scrollbar][data-orientation=horizontal]')).toHaveCount(0)
  }
  if(largura>=768)await expect(page.getByRole('columnheader',{name:'Ações'})).toHaveCount(1)
  if(largura===820)for(const botao of await page.getByTestId('equipe-pessoa-um').getByRole('button').all())expect(await botao.evaluate(el=>{const r=el.getBoundingClientRect(),a=el.closest('.equipe-tabela-area')!.getBoundingClientRect();return r.left>=a.left&&r.right<=a.right})).toBe(true)
  await page.getByRole('button',{name:`Ver cadastro de ${nomes[1]}`,exact:true}).click();await abrirAcessoFicha(page.getByRole('dialog'));await expect(page.getByTestId('painel-gestao-acessos')).toBeVisible();await page.getByRole('button',{name:'Fechar',exact:true}).click()
  await expect(await resumoAcesso(page,'dois',nomes[1])).toContainText('Convite pendente')
  await editarCadastro(page,nomes[1]);await expect(page.getByTestId('tipo-membro-atual')).toContainText('Administrativo ou recepção');await page.getByRole('button',{name:'Cancelar',exact:true}).click()
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
      return ['.equipe-botao-principal','#equipe-busca','.equipe-info-lista','.equipe-selo-ativo','.equipe-selo-neutro'].map(seletor=>{
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
  await page.screenshot({path:'scratch/equipe-reui-visual/ipupiara-escuro.png',fullPage:true})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

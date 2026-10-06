import { expect, test, type Page } from '@playwright/test'

// A primeira otimização do Vite no Windows pode exceder o limite padrão.
test.setTimeout(90_000)

const clinicas = [{id:'clinica-a',nome:'Clínica Brotas'},{id:'clinica-b',nome:'Clínica Ipupiara'}]
const membros = Array.from({length:36},(_,i)=>({id:`p${String(i+1).padStart(2,'0')}`,nome_completo:`Pessoa Sintética ${String(i+1).padStart(2,'0')}`,cargo:i%2?'Recepção':'Médico(a)',tipo:i%2?'administrativo':'profissional_saude',profissao:i%2?null:'Clínica médica',clinicas:i%3? [clinicas[0]]:clinicas,revisao:1,acesso_status:'ativo_na_unidade',telefone:null,email_contato:null,conselho_classe:null,registro_conselho:null,conselho_uf:null,especialidade_id:null,especialidade_nome:null}))
async function preparar(page:Page, adiar=false) {
  const e={limite:36,leituras:0,escritas:0,papel:'recepcao'}
  let liberar!: () => void
  const espera = new Promise<void>(resolve => { liberar = resolve })
  await page.route('**/*',async route=>{
    const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue()
    if(u.hostname!=='operacional.synthetic.invalid')return route.abort()
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'}
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers})
    const json=(body:unknown)=>route.fulfill({headers,contentType:'application/json',body:JSON.stringify(body)})
    if(u.pathname.endsWith('/usuarios_clinicas'))return json({papel:'proprietaria'})
    if(u.pathname.endsWith('/clinicas'))return json(clinicas)
    // Reverse service order and repeat a multi-clinic ID: sorting/counts must not use raw order.
    if(u.pathname.endsWith('/rpc/equipe_listar')){e.leituras++;if(adiar)await espera;return json([...membros.slice(0,e.limite).reverse(),membros[0]])}
    if(u.pathname.endsWith('/rpc/equipe_detalhar'))return json({...membros.find(m=>m.id===route.request().postDataJSON().p_membro_id),cpf:null,cpf_situacao:'ausente'})
    if(u.pathname.endsWith('/functions/v1/equipe-fichas'))return json({codigo:'CONSULTA_INDISPONIVEL'})
    if(u.pathname.endsWith('/functions/v1/equipe-acessos')){
      const b=route.request().postDataJSON()
      if(b.acao==='listar')return json({membro_id:b.membroId,usuario_id:'usuario-sintetico',login_email:null,conta_confirmada:false,clinicas:clinicas.map(c=>({...c,usuario_id:'usuario-sintetico',ativo:true,status:'acesso_ativo',papel:e.papel})),convites:[]})
      e.escritas++;e.papel=b.papel;return json({clinica_id:b.clinicaAlvoId,status:'acesso_ativo',papel:e.papel})
    }
    return json([])
  })
  await page.goto('/sistema/brotas/equipe?previa=cadastros')
  if(adiar)await expect(page.getByLabel('Carregando equipe',{exact:true})).toBeVisible()
  else await expect(page.getByTestId('equipe-pessoa-p01')).toBeVisible()
  return Object.assign(e,{liberar})
}
const linhas=(page:Page)=>page.locator('.equipe-listagem [data-row-id]')
const ids=(page:Page)=>linhas(page).evaluateAll(els=>els.map(e=>e.getAttribute('data-row-id')))
const selecionadas=(page:Page,n:number)=>expect(page.getByRole('status').filter({hasText:new RegExp(`^${n} pessoa(s)? selecionada(s)?$`)})).toBeVisible()
const todas=(page:Page)=>page.getByRole('checkbox',{name:'Selecionar todas as pessoas desta página',exact:true})
const proxima=(page:Page)=>page.getByRole('button',{name:'Próxima página',exact:true})
const busca=(page:Page)=>page.getByRole('searchbox',{name:'Buscar por nome, cargo ou profissão'})

test('ordena antes de paginar, cabeçalho e tamanhos 10/25/50; contagem filtrada por ID',async({page})=>{
  const e=await preparar(page);const consultas=e.leituras
  await expect(linhas(page)).toHaveCount(10);expect((await ids(page))[0]).toBe('p01')
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('36')
  await expect(page.getByTestId('equipe-contagem-saude')).toHaveText('18')
  await proxima(page).click();expect((await ids(page))[0]).toBe('p11')
  await page.getByRole('button',{name:'Ordenar por pessoa',exact:true}).click()
  expect((await ids(page))[0]).toBe('p26')
  await page.getByRole('button',{name:'Ordenar por pessoa'}).click()
  expect((await ids(page))[0]).toBe('p11')
  const tamanho=page.getByRole('combobox',{name:'Pessoas por página',exact:true})
  await todas(page).check();await selecionadas(page,10)
  await tamanho.click();await page.getByRole('option',{name:'25',exact:true}).click()
  await expect(linhas(page)).toHaveCount(25);await selecionadas(page,0)
  await tamanho.click();await page.getByRole('option',{name:'50',exact:true}).click()
  await expect(linhas(page)).toHaveCount(36)
  await expect(page.getByRole('option',{name:'100',exact:true})).toHaveCount(0)
  await busca(page).fill(' clinica   MEDICA ');await page.getByLabel('Vínculo cadastral com clínica',{exact:true}).selectOption('clinica-b')
  await expect(linhas(page)).toHaveCount(6);await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('6')
  expect(e.leituras).toBe(consultas);expect(e.escritas).toBe(0)
})

test('carga atrasada não mostra totais nem grade vazia; resposta alimenta a mesma listagem',async({page})=>{
  const e=await preparar(page,true)
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveCount(0)
  await expect(page.getByRole('table')).toHaveCount(0)
  await expect(page.getByText('Nenhum membro cadastrado neste escopo',{exact:true})).toHaveCount(0)
  e.liberar();await expect(linhas(page)).toHaveCount(10)
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('36')
  expect(e.escritas).toBe(0)
})

test('seleção apenas da página, teclado e limpeza por filtro/página/ordenação/clínica',async({page})=>{
  const e=await preparar(page)
  await todas(page).press('Space');await selecionadas(page,10)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(linhas(page).filter({has:page.getByRole('checkbox',{checked:true})})).toHaveCount(10)
  await proxima(page).click();await selecionadas(page,0)
  await todas(page).check();await selecionadas(page,10)
  await busca(page).fill('Sintética 35');await selecionadas(page,0)
  expect(await ids(page)).toEqual(['p35'])
  await todas(page).check();await selecionadas(page,1)
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).first().click();await selecionadas(page,0)
  expect((await ids(page))[0]).toBe('p01')
  await todas(page).check();await page.getByRole('button',{name:'Ordenar por função',exact:true}).click();await selecionadas(page,0)
  await todas(page).check();await page.getByLabel('Selecionar clínica',{exact:true}).selectOption('clinica-b');await selecionadas(page,0)
  await expect(page.getByLabel('Selecionar clínica',{exact:true})).toHaveValue('clinica-b')
  expect(e.escritas).toBe(0)
})

test('ficha preserva página/filtro/foco; atualização simulada reduz resultado e limpa seleção',async({page})=>{
  const e=await preparar(page);const consultas=e.leituras;await busca(page).fill('Sintética')
  await proxima(page).click();await proxima(page).click();await proxima(page).click()
  expect((await ids(page))[0]).toBe('p31');await todas(page).check();await selecionadas(page,6)
  const ver=page.getByRole('button',{name:'Ver cadastro de Pessoa Sintética 31',exact:true});await ver.click()
  await expect(page.getByLabel('Papel de Clínica Brotas')).toHaveValue('recepcao')
  await expect(page.getByRole('button',{name:'Salvar papel',exact:true}).first()).toBeDisabled()
  await page.getByRole('button',{name:'Fechar',exact:true}).click();await expect(ver).toBeFocused()
  expect((await ids(page))[0]).toBe('p31');await selecionadas(page,6);await expect(busca(page)).toHaveValue('Sintética')
  await ver.click();await page.getByLabel('Papel de Clínica Brotas').selectOption('medico');e.limite=12
  await page.getByRole('button',{name:'Salvar papel',exact:true}).first().click()
  await expect.poll(()=>e.leituras).toBeGreaterThan(consultas)
  await expect(page.getByLabel('Papel de Clínica Brotas')).toHaveValue('medico')
  await page.getByRole('button',{name:'Fechar',exact:true}).click()
  await expect(page.getByTestId('equipe-contagem-pessoas')).toHaveText('12')
  expect(await ids(page)).toEqual(['p11','p12']);await selecionadas(page,0)
  await expect(busca(page)).toHaveValue('Sintética');expect(e.escritas).toBe(1)
})

test('cards compartilham ordenação, página e seleção ao alternar computador/celular',async({page})=>{
  const e=await preparar(page);const consultas=e.leituras;await proxima(page).click();await todas(page).check()
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('table')).toHaveCount(0)
  expect((await ids(page))[0]).toBe('p11');await selecionadas(page,10)
  await proxima(page).click();await selecionadas(page,0);expect((await ids(page))[0]).toBe('p21')
  await page.getByLabel('Ordenar por',{exact:true}).selectOption('nome-desc');expect((await ids(page))[0]).toBe('p16')
  await todas(page).check();await selecionadas(page,10)
  await page.screenshot({path:'scratch/equipe-reui-visual/mobile-paginado.png',fullPage:true})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.setViewportSize({width:1440,height:1000});await expect(page.getByRole('table')).toHaveCount(1)
  expect((await ids(page))[0]).toBe('p16');await selecionadas(page,10)
  await page.screenshot({path:'scratch/equipe-reui-visual/desktop-paginado.png',fullPage:true})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  expect(e.leituras).toBe(consultas);expect(e.escritas).toBe(0)
})

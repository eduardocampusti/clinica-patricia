import {test,expect,type Page} from '@playwright/test'
import {writeFileSync} from 'node:fs'
import {preparar,clinicas,abrirMenu,fecharMenu} from '../login/dashboard-fixture'
import {instituicaoVazia,type DocumentoConfiguracao} from '../../supabase/functions/_shared/configuracoes'
async function fixture(page:Page,papel:'proprietaria'|'recepcao'|'medico'='proprietaria') {
  await preparar(page,papel)
  await page.route('**/rest/v1/clinicas*',route=>route.fulfill({headers:{'access-control-allow-origin':'*'},json:clinicas.map((c,n)=>({...c,subdomain:n?'ipupiara':'brotas',cor_primaria:'#006194',cor_secundaria:'#eff4ff',cor_menu:'#07345d'}))}))
  const estados=new Map<string,{documento:DocumentoConfiguracao;revisao:number;historico:unknown[]}>()
  const falhas={salvar:0,disponivel:true,demora:0,respostaIncompleta:false};const operacoes:{acao:string;escopo:string}[]=[]
  for(const c of clinicas)estados.set(c.id,{documento:{instituicao:{...instituicaoVazia(),nome:c.nome,cidade:'Cidade Sintética'},campos:{},variacoes:{}},revisao:0,historico:[]})
  const resposta=(escopo:string)=>({...estados.get(escopo),escopo,disponivel:falhas.disponivel,podeGeral:false,geralRevisao:0,geral:{},fonteRevisao:'sintetica',empresas:[],ativos:{}})
  await page.route('**/functions/v1/configuracoes',async route=>{
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'}
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers})
    const b=route.request().postDataJSON();operacoes.push(b)
    if(papel!=='proprietaria'||!estados.has(b.escopo))return route.fulfill({status:403,headers,json:{erro:'Operação não autorizada.'}})
    if(b.acao!=='consultar'&&falhas.salvar)return route.fulfill({status:falhas.salvar,headers,json:{erro:falhas.salvar===409?'Outra edição alterou a configuração. Reconsulte.':'Falha de rede sintética. Salvamento não confirmado.',conferir:falhas.salvar!==409}})
    if(b.acao!=='consultar'&&falhas.respostaIncompleta)return route.fulfill({status:200,headers,json:{confirmado:false}})
    if(b.acao!=='consultar'){
      if(falhas.demora)await new Promise(r=>setTimeout(r,falhas.demora))
      const s=estados.get(b.escopo)!,novo=b.acao==='restaurar'?(s.historico.find((v:any)=>v.revisao===b.versao) as any).documento:b.documento
      s.documento=structuredClone(novo);s.revisao++;s.historico.unshift({revisao:s.revisao,acao:b.acao,documento:structuredClone(novo),autor:'Pessoa Sintética',instante:'2026-10-08T22:00:00Z'})
    }
    return route.fulfill({headers,json:resposta(b.escopo)})
  })
  await page.route('**/rest/v1/rpc/configuracoes_timbrado_consultar',route=>route.fulfill({headers:{'access-control-allow-origin':'*'},json:{instituicao:{...instituicaoVazia(),nome:'Clínica Sintética',cidade:'Cidade'},campos:{},geral:{},variacoes:{},versao:0}}))
  await page.route('**/functions/v1/configuracoes-publicas',route=>route.fulfill({headers:{'access-control-allow-origin':'*'},json:{}}))
  return {falhas,operacoes,estados}
}
async function abrir(page:Page){await page.goto('/sistema/brotas/configuracoes');await expect(page.getByRole('heading',{name:'Configurações',exact:true})).toBeVisible();await expect(page.getByLabel('Nome da unidade',{exact:true})).toBeVisible()}
test('menu, URL e F5 preservam clínica; Recepção e Médico não acessam',async({page})=>{
  await fixture(page);await abrir(page);await abrirMenu(page)
  const links=await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link').allTextContents();expect(links.indexOf('Configurações')).toBe(links.indexOf('Equipe')+1);expect(links.indexOf('Sobre o sistema')).toBe(links.indexOf('Configurações')+1)
  await fecharMenu(page);await page.reload();await expect(page.getByLabel('Nome da unidade',{exact:true})).toHaveValue('Clínica Brotas')
})
for(const papel of ['recepcao','medico'] as const)test(`nega rota e menu para ${papel}`,async({page})=>{const f=await fixture(page,papel);await page.goto('/sistema/brotas/configuracoes');await expect(page.getByText('Página não autorizada',{exact:true})).toBeVisible();expect(f.operacoes).toEqual([])})
test('herança, vazio explícito, rascunho, aplicar e restauração geram versões distintas',async({page})=>{
  const f=await fixture(page);await abrir(page);await page.getByRole('tab',{name:'Tela de login'}).click();const msg=page.getByLabel('Mensagem de boas-vindas',{exact:true});await msg.fill('Mensagem de exemplo');await expect(page.getByText('Alterações não salvas',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(page.getByText('Operação confirmada',{exact:true})).toBeVisible();expect(f.operacoes.at(-1)?.acao).toBe('rascunho')
  await msg.fill('');await page.getByRole('button',{name:'Aplicar configuração',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Aplicar configuração',exact:true}).click();await expect(page.getByText('Configuração aplicada e confirmada pelo servidor.')).toBeVisible();expect(f.estados.get(clinicas[0].id)!.documento.campos.loginMensagem).toBe('')
  await page.getByRole('tab',{name:'Histórico de alterações'}).click();await page.getByRole('button',{name:'Restaurar como rascunho'}).last().click();await page.getByRole('button',{name:'Restaurar rascunho',exact:true}).click();await expect(page.getByText(/Versão restaurada como novo rascunho/)).toBeVisible();expect(f.estados.get(clinicas[0].id)!.revisao).toBe(3)
})
test('cancelar, continuar editando, descartar e salvar antes de trocar a clínica',async({page})=>{
  await fixture(page);await abrir(page);await page.getByLabel('Nome fantasia',{exact:true}).fill('Edição local')
  await page.locator('.app-shell-header').getByRole('combobox',{name:'Selecionar clínica',exact:true}).selectOption(clinicas[1].id)
  await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('button',{name:'Continuar editando',exact:true}).click();await expect(page.getByLabel('Nome fantasia',{exact:true})).toHaveValue('Edição local')
  await page.getByRole('button',{name:'Cancelar edição',exact:true}).click();await expect(page.getByLabel('Nome fantasia',{exact:true})).toHaveValue('')
  await page.getByLabel('Nome fantasia',{exact:true}).fill('Rascunho Brotas');await page.locator('.app-shell-header').getByRole('combobox',{name:'Selecionar clínica',exact:true}).selectOption(clinicas[1].id)
  await page.getByRole('button',{name:'Salvar rascunho e continuar',exact:true}).click();await expect(page).toHaveURL(/ipupiara\/configuracoes$/);await expect(page.getByLabel('Nome da unidade',{exact:true})).toHaveValue('Clínica Ipupiara');await expect(page.getByLabel('Nome fantasia',{exact:true})).toHaveValue('')
})
for(const status of [409,503])test(`falha ${status} conserva edição e bloqueia repetição sem reconsulta`,async({page})=>{const f=await fixture(page);await abrir(page);f.falhas.salvar=status;await page.getByLabel('Nome fantasia',{exact:true}).fill('Conservar');await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(page.getByText('Operação não concluída',{exact:true})).toBeVisible();await expect(page.getByLabel('Nome fantasia',{exact:true})).toHaveValue('Conservar');await expect(page.getByRole('button',{name:'Salvar rascunho',exact:true})).toBeDisabled();await expect(page.getByText('Operação confirmada',{exact:true})).toHaveCount(0)})
test('backend pendente não simula salvamento',async({page})=>{const f=await fixture(page);f.falhas.disponivel=false;await abrir(page);await page.getByLabel('Nome fantasia',{exact:true}).fill('Local');await expect(page.getByRole('button',{name:'Salvar rascunho',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Aplicar configuração',exact:true})).toBeDisabled();expect(f.operacoes.every(o=>o.acao==='consultar')).toBe(true)})
test('resposta 200 incompleta não comprova persistência nem apaga a edição',async({page})=>{const f=await fixture(page);await abrir(page);f.falhas.respostaIncompleta=true;await page.getByLabel('Nome fantasia',{exact:true}).fill('Preservar resposta incerta');await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(page.getByText('Operação não concluída',{exact:true})).toBeVisible();await expect(page.getByText('Operação confirmada',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Nome fantasia',{exact:true})).toHaveValue('Preservar resposta incerta');await expect(page.getByRole('button',{name:'Salvar rascunho',exact:true})).toBeDisabled()})
test('empresa já vinculada mantém nome e CNPJ somente leitura, mesmo fora da lista de edição compartilhada',async({page})=>{const f=await fixture(page);const i=f.estados.get(clinicas[0].id)!.documento.instituicao!;i.empresaId='44444444-4444-4444-8444-444444444444';i.razaoSocial='Emissor fictício vinculado';await abrir(page);await expect(page.getByLabel('Instituição emissora',{exact:true})).toHaveValue(i.empresaId);await expect(page.getByLabel('Razão social',{exact:true})).toHaveValue(i.razaoSocial);await expect(page.getByLabel('Razão social',{exact:true})).toHaveAttribute('readonly','');await expect(page.getByLabel('CNPJ',{exact:true})).toHaveAttribute('readonly','')})
test('arquivos executáveis rejeitados; PNG transparente permanece proporcional na prévia',async({page})=>{
  const f=await fixture(page);f.falhas.disponivel=false;await abrir(page);await page.getByRole('tab',{name:'Identidade visual'}).click()
  const input=page.getByLabel('Selecionar Logo principal',{exact:true});await input.setInputFiles({name:'disfarce.png',mimeType:'image/png',buffer:Buffer.from('<script>executavel</script>')});await expect(page.getByText('Operação não concluída',{exact:true})).toBeVisible()
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d')!;ctx.fillStyle='navy';ctx.fillRect(8,8,240,48);return c.toDataURL('image/png').split(',')[1]})
  await input.setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});const img=page.getByAltText('Prévia: Logo principal');await expect(img).toBeVisible();expect(await img.evaluate(e=>{const r=e.getBoundingClientRect();return r.width/r.height})).toBeCloseTo(4,1);expect(f.operacoes.every(o=>o.acao==='consultar')).toBe(true)
})
test('prévia PDF A4 multipágina tem demonstração; texto longo e marca-d’água',async({page})=>{
  await fixture(page);await abrir(page);await page.getByRole('tab',{name:'Timbrados e documentos'}).click();await page.getByLabel('Marca-d’água opcional',{exact:true}).fill('DEMONSTRAÇÃO')
  const texto=page.getByLabel('Texto complementar da linha 1 do Rodapé',{exact:true});await texto.fill('Texto institucional extenso para conferir quebra de linha e rodapé sem sobreposição nas várias páginas do documento.');await texto.press('Enter')
  await page.getByRole('button',{name:'Gerar PDF de demonstração',exact:true}).click();await expect(page.getByRole('link',{name:'Baixar PDF de demonstração'})).toBeVisible();const d=page.waitForEvent('download');await page.getByRole('link',{name:'Baixar PDF de demonstração'}).click();await (await d).saveAs('scratch/configuracoes/demonstracao.pdf');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'scratch/configuracoes/desktop.png',fullPage:true});await page.screenshot({path:'scratch/configuracoes/desktop-viewport.png'})
})
for(const width of [360,390,430])for(const tema of ['claro','escuro'])test(`responsivo ${width}px ${tema}, teclado e prévia compacta`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.addInitScript(t=>localStorage.setItem('clinica-patricia:tema',t),tema);await fixture(page);await abrir(page);await page.getByRole('tab',{name:'Dados da clínica'}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Identidade visual'})).toBeFocused();await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Histórico de alterações'})).toBeFocused();const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width}))}));expect(overflow,JSON.stringify(overflow)).toMatchObject({scroll:width})
  await page.getByRole('tab',{name:'Tela de login'}).click();await expect(page.getByText('Formulário de acesso preservado')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);await page.screenshot({path:`scratch/configuracoes/${width}-${tema}.png`,fullPage:true})
})
test('login mantém formulário quando imagem falta e preserva identidade do domínio',async({page})=>{await preparar(page,'proprietaria','normal',{nome:'Pessoa Sintética',anonimo:true});await page.route('**/functions/v1/configuracoes-publicas',r=>r.fulfill({headers:{'access-control-allow-origin':'*'},json:{}}));await page.goto('/acesso/ipupiara');await page.route('**/imagem_login_ipupiara.png',r=>r.abort());await page.reload();await expect(page.getByRole('button',{name:'Acessar Sistema Integrado',exact:true})).toBeVisible();await expect(page.locator('.login-page')).toHaveAttribute('data-clinic-brand','ipupiara')})
test('demonstração isolada funciona sem conta ou persistência externa',async({page})=>{
  const externas:string[]=[];page.on('request',r=>{if(r.url().includes('/functions/v1/')||r.url().includes('/rest/v1/'))externas.push(r.url())})
  await page.goto('/tests/configuracoes/preview.html');await expect(page.getByText('Demonstração isolada · somente dados fictícios',{exact:true})).toBeVisible()
  await page.getByLabel('Nome fantasia',{exact:true}).fill('Teste somente em memória');await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(page.getByText('Operação confirmada',{exact:true})).toBeVisible()
  await page.reload();await expect(page.getByLabel('Nome fantasia',{exact:true})).toHaveValue('');expect(externas).toEqual([])
})
test('PDF de uma página com cabeçalho longo e exportação financeira paginada usam o renderer',async({page})=>{
  await fixture(page);await abrir(page)
  const arquivos=await page.evaluate(async()=>{
    const d=await import('/src/lib/timbradoPdf.ts'),c=await import('/supabase/functions/_shared/configuracoes.ts'),f=await import('/src/lib/financeiro/financeiro.relatorios.ts')
    const i={...c.instituicaoVazia(),nome:'Instituição fictícia com nome extenso para testar o cabeçalho em várias linhas sem sobreposição com o conteúdo',cidade:'Cidade de Exemplo',logradouro:'Rua de Exemplo',numero:'100',telefone:'(00) 00000-0000'}
    const s=c.criarSnapshot('sintetico',1,'padrao',i,{...c.PADRAO,cabecalho:[[{texto:'Cabeçalho complementar longo para conferir leitura e quebra de linha em uma página A4 com margens reservadas corretamente.'}]],rodape:[[{campo:'endereco'},{campo:'telefone'}]]})
    const simples=await d.gerarPdfTimbrado(s,[{texto:'Documento fictício de uma página',titulo:true},{texto:'Conteúdo somente demonstrativo para verificar a área útil, sem emissão clínica.'}],true)
    const relatorio={titulo:'Relatório financeiro fictício',publico:'proprietaria',periodoInicio:'2026-10-01T03:00:00Z',periodoFim:'2026-10-09T03:00:00Z',timezone:'America/Bahia',geradoEm:'2026-10-08T21:00:00Z',clinicas:['Unidade fictícia'],filtros:[],metricas:[{rotulo:'Valor sintético',valor:'1234.56',tipo:'monetario'}],secoes:[{nomeAba:'Fictícios',titulo:'Movimentos fictícios',colunas:[{chave:'rotulo',titulo:'Movimento',tipo:'texto'},{chave:'valor',titulo:'Valor',tipo:'monetario'}],linhas:Array.from({length:180},(_,n)=>({rotulo:`Movimento fictício ${n+1}`,valor:'12.34'}))}]}
    const financeiro=await f.gerarPdfFinanceiroSobDemanda(relatorio,{clinicaId:'22222222-2222-4222-8222-222222222222'})
    return [Array.from(new Uint8Array(await simples.arrayBuffer())),Array.from(new Uint8Array(await financeiro.arrayBuffer()))]
  })
  writeFileSync('scratch/configuracoes/uma-pagina.pdf',Buffer.from(arquivos[0]));writeFileSync('scratch/configuracoes/financeiro-ficticio.pdf',Buffer.from(arquivos[1]))
  expect(arquivos.every(a=>a.length>1000)).toBe(true)
})

import {expect,test} from '@playwright/test'
import {preparar,clinicas} from './dashboard-fixture'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
const fase=process.env.VISUAL_FASE??'depois'
for(const modo of ['1440-preenchido','1920-preenchido','1440-vazio','1440-escuro','390-preenchido','360-vazio','390-escuro','1440-lacunas','360-preenchido','360-escuro','1920-escuro'] ) test(`página completa ${modo}`,async({page})=>{
  const largura=Number(modo.split('-')[0]); await page.setViewportSize({width:largura,height:largura<500?844:1050});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.setFixedTime(new Date('2026-10-10T15:00:00Z'));
  if(modo.includes('escuro')) await page.addInitScript(()=>localStorage.setItem('clinica-patricia:tema','escuro'));
  const fixture=await preparar(page,'proprietaria','normal',{nome:'Pessoa Sintética'});
  await page.route('**/rest/v1/rpc/financeiro_dashboard_proprietaria',async route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
    const a=route.request().postDataJSON();const b=a.p_clinica_id===clinicas[0].id;
    const dias=Math.round((Date.parse(a.p_fim)-Date.parse(a.p_inicio))/86400000);
    const pontos=modo.includes('vazio')?[]:Array.from({length:dias},(_,i)=>({dia:new Date(Date.parse(a.p_inicio)+i*86400000).toISOString().slice(0,10),bruto:i===3?0:(b?[1250,1780,1420,0,2100,1840,2250,1950,2700,2340]:[820,950,1160,0,1050,1420,1230,1710,1550,1840])[i%10],clinica_liquida:0})).filter((_,i)=>!modo.includes('lacunas')||(b?i===0||i===4||i===9:i===1||i===4||i===8)).map(p=>({...p,clinica_liquida:p.bruto/4}));
    await route.fulfill({headers:{'access-control-allow-origin':'*'},json:{versao:1,inicio:a.p_inicio,fim:a.p_fim,timezone_series:'America/Bahia',clinicas_autorizadas:[a.p_clinica_id],consultado_em:'2026-10-10T15:00:00Z',resumo:{producao:{quantidade:pontos.length,bruto:pontos.reduce((t,p)=>t+p.bruto,0),clinica_liquida:pontos.reduce((t,p)=>t+p.clinica_liquida,0)},repasses:{valor_repasses_pagos_periodo:modo.includes('vazio')?0:b?2320:1100,repasses_pendentes_atual:0},fiscal:{pendente:0},caixa:{situacao_operacional_atual:{aguardando_aprovacao:0,devolvido_para_correcao:0}},series:pontos}}});
  });
  await page.goto('/sistema/brotas/dashboard');
  const secao=page.getByRole('region',{name:'Análise do período',exact:true});
  await expect(secao.getByText('Leitura concluída',{exact:false}).first()).toBeVisible();
  if(fase==='antes')await secao.getByLabel('Escopo da análise').selectOption('comparar');else await secao.getByRole('button',{name:'Comparar clínicas',exact:true}).click();
  await expect(secao.getByText('Leitura concluída',{exact:false}).last()).toBeVisible();
  await expect(secao.locator('.analise-tabela').last()).toContainText('Clínica Ipupiara');
  await page.evaluate(()=>{const aviso=document.createElement('div');aviso.textContent='Dados fictícios — teste visual';aviso.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:10000;background:#14253e;color:#fff;padding:3px 12px;font:12px sans-serif;white-space:nowrap';document.body.append(aviso)});
  await page.evaluate(()=>window.scrollTo(0,0));
  const medidas=await page.evaluate(()=>({largura:innerWidth,rolagem:document.documentElement.scrollWidth,blocos:['.prop','.prop-topo','.prop-moedas','.analise-periodo','.analise-resumos','.analise-graficos','.analise-resumo-tabela'].map(s=>{const e=document.querySelector(s);const r=e?.getBoundingClientRect();return{s,x:r?.x,width:r?.width,right:r?.right}})}));
  expect(medidas.rolagem).toBeLessThanOrEqual(largura);
  if(fase!=='antes'){
    const p=medidas.blocos[0],a=medidas.blocos[3];expect(p.x).toBe(a.x);expect(p.width).toBe(a.width);expect(p.width).toBeLessThanOrEqual(1440);for(const b of medidas.blocos){expect(b.x).toBe(a.x);expect(b.width).toBe(a.width)};
    await expect(page.getByText('Atualização concluída',{exact:true})).toBeVisible();
    await expect(secao.locator('.analise-principal').first()).toContainText(modo.includes('vazio')?'R$ 0,00':modo.includes('lacunas')?'R$ 9.240,00':'R$ 29.360,00');
    if(modo.includes('vazio')){await expect(secao.getByRole('heading',{name:'Sem recebimentos neste período'})).toBeVisible();await expect(secao.locator('.recharts-bar-rectangle path')).toHaveCount(0)}
    if(!modo.includes('vazio')&&!modo.includes('lacunas'))expect(await secao.locator('.recharts-line-curve').first().getAttribute('d')).toContain('L');
  }
  const destino=join(process.cwd(),'docs/modulos/sistema/correcao-visual-dashboard-2026-10-10',fase);mkdirSync(destino,{recursive:true});
  await page.screenshot({path:join(destino,`${modo}.png`),fullPage:true});writeFileSync(join(destino,`${modo}.json`),JSON.stringify(medidas,null,2));
  expect(fixture.escritas).toEqual([]);
});

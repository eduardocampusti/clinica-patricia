import { expect, test, type Page, type Route } from '@playwright/test'
import { preparar, clinicas, abrirMenu, type PerfilSintetico } from './dashboard-fixture'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

interface Args { p_inicio: string; p_fim: string; p_clinica_id: string }
function resposta(a: Args, vazia = false) {
  const brotas = a.p_clinica_id === clinicas[0].id
  const inicio = a.p_inicio.slice(0, 10), fim = new Date(Date.parse(a.p_fim) - 86400000).toISOString().slice(0, 10)
  const pontos = vazia ? [] : inicio === fim ? [{ dia: inicio, bruto: brotas ? 1200 : 700, clinica_liquida: brotas ? 300 : 175 }] : [
    { dia: inicio, bruto: brotas ? 1200 : 700, clinica_liquida: brotas ? 300 : 175 },
    { dia: fim, bruto: brotas ? 800 : 300, clinica_liquida: brotas ? 200 : 75 },
  ]
  return {
    versao: 1, inicio: a.p_inicio, fim: a.p_fim, timezone_series: 'America/Bahia', clinicas_autorizadas: [a.p_clinica_id], consultado_em: '2026-10-10T15:00:00Z',
    resumo: { producao: { quantidade: pontos.length, bruto: pontos.reduce((t, p) => t + p.bruto, 0), clinica_liquida: pontos.reduce((t, p) => t + p.clinica_liquida, 0) },
      repasses: { valor_repasses_pagos_periodo: vazia ? 0 : brotas ? 320 : 100, repasses_pendentes_atual: 0 },
      fiscal: { pendente: 0 }, caixa: { situacao_operacional_atual: { aguardando_aprovacao: 0, devolvido_para_correcao: 0 } }, series: pontos },
  }
}
async function iniciar(page: Page, opcoes: { perfil?: PerfilSintetico; bloquearModulo?: boolean; esperarErro?: boolean; papeis?: ('proprietaria' | 'medico' | 'recepcao')[]; interceptar?: (a: Args, route: Route) => Promise<boolean> } = {}) {
  await page.clock.setFixedTime(new Date('2026-10-10T15:00:00Z'))
  const fixture = await preparar(page, 'proprietaria', 'normal', opcoes.perfil ?? { nome: 'Pessoa Sintética', papeis: opcoes.papeis })
  const consultas: Args[] = []
  await page.route('**/rest/v1/rpc/financeiro_dashboard_proprietaria', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
    const args = route.request().postDataJSON() as Args
    consultas.push(args)
    if (opcoes.interceptar && await opcoes.interceptar(args, route)) return
    await route.fulfill({ json: resposta(args), headers: { 'access-control-allow-origin': '*' } })
  })
  if (opcoes.bloquearModulo) await page.route('**/src/components/dashboard/AnalisePeriodo.tsx*', route => route.abort())
  await page.goto('/sistema/brotas/dashboard')
  const secao = page.getByRole('region', { name: 'Análise do período', exact: true })
  if (opcoes.bloquearModulo) await expect(page.getByRole('heading', { name: 'Análise do período indisponível' })).toBeVisible()
  else await expect(secao.getByText(opcoes.esperarErro ? 'Clínica Brotas: leitura indisponível' : 'Leitura concluída', { exact: false }).first()).toBeVisible()
  return { ...fixture, consultas, secao }
}
async function comparar(page: Page) {
  const s = page.getByRole('region', { name: 'Análise do período', exact: true })
  await s.getByRole('button', { name: 'Comparar clínicas', exact: true }).click()
  await expect(s.locator('.analise-fontes')).toContainText(/Clínica Ipupiara.*Leitura concluída/s)
  return s
}

test('blocos anteriores preservados; uma leitura por fonte e valores exatos compartilhados', async ({ page }) => {
  const { secao, consultas, escritas } = await iniciar(page)
  const atual = await page.locator('.prop-moedas').textContent()
  for (const nome of ['Financeiro de hoje', 'Pendências e aprovações', 'Operação de hoje', 'Agenda resumida']) await expect(page.getByRole('heading', { name: nome, exact: true })).toBeVisible()
  await comparar(page)
  await expect(secao.locator('.analise-tabela').last()).toContainText('R$ 2.000,00')
  await expect(secao.locator('.analise-tabela').last()).toContainText('R$ 1.000,00')
  await expect(secao.locator('.analise-tabela').last()).toContainText('R$ 320,00')
  await secao.getByLabel('Período da análise').selectOption('7')
  await expect(secao.locator('.analise-intervalo')).toHaveText('04/10/2026 a 10/10/2026 · Bahia')
  await expect(secao.locator('.analise-fontes')).toContainText(/Clínica Ipupiara.*Leitura concluída/s)
  await expect(page).toHaveURL(/\/sistema\/brotas\/dashboard$/)
  expect(await page.locator('.prop-moedas').textContent()).toEqual(atual)
  const sete = consultas.filter(a => a.p_inicio.startsWith('2026-10-04'))
  expect(sete.map(a => a.p_clinica_id).sort()).toEqual(clinicas.map(c => c.id).sort())
  expect(escritas).toEqual([])
})

test('permissão por vínculo: não oferece nem consulta segunda clínica como Médico', async ({ page }) => {
  const { secao, consultas } = await iniciar(page, { papeis: ['proprietaria', 'medico'] })
  await expect(secao.getByRole('group', { name: 'Escopo da análise' }).getByRole('button')).toHaveCount(1)
  expect(consultas.every(a => a.p_clinica_id === clinicas[0].id)).toBe(true)
})

test('falha ao carregar módulo não remove os blocos existentes', async ({ page }) => {
  await iniciar(page, { bloquearModulo: true })
  await expect(page.getByRole('heading', { name: 'Financeiro de hoje', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Agenda resumida', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recarregar página', exact: true })).toBeVisible()
})

test('intervalo personalizado e métrica não modificam os indicadores de hoje', async ({ page }) => {
  const { secao, consultas } = await iniciar(page)
  await secao.getByLabel('Período da análise').selectOption('personalizado')
  await secao.getByLabel('De', { exact: true }).fill('2026-09-01')
  await secao.getByLabel('Até', { exact: true }).fill('2026-09-15')
  await secao.getByRole('button', { name: 'Aplicar período' }).click()
  await expect(secao.locator('.analise-intervalo')).toContainText('01/09/2026 a 15/09/2026')
  await expect(secao.locator('.analise-fontes')).toContainText('Leitura concluída')
  const quantidade = consultas.length
  await secao.getByLabel('Evolução de').selectOption('parcela')
  await expect(secao.getByText('Parcela líquida diária da clínica', { exact: true })).toBeVisible()
  expect(consultas.length).toBe(quantidade)
  await expect(page.getByRole('heading', { name: 'Financeiro de hoje', exact: true })).toBeVisible()
})

test('resposta antiga não substitui o período mais recente', async ({ page }) => {
  let liberar!: () => void
  const pendente = new Promise<void>(r => { liberar = r })
  const { secao } = await iniciar(page, { interceptar: async (a, route) => {
    if (!a.p_inicio.startsWith('2026-10-04')) return false
    await pendente
    await route.fulfill({ json: { ...resposta(a), consultado_em: '2026-10-04T15:00:00Z' }, headers: { 'access-control-allow-origin': '*' } })
    return true
  } })
  await secao.getByLabel('Período da análise').selectOption('7')
  await expect(secao.locator('.analise-fontes')).toContainText('Carregando')
  await secao.getByLabel('Período da análise').selectOption('30')
  await expect(secao.locator('.analise-fontes')).toContainText('Leitura concluída')
  liberar()
  await expect(secao.locator('.analise-intervalo')).toContainText('11/09/2026 a 10/10/2026')
  await expect(secao.locator('.analise-fontes')).not.toContainText('04/10/2026')
})

test('erro parcial inicial não vira zero nem comparação completa', async ({ page }) => {
  const { secao } = await iniciar(page, { interceptar: async (a, route) => {
    if (a.p_clinica_id !== clinicas[1].id) return false
    await route.fulfill({ status: 503, json: { message: 'Falha sintética' }, headers: { 'access-control-allow-origin': '*' } }); return true
  } })
  await secao.getByRole('button', { name: 'Comparar clínicas', exact: true }).click()
  await expect(secao.getByText('Comparação incompleta', { exact: true })).toBeVisible()
  await expect(secao.getByText('Clínica Ipupiara: leitura indisponível', { exact: true })).toBeVisible()
  const linha = secao.locator('.analise-tabela').last().getByRole('row').filter({ hasText: 'Clínica Ipupiara' })
  await expect(linha).toContainText('Indisponível')
  await expect(linha).not.toContainText('R$ 0,00')
  await secao.getByText('Ver valores diários exatos', { exact: true }).click()
  await expect(secao.locator('.analise-diaria')).toContainText('Leitura indisponível')
  await expect(secao.locator('.analise-diaria')).not.toContainText('Sem ponto retornado')
})

test('falha na atualização conserva a fonte anterior marcada; recusa de acesso a remove', async ({ page }) => {
  let modo: 'normal' | 'falha' | 'negado' = 'normal'
  const { secao } = await iniciar(page, { interceptar: async (a, route) => {
    if (a.p_clinica_id !== clinicas[1].id || modo === 'normal') return false
    await route.fulfill({ status: modo === 'falha' ? 503 : 403, json: { code: modo === 'negado' ? '42501' : 'XX000', message: 'Falha sintética' }, headers: { 'access-control-allow-origin': '*' } }); return true
  } })
  await comparar(page)
  modo = 'falha'
  await secao.getByRole('button', { name: 'Atualizar análise do período' }).click()
  await expect(secao.locator('.analise-fontes')).toContainText('Falha · dados desatualizados')
  await expect(secao.locator('.analise-tabela').last()).toContainText('R$ 1.000,00')
  modo = 'negado'
  await secao.getByRole('button', { name: 'Atualizar análise do período' }).click()
  await expect(secao.locator('.analise-fontes')).toContainText('Acesso recusado')
  await expect(secao.locator('.analise-tabela').last().getByRole('row').filter({ hasText: 'Clínica Ipupiara' })).not.toContainText('R$ 1.000,00')
})

test('ausência confirmada é distinta de erro e não gera pontos fictícios', async ({ page }) => {
  const { secao } = await iniciar(page, { interceptar: async (a, route) => {
    await route.fulfill({ json: resposta(a, true), headers: { 'access-control-allow-origin': '*' } }); return true
  } })
  await expect(secao.getByRole('heading', { name: 'Sem recebimentos neste período' })).toBeVisible()
  await expect(secao.locator('.analise-tabela').last()).toContainText('R$ 0,00')
  await expect(secao.locator('.recharts-line')).toHaveCount(0)
})

test('lacunas não são zero; tabela diária e tooltip preservam valores do serviço', async ({ page }) => {
  const { secao } = await iniciar(page)
  await comparar(page)
  await secao.getByText('Ver valores diários exatos', { exact: true }).click()
  await expect(secao.locator('.analise-diaria tbody tr')).toHaveCount(2)
  await expect(secao.locator('.analise-diaria')).toContainText('R$ 1.200,00')
  await expect(secao.locator('.analise-diaria')).not.toContainText('R$ 0,00')
  await secao.locator('.analise-evolucao .recharts-surface').focus()
  await page.keyboard.press('ArrowRight')
  await expect(secao.locator('.analise-tooltip')).toContainText('Sem ponto retornado')
  await page.keyboard.press('ArrowLeft')
  await expect(secao.locator('.analise-tooltip')).toBeVisible()
  await expect(secao.locator('.analise-tooltip')).toContainText('01/10/2026')
  await expect(secao.locator('.analise-tooltip')).toContainText('R$ 1.200,00')
})

for (const defeito of ['outra-clinica', 'outro-periodo', 'serie-divergente', 'sem-serie', 'dinheiro-invalido', 'dia-repetido'] as const) test(`resposta inválida recusada: ${defeito}`, async ({ page }) => {
  const { secao } = await iniciar(page, { esperarErro: true, interceptar: async (a, route) => {
    if (a.p_inicio.slice(0, 10) === new Date(Date.parse(a.p_fim) - 86400000).toISOString().slice(0, 10)) return false
    const r = resposta(a)
    if (defeito === 'outra-clinica') r.clinicas_autorizadas = [clinicas[1].id]
    if (defeito === 'outro-periodo') r.inicio = '2026-01-01T03:00:00Z'
    if (defeito === 'serie-divergente') r.resumo.series[0].bruto++
    if (defeito === 'sem-serie') Object.assign(r.resumo, { series: null })
    if (defeito === 'dinheiro-invalido') Object.assign(r.resumo.producao, { bruto: 'NaN' })
    if (defeito === 'dia-repetido') r.resumo.series[1].dia = r.resumo.series[0].dia
    await route.fulfill({ json: r, headers: { 'access-control-allow-origin': '*' } }); return true
  } })
  await expect(secao.getByText('Clínica Brotas: leitura indisponível', { exact: true })).toBeVisible()
  await expect(secao.locator('.analise-tabela').last()).not.toContainText('R$ 0,00')
})

test('limite do intervalo rejeitado sem consultar serviço', async ({ page }) => {
  const { secao, consultas } = await iniciar(page)
  const antes = consultas.length
  await secao.getByLabel('Período da análise').selectOption('personalizado')
  await secao.getByLabel('De', { exact: true }).fill('2024-01-01')
  await secao.getByLabel('Até', { exact: true }).fill('2026-10-10')
  await secao.getByRole('button', { name: 'Aplicar período' }).click()
  await expect(secao.getByText('O período financeiro não pode exceder 366 dias.', { exact: true })).toBeVisible()
  expect(consultas.length).toBe(antes)
})

test('troca da clínica operacional mantém destinos e reinicia contexto seguro', async ({ page }) => {
  await iniciar(page)
  await comparar(page)
  await page.getByRole('combobox', { name: 'Selecionar clínica', exact: true }).selectOption(clinicas[1].id)
  await expect(page).toHaveURL(/\/ipupiara\/dashboard$/)
  const s = page.getByRole('region', { name: 'Análise do período' })
  await expect(s.getByRole('button', { name: 'Ipupiara', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(s.locator('.analise-fontes')).toContainText(/Clínica Ipupiara.*Leitura concluída/s)
})

for (const tamanho of ['claro', 'escuro', 'tablet', 'celular'] as const) test(`apresentação e captura sintética: ${tamanho}`, async ({ page }) => {
  if (tamanho === 'celular') await page.setViewportSize({ width: 390, height: 844 })
  if (tamanho === 'tablet') await page.setViewportSize({ width: 820, height: 1180 })
  if (tamanho === 'escuro') await page.addInitScript(() => localStorage.setItem('clinica-patricia:tema', 'escuro'))
  const { secao } = await iniciar(page)
  await comparar(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(secao.locator('.recharts-line-curve')).toHaveCount(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const tema = await page.locator('html').getAttribute('data-theme')
  if (tamanho === 'escuro') expect(tema).toBe('escuro')
  const capturas = join(process.cwd(), 'docs/modulos/sistema/correcao-visual-dashboard-2026-10-10/funcionais')
  mkdirSync(capturas, { recursive: true })
  await page.evaluate(() => { const aviso=document.createElement('div'); aviso.textContent='Dados fictícios — teste visual'; aviso.style.cssText='position:fixed;top:0;left:40%;z-index:9999;background:#14253e;color:white;padding:4px 12px'; document.body.append(aviso) })
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({ fullPage:true, path: join(capturas, `${tamanho}-sintetico.png`) })
})

test('Recepção continua sem análise administrativa e sem consultas novas', async ({ page }) => {
  const { consultas, escritas } = await preparar(page, 'recepcao')
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.locator('.app-shell-header')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Análise do período' })).toHaveCount(0)
  expect(consultas.filter(c => c.recurso === 'financeiro_dashboard_proprietaria')).toEqual([])
  expect(escritas).toEqual([])
})

test('logout e outra conta não reutilizam os resultados da análise anterior', async ({ page }) => {
  const perfil: PerfilSintetico = { nome: 'Primeira Pessoa Sintética' }
  const { secao, escritas } = await iniciar(page, { perfil, interceptar: async (a, route) => {
    if (!perfil.segundaConta) return false
    const r = resposta(a)
    r.resumo.series[0].bruto = 9000
    r.resumo.producao.bruto = r.resumo.series.reduce((t, p) => t + p.bruto, 0)
    await route.fulfill({ json: r, headers: { 'access-control-allow-origin': '*' } }); return true
  } })
  await expect(secao.locator('.analise-resumos')).toContainText('R$ 2.000,00')
  await abrirMenu(page)
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Acessar Sistema Integrado', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Análise do período', exact: true })).toHaveCount(0)
  perfil.nome = 'Segunda Pessoa Sintética'; perfil.segundaConta = true
  await page.getByLabel('E-mail institucional ou CRM / Identificador', { exact: true }).fill('outro-login@example.invalid')
  await page.getByLabel('Senha de Acesso', { exact: true }).fill('senha-sintetica-sem-conta-real')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado', exact: true }).click()
  const nova = page.getByRole('region', { name: 'Análise do período', exact: true })
  await expect(nova.locator('.analise-resumos')).toContainText('R$ 9.800,00')
  await expect(nova.locator('.analise-resumos')).not.toContainText('R$ 2.000,00')
  expect(escritas).toEqual([])
})

test('Médico preserva a dashboard existente sem análise administrativa', async ({ page }) => {
  const { consultas, escritas } = await preparar(page, 'medico')
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.locator('.app-shell-header')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Análise do período', exact: true })).toHaveCount(0)
  expect(consultas.some(c => c.recurso === 'financeiro_dashboard_proprietaria')).toBe(false)
  expect(escritas).toEqual([])
})

test('controles compactos, rascunho não aplicado, soma exata e detalhes por teclado',async({page})=>{
  const {secao,consultas}=await iniciar(page);
  await expect(secao.getByLabel('De',{exact:true})).toHaveCount(0);
  await comparar(page);
  await expect(secao.locator('.analise-principal').nth(0)).toHaveText('R$ 3.000,00');
  await expect(secao.locator('.analise-principal').nth(1)).toHaveText('R$ 750,00');
  await expect(secao.locator('.analise-principal').nth(2)).toHaveText('R$ 420,00');
  const n=consultas.length;
  await secao.getByLabel('Período da análise').selectOption('personalizado');
  await secao.getByLabel('De',{exact:true}).fill('2026-09-01');
  expect(consultas.length).toBe(n);
  await expect(secao.locator('.analise-intervalo')).toContainText('01/10/2026');
  await secao.getByRole('button',{name:'Brotas',exact:true}).focus();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');
  await expect(secao.getByRole('button',{name:'Ipupiara',exact:true})).toHaveAttribute('aria-pressed','true');
  const detalhes=secao.locator('.analise-metodologia summary');await detalhes.focus();await page.keyboard.press('Enter');
  await expect(secao.locator('.analise-metodologia')).toHaveAttribute('open','');
});
test('total consolidado desaparece se a atualização de uma fonte falhar',async({page})=>{
  let falhar=false;const {secao}=await iniciar(page,{interceptar:async(a,route)=>{
    if(!falhar||a.p_clinica_id!==clinicas[1].id)return false;
    await route.fulfill({status:503,json:{message:'Falha sintética'},headers:{'access-control-allow-origin':'*'}});return true;
  }});await comparar(page);
  await expect(secao.locator('.analise-principal').first()).toHaveText('R$ 3.000,00');falhar=true;
  await secao.getByRole('button',{name:'Atualizar análise do período'}).click();
  await expect(secao.locator('.analise-fontes')).toContainText('Falha · dados desatualizados');
  await expect(secao.locator('.analise-principal').first()).toHaveText('Total indisponível');
  await expect(secao.locator('.analise-resumos')).toContainText('R$ 1.000,00');
});
test('bruto negativo não é ocultado ou transformado em barra positiva',async({page})=>{
  const {secao}=await iniciar(page,{interceptar:async(a,route)=>{
    const r=resposta(a);r.resumo.series.forEach(p=>p.bruto=-p.bruto);r.resumo.producao.bruto=-r.resumo.producao.bruto;
    await route.fulfill({json:r,headers:{'access-control-allow-origin':'*'}});return true;
  }});
  await expect(secao.locator('.analise-comparacao')).toContainText('Valor bruto negativo retornado');
  await expect(secao.locator('.analise-principal').first()).toContainText('-R$ 2.000,00');
  await expect(secao.locator('.analise-barras')).toHaveCount(0);
});

for (const visual of ['claro', 'escuro', 'celular'] as const) test(`agrupamento: captura ${visual}, proporção e associação`, async ({page}) => {
  if (visual === 'celular') await page.setViewportSize({width:390,height:844})
  if (visual === 'escuro') await page.addInitScript(()=>localStorage.setItem('clinica-patricia:tema','escuro'))
  const {secao,escritas}=await iniciar(page)
  await comparar(page)
  const card=secao.locator('.analise-comparacao')
  const grupos=card.locator('.analise-comparacao-valores > li')
  await expect(grupos).toHaveCount(2)
  await expect(grupos.nth(0)).toContainText('BrotasR$ 2.000,00')
  await expect(grupos.nth(1)).toContainText('IpupiaraR$ 1.000,00')
  const medidas=await grupos.evaluateAll(els=>els.map(e=>{const rotulo=e.querySelector('.analise-comparacao-rotulo')!.getBoundingClientRect();const barra=e.querySelector('.recharts-bar-rectangle path')!.getBoundingClientRect();return {rotuloY:rotulo.bottom,barraY:barra.top,x:barra.x,width:barra.width}}))
  expect(medidas[0].x).toBeCloseTo(medidas[1].x,1)
  expect(medidas[0].width/medidas[1].width).toBeCloseTo(2,2)
  for (const m of medidas) {expect(m.barraY).toBeGreaterThan(m.rotuloY);expect(m.barraY-m.rotuloY).toBeLessThan(16)}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await card.evaluate(e=>{const aviso=document.createElement('p');aviso.textContent='Dados fictícios — teste visual';aviso.style.cssText='font-size:11px;margin-bottom:12px;color:var(--analise-secundario)';e.querySelector('[data-slot="card-header"]')!.prepend(aviso)})
  const dir=join(process.cwd(),'docs/modulos/sistema/comparacao-grupos-2026-10-10');mkdirSync(dir,{recursive:true})
  await card.screenshot({path:join(dir,`${visual}.png`)})
  expect(escritas).toEqual([])
})

test('agrupamento: zero, falha e dados anteriores nunca geram barra positiva',async({page})=>{
  let modo:'zero'|'normal'|'falha'='zero'
  const {secao}=await iniciar(page,{interceptar:async(a,route)=>{
    if(a.p_clinica_id!==clinicas[1].id||modo==='normal')return false
    await route.fulfill({status:modo==='falha'?503:200,json:modo==='falha'?{message:'Falha sintética'}:resposta(a,true),headers:{'access-control-allow-origin':'*'}});return true
  }})
  await comparar(page)
  const grupo=secao.locator('.analise-comparacao-valores > li[data-clinica="ipupiara"]')
  await expect(grupo).toContainText('R$ 0,00');await expect(grupo.locator('.recharts-bar-rectangle path')).toHaveCount(0)
  modo='normal';await secao.getByRole('button',{name:'Atualizar análise do período'}).click()
  await expect(grupo.locator('.recharts-bar-rectangle path')).toHaveCount(1)
  modo='falha';await secao.getByRole('button',{name:'Atualizar análise do período'}).click()
  await expect(grupo).toContainText('Falha · dados anteriores, sem barra');await expect(grupo).toContainText('R$ 1.000,00')
  await expect(grupo.locator('.recharts-bar-rectangle path')).toHaveCount(0)
  await expect(secao.locator('.analise-principal').first()).toHaveText('Total indisponível')
})

for (const tema of ['claro','escuro','celular'] as const) test(`identidade: cores fixas, contraste e captura ${tema}`,async({page})=>{
  if(tema==='celular')await page.setViewportSize({width:390,height:844})
  if(tema==='escuro')await page.addInitScript(()=>localStorage.setItem('clinica-patricia:tema','escuro'))
  const {secao,escritas}=await iniciar(page);await comparar(page)
  const azul=tema==='escuro'?'rgb(126, 174, 255)':'rgb(50, 107, 234)',verde=tema==='escuro'?'rgb(74, 222, 128)':'rgb(21, 128, 61)'
  const conferir=async()=>{
    await expect(secao.locator('.analise-segmentos i[data-clinica="brotas"]')).toHaveCSS('background-color',azul)
    await expect(secao.locator('.analise-segmentos i[data-clinica="ipupiara"]')).toHaveCSS('background-color',verde)
    await expect(secao.locator('.analise-legenda [data-clinica="ipupiara"] span')).toHaveCSS('border-top-style','dashed')
    await expect(secao.locator('.analise-legenda [data-clinica="ipupiara"] span')).toHaveCSS('border-top-color',verde)
    await expect(secao.locator('.analise-comparacao-valores > li[data-clinica="ipupiara"] path.recharts-rectangle')).toHaveCSS('fill',verde)
    const contrastes=await secao.evaluate(e=>{
      const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number)
      const lum=(c:number[])=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
      const ratio=(a:string,b:string)=>{const x=lum(rgb(a)),y=lum(rgb(b));return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
      const fundo=getComputedStyle(e.querySelector('.analise-card')!).backgroundColor
      const marker=getComputedStyle(e.querySelector('.analise-segmentos i[data-clinica="ipupiara"]')!).backgroundColor
      return ratio(marker,fundo)
    });expect(contrastes).toBeGreaterThanOrEqual(4.5)
  };await conferir()
  await page.keyboard.press('Tab');await secao.getByRole('button',{name:'Ipupiara',exact:true}).focus();await expect(secao.getByRole('button',{name:'Ipupiara',exact:true})).toHaveCSS('outline-style','solid')
  for(const nome of ['Ipupiara','Brotas']) {await secao.getByRole('button',{name:nome,exact:true}).click();await expect(secao.locator('.analise-fontes')).toContainText('Leitura concluída');await expect(secao.locator('.analise-resumos')).toContainText(`Clínica ${nome}`)}
  await page.getByLabel('Selecionar clínica',{exact:true}).selectOption(clinicas[1].id);await expect(page).toHaveURL(/ipupiara\/dashboard$/)
  await expect(page.locator('.dashboard-identidade-clinica').first()).toHaveCSS('color',verde)
  await comparar(page);await conferir()
  const dir=join(process.cwd(),'docs/modulos/sistema/identidade-dashboard-2026-10-10');mkdirSync(dir,{recursive:true})
  await secao.evaluate(e=>{const p=document.createElement('p');p.textContent='Dados fictícios — teste visual';p.style.cssText='font-size:12px;margin-bottom:12px;color:var(--analise-secundario)';e.prepend(p)})
  await secao.screenshot({path:join(dir,`${tema}.png`)});expect(escritas).toEqual([])
})
for(const tema of ['claro','escuro'] as const)for(const unidade of ['brotas','ipupiara'] as const)test(`identidade: Recepção ${unidade} ${tema} sem análise financeira`,async({page})=>{
  if(unidade==='ipupiara')await page.setViewportSize({width:390,height:844})
  if(tema==='escuro')await page.addInitScript(()=>localStorage.setItem('clinica-patricia:tema','escuro'))
  const {consultas,escritas}=await preparar(page,'recepcao');await page.goto(`/sistema/${unidade}/dashboard`)
  await expect(page.locator('.dashboard-identidade-clinica').first()).toHaveCSS('color',unidade==='brotas'?(tema==='escuro'?'rgb(126, 174, 255)':'rgb(50, 107, 234)'):(tema==='escuro'?'rgb(74, 222, 128)':'rgb(21, 128, 61)'))
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.locator('.dashboard-identidade-clinica').first().evaluate(e=>{const p=document.createElement('p');p.textContent='Dados fictícios — teste visual';p.style.cssText='font-size:12px;margin:8px 0';e.parentElement!.prepend(p)})
  const dir=join(process.cwd(),'docs/modulos/sistema/identidade-dashboard-2026-10-10');mkdirSync(dir,{recursive:true})
  await page.screenshot({path:join(dir,`recepcao-${unidade}-${tema}.png`),fullPage:true})
  await expect(page.locator('.analise-periodo')).toHaveCount(0);expect(consultas.some(c=>c.recurso==='financeiro_dashboard_proprietaria')).toBe(false);expect(escritas).toEqual([])
})

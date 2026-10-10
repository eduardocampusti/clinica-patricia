import type { AtuacaoEquipe } from '../../src/lib/equipeAtuacao'
const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const V = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
let falha = '', atraso = false
window.addEventListener('controle-demo-atuacao', e => { const d=(e as CustomEvent).detail; falha=d.falha ?? ''; atraso=d.atraso ?? false })
const map = new Map<string, AtuacaoEquipe>()
const storage = 'equipe-atuacao-sintetica35'
try { for (const [k,v] of JSON.parse(sessionStorage.getItem(storage) ?? '[]')) map.set(k,v) } catch { /* Sintético apenas. */ }
export async function simularAtuacao(r: Request): Promise<Response | null> {
  const u=new URL(r.url)
  const api=u.pathname.split('/').pop()!
  if (!['equipe_atuacao_obter','equipe_atuacao_salvar','equipe_atuacao_horarios_salvar','disponibilidade_padrao'].includes(api)) return null
  const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json'}})
  if (atraso) await new Promise<void>(resolve=>window.addEventListener('liberar-demo-atuacao',()=>resolve(),{once:true}))
  if (falha) return json({code:falha},falha==='42501'?403:falha==='PT409'?409:503)
  if (api==='disponibilidade_padrao') {
    const clinica=u.searchParams.get('clinica_id')?.replace('eq.','')
    return json(clinica===U ? [{id:'horario-sintetico',dia_semana:1,hora_inicio:'08:00:00',hora_fim:'12:00:00'}]:[])
  }
  const b=await r.json()
  if (![U,V].includes(b.p_clinica_id)) return json({code:'42501'},403)
  if (api==='equipe_atuacao_horarios_salvar') return json(true)
  const key=b.p_membro_id+':'+b.p_clinica_id
  let d=map.get(key)
  if (!d) { d={membro_id:b.p_membro_id,profissional_id:'profissional-sintetico35',clinica_id:b.p_clinica_id,duracao_minutos:30,profissional_atualizado_em:'2026-10-06T10:00:00Z',pode_editar_duracao:true,valor_consulta:b.p_clinica_id===U?180:240,vinculo_atualizado_em:'2026-10-06T10:00:00Z',percentual_clinica:b.p_clinica_id===U?20:25,vigente_desde:'2026-09-20T10:00:00Z',vigente_ate:null,servicos_vinculados:null,catalogo:b.p_clinica_id===U?[{id:'servico-ficticio',nome:'Consulta do catálogo fictício',duracao_minutos:45,preco:200}]:[],horarios:b.p_clinica_id===U?[{dia_semana:1,hora_inicio:'08:00:00',hora_fim:'12:00:00'}]:[],excecoes:[]}; map.set(key,d) }
  if(api==='equipe_atuacao_salvar') {
    const data=new Date().toISOString()
    if(b.p_campo==='preco') { d.valor_consulta=b.p_valor; d.vinculo_atualizado_em=data }
    else { for(const v of map.values()) if(v.membro_id===d.membro_id) {v.duracao_minutos=b.p_valor;v.profissional_atualizado_em=data} d.duracao_minutos=b.p_valor; d.profissional_atualizado_em=data }
    sessionStorage.setItem(storage,JSON.stringify([...map]))
  }
  return json(d)
}

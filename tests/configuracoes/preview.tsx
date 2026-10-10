import {createRoot} from 'react-dom/client'
import {useState} from 'react'
import Configuracoes from '../../src/pages/Configuracoes'
import {ThemeProvider} from '../../src/theme/ThemeProvider'
import {ThemeToggle} from '../../src/theme/ThemeToggle'
import {instituicaoVazia,ErroConfiguracao,type ConsultaConfiguracao,type ServicoConfiguracoes} from '../../src/lib/configuracoes'
import '../../src/index.css'
const ids=['22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333']
const estados=Object.fromEntries(ids.map((escopo,n)=>[escopo,{escopo,disponivel:true,podeGeral:false,revisao:0,geralRevisao:0,geral:{},documento:{instituicao:{...instituicaoVazia(),nome:n?'Unidade B fictícia':'Unidade A fictícia',cidade:'Cidade de Exemplo'},campos:{},variacoes:{}},historico:[],empresas:[],ativos:{}} as ConsultaConfiguracao]))
// Cenário exclusivamente sintético de conflito com uma alteração externa anterior ao F5.
if(new URLSearchParams(location.search).has('conflito')) {
 const c=estados[ids[0]];c.fonteConflitante=true;c.fonteRevisao='fonte-sintetica-atual'
 c.instituicaoAtual={...c.documento.instituicao!,nome:'Nome oficial atualizado',cidade:'Cidade atualizada'}
 c.documento.campos={margem:22}
}
const servico:ServicoConfiguracoes={
 async consultar(e){return structuredClone(estados[e])},
 async salvar(e,d,r,g,a){const c=estados[e];if(c.revisao!==r||c.geralRevisao!==g)throw new ErroConfiguracao(409,'Conflito demonstrativo.');if(c.fonteConflitante&&JSON.stringify(d.instituicao)!==JSON.stringify(c.instituicaoAtual))throw new ErroConfiguracao(409,'Atualize os dados oficiais.');c.fonteConflitante=false;c.documento=structuredClone(d);c.revisao++;c.historico.unshift({revisao:c.revisao,acao:a?'aplicar':'rascunho',documento:structuredClone(d),autor:'Pessoa fictícia',instante:new Date().toISOString()});return structuredClone(c)},
 async restaurar(e,v){const c=estados[e],d=c.historico.find(h=>h.revisao===v)!.documento;c.revisao++;c.documento=structuredClone(d);c.historico.unshift({revisao:c.revisao,acao:'restaurar',documento:structuredClone(d),autor:'Pessoa fictícia',instante:new Date().toISOString()});return structuredClone(c)},
 async enviar(e,file){const path=`${e}/${crypto.randomUUID()}.${file.type==='image/png'?'png':'jpg'}`,url=URL.createObjectURL(file);estados[e].ativos[path]=url;return {caminho:path,url}},
}
function Preview(){const [id,setId]=useState(ids[0]);return <main style={{padding:'1rem',background:'var(--fundo-pagina)',minHeight:'100vh'}}><div className="cfg-contexto"><strong>Demonstração isolada · somente dados fictícios</strong><span>Operações simuladas na memória. Recarregar apaga os dados. Nenhuma conta, backend ou documento clínico real.</span><ThemeToggle/><select aria-label="Unidade fictícia" value={id} onChange={e=>{if(confirm('Trocar unidade fictícia? Alterações não salvas serão descartadas.'))setId(e.target.value)}}>{ids.map((v,n)=><option key={v} value={v}>Unidade fictícia {n?'B':'A'}</option>)}</select></div><Configuracoes key={id} clinicaId={id} clinicaNome={id===ids[0]?'Unidade A fictícia':'Unidade B fictícia'} papel="proprietaria" servico={servico}/></main>}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Preview/></ThemeProvider>)

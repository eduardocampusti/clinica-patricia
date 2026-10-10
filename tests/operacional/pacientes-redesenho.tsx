import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import Pacientes from '../../src/pages/Pacientes'
import AppShell from '../../src/components/shell/AppShell'
import type { Tela } from '../../src/components/shell/types'
import { ThemeProvider } from '../../src/theme/ThemeProvider'

if (!import.meta.env.DEV || import.meta.env.VITE_SUPABASE_URL !== 'https://operacional.synthetic.invalid') throw new Error('Prévia exige ambiente sintético isolado.')
const parametros = new URLSearchParams(location.search)
let registros = Array.from({ length: parametros.has('limite') ? 1001 : 8 }, (_, i) => ({
  id: `sintetico-${i}`, clinica_id: 'clinica-brotas', nome_completo: ['Ana Exemplo Sintético', 'Bruno Exemplo Sintético', 'Clara Exemplo Sintético', 'Pessoa Sintética de Nome Extenso para Conferência da Leitura'][i % 4] + (i > 3 ? ` ${i + 1}` : ''),
  data_nascimento: i === 2 ? null : '1992-03-14', sexo: i === 2 ? 'nao_informado' : 'feminino', telefone: i === 2 ? null : '77900000000',
  endereco: i === 2 ? null : 'Rua Sintética, 10, Centro, Cidade Modelo - BA', endereco_historico: null,
  logradouro: i === 2 ? null : 'Rua Sintética', numero: i === 2 ? null : '10', bairro: i === 2 ? null : 'Centro', cidade: i === 2 ? null : 'Cidade Modelo', uf: i === 2 ? null : 'BA', cep: null, complemento: null,
  email: null, observacoes: 'Registro exclusivamente sintético', foto_path: null, ativo: true, created_at: new Date().toISOString(), updated_at: '2026-10-01T12:00:00Z',
}))
registros = [...registros, ...registros.map(p => ({ ...p, id: `ipupiara-${p.id}`, clinica_id: 'clinica-ipupiara' }))]
if (parametros.has('sexo-legado')) registros[0].sexo = 'valor legado desconhecido'
const original = window.fetch.bind(window)
window.fetch = async (entrada, init) => {
  const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url, location.href)
  if (url.origin === location.origin || url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) return original(entrada, init)
  if (url.hostname !== 'operacional.synthetic.invalid') return new Response('{}', { status: 503 })
  const corpo = init?.body ? JSON.parse(String(init.body)) : {}
  const metodo = init?.method ?? 'GET'
  const responder = (data: unknown, status = 200, total?: number) => new Response(metodo === 'HEAD' ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...(total === undefined ? {} : { 'Content-Range': `*/${total}`, 'Access-Control-Expose-Headers': 'content-range' }) } })
  if (parametros.has('lento')) await new Promise(r => setTimeout(r, 500))
  if (url.pathname.endsWith('/pacientes')) {
    const clinicaConsulta = url.searchParams.get('clinica_id')?.replace('eq.', '')
    const daClinica = registros.filter(p => p.clinica_id === clinicaConsulta)
    if (parametros.has('erro-leitura') && url.searchParams.has('id')) return responder({ code: 'PGRST000' }, 400)
    if (metodo === 'POST') {
      if (parametros.has('erro-salvar')) return responder({ code: 'PGRST000' }, 400)
      const novo = { ...registros[0], ...corpo, id: `sintetico-novo-${registros.length}`, created_at: new Date().toISOString() }
      registros = [...registros, novo]; return responder(novo)
    }
    if (metodo === 'HEAD') return parametros.has('erro-contagem') ? responder({}, 400) : responder(null, 200, daClinica.length)
    const id = url.searchParams.get('id')?.replace('eq.', '')
    if (id) return responder(daClinica.find(p => p.id === id) ?? null)
    const busca = url.searchParams.get('nome_completo')?.replace('imatch.', '').replace(/%/g, '').toLowerCase()
    const resultado = daClinica.filter(p => !busca || p.nome_completo.toLowerCase().includes(busca))
    return responder(resultado.slice(0, 1000), 200, resultado.length)
  }
  if (url.pathname.endsWith('/rpc/paciente_cpf_pendente')) return parametros.has('erro-cpf') ? responder({ code: 'PGRST000' }, 503) : responder(String(corpo.p_paciente_id).endsWith('sintetico-2'))
  if (url.pathname.endsWith('/rpc/paciente_responsavel_legal_resumo')) return responder([])
  if (url.pathname.endsWith('/rpc/paciente_editar_administrativo')) {
    if (parametros.has('erro-salvar')) return responder({ code: 'PGRST000' }, 503)
    registros = registros.map(p => p.id === corpo.p_paciente_id && p.clinica_id === corpo.p_clinica_id ? { ...p, ...corpo.p_alteracoes, updated_at: new Date().toISOString() } : p)
    return responder(registros.find(p => p.id === corpo.p_paciente_id))
  }
  return responder(null)
}
export function Previa() {
  const [unidade, setUnidade] = useState(parametros.get('unidade') === 'ipupiara' ? 'ipupiara' : 'brotas')
  const [tela, setTela] = useState<Tela>('pacientes')
  const clinicas = [{ id: 'clinica-brotas', nome: 'Clínica Brotas', cor_primaria: '#2563eb', cor_secundaria: '#0ea5e9', cor_menu: '#172554' }, { id: 'clinica-ipupiara', nome: 'Clínica Ipupiara', cor_primaria: '#16a34a', cor_secundaria: '#0d9488', cor_menu: '#14532d' }]
  const clinica = clinicas[unidade === 'brotas' ? 0 : 1]
  const corPrimaria = clinica.cor_primaria, corSecundaria = clinica.cor_secundaria, corMenu = clinica.cor_menu
  useEffect(() => { document.documentElement.style.setProperty('--cor-primaria', corPrimaria); document.documentElement.style.setProperty('--cor-secundaria', corSecundaria); document.documentElement.style.setProperty('--cor-menu', corMenu) }, [corPrimaria, corSecundaria, corMenu])
  return <><div className="p-2 text-center text-xs" style={{ background: 'var(--fundo-card)', color: 'var(--texto-principal)' }}>PRÉVIA SINTÉTICA ISOLADA — sem banco real <button className="underline ml-3" onClick={() => setUnidade(u => u === 'brotas' ? 'ipupiara' : 'brotas')}>Trocar clínica de demonstração</button></div>
    <AppShell tela={tela} onNavegar={setTela} clinicaAtiva={clinica} clinicasDoUsuario={[clinica]} onSelecionarClinica={() => undefined} emailUsuario="sintetico@example.invalid" papel="recepcao" onSair={() => undefined}>
      {tela === 'pacientes' ? <Pacientes clinicaAtivaId={clinica.id} clinicaNome={clinica.nome} carregandoClinica={false} papel="recepcao" carregandoPapel={false} usuarioId="usuario-sintetico" onIrParaAgenda={() => setTela('agenda')} /> : <p>Somente navegação sintética; Agenda não alterada.</p>}
    </AppShell></>
}
createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider><Previa /></ThemeProvider></StrictMode>)

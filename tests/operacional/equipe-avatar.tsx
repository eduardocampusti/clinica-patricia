import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/pages/cadastros/equipe.css'
import AppShell from '../../src/components/shell/AppShell'
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider'
import { EquipeListagem } from '../../src/pages/cadastros/EquipeListagem'
import { filtrarEquipe } from '../../src/lib/equipeLista'
import type { MembroEquipe, TipoMembroEquipe } from '../../src/lib/equipe'
import type { FotoEquipeDisponivel } from '../../src/components/cadastros/EquipeAvatar'

const clinicas = [
  { id: 'clinica-a', nome: 'Clínica Brotas', cor_primaria: '#006194', cor_secundaria: '#004b73', cor_menu: '#07345d' },
  { id: 'clinica-b', nome: 'Clínica Ipupiara', cor_primaria: '#16a34a', cor_secundaria: '#15803d', cor_menu: '#14532d' },
]
const dados: MembroEquipe[] = [
  { id:'foto', nome_completo:'Ana Oliveira', cargo:'Médico(a)', tipo:'profissional_saude', profissao:'Clínica médica', email_contato:'ana@exemplo.invalid' },
  { id:'iniciais', nome_completo:'Bruno Costa', cargo:'Recepcionista', tipo:'administrativo', profissao:null, email_contato:null },
  { id:'falha', nome_completo:'Carla Almeida de Souza — nome extenso para conferir múltiplos vínculos', cargo:'Serviços gerais', tipo:'apoio', profissao:null, email_contato:null },
// Profissional de saúde com conselho/registro, para a linha secundária mostrar o e-mail de contato.
].map((m,i) => ({ ...m, telefone:null, conselho_classe:i===0?'CRM':null, registro_conselho:i===0?'00000':null, conselho_uf:i===0?'BA':null, especialidade_id:null, especialidade_nome:null, acesso_status:i===2?'sem_conta':'ativo_na_unidade', clinicas:i===2?clinicas:[clinicas[0]], revisao:1 })) as MembroEquipe[]

export function Demonstracao() {
  const [clinica,setClinica] = useState(clinicas[0])
  const [busca,setBusca] = useState('')
  const [tipo,setTipo] = useState<TipoMembroEquipe | ''>('')
  const [filtro,setFiltro] = useState('')
  const { aplicarCoresClinica } = useTheme()
  useEffect(() => aplicarCoresClinica(clinica),[clinica,aplicarCoresClinica])
  const membros = useMemo(() => dados.map((m,i) => ({...m,clinicas:i===2?clinicas:[clinica]})),[clinica])
  const divergencia = new URLSearchParams(location.search).get('divergencia')
  const fotos: Record<string,FotoEquipeDisponivel> = {
    foto:{membroId:divergencia === 'pessoa' ? 'outra-pessoa' : 'foto',clinicaId:divergencia === 'clinica' ? 'outra-clinica' : clinica.id,url:'/tests/operacional/assets/avatar-equipe-ficticio.png'},
    falha:{membroId:'falha',clinicaId:clinica.id,url:'/tests/operacional/assets/nao-existe.png'},
  }
  return <AppShell tela="equipe" onNavegar={() => undefined} clinicaAtiva={clinica} clinicasDoUsuario={clinicas} onSelecionarClinica={id => {
    setClinica(clinicas.find(c => c.id===id)!); setBusca('');setTipo('');setFiltro('')
  }} emailUsuario="demo@exemplo.invalid" papel="proprietaria" onSair={() => undefined}>
    <p style={{marginBottom:'1rem',fontSize:'.875rem'}}>Demonstração isolada: pessoas e foto inteiramente fictícias.</p>
    <EquipeListagem membros={membros} filtrados={filtrarEquipe(membros,busca,tipo,filtro)} clinicas={clinicas}
      contexto={clinica.id} clinicaAtual={clinica.nome} acessos={{}} fotos={fotos} busca={busca} tipo={tipo} clinicaFiltro={filtro}
      onBusca={setBusca} onTipo={setTipo} onClinica={setFiltro} onLimpar={() => {setBusca('');setTipo('');setFiltro('')}}
      onNovo={() => undefined} onVer={() => undefined} onEditar={() => undefined} onReconsultar={() => undefined}
      proprietaria bloqueado={false} carregando={false} indisponivel={false} semPermissao={false} />
  </AppShell>
}
createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider><Demonstracao /></ThemeProvider></StrictMode>)

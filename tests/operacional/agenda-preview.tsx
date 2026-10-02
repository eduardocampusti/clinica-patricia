import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import '../../src/index.css'
import Agenda from '../../src/pages/Agenda'
import { horaAgenda, minutosAgenda } from '../../src/lib/agendaDisponibilidade'
import AppShell from '../../src/components/shell/AppShell'
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider'
import { TITULOS_TELA, type Tela } from '../../src/components/shell/types'
import { CLINIC_BRANDS } from '../../src/config/clinicBrands'
import { caminhoInterno, lerRotaInterna, navegarPara, useCaminhoAtual } from '../../src/lib/appRoute'

// Apenas harness isolado. Nunca importado pelo aplicativo normal ou pelo build.
if (!import.meta.env.DEV || import.meta.env.VITE_SUPABASE_URL !== 'https://operacional.synthetic.invalid') throw new Error('Esta prévia exige configuração sintética isolada.')
const params = new URLSearchParams(location.search)
const unidade = lerRotaInterna()?.unidade ?? (params.get('unidade') === 'ipupiara' ? 'ipupiara' : 'brotas')
if (!lerRotaInterna()) { params.set('previa', 'agenda'); navegarPara(`${caminhoInterno(unidade, 'agenda')}?${params}`, true) }
const clinicaId = `clinica-${unidade}`
const hoje = new Date().toLocaleDateString('en-CA')
const profissionais = [
  { id: 'prof-1', nome_completo: 'Profissional Sintético — Clínica geral', duracao_consulta_minutos: 30, valor_consulta: null, especialidades: { nome: 'Clínica geral' } },
  { id: 'prof-2', nome_completo: 'Profissional Sintético — Cardiologia', duracao_consulta_minutos: 40, valor_consulta: null, especialidades: { nome: 'Cardiologia' } },
]
// ?muitos-profissionais: acima de seis, o painel usa o select em vez de cartões.
if (params.has('muitos-profissionais')) profissionais.push(...['Dermatologia', 'Pediatria', 'Ortopedia', 'Psicologia', 'Nutrição', 'Fisioterapia'].map((nome, i) => ({ id: `prof-extra-${i}`, nome_completo: `Profissional Sintético — ${nome}`, duracao_consulta_minutos: 30, valor_consulta: null, especialidades: { nome } })))
const pacientes = ['Ana Exemplo Sintético', 'Bruno Exemplo Sintético', 'Clara Exemplo Sintético', 'Davi Exemplo Sintético', 'Paciente Exemplo Sintético de Nome Muito Longo para Conferência de Leitura e Expansão'].map((nome_completo, i) => ({ id: `pac-${i}`, nome_completo }))
let registros = [
  { id: 'ag-1', profissional_id: 'prof-1', paciente_id: 'pac-1', hora_inicio: '09:00:00', hora_fim: '09:30:00', status: 'aguardando' },
  { id: 'ag-2', profissional_id: 'prof-1', paciente_id: 'pac-0', hora_inicio: '10:00:00', hora_fim: '10:30:00', status: 'confirmado' },
  { id: 'ag-3', profissional_id: 'prof-2', paciente_id: 'pac-2', hora_inicio: '16:00:00', hora_fim: '16:40:00', status: 'agendado' },
].map(a => ({ ...a, data: hoje, clinica_id: clinicaId, updated_at: '2026-10-01T10:00:00Z', observacoes: 'Registro exclusivamente sintético para conferir a interface.', pacientes: { nome_completo: pacientes.find(p => p.id === a.paciente_id)!.nome_completo } }))
if (params.has('complexa')) registros.push(...[
  { id: 'ag-4', profissional_id: 'prof-2', paciente_id: 'pac-3', hora_inicio: '09:00:00', hora_fim: '10:10:00', status: 'confirmado' },
  { id: 'ag-5', profissional_id: 'prof-1', paciente_id: 'pac-4', hora_inicio: '09:15:00', hora_fim: '10:15:00', status: 'agendado' },
  { id: 'ag-6', profissional_id: 'prof-2', paciente_id: 'pac-2', hora_inicio: '10:00:00', hora_fim: '10:20:00', status: 'confirmado' },
].map(a => ({ ...a, data: hoje, clinica_id: clinicaId, updated_at: '2026-10-01T10:00:00Z', observacoes: 'Interseção e duração exclusivamente sintéticas para visualização, não permissões de sobreposição.', pacientes: { nome_completo: pacientes.find(p => p.id === a.paciente_id)!.nome_completo } })))
if (params.has('curtas')) registros.push(...[
  { id: 'curta-15', profissional_id: 'prof-1', paciente_id: 'pac-4', hora_inicio: '10:45:00', hora_fim: '11:00:00', status: 'confirmado' },
  { id: 'curta-20', profissional_id: 'prof-2', paciente_id: 'pac-4', hora_inicio: '10:45:00', hora_fim: '11:05:00', status: 'agendado' },
].map(a => ({ ...a, data: hoje, clinica_id: clinicaId, updated_at: '2026-10-01T10:00:00Z', observacoes: 'Consulta curta exclusivamente sintética para verificar apresentação e acesso aos detalhes.', pacientes: { nome_completo: pacientes.find(p => p.id === a.paciente_id)!.nome_completo } })))
if (params.has('vazio')) registros = []
const fetchOriginal = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString())
  if (url.origin === location.origin) return fetchOriginal(input, init)
  if (url.hostname !== 'operacional.synthetic.invalid') throw new Error('Integração externa bloqueada na prévia sintética.')
  const resposta = (valor: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(valor), { status, headers: { 'Content-Type': 'application/json' } }))
  const p = init?.body ? JSON.parse(String(init.body)) : {}
  const caminho = url.pathname.split('/').at(-1)
  // Filtros de data por igualdade ou intervalo (faixa de dias); ?falha-faixa falha só a leitura por intervalo.
  const filtrosData = url.searchParams.getAll('data')
  const intervalo = filtrosData.some(f => f.startsWith('gte.'))
  const naData = (data: string) => filtrosData.every(f => f.startsWith('eq.') ? data === f.slice(3) : f.startsWith('gte.') ? data >= f.slice(4) : f.startsWith('lte.') ? data <= f.slice(4) : true)
  if (intervalo && params.has('falha-faixa')) return resposta({ code: '42501', message: 'Falha sintética da faixa de dias' }, 403)
  if (caminho === 'usuarios_clinicas') return resposta({ papel: params.get('papel') === 'medico' ? 'medico' : params.get('papel') === 'proprietaria' ? 'proprietaria' : 'recepcao' })
  if (caminho === 'profissionais_clinicas') return resposta(profissionais.map(profissionais => ({ profissionais })))
  if (caminho === 'pacientes') return resposta(pacientes)
  if (caminho === 'agenda_manual_disponivel') return resposta(true)
  if (caminho === 'paciente_cpf_pendente') return resposta(false)
  // Padrão: expediente 08–18 em todos os dias; ?terca limita à terça-feira, como o ensaio histórico do principal.
  if (caminho === 'disponibilidade_padrao') return resposta(params.has('sem-expediente') ? [] : (params.has('terca') ? [2] : [0, 1, 2, 3, 4, 5, 6]).map(dia_semana => ({ id: `disp-${dia_semana}`, profissional_id: 'prof-1', hora_inicio: '08:00:00', hora_fim: '18:00:00', dia_semana })).filter(d => (!url.searchParams.has('profissional_id') || url.searchParams.get('profissional_id') === `eq.${d.profissional_id}`) && (!url.searchParams.has('dia_semana') || url.searchParams.get('dia_semana') === `eq.${d.dia_semana}`)))
  if (caminho === 'agenda_excecoes') return params.has('falha') ? resposta({ code: '42501', message: 'Falha sintética de leitura' }, 403) : resposta((params.has('folga') ? [{ profissional_id: 'prof-2', data: hoje, tipo: 'folga', hora_inicio: null, hora_fim: null }] : []).filter(e => (!url.searchParams.has('profissional_id') || url.searchParams.get('profissional_id') === `eq.${e.profissional_id}`) && (!intervalo || naData(e.data))))
  if (caminho === 'lista_espera') return resposta([{ id: 'esp-1', paciente_id: 'pac-3', profissional_id: 'prof-2', created_at: `${hoje}T08:00:00Z`, pacientes: { nome_completo: pacientes[3].nome_completo }, profissionais: { nome_completo: profissionais[1].nome_completo } }])
  if (caminho === 'agendamentos') {
    if (init?.method === 'PATCH') {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '')
      const registro = registros.find(a => a.id === id && url.searchParams.get('clinica_id') === `eq.${clinicaId}`)
      if (!registro) return resposta(null)
      registro.status = p.status
      return resposta({ id: registro.id, status: registro.status })
    }
    return resposta(registros.filter(a => naData(a.data) && (!url.searchParams.has('profissional_id') || url.searchParams.get('profissional_id') === `eq.${a.profissional_id}`)))
  }
  if (caminho === 'agenda_manual_criar' || caminho === 'agenda_manual_corrigir_horario') {
    document.documentElement.dataset.enviosSinteticos = String(Number(document.documentElement.dataset.enviosSinteticos ?? 0) + 1)
    if (params.has('atraso')) await new Promise(resolve => setTimeout(resolve, 650))
    const anterior = registros.find(a => a.id === p.p_agendamento_id)
    const profissional = anterior?.profissional_id ?? p.p_profissional_id
    const paciente = anterior?.paciente_id ?? p.p_paciente_id
    const inicio = p.p_novo_inicio ?? p.p_inicio
    const data = p.p_nova_data ?? p.p_data
    const fim = horaAgenda(minutosAgenda(inicio) + profissionais.find(p => p.id === profissional)!.duracao_consulta_minutos)
    if (registros.some(a => a.id !== anterior?.id && a.profissional_id === profissional && a.data === data && a.hora_inicio < fim && a.hora_fim > inicio)) return resposta({ code: '23P01' }, 400)
    const novo = { ...anterior, id: anterior?.id ?? `ag-${registros.length + 1}`, clinica_id: clinicaId, profissional_id: profissional, paciente_id: paciente, data, hora_inicio: `${inicio}:00`, hora_fim: `${fim}:00`, status: anterior?.status ?? 'agendado', observacoes: anterior?.observacoes ?? p.p_observacoes, updated_at: '2026-10-01T11:00:00Z', pacientes: { nome_completo: pacientes.find(p => p.id === paciente)!.nome_completo } }
    registros = [...registros.filter(a => a.id !== novo.id), novo]
    return resposta(novo)
  }
  return resposta([])
}
export function Previa() {
  const caminho = useCaminhoAtual()
  const tela = lerRotaInterna(caminho)?.tela ?? 'agenda'
  function setTela(destino: Tela) {
    const query = new URLSearchParams(location.search)
    query.set('previa', 'agenda')
    navegarPara(`${caminhoInterno(unidade, destino)}?${query}`)
  }
  const { alternarTema, aplicarCoresClinica } = useTheme()
  const marca = CLINIC_BRANDS[unidade]
  useEffect(() => {
    aplicarCoresClinica({ cor_primaria: marca.cores.primaria, cor_secundaria: marca.cores.primariaHover, cor_menu: marca.cores.visual })
  }, [aplicarCoresClinica, marca])
  const clinica = { id: clinicaId, nome: marca.nome, cor_primaria: marca.cores.primaria, cor_secundaria: marca.cores.primariaHover, cor_menu: marca.cores.visual }
  return <AppShell tela={tela} onNavegar={setTela} clinicaAtiva={clinica} clinicasDoUsuario={[clinica]} onSelecionarClinica={() => undefined}
    emailUsuario="recepcao@exemplo.invalid" papel={params.get('papel') === 'medico' ? 'medico' : params.get('papel') === 'proprietaria' ? 'proprietaria' : 'recepcao'} onSair={() => setTela('dashboard')}>
    <div className="mb-4 flex flex-wrap justify-between gap-2 rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] p-3 text-xs"><p><strong>PRÉVIA SINTÉTICA ISOLADA</strong> · sem banco real · recarregar descarta alterações</p><button className="underline" onClick={alternarTema}>Alternar tema</button></div>
    {tela === 'agenda' ? <Agenda usuarioId="usuario-sintetico" clinicaAtiva={clinica} carregandoClinica={false} onAtendimentoIniciado={() => undefined} /> : <div className="space-y-3"><h1>{TITULOS_TELA[tela]}</h1><p>Esta demonstração isolada inclui somente a Agenda. O menu e o cabeçalho são os componentes reais; os demais módulos não foram conectados.</p><button className="underline" onClick={() => setTela('agenda')}>Voltar para Agenda</button></div>}
  </AppShell>
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Previa /></ThemeProvider>)

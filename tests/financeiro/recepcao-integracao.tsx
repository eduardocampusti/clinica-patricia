import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import AppShell from '../../src/components/shell/AppShell'
import FinanceiroModulo from '../../src/pages/FinanceiroModulo'
import Agenda from '../../src/pages/Agenda'
import { FeedbackAlert } from '../../src/components/feedback/FeedbackAlert'
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider'
import { CLINIC_BRANDS } from '../../src/config/clinicBrands'
import type { Papel } from '../../src/hooks/usePapelNaClinica'
import '../../src/index.css'

const clinicas = ['ipupiara', 'brotas'].map(slug => { const b = CLINIC_BRANDS[slug as keyof typeof CLINIC_BRANDS]; return { id: `demo-${slug}`, nome: b.nome, cor_primaria: b.cores.primaria, cor_secundaria: b.cores.primariaHover, cor_menu: b.cores.visual } })
export function Integracao() {
  const [clinicaId, setClinicaId] = useState(new URLSearchParams(location.search).get('clinica') === 'brotas' ? clinicas[1].id : clinicas[0].id)
  const [papel, setPapel] = useState<Papel>((new URLSearchParams(location.search).get('papel') as Papel) ?? 'recepcao')
  const [tela, setTela] = useState<'financeiro' | 'agenda'>('financeiro')
  const clinica = clinicas.find(c => c.id === clinicaId)!
  const { aplicarCoresClinica, alternarTema } = useTheme()
  useEffect(() => { aplicarCoresClinica(clinica) }, [clinica, aplicarCoresClinica])
  useEffect(() => {
    function trocar() { setClinicaId(id => id === clinicas[0].id ? clinicas[1].id : clinicas[0].id) }
    window.addEventListener('teste-trocar-clinica', trocar)
    return () => window.removeEventListener('teste-trocar-clinica', trocar)
  }, [])
  return <AppShell tela={tela} clinicaAtiva={clinica} clinicasDoUsuario={papel === 'proprietaria' ? clinicas : [clinica]}
    onSelecionarClinica={setClinicaId} emailUsuario="ana@exemplo.invalid" papel={papel} onSair={() => {}} onNavegar={t => { if (t === 'agenda' || t === 'financeiro') setTela(t) }}>
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--borda)] p-3"><strong className="text-sm">Teste sintético · nenhum dado real</strong>
      <button className="finance-button" onClick={alternarTema}>Alternar tema do teste</button><button className="finance-button" onClick={() => window.dispatchEvent(new Event('teste-trocar-clinica'))}>Trocar clínica do teste</button>
      <select className="cr-campo w-auto" aria-label="Perfil do teste" value={papel} onChange={e => setPapel(e.target.value as Papel)}><option value="recepcao">Recepção</option><option value="proprietaria">Proprietária</option><option value="medico">Médico</option></select>
    </div>
    {tela === 'financeiro' ? <FinanceiroModulo key={`${clinicaId}:${papel}`} clinicaAtivaId={clinicaId} clinicaNome={clinica.nome} carregandoClinica={false} usuarioId="usuario-sintetico" papel={papel} carregandoPapel={false} onReceberPagamento={() => setTela('agenda')} />
      : <><FeedbackAlert title="Receber pagamento pela Agenda" description={`Selecione o agendamento de ${clinica.nome} e use Receber pagamento nos detalhes.`} action={<button className="finance-button" onClick={() => setTela('financeiro')}>Voltar ao Caixa</button>} />
        <Agenda key={`${clinicaId}:${papel}`} clinicaAtiva={clinica} usuarioId="usuario-sintetico" carregandoClinica={false} onAtendimentoIniciado={() => {}} /></>}
  </AppShell>
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Integracao /></ThemeProvider>)

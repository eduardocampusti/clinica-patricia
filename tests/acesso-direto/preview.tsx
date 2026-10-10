import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import Equipe from '../../src/pages/cadastros/Equipe'
import { GuardaAtivacao } from '../../src/components/GuardaAtivacao'
import { CredencialTemporariaDialog } from '../../src/components/cadastros/CredencialTemporariaDialog'
import { AcessoTemporarioPainel } from '../../src/components/cadastros/AcessoTemporarioPainel'
import DefinirSenhaPessoal from '../../src/pages/DefinirSenhaPessoal'
const A = '22222222-2222-4222-8222-222222222222'
function Protegido() { useEffect(() => { document.body.dataset.moduloMontado = 'sim' }, []); return <p>Módulo administrativo sintético</p> }
function Harness() {
  const [clinica, setClinica] = useState(A), [credencial, setCredencial] = useState(true), [revisao, setRevisao] = useState(0), [concluida, setConcluida] = useState(false)
  const modo = new URLSearchParams(location.search).get('modo')
  if (modo === 'senha') return concluida ? <p>Senha definida; sessão nova confirmada.</p> : <DefinirSenhaPessoal email="titular@example.invalid" onSair={async () => {}} onConcluido={() => setConcluida(true)} />
  return <main className="min-h-screen bg-[var(--fundo-pagina)] p-4 text-[var(--texto-principal)] sm:p-8">
    <p className="mb-4 text-sm">Bancada sintética: nenhuma conta real, banco ou e-mail.</p>
    <button className="mb-4 min-h-11 rounded-lg border border-[var(--borda)] px-4" onClick={() => document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'escuro' ? 'claro' : 'escuro'}>Alternar tema</button>
    {modo === 'guard' ? <GuardaAtivacao><Protegido /></GuardaAtivacao> : modo === 'substituir' ? <AcessoTemporarioPainel key={revisao} ativacao={{ id: '44444444-4444-4444-8444-444444444444', estado: new URLSearchParams(location.search).has('reservadaExpirada') ? 'expirada' : 'pendente', fase: new URLSearchParams(location.search).has('reservadaExpirada') ? 'reservada' : 'pendente', revisao }} membroId="55555555-5555-4555-8555-555555555555" contextoId={A} onAtualizar={() => setRevisao(v => v + 1)} /> : modo === 'credencial' ? credencial && <CredencialTemporariaDialog credencial={{ operacaoId: 'ficticio', email: 'titular@example.invalid', senhaTemporaria: 'SenhaFicticiaParaTeste!927', expiraEm: '2026-10-09T22:00:00Z' }} onFechar={() => setCredencial(false)} /> : <><button className="mb-4 min-h-11 rounded-lg border border-[var(--borda)] px-4" onClick={() => setClinica('33333333-3333-4333-8333-333333333333')}>Trocar contexto sintético</button><Equipe clinicaAtivaId={clinica} souProprietaria /></>}
  </main>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>)

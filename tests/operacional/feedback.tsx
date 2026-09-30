import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import { FeedbackAlert } from '../../src/components/feedback/FeedbackAlert'
import { ConfirmacaoDialog } from '../../src/components/feedback/ConfirmacaoDialog'

export function App() {
  const [temporario, setTemporario] = useState(false)
  const [dialogo, setDialogo] = useState(false)
  const [confirmacoes, setConfirmacoes] = useState(0)
  return <main className="mx-auto grid max-w-3xl gap-4 p-6">
    <h1 className="texto-titulo-tela">Mensagens do sistema</h1>
    <FeedbackAlert variant="success" title="Alterações salvas" description="As informações foram salvas com sucesso." />
    <FeedbackAlert variant="warning" title="Ação pendente" description="Revise os dados antes de continuar." action={<button type="button">Revisar</button>} />
    <FeedbackAlert variant="destructive" title="Não foi possível salvar" description="Os dados foram preservados. Tente novamente." urgent />
    <div className="flex gap-2"><button type="button" onClick={() => setTemporario(true)}>Mostrar sucesso temporário</button><button type="button" onClick={() => setDialogo(true)}>Remover foto</button></div>
    {temporario && <FeedbackAlert variant="success" title="Foto atualizada" description="A nova foto foi salva." onClose={() => setTemporario(false)} autoDismissMs={1000} />}
    <p data-testid="confirmacoes">Confirmações: {confirmacoes}</p>
    <ConfirmacaoDialog open={dialogo} onOpenChange={setDialogo} title="Remover a foto deste paciente?" description="A foto privada será removida. Os demais dados permanecem." confirmLabel="Remover foto" onConfirm={() => setConfirmacoes((v) => v + 1)} />
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)

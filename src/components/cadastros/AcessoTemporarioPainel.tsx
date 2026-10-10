import { useRef, useState } from 'react'
import type { AcessoEquipe } from '../../lib/equipeAcessos'
import type { CredencialTemporaria } from '../../lib/acessoDiretoModelo'
import { substituirCredencialTemporaria, retomarAcessoDireto, DEPENDENCIA_ACESSO_DIRETO } from '../../lib/acessoDireto'
import { ACESSO_DIRETO_HABILITADO } from '../../config/acessoDireto'
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { CredencialTemporariaDialog } from './CredencialTemporariaDialog'
export function AcessoTemporarioPainel({ ativacao, membroId, contextoId, onAtualizar }: { ativacao: NonNullable<AcessoEquipe['ativacao']>; membroId: string; contextoId: string; onAtualizar: () => void }) {
  const [confirmar, setConfirmar] = useState(false), [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null), [credencial, setCredencial] = useState<CredencialTemporaria | null>(null)
  const chave = useRef<string | null>(null), enviando = useRef(false)
  const podeRetomar = (ativacao.fase ?? ativacao.estado) === 'reservada'
  async function executar(retomar: boolean) {
    if (enviando.current) return; enviando.current = true; setOcupado(true); setErro(null)
    chave.current ??= crypto.randomUUID()
    try {
      const c = retomar ? await retomarAcessoDireto({ membroId, clinicaContextoId: contextoId, operacaoId: ativacao.id }) : await substituirCredencialTemporaria({ membroId, clinicaContextoId: contextoId, operacaoId: ativacao.id, revisao: ativacao.revisao, chaveIdempotencia: chave.current })
      setCredencial(c); setConfirmar(false); chave.current = null
    } catch (e) { setErro(e instanceof Error ? e.message : 'Operação não confirmada. Reconsulte a ficha.') }
    finally { enviando.current = false; setOcupado(false) }
  }
  if (ativacao.estado === 'ativa') return <p className="text-sm">A senha pessoal já foi definida. Recuperação de senha mantém seu fluxo próprio.</p>
  return <section className="space-y-3" aria-label="Ativação do acesso direto">
    <FeedbackAlert variant="warning" title={ativacao.estado === 'expirada' ? 'Credencial temporária expirada' : 'Primeiro acesso pendente'} description="A conta ainda não pode acessar módulos ou dados. A senha anterior não pode ser recuperada." />
    {!ACESSO_DIRETO_HABILITADO && <p className="text-sm">{DEPENDENCIA_ACESSO_DIRETO}</p>}
    {erro && <FeedbackAlert variant="destructive" title="Operação não confirmada" description={erro} />}
    <button className="min-h-11 rounded-lg border border-[var(--borda)] px-4" disabled={ocupado || !ACESSO_DIRETO_HABILITADO} onClick={() => podeRetomar ? void executar(true) : setConfirmar(true)}>{ocupado ? 'Processando…' : podeRetomar ? 'Retomar preparação do acesso' : 'Substituir credencial temporária'}</button>
    <ConfirmacaoDialog open={confirmar} onOpenChange={v => { if (!ocupado) setConfirmar(v) }} tone="warning" title="Substituir a senha temporária?" description="A senha anterior será invalidada e as sessões antigas continuarão sem acesso. Entregue a nova credencial somente ao titular. Nenhum e-mail será enviado." confirmLabel="Substituir credencial" cancelLabel="Manter credencial" disabled={ocupado} onConfirm={() => void executar(false)} />
    {credencial && <CredencialTemporariaDialog credencial={credencial} onFechar={() => { setCredencial(null); onAtualizar() }} />}
  </section>
}

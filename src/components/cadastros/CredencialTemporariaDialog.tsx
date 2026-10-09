import { useState } from 'react'
import { ModalBase } from '../ModalBase'
import type { CredencialTemporaria } from '../../lib/acessoDiretoModelo'
export function CredencialTemporariaDialog({ credencial, onFechar }: { credencial: CredencialTemporaria; onFechar: () => void }) {
  const [mostrar, setMostrar] = useState(false)
  const [mensagem, setMensagem] = useState('')
  async function copiar() { try { await navigator.clipboard.writeText(credencial.senhaTemporaria ?? ''); setMensagem('Senha copiada. Entregue somente ao titular.') } catch { setMensagem('Não foi possível copiar. Use Mostrar senha para copiar manualmente.') } }
  return <ModalBase titulo="Acesso preparado" onFechar={onFechar} largura="md"><div className="space-y-4">
    <p className="break-all"><strong>E-mail de login:</strong> {credencial.email}</p><p>Validade: {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bahia' }).format(new Date(credencial.expiraEm))} (Bahia).</p>
    {credencial.senhaTemporaria ? <><label className="block text-sm font-medium" htmlFor="credencial-temporaria">Senha temporária individual</label><input id="credencial-temporaria" className="min-h-11 w-full rounded-lg border border-[var(--borda)] bg-transparent px-3 font-mono" readOnly autoComplete="off" type={mostrar ? 'text' : 'password'} value={credencial.senhaTemporaria} /><div className="flex flex-wrap gap-3"><button className="min-h-11 rounded-lg border border-[var(--borda)] px-3" onClick={() => setMostrar(v => !v)}>{mostrar ? 'Ocultar senha' : 'Mostrar senha'}</button><button className="min-h-11 rounded-lg border border-[var(--borda)] px-3" onClick={() => void copiar()}>Copiar senha temporária</button></div><p className="text-sm">Entregue diretamente ao titular. Nenhum e-mail foi enviado. Ao fechar, esta senha não poderá ser recuperada; uma substituição autorizada invalida a anterior.</p></> : <p>{credencial.estado === 'ativa' ? 'A senha pessoal já foi definida pelo titular. Nenhuma credencial temporária será entregue.' : 'A conta já foi preparada em outra tentativa. A senha não pode ser recuperada. Use a substituição da credencial temporária na seção de acesso da ficha.'}</p>}
    <p role="status" className="text-sm">{mensagem}</p><button className="min-h-11 rounded-lg border border-[var(--borda)] px-4" onClick={onFechar}>Concluir e fechar</button>
  </div></ModalBase>
}

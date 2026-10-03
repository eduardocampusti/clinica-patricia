import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { avaliarPreenchimento, type DadosPreenchimento } from '../../lib/pacientePreenchimento'

/** Leitura individual administrativa. Nunca consulta/descriptografa o número do CPF. */
export default function PreenchimentoCadastro({ pacienteId, clinicaId, cpfPendente, cpfErro, dadosBasicos, onVerificar }: {
  pacienteId: string; clinicaId: string; cpfPendente: boolean | null; cpfErro: boolean; dadosBasicos: DadosPreenchimento; onVerificar: () => void
}) {
  const chave = `${clinicaId}:${pacienteId}`
  const [leitura, setLeitura] = useState<{ chave: string; dados: DadosPreenchimento | null; erro: boolean } | null>(null)
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const abort = new AbortController()
    void (async () => {
      try {
        const { data, error } = await supabase.from('pacientes')
          .select('nome_completo, data_nascimento, telefone, sexo, endereco, endereco_historico, logradouro, numero, bairro, cidade, uf')
          .eq('id', pacienteId).eq('clinica_id', clinicaId).abortSignal(abort.signal).single()
        if (abort.signal.aborted) return
        setLeitura({ chave, dados: error ? null : data, erro: Boolean(error) || !data })
      } catch {
        if (!abort.signal.aborted) setLeitura({ chave, dados: null, erro: true })
      }
    })()
    return () => abort.abort()
  }, [chave, pacienteId, clinicaId, tentativa])
  const pronta = leitura?.chave === chave
  const resultado = avaliarPreenchimento(pronta && leitura.dados ? leitura.dados : dadosBasicos, cpfPendente)
  const erro = cpfErro || (pronta && leitura.erro)
  const conclusivo = pronta && !erro && resultado.conclusivo
  return <section className="pacientes-resumo-bloco pacientes-preenchimento" aria-label="Preenchimento do cadastro">
    <h4>Preenchimento do cadastro</h4>
    <p role="status">{conclusivo ? `${resultado.informados} de 6 itens informados`
      : erro ? 'Não foi possível verificar o preenchimento' : pronta && cpfPendente !== null ? 'Informação de cadastro não reconhecida' : 'Preenchimento em verificação'}</p>
    {conclusivo && <progress max={6} value={resultado.informados} aria-label={`${resultado.informados} de 6 itens informados`} />}
    {resultado.pendencias.length > 0 && <p className="pacientes-pendencias">Dados a completar: {resultado.pendencias.join(', ')}.</p>}
    <small>CPF opcional. Este indicador não impede cadastro, agendamento ou atendimento.</small>
    {erro && <button type="button" className="pacientes-link" onClick={() => { setTentativa(t => t + 1); onVerificar() }}>Verificar cadastro novamente</button>}
  </section>
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { hojeNaBahia } from '../../lib/pacienteLista'
import { IconePessoas, IconeMais } from '../shell/icons'

export default function IndicadoresPacientes({ clinicaId, revisao }: { clinicaId: string | null; revisao: number }) {
  const hoje = hojeNaBahia()
  const [resultado, setResultado] = useState<{ chave: string; ativos: number | null; novos: number | null } | null>(null)
  const chave = `${clinicaId}:${hoje}:${revisao}`
  useEffect(() => {
    if (!clinicaId) return
    const abort = new AbortController()
    const [ano, mes] = hoje.split('-').map(Number)
    // Datas civis da clínica (Bahia, UTC-03), não o fuso do navegador.
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01T00:00:00-03:00`
    const fim = `${mes === 12 ? ano + 1 : ano}-${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}-01T00:00:00-03:00`
    void Promise.allSettled([
      supabase.from('pacientes').select('id', { count: 'exact', head: true }).eq('clinica_id', clinicaId).eq('ativo', true).abortSignal(abort.signal),
      supabase.from('pacientes').select('id', { count: 'exact', head: true }).eq('clinica_id', clinicaId).gte('created_at', inicio).lt('created_at', fim).abortSignal(abort.signal),
    ]).then(respostas => {
      if (abort.signal.aborted) return
      const contar = (resposta: typeof respostas[number]) => resposta.status === 'fulfilled' && !resposta.value.error && typeof resposta.value.count === 'number' ? resposta.value.count : null
      setResultado({ chave, ativos: contar(respostas[0]), novos: contar(respostas[1]) })
    })
    return () => abort.abort()
  }, [clinicaId, chave, hoje])
  return <section className="pacientes-indicadores" aria-label="Indicadores da clínica">
    {([{ titulo: 'Pacientes ativos', apoio: 'Cadastros ativos da unidade', tipo: 'ativos', valor: resultado?.ativos, icone: <IconePessoas /> }, { titulo: 'Novos no mês', apoio: 'Cadastrados neste mês', tipo: 'novos', valor: resultado?.novos, icone: <IconeMais /> }]).map(item => <div key={item.titulo} className={`pacientes-indicador pacientes-indicador--${item.tipo}`}>
      <div><span>{item.titulo}</span><strong>{resultado?.chave !== chave ? 'Consultando…' : item.valor === null ? 'Indisponível' : item.valor}</strong><small>{item.apoio}</small></div><span aria-hidden="true">{item.icone}</span>
    </div>)}
  </section>
}

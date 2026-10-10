import type { ReactNode } from 'react'
import type { FichaCompleta } from '../../lib/equipeFicha'
import { rotuloLegivel } from '../../lib/equipeApresentacao'
import { Recolhivel } from './EquipeFichaUI'

// Linha do tempo do Histórico. Só apresentação: os mesmos eventos já recebidos pela ficha,
// agrupados por dia; nenhum evento fica inacessível.

type Evento = FichaCompleta['historico'][number]
interface Grupo { chave: string; eventos: Evento[] }

const dia = (instante: string) => new Date(instante).toLocaleDateString('pt-BR')
const hora = (instante: string) => new Date(instante).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Dias na ordem recebida; dentro do dia, eventos idênticos e consecutivos (mesmo tipo, registro e versão) ficam juntos. */
function agrupar(eventos: Evento[]): [string, Grupo[]][] {
  const dias: [string, Grupo[]][] = []
  for (const e of eventos) {
    const d = dia(e.instante)
    let atual = dias.at(-1)
    if (!atual || atual[0] !== d) { atual = [d, []]; dias.push(atual) }
    const chave = `${e.tipo}|${e.registro_id}|${e.revisao}`
    const ultimo = atual[1].at(-1)
    if (ultimo && ultimo.chave === chave) ultimo.eventos.push(e)
    else atual[1].push({ chave, eventos: [e] })
  }
  return dias
}

export function LinhaDoTempoHistorico({ eventos, consultavel, ocupado, onConsultar }: {
  eventos: Evento[]
  consultavel: (e: Evento) => boolean
  ocupado: boolean
  onConsultar: (e: Evento) => void
}) {
  const botao = (e: Evento): ReactNode => consultavel(e) ? <button type="button" className="equipe-acao-cartao" disabled={ocupado} onClick={() => onConsultar(e)}>Consultar versão {e.revisao}</button> : null
  return <ol className="equipe-linha-tempo">
    {agrupar(eventos).map(([d, grupos]) => <li key={d} className="equipe-linha-tempo-dia">
      <h4>{d}</h4>
      <ol className="equipe-ficha-historico">
        {grupos.map(g => {
          const e = g.eventos[0], descricao = `${rotuloLegivel(e.tipo)} · versão ${e.revisao} · responsável registrado`
          if (g.eventos.length === 1) return <li key={e.id} className="equipe-linha-tempo-evento"><time dateTime={e.instante}>{hora(e.instante)}</time><span>{descricao}</span>{botao(e)}</li>
          // Agrupamento só de apresentação: todos os horários continuam listados no recolhível.
          return <li key={e.id} className="equipe-linha-tempo-evento equipe-linha-tempo-grupo">
            <Recolhivel titulo={`${rotuloLegivel(e.tipo)} · versão ${e.revisao} · ${g.eventos.length} vezes`}>
              <ul>{g.eventos.map(x => <li key={x.id}><time dateTime={x.instante}>{hora(x.instante)}</time> · responsável registrado</li>)}</ul>
            </Recolhivel>
            {botao(e)}
          </li>
        })}
      </ol>
    </li>)}
  </ol>
}

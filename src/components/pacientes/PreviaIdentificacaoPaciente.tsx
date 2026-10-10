import { calcularIdade } from '../../lib/pacienteIdade'
import { hojeNaBahia } from '../../lib/pacienteLista'
import { obterIniciaisPaciente } from '../../lib/pacienteFormulario'

export default function PreviaIdentificacaoPaciente({ nome, nascimento, sexo }: { nome: string; nascimento: string; sexo: string }) {
  const idade = nascimento ? calcularIdade(nascimento, new Date(`${hojeNaBahia()}T12:00:00`)) : null
  const iniciais = obterIniciaisPaciente(nome)
  const descricaoSexo = ({ feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro' } as Record<string, string>)[sexo]
  return <div className="paciente-previa-identificacao" data-vazia={!nome.trim() && idade === null && !descricaoSexo} aria-label="Prévia da identificação na lista">
    <small>Como vai aparecer na lista</small>
    <div><span className="paciente-previa-avatar" aria-hidden="true">{iniciais || '—'}</span><span><strong>{nome.trim() || 'Nome do paciente'}</strong><small>{idade === null ? 'Idade não informada' : `${idade} anos`}{descricaoSexo ? ` · ${descricaoSexo}` : ''}</small></span></div>
  </div>
}

import type { ReactNode } from 'react'
import type { EnderecoPacienteFormulario } from '../../lib/pacienteFormulario'

export type EstadoConsultaCep = 'inicial' | 'consultando' | 'encontrado' | 'nao_encontrado' | 'erro'

interface Etapa {
  id: number
  titulo: string
  subtitulo: string
}

export function NavegacaoFormularioPaciente({
  etapaAtual,
  menor,
  onIrParaEtapa,
}: {
  etapaAtual: number
  menor: boolean
  onIrParaEtapa: (etapa: number) => void
}) {
  const etapas: Etapa[] = menor
    ? [
        { id: 1, titulo: 'Identificação', subtitulo: 'Dados do paciente' },
        { id: 2, titulo: 'Responsável legal', subtitulo: 'Vínculo do menor' },
        { id: 3, titulo: 'Endereço & Contatos', subtitulo: 'Dados de contato' },
      ]
    : [
        { id: 1, titulo: 'Identificação', subtitulo: 'Dados do paciente' },
        { id: 2, titulo: 'Endereço & Contatos', subtitulo: 'Dados de contato' },
      ]

  return (
    <nav className={`paciente-etapas ${menor ? 'com-responsavel' : ''}`} aria-label="Etapas do formulário do paciente">
      <button type="button" className={etapaAtual === 1 ? 'ativa' : etapaAtual > 1 ? 'concluida' : ''} onClick={() => onIrParaEtapa(1)}>
        <span className="paciente-etapa-numero">{etapaAtual > 1 ? '✓' : '1'}</span>
        <span><strong>1. Identificação</strong><small>Dados do paciente</small></span>
      </button>
      <span className="paciente-etapa-planejada" role="note" aria-label="Convênios — Em planejamento">
        <span className="paciente-etapa-planejada-icone" aria-hidden="true">◇</span>
        <span><strong>Convênios</strong><small>Em planejamento</small></span>
      </span>
      {etapas.slice(1).map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.titulo}
          className={etapaAtual === item.id ? 'ativa' : etapaAtual > item.id ? 'concluida' : ''}
          onClick={() => onIrParaEtapa(item.id)}
        >
          <span className="paciente-etapa-numero">{etapaAtual > item.id ? '✓' : item.id}</span>
          <span><strong>{item.id}. {item.titulo}</strong><small>{item.subtitulo}</small></span>
        </button>
      ))}
    </nav>
  )
}

export function CabecalhoSecaoPaciente({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="paciente-secao-titulo-linha">
      <h3>{titulo}</h3>
      {children ?? <span>* Campo obrigatório</span>}
    </div>
  )
}

function mensagemCep(estado: EstadoConsultaCep): string {
  if (estado === 'consultando') return 'Consultando CEP...'
  if (estado === 'encontrado') return 'Dados sugeridos pela consulta do CEP. Confira e corrija, se necessário.'
  if (estado === 'nao_encontrado') return 'CEP não encontrado. Preencha o endereço manualmente.'
  if (estado === 'erro') return 'Não foi possível consultar o CEP. Preencha manualmente.'
  return 'Ao completar o CEP, cidade e UF serão consultadas.'
}

interface CamposEnderecoProps {
  idPrefixo: string
  valor: EnderecoPacienteFormulario
  estadoCep: EstadoConsultaCep
  disabled?: boolean
  onChange: (campo: keyof EnderecoPacienteFormulario, valor: string, input?: HTMLInputElement) => void
  onBeforeInputTexto?: (campo: 'logradouro' | 'bairro' | 'cidade', input: HTMLInputElement) => void
  onCompositionStartTexto?: (campo: 'logradouro' | 'bairro' | 'cidade') => void
  onCompositionEndTexto?: (campo: 'logradouro' | 'bairro' | 'cidade', input: HTMLInputElement) => void
  onBlurTexto?: (campo: 'logradouro' | 'bairro' | 'cidade') => void
  telefone: string
  email: string
  observacoes: string
  onTelefoneChange: (input: HTMLInputElement) => void
  onEmailChange: (valor: string) => void
  onObservacoesChange: (valor: string) => void
  enderecoHistoricoReferencia?: string | null
}

export function CamposEnderecoContatosPaciente({
  idPrefixo,
  valor,
  estadoCep,
  disabled,
  onChange,
  onBeforeInputTexto,
  onCompositionStartTexto,
  onCompositionEndTexto,
  onBlurTexto,
  telefone,
  email,
  observacoes,
  onTelefoneChange,
  onEmailChange,
  onObservacoesChange,
  enderecoHistoricoReferencia,
}: CamposEnderecoProps) {
  const erroCep = estadoCep === 'nao_encontrado' || estadoCep === 'erro'
  return (
    <>
      {enderecoHistoricoReferencia?.trim() && (
        <aside className="paciente-endereco-historico" aria-label="Endereço anterior preservado">
          <strong>Endereço anterior — referência</strong>
          <p>{enderecoHistoricoReferencia}</p>
          <small>Preencha os campos abaixo sem tentar separar automaticamente este texto.</small>
        </aside>
      )}
      <fieldset className="paciente-endereco-grid">
          <legend className="paciente-legenda-visualmente-oculta">Endereço</legend>
          <div>
            <label htmlFor={`${idPrefixo}-cep`}>CEP</label>
            <input id={`${idPrefixo}-cep`} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={valor.cep} disabled={disabled} maxLength={9} aria-describedby={`${idPrefixo}-cep-status`} aria-invalid={erroCep} onChange={(event) => onChange('cep', event.target.value, event.currentTarget)} />
            <p id={`${idPrefixo}-cep-status`} role={erroCep ? 'alert' : 'status'} aria-live="polite" className={erroCep ? 'paciente-campo-erro' : 'paciente-campo-ajuda'}>{mensagemCep(estadoCep)}</p>
          </div>
          <div>
            <label htmlFor={`${idPrefixo}-logradouro`}>Rua / logradouro</label>
            <input id={`${idPrefixo}-logradouro`} autoComplete="address-line1" value={valor.logradouro} disabled={disabled} onBeforeInput={(event) => onBeforeInputTexto?.('logradouro', event.currentTarget)} onCompositionStart={() => onCompositionStartTexto?.('logradouro')} onCompositionEnd={(event) => onCompositionEndTexto?.('logradouro', event.currentTarget)} onChange={(event) => onChange('logradouro', event.target.value, event.currentTarget)} onBlur={() => onBlurTexto?.('logradouro')} />
          </div>
          <div>
            <label htmlFor={`${idPrefixo}-numero`}>Número</label>
            <input id={`${idPrefixo}-numero`} autoComplete="address-line2" value={valor.numero} disabled={disabled} onChange={(event) => onChange('numero', event.target.value)} />
          </div>
          <div>
            <label htmlFor={`${idPrefixo}-complemento`}>Complemento</label>
            <input id={`${idPrefixo}-complemento`} value={valor.complemento} disabled={disabled} onChange={(event) => onChange('complemento', event.target.value)} />
          </div>
          <div>
            <label htmlFor={`${idPrefixo}-bairro`}>Bairro</label>
            <input id={`${idPrefixo}-bairro`} value={valor.bairro} disabled={disabled} onBeforeInput={(event) => onBeforeInputTexto?.('bairro', event.currentTarget)} onCompositionStart={() => onCompositionStartTexto?.('bairro')} onCompositionEnd={(event) => onCompositionEndTexto?.('bairro', event.currentTarget)} onChange={(event) => onChange('bairro', event.target.value, event.currentTarget)} onBlur={() => onBlurTexto?.('bairro')} />
          </div>
          <div className="paciente-cidade-uf">
            <div>
              <label htmlFor={`${idPrefixo}-cidade`}>Cidade</label>
              <input id={`${idPrefixo}-cidade`} autoComplete="address-level2" value={valor.cidade} disabled={disabled} onBeforeInput={(event) => onBeforeInputTexto?.('cidade', event.currentTarget)} onCompositionStart={() => onCompositionStartTexto?.('cidade')} onCompositionEnd={(event) => onCompositionEndTexto?.('cidade', event.currentTarget)} onChange={(event) => onChange('cidade', event.target.value, event.currentTarget)} onBlur={() => onBlurTexto?.('cidade')} />
            </div>
            <div>
              <label htmlFor={`${idPrefixo}-uf`}>UF</label>
              <input id={`${idPrefixo}-uf`} autoComplete="address-level1" value={valor.uf} disabled={disabled} maxLength={2} onChange={(event) => onChange('uf', event.target.value)} />
            </div>
          </div>
      </fieldset>

      <div className="paciente-subsecao-titulo"><span aria-hidden="true">▣</span><strong>Canais de contato</strong></div>
      <div className="paciente-contato-card">
        <label htmlFor={`${idPrefixo}-telefone`}>Telefone / WhatsApp</label>
        <input id={`${idPrefixo}-telefone`} type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={telefone} disabled={disabled} maxLength={15} onChange={(event) => onTelefoneChange(event.currentTarget)} />
      </div>
      <div className="paciente-contato-card">
        <label htmlFor={`${idPrefixo}-email`}>E-mail</label>
        <input id={`${idPrefixo}-email`} type="email" autoComplete="email" value={email} disabled={disabled} onChange={(event) => onEmailChange(event.target.value)} />
      </div>
      <div className="paciente-observacoes">
        <label htmlFor={`${idPrefixo}-observacoes`}>Observações administrativas</label>
        <textarea id={`${idPrefixo}-observacoes`} rows={2} value={observacoes} disabled={disabled} onChange={(event) => onObservacoesChange(event.target.value)} />
        <small>Não utilize este campo como prontuário.</small>
      </div>
      <p className="paciente-privacidade-pendente">O cadastro não registra autorização genérica de uso dos dados. Texto, finalidade e forma de consentimento dependem de aprovação específica.</p>
    </>
  )
}

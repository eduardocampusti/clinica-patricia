import { Component, type ReactNode } from 'react'
import { FeedbackAlert } from '../feedback/FeedbackAlert'

// A falha do módulo carregado sob demanda não retira os blocos de hoje.
export default class AnalisePeriodoBoundary extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() {
    return this.state.falhou
      ? <FeedbackAlert variant="warning" title="Análise do período indisponível" description="Não foi possível carregar esta seção. Os indicadores de hoje continuam disponíveis. Recarregue a página para tentar novamente." action={<button type="button" className="prop-botao" onClick={() => window.location.reload()}>Recarregar página</button>} />
      : this.props.children
  }
}

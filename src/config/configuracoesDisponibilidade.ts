import { BACKEND_CONFIGURACOES_HABILITADO } from '../lib/configuracoes'

// Prévia local preservada; edição em produção depende da homologação do serviço.
export const CONFIGURACOES_INTERFACE_DISPONIVEL = import.meta.env.DEV || BACKEND_CONFIGURACOES_HABILITADO

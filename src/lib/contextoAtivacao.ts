import { createContext } from 'react'

// Só a guarda, após observar PASSWORD_RECOVERY e verificar a conta, fornece a prova.
// Não deriva autorização da URL, metadata editável ou armazenamento do navegador.
export const ContextoAtivacao = createContext({ recuperacaoAutorizada: false })

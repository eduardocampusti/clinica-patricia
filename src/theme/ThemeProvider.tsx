import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type ModoTema = 'claro' | 'escuro' | 'sistema'
type TemaResolvido = 'claro' | 'escuro'

export interface CoresClinica {
  cor_primaria: string
  cor_secundaria: string
  cor_menu: string
}

interface ThemeContextValue {
  modo: ModoTema
  temaResolvido: TemaResolvido
  definirModo: (modo: ModoTema) => void
  alternarTema: () => void
  aplicarCoresClinica: (cores: CoresClinica) => void
}

const CHAVE_STORAGE = 'clinica-patricia:tema'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function obterModoSalvo(): ModoTema {
  if (typeof window === 'undefined') return 'sistema'
  const salvo = window.localStorage.getItem(CHAVE_STORAGE)
  if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') return salvo
  return 'sistema'
}

function obterPreferenciaSistema(): TemaResolvido {
  if (typeof window === 'undefined') return 'claro'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

function resolverTema(modo: ModoTema): TemaResolvido {
  return modo === 'sistema' ? obterPreferenciaSistema() : modo
}

// Aplica o tema assim que o módulo é carregado, antes da primeira renderização,
// para evitar um flash do tema errado.
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', resolverTema(obterModoSalvo()))
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<ModoTema>(obterModoSalvo)
  const [temaResolvido, setTemaResolvido] = useState<TemaResolvido>(() => resolverTema(modo))

  useEffect(() => {
    const resolvido = resolverTema(modo)
    setTemaResolvido(resolvido)
    document.documentElement.setAttribute('data-theme', resolvido)
    window.localStorage.setItem(CHAVE_STORAGE, modo)
  }, [modo])

  useEffect(() => {
    if (modo !== 'sistema') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange() {
      const resolvido = obterPreferenciaSistema()
      setTemaResolvido(resolvido)
      document.documentElement.setAttribute('data-theme', resolvido)
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [modo])

  const definirModo = useCallback((novoModo: ModoTema) => {
    setModo(novoModo)
  }, [])

  const alternarTema = useCallback(() => {
    setModo((modoAtual) => (resolverTema(modoAtual) === 'claro' ? 'escuro' : 'claro'))
  }, [])

  const aplicarCoresClinica = useCallback((cores: CoresClinica) => {
    const raiz = document.documentElement.style
    raiz.setProperty('--cor-primaria', cores.cor_primaria)
    raiz.setProperty('--cor-secundaria', cores.cor_secundaria)
    raiz.setProperty('--cor-menu', cores.cor_menu)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ modo, temaResolvido, definirModo, alternarTema, aplicarCoresClinica }),
    [modo, temaResolvido, definirModo, alternarTema, aplicarCoresClinica],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider')
  }
  return context
}

import { useTheme } from './ThemeProvider'

function IconeSol() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function IconeLua() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  )
}

export function ThemeToggle() {
  const { temaResolvido, alternarTema } = useTheme()
  const escuro = temaResolvido === 'escuro'

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--borda)] bg-[var(--fundo-card)] text-[var(--texto-principal)] transition hover:bg-[var(--cor-primaria-suave)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)]"
    >
      {escuro ? <IconeSol /> : <IconeLua />}
    </button>
  )
}

import type { SVGProps } from 'react'

type IconeProps = SVGProps<SVGSVGElement>

function base(props: IconeProps) {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
}

export function IconeGrid(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function IconeCalendario(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function IconePessoas(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14a5 5 0 0 1 5.5 5" />
    </svg>
  )
}

export function IconeArquivo(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 2.5h8l5 5V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" />
      <path d="M14 2.5V8h5" />
      <path d="M8.5 13h7M8.5 17h5" />
    </svg>
  )
}

export function IconeDinheiro(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 15.5c0 1.1 1.1 2 2.5 2s2.5-.7 2.5-1.8c0-2.5-5-1.2-5-3.6 0-1.1 1.1-1.8 2.5-1.8s2.5.9 2.5 2M12 7.5v1.2M12 15.5v1.3" />
    </svg>
  )
}

export function IconeGrafico(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M2.5 20.5h19" />
    </svg>
  )
}

export function IconeEngrenagem(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.3-.9-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.75 1.7 1l.4 2.5h4l.4-2.5c.6-.25 1.2-.6 1.7-1l2.3.9 2-3.4-2-1.5z" />
    </svg>
  )
}

export function IconeCadastro(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <path d="M9 3v3h6V3M8 11h8M8 15h5" />
    </svg>
  )
}

export function IconeCadeado(props: IconeProps) {
  return (
    <svg {...base({ width: 12, height: 12, ...props })}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function IconeChevron(props: IconeProps) {
  return (
    <svg {...base({ width: 16, height: 16, strokeWidth: 2.2, ...props })}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function IconeCheck(props: IconeProps) {
  return (
    <svg {...base({ width: 15, height: 15, strokeWidth: 2.6, ...props })}>
      <path d="M5 12l4.5 4.5L19 7" />
    </svg>
  )
}

export function IconeMenuHamburguer(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export function IconeFechar(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

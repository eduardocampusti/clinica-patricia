import { useEffect, useRef, useState } from 'react'

export function IconePainel({ tipo }: { tipo: 'calendario' | 'relogio' | 'pessoa' | 'check' | 'caixa' | 'busca' | 'seta' | 'atualizar' }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {tipo === 'calendario' && <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/></>}
    {tipo === 'relogio' && <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}
    {tipo === 'pessoa' && <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>}
    {tipo === 'check' && <><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>}
    {tipo === 'caixa' && <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M7 7V3h10v4M3 12h18m-11 0v3h4v-3"/></>}
    {tipo === 'busca' && <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>}
    {tipo === 'seta' && <path d="M4 12h16m-6-6 6 6-6 6"/>}
    {tipo === 'atualizar' && <><path d="M20 7a9 9 0 0 0-16 3M4 4v6h6m-6 7a9 9 0 0 0 16-3m0 6v-6h-6"/></>}
  </svg>
}

function revelarAba(el: HTMLDivElement, indice: number) {
  const tab = el.children[indice] as HTMLElement | undefined
  if (!tab) return
  const janela = el.getBoundingClientRect(), aba = tab.getBoundingClientRect()
  if (aba.left < janela.left) el.scrollLeft += aba.left - janela.left
  else if (aba.right > janela.right) el.scrollLeft += aba.right - janela.right
}

export function AbasPainelRecepcao({ nomes, contagens, selecionada, onSelecionar, idPainel }: { nomes: readonly string[]; contagens: (number | null)[]; selecionada: number; onSelecionar: (i: number) => void; idPainel: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [bordas, setBordas] = useState({ rolavel: false, inicio: false, fim: false })
  const chaveContagens = contagens.join(',')
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => {
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0
      const larguraAbas = Array.from(el.children).reduce((total, tab) => total + (tab as HTMLElement).offsetWidth, 0) + gap * (el.children.length - 1)
      setBordas({ rolavel: larguraAbas > (el.parentElement?.clientWidth ?? el.clientWidth) + 2, inicio: el.scrollLeft > 2, fim: el.scrollWidth - el.clientWidth - el.scrollLeft > 2 })
    }
    const ajustar = () => { revelarAba(el, selecionada); medir() }
    const observer = new ResizeObserver(ajustar)
    observer.observe(el)
    if (el.parentElement) observer.observe(el.parentElement)
    ajustar()
    el.addEventListener('scroll', medir, { passive: true })
    return () => { observer.disconnect(); el.removeEventListener('scroll', medir) }
  }, [selecionada, chaveContagens])
  function selecionar(i: number, foco = false) {
    onSelecionar(i)
    if (foco) (ref.current?.children[i] as HTMLButtonElement)?.focus({ preventScroll: true })
  }
  return <div className="rp-tabs-wrap">
    <div className="rp-tabs-navegacao" data-rolavel={bordas.rolavel}>
    <button type="button" className="rp-tabs-edge" hidden={!bordas.rolavel} disabled={!bordas.inicio} aria-label="Mostrar abas anteriores" onClick={() => ref.current?.scrollBy({ left: -180 })}>‹</button>
    <div ref={ref} className="rp-tabs" role="tablist" aria-label="Situação dos agendamentos" aria-describedby={bordas.rolavel ? `${idPainel}-ajuda-abas` : undefined}>{nomes.map((nome, i) => <button type="button" key={nome} id={`${idPainel}-tab-${i}`} role="tab" aria-selected={selecionada === i} aria-controls={idPainel} tabIndex={selecionada === i ? 0 : -1} onClick={() => selecionar(i)} onFocus={() => { if (selecionada !== i) selecionar(i) }} onKeyDown={e => {
      const novo = e.key === 'ArrowRight' ? (i + 1) % nomes.length : e.key === 'ArrowLeft' ? (i + nomes.length - 1) % nomes.length : e.key === 'Home' ? 0 : e.key === 'End' ? nomes.length - 1 : -1
      if (novo >= 0) { e.preventDefault(); selecionar(novo, true) }
    }}>{nome}<span>{contagens[i] ?? '—'}</span></button>)}</div>
    <button type="button" className="rp-tabs-edge" hidden={!bordas.rolavel} disabled={!bordas.fim} aria-label="Mostrar próximas abas" onClick={() => ref.current?.scrollBy({ left: 180 })}>›</button>
    </div>
    {bordas.rolavel && <p className="rp-tabs-ajuda" id={`${idPainel}-ajuda-abas`}>Deslize as abas ou use as setas.</p>}
  </div>
}

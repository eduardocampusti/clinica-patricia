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

export function AbasPainelRecepcao({ nomes, contagens, selecionada, onSelecionar, idPainel }: { nomes: readonly string[]; contagens: (number | null)[]; selecionada: number; onSelecionar: (i: number) => void; idPainel: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [bordas, setBordas] = useState({ inicio: false, fim: false })
  const chaveContagens = contagens.join(',')
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setBordas({ inicio: el.scrollLeft > 2, fim: el.scrollWidth - el.clientWidth - el.scrollLeft > 2 })
    const observer = new ResizeObserver(medir)
    observer.observe(el); medir()
    el.addEventListener('scroll', medir, { passive: true })
    return () => { observer.disconnect(); el.removeEventListener('scroll', medir) }
  }, [])
  useEffect(() => {
    const el = ref.current, tab = el?.children[selecionada] as HTMLElement | undefined
    if (!el || !tab) return
    const margem = 20
    if (tab.offsetLeft < el.scrollLeft + margem) el.scrollLeft = Math.max(0, tab.offsetLeft - margem)
    else if (tab.offsetLeft + tab.offsetWidth > el.scrollLeft + el.clientWidth - margem) el.scrollLeft = tab.offsetLeft + tab.offsetWidth - el.clientWidth + margem
  }, [selecionada, chaveContagens])
  function selecionar(i: number, foco = false) {
    onSelecionar(i)
    if (foco) (ref.current?.children[i] as HTMLButtonElement)?.focus({ preventScroll: true })
  }
  return <div className="rp-tabs-wrap">
    {bordas.inicio && <button className="rp-tabs-edge rp-tabs-edge-start" aria-label="Mostrar abas anteriores" onClick={() => ref.current?.scrollBy({ left: -180 })}>‹</button>}
    <div ref={ref} className="rp-tabs" role="tablist" aria-label="Situação dos agendamentos">{nomes.map((nome, i) => <button key={nome} id={`${idPainel}-tab-${i}`} role="tab" aria-selected={selecionada === i} aria-controls={idPainel} tabIndex={selecionada === i ? 0 : -1} onClick={() => selecionar(i)} onFocus={() => { if (selecionada !== i) selecionar(i) }} onKeyDown={e => {
      const novo = e.key === 'ArrowRight' ? (i + 1) % nomes.length : e.key === 'ArrowLeft' ? (i + nomes.length - 1) % nomes.length : e.key === 'Home' ? 0 : e.key === 'End' ? nomes.length - 1 : -1
      if (novo >= 0) { e.preventDefault(); selecionar(novo, true) }
    }}>{nome}<span>{contagens[i] ?? '—'}</span></button>)}</div>
    {bordas.fim && <button className="rp-tabs-edge rp-tabs-edge-end" aria-label="Mostrar próximas abas" onClick={() => ref.current?.scrollBy({ left: 180 })}>›</button>}
  </div>
}

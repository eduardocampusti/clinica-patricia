import { useState } from 'react'
import type { ClinicaAtiva } from '../../hooks/useClinicaAtiva'
import type { Papel } from '../../hooks/usePapelNaClinica'
import { iniciais } from '../../lib/texto'
import { TITULOS_TELA, type Tela } from './types'
import {
  IconeCadeado,
  IconeCalendario,
  IconeCheck,
  IconeChevron,
  IconeDinheiro,
  IconeArquivo,
  IconeEquipe,
  IconeFechar,
  IconeGrid,
  IconeMais,
  IconePessoas,
} from './icons'

function SeloClinica({ nome, corLetra, tamanho }: { nome: string; corLetra: string; tamanho: number }) {
  const letra = iniciais(nome).slice(-1) || '—'
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full"
      style={{
        width: tamanho,
        height: tamanho,
        backgroundColor: 'var(--menu-avatar-bg)',
      }}
    >
      <span className="fonte-selo" style={{ color: corLetra, fontSize: Math.round(tamanho * 0.45) }}>
        {letra}
      </span>
    </div>
  )
}

const ITENS_MENU: { chave: Tela; Icone: typeof IconeGrid }[] = [
  { chave: 'dashboard', Icone: IconeGrid },
  { chave: 'agenda', Icone: IconeCalendario },
  { chave: 'pacientes', Icone: IconePessoas },
  { chave: 'prontuario', Icone: IconeArquivo },
  { chave: 'financeiro', Icone: IconeDinheiro },
  { chave: 'equipe', Icone: IconeEquipe },
]

const TELAS_POR_PAPEL: Record<Papel, readonly Tela[]> = {
  proprietaria: ['dashboard', 'agenda', 'pacientes', 'prontuario', 'financeiro', 'equipe'],
  recepcao: ['dashboard', 'agenda', 'pacientes', 'financeiro', 'equipe'],
  medico: ['dashboard', 'agenda', 'prontuario', 'financeiro'],
}

const ROTULO_PAPEL: Record<Papel, string> = {
  proprietaria: 'Visão proprietária',
  recepcao: 'Visão da recepção',
  medico: 'Visão do profissional',
}

interface SidebarProps {
  tela: Tela
  onNavegar: (tela: Tela) => void
  clinicaAtiva: ClinicaAtiva | null
  clinicasDoUsuario: ClinicaAtiva[]
  onSelecionarClinica: (id: string) => void
  papel: Papel | null
  emailUsuario: string
  aberta: boolean
  compacto: boolean
  onFechar: () => void
  onSair: () => void
}

function Sidebar({
  tela,
  onNavegar,
  clinicaAtiva,
  clinicasDoUsuario,
  onSelecionarClinica,
  papel,
  emailUsuario,
  aberta,
  compacto,
  onFechar,
  onSair,
}: SidebarProps) {
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const telasPermitidas: readonly Tela[] = papel ? TELAS_POR_PAPEL[papel] : ['dashboard']
  const itensVisiveis = ITENS_MENU.filter((item) => telasPermitidas.includes(item.chave))
  const podeTrocarClinica = clinicasDoUsuario.length > 1

  function selecionarTela(chave: Tela) {
    onNavegar(chave)
    onFechar()
  }

  function selecionarClinica(id: string) {
    onSelecionarClinica(id)
    setDropdownAberto(false)
  }

  return (
    <aside
      id="app-sidebar"
      role={compacto && aberta ? 'dialog' : undefined}
      aria-modal={compacto && aberta ? true : undefined}
      aria-label={compacto && aberta ? 'Menu principal' : undefined}
      inert={compacto && !aberta}
      className={`app-sidebar fixed inset-y-0 left-0 z-40 flex w-[240px] flex-none flex-col overflow-y-auto bg-[var(--cor-menu)] px-3 py-5 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
        aberta ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="mb-7 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--menu-avatar-bg)] text-sm font-bold text-[var(--menu-texto)]" aria-hidden="true">P</div>
        <div className="min-w-0"><p className="truncate text-[14px] font-semibold text-[var(--menu-texto)]">Clínica Patrícia</p>
          <p className="text-[11px] text-[var(--menu-texto-secundario)]">Gestão clínica</p></div>
      </div>
      <div className="relative mb-4 rounded-[11px] bg-[var(--menu-hover-bg)] p-2">
        <div className="flex items-center gap-1.5 px-2 pb-1 text-[11px] text-[var(--menu-texto-secundario)]">
          <IconeCadeado /> {papel ? ROTULO_PAPEL[papel] : 'Validando acesso'}
        </div>

        {podeTrocarClinica ? (
          <button
            type="button"
            onClick={() => setDropdownAberto((v) => !v)}
            aria-expanded={dropdownAberto}
            aria-haspopup="listbox"
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg p-2 text-left transition hover:bg-[var(--menu-hover-bg)] focus-visible:outline-2 focus-visible:outline-white"
          >
            {clinicaAtiva ? (
              <SeloClinica nome={clinicaAtiva.nome} corLetra="var(--cor-primaria)" tamanho={34} />
            ) : (
              <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[var(--menu-avatar-bg)] text-[var(--menu-texto)]">
                —
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--menu-texto)]">
                {clinicaAtiva?.nome ?? 'Sem clínica'}
              </div>
            </div>
            <IconeChevron
              className={`flex-none text-[var(--menu-texto-secundario)] transition-transform duration-200 ${
                dropdownAberto ? 'rotate-180' : ''
              }`}
            />
          </button>
        ) : (
          <div className="flex w-full items-center gap-2.5 rounded-xl p-2">
            {clinicaAtiva ? (
              <SeloClinica nome={clinicaAtiva.nome} corLetra="var(--cor-primaria)" tamanho={34} />
            ) : (
              <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[var(--menu-avatar-bg)] text-[var(--menu-texto)]">
                —
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--menu-texto)]">
                {clinicaAtiva?.nome ?? 'Sem clínica'}
              </div>
            </div>
          </div>
        )}

        {podeTrocarClinica && dropdownAberto && (
          <div className="absolute left-0 right-0 top-[calc(100%-8px)] z-20 flex flex-col gap-0.5 rounded-xl border border-[var(--menu-borda)] bg-[var(--cor-menu)] p-1.5">
            {clinicasDoUsuario.map((c) => {
              const ativa = c.id === clinicaAtiva?.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selecionarClinica(c.id)}
                  className={`flex items-center gap-2.5 rounded-lg p-2 text-left transition hover:bg-[var(--menu-hover-bg)] ${
                    ativa ? 'bg-[var(--menu-ativo-bg)]' : ''
                  }`}
                >
                  <SeloClinica nome={c.nome} corLetra={c.cor_primaria} tamanho={16} />
                  <span className="flex-1 truncate text-[13.5px] font-medium text-[var(--menu-texto)]">
                    {c.nome}
                  </span>
                  <span
                    className="flex-none text-[var(--menu-texto)]"
                    style={{ opacity: ativa ? 1 : 0 }}
                  >
                    <IconeCheck />
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {(papel === 'proprietaria' || papel === 'recepcao') && (
        <button
          type="button"
          onClick={() => selecionarTela('agenda')}
          className="mx-1 mb-6 flex min-h-11 w-[calc(100%-8px)] items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white"
          style={{ color: 'var(--cor-primaria)' }}
        >
          <IconeMais className="h-4 w-4" />
          Novo agendamento
        </button>
      )}

      <nav aria-label="Navegação principal" className="flex flex-col gap-0.5">
        <p className="px-3 pb-2 text-[11px] font-medium text-[var(--menu-texto-secundario)]">Navegação</p>
        {itensVisiveis.map(({ chave, Icone }) => {
          const ativo = tela === chave
          return (
            <button
              key={chave}
              type="button"
              onClick={() => selecionarTela(chave)}
              aria-current={ativo ? 'page' : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-[9px] py-2.5 pl-3.5 pr-3 text-sm font-medium transition hover:bg-[var(--menu-hover-bg)] focus-visible:outline-2 focus-visible:outline-white ${
                ativo ? 'bg-[var(--menu-ativo-bg)]' : ''
              }`}
            >
              <Icone
                className={ativo ? 'text-[var(--menu-texto)]' : 'text-[var(--menu-texto-secundario)]'}
              />
              <span
                className={`whitespace-nowrap ${
                  ativo ? 'text-[var(--menu-texto)]' : 'text-[var(--menu-texto-secundario)]'
                }`}
              >
                {TITULOS_TELA[chave]}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--menu-borda)] pt-3">
        <div className="mb-3 flex items-center gap-3 px-3 pt-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--menu-avatar-bg)] text-xs font-semibold text-[var(--menu-texto)]">{emailUsuario.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-[var(--menu-texto)]" title={emailUsuario}>{emailUsuario.split('@')[0]}</p><p className="text-xs text-[var(--menu-texto-secundario)]">{papel === 'proprietaria' ? 'Proprietária' : papel === 'medico' ? 'Médico' : papel === 'recepcao' ? 'Recepção' : 'Usuário'}</p></div></div>
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onSair}
            className="flex min-h-11 items-center gap-3 rounded-[10px] py-2 pl-3.5 pr-3 text-sm text-[var(--menu-texto-secundario)] transition hover:bg-[var(--menu-hover-bg)]"
          >
            <IconeFechar className="h-[18px] w-[18px]" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

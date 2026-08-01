import { useState } from 'react'
import type { ClinicaAtiva } from '../../hooks/useClinicaAtiva'
import { iniciais } from '../../lib/texto'
import { TITULOS_TELA, type Tela } from './types'
import {
  IconeCadeado,
  IconeCalendario,
  IconeCheck,
  IconeChevron,
  IconeDinheiro,
  IconeArquivo,
  IconeEngrenagem,
  IconeGrafico,
  IconeGrid,
  IconePessoas,
} from './icons'

const ITENS_MENU: { chave: Tela; Icone: typeof IconeGrid }[] = [
  { chave: 'dashboard', Icone: IconeGrid },
  { chave: 'agenda', Icone: IconeCalendario },
  { chave: 'pacientes', Icone: IconePessoas },
  { chave: 'prontuario', Icone: IconeArquivo },
  { chave: 'financeiro', Icone: IconeDinheiro },
  { chave: 'relatorios', Icone: IconeGrafico },
  { chave: 'configuracoes', Icone: IconeEngrenagem },
]

interface SidebarProps {
  tela: Tela
  onNavegar: (tela: Tela) => void
  clinicaAtiva: ClinicaAtiva | null
  clinicasDoUsuario: ClinicaAtiva[]
  onSelecionarClinica: (id: string) => void
  emailUsuario: string
  aberta: boolean
  onFechar: () => void
}

function Sidebar({
  tela,
  onNavegar,
  clinicaAtiva,
  clinicasDoUsuario,
  onSelecionarClinica,
  emailUsuario,
  aberta,
  onFechar,
}: SidebarProps) {
  const [dropdownAberto, setDropdownAberto] = useState(false)
  // Só faz sentido oferecer troca quando há mais de uma clínica vinculada —
  // com uma só, o bloco vira um display estático (comportamento de
  // funcionário comum, ver AUTH_AND_PERMISSIONS.md).
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
      className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-none flex-col overflow-y-auto bg-[var(--cor-menu)] px-4 py-7 transition-transform duration-200 lg:static lg:translate-x-0 ${
        aberta ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="relative mb-2 border-b border-[var(--menu-borda)] pb-4">
        <div className="flex items-center gap-1.5 px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-[var(--menu-texto-terciario)] uppercase">
          <IconeCadeado />
          Visão proprietária
        </div>

        {podeTrocarClinica ? (
          <button
            type="button"
            onClick={() => setDropdownAberto((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition hover:bg-[var(--menu-hover-bg)]"
          >
            <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[var(--menu-avatar-bg)] text-[15px] font-bold text-[var(--menu-texto)]">
              {clinicaAtiva ? iniciais(clinicaAtiva.nome) : '—'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--menu-texto)]">
                {clinicaAtiva?.nome ?? 'Sem clínica'}
              </div>
              <div className="text-[11.5px] text-[var(--menu-texto-secundario)]">
                Multiespecialidade
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
            <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[var(--menu-avatar-bg)] text-[15px] font-bold text-[var(--menu-texto)]">
              {clinicaAtiva ? iniciais(clinicaAtiva.nome) : '—'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--menu-texto)]">
                {clinicaAtiva?.nome ?? 'Sem clínica'}
              </div>
              <div className="text-[11.5px] text-[var(--menu-texto-secundario)]">
                Multiespecialidade
              </div>
            </div>
          </div>
        )}

        {podeTrocarClinica && dropdownAberto && (
          <div className="absolute left-0 right-0 top-[calc(100%-8px)] z-20 flex flex-col gap-0.5 rounded-xl border border-[var(--menu-borda)] bg-[var(--cor-menu)] p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
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
                  <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-[var(--menu-avatar-bg)] text-[13px] font-bold text-[var(--menu-texto)]">
                    {iniciais(c.nome)}
                  </div>
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

      <nav className="mt-3 flex flex-col gap-0.5">
        {ITENS_MENU.map(({ chave, Icone }) => {
          const ativo = tela === chave
          return (
            <button
              key={chave}
              type="button"
              onClick={() => selecionarTela(chave)}
              className={`relative flex items-center gap-3 rounded-[10px] py-2.5 pl-3.5 pr-3 text-sm font-medium transition hover:bg-[var(--menu-hover-bg)] ${
                ativo ? 'bg-[var(--menu-ativo-bg)]' : ''
              }`}
            >
              <span
                className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--menu-avatar-bg)]"
                style={{ opacity: ativo ? 1 : 0 }}
              />
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

      <div className="mt-auto flex items-center gap-2.5 border-t border-[var(--menu-borda)] pt-4 pl-2">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--menu-avatar-bg)] text-xs font-bold text-[var(--menu-texto)]">
          {iniciais(emailUsuario.split('@')[0] ?? '?')}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold text-[var(--menu-texto)]">
            {emailUsuario}
          </div>
          <div className="text-[11px] text-[var(--menu-texto-secundario)]">Usuário</div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

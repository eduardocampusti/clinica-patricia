import { useState } from 'react'
import type { ClinicaAtiva } from '../../hooks/useClinicaAtiva'
import { iniciais } from '../../lib/texto'
import { TITULOS_TELA, type Tela } from './types'
import {
  IconeAjuda,
  IconeAtendimentos,
  IconeCadeado,
  IconeCalendario,
  IconeCheck,
  IconeChevron,
  IconeDinheiro,
  IconeArquivo,
  IconeEngrenagem,
  IconeEquipe,
  IconeEspecialidades,
  IconeFechar,
  IconeGrafico,
  IconeGrid,
  IconeMais,
  IconePerfil,
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
        border: '1.5px solid var(--dourado)',
        backgroundColor: 'var(--dourado-fundo)',
        boxShadow: '0 2px 6px rgba(184, 135, 61, 0.3)',
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
  { chave: 'atendimentos', Icone: IconeAtendimentos },
  { chave: 'pacientes', Icone: IconePessoas },
  { chave: 'prontuario', Icone: IconeArquivo },
  { chave: 'financeiro', Icone: IconeDinheiro },
  { chave: 'relatorios', Icone: IconeGrafico },
  { chave: 'equipe', Icone: IconeEquipe },
  { chave: 'especialidades', Icone: IconeEspecialidades },
  { chave: 'configuracoes', Icone: IconeEngrenagem },
]

interface SidebarProps {
  tela: Tela
  onNavegar: (tela: Tela) => void
  clinicaAtiva: ClinicaAtiva | null
  clinicasDoUsuario: ClinicaAtiva[]
  onSelecionarClinica: (id: string) => void
  aberta: boolean
  onFechar: () => void
  onSair: () => void
}

function Sidebar({
  tela,
  onNavegar,
  clinicaAtiva,
  clinicasDoUsuario,
  onSelecionarClinica,
  aberta,
  onFechar,
  onSair,
}: SidebarProps) {
  const [dropdownAberto, setDropdownAberto] = useState(false)
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
            {clinicaAtiva ? (
              <SeloClinica nome={clinicaAtiva.nome} corLetra="var(--cor-primaria)" tamanho={34} />
            ) : (
              <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-[1.5px] border-[var(--dourado)] bg-[var(--dourado-fundo)] text-[var(--dourado-texto)]">
                —
              </div>
            )}
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
            {clinicaAtiva ? (
              <SeloClinica nome={clinicaAtiva.nome} corLetra="var(--cor-primaria)" tamanho={34} />
            ) : (
              <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-[1.5px] border-[var(--dourado)] bg-[var(--dourado-fundo)] text-[var(--dourado-texto)]">
                —
              </div>
            )}
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

      <button
        type="button"
        onClick={() => selecionarTela('agenda')}
        className="mx-1 mb-4 flex w-[calc(100%-8px)] items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:shadow-md"
        style={{ color: 'var(--cor-primaria)' }}
      >
        <IconeMais className="h-4 w-4" />
        Novo Agendamento
      </button>

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

      <div className="mt-auto border-t border-[var(--menu-borda)] pt-3">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            className="flex items-center gap-3 rounded-[10px] py-2 pl-3.5 pr-3 text-sm text-[var(--menu-texto-secundario)] transition hover:bg-[var(--menu-hover-bg)]"
          >
            <IconeAjuda className="h-[18px] w-[18px]" />
            <span>Ajuda</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-3 rounded-[10px] py-2 pl-3.5 pr-3 text-sm text-[var(--menu-texto-secundario)] transition hover:bg-[var(--menu-hover-bg)]"
          >
            <IconePerfil className="h-[18px] w-[18px]" />
            <span>Perfil</span>
          </button>
          <button
            type="button"
            onClick={onSair}
            className="flex items-center gap-3 rounded-[10px] py-2 pl-3.5 pr-3 text-sm text-[var(--menu-texto-secundario)] transition hover:bg-[var(--menu-hover-bg)]"
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

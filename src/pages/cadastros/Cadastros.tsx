import { useEffect, useRef, useState } from 'react'
import { usePapelNaClinica } from '../../hooks/usePapelNaClinica'
import Especialidades from './Especialidades'
import Profissionais from './Profissionais'
import Servicos from './Servicos'
import Equipe from './Equipe'

type Aba = 'equipe' | 'especialidades' | 'profissionais' | 'servicos'

const ABAS: { chave: Aba; titulo: string }[] = [
  { chave: 'equipe', titulo: 'Equipe & acessos' },
  { chave: 'especialidades', titulo: 'Especialidades' },
  { chave: 'profissionais', titulo: 'Profissionais' },
  { chave: 'servicos', titulo: 'Serviços' },
]

interface CadastrosProps {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  usuarioId: string
}

// Revela só a faixa de navegação, sem deslocar a página ou transferir o foco.
function revelarAba(botao: HTMLButtonElement) {
  const faixa = botao.parentElement
  if (!faixa) return
  const limite = faixa.getBoundingClientRect()
  const posicao = botao.getBoundingClientRect()
  const margem = 4
  if (posicao.left < limite.left + margem) faixa.scrollLeft += posicao.left - limite.left - margem
  else if (posicao.right > limite.right - margem) faixa.scrollLeft += posicao.right - limite.right + margem
}

function Cadastros({ clinicaAtivaId, carregandoClinica, usuarioId }: CadastrosProps) {
  const [aba, setAba] = useState<Aba>('equipe')
  const abaAtivaRef = useRef<HTMLButtonElement>(null)
  const [acaoCabecalho, setAcaoCabecalho] = useState<HTMLDivElement | null>(null)
  const { papel, souProprietaria } = usePapelNaClinica(usuarioId, clinicaAtivaId)
  const podeGerenciarAgenda = papel === 'proprietaria' || papel === 'recepcao'

  useEffect(() => {
    if (abaAtivaRef.current) revelarAba(abaAtivaRef.current)
  }, [aba])

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="texto-titulo-tela text-[var(--texto-principal)]">Cadastros</h1>
          <p className="text-sm text-[var(--texto-secundario)]">
            Pessoas, profissionais, especialidades e serviços das clínicas.
          </p>
        </div>
        {/* A aba ativa pode publicar aqui sua ação principal (hoje, Novo membro da Equipe). */}
        <div ref={setAcaoCabecalho} className="flex shrink-0 empty:hidden" />
      </div>

      <nav aria-label="Seções de Cadastros" className="flex min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain border-b border-[var(--borda)] p-1">
        {ABAS.map(({ chave, titulo }) => {
          const ativa = aba === chave
          return (
            <button
              key={chave}
              type="button"
              ref={ativa ? abaAtivaRef : undefined}
              aria-pressed={ativa}
              onClick={() => setAba(chave)}
              onFocus={(evento) => revelarAba(evento.currentTarget)}
              className={`relative min-h-11 shrink-0 whitespace-nowrap rounded-sm px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--cor-primaria)] ${
                ativa
                  ? 'text-[var(--cor-primaria)]'
                  : 'text-[var(--texto-secundario)] hover:text-[var(--texto-principal)]'
              }`}
            >
              {titulo}
              <span
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--cor-primaria)]"
                style={{ opacity: ativa ? 1 : 0 }}
              />
            </button>
          )
        })}
      </nav>

      {aba === 'equipe' && <Equipe key={`${usuarioId}:${clinicaAtivaId}:${souProprietaria}`} clinicaAtivaId={clinicaAtivaId} souProprietaria={souProprietaria} acaoCabecalho={acaoCabecalho} />}
      {aba === 'especialidades' && <Especialidades souProprietaria={souProprietaria} />}
      {aba === 'profissionais' && (
        <Profissionais
          clinicaAtivaId={clinicaAtivaId}
          carregandoClinica={carregandoClinica}
          souProprietaria={souProprietaria}
          podeGerenciarAgenda={podeGerenciarAgenda}
        />
      )}
      {aba === 'servicos' && (
        <Servicos
          clinicaAtivaId={clinicaAtivaId}
          carregandoClinica={carregandoClinica}
          souProprietaria={souProprietaria}
        />
      )}
    </div>
  )
}

export default Cadastros

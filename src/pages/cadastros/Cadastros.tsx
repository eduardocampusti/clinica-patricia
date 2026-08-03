import { useState } from 'react'
import { usePapelNaClinica } from '../../hooks/usePapelNaClinica'
import Especialidades from './Especialidades'
import Profissionais from './Profissionais'
import Servicos from './Servicos'

type Aba = 'especialidades' | 'profissionais' | 'servicos'

const ABAS: { chave: Aba; titulo: string }[] = [
  { chave: 'especialidades', titulo: 'Especialidades' },
  { chave: 'profissionais', titulo: 'Profissionais' },
  { chave: 'servicos', titulo: 'Serviços' },
]

interface CadastrosProps {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  usuarioId: string
}

function Cadastros({ clinicaAtivaId, carregandoClinica, usuarioId }: CadastrosProps) {
  const [aba, setAba] = useState<Aba>('especialidades')
  const { souProprietaria } = usePapelNaClinica(usuarioId, clinicaAtivaId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-normal text-[var(--texto-titulo)]">Cadastros</h1>
        <p className="text-sm text-[var(--texto-secundario)]">
          Especialidades, profissionais e serviços da clínica.
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--borda)]">
        {ABAS.map(({ chave, titulo }) => {
          const ativa = aba === chave
          return (
            <button
              key={chave}
              type="button"
              onClick={() => setAba(chave)}
              className={`relative px-4 py-2.5 text-sm font-medium transition ${
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
      </div>

      {aba === 'especialidades' && <Especialidades souProprietaria={souProprietaria} />}
      {aba === 'profissionais' && (
        <Profissionais
          clinicaAtivaId={clinicaAtivaId}
          carregandoClinica={carregandoClinica}
          souProprietaria={souProprietaria}
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

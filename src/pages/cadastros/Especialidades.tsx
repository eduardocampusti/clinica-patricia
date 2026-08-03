import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

interface Especialidade {
  id: string
  nome: string
}

interface EspecialidadesProps {
  souProprietaria: boolean
}

function Especialidades({ souProprietaria }: EspecialidadesProps) {
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroLista, setErroLista] = useState<string | null>(null)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErroLista(null)

    const { data, error } = await supabase
      .from('especialidades')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) {
      setErroLista('Não foi possível carregar as especialidades.')
      setCarregando(false)
      return
    }

    setEspecialidades(data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function abrirFormulario() {
    setNome('')
    setErroFormulario(null)
    setMostrarFormulario(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroFormulario(null)

    if (!nome.trim()) {
      setErroFormulario('Informe o nome da especialidade.')
      return
    }

    setSalvando(true)
    const { error } = await supabase.from('especialidades').insert({ nome: nome.trim() })

    if (error) {
      if (error.code === '23505') {
        setErroFormulario('Já existe uma especialidade com este nome.')
      } else {
        setErroFormulario('Não foi possível salvar a especialidade.')
      }
      setSalvando(false)
      return
    }

    setSalvando(false)
    setMostrarFormulario(false)
    await carregar()
  }

  async function desativar(id: string) {
    await supabase.from('especialidades').update({ ativo: false }).eq('id', id)
    await carregar()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--texto-secundario)]">
          Catálogo comum às 3 clínicas.
        </p>

        {souProprietaria && !mostrarFormulario && (
          <button
            type="button"
            onClick={abrirFormulario}
            className="rounded-xl bg-[var(--cor-primaria)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)]"
          >
            + Nova especialidade
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-6 shadow-[0px_1px_8px_rgba(0,0,0,0.1)]"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-normal text-[var(--texto-titulo)]">Nova especialidade</h2>
            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              className="text-sm text-[var(--texto-secundario)] transition hover:text-[var(--texto-principal)]"
            >
              Cancelar
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
              Nome <span className="text-[var(--cor-erro)]">*</span>
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={salvando}
              className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
            />
          </div>

          {erroFormulario && (
            <p
              role="alert"
              className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]"
            >
              {erroFormulario}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {salvando ? 'Salvando...' : 'Salvar especialidade'}
            </button>
          </div>
        </form>
      )}

      {!mostrarFormulario && (
        <div className="rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
          {carregando ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">Carregando...</p>
          ) : erroLista ? (
            <p className="p-8 text-center text-sm text-[var(--cor-erro)]">{erroLista}</p>
          ) : especialidades.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
              Nenhuma especialidade cadastrada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--borda)]">
              {especialidades.map((especialidade) => (
                <li
                  key={especialidade.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <span className="font-medium text-[var(--texto-principal)]">
                    {especialidade.nome}
                  </span>
                  {souProprietaria && (
                    <button
                      type="button"
                      onClick={() => desativar(especialidade.id)}
                      className="text-sm text-[var(--texto-secundario)] transition hover:text-[var(--cor-erro)]"
                    >
                      Desativar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default Especialidades

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

interface Especialidade {
  id: string
  nome: string
}

interface Servico {
  id: string
  nome: string
  especialidade_id: string
  especialidade_nome: string
  duracao_minutos: number
  preco: number
}

interface ServicoRow {
  id: string
  nome: string
  especialidade_id: string
  duracao_minutos: number
  preco: number
  especialidades: { nome: string } | { nome: string }[] | null
}

const FORM_INICIAL = {
  nome: '',
  especialidadeId: '',
  duracaoMinutos: '30',
  preco: '',
}

function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface ServicosProps {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  souProprietaria: boolean
}

function Servicos({ clinicaAtivaId, carregandoClinica, souProprietaria }: ServicosProps) {
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [erroLista, setErroLista] = useState<string | null>(null)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('especialidades')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .then(({ data }) => setEspecialidades(data ?? []))
  }, [])

  const carregarServicos = useCallback(async (clinicaId: string) => {
    setCarregandoLista(true)
    setErroLista(null)

    const { data, error } = await supabase
      .from('servicos')
      .select('id, nome, especialidade_id, duracao_minutos, preco, especialidades(nome)')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) {
      setErroLista('Não foi possível carregar os serviços.')
      setCarregandoLista(false)
      return
    }

    const linhas = (data ?? []) as ServicoRow[]
    setServicos(
      linhas.map((linha) => {
        const especialidade = Array.isArray(linha.especialidades)
          ? linha.especialidades[0]
          : linha.especialidades
        return {
          id: linha.id,
          nome: linha.nome,
          especialidade_id: linha.especialidade_id,
          especialidade_nome: especialidade?.nome ?? '—',
          duracao_minutos: linha.duracao_minutos,
          preco: linha.preco,
        }
      }),
    )
    setCarregandoLista(false)
  }, [])

  useEffect(() => {
    if (!clinicaAtivaId) {
      setServicos([])
      setCarregandoLista(false)
      return
    }
    carregarServicos(clinicaAtivaId)
  }, [clinicaAtivaId, carregarServicos])

  function abrirFormularioNovo() {
    setEditandoId(null)
    setForm(FORM_INICIAL)
    setErroFormulario(null)
    setMostrarFormulario(true)
  }

  function abrirFormularioEdicao(servico: Servico) {
    setEditandoId(servico.id)
    setForm({
      nome: servico.nome,
      especialidadeId: servico.especialidade_id,
      duracaoMinutos: String(servico.duracao_minutos),
      preco: String(servico.preco).replace('.', ','),
    })
    setErroFormulario(null)
    setMostrarFormulario(true)
  }

  function fecharFormulario() {
    setMostrarFormulario(false)
    setErroFormulario(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroFormulario(null)

    if (!clinicaAtivaId) return

    if (!form.nome.trim()) {
      setErroFormulario('Informe o nome do serviço.')
      return
    }
    if (!form.especialidadeId) {
      setErroFormulario('Selecione a especialidade.')
      return
    }

    const duracao = Number(form.duracaoMinutos)
    if (!Number.isInteger(duracao) || duracao <= 0) {
      setErroFormulario('Informe uma duração válida, em minutos.')
      return
    }

    const preco = Number(form.preco.replace(',', '.'))
    if (Number.isNaN(preco) || preco < 0) {
      setErroFormulario('Informe um preço válido.')
      return
    }

    setSalvando(true)

    const payload = {
      nome: form.nome.trim(),
      especialidade_id: form.especialidadeId,
      duracao_minutos: duracao,
      preco,
    }

    const { error } = editandoId
      ? await supabase.from('servicos').update(payload).eq('id', editandoId)
      : await supabase.from('servicos').insert({ ...payload, clinica_id: clinicaAtivaId })

    if (error) {
      setErroFormulario('Não foi possível salvar o serviço. Tente novamente.')
      setSalvando(false)
      return
    }

    setSalvando(false)
    setMostrarFormulario(false)
    await carregarServicos(clinicaAtivaId)
  }

  async function desativar(id: string) {
    if (!clinicaAtivaId) return
    await supabase.from('servicos').update({ ativo: false }).eq('id', id)
    await carregarServicos(clinicaAtivaId)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--texto-secundario)]">
          Serviços e preços praticados nesta clínica.
        </p>

        {souProprietaria && !mostrarFormulario && (
          <button
            type="button"
            onClick={abrirFormularioNovo}
            disabled={!clinicaAtivaId}
            className="rounded-xl bg-[var(--cor-primaria)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Novo serviço
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-[18px] bg-[var(--fundo-card)] p-6 sm:p-8"
          style={{ boxShadow: 'var(--sombra-neutra)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="texto-titulo-secao text-[var(--texto-principal)]">
              {editandoId ? 'Editar serviço' : 'Novo serviço'}
            </h2>
            <button
              type="button"
              onClick={fecharFormulario}
              className="text-sm text-[var(--texto-secundario)] transition hover:text-[var(--texto-principal)]"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Nome do serviço <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Especialidade <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <select
                required
                value={form.especialidadeId}
                onChange={(e) => setForm((f) => ({ ...f, especialidadeId: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              >
                <option value="">Selecione...</option>
                {especialidades.map((especialidade) => (
                  <option key={especialidade.id} value={especialidade.id}>
                    {especialidade.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Duração (minutos) <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={form.duracaoMinutos}
                onChange={(e) => setForm((f) => ({ ...f, duracaoMinutos: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Preço (R$) <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                required
                value={form.preco}
                onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>
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
              type="button"
              onClick={fecharFormulario}
              disabled={salvando}
              className="rounded-xl border border-[var(--borda)] px-4 py-2.5 font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {salvando ? 'Salvando...' : 'Salvar serviço'}
            </button>
          </div>
        </form>
      )}

      {!mostrarFormulario && (
        <div className="rounded-[18px] bg-[var(--fundo-card)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
          {carregandoClinica || carregandoLista ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">Carregando...</p>
          ) : !clinicaAtivaId ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
              Nenhuma clínica vinculada ao seu usuário.
            </p>
          ) : erroLista ? (
            <p className="p-8 text-center text-sm text-[var(--cor-erro)]">{erroLista}</p>
          ) : servicos.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
              Nenhum serviço cadastrado ainda nesta clínica.
            </p>
          ) : (
            <>
              <table className="hidden w-full text-left text-sm sm:table">
                <thead>
                  <tr className="border-b border-[var(--borda)] text-[var(--texto-secundario)]">
                    <th className="px-5 py-3 font-medium">Serviço</th>
                    <th className="px-5 py-3 font-medium">Especialidade</th>
                    <th className="px-5 py-3 font-medium">Duração</th>
                    <th className="px-5 py-3 font-medium">Preço</th>
                    {souProprietaria && <th className="px-5 py-3 font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {servicos.map((servico) => (
                    <tr
                      key={servico.id}
                      className="border-b border-[var(--borda)] text-[var(--texto-principal)] last:border-0"
                    >
                      <td className="px-5 py-3 font-medium">{servico.nome}</td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">
                        {servico.especialidade_nome}
                      </td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">
                        {servico.duracao_minutos} min
                      </td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">
                        {formatarPreco(servico.preco)}
                      </td>
                      {souProprietaria && (
                        <td className="px-5 py-3">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => abrirFormularioEdicao(servico)}
                              className="text-[var(--cor-primaria)] transition hover:opacity-80"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => desativar(servico.id)}
                              className="text-[var(--texto-secundario)] transition hover:text-[var(--cor-erro)]"
                            >
                              Desativar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-[var(--borda)] sm:hidden">
                {servicos.map((servico) => (
                  <li key={servico.id} className="space-y-1 p-4">
                    <p className="font-medium text-[var(--texto-principal)]">{servico.nome}</p>
                    <p className="text-sm text-[var(--texto-secundario)]">
                      {servico.especialidade_nome} · {servico.duracao_minutos} min ·{' '}
                      {formatarPreco(servico.preco)}
                    </p>
                    {souProprietaria && (
                      <div className="flex gap-4 pt-1 text-sm">
                        <button
                          type="button"
                          onClick={() => abrirFormularioEdicao(servico)}
                          className="text-[var(--cor-primaria)]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => desativar(servico.id)}
                          className="text-[var(--texto-secundario)]"
                        >
                          Desativar
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Servicos

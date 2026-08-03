import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { apenasDigitos, cpfValido, formatarCpf } from '../../lib/cpf'

interface Especialidade {
  id: string
  nome: string
}

interface Profissional {
  id: string
  nome_completo: string
  conselho_classe: string | null
  registro_conselho: string | null
  especialidade_nome: string
}

interface VinculoRow {
  ativo: boolean
  profissionais:
    | {
        id: string
        nome_completo: string
        conselho_classe: string | null
        registro_conselho: string | null
        especialidades: { nome: string } | { nome: string }[] | null
      }
    | {
        id: string
        nome_completo: string
        conselho_classe: string | null
        registro_conselho: string | null
        especialidades: { nome: string } | { nome: string }[] | null
      }[]
    | null
}

interface ProfissionalDisponivel {
  id: string
  nome_completo: string
  clinicas_vinculadas: string[]
}

const FORM_INICIAL = {
  nomeCompleto: '',
  cpf: '',
  conselhoClasse: '',
  registroConselho: '',
  especialidadePrincipalId: '',
}

function extrairEspecialidadeNome(
  valor: { nome: string } | { nome: string }[] | null,
): string {
  const item = Array.isArray(valor) ? valor[0] : valor
  return item?.nome ?? '—'
}

function extrairProfissional(linha: VinculoRow) {
  return Array.isArray(linha.profissionais) ? linha.profissionais[0] : linha.profissionais
}

interface ProfissionaisProps {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  souProprietaria: boolean
}

function Profissionais({ clinicaAtivaId, carregandoClinica, souProprietaria }: ProfissionaisProps) {
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [erroLista, setErroLista] = useState<string | null>(null)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)

  const [disponiveis, setDisponiveis] = useState<ProfissionalDisponivel[]>([])
  const [vinculandoId, setVinculandoId] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [erroVinculo, setErroVinculo] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('especialidades')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .then(({ data }) => setEspecialidades(data ?? []))
  }, [])

  const carregarProfissionais = useCallback(async (clinicaId: string) => {
    setCarregandoLista(true)
    setErroLista(null)

    const { data, error } = await supabase
      .from('profissionais_clinicas')
      .select(
        'ativo, profissionais(id, nome_completo, conselho_classe, registro_conselho, especialidades(nome))',
      )
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)

    if (error) {
      setErroLista('Não foi possível carregar os profissionais.')
      setCarregandoLista(false)
      return
    }

    const linhas = (data ?? []) as unknown as VinculoRow[]
    const lista = linhas
      .map((linha) => extrairProfissional(linha))
      .filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined)
      .map((p) => ({
        id: p.id,
        nome_completo: p.nome_completo,
        conselho_classe: p.conselho_classe,
        registro_conselho: p.registro_conselho,
        especialidade_nome: extrairEspecialidadeNome(p.especialidades),
      }))
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo))

    setProfissionais(lista)
    setCarregandoLista(false)
  }, [])

  const carregarDisponiveis = useCallback(async (clinicaId: string) => {
    const { data } = await supabase
      .from('profissionais')
      .select('id, nome_completo, profissionais_clinicas(clinica_id)')
      .eq('ativo', true)

    const linhas = (data ?? []) as unknown as {
      id: string
      nome_completo: string
      profissionais_clinicas: { clinica_id: string }[] | null
    }[]

    const semVinculoNestaClinica = linhas
      .filter((p) => !(p.profissionais_clinicas ?? []).some((v) => v.clinica_id === clinicaId))
      .map((p) => ({
        id: p.id,
        nome_completo: p.nome_completo,
        clinicas_vinculadas: (p.profissionais_clinicas ?? []).map((v) => v.clinica_id),
      }))
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo))

    setDisponiveis(semVinculoNestaClinica)
  }, [])

  useEffect(() => {
    if (!clinicaAtivaId) {
      setProfissionais([])
      setDisponiveis([])
      setCarregandoLista(false)
      return
    }
    carregarProfissionais(clinicaAtivaId)
    if (souProprietaria) carregarDisponiveis(clinicaAtivaId)
  }, [clinicaAtivaId, souProprietaria, carregarProfissionais, carregarDisponiveis])

  function abrirFormulario() {
    setForm(FORM_INICIAL)
    setErroFormulario(null)
    setMostrarFormulario(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroFormulario(null)

    if (!clinicaAtivaId) return

    if (!form.nomeCompleto.trim()) {
      setErroFormulario('Informe o nome completo do profissional.')
      return
    }
    if (!cpfValido(form.cpf)) {
      setErroFormulario('Informe um CPF válido, com 11 dígitos.')
      return
    }
    if (Boolean(form.conselhoClasse.trim()) !== Boolean(form.registroConselho.trim())) {
      setErroFormulario('Informe o conselho de classe e o número de registro juntos, ou deixe os dois em branco.')
      return
    }
    if (!form.especialidadePrincipalId) {
      setErroFormulario('Selecione a especialidade principal.')
      return
    }

    setSalvando(true)

    const { error } = await supabase.rpc('cadastrar_profissional', {
      p_nome_completo: form.nomeCompleto.trim(),
      p_cpf: apenasDigitos(form.cpf),
      p_conselho_classe: form.conselhoClasse.trim() || null,
      p_registro_conselho: form.registroConselho.trim() || null,
      p_especialidade_principal_id: form.especialidadePrincipalId,
      p_clinica_id: clinicaAtivaId,
    })

    if (error) {
      if (error.code === '23505') {
        setErroFormulario('Já existe um profissional cadastrado com este CPF ou registro de conselho.')
      } else {
        setErroFormulario('Não foi possível salvar o profissional. Tente novamente.')
      }
      setSalvando(false)
      return
    }

    setSalvando(false)
    setMostrarFormulario(false)
    await Promise.all([carregarProfissionais(clinicaAtivaId), carregarDisponiveis(clinicaAtivaId)])
  }

  async function vincularExistente() {
    if (!clinicaAtivaId || !vinculandoId) return
    setVinculando(true)
    setErroVinculo(null)

    const { error } = await supabase
      .from('profissionais_clinicas')
      .insert({ profissional_id: vinculandoId, clinica_id: clinicaAtivaId })

    if (error) {
      setErroVinculo('Não foi possível vincular este profissional à clínica.')
      setVinculando(false)
      return
    }

    setVinculando(false)
    setVinculandoId('')
    await Promise.all([carregarProfissionais(clinicaAtivaId), carregarDisponiveis(clinicaAtivaId)])
  }

  async function desativarVinculo(profissionalId: string) {
    if (!clinicaAtivaId) return
    await supabase
      .from('profissionais_clinicas')
      .update({ ativo: false })
      .eq('profissional_id', profissionalId)
      .eq('clinica_id', clinicaAtivaId)
    await Promise.all([carregarProfissionais(clinicaAtivaId), carregarDisponiveis(clinicaAtivaId)])
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--texto-secundario)]">
          Profissionais que atendem nesta clínica.
        </p>

        {souProprietaria && !mostrarFormulario && (
          <button
            type="button"
            onClick={abrirFormulario}
            disabled={!clinicaAtivaId}
            className="rounded-xl bg-[var(--cor-primaria)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Novo profissional
          </button>
        )}
      </div>

      {souProprietaria && !mostrarFormulario && disponiveis.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-4 shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
          <span className="text-sm font-medium text-[var(--texto-principal)]">
            Vincular profissional já cadastrado em outra clínica:
          </span>
          <select
            value={vinculandoId}
            onChange={(e) => setVinculandoId(e.target.value)}
            disabled={vinculando}
            className="min-w-[220px] flex-1 rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2 text-sm text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)]"
          >
            <option value="">Selecione...</option>
            {disponiveis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome_completo}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={vincularExistente}
            disabled={!vinculandoId || vinculando}
            className="rounded-xl border border-[var(--cor-primaria)] px-4 py-2 text-sm font-medium text-[var(--cor-primaria)] transition hover:bg-[var(--cor-primaria-suave)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {vinculando ? 'Vinculando...' : 'Vincular'}
          </button>
          {erroVinculo && <p className="w-full text-sm text-[var(--cor-erro)]">{erroVinculo}</p>}
        </div>
      )}

      {mostrarFormulario && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-6 shadow-[0px_1px_8px_rgba(0,0,0,0.1)] sm:p-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-normal text-[var(--texto-titulo)]">Novo profissional</h2>
            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              className="text-sm text-[var(--texto-secundario)] transition hover:text-[var(--texto-principal)]"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Nome completo <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <input
                type="text"
                required
                value={form.nomeCompleto}
                onChange={(e) => setForm((f) => ({ ...f, nomeCompleto: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                CPF <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="000.000.000-00"
                maxLength={14}
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: formatarCpf(e.target.value) }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Especialidade principal <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <select
                required
                value={form.especialidadePrincipalId}
                onChange={(e) => setForm((f) => ({ ...f, especialidadePrincipalId: e.target.value }))}
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
                Conselho de classe
              </label>
              <input
                type="text"
                placeholder="CRM, CRP, CRN..."
                value={form.conselhoClasse}
                onChange={(e) => setForm((f) => ({ ...f, conselhoClasse: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Número de registro
              </label>
              <input
                type="text"
                value={form.registroConselho}
                onChange={(e) => setForm((f) => ({ ...f, registroConselho: e.target.value }))}
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
              onClick={() => setMostrarFormulario(false)}
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
              {salvando ? 'Salvando...' : 'Salvar profissional'}
            </button>
          </div>
        </form>
      )}

      {!mostrarFormulario && (
        <div className="rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
          {carregandoClinica || carregandoLista ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">Carregando...</p>
          ) : !clinicaAtivaId ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
              Nenhuma clínica vinculada ao seu usuário.
            </p>
          ) : erroLista ? (
            <p className="p-8 text-center text-sm text-[var(--cor-erro)]">{erroLista}</p>
          ) : profissionais.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
              Nenhum profissional vinculado a esta clínica ainda.
            </p>
          ) : (
            <>
              <table className="hidden w-full text-left text-sm sm:table">
                <thead>
                  <tr className="border-b border-[var(--borda)] text-[var(--texto-secundario)]">
                    <th className="px-5 py-3 font-medium">Nome</th>
                    <th className="px-5 py-3 font-medium">Especialidade</th>
                    <th className="px-5 py-3 font-medium">Conselho</th>
                    {souProprietaria && <th className="px-5 py-3 font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {profissionais.map((profissional) => (
                    <tr
                      key={profissional.id}
                      className="border-b border-[var(--borda)] text-[var(--texto-principal)] last:border-0"
                    >
                      <td className="px-5 py-3 font-medium">{profissional.nome_completo}</td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">
                        {profissional.especialidade_nome}
                      </td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">
                        {profissional.conselho_classe
                          ? `${profissional.conselho_classe} ${profissional.registro_conselho ?? ''}`
                          : '—'}
                      </td>
                      {souProprietaria && (
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => desativarVinculo(profissional.id)}
                            className="text-[var(--texto-secundario)] transition hover:text-[var(--cor-erro)]"
                          >
                            Remover desta clínica
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-[var(--borda)] sm:hidden">
                {profissionais.map((profissional) => (
                  <li key={profissional.id} className="space-y-1 p-4">
                    <p className="font-medium text-[var(--texto-principal)]">
                      {profissional.nome_completo}
                    </p>
                    <p className="text-sm text-[var(--texto-secundario)]">
                      {profissional.especialidade_nome}
                      {profissional.conselho_classe
                        ? ` · ${profissional.conselho_classe} ${profissional.registro_conselho ?? ''}`
                        : ''}
                    </p>
                    {souProprietaria && (
                      <button
                        type="button"
                        onClick={() => desativarVinculo(profissional.id)}
                        className="pt-1 text-sm text-[var(--texto-secundario)]"
                      >
                        Remover desta clínica
                      </button>
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

export default Profissionais

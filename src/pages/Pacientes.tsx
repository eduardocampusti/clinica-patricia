import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { apenasDigitos, cpfValido, formatarCpf } from '../lib/cpf'
import { criptografarCpf, descriptografarCpf, gerarHashCpf } from '../lib/cpfCripto'

interface PacienteListado {
  id: string
  nome_completo: string
  cpf: string
  data_nascimento: string | null
  telefone: string | null
}

interface PacienteRow {
  id: string
  nome_completo: string
  cpf_encrypted: string
  data_nascimento: string | null
  telefone: string | null
}

const OPCOES_SEXO = [
  { value: 'nao_informado', label: 'Não informado' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'outro', label: 'Outro' },
]

const FORM_INICIAL = {
  nomeCompleto: '',
  cpf: '',
  dataNascimento: '',
  sexo: 'nao_informado',
  telefone: '',
  email: '',
  endereco: '',
  observacoes: '',
  consentimento: false,
}

function formatarData(data: string | null): string {
  if (!data) return '—'
  const [ano, mes, dia] = data.split('-')
  if (!ano || !mes || !dia) return data
  return `${dia}/${mes}/${ano}`
}

interface PacientesProps {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  usuarioId: string
}

function Pacientes({ clinicaAtivaId, carregandoClinica, usuarioId }: PacientesProps) {
  const [pacientes, setPacientes] = useState<PacienteListado[]>([])
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [erroLista, setErroLista] = useState<string | null>(null)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  const carregarPacientes = useCallback(async (clinicaId: string) => {
    setCarregandoLista(true)
    setErroLista(null)

    const { data, error } = await supabase
      .from('pacientes')
      .select('id, nome_completo, cpf_encrypted, data_nascimento, telefone')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .order('nome_completo', { ascending: true })

    if (error) {
      setErroLista('Não foi possível carregar os pacientes.')
      setCarregandoLista(false)
      return
    }

    const linhas = (data ?? []) as PacienteRow[]
    const comCpfDecifrado = await Promise.all(
      linhas.map(async (linha) => {
        let cpf = '—'
        try {
          cpf = formatarCpf(await descriptografarCpf(linha.cpf_encrypted))
        } catch {
          cpf = '—'
        }
        return {
          id: linha.id,
          nome_completo: linha.nome_completo,
          data_nascimento: linha.data_nascimento,
          telefone: linha.telefone,
          cpf,
        }
      }),
    )

    setPacientes(comCpfDecifrado)
    setCarregandoLista(false)
  }, [])

  useEffect(() => {
    if (!clinicaAtivaId) {
      setPacientes([])
      setCarregandoLista(false)
      return
    }

    carregarPacientes(clinicaAtivaId)
  }, [clinicaAtivaId, carregarPacientes])

  useEffect(() => {
    if (!mensagemSucesso) return
    const timeout = setTimeout(() => setMensagemSucesso(null), 5000)
    return () => clearTimeout(timeout)
  }, [mensagemSucesso])

  function abrirFormulario() {
    setForm(FORM_INICIAL)
    setErroFormulario(null)
    setMensagemSucesso(null)
    setMostrarFormulario(true)
  }

  function fecharFormulario() {
    setMostrarFormulario(false)
    setErroFormulario(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroFormulario(null)

    if (!clinicaAtivaId) {
      setErroFormulario('Nenhuma clínica ativa encontrada para o seu usuário.')
      return
    }

    if (!form.nomeCompleto.trim()) {
      setErroFormulario('Informe o nome completo do paciente.')
      return
    }

    if (!cpfValido(form.cpf)) {
      setErroFormulario('Informe um CPF válido, com 11 dígitos.')
      return
    }

    if (!form.consentimento) {
      setErroFormulario('É necessário marcar a concordância com o uso dos dados conforme a LGPD.')
      return
    }

    setSalvando(true)

    try {
      const cpfDigitos = apenasDigitos(form.cpf)
      const [cpfEncrypted, cpfHash] = await Promise.all([
        criptografarCpf(cpfDigitos),
        gerarHashCpf(cpfDigitos),
      ])

      const { error } = await supabase.from('pacientes').insert({
        clinica_id: clinicaAtivaId,
        nome_completo: form.nomeCompleto.trim(),
        cpf_encrypted: cpfEncrypted,
        cpf_hash: cpfHash,
        data_nascimento: form.dataNascimento || null,
        sexo: form.sexo,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        endereco: form.endereco.trim() || null,
        observacoes: form.observacoes.trim() || null,
        consentimento_lgpd: true,
        consentimento_data: new Date().toISOString(),
        created_by: usuarioId,
      })

      if (error) {
        if (error.code === '23505') {
          setErroFormulario('Já existe um paciente com este CPF cadastrado nesta clínica.')
        } else {
          setErroFormulario('Não foi possível salvar o paciente. Tente novamente.')
        }
        setSalvando(false)
        return
      }

      setSalvando(false)
      setMostrarFormulario(false)
      setMensagemSucesso('Paciente cadastrado com sucesso.')
      await carregarPacientes(clinicaAtivaId)
    } catch {
      setErroFormulario('Não foi possível salvar o paciente. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-normal text-[var(--texto-titulo)]">Pacientes</h1>
          <p className="text-sm text-[var(--texto-secundario)]">
            Pacientes cadastrados na clínica.
          </p>
        </div>

        {!mostrarFormulario && (
          <button
            type="button"
            onClick={abrirFormulario}
            disabled={!clinicaAtivaId}
            className="rounded-xl bg-[var(--cor-primaria)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Novo paciente
          </button>
        )}
      </div>

      {mensagemSucesso && (
        <p className="rounded-lg border border-[var(--cor-sucesso-borda)] bg-[var(--cor-sucesso-suave)] px-4 py-2.5 text-sm font-medium text-[var(--cor-sucesso)]">
          {mensagemSucesso}
        </p>
      )}

      {mostrarFormulario && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-6 shadow-[0px_1px_8px_rgba(0,0,0,0.1)] sm:p-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-normal text-[var(--texto-titulo)]">Novo paciente</h2>
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
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: formatarCpf(e.target.value) }))}
                disabled={salvando}
                maxLength={14}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Data de nascimento
              </label>
              <input
                type="date"
                value={form.dataNascimento}
                onChange={(e) => setForm((f) => ({ ...f, dataNascimento: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Sexo
              </label>
              <select
                value={form.sexo}
                onChange={(e) => setForm((f) => ({ ...f, sexo: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              >
                {OPCOES_SEXO.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Telefone
              </label>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Endereço
              </label>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Observações
              </label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                disabled={salvando}
                rows={3}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-[var(--borda)] bg-[var(--fundo-pagina)] p-3.5 text-sm text-[var(--texto-principal)]">
            <input
              type="checkbox"
              checked={form.consentimento}
              onChange={(e) => setForm((f) => ({ ...f, consentimento: e.target.checked }))}
              disabled={salvando}
              className="mt-0.5 h-4 w-4 accent-[var(--cor-primaria)]"
            />
            <span>
              Paciente concorda com o uso dos dados conforme a LGPD{' '}
              <span className="text-[var(--cor-erro)]">*</span>
            </span>
          </label>

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
              className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {salvando ? 'Salvando...' : 'Salvar paciente'}
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
          ) : pacientes.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
              Nenhum paciente cadastrado ainda.
            </p>
          ) : (
            <>
              {/* Tabela — telas médias em diante */}
              <table className="hidden w-full text-left text-sm sm:table">
                <thead>
                  <tr className="border-b border-[var(--borda)] text-[var(--texto-secundario)]">
                    <th className="px-5 py-3 font-medium">Nome</th>
                    <th className="px-5 py-3 font-medium">CPF</th>
                    <th className="px-5 py-3 font-medium">Nascimento</th>
                    <th className="px-5 py-3 font-medium">Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientes.map((paciente) => (
                    <tr
                      key={paciente.id}
                      className="border-b border-[var(--borda)] text-[var(--texto-principal)] last:border-0"
                    >
                      <td className="px-5 py-3 font-medium">{paciente.nome_completo}</td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">{paciente.cpf}</td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">
                        {formatarData(paciente.data_nascimento)}
                      </td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">
                        {paciente.telefone || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cards — mobile */}
              <ul className="divide-y divide-[var(--borda)] sm:hidden">
                {pacientes.map((paciente) => (
                  <li key={paciente.id} className="space-y-1 p-4">
                    <p className="font-medium text-[var(--texto-principal)]">
                      {paciente.nome_completo}
                    </p>
                    <p className="text-sm text-[var(--texto-secundario)]">CPF: {paciente.cpf}</p>
                    <p className="text-sm text-[var(--texto-secundario)]">
                      Nascimento: {formatarData(paciente.data_nascimento)}
                    </p>
                    <p className="text-sm text-[var(--texto-secundario)]">
                      Telefone: {paciente.telefone || '—'}
                    </p>
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

export default Pacientes

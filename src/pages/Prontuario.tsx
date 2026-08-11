import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { usePapelNaClinica } from '../hooks/usePapelNaClinica'

type StatusAtendimento = 'em_andamento' | 'finalizado'
type TipoDocumentoClinico = 'receita' | 'atestado' | 'encaminhamento' | 'solicitacao_exame'

interface PacienteOpcao {
  id: string
  nome_completo: string
}

interface AtendimentoResumo {
  id: string
  paciente_nome: string
  status: StatusAtendimento
  created_at: string
}

interface AtendimentoCompleto {
  id: string
  paciente_id: string
  agendamento_id: string | null
  queixa_principal: string | null
  anamnese: string | null
  exame_fisico: string | null
  hipotese_diagnostica: string | null
  cid: string | null
  conduta_evolucao: string | null
  prescricao: string | null
  status: StatusAtendimento
  finalizado_em: string | null
  created_at: string
}

interface CamposNucleo {
  queixa_principal: string
  anamnese: string
  exame_fisico: string
  hipotese_diagnostica: string
  cid: string
  conduta_evolucao: string
  prescricao: string
}

interface Adendo {
  id: string
  texto: string
  created_at: string
}

interface DocumentoClinico {
  id: string
  tipo: TipoDocumentoClinico
  conteudo: string
  created_at: string
}

const CAMPOS_INICIAIS: CamposNucleo = {
  queixa_principal: '',
  anamnese: '',
  exame_fisico: '',
  hipotese_diagnostica: '',
  cid: '',
  conduta_evolucao: '',
  prescricao: '',
}

const STATUS_LABEL: Record<StatusAtendimento, string> = {
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
}

const TIPO_DOCUMENTO_LABEL: Record<TipoDocumentoClinico, string> = {
  receita: 'Receita',
  atestado: 'Atestado',
  encaminhamento: 'Encaminhamento',
  solicitacao_exame: 'Solicitação de exame',
}

function formatarDataHora(iso: string): string {
  const data = new Date(iso)
  return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

const CAMPO_CLASSE =
  'w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-sm text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60'

interface ProntuarioProps {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  usuarioId: string
  atendimentoParaAbrirId?: string | null
  onAtendimentoParaAbrirConsumido?: () => void
}

function Prontuario({
  clinicaAtivaId,
  carregandoClinica,
  usuarioId,
  atendimentoParaAbrirId,
  onAtendimentoParaAbrirConsumido,
}: ProntuarioProps) {
  const { papel, carregando: carregandoPapel } = usePapelNaClinica(usuarioId, clinicaAtivaId)
  const souMedico = papel === 'medico'

  const [meuProfissionalId, setMeuProfissionalId] = useState<string | null>(null)

  const [vista, setVista] = useState<'lista' | 'editor'>('lista')
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([])
  const [atendimentos, setAtendimentos] = useState<AtendimentoResumo[]>([])
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [erroLista, setErroLista] = useState<string | null>(null)
  const [modalNovoAtendimentoAberto, setModalNovoAtendimentoAberto] = useState(false)

  const [atendimentoAtual, setAtendimentoAtual] = useState<AtendimentoCompleto | null>(null)
  const [pacienteNomeAtual, setPacienteNomeAtual] = useState('—')
  const [carregandoAtendimento, setCarregandoAtendimento] = useState(false)
  const [erroAtendimento, setErroAtendimento] = useState<string | null>(null)

  const [campos, setCampos] = useState<CamposNucleo>(CAMPOS_INICIAIS)
  const [salvandoRascunho, setSalvandoRascunho] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [mensagemSalvo, setMensagemSalvo] = useState<string | null>(null)

  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [erroFinalizar, setErroFinalizar] = useState<string | null>(null)

  const [adendos, setAdendos] = useState<Adendo[]>([])
  const [novoAdendoTexto, setNovoAdendoTexto] = useState('')
  const [salvandoAdendo, setSalvandoAdendo] = useState(false)
  const [erroAdendo, setErroAdendo] = useState<string | null>(null)

  const [documentos, setDocumentos] = useState<DocumentoClinico[]>([])
  const [modalDocumentoAberto, setModalDocumentoAberto] = useState(false)

  async function carregarPacientes(clinicaId: string) {
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome_completo')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .order('nome_completo', { ascending: true })
    setPacientes(data ?? [])
  }

  async function carregarAtendimentos(clinicaId: string) {
    setCarregandoLista(true)
    setErroLista(null)

    const { data, error } = await supabase
      .from('atendimentos')
      .select('id, status, created_at, pacientes(nome_completo)')
      .eq('clinica_id', clinicaId)
      .order('created_at', { ascending: false })

    if (error) {
      setErroLista('Não foi possível carregar seus atendimentos.')
      setCarregandoLista(false)
      return
    }

    type Linha = {
      id: string
      status: StatusAtendimento
      created_at: string
      pacientes: { nome_completo: string } | { nome_completo: string }[] | null
    }
    const linhas = (data ?? []) as unknown as Linha[]
    setAtendimentos(
      linhas.map((l) => {
        const p = Array.isArray(l.pacientes) ? l.pacientes[0] : l.pacientes
        return { id: l.id, paciente_nome: p?.nome_completo ?? '—', status: l.status, created_at: l.created_at }
      }),
    )
    setCarregandoLista(false)
  }

  useEffect(() => {
    if (!souMedico) {
      setMeuProfissionalId(null)
      return
    }
    let cancelado = false
    supabase
      .from('profissionais')
      .select('id')
      .eq('usuario_id', usuarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) setMeuProfissionalId(data?.id ?? null)
      })
    return () => {
      cancelado = true
    }
  }, [souMedico, usuarioId])

  useEffect(() => {
    if (!clinicaAtivaId || !souMedico) {
      setPacientes([])
      setAtendimentos([])
      setCarregandoLista(false)
      return
    }
    carregarPacientes(clinicaAtivaId)
    carregarAtendimentos(clinicaAtivaId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaAtivaId, souMedico])

  function aplicarAtendimento(registro: AtendimentoCompleto) {
    setAtendimentoAtual(registro)
    setCampos({
      queixa_principal: registro.queixa_principal ?? '',
      anamnese: registro.anamnese ?? '',
      exame_fisico: registro.exame_fisico ?? '',
      hipotese_diagnostica: registro.hipotese_diagnostica ?? '',
      cid: registro.cid ?? '',
      conduta_evolucao: registro.conduta_evolucao ?? '',
      prescricao: registro.prescricao ?? '',
    })
    setErroSalvar(null)
    setMensagemSalvo(null)
    setErroFinalizar(null)
    setNovoAdendoTexto('')

    const conhecido = pacientes.find((p) => p.id === registro.paciente_id)
    if (conhecido) {
      setPacienteNomeAtual(conhecido.nome_completo)
    } else {
      supabase
        .from('pacientes')
        .select('nome_completo')
        .eq('id', registro.paciente_id)
        .maybeSingle()
        .then(({ data }) => setPacienteNomeAtual(data?.nome_completo ?? '—'))
    }
  }

  // Atendimento recém-criado nesta mesma sessão (via Agenda ou "Novo
  // atendimento" abaixo): busca direta, sem auditar — não há conteúdo pra
  // ler ainda, quem criou é o próprio profissional.
  async function abrirRecemCriado(id: string) {
    setVista('editor')
    setCarregandoAtendimento(true)
    setErroAtendimento(null)

    const { data, error } = await supabase
      .from('atendimentos')
      .select(
        'id, paciente_id, agendamento_id, queixa_principal, anamnese, exame_fisico, hipotese_diagnostica, cid, conduta_evolucao, prescricao, status, finalizado_em, created_at',
      )
      .eq('id', id)
      .single()

    if (error || !data) {
      setErroAtendimento('Não foi possível abrir o atendimento.')
      setCarregandoAtendimento(false)
      return
    }
    aplicarAtendimento(data as AtendimentoCompleto)
    setCarregandoAtendimento(false)
  }

  // Abrir um atendimento já existente (da lista) sempre passa pela RPC —
  // é o único caminho que audita a leitura do conteúdo clínico completo.
  async function abrirExistente(id: string) {
    setVista('editor')
    setCarregandoAtendimento(true)
    setErroAtendimento(null)

    const { data, error } = await supabase.rpc('abrir_atendimento', { p_atendimento_id: id })

    if (error || !data) {
      setErroAtendimento('Não foi possível abrir este atendimento.')
      setCarregandoAtendimento(false)
      return
    }
    aplicarAtendimento(data as AtendimentoCompleto)
    setCarregandoAtendimento(false)
  }

  useEffect(() => {
    if (!atendimentoParaAbrirId) return
    abrirRecemCriado(atendimentoParaAbrirId)
    onAtendimentoParaAbrirConsumido?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendimentoParaAbrirId])

  async function carregarAdendos(atendimentoId: string) {
    const { data } = await supabase
      .from('atendimentos_adendos')
      .select('id, texto, created_at')
      .eq('atendimento_id', atendimentoId)
      .order('created_at', { ascending: true })
    setAdendos(data ?? [])
  }

  async function carregarDocumentos(atendimentoId: string) {
    const { data } = await supabase
      .from('documentos_clinicos')
      .select('id, tipo, conteudo, created_at')
      .eq('atendimento_id', atendimentoId)
      .order('created_at', { ascending: false })
    setDocumentos(data ?? [])
  }

  useEffect(() => {
    if (!atendimentoAtual) {
      setAdendos([])
      setDocumentos([])
      return
    }
    carregarAdendos(atendimentoAtual.id)
    carregarDocumentos(atendimentoAtual.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendimentoAtual?.id])

  function voltarParaLista() {
    setVista('lista')
    setAtendimentoAtual(null)
    if (clinicaAtivaId) carregarAtendimentos(clinicaAtivaId)
  }

  async function salvarRascunho() {
    if (!atendimentoAtual) return
    setSalvandoRascunho(true)
    setErroSalvar(null)
    setMensagemSalvo(null)

    const { error } = await supabase.from('atendimentos').update({ ...campos }).eq('id', atendimentoAtual.id)

    setSalvandoRascunho(false)
    if (error) {
      setErroSalvar('Não foi possível salvar o rascunho. Tente novamente.')
      return
    }
    setMensagemSalvo('Rascunho salvo.')
  }

  async function confirmarFinalizar() {
    if (!atendimentoAtual) return
    setFinalizando(true)
    setErroFinalizar(null)

    const { error: erroUpdate } = await supabase.from('atendimentos').update({ ...campos }).eq('id', atendimentoAtual.id)
    if (erroUpdate) {
      setErroFinalizar('Não foi possível salvar as alterações antes de finalizar.')
      setFinalizando(false)
      return
    }

    const { error } = await supabase.rpc('finalizar_atendimento', { p_atendimento_id: atendimentoAtual.id })
    if (error) {
      setErroFinalizar('Não foi possível finalizar. Tente novamente.')
      setFinalizando(false)
      return
    }

    setFinalizando(false)
    setModalFinalizarAberto(false)
    setAtendimentoAtual((atual) =>
      atual ? { ...atual, status: 'finalizado', finalizado_em: new Date().toISOString() } : atual,
    )
  }

  async function adicionarAdendo() {
    if (!atendimentoAtual || !novoAdendoTexto.trim()) return
    setSalvandoAdendo(true)
    setErroAdendo(null)

    const { error } = await supabase.from('atendimentos_adendos').insert({
      atendimento_id: atendimentoAtual.id,
      texto: novoAdendoTexto.trim(),
      created_by: usuarioId,
    })

    setSalvandoAdendo(false)
    if (error) {
      setErroAdendo('Não foi possível salvar o adendo. Tente novamente.')
      return
    }
    setNovoAdendoTexto('')
    await carregarAdendos(atendimentoAtual.id)
  }

  const emAndamento = useMemo(() => atendimentos.filter((a) => a.status === 'em_andamento'), [atendimentos])
  const finalizados = useMemo(() => atendimentos.filter((a) => a.status === 'finalizado'), [atendimentos])
  const somenteLeitura = atendimentoAtual?.status === 'finalizado'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="texto-titulo-tela text-[var(--texto-principal)]">Prontuário</h1>
        <p className="text-sm text-[var(--texto-secundario)]">Registros clínicos dos seus atendimentos.</p>
      </div>

      {carregandoClinica || carregandoPapel ? (
        <CardNeutro>Carregando...</CardNeutro>
      ) : !clinicaAtivaId ? (
        <CardNeutro>Nenhuma clínica vinculada ao seu usuário.</CardNeutro>
      ) : !souMedico ? (
        <CardNeutro>O prontuário é visível apenas para o profissional responsável por cada atendimento.</CardNeutro>
      ) : vista === 'editor' ? (
        <div className="space-y-6">
          <button
            type="button"
            onClick={voltarParaLista}
            className="text-sm text-[var(--texto-secundario)] transition hover:text-[var(--texto-principal)]"
          >
            ← Voltar para a lista
          </button>

          {carregandoAtendimento ? (
            <CardNeutro>Carregando atendimento...</CardNeutro>
          ) : erroAtendimento ? (
            <CardNeutro erro>{erroAtendimento}</CardNeutro>
          ) : atendimentoAtual ? (
            <>
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[var(--fundo-card)] p-5"
                style={{ boxShadow: 'var(--sombra-neutra)' }}
              >
                <div>
                  <h2 className="texto-titulo-secao text-[var(--texto-principal)]">{pacienteNomeAtual}</h2>
                  <p className="text-sm text-[var(--texto-secundario)]">{formatarDataHora(atendimentoAtual.created_at)}</p>
                </div>
                <span className="rounded-full bg-[var(--fundo-pagina)] px-3 py-1.5 text-xs font-medium text-[var(--texto-secundario)]">
                  {STATUS_LABEL[atendimentoAtual.status]}
                </span>
              </div>

              <div className="space-y-5 rounded-[18px] bg-[var(--fundo-card)] p-6" style={{ boxShadow: 'var(--sombra-neutra)' }}>
                <CampoTexto
                  label="Queixa principal"
                  value={campos.queixa_principal}
                  onChange={(v) => setCampos((c) => ({ ...c, queixa_principal: v }))}
                  disabled={somenteLeitura}
                  rows={2}
                />
                <CampoTexto
                  label="Anamnese"
                  value={campos.anamnese}
                  onChange={(v) => setCampos((c) => ({ ...c, anamnese: v }))}
                  disabled={somenteLeitura}
                  rows={4}
                />
                <CampoTexto
                  label="Exame físico"
                  value={campos.exame_fisico}
                  onChange={(v) => setCampos((c) => ({ ...c, exame_fisico: v }))}
                  disabled={somenteLeitura}
                  rows={3}
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_160px]">
                  <CampoTexto
                    label="Hipótese diagnóstica"
                    value={campos.hipotese_diagnostica}
                    onChange={(v) => setCampos((c) => ({ ...c, hipotese_diagnostica: v }))}
                    disabled={somenteLeitura}
                    rows={2}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">CID</label>
                    <input
                      type="text"
                      value={campos.cid}
                      onChange={(e) => setCampos((c) => ({ ...c, cid: e.target.value }))}
                      disabled={somenteLeitura}
                      className={CAMPO_CLASSE}
                    />
                  </div>
                </div>

                <CampoTexto
                  label="Conduta / evolução"
                  value={campos.conduta_evolucao}
                  onChange={(v) => setCampos((c) => ({ ...c, conduta_evolucao: v }))}
                  disabled={somenteLeitura}
                  rows={4}
                />
                <CampoTexto
                  label="Prescrição"
                  value={campos.prescricao}
                  onChange={(v) => setCampos((c) => ({ ...c, prescricao: v }))}
                  disabled={somenteLeitura}
                  rows={4}
                />

                {erroSalvar && (
                  <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]">
                    {erroSalvar}
                  </p>
                )}
                {mensagemSalvo && (
                  <p className="rounded-lg border border-[var(--cor-sucesso-borda)] bg-[var(--cor-sucesso-suave)] px-3 py-2 text-sm text-[var(--cor-sucesso)]">
                    {mensagemSalvo}
                  </p>
                )}

                {!somenteLeitura && (
                  <div className="flex flex-wrap justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={salvarRascunho}
                      disabled={salvandoRascunho}
                      className="rounded-xl border border-[var(--borda)] px-4 py-2.5 font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {salvandoRascunho ? 'Salvando...' : 'Salvar rascunho'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalFinalizarAberto(true)}
                      className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)]"
                    >
                      Finalizar atendimento
                    </button>
                  </div>
                )}
              </div>

              <SecaoDocumentos documentos={documentos} onEmitir={() => setModalDocumentoAberto(true)} />

              {somenteLeitura && (
                <SecaoAdendos
                  adendos={adendos}
                  texto={novoAdendoTexto}
                  onTextoChange={setNovoAdendoTexto}
                  onAdicionar={adicionarAdendo}
                  salvando={salvandoAdendo}
                  erro={erroAdendo}
                />
              )}
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--texto-secundario)]">Meus atendimentos</p>
            <button
              type="button"
              onClick={() => setModalNovoAtendimentoAberto(true)}
              disabled={!meuProfissionalId}
              className="rounded-xl bg-[var(--cor-primaria)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Novo atendimento
            </button>
          </div>

          {erroLista && (
            <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]">
              {erroLista}
            </p>
          )}

          <SecaoAtendimentos
            titulo="Em andamento"
            itens={emAndamento}
            carregando={carregandoLista}
            vazio="Nenhum atendimento em andamento."
            onAbrir={abrirExistente}
          />
          <SecaoAtendimentos
            titulo="Finalizados"
            itens={finalizados}
            carregando={carregandoLista}
            vazio="Nenhum atendimento finalizado ainda."
            onAbrir={abrirExistente}
          />
        </div>
      )}

      {modalNovoAtendimentoAberto && clinicaAtivaId && meuProfissionalId && (
        <ModalNovoAtendimento
          clinicaAtivaId={clinicaAtivaId}
          profissionalId={meuProfissionalId}
          pacientes={pacientes}
          usuarioId={usuarioId}
          onFechar={() => setModalNovoAtendimentoAberto(false)}
          onCriado={(id) => {
            setModalNovoAtendimentoAberto(false)
            abrirRecemCriado(id)
          }}
        />
      )}

      {modalFinalizarAberto && (
        <ModalConfirmarFinalizar
          finalizando={finalizando}
          erro={erroFinalizar}
          onFechar={() => setModalFinalizarAberto(false)}
          onConfirmar={confirmarFinalizar}
        />
      )}

      {modalDocumentoAberto && atendimentoAtual && (
        <ModalEmitirDocumento
          atendimentoId={atendimentoAtual.id}
          usuarioId={usuarioId}
          onFechar={() => setModalDocumentoAberto(false)}
          onSalvo={async () => {
            setModalDocumentoAberto(false)
            await carregarDocumentos(atendimentoAtual.id)
          }}
        />
      )}
    </div>
  )
}

function CardNeutro({ children, erro }: { children: ReactNode; erro?: boolean }) {
  return (
    <div
      className={`rounded-[18px] bg-[var(--fundo-card)] p-8 text-center text-sm ${erro ? 'text-[var(--cor-erro)]' : 'text-[var(--texto-secundario)]'}`}
      style={{ boxShadow: 'var(--sombra-neutra)' }}
    >
      {children}
    </div>
  )
}

interface SecaoAtendimentosProps {
  titulo: string
  itens: AtendimentoResumo[]
  carregando: boolean
  vazio: string
  onAbrir: (id: string) => void
}

function SecaoAtendimentos({ titulo, itens, carregando, vazio, onAbrir }: SecaoAtendimentosProps) {
  return (
    <div>
      <h2 className="texto-titulo-secao mb-3 text-[var(--texto-principal)]">{titulo}</h2>
      <div className="rounded-[18px] bg-[var(--fundo-card)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
        {carregando ? (
          <p className="p-6 text-center text-sm text-[var(--texto-secundario)]">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--texto-secundario)]">{vazio}</p>
        ) : (
          <ul className="divide-y divide-[var(--borda)]">
            {itens.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onAbrir(a.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-left transition hover:bg-[var(--fundo-pagina)]"
                >
                  <span className="font-medium text-[var(--texto-principal)]">{a.paciente_nome}</span>
                  <span className="text-sm text-[var(--texto-secundario)]">{formatarDataHora(a.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

interface CampoTextoProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  rows: number
}

function CampoTexto({ label, value, onChange, disabled, rows }: CampoTextoProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className={CAMPO_CLASSE}
      />
    </div>
  )
}

function SecaoDocumentos({ documentos, onEmitir }: { documentos: DocumentoClinico[]; onEmitir: () => void }) {
  return (
    <div className="rounded-[18px] bg-[var(--fundo-card)] p-6" style={{ boxShadow: 'var(--sombra-neutra)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="texto-titulo-secao text-[var(--texto-principal)]">Documentos clínicos</h2>
        <button
          type="button"
          onClick={onEmitir}
          className="rounded-xl border border-[var(--borda)] px-3.5 py-2 text-sm font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)]"
        >
          + Emitir documento
        </button>
      </div>
      {documentos.length === 0 ? (
        <p className="text-sm text-[var(--texto-secundario)]">Nenhum documento emitido ainda.</p>
      ) : (
        <ul className="divide-y divide-[var(--borda)]">
          {documentos.map((d) => (
            <li key={d.id} className="space-y-1 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--texto-principal)]">{TIPO_DOCUMENTO_LABEL[d.tipo]}</span>
                <span className="text-xs text-[var(--texto-secundario)]">{formatarDataHora(d.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--texto-secundario)]">{d.conteudo}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface SecaoAdendosProps {
  adendos: Adendo[]
  texto: string
  onTextoChange: (v: string) => void
  onAdicionar: () => void
  salvando: boolean
  erro: string | null
}

function SecaoAdendos({ adendos, texto, onTextoChange, onAdicionar, salvando, erro }: SecaoAdendosProps) {
  return (
    <div className="rounded-[18px] bg-[var(--fundo-card)] p-6" style={{ boxShadow: 'var(--sombra-neutra)' }}>
      <h2 className="texto-titulo-secao mb-4 text-[var(--texto-principal)]">Adendos</h2>

      {adendos.length === 0 ? (
        <p className="mb-4 text-sm text-[var(--texto-secundario)]">Nenhum adendo registrado.</p>
      ) : (
        <ul className="mb-4 divide-y divide-[var(--borda)]">
          {adendos.map((a) => (
            <li key={a.id} className="space-y-1 py-3">
              <p className="whitespace-pre-wrap text-sm text-[var(--texto-principal)]">{a.texto}</p>
              <p className="text-xs text-[var(--texto-secundario)]">{formatarDataHora(a.created_at)}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <textarea
          value={texto}
          onChange={(e) => onTextoChange(e.target.value)}
          disabled={salvando}
          rows={3}
          placeholder="Adicionar um adendo..."
          className={CAMPO_CLASSE}
        />
        {erro && (
          <p role="alert" className="text-sm text-[var(--cor-erro)]">
            {erro}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onAdicionar}
            disabled={salvando || !texto.trim()}
            className="rounded-xl bg-[var(--cor-primaria)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Adicionar adendo'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ModalNovoAtendimentoProps {
  clinicaAtivaId: string
  profissionalId: string
  pacientes: PacienteOpcao[]
  usuarioId: string
  onFechar: () => void
  onCriado: (id: string) => void
}

function ModalNovoAtendimento({
  clinicaAtivaId,
  profissionalId,
  pacientes,
  usuarioId,
  onFechar,
  onCriado,
}: ModalNovoAtendimentoProps) {
  const [busca, setBusca] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const filtrados = busca.trim()
    ? pacientes.filter((p) => p.nome_completo.toLowerCase().includes(busca.trim().toLowerCase()))
    : pacientes

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!pacienteId) {
      setErro('Selecione o paciente.')
      return
    }

    setSalvando(true)
    const { data, error } = await supabase
      .from('atendimentos')
      .insert({
        clinica_id: clinicaAtivaId,
        paciente_id: pacienteId,
        profissional_id: profissionalId,
        created_by: usuarioId,
      })
      .select('id')
      .single()

    setSalvando(false)
    if (error || !data) {
      setErro('Não foi possível criar o atendimento. Tente novamente.')
      return
    }
    onCriado(data.id)
  }

  return (
    <ModalBase titulo="Novo atendimento" onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Paciente <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            disabled={salvando}
            className={`mb-2 ${CAMPO_CLASSE}`}
          />
          <select
            required
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            disabled={salvando}
            className={CAMPO_CLASSE}
          >
            <option value="">Selecione...</option>
            {filtrados.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome_completo}
              </option>
            ))}
          </select>
        </div>

        {erro && (
          <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onFechar}
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
            {salvando ? 'Criando...' : 'Iniciar atendimento'}
          </button>
        </div>
      </form>
    </ModalBase>
  )
}

interface ModalConfirmarFinalizarProps {
  finalizando: boolean
  erro: string | null
  onFechar: () => void
  onConfirmar: () => void
}

function ModalConfirmarFinalizar({ finalizando, erro, onFechar, onConfirmar }: ModalConfirmarFinalizarProps) {
  return (
    <ModalBase titulo="Finalizar atendimento" onFechar={onFechar}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--texto-principal)]">
          Depois de finalizado, esse registro não pode mais ser editado. Só é possível corrigir por adendo. Confirma?
        </p>

        {erro && (
          <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onFechar}
            disabled={finalizando}
            className="rounded-xl border border-[var(--borda)] px-4 py-2.5 font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={finalizando}
            className="rounded-xl bg-[var(--cor-erro)] px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {finalizando ? 'Finalizando...' : 'Finalizar atendimento'}
          </button>
        </div>
      </div>
    </ModalBase>
  )
}

interface ModalEmitirDocumentoProps {
  atendimentoId: string
  usuarioId: string
  onFechar: () => void
  onSalvo: () => void
}

function ModalEmitirDocumento({ atendimentoId, usuarioId, onFechar, onSalvo }: ModalEmitirDocumentoProps) {
  const [tipo, setTipo] = useState<TipoDocumentoClinico>('receita')
  const [conteudo, setConteudo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!conteudo.trim()) {
      setErro('Escreva o conteúdo do documento.')
      return
    }

    setSalvando(true)
    const { error } = await supabase.from('documentos_clinicos').insert({
      atendimento_id: atendimentoId,
      tipo,
      conteudo: conteudo.trim(),
      created_by: usuarioId,
    })

    setSalvando(false)
    if (error) {
      setErro('Não foi possível emitir o documento. Tente novamente.')
      return
    }
    onSalvo()
  }

  return (
    <ModalBase titulo="Emitir documento" onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDocumentoClinico)}
            disabled={salvando}
            className={CAMPO_CLASSE}
          >
            {Object.entries(TIPO_DOCUMENTO_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Conteúdo <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <textarea
            required
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            disabled={salvando}
            rows={6}
            className={CAMPO_CLASSE}
          />
        </div>

        {erro && (
          <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onFechar}
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
            {salvando ? 'Emitindo...' : 'Emitir documento'}
          </button>
        </div>
      </form>
    </ModalBase>
  )
}

interface ModalBaseProps {
  titulo: string
  onFechar: () => void
  children: ReactNode
}

function ModalBase({ titulo, onFechar, children }: ModalBaseProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="fixed inset-0 bg-[var(--sobreposicao)]" />
      <div className="relative w-full max-w-lg rounded-[18px] bg-[var(--fundo-card)] p-6" style={{ boxShadow: 'var(--sombra-neutra)' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="texto-titulo-secao text-[var(--texto-principal)]">{titulo}</h2>
          <button type="button" onClick={onFechar} className="text-sm text-[var(--texto-secundario)] transition hover:text-[var(--texto-principal)]">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Prontuario

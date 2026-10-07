import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useTable, type ColumnDef, type ExpandedState, type PaginationState, type Row, type RowSelectionState, type SortingState } from '@tanstack/react-table'
import { ChevronRight, Ellipsis, Info, Search } from 'lucide-react'
import { DataGrid, DataGridContainer, dataGridFeatures, type DataGridFeatures } from '../../components/reui/data-grid/data-grid'
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from '../../components/reui/data-grid/data-grid-table'
import { DataGridPagination } from '../../components/reui/data-grid/data-grid-pagination'
import { DataGridScrollArea } from '../../components/reui/data-grid/data-grid-scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import { Skeleton } from '../../components/ui/skeleton'
import { TIPOS_EQUIPE, rotuloTipoEquipe, type ClinicaEquipe, type MembroEquipe, type TipoMembroEquipe } from '../../lib/equipe'
import type { AcessoEquipe } from '../../lib/equipeAcessos'
import { estadosListaEquipe, filtrarEquipe, normalizarBuscaEquipe, resumirEquipe } from '../../lib/equipeLista'
import { EquipeAvatar, type FotoEquipeDisponivel } from '../../components/cadastros/EquipeAvatar'
import { Selo } from '../../components/cadastros/EquipeSelos'
import { nomeCurtoClinica, seloDoStatus, seloPessoa } from '../../lib/equipeApresentacao'

interface Props {
  membros: MembroEquipe[]
  filtrados: MembroEquipe[]
  clinicas: ClinicaEquipe[]
  contexto: string | null
  clinicaAtual: string
  acessos: Record<string, AcessoEquipe | null>
  busca: string
  tipo: TipoMembroEquipe | ''
  clinicaFiltro: string
  onBusca: (valor: string) => void
  onTipo: (valor: TipoMembroEquipe | '') => void
  onClinica: (valor: string) => void
  onLimpar: () => void
  onNovo: () => void
  onVer: (membro: MembroEquipe) => void
  onEditar: (membro: MembroEquipe) => void
  onReconsultar: () => void
  proprietaria: boolean
  bloqueado: boolean
  carregando: boolean
  indisponivel: boolean
  semPermissao: boolean
  fotos?: Readonly<Record<string, FotoEquipeDisponivel>>
  /** Área do cabeçalho de Cadastros que recebe o botão Novo membro; sem ela, o botão fica na própria listagem. */
  acaoCabecalho?: HTMLElement | null
}


// Larguras da grade pela largura disponível da lista (tablet ou computador com a barra lateral aberta):
// abaixo da soma da grade completa, a coluna Clínicas sai (fica na linha expandida) e o restante cabe sem rolagem.
const LARGURAS_LARGO = { expandir: 44, select: 48, nome: 260, tipo: 200, clinicas: 170, acesso: 180, acoes: 150 }
const LARGURAS_COMPACTO = { expandir: 40, select: 44, nome: 170, tipo: 146, clinicas: 0, acesso: 136, acoes: 164 }
const soma = (l: typeof LARGURAS_LARGO) => Object.values(l).reduce((a, b) => a + b, 0)

function useLarguraElemento() {
  const [elemento, setElemento] = useState<HTMLElement | null>(null)
  const [largura, setLargura] = useState(0)
  useLayoutEffect(() => {
    if (!elemento) return
    setLargura(elemento.clientWidth)
    const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [elemento])
  return [setElemento, largura] as const
}

const SEGMENTOS: { valor: TipoMembroEquipe | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'profissional_saude', rotulo: 'Saúde' },
  { valor: 'administrativo', rotulo: 'Administrativo' },
  { valor: 'apoio', rotulo: 'Apoio' },
  { valor: 'outro', rotulo: 'Outro' },
]

function useMedia(consulta: string) {
  const [ativa, setAtiva] = useState(() => window.matchMedia(consulta).matches)
  useEffect(() => {
    const media = window.matchMedia(consulta)
    const atualizar = () => setAtiva(media.matches)
    atualizar()
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [consulta])
  return ativa
}

function Pessoa({ membro, contexto, foto, mobile = false }: { membro: MembroEquipe; contexto: string | null; foto?: FotoEquipeDisponivel; mobile?: boolean }) {
  const registroPendente = membro.tipo === 'profissional_saude' && !(membro.conselho_classe?.trim() && membro.registro_conselho?.trim())
  return <div className="equipe-pessoa">
    <EquipeAvatar membroId={membro.id} clinicaId={contexto} nome={membro.nome_completo} foto={foto} />
    <div>{mobile ? <h3 title={membro.nome_completo}>{membro.nome_completo}</h3> : <strong title={membro.nome_completo}>{membro.nome_completo}</strong>}
      {registroPendente ? <p className="equipe-pendencia">Conselho e registro pendentes</p>
        : membro.email_contato ? <p className="equipe-email-contato" title={membro.email_contato}>{membro.email_contato}</p>
          : <p className="equipe-sem-email">Sem e-mail de contato</p>}
    </div>
  </div>
}

function Funcao({ membro }: { membro: MembroEquipe }) {
  const secundario = membro.tipo === 'profissional_saude'
    ? membro.profissao ? `Saúde · ${membro.profissao}` : 'Saúde'
    : rotuloTipoEquipe(membro.tipo)
  return <div className="equipe-funcao"><p>{membro.cargo}</p><p>{secundario}</p></div>
}

function Vinculos({ membro }: { membro: MembroEquipe }) {
  return <ul className="equipe-vinculos" aria-label="Vínculos cadastrais">
    {membro.clinicas.map(c => <li key={c.id} title={c.nome}>{nomeCurtoClinica(c.nome)}</li>)}
  </ul>
}

function AcessoPorClinica({ membro, acesso, contexto, filtro }: { membro: MembroEquipe; acesso: AcessoEquipe | null | undefined; contexto: string | null; filtro: string }) {
  const estado = estadosListaEquipe(membro, acesso, contexto, filtro)
  const algumNaoConfirmado = estado.clinicas.some(c => seloDoStatus(c.status).texto === 'Não confirmado')
  return <><div className="equipe-acesso-clinicas" data-testid={`resumo-acesso-${membro.id}`}>
    <p className="equipe-conta">{estado.conta}</p>
    <ul>
      {estado.clinicas.map(c => {
        const selo = seloDoStatus(c.status)
        return <li key={c.id}>
          <span className="equipe-clinica-nome">{c.nome}</span>
          <Selo tom={selo.tom}>{selo.texto}</Selo>
          {c.papel && <span className="equipe-papel">{c.papel}</span>}
        </li>
      })}
    </ul>
  </div>
  {algumNaoConfirmado && <p className="equipe-nota">Não confirmado não significa sem acesso: convites e papéis são conferidos na ficha.</p>}</>
}

function BotaoExpandir({ row }: { row: Row<DataGridFeatures, MembroEquipe> }) {
  const expandido = row.getIsExpanded()
  return <button type="button" className="equipe-expandir" aria-expanded={expandido} aria-label={`Detalhes de ${row.original.nome_completo}`} onClick={() => row.toggleExpanded()}>
    <ChevronRight aria-hidden="true" className="size-4" />
  </button>
}

function AcoesLinha({ membro, proprietaria, bloqueado, onVer, onEditar }: { membro: MembroEquipe; proprietaria: boolean; bloqueado: boolean; onVer: (m: MembroEquipe) => void; onEditar: (m: MembroEquipe) => void }) {
  const gatilho = useRef<HTMLButtonElement>(null)
  const editarAoFechar = useRef(false)
  return <div className="equipe-lista-acoes">
    <button type="button" className="equipe-botao equipe-botao-linha" aria-label={`Ver cadastro de ${membro.nome_completo}`} onClick={() => onVer(membro)}>Ver cadastro</button>
    {/* A edição só abre depois que o menu termina de fechar e o foco volta ao gatilho;
        assim o diálogo devolve o foco a ele ao fechar. */}
    {proprietaria && <DropdownMenu onOpenChangeComplete={aberto => {
      if (aberto || !editarAoFechar.current) return
      editarAoFechar.current = false
      gatilho.current?.focus()
      onEditar(membro)
    }}>
      <DropdownMenuTrigger ref={gatilho} className="equipe-botao equipe-botao-icone" aria-label={`Mais ações para ${membro.nome_completo}`}>
        <Ellipsis aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={bloqueado} onClick={() => { editarAoFechar.current = true }}>Editar cadastro</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>}
  </div>
}

function Detalhes({ membro, acesso, contexto, filtro, proprietaria, bloqueado, onEditar }: { membro: MembroEquipe; acesso: AcessoEquipe | null | undefined; contexto: string | null; filtro: string; proprietaria: boolean; bloqueado: boolean; onEditar: (m: MembroEquipe) => void }) {
  const campo = (rotulo: string, valor: string | null) => <div>
    <dt>{rotulo}</dt>
    <dd>{valor?.trim() ? valor : proprietaria
      ? <button type="button" className="equipe-link" disabled={bloqueado} aria-label={`Adicionar ${rotulo} de ${membro.nome_completo}`} onClick={() => onEditar(membro)}>Adicionar</button>
      : <span className="equipe-nao-informado">Não informado</span>}</dd>
  </div>
  return <div className="equipe-detalhes">
    <section className="equipe-detalhes-bloco">
      <h4>Contato</h4>
      <dl>{campo('E-mail', membro.email_contato)}{campo('Tel/WhatsApp', membro.telefone)}</dl>
    </section>
    <section className="equipe-detalhes-bloco">
      <h4>Acesso por clínica</h4>
      <AcessoPorClinica membro={membro} acesso={acesso} contexto={contexto} filtro={filtro} />
    </section>
  </div>
}

export function EquipeListagem(p: Props) {
  const mobile = useMedia('(max-width: 767px)')
  const largo = useMedia('(min-width: 1024px)')
  const [medirLista, larguraLista] = useLarguraElemento()
  // A grade descontando as bordas do cartão.
  const gradeCompleta = larguraLista - 2 >= soma(LARGURAS_LARGO)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([{ id: 'nome', desc: false }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  // Expansão por id da pessoa e sem reinício automático: a linha aberta continua aberta quando a lista recarrega.
  const [expanded, setExpanded] = useState<ExpandedState>({})
  // Renderers stay stable so opening a dialog does not replace its focus trigger.
  const atual = useRef(p)
  atual.current = p
  const ordenacaoAtual = useRef(sorting)
  ordenacaoAtual.current = sorting
  useEffect(() => {
    setPagination(anterior => anterior.pageIndex === 0 ? anterior : { ...anterior, pageIndex: 0 })
  }, [p.contexto, p.busca, p.tipo, p.clinicaFiltro])
  useEffect(() => {
    const ultima = Math.max(0, Math.ceil(p.filtrados.length / pagination.pageSize) - 1)
    setPagination(anterior => anterior.pageIndex <= ultima ? anterior : { ...anterior, pageIndex: ultima })
  }, [p.filtrados.length, pagination.pageSize])
  useEffect(() => {
    setRowSelection(anterior => Object.keys(anterior).length ? {} : anterior)
  }, [p.contexto, p.busca, p.tipo, p.clinicaFiltro, p.membros, pagination.pageIndex, pagination.pageSize, sorting])
  const resumo = resumirEquipe(p.filtrados)
  const carregado = !p.carregando && !p.indisponivel && Boolean(p.contexto)
  // Contagens dos segmentos: mesma filtragem local, com busca e vínculo e sem o tipo.
  const porTipo = useMemo(() => {
    const base = filtrarEquipe(p.membros, p.busca, '', p.clinicaFiltro)
    const contagem: Record<string, number> = { '': base.length }
    for (const t of TIPOS_EQUIPE) contagem[t.valor] = base.filter(m => m.tipo === t.valor).length
    return contagem
  }, [p.membros, p.busca, p.clinicaFiltro])
  const temFiltros = Boolean(normalizarBuscaEquipe(p.busca) || p.tipo || p.clinicaFiltro)
  const clinicasFiltro = p.clinicas.filter(c => c.id === p.contexto || p.membros.some(m => m.clinicas.some(v => v.id === c.id)))
  const acoesCard = (m: MembroEquipe) => <div className="equipe-lista-acoes">
    <button type="button" className="equipe-botao equipe-botao-consulta" aria-label={`Ver cadastro de ${m.nome_completo}`} onClick={() => atual.current.onVer(m)}>Ver cadastro</button>
    {atual.current.proprietaria && <button type="button" className="equipe-botao" disabled={atual.current.bloqueado} aria-label={`Editar cadastro de ${m.nome_completo}`} onClick={() => atual.current.onEditar(m)}>Editar</button>}
  </div>
  const cabecalhoOrdenavel = (id: string, titulo: string) => <button type="button" className="equipe-ordenar-coluna" aria-label={`Ordenar por ${titulo.toLocaleLowerCase('pt-BR')}`} onClick={() => setSorting(anterior => [{ id, desc: anterior[0]?.id === id && !anterior[0].desc }])}>{titulo}<span aria-hidden="true">{ordenacaoAtual.current[0]?.id === id ? ordenacaoAtual.current[0].desc ? ' ↓' : ' ↑' : ' ↕'}</span></button>
  const comparar = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true })
  const larguras = gradeCompleta ? LARGURAS_LARGO : LARGURAS_COMPACTO
  // Com a tabela a 100% da área, as colunas crescem na mesma proporção; o recuo acompanha a coluna Pessoa.
  const recuo = (larguras.expandir + larguras.select) * Math.max(1, (larguraLista - 2) / soma(larguras))
  const esqueleto = (largura: string) => <Skeleton className={`h-4 ${largura}`} />
  const columns = useMemo<ColumnDef<DataGridFeatures, MembroEquipe>[]>(() => [
    { id: 'expandir', header: () => <span className="sr-only">Detalhes</span>, size: larguras.expandir, enableSorting: false, cell: ({ row }) => <BotaoExpandir row={row} />,
      meta: { skeleton: <span />, expandedContent: m => { const a = atual.current; return <Detalhes membro={m} acesso={a.acessos[m.id]} contexto={a.contexto} filtro={a.clinicaFiltro} proprietaria={a.proprietaria} bloqueado={a.bloqueado} onEditar={a.onEditar} /> } } },
    { id: 'select', header: () => <span className="equipe-alvo-selecao"><DataGridTableRowSelectAll /></span>, cell: ({ row }) => <span className="equipe-alvo-selecao"><DataGridTableRowSelect row={row} /></span>, size: larguras.select, enableSorting: false, meta: { skeleton: <span /> } },
    { id: 'nome', accessorFn: m => m.nome_completo, header: () => cabecalhoOrdenavel('nome', 'Pessoa'), size: larguras.nome, sortFn: (a,b) => comparar(a.original.nome_completo,b.original.nome_completo) || comparar(a.id,b.id), cell: ({ row }) => <Pessoa membro={row.original} contexto={atual.current.contexto} foto={atual.current.fotos?.[row.id]} />, meta: { skeleton: <div className="flex items-center gap-2.5"><Skeleton className="size-[34px] rounded-full" />{esqueleto('w-36')}</div> } },
    { id: 'tipo', accessorFn: m => `${rotuloTipoEquipe(m.tipo)} ${m.profissao ?? ''}`, header: () => cabecalhoOrdenavel('tipo', 'Função'), size: larguras.tipo, sortFn: (a,b) => comparar(`${rotuloTipoEquipe(a.original.tipo)} ${a.original.profissao ?? ''}`,`${rotuloTipoEquipe(b.original.tipo)} ${b.original.profissao ?? ''}`) || comparar(a.original.nome_completo,b.original.nome_completo) || comparar(a.id,b.id), cell: ({ row }) => <Funcao membro={row.original} />, meta: { skeleton: esqueleto('w-28') } },
    { id: 'clinicas', header: 'Clínicas', size: larguras.clinicas, enableSorting: false, cell: ({ row }) => <Vinculos membro={row.original} />, meta: { skeleton: esqueleto('w-20') } },
    { id: 'acesso', header: 'Acesso', size: larguras.acesso, enableSorting: false, cell: ({ row }) => { const a = atual.current; const selo = seloPessoa(row.original, a.acessos[row.id], a.contexto); return <Selo tom={selo.tom} testId={`selo-acesso-${row.id}`}>{selo.texto}</Selo> }, meta: { skeleton: esqueleto('w-24') } },
    { id: 'acoes', header: () => <span className="sr-only">Ações</span>, size: larguras.acoes, enableSorting: false, cell: ({ row }) => { const a = atual.current; return <AcoesLinha membro={row.original} proprietaria={a.proprietaria} bloqueado={a.bloqueado} onVer={a.onVer} onEditar={a.onEditar} /> }, meta: { skeleton: esqueleto('w-24') } },
  // Current props/state are read through the refs above; columns define structure only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [larguras])
  const table = useTable({
    features: dataGridFeatures, columns, data: p.carregando ? [] : p.filtrados,
    getRowId: m => m.id, rowCount: p.filtrados.length,
    state: { pagination, sorting, rowSelection, expanded, columnVisibility: { clinicas: gradeCompleta } },
    enableRowSelection: true, autoResetPageIndex: false, autoResetExpanded: false,
    getRowCanExpand: () => true,
    onPaginationChange: setPagination, onSortingChange: setSorting, onRowSelectionChange: setRowSelection, onExpandedChange: setExpanded,
  })
  const linhas = table.getRowModel().rows
  const selecionadas = Object.values(rowSelection).filter(Boolean).length

  const novoMembro = p.proprietaria
    ? <button type="button" className="equipe-botao equipe-botao-principal equipe-botao-novo" disabled={p.bloqueado || p.carregando || !p.contexto} onClick={p.onNovo}>Novo membro</button>
    : null
  const contagem = (valor: TipoMembroEquipe | '') => carregado ? porTipo[valor] : null

  const vazio = !p.carregando && (p.indisponivel || !p.contexto || p.filtrados.length === 0)

  return <section ref={medirLista} className={`equipe-listagem${gradeCompleta ? '' : ' equipe-listagem-compacta'}`} style={{ '--equipe-recuo': `${Math.round(recuo)}px` } as CSSProperties} aria-labelledby="equipe-listagem-titulo">
    <h2 id="equipe-listagem-titulo" className="sr-only">Equipe &amp; acessos</h2>
    {novoMembro && (p.acaoCabecalho ? createPortal(novoMembro, p.acaoCabecalho) : <div className="equipe-acoes-topo">{novoMembro}</div>)}
    {!p.proprietaria && <p className="equipe-orientacao-lista">Gestão da equipe restrita à Proprietária/Administradora; a consulta de profissionais continua na aba Profissionais.</p>}

    <div className="equipe-barra-filtros" role="search" aria-label="Filtros da equipe">
      <div className="equipe-busca">
        <label htmlFor="equipe-busca" className="sr-only">Buscar por nome, cargo ou profissão</label>
        <Search aria-hidden="true" className="equipe-busca-icone" />
        <input id="equipe-busca" type="search" value={p.busca} onChange={e => p.onBusca(e.target.value)} placeholder="Buscar por nome, cargo ou profissão" />
      </div>
      {largo
        ? <fieldset className="equipe-segmentos">
          <legend className="sr-only">Filtrar por tipo de membro</legend>
          {SEGMENTOS.map(s => {
            const n = contagem(s.valor)
            return <label key={s.valor || 'todos'} className="equipe-segmento">
              <input type="radio" name="equipe-tipo-segmento" className="sr-only" value={s.valor} checked={p.tipo === s.valor} onChange={() => p.onTipo(s.valor)} />
              <span>{s.rotulo}</span>
              {n !== null && <><span aria-hidden="true">·</span> <span className="equipe-segmento-numero" data-testid={`equipe-segmento-${s.valor || 'todos'}`}>{n}</span></>}
            </label>
          })}
        </fieldset>
        : <div className="equipe-campo-compacto">
          <label htmlFor="equipe-tipo" className="sr-only">Tipo de membro</label>
          <select id="equipe-tipo" value={p.tipo} onChange={e => p.onTipo(e.target.value as TipoMembroEquipe | '')}>
            <option value="">Todos os tipos{carregado ? ` · ${porTipo['']}` : ''}</option>
            {TIPOS_EQUIPE.map(t => <option key={t.valor} value={t.valor}>{t.rotulo}{carregado ? ` · ${porTipo[t.valor]}` : ''}</option>)}
          </select>
        </div>}
      <div className="equipe-campo-compacto">
        <label htmlFor="equipe-clinica" className="sr-only">Vínculo cadastral com clínica</label>
        <select id="equipe-clinica" value={p.clinicaFiltro} onChange={e => p.onClinica(e.target.value)}>
          <option value="">Vínculo: Todas as clínicas</option>{clinicasFiltro.map(c => <option key={c.id} value={c.id}>Vínculo: {c.nome}</option>)}
        </select>
      </div>
      {temFiltros && <button type="button" className="equipe-botao equipe-botao-limpar" onClick={p.onLimpar}>Limpar filtros</button>}
    </div>

    {carregado && <p className="sr-only" role="status">
      <span data-testid="equipe-contagem-pessoas">{resumo.pessoas}</span> {resumo.pessoas === 1 ? 'pessoa no resultado' : 'pessoas no resultado'}: <span data-testid="equipe-contagem-saude">{resumo.saude}</span> de saúde e <span data-testid="equipe-contagem-demais">{resumo.demais}</span> de outras funções.
    </p>}

    {vazio
      ? p.indisponivel ? <div className="equipe-lista-vazia" role="status"><h3>{p.semPermissao ? 'Sem permissão para consultar a equipe' : 'Consulta da equipe não concluída'}</h3><p>Confira a orientação acima antes de consultar novamente.</p><button type="button" className="equipe-botao" onClick={p.onReconsultar}>Tentar novamente</button></div>
        : !p.contexto ? <div className="equipe-lista-vazia" role="status"><h3>Selecione uma clínica</h3><p>A equipe será carregada somente depois que uma unidade autorizada estiver ativa.</p></div>
          : p.membros.length === 0 ? <div className="equipe-lista-vazia" role="status"><h3>Nenhum membro cadastrado neste escopo</h3><p>A consulta desta clínica não retornou pessoas cadastradas.</p></div>
            : <div className="equipe-lista-vazia" role="status"><h3>Nenhuma pessoa encontrada</h3>{temFiltros && <button type="button" className="equipe-botao" onClick={p.onLimpar}>Limpar filtros</button>}</div>
      : mobile && p.carregando ? <div className="equipe-carregando" aria-label="Carregando equipe" aria-busy="true">{[1,2,3].map(n => <div key={n} className="animate-pulse" />)}</div>
        : <DataGrid table={table} recordCount={p.filtrados.length} isLoading={p.carregando} tableLabel={`Equipe de ${p.clinicaAtual}`} rowTestId={m => `equipe-pessoa-${m.id}`} tableClassNames={{ base: 'equipe-tabela equipe-reui-tabela' }} i18n={{ labels: { selectRow: 'Selecionar pessoa nesta página', selectAll: 'Selecionar todas as pessoas desta página', rowsPerPage: 'Pessoas por página', previousPage: 'Página anterior', nextPage: 'Próxima página', goToPage: n => `Ir para a página ${n}`, paginationInfo: ({from,to,count}) => `${from}–${to} de ${count}`, paginationEllipsis: 'Mais páginas', loading: 'Carregando equipe', empty: 'Nenhuma pessoa neste resultado' } }}>
          {mobile && <div className="equipe-grade-controles">
            <div className="equipe-filtro-campo"><label htmlFor="equipe-ordenacao">Ordenar por</label><select id="equipe-ordenacao" value={`${sorting[0]?.id ?? 'nome'}-${sorting[0]?.desc ? 'desc' : 'asc'}`} onChange={e => { const [id,direcao] = e.target.value.split('-'); setSorting([{id,desc:direcao === 'desc'}]) }}><option value="nome-asc">Nome: A–Z</option><option value="nome-desc">Nome: Z–A</option><option value="tipo-asc">Tipo e profissão: A–Z</option><option value="tipo-desc">Tipo e profissão: Z–A</option></select></div>
            <div className="equipe-selecao-pagina"><span className="equipe-alvo-selecao"><DataGridTableRowSelectAll /></span><span>Selecionar esta página</span></div>
          </div>}
          {selecionadas > 0 && <div className="equipe-selecao-barra"><p role="status">{selecionadas} {selecionadas === 1 ? 'pessoa selecionada' : 'pessoas selecionadas'}</p><span>Seleção visual desta página, sem operação em lote.</span></div>}
          <div className={`equipe-grade-conjunto${mobile ? ' equipe-grade-mobile' : ''}`}>
            {mobile ? <ul className="equipe-cards" aria-label="Pessoas da equipe">{linhas.map(row => { const m = row.original; return <li key={m.id} className="equipe-card" data-testid={`equipe-pessoa-${m.id}`} data-row-id={m.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
              <div className="equipe-selecao-pessoa"><span className="equipe-alvo-selecao"><DataGridTableRowSelect row={row} /></span><span>Selecionar pessoa</span></div>
              <Pessoa membro={m} contexto={p.contexto} foto={p.fotos?.[m.id]} mobile /><Funcao membro={m} />
              <div className="equipe-card-vinculos"><h4>Clínicas vinculadas</h4><Vinculos membro={m} /></div>
              <div className="equipe-card-estados"><h4>Conta e acesso</h4><AcessoPorClinica membro={m} acesso={p.acessos[m.id]} contexto={p.contexto} filtro={p.clinicaFiltro} /></div>
              {acoesCard(m)}
            </li> })}</ul>
              : <div className="equipe-tabela-area" tabIndex={0} role="region" aria-label={p.carregando ? 'Carregando equipe' : 'Tabela da equipe com rolagem horizontal'} aria-busy={p.carregando || undefined}><DataGridContainer><DataGridScrollArea orientation="horizontal"><DataGridTable /></DataGridScrollArea></DataGridContainer></div>}
            <DataGridPagination sizes={[10,25,50]} className="equipe-paginacao" />
          </div>
        </DataGrid>}

    <p className="equipe-info-lista"><Info aria-hidden="true" className="equipe-info-icone" /><span>Cadastro e acesso são independentes: salvar uma pessoa aqui não cria login. A lista mostra quem tem vínculo com <strong role="status" aria-label="Clínica ativa">{p.clinicaAtual}</strong>.</span></p>
  </section>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTable, type ColumnDef, type PaginationState, type RowSelectionState, type SortingState } from '@tanstack/react-table'
import { DataGrid, DataGridContainer, dataGridFeatures, type DataGridFeatures } from '../../components/reui/data-grid/data-grid'
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from '../../components/reui/data-grid/data-grid-table'
import { DataGridPagination } from '../../components/reui/data-grid/data-grid-pagination'
import { DataGridScrollArea } from '../../components/reui/data-grid/data-grid-scroll-area'
import { TIPOS_EQUIPE, rotuloTipoEquipe, type ClinicaEquipe, type MembroEquipe, type TipoMembroEquipe } from '../../lib/equipe'
import type { AcessoEquipe } from '../../lib/equipeAcessos'
import { estadosListaEquipe, normalizarBuscaEquipe, resumirEquipe } from '../../lib/equipeLista'
import { EquipeAvatar, type FotoEquipeDisponivel } from '../../components/cadastros/EquipeAvatar'

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
}

function Pessoa({ membro, contexto, foto, mobile = false }: { membro: MembroEquipe; contexto: string | null; foto?: FotoEquipeDisponivel; mobile?: boolean }) {
  return <div className="equipe-pessoa">
    <EquipeAvatar membroId={membro.id} clinicaId={contexto} nome={membro.nome_completo} foto={foto} />
    <div>{mobile ? <h3>{membro.nome_completo}</h3> : <strong>{membro.nome_completo}</strong>}
      {membro.email_contato && <p className="equipe-email-contato">{membro.email_contato}</p>}
    </div>
  </div>
}

function Funcao({ membro }: { membro: MembroEquipe }) {
  const cargo = normalizarBuscaEquipe(membro.cargo)
  const secundarios = [rotuloTipoEquipe(membro.tipo), membro.profissao].filter((texto): texto is string => Boolean(texto))
    .filter((texto, i, todos) => normalizarBuscaEquipe(texto) !== cargo && todos.findIndex(t => normalizarBuscaEquipe(t) === normalizarBuscaEquipe(texto)) === i)
  return <div className="equipe-funcao"><p>{membro.cargo}</p>{secundarios.length > 0 && <p>{secundarios.join(' · ')}</p>}</div>
}

function Estados({ membro, acesso, contexto, filtro }: { membro: MembroEquipe; acesso: AcessoEquipe | null | undefined; contexto: string | null; filtro: string }) {
  const estado = estadosListaEquipe(membro, acesso, contexto, filtro)
  return <div className="equipe-estados" data-testid={`resumo-acesso-${membro.id}`}>
    <p>{estado.conta}</p>
    {estado.clinicas.map(c => <div key={c.id} className="equipe-estado-clinica">
      <p><span className="equipe-clinica-nome">{c.nome}</span><span aria-hidden="true"> · </span><span className={c.status.startsWith('Acesso ativo') ? 'equipe-estado-ativo' : ''}>{c.status === 'Acesso ativo nesta clínica' ? 'Acesso ativo' : c.status}</span>{c.papel && <span> · {c.papel}</span>}</p>
    </div>)}
  </div>
}

export function EquipeListagem(p: Props) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([{ id: 'nome', desc: false }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
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
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const atualizar = () => setMobile(media.matches)
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])
  const resumo = resumirEquipe(p.filtrados)
  const temFiltros = Boolean(normalizarBuscaEquipe(p.busca) || p.tipo || p.clinicaFiltro)
  const clinicasFiltro = p.clinicas.filter(c => c.id === p.contexto || p.membros.some(m => m.clinicas.some(v => v.id === c.id)))
  const clinicaSelecionada = clinicasFiltro.find(c => c.id === p.clinicaFiltro)?.nome
  const acoes = (m: MembroEquipe) => <div className="equipe-lista-acoes">
    <button type="button" className="equipe-botao equipe-botao-consulta" aria-label={`Ver cadastro de ${m.nome_completo}`} onClick={() => atual.current.onVer(m)}>Ver cadastro</button>
    {atual.current.proprietaria && <button type="button" className="equipe-botao" disabled={atual.current.bloqueado} aria-label={`Editar cadastro de ${m.nome_completo}`} onClick={() => atual.current.onEditar(m)}>Editar</button>}
  </div>
  const vinculos = (m: MembroEquipe) => <ul className="equipe-vinculos" aria-label="Vínculos cadastrais">
    {m.clinicas.map(c => <li key={c.id}>{c.nome}</li>)}
  </ul>
  const estados = (m: MembroEquipe) => <Estados membro={m} acesso={atual.current.acessos[m.id]} contexto={atual.current.contexto} filtro={atual.current.clinicaFiltro} />
  const cabecalhoOrdenavel = (id: string, titulo: string) => <button type="button" className="equipe-ordenar-coluna" aria-label={`Ordenar por ${titulo.toLocaleLowerCase('pt-BR')}`} onClick={() => setSorting(anterior => [{ id, desc: anterior[0]?.id === id && !anterior[0].desc }])}>{titulo}<span aria-hidden="true">{ordenacaoAtual.current[0]?.id === id ? ordenacaoAtual.current[0].desc ? ' ↓' : ' ↑' : ' ↕'}</span></button>
  const comparar = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true })
  const columns = useMemo<ColumnDef<DataGridFeatures, MembroEquipe>[]>(() => [
    { id: 'select', header: () => <span className="equipe-alvo-selecao"><DataGridTableRowSelectAll /></span>, cell: ({ row }) => <span className="equipe-alvo-selecao"><DataGridTableRowSelect row={row} /></span>, size: 48, enableSorting: false },
    { id: 'nome', accessorFn: m => m.nome_completo, header: () => cabecalhoOrdenavel('nome', 'Pessoa'), size: 245, sortFn: (a,b) => comparar(a.original.nome_completo,b.original.nome_completo) || comparar(a.id,b.id), cell: ({ row }) => <Pessoa membro={row.original} contexto={atual.current.contexto} foto={atual.current.fotos?.[row.id]} /> },
    { id: 'tipo', accessorFn: m => `${rotuloTipoEquipe(m.tipo)} ${m.profissao ?? ''}`, header: () => cabecalhoOrdenavel('tipo', 'Função'), size: 190, sortFn: (a,b) => comparar(`${rotuloTipoEquipe(a.original.tipo)} ${a.original.profissao ?? ''}`,`${rotuloTipoEquipe(b.original.tipo)} ${b.original.profissao ?? ''}`) || comparar(a.original.nome_completo,b.original.nome_completo) || comparar(a.id,b.id), cell: ({ row }) => <Funcao membro={row.original} /> },
    { id: 'clinicas', header: 'Clínicas vinculadas', size: 150, enableSorting: false, cell: ({ row }) => vinculos(row.original) },
    { id: 'estados', header: 'Conta e acesso', size: 245, enableSorting: false, cell: ({ row }) => estados(row.original) },
    { id: 'acoes', header: 'Ações', size: 190, enableSorting: false, cell: ({ row }) => acoes(row.original) },
  // Current props/state are read through the refs above; columns define structure only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])
  const table = useTable({
    features: dataGridFeatures, columns, data: p.filtrados,
    getRowId: m => m.id, rowCount: p.filtrados.length,
    state: { pagination, sorting, rowSelection },
    enableRowSelection: true, autoResetPageIndex: false,
    onPaginationChange: setPagination, onSortingChange: setSorting, onRowSelectionChange: setRowSelection,
  })
  const linhas = table.getRowModel().rows
  const selecionadas = Object.values(rowSelection).filter(Boolean).length

  return <section className="equipe-listagem" aria-labelledby="equipe-listagem-titulo">
    <header className="equipe-listagem-cabecalho">
      <div>
        <h2 id="equipe-listagem-titulo" className="texto-titulo-secao">Equipe &amp; acessos</h2>
        <p>Encontre pessoas e confira seus vínculos. Cadastro e acesso ao sistema são independentes.</p>
        <p className="equipe-contexto" role="status" aria-label="Clínica ativa"><span>Clínica ativa:</span> <strong>{p.clinicaAtual}</strong></p>
      </div>
      {p.proprietaria && <button type="button" className="equipe-botao equipe-botao-principal" disabled={p.bloqueado || p.carregando || !p.contexto} onClick={p.onNovo}>Novo membro</button>}
    </header>
    {!p.proprietaria && <p className="equipe-orientacao-lista">A gestão da equipe é restrita à Proprietária/Administradora. As consultas deste perfil respeitam as autorizações existentes; a consulta operacional de profissionais continua na aba Profissionais.</p>}

    <div className="equipe-filtros" role="search" aria-label="Filtros da equipe">
      <div className="equipe-filtro-campo"><label htmlFor="equipe-busca">Buscar por nome, cargo ou profissão</label>
        <input id="equipe-busca" type="search" value={p.busca} onChange={e => p.onBusca(e.target.value)} placeholder="Ex.: nome, recepção ou medicina" />
      </div>
      <div className="equipe-filtro-campo"><label htmlFor="equipe-tipo">Tipo de membro</label>
        <select id="equipe-tipo" value={p.tipo} onChange={e => p.onTipo(e.target.value as TipoMembroEquipe | '')}>
          <option value="">Todos os tipos</option>{TIPOS_EQUIPE.map(t => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
        </select>
      </div>
      <div className="equipe-filtro-campo"><label htmlFor="equipe-clinica">Vínculo cadastral com clínica</label>
        <select id="equipe-clinica" value={p.clinicaFiltro} onChange={e => p.onClinica(e.target.value)}>
          <option value="">Todas as clínicas autorizadas nos vínculos</option>{clinicasFiltro.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <p className="equipe-escopo">A consulta reúne pessoas vinculadas a <strong>{p.clinicaAtual}</strong>. O filtro de vínculo restringe essas pessoas; não muda a clínica ativa nem consulta a equipe completa de outra unidade.</p>
      <div className="equipe-filtros-aplicados">
        <p aria-live="polite">{temFiltros ? 'Filtros aplicados:' : 'Sem filtros adicionais'}
          {normalizarBuscaEquipe(p.busca) && <span className="equipe-filtro-aplicado">Busca: {p.busca.trim()}</span>}
          {p.tipo && <span className="equipe-filtro-aplicado">{rotuloTipoEquipe(p.tipo)}</span>}
          {p.clinicaFiltro && <span className="equipe-filtro-aplicado">Vínculo: {clinicaSelecionada ?? 'clínica selecionada'}</span>}
        </p>
        <button type="button" className="equipe-botao" disabled={!temFiltros} onClick={p.onLimpar}>Limpar filtros</button>
      </div>
    </div>

    {!p.carregando && !p.indisponivel && p.contexto && <>
      <dl className="equipe-indicadores" aria-label="Resumo do resultado filtrado">
        <div><dt>Pessoas encontradas</dt><dd data-testid="equipe-contagem-pessoas">{resumo.pessoas}</dd></div>
        <div><dt>Profissionais de saúde</dt><dd data-testid="equipe-contagem-saude">{resumo.saude}</dd></div>
        <div><dt>Demais funções</dt><dd data-testid="equipe-contagem-demais">{resumo.demais}</dd></div>
      </dl>
      <p className="equipe-contagem" role="status">{resumo.pessoas} {resumo.pessoas === 1 ? 'pessoa no resultado' : 'pessoas no resultado'} desta consulta. Contagens seguem os filtros e não repetem pessoas com dois vínculos.</p>
    </>}

    {p.carregando ? <div className="equipe-carregando" aria-label="Carregando equipe" aria-busy="true">{[1,2,3].map(n => <div key={n} className="animate-pulse" />)}</div>
      : p.indisponivel ? <div className="equipe-lista-vazia" role="status"><h3>{p.semPermissao ? 'Sem permissão para consultar a equipe' : 'Consulta da equipe não concluída'}</h3><p>Confira a orientação acima antes de consultar novamente.</p><button type="button" className="equipe-botao" onClick={p.onReconsultar}>Tentar novamente</button></div>
        : !p.contexto ? <div className="equipe-lista-vazia" role="status"><h3>Selecione uma clínica</h3><p>A equipe será carregada somente depois que uma unidade autorizada estiver ativa.</p></div>
          : p.filtrados.length === 0 ? <div className="equipe-lista-vazia" role="status"><h3>{p.membros.length === 0 ? 'Nenhum membro cadastrado neste escopo' : 'Nenhum resultado para os filtros'}</h3><p>{p.membros.length === 0 ? 'A consulta desta clínica não retornou pessoas cadastradas.' : 'Experimente outro nome, cargo ou profissão, ou limpe os filtros.'}</p>{temFiltros && <button type="button" className="equipe-botao" onClick={p.onLimpar}>Limpar filtros</button>}</div>
            : <DataGrid table={table} recordCount={p.filtrados.length} tableLabel={`Equipe de ${p.clinicaAtual}`} rowTestId={m => `equipe-pessoa-${m.id}`} tableClassNames={{ base: 'equipe-tabela equipe-reui-tabela' }} i18n={{ labels: { selectRow: 'Selecionar pessoa nesta página', selectAll: 'Selecionar todas as pessoas desta página', rowsPerPage: 'Pessoas por página', previousPage: 'Página anterior', nextPage: 'Próxima página', goToPage: n => `Ir para a página ${n}`, paginationInfo: ({from,to,count}) => `${from}–${to} de ${count} pessoas desta consulta`, paginationEllipsis: 'Mais páginas', loading: 'Carregando equipe', empty: 'Nenhuma pessoa neste resultado' } }}>
              <div className="equipe-grade-controles">
                {mobile && <div className="equipe-filtro-campo"><label htmlFor="equipe-ordenacao">Ordenar por</label><select id="equipe-ordenacao" value={`${sorting[0]?.id ?? 'nome'}-${sorting[0]?.desc ? 'desc' : 'asc'}`} onChange={e => { const [id,direcao] = e.target.value.split('-'); setSorting([{id,desc:direcao === 'desc'}]) }}><option value="nome-asc">Nome: A–Z</option><option value="nome-desc">Nome: Z–A</option><option value="tipo-asc">Tipo e profissão: A–Z</option><option value="tipo-desc">Tipo e profissão: Z–A</option></select></div>}
                <div className="equipe-selecao-resumo"><p role="status">{selecionadas} {selecionadas === 1 ? 'pessoa selecionada' : 'pessoas selecionadas'}</p><p>Seleção visual desta página. Nenhuma operação em lote.</p>{mobile && <div className="equipe-selecao-pagina"><span className="equipe-alvo-selecao"><DataGridTableRowSelectAll /></span><span>Selecionar esta página</span></div>}</div>
              </div>
              <div className={`equipe-grade-conjunto${mobile ? ' equipe-grade-mobile' : ''}`}>
              {mobile ? <ul className="equipe-cards" aria-label="Pessoas da equipe">{linhas.map(row => { const m = row.original; return <li key={m.id} className="equipe-card" data-testid={`equipe-pessoa-${m.id}`} data-row-id={m.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
              <div className="equipe-selecao-pessoa"><span className="equipe-alvo-selecao"><DataGridTableRowSelect row={row} /></span><span>Selecionar pessoa</span></div>
              <Pessoa membro={m} contexto={p.contexto} foto={p.fotos?.[m.id]} mobile /><Funcao membro={m} />
              <div className="equipe-card-vinculos"><h4>Clínicas vinculadas</h4>{vinculos(m)}</div>
              <div className="equipe-card-estados"><h4>Conta e acesso</h4>{estados(m)}</div>
              {acoes(m)}
            </li> })}</ul>
              : <div><p className="equipe-tabela-orientacao">Se necessário, deslize a tabela para ver todas as colunas. As ações permanecem à direita.</p><div className="equipe-tabela-area" tabIndex={0} role="region" aria-label="Tabela da equipe com rolagem horizontal"><DataGridContainer><DataGridScrollArea orientation="horizontal"><DataGridTable /></DataGridScrollArea></DataGridContainer></div></div>}
              <DataGridPagination sizes={[10,25,50]} className="equipe-paginacao" />
              </div>
            </DataGrid>}
    <p className="equipe-orientacao-lista">A conta pode existir sem acesso à clínica. Convites e papéis detalhados são conferidos ao abrir a ficha; informação não confirmada não significa ausência de acesso.</p>
    <p className="equipe-orientacao-lista">Contas antigas de recepção e administração não são convertidas automaticamente em funcionários. Cadastrar a pessoa aqui não cria outro login.</p>
  </section>
}

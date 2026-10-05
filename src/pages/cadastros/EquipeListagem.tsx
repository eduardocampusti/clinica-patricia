import { useEffect, useState } from 'react'
import { TIPOS_EQUIPE, rotuloTipoEquipe, type ClinicaEquipe, type MembroEquipe, type TipoMembroEquipe } from '../../lib/equipe'
import type { AcessoEquipe } from '../../lib/equipeAcessos'
import { estadosListaEquipe, normalizarBuscaEquipe, resumirEquipe } from '../../lib/equipeLista'

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
}

function Estados({ membro, acesso, contexto, filtro }: { membro: MembroEquipe; acesso: AcessoEquipe | null | undefined; contexto: string | null; filtro: string }) {
  const estado = estadosListaEquipe(membro, acesso, contexto, filtro)
  return <div className="equipe-estados" data-testid={`resumo-acesso-${membro.id}`}>
    <span className="equipe-selo">Pessoa cadastrada</span>
    <p>{estado.conta}</p>
    {estado.clinicas.map(c => <div key={c.id} className="equipe-estado-clinica">
      <p className="equipe-clinica-nome">{c.nome}</p>
      <p className={c.status.startsWith('Acesso ativo') ? 'equipe-estado-ativo' : ''}>{c.status}</p>
      {c.papel && <p>{c.papel}</p>}
    </div>)}
  </div>
}

export function EquipeListagem(p: Props) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
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
    <button type="button" className="equipe-botao equipe-botao-consulta" aria-label={`Ver cadastro de ${m.nome_completo}`} onClick={() => p.onVer(m)}>Ver cadastro</button>
    {p.proprietaria && <button type="button" className="equipe-botao" disabled={p.bloqueado} aria-label={`Editar cadastro de ${m.nome_completo}`} onClick={() => p.onEditar(m)}>Editar</button>}
  </div>
  const vinculos = (m: MembroEquipe) => <ul className="equipe-vinculos" aria-label="Vínculos cadastrais">
    {m.clinicas.map(c => <li key={c.id}>{c.nome}</li>)}
  </ul>
  const estados = (m: MembroEquipe) => <Estados membro={m} acesso={p.acessos[m.id]} contexto={p.contexto} filtro={p.clinicaFiltro} />

  return <section className="equipe-listagem" aria-labelledby="equipe-listagem-titulo">
    <header className="equipe-listagem-cabecalho">
      <div>
        <h2 id="equipe-listagem-titulo" className="texto-titulo-secao">Equipe &amp; acessos</h2>
        <p>Encontre pessoas e confira seus vínculos. Cadastro e acesso ao sistema são independentes.</p>
        <p className="equipe-contexto"><span>Clínica ativa:</span> <strong>{p.clinicaAtual}</strong></p>
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
      <dl className="equipe-indicadores" aria-label="Resumo das pessoas exibidas">
        <div><dt>Pessoas exibidas</dt><dd data-testid="equipe-contagem-pessoas">{resumo.pessoas}</dd></div>
        <div><dt>Profissionais de saúde</dt><dd data-testid="equipe-contagem-saude">{resumo.saude}</dd></div>
        <div><dt>Demais funções</dt><dd data-testid="equipe-contagem-demais">{resumo.demais}</dd></div>
      </dl>
      <p className="equipe-contagem" role="status">{resumo.pessoas} {resumo.pessoas === 1 ? 'pessoa no resultado' : 'pessoas no resultado'} desta consulta. Contagens seguem os filtros e não repetem pessoas com dois vínculos.</p>
    </>}

    {p.carregando ? <div className="equipe-carregando" aria-label="Carregando equipe" aria-busy="true">{[1,2,3].map(n => <div key={n} className="animate-pulse" />)}</div>
      : p.indisponivel ? <div className="equipe-lista-vazia" role="status"><h3>{p.semPermissao ? 'Sem permissão para consultar a equipe' : 'Consulta da equipe não concluída'}</h3><p>Confira a orientação acima antes de consultar novamente.</p><button type="button" className="equipe-botao" onClick={p.onReconsultar}>Tentar novamente</button></div>
        : !p.contexto ? <div className="equipe-lista-vazia" role="status"><h3>Selecione uma clínica</h3><p>A equipe será carregada somente depois que uma unidade autorizada estiver ativa.</p></div>
          : p.filtrados.length === 0 ? <div className="equipe-lista-vazia" role="status"><h3>{p.membros.length === 0 ? 'Nenhum membro cadastrado neste escopo' : 'Nenhum resultado para os filtros'}</h3><p>{p.membros.length === 0 ? 'A consulta desta clínica não retornou pessoas cadastradas.' : 'Experimente outro nome, cargo ou profissão, ou limpe os filtros.'}</p>{temFiltros && <button type="button" className="equipe-botao" onClick={p.onLimpar}>Limpar filtros</button>}</div>
            : mobile ? <ul className="equipe-cards" aria-label="Pessoas da equipe">{p.filtrados.map(m => <li key={m.id} className="equipe-card" data-testid={`equipe-pessoa-${m.id}`}>
              <div className="equipe-pessoa"><h3>{m.nome_completo}</h3><p>{m.cargo}</p><p>{rotuloTipoEquipe(m.tipo)}{m.profissao ? ` · ${m.profissao}` : ''}</p></div>
              <div className="equipe-card-vinculos"><h4>Clínicas vinculadas</h4>{vinculos(m)}</div>
              <div className="equipe-card-estados"><h4>Cadastro, conta e acesso</h4>{estados(m)}</div>
              {acoes(m)}
            </li>)}</ul>
              : <div><p className="equipe-tabela-orientacao">Se necessário, deslize a tabela para ver todas as colunas. As ações permanecem à direita.</p><div className="equipe-tabela-area" tabIndex={0} role="region" aria-label="Tabela da equipe com rolagem horizontal"><table className="equipe-tabela" aria-label={`Equipe de ${p.clinicaAtual}`}>
                <caption className="sr-only">Pessoas, funções, vínculos cadastrais, conta e acesso por clínica; ações de consulta e edição</caption>
                <thead><tr><th scope="col">Pessoa e cargo</th><th scope="col">Tipo e profissão</th><th scope="col">Clínicas vinculadas</th><th scope="col">Cadastro, conta e acesso</th><th scope="col">Ações</th></tr></thead>
                <tbody>{p.filtrados.map(m => <tr key={m.id} data-testid={`equipe-pessoa-${m.id}`}><td className="equipe-pessoa"><strong>{m.nome_completo}</strong><p>{m.cargo}</p></td><td>{rotuloTipoEquipe(m.tipo)}{m.profissao && <p>{m.profissao}</p>}</td><td>{vinculos(m)}</td><td>{estados(m)}</td><td>{acoes(m)}</td></tr>)}</tbody>
              </table></div></div>}
    <p className="equipe-orientacao-lista">A conta pode existir sem acesso à clínica. Convites e papéis detalhados são conferidos ao abrir a ficha; informação não confirmada não significa ausência de acesso.</p>
    <p className="equipe-orientacao-lista">Contas antigas de recepção e administração não são convertidas automaticamente em funcionários. Cadastrar a pessoa aqui não cria outro login.</p>
  </section>
}

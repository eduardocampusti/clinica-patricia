import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FILTROS_PACIENTES_INICIAIS, ORDENACOES_PACIENTES, filtrosAtivosPacientes, removerFiltroPaciente, validarFiltrosPacientes, type FiltrosPacientes, type OrdemPacientes } from '../../lib/pacienteLista'

interface Props {
  ordem: OrdemPacientes; onOrdem: (ordem: OrdemPacientes) => void
  filtros: FiltrosPacientes; onFiltros: (filtros: FiltrosPacientes) => void
  total: number | null
}
export default function ControlesListaPacientes({ ordem, onOrdem, filtros, onFiltros, total }: Props) {
  const [aberto, setAberto] = useState(false)
  const [rascunho, setRascunho] = useState(filtros)
  const [erro, setErro] = useState<string | null>(null)
  const resumo = filtrosAtivosPacientes(filtros)
  const gatilho = useRef<HTMLButtonElement>(null)
  useEffect(() => { setRascunho(filtros); setErro(null) }, [filtros])
  function remover(campo: keyof FiltrosPacientes) {
    onFiltros(removerFiltroPaciente(filtros, campo))
    gatilho.current?.focus()
  }
  function aplicar(event: FormEvent) {
    event.preventDefault()
    const mensagem = validarFiltrosPacientes(rascunho)
    setErro(mensagem)
    if (!mensagem) onFiltros({ ...rascunho })
  }
  function limpar() {
    setRascunho(FILTROS_PACIENTES_INICIAIS)
    onFiltros(FILTROS_PACIENTES_INICIAIS)
    setErro(null)
  }
  return <>
    <div className="pacientes-lista-cabecalho">
      <div><h2 id="pacientes-lista-titulo">Pacientes cadastrados</h2>
        <p aria-live="polite">{total === null ? 'Aguardando consulta' : `${total} ${total === 1 ? 'paciente encontrado' : 'pacientes encontrados'}`}</p></div>
      <div className="pacientes-lista-controles">
        <label className="pacientes-ordenar">Ordenar por
          <select value={ordem} onChange={(e) => onOrdem(e.target.value as OrdemPacientes)}>
            {Object.entries(ORDENACOES_PACIENTES).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        </label>
        <button ref={gatilho} type="button" className="pacientes-botao-secundario" aria-expanded={aberto} aria-controls="pacientes-filtros" onClick={() => setAberto(!aberto)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 17h16M9 4v6M15 14v6" /></svg>
          Filtros{resumo.length > 0 && <span className="pacientes-filtros-contagem">{resumo.length}</span>}
        </button>
      </div>
    </div>
    {aberto && <form id="pacientes-filtros" className="pacientes-filtros" onSubmit={aplicar} noValidate aria-label="Filtros complementares">
      <div className="pacientes-filtros-campos">
        <fieldset><legend>Período de cadastro</legend><div className="pacientes-filtros-par">
          <label>Data inicial<input type="date" value={rascunho.inicio} onChange={(e) => setRascunho({ ...rascunho, inicio: e.target.value })} /></label>
          <label>Data final<input type="date" value={rascunho.fim} onChange={(e) => setRascunho({ ...rascunho, fim: e.target.value })} /></label>
        </div><small>Inclui o último dia inteiro · horário da Bahia</small></fieldset>
        <fieldset><legend>Faixa etária</legend><div className="pacientes-filtros-par">
          <label>Idade mínima<input type="number" min="0" step="1" inputMode="numeric" value={rascunho.idadeMin} onChange={(e) => setRascunho({ ...rascunho, idadeMin: e.target.value })} /></label>
          <label>Idade máxima<input type="number" min="0" step="1" inputMode="numeric" value={rascunho.idadeMax} onChange={(e) => setRascunho({ ...rascunho, idadeMax: e.target.value })} /></label>
        </div><small>Anos completos; nascimento ausente não tem idade.</small></fieldset>
        <label className="pacientes-filtros-nascimento">Data de nascimento<select aria-label="Data de nascimento" value={rascunho.nascimento} onChange={(e) => setRascunho({ ...rascunho, nascimento: e.target.value as FiltrosPacientes['nascimento'] })} aria-describedby="pacientes-filtros-ajuda">
          <option value="todos">Todos</option><option value="informado">Informada</option><option value="ausente">Não informada</option>
        </select><small id="pacientes-filtros-ajuda">“Não informada” não combina com faixa etária.</small></label>
      </div>
      {erro && <p className="pacientes-filtros-erro" role="alert">{erro}</p>}
      <div className="pacientes-filtros-acoes"><button className="pacientes-botao-primario" type="submit">Aplicar filtros</button><button className="pacientes-botao-secundario" type="button" onClick={limpar}>Limpar filtros</button></div>
    </form>}
    {resumo.length > 0 && <div className="pacientes-filtros-resumo" role="group" aria-label="Filtros aplicados"><strong>Aplicados</strong>{resumo.map(({ campo, texto }) => <button type="button" key={campo} className="pacientes-filtro-removivel" aria-label={`Remover filtro: ${texto}`} onClick={() => remover(campo)}>{texto}<span aria-hidden="true">×</span></button>)}<button type="button" className="pacientes-link" onClick={() => { limpar(); gatilho.current?.focus() }}>Limpar filtros complementares</button></div>}
  </>
}

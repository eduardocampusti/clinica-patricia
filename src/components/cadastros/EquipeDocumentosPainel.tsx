import { useEffect, useRef, useState, useId, type FormEvent } from 'react';
import { FeedbackAlert } from '../feedback/FeedbackAlert';
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog';
import { operarFicha, baixarDocumento, validarMetaDocumento, erroFicha, CATEGORIAS_DOCUMENTO, conferirDocumento, type FichaCompleta, type DocumentoFicha, type MetaDocumento } from '../../lib/equipeFicha';
import type { ClinicaEquipe } from '../../lib/equipe';
import type { EstadoRecursoFicha } from './EquipeFotoPainel';
import { UnidadesFicha } from './EquipeFichaCampos';
const rotulos: Record<string, string> = { identificacao: 'Identificação', endereco: 'Endereço', contrato: 'Contrato', aditivo: 'Aditivo', admissao: 'Admissão', formacao: 'Formação', dependentes: 'Dependentes', termo_interno: 'Termo interno', equipamentos: 'Equipamentos', aso: 'ASO', capacitacao: 'Capacitação' };
const rotulo = (s: string) => rotulos[s] ?? s.replaceAll('_', ' ');
export function EquipeDocumentosPainel({ membroId, clinicaId, clinicas, ficha, onConfirmado, onEstado }: {
    membroId: string;
    clinicaId: string;
    clinicas: ClinicaEquipe[];
    ficha: FichaCompleta;
    onConfirmado: (d: unknown) => void;
    onEstado: (id: string, s: EstadoRecursoFicha) => void;
}) {
    const [meta, setMeta] = useState<MetaDocumento>({ categoria: '', contrato_id: null, emissao: '', validade: '', unidades: [clinicaId], substitui_id: null }), [arquivo, setArquivo] = useState<File | null>(null), [estado, setEstado] = useState<'nenhum' | 'selecionado' | 'enviando' | 'disponivel' | 'falha'>('nenhum'), [erro, setErro] = useState<string | null>(null), [ocupado, setOcupado] = useState(false), [tentativa, setTentativa] = useState<string | null>(null), [incerto, setIncerto] = useState(false), [operacaoBloqueada, setOperacaoBloqueada] = useState(false), [conferindo, setConferindo] = useState<DocumentoFicha | null>(null), [fonte, setFonte] = useState(''), [resultado, setResultado] = useState('conferido'), [confirmar, setConfirmar] = useState<DocumentoFicha | null>(null), [descartar, setDescartar] = useState(false), [mostrarAntigos, setMostrarAntigos] = useState(false), [visualizacao, setVisualizacao] = useState<{
        url: string;
        mime: string;
        nome: string;
    } | null>(null);
    const campoId = useId();
    const gen = useRef(0), trava = useRef(false), urlRef = useRef<string | null>(null), input = useRef<HTMLInputElement>(null);
    const alterado = Boolean(arquivo || fonte || tentativa || meta.categoria || meta.contrato_id || meta.emissao || meta.validade || meta.substitui_id || meta.unidades.length !== 1 || meta.unidades[0] !== clinicaId);
    useEffect(() => { onEstado('documentos', { ocupado, alterado }); return () => onEstado('documentos', { ocupado: false, alterado: false }); }, [ocupado, alterado, onEstado]);
    useEffect(() => () => {
        gen.current++;
        if (urlRef.current)
            URL.revokeObjectURL(urlRef.current);
    }, []);
    function limpar() {
        setArquivo(null);
        setTentativa(null);
        setIncerto(false);
        setEstado('nenhum');
        setErro(null);
        setDescartar(false);
        setMeta({ categoria: '', contrato_id: null, emissao: '', validade: '', unidades: [clinicaId], substitui_id: null });
        if (input.current)
            input.current.value = '';
    }
    function substituir(d: DocumentoFicha) {
        if (arquivo || ocupado)
            return;
        setMeta({ categoria: d.categoria, contrato_id: d.contrato_id, emissao: '', validade: '', unidades: d.unidades, substitui_id: d.id });
        setEstado('nenhum');
        setErro(null);
        input.current?.focus();
    }
    async function salvar(e: FormEvent) {
        e.preventDefault();
        if (!arquivo || trava.current || incerto)
            return;
        let m: MetaDocumento;
        try {
            m = validarMetaDocumento(meta);
        }
        catch (e) {
            setErro(erroFicha(e).message);
            return;
        }
        const id = tentativa ?? crypto.randomUUID();
        setTentativa(id);
        trava.current = true;
        setOcupado(true);
        setEstado('enviando');
        setErro(null);
        const g = gen.current;
        try {
            const d = await operarFicha(membroId, clinicaId, 'documento_salvar', { id, meta: m }, arquivo);
            if (g === gen.current) {
                onConfirmado(d);
                setArquivo(null);
                if (input.current)
                    input.current.value = '';
                setEstado('disponivel');
                setTentativa(null);
                setIncerto(false);
                setMeta({ categoria: '', contrato_id: null, emissao: '', validade: '', unidades: [clinicaId], substitui_id: null });
            }
        }
        catch (e) {
            if (g === gen.current) {
                const er = erroFicha(e, true);
                setErro(er.message);
                setEstado('falha');
                setIncerto(['RESULTADO_INCERTO', 'CONFLITO', 'NAO_AUTORIZADO'].includes(er.codigo));
            }
        }
        finally {
            if (g === gen.current) {
                setOcupado(false);
                trava.current = false;
            }
        }
    }
    async function recuperar() {
        if (!tentativa || trava.current)
            return;
        trava.current = true;
        setOcupado(true);
        const g = gen.current;
        try {
            const d = await operarFicha(membroId, clinicaId, 'documento_recuperar', { id: tentativa });
            if (g === gen.current) {
                onConfirmado(d);
                setArquivo(null);
                setMeta({ categoria: '', contrato_id: null, emissao: '', validade: '', unidades: [clinicaId], substitui_id: null });
                setEstado('disponivel');
                setTentativa(null);
                setIncerto(false);
                setErro(null);
                if (input.current)
                    input.current.value = '';
            }
        }
        catch (e) {
            if (g === gen.current) {
                const er = erroFicha(e, true);
                setErro(er.codigo === 'DADOS_INVALIDOS' ? 'Ainda falta confirmar o arquivo/registro. Tentar novamente usará a mesma tentativa, sem criar outra versão.' : er.message);
                setIncerto(er.codigo !== 'DADOS_INVALIDOS');
            }
        }
        finally {
            if (g === gen.current) {
                setOcupado(false);
                trava.current = false;
            }
        }
    }
    async function operar(d: DocumentoFicha, acao: 'documento_conferir' | 'documento_arquivar') {
        if (trava.current || operacaoBloqueada)
            return;
        trava.current = true;
        setOcupado(true);
        setErro(null);
        const g = gen.current;
        try {
            const confirmado = await operarFicha(membroId, clinicaId, acao, { id: d.id, revisao: d.revisao, fonte, situacao: resultado });
            if (g === gen.current) {
                const v = conferirDocumento(confirmado, membroId);
                if (v.id !== d.id || v.revisao !== d.revisao + 1)
                    throw erroFicha(null, true);
                onConfirmado(v);
                setConferindo(null);
                setFonte('');
                setConfirmar(null);
            }
        }
        catch (e) {
            if (g === gen.current) {
                const er = erroFicha(e, true);
                setErro(er.message);
                setOperacaoBloqueada(['CONFLITO', 'RESULTADO_INCERTO', 'NAO_AUTORIZADO'].includes(er.codigo));
            }
        }
        finally {
            if (g === gen.current) {
                setOcupado(false);
                trava.current = false;
            }
        }
    }
    async function ler(d: DocumentoFicha, download: boolean) {
        if (trava.current)
            return;
        trava.current = true;
        setOcupado(true);
        setErro(null);
        const g = gen.current;
        try {
            const blob = await baixarDocumento(membroId, clinicaId, d.id);
            if (g !== gen.current)
                return;
            const url = URL.createObjectURL(blob), nome = `documento-${d.categoria}-v${d.versao}.${d.mime === 'application/pdf' ? 'pdf' : 'jpg'}`;
            if (download) {
                const a = document.createElement('a');
                a.href = url;
                a.download = nome;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            }
            else {
                if (urlRef.current)
                    URL.revokeObjectURL(urlRef.current);
                urlRef.current = url;
                setVisualizacao({ url, mime: d.mime, nome });
            }
        }
        catch (e) {
            if (g === gen.current)
                setErro(erroFicha(e).message);
        }
        finally {
            if (g === gen.current) {
                setOcupado(false);
                trava.current = false;
            }
        }
    }
    function fecharPrevia() {
        if (urlRef.current)
            URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        setVisualizacao(null);
    }
    return <div className="equipe-documentos">
  <p>Arquivos privados; escopo escolhido explicitamente. Armazenamento e conferência são etapas separadas. Não inclua diagnósticos, prontuário ocupacional, credenciais ou histórico completo de empregos.</p>
  <form onSubmit={salvar} aria-label="Adicionar documento privado" className="equipe-ficha-grupo">
   <h4>{meta.substitui_id ? 'Substituir documento — versão anterior será preservada' : 'Adicionar documento privado'}</h4>
   <UnidadesFicha clinicas={clinicas} unidades={meta.unidades} disabled={ocupado || Boolean(tentativa) || Boolean(meta.substitui_id)} onChange={unidades => setMeta({ ...meta, unidades })}/>
   <div className="equipe-ficha-campos"><label htmlFor={campoId + 'categoria'}>Categoria<select aria-label="Categoria" id={campoId + 'categoria'} value={meta.categoria} disabled={ocupado || Boolean(tentativa) || Boolean(meta.substitui_id)} onChange={e => setMeta({ ...meta, categoria: e.target.value })}><option value="">Selecione</option>{CATEGORIAS_DOCUMENTO.filter(c => ficha.pode_ocupacional || !['aso', 'capacitacao'].includes(c)).map(c => <option key={c} value={c}>{rotulo(c)}</option>)}</select></label><label htmlFor={campoId + 'contrato'}>Contrato associado (se necessário)<select id={campoId + 'contrato'} value={meta.contrato_id ?? ''} disabled={ocupado || Boolean(tentativa) || Boolean(meta.substitui_id)} onChange={e => setMeta({ ...meta, contrato_id: e.target.value || null })}><option value="">Ligado à pessoa, no escopo escolhido</option>{ficha.registros.filter(r => r.tipo === 'contrato').map(r => <option key={r.id} value={r.id}>{String(r.dados.cargo)} · início {String(r.dados.admissao)}</option>)}</select></label><label>Emissão (se informada)<input type="date" value={meta.emissao} disabled={ocupado || Boolean(tentativa)} onChange={e => setMeta({ ...meta, emissao: e.target.value })}/></label><label>Validade (somente quando existir)<input type="date" value={meta.validade} disabled={ocupado || Boolean(tentativa)} onChange={e => setMeta({ ...meta, validade: e.target.value })}/></label><label className="equipe-campo-amplo">Arquivo PDF, JPEG ou PNG<input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" disabled={ocupado || Boolean(tentativa && arquivo)} onChange={e => {
            const f = e.target.files?.[0] ?? null;
            setErro(null);
            if (f && (f.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(f.type))) {
                setErro('Formato ou tamanho não permitido. O servidor também validará o conteúdo real.');
                setArquivo(null);
                setEstado('falha');
                return;
            }
            setArquivo(f);
            setEstado(f ? 'selecionado' : 'nenhum');
            if (!tentativa)
                setTentativa(null);
        }}/></label></div>
   <p role="status">{estado === 'selecionado' ? 'Arquivo selecionado — ainda não salvo.' : estado === 'enviando' ? 'Enviando e confirmando arquivo e registro…' : estado === 'disponivel' ? 'Documento salvo: arquivo e registro confirmados. Conferência permanece separada.' : estado === 'falha' ? 'Documento não confirmado nesta tentativa.' : 'Nenhum arquivo selecionado.'}</p><p>A validação de formato não certifica ausência de malware. PDF com conteúdo ativo é recusado; confira a procedência do documento.</p>
   <div className="equipe-ficha-acoes"><button type="submit" disabled={!arquivo || ocupado || incerto || !meta.categoria}>{ocupado ? 'Processando…' : tentativa ? 'Tentar novamente a mesma tentativa' : 'Salvar documento'}</button>{tentativa && <button type="button" disabled={ocupado} onClick={() => void recuperar()}>Consultar resultado da tentativa</button>}<button type="button" disabled={ocupado} onClick={() => alterado ? setDescartar(true) : limpar()}>Cancelar documento</button></div>
   {tentativa && <p>Os metadados desta tentativa estão fixos. Falha parcial não apaga a versão anterior; a recuperação usa o mesmo identificador. Candidatas privadas expiradas podem ser limpas, sem remover documentos confirmados.</p>}
  </form>
  {operacaoBloqueada && <p>Reconsulte as informações adicionais antes de outra conferência ou arquivamento. O preenchimento foi preservado.</p>}{erro && <FeedbackAlert variant="destructive" title="Documento não confirmado ou indisponível" description={erro}/>}
  {ficha.tentativas?.filter(t => !ficha.documentos.some(d => d.id === t.id)).map(t => <div key={t.id} className="equipe-ficha-item"><p>Tentativa pendente de confirmação · {rotulo(t.meta.categoria)} · {new Date(t.criado_em).toLocaleDateString('pt-BR')}. Não é documento salvo.</p><button type="button" disabled={ocupado || Boolean(arquivo)} onClick={() => { setTentativa(t.id); setMeta(t.meta); setIncerto(true); setEstado('falha'); setErro('Tentativa retomada. Consulte o resultado antes de reenviar o arquivo.'); }}>Retomar tentativa pendente</button></div>)}
  {visualizacao && <div className="equipe-documento-previa"><h4>{visualizacao.nome}</h4><p>Leitura autorizada desta versão.</p>{visualizacao.mime === 'image/jpeg' ? <img src={visualizacao.url} alt="Documento autorizado"/> : <iframe title="Documento PDF autorizado" sandbox="allow-same-origin" src={visualizacao.url}/>}<button type="button" onClick={fecharPrevia}>Fechar visualização</button></div>}
  <label className="equipe-ficha-unidades"><input type="checkbox" checked={mostrarAntigos} onChange={e => setMostrarAntigos(e.target.checked)}/>Mostrar versões anteriores e documentos arquivados</label>
  {!ficha.documentos.filter(d => mostrarAntigos || !d.arquivado).length && <p>Nenhum documento confirmado no escopo desta consulta.</p>}
  {ficha.documentos.filter(d => mostrarAntigos || !d.arquivado).map(d => <article key={d.id} className="equipe-ficha-item"><h4>{rotulo(d.categoria)} · versão {d.versao}{d.arquivado ? ' · arquivado / substituído' : ''}</h4><p>Armazenamento: disponível · Conferência: {rotulo(d.conferencia)}</p><p>{d.mime === 'application/pdf' ? 'PDF' : 'Imagem'} · {Math.ceil(d.tamanho / 1024)} KB · envio {new Date(d.enviado_em).toLocaleDateString('pt-BR')} · autor registrado</p><p>Escopo: {d.unidades.map(id => clinicas.find(c => c.id === id)?.nome ?? 'Unidade autorizada').join(' · ')}{d.validade ? ` · validade ${d.validade}` : ''}</p>{d.conferido_em && <p>Conferência {new Date(d.conferido_em).toLocaleDateString('pt-BR')} · responsável registrado · fonte: {d.fonte}</p>}
   <div className="equipe-ficha-acoes"><button type="button" disabled={ocupado} onClick={() => void ler(d, false)}>Visualizar versão {d.versao}</button><button type="button" disabled={ocupado} onClick={() => void ler(d, true)}>Baixar versão {d.versao}</button>{!d.arquivado && <><button type="button" disabled={ocupado || Boolean(arquivo)} onClick={() => substituir(d)}>Substituir versão {d.versao}</button><button type="button" disabled={ocupado} onClick={() => { setConferindo(d); setFonte(''); setResultado('conferido'); }}>Conferir versão {d.versao}</button><button type="button" disabled={ocupado} onClick={() => setConfirmar(d)}>Arquivar versão {d.versao}</button></>}</div>
  </article>)}
  {conferindo && <form aria-label="Conferir documento salvo" onSubmit={e => { e.preventDefault(); void operar(conferindo, 'documento_conferir'); }} className="equipe-ficha-grupo"><h4>Conferir {rotulo(conferindo.categoria)} · versão exata {conferindo.versao}</h4><label>Fonte / critério da conferência<input value={fonte} disabled={ocupado} maxLength={250} onChange={e => setFonte(e.target.value)}/></label><label>Resultado da conferência<select value={resultado} disabled={ocupado} onChange={e => setResultado(e.target.value)}><option value="conferido">Conferido</option><option value="necessita_correcao">Necessita correção</option></select></label><p>Conferente e data serão registrados pelo servidor. Substituição exige nova conferência.</p><div className="equipe-ficha-acoes"><button type="submit" disabled={ocupado || operacaoBloqueada || !fonte.trim()}>Salvar conferência do documento</button><button type="button" disabled={ocupado} onClick={() => { setConferindo(null); setFonte(''); }}>Cancelar conferência documental</button></div></form>}
  <details><summary>Recuperação de temporários</summary><p>Remove somente candidatas expiradas desta pessoa e tentativa autorizada, após prova de não referência. Não exclui arquivos confirmados ou versões antigas.</p><button type="button" disabled={ocupado || Boolean(tentativa)} onClick={async () => {
            if (trava.current)
                return;
            trava.current = true;
            setOcupado(true);
            const g = gen.current;
            try {
                const resultado = await operarFicha(membroId, clinicaId, 'documento_limpar', { id: crypto.randomUUID() });
                if (g === gen.current)
                    setErro(resultado && typeof resultado === 'object' && 'limpeza_pendente' in resultado && resultado.limpeza_pendente ? 'A limpeza não foi confirmada. Consulte novamente; documentos confirmados foram preservados.' : null);
            }
            catch (e) {
                if (g === gen.current)
                    setErro(erroFicha(e, true).message);
            }
            finally {
                if (g === gen.current) {
                    setOcupado(false);
                    trava.current = false;
                }
            }
        }}>Limpar candidatas expiradas autorizadas</button></details>
  <ConfirmacaoDialog open={Boolean(confirmar)} onOpenChange={open => {
            if (!open)
                setConfirmar(null);
        }} title="Arquivar esta versão?" description="O arquivo e o histórico serão preservados. Arquivar não é excluir definitivamente." confirmLabel="Arquivar documento" onConfirm={() => confirmar && void operar(confirmar, 'documento_arquivar')} tone="warning" disabled={ocupado || operacaoBloqueada}/>
  <ConfirmacaoDialog open={descartar} onOpenChange={setDescartar} title="Descartar seleção de documento?" description="O arquivo selecionado será retirado do rascunho. Se houve envio sem confirmação, a tentativa poderá ser consultada após reabrir; um resultado incerto não comprova ausência de gravação." confirmLabel="Descartar seleção" onConfirm={limpar} tone="warning" disabled={ocupado}/>
 </div>;
}

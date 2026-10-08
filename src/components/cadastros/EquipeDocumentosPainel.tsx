import { useEffect, useRef, useState, useId, type FormEvent } from 'react';
import { FeedbackAlert } from '../feedback/FeedbackAlert';
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog';
import { operarFicha, baixarDocumento, validarMetaDocumento, erroFicha, CATEGORIAS_DOCUMENTO, conferirDocumento, type FichaCompleta, type DocumentoFicha, type MetaDocumento } from '../../lib/equipeFicha';
import type { ClinicaEquipe } from '../../lib/equipe';
import type { EstadoRecursoFicha } from './EquipeFotoPainel';
import { UnidadesFicha } from './EquipeFichaCampos';
import { Download, Ellipsis, Eye, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Selo } from './EquipeSelos';
import { NotaInfo, Recolhivel } from './EquipeFichaUI';
import { formatarData, nomeCurtoClinica } from '../../lib/equipeApresentacao';
const rotulos: Record<string, string> = { identificacao: 'Identificação', endereco: 'Endereço', contrato: 'Contrato', aditivo: 'Aditivo', admissao: 'Admissão', formacao: 'Formação', dependentes: 'Dependentes', termo_interno: 'Termo interno', equipamentos: 'Equipamentos', aso: 'ASO', capacitacao: 'Capacitação' };
const rotulo = (s: string) => rotulos[s] ?? s.replaceAll('_', ' ');
// Rótulos dos três estados de conferência que o dado já admite (aguardando, conferido, necessita_correcao).
const CONFERENCIA_DOCUMENTO: Record<string, string> = { aguardando: 'Aguardando', conferido: 'Conferido', necessita_correcao: 'Necessita correção' };
export function EquipeDocumentosPainel({ membroId, clinicaId, clinicas, ficha, onConfirmado, onEstado }: {
    membroId: string;
    clinicaId: string;
    clinicas: ClinicaEquipe[];
    ficha: FichaCompleta;
    onConfirmado: (d: unknown) => void;
    onEstado: (id: string, s: EstadoRecursoFicha) => void;
}) {
    const [meta, setMeta] = useState<MetaDocumento>({ categoria: '', contrato_id: null, emissao: '', validade: '', unidades: [clinicaId], substitui_id: null }), [arquivo, setArquivo] = useState<File | null>(null), [estado, setEstado] = useState<'nenhum' | 'selecionado' | 'enviando' | 'disponivel' | 'falha'>('nenhum'), [erro, setErro] = useState<string | null>(null), [ocupado, setOcupado] = useState(false), [tentativa, setTentativa] = useState<string | null>(null), [incerto, setIncerto] = useState(false), [operacaoBloqueada, setOperacaoBloqueada] = useState(false), [conferindo, setConferindo] = useState<DocumentoFicha | null>(null), [fonte, setFonte] = useState(''), [resultado, setResultado] = useState('conferido'), [confirmar, setConfirmar] = useState<DocumentoFicha | null>(null), [descartar, setDescartar] = useState(false), [envioAberto, setEnvioAberto] = useState(false), [visualizacao, setVisualizacao] = useState<{
        url: string;
        mime: string;
        nome: string;
    } | null>(null);
    const campoId = useId();
    // Menus montados dentro da ficha (<dialog> modal), para continuarem clicáveis.
    const [raiz, setRaizDocumentos] = useState<HTMLDivElement | null>(null);
    const gen = useRef(0), trava = useRef(false), urlRef = useRef<string | null>(null), input = useRef<HTMLInputElement>(null);
    const alterado = Boolean(arquivo || fonte || tentativa || meta.categoria || meta.contrato_id || meta.emissao || meta.validade || meta.substitui_id || meta.unidades.length !== 1 || meta.unidades[0] !== clinicaId);
    useEffect(() => { onEstado('documentos', { ocupado, alterado }); return () => onEstado('documentos', { ocupado: false, alterado: false }); }, [ocupado, alterado, onEstado]);
    useEffect(() => () => {
        gen.current++;
        if (urlRef.current)
            URL.revokeObjectURL(urlRef.current);
    }, []);
    useEffect(() => { if (envioAberto && meta.substitui_id) input.current?.focus(); }, [envioAberto, meta.substitui_id]);
    function limpar() {
        setEnvioAberto(false);
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
        setEnvioAberto(true);
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
    async function limparTemporarios() {
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
    }
    const tomConferencia = (c: string) => c === 'conferido' ? 'ativo' as const : c === 'necessita_correcao' ? 'erro' as const : 'alerta' as const;
    const nomeClinica = (id: string) => clinicas.find(c => c.id === id)?.nome ?? 'Unidade autorizada';
    // Uma linha por documento: tabela no computador, cartão no celular. Mesmas ações e permissões de antes.
    const listar = (documentos: DocumentoFicha[]) => <>{documentos.map(d => <article key={d.id} className="equipe-ficha-item equipe-documento-linha">
   <div className="equipe-documento-celula equipe-documento-principal"><FileText aria-hidden="true" className="equipe-documento-icone"/><div className="min-w-0"><h4>{rotulo(d.categoria)} · versão {d.versao}{d.arquivado ? ' · arquivado / substituído' : ''}</h4><p>{d.mime === 'application/pdf' ? 'PDF' : 'Imagem'} · {Math.ceil(d.tamanho / 1024)} KB · envio {new Date(d.enviado_em).toLocaleDateString('pt-BR')}{d.validade ? ` · validade ${formatarData(d.validade)}` : ''} · autor registrado</p>{d.conferido_em && <p>Conferência {new Date(d.conferido_em).toLocaleDateString('pt-BR')} · responsável registrado · fonte: {d.fonte}</p>}</div></div>
   <div className="equipe-documento-celula" data-rotulo="Vale para"><span className="sr-only">Vale para: </span><span className="equipe-documento-pilulas">{d.unidades.map(id => <span key={id} className="equipe-pilula" title={nomeClinica(id)}>{nomeCurtoClinica(nomeClinica(id))}</span>)}</span></div>
   <div className="equipe-documento-celula" data-rotulo="Armazenamento"><Selo tom="ativo"><span className="sr-only">Armazenamento: </span>Disponível</Selo></div>
   <div className="equipe-documento-celula" data-rotulo="Conferência"><Selo tom={tomConferencia(d.conferencia)}><span className="sr-only">Conferência: </span>{CONFERENCIA_DOCUMENTO[d.conferencia] ?? rotulo(d.conferencia)}</Selo></div>
   <div className="equipe-documento-celula equipe-documento-acoes"><button type="button" className="equipe-icone-acao" aria-label={`Visualizar versão ${d.versao}`} title={`Visualizar versão ${d.versao}`} disabled={ocupado} onClick={() => void ler(d, false)}><Eye size={18} aria-hidden="true"/></button><button type="button" className="equipe-icone-acao" aria-label={`Baixar versão ${d.versao}`} title={`Baixar versão ${d.versao}`} disabled={ocupado} onClick={() => void ler(d, true)}><Download size={18} aria-hidden="true"/></button>{!d.arquivado && <DropdownMenu><DropdownMenuTrigger className="equipe-icone-acao" aria-label={`Mais ações para ${rotulo(d.categoria)} versão ${d.versao}`} title="Mais ações"><Ellipsis size={18} aria-hidden="true"/></DropdownMenuTrigger><DropdownMenuContent align="end" container={raiz}><DropdownMenuItem disabled={ocupado || Boolean(arquivo)} onClick={() => substituir(d)}>Substituir versão {d.versao}</DropdownMenuItem><DropdownMenuItem disabled={ocupado} onClick={() => { setConferindo(d); setFonte(''); setResultado('conferido'); }}>Conferir versão {d.versao}</DropdownMenuItem><DropdownMenuItem disabled={ocupado} onClick={() => setConfirmar(d)}>Arquivar versão {d.versao}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div>
  </article>)}</>;
    const cabecalhoTabela = <div className="equipe-documentos-cabecalho" aria-hidden="true"><span>Documento</span><span>Vale para</span><span>Armazenamento</span><span>Conferência</span><span>Ações</span></div>;
    const anteriores = ficha.documentos.filter(d => d.arquivado);
    return <div className="equipe-documentos" ref={setRaizDocumentos}>
  <div className="equipe-documentos-barra">
   <button type="button" className="equipe-botao-secundario" hidden={envioAberto} onClick={() => setEnvioAberto(true)}>Adicionar documento</button>
   <DropdownMenu><DropdownMenuTrigger className="equipe-icone-acao" aria-label="Mais ações de documentos" title="Mais ações de documentos" disabled={ocupado || Boolean(tentativa)}><Ellipsis size={18} aria-hidden="true"/></DropdownMenuTrigger><DropdownMenuContent align="end" container={raiz}><DropdownMenuItem disabled={ocupado || Boolean(tentativa)} onClick={() => void limparTemporarios()}>Limpar candidatas expiradas autorizadas</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </div>
  <form hidden={!envioAberto} onSubmit={salvar} aria-label="Adicionar documento privado" className="equipe-ficha-grupo equipe-cartao">
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
   {arquivo && <p className="equipe-documento-arquivo">Arquivo selecionado: <strong>{arquivo.name}</strong></p>}
   <p role="status">{estado === 'selecionado' ? 'Arquivo selecionado — ainda não salvo.' : estado === 'enviando' ? 'Enviando e confirmando arquivo e registro…' : estado === 'disponivel' ? 'Documento salvo: arquivo e registro confirmados. Conferência permanece separada.' : estado === 'falha' ? 'Documento não confirmado nesta tentativa.' : 'Nenhum arquivo selecionado.'}</p><NotaInfo>A validação de formato não certifica ausência de malware. PDF com conteúdo ativo é recusado; confira a procedência do documento.</NotaInfo>
   <div className="equipe-ficha-acoes"><button type="submit" disabled={!arquivo || ocupado || incerto || !meta.categoria}>{ocupado ? 'Processando…' : tentativa ? 'Tentar novamente a mesma tentativa' : 'Salvar documento'}</button>{tentativa && <button type="button" disabled={ocupado} onClick={() => void recuperar()}>Consultar resultado da tentativa</button>}<button type="button" disabled={ocupado} onClick={() => alterado ? setDescartar(true) : limpar()}>Cancelar documento</button></div>
   {tentativa && <p>Os metadados desta tentativa estão fixos. Falha parcial não apaga a versão anterior; a recuperação usa o mesmo identificador. Candidatas privadas expiradas podem ser limpas, sem remover documentos confirmados.</p>}
  </form>
  {operacaoBloqueada && <p>Reconsulte as informações adicionais antes de outra conferência ou arquivamento. O preenchimento foi preservado.</p>}{erro && <FeedbackAlert variant="destructive" title="Documento não confirmado ou indisponível" description={erro}/>}
  {ficha.tentativas?.filter(t => !ficha.documentos.some(d => d.id === t.id)).map(t => <div key={t.id} className="equipe-ficha-item equipe-cartao"><p>Tentativa pendente de confirmação · {rotulo(t.meta.categoria)} · {new Date(t.criado_em).toLocaleDateString('pt-BR')}. Não é documento salvo.</p><button type="button" disabled={ocupado || Boolean(arquivo)} onClick={() => { setEnvioAberto(true); setTentativa(t.id); setMeta(t.meta); setIncerto(true); setEstado('falha'); setErro('Tentativa retomada. Consulte o resultado antes de reenviar o arquivo.'); }}>Retomar tentativa pendente</button></div>)}
  {visualizacao && <div className="equipe-documento-previa equipe-cartao"><h4>{visualizacao.nome}</h4><p>Leitura autorizada desta versão.</p>{visualizacao.mime === 'image/jpeg' ? <img src={visualizacao.url} alt="Documento autorizado"/> : <iframe title="Documento PDF autorizado" sandbox="allow-same-origin" src={visualizacao.url}/>}<button type="button" onClick={fecharPrevia}>Fechar visualização</button></div>}
  <div className="equipe-cartao equipe-documentos-tabela">
   <div className="equipe-documentos-lista">{cabecalhoTabela}{!ficha.documentos.some(d => !d.arquivado) && <p className="equipe-texto-discreto">Nenhum documento atual confirmado no escopo desta consulta.</p>}{listar(ficha.documentos.filter(d => !d.arquivado))}</div>
   <Recolhivel titulo={`Versões anteriores e documentos arquivados (${anteriores.length})`} className="equipe-documentos-anteriores"><NotaInfo>Documentos distintos permanecem separados. A substituição identifica a versão anterior do mesmo documento.</NotaInfo>{listar(anteriores)}</Recolhivel>
  </div>
  {conferindo && <form aria-label="Conferir documento salvo" onSubmit={e => { e.preventDefault(); void operar(conferindo, 'documento_conferir'); }} className="equipe-ficha-grupo equipe-cartao"><h4>Conferir {rotulo(conferindo.categoria)} · versão exata {conferindo.versao}</h4><label>Fonte / critério da conferência<input value={fonte} disabled={ocupado} maxLength={250} onChange={e => setFonte(e.target.value)}/></label><label>Resultado da conferência<select value={resultado} disabled={ocupado} onChange={e => setResultado(e.target.value)}><option value="conferido">Conferido</option><option value="necessita_correcao">Necessita correção</option></select></label><p>Conferente e data serão registrados pelo servidor. Substituição exige nova conferência.</p><div className="equipe-ficha-acoes"><button type="submit" disabled={ocupado || operacaoBloqueada || !fonte.trim()}>Salvar conferência do documento</button><button type="button" disabled={ocupado} onClick={() => { setConferindo(null); setFonte(''); }}>Cancelar conferência documental</button></div></form>}
  <NotaInfo>Arquivos privados, com escopo escolhido explicitamente; armazenamento e conferência são etapas separadas. Não inclua diagnósticos, prontuário ocupacional, credenciais ou histórico completo de empregos. “Limpar candidatas expiradas” remove só candidatas expiradas desta pessoa, sem excluir arquivos confirmados ou versões antigas.</NotaInfo>
  <ConfirmacaoDialog open={Boolean(confirmar)} onOpenChange={open => {
            if (!open)
                setConfirmar(null);
        }} title="Arquivar esta versão?" description="O arquivo e o histórico serão preservados. Arquivar não é excluir definitivamente." confirmLabel="Arquivar documento" onConfirm={() => confirmar && void operar(confirmar, 'documento_arquivar')} tone="warning" disabled={ocupado || operacaoBloqueada}/>
  <ConfirmacaoDialog open={descartar} onOpenChange={setDescartar} title="Descartar seleção de documento?" description="O arquivo selecionado será retirado do rascunho. Se houve envio sem confirmação, a tentativa poderá ser consultada após reabrir; um resultado incerto não comprova ausência de gravação." confirmLabel="Descartar seleção" onConfirm={limpar} tone="warning" disabled={ocupado}/>
 </div>;
}

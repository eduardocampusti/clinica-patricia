import { useCallback, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, UserRound, BriefcaseBusiness, CalendarDays, GraduationCap, Wallet, Files, KeyRound, History, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { FeedbackAlert } from '../feedback/FeedbackAlert';
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog';
import { buscarFichaCompleta, salvarRegistro, operarFicha, conferirDocumento, conferirRegistro, erroFicha, objeto, pessoalVazio, contratoVazio, formacaoVazia, checklistVazio, pendenciasFicha, type FichaCompleta, type RegistroFicha, type TipoRegistroFicha } from '../../lib/equipeFicha';
import { supabase } from '../../lib/supabase';
import { CamposFicha, GruposFicha, UnidadesFicha } from './EquipeFichaCampos';
import { camposDoTipo, gruposDoTipo, enderecoPeloCep, type OpcoesFicha } from '../../lib/equipeFichaFormulario';
import { EquipeDocumentosPainel } from './EquipeDocumentosPainel';
import type { ClinicaEquipe, DetalheMembroEquipe } from '../../lib/equipe';
import type { EstadoRecursoFicha } from './EquipeFotoPainel';
import type { AcessoEquipe } from '../../lib/equipeAcessos';
import { Selo } from './EquipeSelos';
import { CabecalhoSecao, Esqueleto, NotaInfo, Recolhivel } from './EquipeFichaUI';
import { CartaoContrato, ValorRestrito } from './EquipeFichaContratos';
import { DadosPessoaisCartoes, VisaoGeral } from './EquipeFichaSecoes';
import { secaoDaPendencia, type ResumoAtuacao, type ResumoRecebimento } from '../../lib/equipeApresentacao';
const nomes: Record<TipoRegistroFicha, string> = { pessoal: 'dados pessoais', contrato: 'contrato', formacao: 'formação e registros', empresa: 'empresa contratante', checklist: 'checklist', ocupacional: 'acompanhamento ocupacional' };
const defaults = (t: TipoRegistroFicha): Record<string, unknown> => t === 'pessoal' ? pessoalVazio() : t === 'contrato' ? contratoVazio() : t === 'formacao' ? formacaoVazia() : t === 'empresa' ? { nome: '', cnpj: '' } : t === 'checklist' ? checklistVazio() : { aso_data: '', proxima_avaliacao: '', responsavel: '', documento_id: '', capacitacoes: [] };
function RegistroEditor({ tipo, atual, membro, clinica, clinicas, opcoes, referencia = null, permitido = true, onSalvo, onEstado, apresentacao = 'completa', registrarAbrir, onEditando }: {
    tipo: TipoRegistroFicha;
    atual?: RegistroFicha;
    membro: string;
    clinica: string;
    clinicas: ClinicaEquipe[];
    opcoes: OpcoesFicha;
    referencia?: RegistroFicha | null;
    permitido?: boolean;
    onSalvo: (r: RegistroFicha) => void;
    onEstado: (id: string, s: EstadoRecursoFicha) => void;
    /** 'formulario': resumo e botão ficam no cartão da seção (que abre a edição por registrarAbrir); aqui só o formulário. */
    apresentacao?: 'completa' | 'formulario';
    registrarAbrir?: (abrir: () => void) => void;
    /** Avisa o cartão quando o formulário abre ou fecha, para o resumo dar lugar a ele como antes. */
    onEditando?: (editando: boolean) => void;
}) {
    const novoId = useRef(crypto.randomUUID());
    const ident = atual?.id ?? novoId.current;
    const [dados, setDados] = useState<Record<string, unknown>>(() => structuredClone(atual?.dados ?? defaults(tipo))), [unidades, setUnidades] = useState<string[]>(atual?.unidades ?? referencia?.unidades ?? [clinica]);
    const [editando, setEditando] = useState(false), [sujo, setSujo] = useState(false), [ocupado, setOcupado] = useState(false), [bloqueado, setBloqueado] = useState(false), [erro, setErro] = useState<string | null>(null), [sucesso, setSucesso] = useState<string | null>(null), [confirmar, setConfirmar] = useState(false), [cepMsg, setCepMsg] = useState<string | null>(null);
    const trava = useRef(false), generation = useRef(0), dadosRef = useRef(dados), cepController = useRef<AbortController | null>(null);
    dadosRef.current = dados;
    useEffect(() => { onEstado(ident, { alterado: sujo, ocupado }); return () => onEstado(ident, { alterado: false, ocupado: false }); }, [ident, sujo, ocupado, onEstado]);
    useEffect(() => () => { generation.current++; cepController.current?.abort(); }, []);
    useEffect(() => { registrarAbrir?.(() => { setEditando(true); setSucesso(null); }); }, [registrarAbrir]);
    useEffect(() => { onEditando?.(editando); }, [editando, onEditando]);
    function mudar(novo: Record<string, unknown>) { setDados(novo); setSujo(true); setSucesso(null); setErro(null); }
    function cancelar() { setDados(structuredClone(atual?.dados ?? defaults(tipo))); setUnidades(atual?.unidades ?? referencia?.unidades ?? [clinica]); setSujo(false); setEditando(false); setConfirmar(false); setErro(null); setSucesso(null); setBloqueado(false); cepController.current?.abort(); setCepMsg(null); }
    async function salvar(e: FormEvent) {
        e.preventDefault();
        if (trava.current || bloqueado || !permitido || !sujo)
            return;
        trava.current = true;
        setOcupado(true);
        setErro(null);
        const g = generation.current;
        try {
            const r = await salvarRegistro(membro, clinica, { id: ident, tipo, revisao: atual?.revisao ?? 0, unidades, referencia_id: referencia?.id ?? atual?.referencia_id ?? null }, dados);
            if (g === generation.current) {
                onSalvo(r);
                setDados(structuredClone(r.dados));
                setEditando(false);
                setSujo(false);
                setSucesso('Seção salva e confirmada.');
            }
        }
        catch (e) {
            if (g === generation.current) {
                const er = erroFicha(e, true);
                setErro(er.message);
                if (['CONFLITO', 'RESULTADO_INCERTO', 'NAO_AUTORIZADO'].includes(er.codigo))
                    setBloqueado(true);
            }
        }
        finally {
            if (g === generation.current) {
                setOcupado(false);
                trava.current = false;
            }
        }
    }
    async function cep() {
        const endereco = objeto(dados.endereco);
        const snapshot = JSON.stringify(endereco), g = generation.current;
        cepController.current?.abort();
        const controller = new AbortController();
        cepController.current = controller;
        setCepMsg('Consultando somente o CEP…');
        try {
            const recebido = await enderecoPeloCep(String(endereco.cep), controller.signal);
            if (controller.signal.aborted || g !== generation.current)
                return;
            if (snapshot !== JSON.stringify(objeto(dadosRef.current.endereco))) {
                setCepMsg('Endereço alterado durante a consulta; preenchimento preservado.');
                return;
            }
            if (!recebido) {
                setCepMsg('CEP não encontrado. Preencha manualmente.');
                return;
            }
            mudar({ ...dadosRef.current, endereco: { ...endereco, ...recebido, numero: endereco.numero, complemento: endereco.complemento } });
            setCepMsg('Endereço sugerido pelo CEP; confira e corrija se necessário.');
        }
        catch {
            if (!controller.signal.aborted && g === generation.current)
                setCepMsg('Consulta indisponível. Preencha o endereço manualmente.');
        }
    }
    return <div className="equipe-registro-editor" data-registro-tipo={tipo}>
  {!permitido ? <p>Dados canônicos restritos: é necessário administrar todos os vínculos ativos desta pessoa.</p> : !editando ? apresentacao === 'formulario' ? null : <><ResumoRegistro tipo={tipo} dados={atual?.dados ?? null}/><button type="button" onClick={() => { setEditando(true); setSucesso(null); }}>{atual ? 'Editar' : 'Adicionar'} {nomes[tipo]}</button></> : <form onSubmit={salvar} aria-label={`Salvar ${nomes[tipo]}`}>
   {tipo !== 'pessoal' && tipo !== 'formacao' && <UnidadesFicha clinicas={clinicas} unidades={unidades} disabled={ocupado || Boolean(atual) || Boolean(referencia)} onChange={v => { setUnidades(v); setSujo(true); }}/>}
   <CamposFicha campos={camposDoTipo(tipo)} dados={dados} onChange={mudar} opcoes={{ ...opcoes, unidades: opcoes.unidades.filter(([id]) => unidades.includes(id)) }} disabled={ocupado}/>
   {tipo === 'pessoal' && <><button type="button" disabled={ocupado || String(objeto(dados.endereco).cep).replace(/\D/g, '').length !== 8} onClick={() => void cep()}>Consultar CEP</button>{cepMsg && <p role="status">{cepMsg}</p>}<p>CPF, contatos e nome civil continuam no cadastro existente. E-mail de contato não altera login.</p></>}
   <GruposFicha grupos={gruposDoTipo(tipo)} dados={dados} onChange={mudar} opcoes={{ ...opcoes, unidades: opcoes.unidades.filter(([id]) => unidades.includes(id)), registros: (Array.isArray(dados.registros) ? dados.registros : []).map(v => { const r = objeto(v); return [String(r.id), `${r.conselho}/${r.uf} · ${r.numero}`]; }) }} disabled={ocupado}/>
   {tipo === 'contrato' && <p>CTPS Digital utiliza o CPF protegido do cadastro, sem copiá-lo. Jornada noturna pode ser distribuída em dois dias. Situação contratual não altera login ou acesso.</p>}
   {bloqueado && <p>Reconsulte a ficha antes de outra gravação. O rascunho continua preservado até seu descarte explícito.</p>}
   <div className="equipe-ficha-acoes"><button type="submit" disabled={ocupado || bloqueado || !sujo} aria-busy={ocupado}>{ocupado ? 'Salvando…' : `Salvar ${nomes[tipo]}`}</button><button type="button" disabled={ocupado} onClick={() => sujo ? setConfirmar(true) : cancelar()}>Cancelar {nomes[tipo]}</button></div>
  </form>}
  {erro && <FeedbackAlert variant="destructive" title="Seção não confirmada" description={erro}/>} {sucesso && <FeedbackAlert variant="success" title={sucesso}/>}
  <ConfirmacaoDialog open={confirmar} onOpenChange={setConfirmar} title="Descartar o preenchimento desta seção?" description="A versão confirmada será preservada. O rascunho será descartado." confirmLabel="Descartar rascunho" onConfirm={cancelar} tone="warning" disabled={ocupado}/>
 </div>;
}
function ResumoRegistro({ tipo, dados }: {
    tipo: TipoRegistroFicha;
    dados: Record<string, unknown> | null;
}) {
    if (!dados)
        return <p className="text-sm text-[var(--texto-secundario)]">Nenhuma informação adicional confirmada nesta seção.</p>;
    if (tipo === 'contrato')
        return <dl className="equipe-ficha-resumo"><div><dt>Cargo / vínculo</dt><dd>{String(dados.cargo)} · {String(dados.vinculo).replaceAll('_', ' ')}</dd></div><div><dt>Início / situação</dt><dd>{String(dados.admissao)} · {String(dados.situacao).replaceAll('_', ' ')}</dd></div><div><dt>Vigência desta versão</dt><dd>{String(dados.vigencia)}</dd></div><div><dt>Carga semanal / escala</dt><dd>{String(dados.horas_semanais) || 'Não informada'} · {String(dados.escala) || 'Não informada'}</dd></div><div><dt>Jornada informada</dt><dd>{(dados.jornada as unknown[]).map(v => { const j = objeto(v); return `Dia ${j.dia}: ${j.inicio}–${j.fim}${j.intervalo_inicio ? ` · intervalo ${j.intervalo_inicio}–${j.intervalo_fim}` : ''}`; }).join('; ') || 'Não informada'}</dd></div><div><dt>CTPS</dt><dd>{String(objeto(dados.ctps).modalidade)} · {String(objeto(dados.ctps).conferencia)}</dd></div><div><dt>Remuneração restrita</dt><dd><ValorRestrito valor={() => `${String(dados.remuneracao) || 'Não informado'} · ${String(dados.periodicidade)}`}/></dd></div></dl>;
    if (tipo === 'pessoal')
        return <dl className="equipe-ficha-resumo"><div><dt>Nome social / nascimento</dt><dd>{String(dados.nome_social) || 'Não informado'} · {String(dados.nascimento) || 'Não informado'}</dd></div><div><dt>Endereço</dt><dd>{Object.values(objeto(dados.endereco)).filter(Boolean).join(', ') || 'Não informado'}</dd></div><div><dt>Emergência</dt><dd>{Object.values(objeto(dados.emergencia)).filter(Boolean).join(' · ') || 'Não informado'}</dd></div><div><dt>Escolaridade</dt><dd>{String(dados.escolaridade) || 'Não informada'}</dd></div><div><dt>Identificação documental</dt><dd>{String(dados.documento_tipo) || 'Não informada'}{dados.documento_numero ? ' · número protegido, disponível na edição autorizada' : ''}</dd></div></dl>;
    if (tipo === 'empresa')
        return <p><strong>{String(dados.nome)}</strong>{dados.cnpj ? ' · CNPJ informado (protegido)' : ' · CNPJ não informado'}</p>;
    if (tipo === 'formacao')
        return <div className="text-sm"><p>{(dados.cursos as unknown[]).length} formação(ões), {(dados.registros as unknown[]).length} inscrição(ões), {(dados.especialidades as unknown[]).length} especialidade(s)/área(s).</p>{(dados.registros as unknown[]).map(v => { const r = objeto(v); return <p key={String(r.id)}>{String(r.conselho)}/{String(r.uf)} · {String(r.numero)} · informação: {String(r.situacao_informada)} · conferência: {String(r.conferencia).replaceAll('_', ' ')}{r.conferido_em ? ` · ${String(r.conferido_em).slice(0, 10)} · responsável registrado` : ''}</p>; })}</div>;
    if (tipo === 'checklist')
        return <ul className="text-sm">{(dados.itens as unknown[]).map((v, i) => { const r = objeto(v); return <li key={i}>{String(r.categoria).replaceAll('_', ' ')}: {String(r.exigencia).replaceAll('_', ' ')}{r.finalidade ? ` · ${r.finalidade}` : ''}</li>; })}</ul>;
    return <p>ASO: {String(dados.aso_data) || 'não informado'} · Próxima avaliação: {String(dados.proxima_avaliacao) || 'não definida'}. Sem conteúdo clínico.</p>;
}
function ConferenciaRegistros({ r, membro, clinica, documentos, onSalvo, onEstado }: {
    r: RegistroFicha;
    membro: string;
    clinica: string;
    documentos: [
        string,
        string
    ][];
    onSalvo: (r: RegistroFicha) => void;
    onEstado: (id: string, s: EstadoRecursoFicha) => void;
}) {
    const [selecionado, setSelecionado] = useState(''), [fonte, setFonte] = useState(''), [evidencia, setEvidencia] = useState(''), [situacao, setSituacao] = useState('conferido'), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState<string | null>(null), [bloqueado, setBloqueado] = useState(false);
    const generation = useRef(0), trava = useRef(false);
    useEffect(() => () => { generation.current++; }, []);
    useEffect(() => { onEstado('conf:' + r.id, { ocupado, alterado: Boolean(fonte || evidencia) }); return () => onEstado('conf:' + r.id, { ocupado: false, alterado: false }); }, [r.id, fonte, evidencia, ocupado, onEstado]);
    async function confirmar(e: FormEvent) {
        e.preventDefault();
        if (trava.current || bloqueado)
            return;
        trava.current = true;
        setOcupado(true);
        const g = generation.current;
        try {
            const d = await operarFicha(membro, clinica, 'conferir_registro', { id: r.id, tipo: 'formacao', revisao: r.revisao, registroId: selecionado, fonte, evidenciaId: evidencia, situacao });
            if (g === generation.current) {
                const confirmado = conferirRegistro(d, membro, 'formacao');
                if (confirmado.id !== r.id || confirmado.revisao !== r.revisao + 1)
                    throw erroFicha(null, true);
                onSalvo(confirmado);
                setFonte('');
                setEvidencia('');
                setErro(null);
            }
        }
        catch (e) {
            if (g === generation.current) {
                const er = erroFicha(e, true);
                setErro(er.message);
                setBloqueado(['CONFLITO', 'RESULTADO_INCERTO', 'NAO_AUTORIZADO'].includes(er.codigo));
            }
        }
        finally {
            if (g === generation.current) {
                setOcupado(false);
                trava.current = false;
            }
        }
    }
    return <details className="equipe-ficha-grupo"><summary>Conferir inscrição profissional salva</summary><form onSubmit={confirmar} aria-label="Conferência profissional"><label>Inscrição<select aria-label="Inscrição" value={selecionado} disabled={ocupado} onChange={e => setSelecionado(e.target.value)}><option value="">Selecione</option>{(r.dados.registros as unknown[]).map(v => { const p = objeto(v); return <option key={String(p.id)} value={String(p.id)}>{String(p.conselho)}/{String(p.uf)} · {String(p.numero)}</option>; })}</select></label><label>Fonte consultada<input value={fonte} disabled={ocupado} maxLength={250} onChange={e => setFonte(e.target.value)}/></label><label>Evidência documental (opcional)<select value={evidencia} disabled={ocupado} onChange={e => setEvidencia(e.target.value)}><option value="">Sem anexo</option>{documentos.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Resultado<select value={situacao} disabled={ocupado} onChange={e => setSituacao(e.target.value)}><option value="conferido">Conferido</option><option value="necessita_correcao">Necessita correção</option></select></label><p>Responsável e data são registrados pelo servidor. Certificado de curso não comprova especialidade registrada.</p><button disabled={ocupado || bloqueado || !selecionado || !fonte.trim()} type="submit">Registrar conferência da inscrição</button><button type="button" disabled={ocupado} onClick={() => { setFonte(''); setEvidencia(''); setSelecionado(''); setErro(null); }}>Cancelar conferência</button>{erro && <FeedbackAlert variant="destructive" title="Conferência não confirmada" description={erro}/>}</form></details>;
}
function HistoricoFicha({ ficha, membro, clinica }: {
    ficha: FichaCompleta;
    membro: string;
    clinica: string;
}) {
    const [versao, setVersao] = useState<{
        tipo: TipoRegistroFicha;
        dados: Record<string, unknown>;
        revisao: number;
    } | null>(null), [erro, setErro] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
    const gen = useRef(0);
    useEffect(() => () => { gen.current++; }, []);
    async function abrir(id: string, revisao: number) {
        const r = ficha.registros.find(r => r.id === id);
        if (!r)
            return;
        const g = ++gen.current;
        setOcupado(true);
        setErro(null);
        setVersao(null);
        try {
            const v = objeto(await operarFicha(membro, clinica, 'versao', { id, revisao }));
            if (g === gen.current && v.id === id && v.revisao === revisao)
                setVersao({ tipo: r.tipo, dados: objeto(v.dados), revisao });
        }
        catch (e) {
            if (g === gen.current)
                setErro(erroFicha(e).message);
        }
        finally {
            if (g === gen.current)
                setOcupado(false);
        }
    }
    return <><p>Histórico administrativo do escopo autorizado. Não representa entrega de e-mails nem histórico de acessos completo.</p>{ficha.historico.length ? <ol className="equipe-ficha-historico">{ficha.historico.slice(0, 100).map(e => <li key={e.id}><time>{new Date(e.instante).toLocaleString('pt-BR')}</time><span>{e.tipo.replaceAll('_', ' ')} · versão {e.revisao} · responsável registrado</span>{ficha.registros.some(r => r.id === e.registro_id) && <button type="button" disabled={ocupado} onClick={() => void abrir(e.registro_id, e.revisao)}>Consultar versão {e.revisao}</button>}</li>)}</ol> : <p>Nenhum evento confirmado nesta consulta.</p>}{ocupado && <p role="status">Consultando versão autorizada…</p>}{erro && <FeedbackAlert variant="warning" title="Versão indisponível" description={erro}/>} {versao && <div className="equipe-ficha-item"><h4>Versão {versao.revisao} · somente leitura</h4><ResumoRegistro tipo={versao.tipo} dados={versao.dados}/><button type="button" onClick={() => setVersao(null)}>Fechar versão</button></div>}</>;
}
/** Abaixo de 640px quem rola é o diálogo (cabeçalho junto): a nova seção começa logo abaixo do menu fixo. */
function rolarDialogoAteMenu(ampliada: HTMLElement | null) {
    const dialogo = ampliada?.closest('dialog');
    if (!ampliada || !dialogo || dialogo.scrollHeight <= dialogo.clientHeight) return;
    const topo = ampliada.getBoundingClientRect().top - dialogo.getBoundingClientRect().top + dialogo.scrollTop;
    if (dialogo.scrollTop > topo) dialogo.scrollTo({ top: topo });
}
const ICONES: Record<string, LucideIcon> = { resumo: LayoutDashboard, pessoal: UserRound, contratos: BriefcaseBusiness, atuacao: CalendarDays, formacao: GraduationCap, recebimento: Wallet, documentos: Files, acessos: KeyRound, historico: History };
const ROTULOS: Record<string, string> = { resumo: 'Visão geral', pessoal: 'Dados pessoais', contratos: 'Contratos e jornada', atuacao: 'Atuação e atendimentos', formacao: 'Formação e registros', recebimento: 'Recebimento', documentos: 'Documentos', acessos: 'Acesso ao sistema', historico: 'Histórico' };
export function EquipeFichaAmpliada({ detalhe, clinicaId, clinicas, acesso, foto, fotoAberta, onFecharFoto, recebimento, acessos, atuacao, onEstado, slotAcoes, slotPendencias, podeEditarCadastro, desabilitarEdicao = false, onEditarCadastro }: {
    detalhe: DetalheMembroEquipe;
    clinicaId: string;
    clinicas: ClinicaEquipe[];
    acesso?: AcessoEquipe | null;
    foto: ReactNode;
    fotoAberta: boolean;
    onFecharFoto: () => void;
    recebimento: (onSituacao: (s: 'configurado' | 'ausente' | 'indisponivel') => void, onResumo: (r: ResumoRecebimento | null) => void) => ReactNode;
    acessos: ReactNode;
    atuacao?: (onResumo: (r: ResumoAtuacao | null) => void) => ReactNode;
    onEstado: (s: EstadoRecursoFicha) => void;
    slotAcoes?: HTMLElement | null;
    slotPendencias?: HTMLElement | null;
    podeEditarCadastro: boolean;
    desabilitarEdicao?: boolean;
    onEditarCadastro?: () => void;
}) {
    useEffect(() => { const body = document.body, html = document.documentElement; const anteriorBody = body.style.overflow, anteriorHtml = html.style.overflow; body.style.overflow = 'hidden'; html.style.overflow = 'hidden'; return () => { body.style.overflow = anteriorBody; html.style.overflow = anteriorHtml; }; }, []);
    const [ficha, setFicha] = useState<FichaCompleta | null>(null), [carregando, setCarregando] = useState(true), [erro, setErro] = useState<string | null>(null), [estados, setEstados] = useState<Record<string, EstadoRecursoFicha>>({}), [confirmar, setConfirmar] = useState(false), [autenticada, setAutenticada] = useState(true), [recebimentoSituacao, setRecebimentoSituacao] = useState<'configurado' | 'ausente' | 'indisponivel'>('indisponivel');
    const [resumoAtuacao, setResumoAtuacao] = useState<ResumoAtuacao | null>(null), [resumoRecebimento, setResumoRecebimento] = useState<ResumoRecebimento | null>(null);
    const [secao, setSecao] = useState('resumo');
    const conteudo = useRef<HTMLDivElement>(null);
    const mudouSecao = useRef(false);
    const navegar = (id: string) => { mudouSecao.current = true; setSecao(id); };
    useEffect(() => { if (mudouSecao.current) { conteudo.current?.scrollTo({top: 0}); rolarDialogoAteMenu(raiz.current); conteudo.current?.querySelector<HTMLElement>(`[data-ficha-secao="${secao}"] h3`)?.focus({preventScroll:true}); mudouSecao.current = false; } }, [secao]);
    const gen = useRef(0), raiz = useRef<HTMLDivElement>(null);
    const abrirComplementar = useRef<(() => void) | null>(null);
    const abrirContrato = useRef<Record<string, () => void>>({});
    const [editandoContrato, setEditandoContrato] = useState<Record<string, boolean>>({});
    const marcarEditando = useCallback((id: string, v: boolean) => setEditandoContrato(a => Boolean(a[id]) === v ? a : { ...a, [id]: v }), []);
    const registrarAbrirComplementar = useCallback((abrir: () => void) => { abrirComplementar.current = abrir; }, []);
    const ocupado = Object.values(estados).some(s => s.ocupado), sujo = Object.values(estados).some(s => s.alterado);
    const estado = useCallback((id: string, s: EstadoRecursoFicha) => setEstados(a => a[id]?.ocupado === s.ocupado && a[id]?.alterado === s.alterado ? a : { ...a, [id]: s }), []);
    useEffect(() => { onEstado({ ocupado, alterado: sujo }); return () => onEstado({ ocupado: false, alterado: false }); }, [ocupado, sujo, onEstado]);
    useEffect(() => {
        if (!sujo)
            return;
        const proteger = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', proteger);
        return () => window.removeEventListener('beforeunload', proteger);
    }, [sujo]);
    const consultar = useCallback(async () => {
        const g = ++gen.current;
        setCarregando(true);
        setErro(null);
        try {
            const f = await buscarFichaCompleta(detalhe.id, clinicaId);
            if (g === gen.current) {
                setFicha(f);
                setEstados({});
                setConfirmar(false);
            }
        }
        catch (e) {
            if (g === gen.current) {
                setFicha(null);
                setErro(erroFicha(e).message);
            }
        }
        finally {
            if (g === gen.current)
                setCarregando(false);
        }
    }, [detalhe.id, clinicaId]);
    useEffect(() => {
        void consultar();
        const invalidar = () => { gen.current++; };
        const { data } = supabase.auth.onAuthStateChange(event => {
            if (event === 'SIGNED_OUT') {
                gen.current++;
                setFicha(null);
                setEstados({});
                setAutenticada(false);
                setCarregando(false);
                setErro('Entre novamente para consultar a ficha.');
            }
        });
        return () => { invalidar(); data.subscription.unsubscribe(); };
    }, [consultar]);
    const [erroHistorico, setErroHistorico] = useState<string | null>(null);
    const historicoGeracao = useRef(0);
    const reconsultarHistorico = useCallback(async () => {
        const g = gen.current, consulta = ++historicoGeracao.current;
        try {
            const f = await buscarFichaCompleta(detalhe.id, clinicaId);
            if (g === gen.current && consulta === historicoGeracao.current) {
                setFicha(a => a ? { ...a, historico: f.historico } : a);
                setErroHistorico(null);
            }
        }
        catch {
            if (g === gen.current && consulta === historicoGeracao.current)
                setErroHistorico('A operação foi confirmada, mas o histórico atualizado não pôde ser consultado. Reabra ou reconsulte a ficha.');
        }
    }, [detalhe.id, clinicaId]);
    const salvarLocal = useCallback((r: RegistroFicha) => { setFicha(f => f ? { ...f, [r.tipo === 'empresa' ? 'empresas' : 'registros']: [...(r.tipo === 'empresa' ? f.empresas : f.registros).filter(a => a.id !== r.id), r] } : f); void reconsultarHistorico(); }, [reconsultarHistorico]);
    const documentoLocal = useCallback((v: unknown) => { const d = conferirDocumento(v, detalhe.id); setFicha(f => f ? { ...f, documentos: [d, ...f.documentos.filter(a => a.id !== d.id).map(a => a.id === d.substitui_id ? { ...a, arquivado: true } : a)] } : f); void reconsultarHistorico(); }, [detalhe.id, reconsultarHistorico]);
    const saude = detalhe.tipo === 'profissional_saude';
    // Mesmas seções e regras de exibição de antes; só o agrupamento visual do menu mudou.
    const grupos: [string, string[]][] = [['Pessoa', ['resumo', 'pessoal', ...(saude ? ['formacao'] : [])]], ['Trabalho', ['contratos', ...(saude ? ['atuacao', 'recebimento'] : [])]], ['Sistema', ['documentos', 'acessos', 'historico']]];
    const opcoes: OpcoesFicha = { unidades: clinicas.map(c => [c.id, c.nome]), empresas: ficha?.empresas ?? [], documentos: ficha?.documentos.filter(d => !d.arquivado).map(d => [d.id, `${d.categoria.replaceAll('_', ' ')} · versão ${d.versao}`]) ?? [], registros: [] };
    const registro = (tipo: TipoRegistroFicha) => ficha?.registros.find(r => r.tipo === tipo);
    const props = { membro: detalhe.id, clinica: clinicaId, clinicas, opcoes, onSalvo: salvarLocal, onEstado: estado };
    const pendencias = ficha ? pendenciasFicha(ficha, new Date().toLocaleDateString('sv-SE'), recebimentoSituacao) : [];
    const pendenciasPorSecao = pendencias.reduce<Record<string, number>>((a, p) => { const s = secaoDaPendencia(p); a[s] = (a[s] ?? 0) + 1; return a; }, {});
    const desabilitarConsulta = ocupado || carregando || !autenticada;
    const atualizar = () => sujo ? setConfirmar(true) : void consultar();
    const clinicaNome = clinicas.find(c => c.id === clinicaId)?.nome ?? 'Clínica selecionada';
    return <div className="equipe-ficha-ampliada" ref={raiz}>
  {slotAcoes && createPortal(<button type="button" className="equipe-icone-acao" aria-label="Atualizar informações da ficha" title="Atualizar informações da ficha" disabled={desabilitarConsulta} onClick={atualizar}><RefreshCw size={18} aria-hidden="true"/></button>, slotAcoes)}
  {slotPendencias && pendencias.length > 0 && createPortal(<Selo tom="alerta" testId="ficha-total-pendencias">{pendencias.length} {pendencias.length === 1 ? 'pendência' : 'pendências'}</Selo>, slotPendencias)}
  <aside className="equipe-ficha-lateral"><nav aria-label="Seções da ficha" className="equipe-ficha-nav">{grupos.map(([grupo, ids]) => <div key={grupo} className="equipe-ficha-nav-grupo" role="group" aria-labelledby={`ficha-grupo-${grupo}`}><p id={`ficha-grupo-${grupo}`} className="equipe-ficha-nav-rotulo">{grupo}</p>{ids.map(id => { const Icone = ICONES[id], n = pendenciasPorSecao[id] ?? 0; return <span key={id} className="contents"><Button variant="ghost" type="button" aria-current={secao === id ? 'page' : undefined} aria-controls={`ficha-secao-${id}`} aria-describedby={n ? `ficha-pendencias-${id}` : undefined} onClick={() => navegar(id)}><Icone size={17} aria-hidden="true"/><span>{ROTULOS[id]}</span>{n > 0 && <span className="equipe-ficha-nav-pilula" aria-hidden="true">{n}</span>}</Button>{n > 0 && <span id={`ficha-pendencias-${id}`} hidden>{n} {n === 1 ? 'pendência' : 'pendências'}</span>}</span>; })}</div>)}</nav></aside>
  <div className="equipe-ficha-conteudo" ref={conteudo}>
  <div id="ficha-foto-painel" className="equipe-ficha-foto" hidden={!fotoAberta}><div className="equipe-cartao">{foto}<div className="equipe-ficha-foto-rodape"><button type="button" className="equipe-botao-secundario" onClick={onFecharFoto}>Ocultar foto</button></div></div></div>
  {sujo && <p role="status" className="equipe-ficha-aviso">Há alterações não salvas. Trocar de seção preserva o preenchimento.</p>}
  {erro && <FeedbackAlert variant="warning" title="Informações adicionais indisponíveis" description={erro}/>}
  <section id="ficha-secao-resumo" data-ficha-secao="resumo" hidden={secao !== 'resumo'} tabIndex={-1}><h3 tabIndex={-1}>Visão geral</h3><CabecalhoSecao descricao="Pendências e resumo das informações autorizadas nesta clínica."/>
   <VisaoGeral detalhe={detalhe} clinicaId={clinicaId} clinicaNome={clinicaNome} ficha={ficha} carregando={carregando} autenticada={autenticada} desabilitarConsulta={desabilitarConsulta} pendencias={pendencias} rotulos={ROTULOS} recebimentoSituacao={recebimentoSituacao} resumoAtuacao={resumoAtuacao} resumoRecebimento={resumoRecebimento} acesso={acesso} saude={saude} navegar={navegar} onTentarNovamente={atualizar}/>
  </section>
  <section id="ficha-secao-pessoal" data-ficha-secao="pessoal" hidden={secao !== 'pessoal'} tabIndex={-1}><h3 tabIndex={-1}>Dados pessoais</h3><CabecalhoSecao descricao="Cadastro básico e dados complementares autorizados."/>
   <DadosPessoaisCartoes detalhe={detalhe} clinicaId={clinicaId} clinicas={clinicas} ficha={ficha} carregando={carregando} podeEditarCadastro={podeEditarCadastro} desabilitarEdicao={desabilitarEdicao || ocupado} onEditarCadastro={onEditarCadastro} onEditarComplementar={ficha?.pode_global ? () => abrirComplementar.current?.() : undefined}
    editorComplementar={ficha && <RegistroEditor key={`pessoal:${registro('pessoal')?.revisao ?? 0}:${gen.current}`} tipo="pessoal" atual={registro('pessoal')} permitido={ficha.pode_global} apresentacao="formulario" registrarAbrir={registrarAbrirComplementar} {...props}/>}/>
  </section>
  <section id="ficha-secao-contratos" data-ficha-secao="contratos" hidden={secao !== 'contratos'} tabIndex={-1}><h3 tabIndex={-1}>Contratos e jornada</h3><CabecalhoSecao descricao="Contratos, jornada e empresas contratantes autorizados nesta ficha." acao={ficha && !editandoContrato.novo ? <button type="button" className="equipe-botao-secundario" onClick={() => abrirContrato.current.novo?.()}>Adicionar contrato</button> : null}/>
   {!ficha ? carregando ? <Esqueleto rotulo="Consultando contratos"/> : <div className="equipe-estado-erro"><p>Contratos não consultados. Falha de leitura não confirma ausência.</p><button type="button" className="equipe-botao-secundario" disabled={desabilitarConsulta} onClick={atualizar}>Tentar novamente</button></div> : <div className="equipe-contratos">
   <div className={editandoContrato.novo ? 'equipe-cartao equipe-contrato-novo' : undefined}><RegistroEditor key={'novocontrato:' + gen.current + ':' + ficha.registros.filter(r => r.tipo === 'contrato').length} tipo="contrato" apresentacao="formulario" registrarAbrir={abrir => { abrirContrato.current.novo = abrir; }} onEditando={v => marcarEditando('novo', v)} {...props}/></div>
   {!ficha.registros.some(r => r.tipo === 'contrato') && !editandoContrato.novo && <p className="equipe-texto-discreto">Nenhum contrato cadastrado nesta ficha.</p>}
   {ficha.registros.filter(r => r.tipo === 'contrato').map(r => <CartaoContrato key={r.id} contrato={r} empresa={ficha.empresas.find(e => e.id === r.dados.empresa_id)?.dados.nome as string || 'Empresa autorizada'} unidades={r.unidades.map(id => clinicas.find(c => c.id === id)?.nome ?? 'Unidade autorizada').join(' · ')} editando={Boolean(editandoContrato[r.id])} onEditar={() => abrirContrato.current[r.id]?.()}
    editor={<RegistroEditor key={r.id + ':' + r.revisao} tipo="contrato" atual={r} apresentacao="formulario" registrarAbrir={abrir => { abrirContrato.current[r.id] = abrir; }} onEditando={v => marcarEditando(r.id, v)} {...props}/>}
    extras={<>
     <Recolhivel titulo="Checklist deste contrato"><NotaInfo>Exigências dependem do vínculo e função. Pendências da contabilidade/responsável ocupacional não viram obrigação automática nem prova legal.</NotaInfo><RegistroEditor key={`check:${r.id}:${ficha.registros.find(c => c.tipo === 'checklist' && c.referencia_id === r.id)?.revisao ?? 0}`} tipo="checklist" atual={ficha.registros.find(c => c.tipo === 'checklist' && c.referencia_id === r.id)} referencia={r} {...props}/></Recolhivel>
     {ficha.pode_ocupacional && r.unidades.every(id => ficha.ocupacional_unidades?.includes(id)) && <Recolhivel titulo="Acompanhamento ocupacional administrativo autorizado"><NotaInfo>Somente datas e comprovantes pertinentes. Não incluir diagnósticos, resultados clínicos ou prontuário ocupacional.</NotaInfo><RegistroEditor key={`ocup:${r.id}:${ficha.registros.find(c => c.tipo === 'ocupacional' && c.referencia_id === r.id)?.revisao ?? 0}`} tipo="ocupacional" atual={ficha.registros.find(c => c.tipo === 'ocupacional' && c.referencia_id === r.id)} referencia={r} {...props}/></Recolhivel>}
    </>}/>)}
   <Recolhivel titulo="Empresas contratantes autorizadas" className="equipe-contrato-empresas">{!ficha.empresas.length && <p className="equipe-texto-discreto">Nenhuma empresa cadastrada. Informe somente a empresa real, após a definição responsável.</p>}{ficha.empresas.map(r => <RegistroEditor key={r.id + ':' + r.revisao} tipo="empresa" atual={r} {...props}/>)}<RegistroEditor key={'novaempresa:' + gen.current + ':' + ficha.empresas.length} tipo="empresa" {...props}/></Recolhivel>
   </div>}
   <NotaInfo>Empresa contratante, contrato e unidades são independentes. Um contrato pode atender duas unidades; não são criados contratos automaticamente.</NotaInfo>
  </section>
  {saude && autenticada && <section id="ficha-secao-atuacao" data-ficha-secao="atuacao" hidden={secao !== 'atuacao'} tabIndex={-1}><h3 tabIndex={-1}>Atuação e atendimentos</h3>{atuacao?.(setResumoAtuacao)}</section>}
  {saude && <section id="ficha-secao-formacao" data-ficha-secao="formacao" hidden={secao !== 'formacao'} tabIndex={-1}><h3 tabIndex={-1}>Formação e registros</h3><p>Profissão e especialidade principal atuais: {detalhe.profissao || 'não informada'} · {detalhe.especialidade_nome || 'não informada'}. Novas inscrições e especialidades não modificam essa referência nem agenda, preços ou serviços.</p>{ficha && <><RegistroEditor key={`formacao:${registro('formacao')?.revisao ?? 0}:${gen.current}`} tipo="formacao" atual={registro('formacao')} permitido={ficha.pode_global} {...props}/>{registro('formacao') && ficha.pode_global && <ConferenciaRegistros key={'conf:' + registro('formacao')!.revisao} r={registro('formacao')!} membro={detalhe.id} clinica={clinicaId} documentos={opcoes.documentos} onSalvo={salvarLocal} onEstado={estado}/>}</>}</section>}
  {saude && <section id="ficha-secao-recebimento" data-ficha-secao="recebimento" hidden={secao !== 'recebimento'} tabIndex={-1}><h3 tabIndex={-1}>Recebimento</h3>{recebimento(setRecebimentoSituacao, setResumoRecebimento)}</section>}
  <section id="ficha-secao-documentos" data-ficha-secao="documentos" hidden={secao !== 'documentos'} tabIndex={-1}><h3 tabIndex={-1}>Documentos</h3>{ficha && <EquipeDocumentosPainel membroId={detalhe.id} clinicaId={clinicaId} clinicas={clinicas} ficha={ficha} onConfirmado={documentoLocal} onEstado={estado}/>}</section>
  <section id="ficha-secao-acessos" data-ficha-secao="acessos" hidden={secao !== 'acessos'} tabIndex={-1}><h3 tabIndex={-1}>Acesso ao sistema</h3><CabecalhoSecao descricao="Conta de acesso e situação em cada clínica autorizada."/>{acessos}</section>
  <section id="ficha-secao-historico" data-ficha-secao="historico" hidden={secao !== 'historico'} tabIndex={-1}><h3 tabIndex={-1}>Histórico</h3>{erroHistorico && <FeedbackAlert variant="warning" title="Histórico não atualizado" description={erroHistorico}/>} {ficha && <HistoricoFicha ficha={ficha} membro={detalhe.id} clinica={clinicaId}/>}</section>
  </div>
  <ConfirmacaoDialog open={confirmar} onOpenChange={setConfirmar} title="Descartar rascunhos e consultar novamente?" description="As informações confirmadas serão relidas; todos os rascunhos destas novas seções serão descartados." confirmLabel="Descartar e reconsultar" onConfirm={() => void consultar()} tone="warning" disabled={ocupado}/>
 </div>;
}

// ONLY synthetic harness. IndexedDB here is explicitly simulated persistence, not Supabase.
import { validarRegistroFicha, validarMetaDocumento, pessoalVazio, contratoVazio, formacaoVazia, type FichaCompleta, type RegistroFicha, type DocumentoFicha, type EventoFicha, type MetaDocumento } from '../../supabase/functions/_shared/equipeFicha';
export const UNIDADE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', UNIDADE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const MID = '11111111-1111-4111-8111-111111111111', FUNC = '21111111-1111-4111-8111-111111111111', MED_CLT = '31111111-1111-4111-8111-111111111111';
const EMP = '44444444-4444-4444-8444-444444444444';
interface EstadoSimulado {
    registros: RegistroFicha[];
    documentos: DocumentoFicha[];
    eventos: EventoFicha[];
    versoes: Record<string, Record<string, unknown>>;
    arquivos: Record<string, Blob>;
    tentativas: Record<string, {
        meta: MetaDocumento;
        arquivo: Blob;
        confirmado: boolean;
        membro: string;
        clinica: string;
        criado_em: string;
    }>;
}
function inicial(): EstadoSimulado {
    const s: EstadoSimulado = { registros: [], documentos: [], eventos: [], versoes: {}, arquivos: {}, tentativas: {} };
    const add = (id: string, membro: string | null, tipo: RegistroFicha['tipo'], unidades: string[], dados: Record<string, unknown>) => { const r: RegistroFicha = { id, membro_id: membro, tipo, unidades, referencia_id: null, revisao: 1, dados, atualizado_em: new Date().toISOString(), atualizado_por: 'usuario-sintetico' }; s.registros.push(r); s.versoes[id + ':1'] = structuredClone(dados); };
    add(EMP, null, 'empresa', [UNIDADE_A, UNIDADE_B], { nome: 'Empregador Sintético para Testes', cnpj: '' });
    for (const [i, m] of [MID, FUNC, MED_CLT].entries()) {
        add(`5000000${i}-5555-4555-8555-555555555555`, m, 'pessoal', [UNIDADE_A, UNIDADE_B], { ...pessoalVazio(), nome_social: '', escolaridade: 'Superior informado' });
        const d = { ...contratoVazio(), empresa_id: EMP, vinculo: i === 0 ? 'servicos_pf' : 'clt', admissao: '2026-09-01', inicio_atividades: '2026-09-02', cargo: i === 1 ? 'Assistente Sintético' : 'Médico Sintético', vigencia: '2026-09-01', situacao: 'vigente', situacao_data: '2026-09-01', horas_semanais: '20', escala: 'Escala Sintética', remuneracao: '', ctps: { modalidade: i === 0 ? 'nao_aplicavel' : 'digital', conferencia: 'aguardando', numero: '', serie: '', uf: '', pis_necessario: false, pis: '' } };
        add(`6000000${i}-6666-4666-8666-666666666666`, m, 'contrato', [UNIDADE_A, UNIDADE_B], d);
        if (i !== 1)
            add(`7000000${i}-7777-4777-8777-777777777777`, m, 'formacao', [UNIDADE_A, UNIDADE_B], formacaoVazia());
    }
    return s;
}
async function banco() { return new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('equipe33-somente-ficticios', 1); request.onupgradeneeded = () => request.result.createObjectStore('estado'); request.onerror = () => reject(new Error('Persistência simulada indisponível')); request.onsuccess = () => resolve(request.result); }); }
async function ler(): Promise<EstadoSimulado> { const db = await banco(); return new Promise((resolve, reject) => { const tx = db.transaction('estado', 'readonly'); const req = tx.objectStore('estado').get('ficticio'); req.onsuccess = () => resolve(req.result ?? inicial()); req.onerror = () => reject(new Error('Falha sintética')); tx.oncomplete = () => db.close(); }); }
async function gravar(s: EstadoSimulado) { const db = await banco(); return new Promise<void>((resolve, reject) => { const tx = db.transaction('estado', 'readwrite'); tx.objectStore('estado').put(s, 'ficticio'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(new Error('Falha sintética')); }); }
// Serialize simulated writes as real SQL uses locks. No production client imports this file.
let fila = Promise.resolve();
export async function reiniciarFichaDemo() { await gravar(inicial()); }
export async function simularFicha(request: Request, opcoes: {
    papel?: string;
    permitidas?: string[];
    ocupacional?: boolean;
    falha?: string;
} = {}): Promise<Response> {
    let release!: () => void;
    const before = fila;
    fila = new Promise<void>(r => { release = r; });
    await before;
    try {
        return await executar(request, opcoes);
    }
    finally {
        release();
    }
}
async function executar(request: Request, opcoes: {
    papel?: string;
    permitidas?: string[];
    ocupacional?: boolean;
    falha?: string;
}) {
    const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    let b: Record<string, unknown>, file: File | null = null;
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
        const f = await request.formData();
        b = JSON.parse(String(f.get('contexto')));
        file = f.get('arquivo') as File;
    }
    else
        b = await request.json();
    const membro = String(b.membroId), clinica = String(b.clinicaId);
    const permitidas = opcoes.permitidas ?? [UNIDADE_A, UNIDADE_B], pode = (u: string[]) => u.every(id => permitidas.includes(id)), s = await ler();
    if (opcoes.papel && opcoes.papel !== 'proprietaria' || ![MID, FUNC, MED_CLT].includes(membro) || !permitidas.includes(clinica))
        return json({ codigo: 'NAO_AUTORIZADO' }, 403);
    const records = s.registros.filter(r => r.membro_id === membro && r.unidades.includes(clinica) && pode(r.unidades)), docs = s.documentos.filter(d => d.membro_id === membro && d.unidades.includes(clinica) && pode(d.unidades) && (!d.ocupacional || opcoes.ocupacional));
    const ficha: FichaCompleta = { membro_id: membro, clinica_id: clinica, pode_global: pode([UNIDADE_A, UNIDADE_B]), pode_ocupacional: opcoes.ocupacional ?? false, ocupacional_unidades: opcoes.ocupacional ? permitidas : [], registros: records, empresas: s.registros.filter(r => r.tipo === 'empresa' && r.unidades.includes(clinica) && pode(r.unidades)), documentos: docs, historico: s.eventos.filter(e => records.some(r => r.id === e.registro_id) || docs.some(d => d.id === e.registro_id)) };
    const evento = (id: string, tipo: string, rev: number) => s.eventos.unshift({ id: crypto.randomUUID(), registro_id: id, tipo, revisao: rev, instante: new Date().toISOString(), ator_id: 'usuario-sintetico', campos: [] });
    if (b.acao === 'obter')
        return json({ ...ficha, tentativas: Object.entries(s.tentativas).filter(([, t]) => !t.confirmado && t.membro === membro && t.clinica === clinica && pode(t.meta.unidades)).map(([id, t]) => ({ id, meta: t.meta, criado_em: t.criado_em })) });
    if (opcoes.falha && opcoes.falha !== 'parcial')
        return json({ codigo: opcoes.falha }, opcoes.falha === 'CONFLITO' ? 409 : 503);
    try {
        if (b.acao === 'salvar' || b.acao === 'conferir_registro') {
            const old = s.registros.find(r => r.id === b.id);
            const tipo = String(b.tipo) as RegistroFicha['tipo'];
            const unidades = tipo === 'pessoal' || tipo === 'formacao' ? [UNIDADE_A, UNIDADE_B] : b.unidades as string[];
            if (!pode(unidades) || !unidades.includes(clinica) || old && (!pode(old.unidades) || old.membro_id !== membro && old.tipo !== 'empresa') || tipo === 'ocupacional' && !opcoes.ocupacional)
                return json({ codigo: 'NAO_AUTORIZADO' }, 403);
            if ((old?.revisao ?? 0) !== b.revisao)
                return json({ codigo: 'CONFLITO' }, 409);
            let dados = b.acao === 'conferir_registro' ? structuredClone(old?.dados ?? {}) : validarRegistroFicha(tipo, b.dados, old?.dados ?? null);
            if (b.acao === 'conferir_registro') {
                if (!old || old.tipo !== 'formacao')
                    return json({ codigo: 'NAO_AUTORIZADO' }, 403);
                dados = structuredClone(old.dados);
                const r = (dados.registros as Record<string, unknown>[]).find(r => r.id === b.registroId);
                if (!r || !b.fonte)
                    throw new Error();
                Object.assign(r, { conferencia: b.situacao, fonte: b.fonte, evidencia_id: b.evidenciaId, conferido_em: new Date().toISOString(), conferido_por: 'usuario-sintetico' });
            }
            const r: RegistroFicha = { id: String(b.id), membro_id: tipo === 'empresa' ? null : membro, tipo, unidades, referencia_id: old?.referencia_id ?? b.referenciaId as string | null ?? null, revisao: (old?.revisao ?? 0) + 1, dados, atualizado_em: new Date().toISOString(), atualizado_por: 'usuario-sintetico' };
            s.registros = [...s.registros.filter(v => v.id !== r.id), r];
            s.versoes[r.id + ':' + r.revisao] = structuredClone(dados);
            evento(r.id, tipo + '_salvo', r.revisao);
            await gravar(s);
            return json(r);
        }
        if (b.acao === 'versao') {
            const r = records.find(r => r.id === b.id);
            if (!r)
                return json({ codigo: 'NAO_AUTORIZADO' }, 403);
            const dados = s.versoes[r.id + ':' + b.revisao];
            return dados ? json({ id: r.id, revisao: b.revisao, dados }) : json({ codigo: 'CONSULTA_INDISPONIVEL' }, 404);
        }
        if (b.acao === 'documento_salvar') {
            const meta = validarMetaDocumento(b.meta);
            if (!file || !pode(meta.unidades) || !meta.unidades.includes(clinica) || ['aso', 'capacitacao'].includes(meta.categoria) && !opcoes.ocupacional)
                return json({ codigo: 'NAO_AUTORIZADO' }, 403);
            const id = String(b.id), t = s.tentativas[id];
            if (t && (t.membro !== membro || JSON.stringify(t.meta) !== JSON.stringify(meta) || t.arquivo.size !== file.size))
                return json({ codigo: 'DADOS_INVALIDOS' }, 422);
            if (!t)
                s.tentativas[id] = { meta, arquivo: file, confirmado: false, membro, clinica, criado_em: new Date().toISOString() };
            await gravar(s);
            if (opcoes.falha === 'parcial')
                return json({ codigo: 'RESULTADO_INCERTO' }, 503);
            return confirmar(id);
        }
        async function confirmar(id: string): Promise<Response> {
            const t = s.tentativas[id];
            if (!t || t.membro !== membro || t.clinica !== clinica || !pode(t.meta.unidades))
                return json({ codigo: 'DADOS_INVALIDOS' }, 422);
            const existente = s.documentos.find(d => d.id === id);
            if (existente)
                return json(existente);
            const old = t.meta.substitui_id ? s.documentos.find(d => d.id === t.meta.substitui_id) : undefined;
            if (old && (old.arquivado || old.membro_id !== membro))
                return json({ codigo: 'CONFLITO' }, 409);
            const d: DocumentoFicha = { id, membro_id: membro, contrato_id: t.meta.contrato_id, unidades: t.meta.unidades, categoria: t.meta.categoria, mime: t.arquivo.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg', tamanho: t.arquivo.size, emissao: t.meta.emissao, validade: t.meta.validade, versao: (old?.versao ?? 0) + 1, substitui_id: old?.id ?? null, arquivado: false, armazenamento: 'disponivel', conferencia: 'aguardando', revisao: 1, enviado_em: new Date().toISOString(), enviado_por: 'usuario-sintetico', conferido_em: null, conferido_por: null, fonte: null, ocupacional: ['aso', 'capacitacao'].includes(t.meta.categoria) };
            if (old)
                old.arquivado = true;
            s.documentos.unshift(d);
            s.arquivos[id] = t.arquivo;
            t.confirmado = true;
            evento(d.id, 'documento_salvo', 1);
            await gravar(s);
            return json(d);
        }
        if (b.acao === 'documento_recuperar')
            return confirmar(String(b.id));
        if (b.acao === 'documento_limpar')
            return json({ limpeza_pendente: false });
        const d = docs.find(d => d.id === b.id);
        if (!d)
            return json({ codigo: 'NAO_AUTORIZADO' }, 403);
        if (b.acao === 'documento_ler') {
            evento(d.id, 'documento_lido', d.revisao);
            await gravar(s);
            return new Response(s.arquivos[d.id], { headers: { 'Content-Type': d.mime } });
        }
        if (b.acao === 'documento_conferir' || b.acao === 'documento_arquivar') {
            if (d.revisao !== b.revisao || d.arquivado)
                return json({ codigo: 'CONFLITO' }, 409);
            if (b.acao === 'documento_conferir') {
                if (!b.fonte)
                    throw new Error();
                d.conferencia = String(b.situacao) as DocumentoFicha['conferencia'];
                d.fonte = String(b.fonte);
                d.conferido_em = new Date().toISOString();
                d.conferido_por = 'usuario-sintetico';
            }
            else
                d.arquivado = true;
            d.revisao++;
            evento(d.id, 'documento_' + b.acao, d.revisao);
            await gravar(s);
            return json(d);
        }
    }
    catch {
        return json({ codigo: 'DADOS_INVALIDOS' }, 422);
    }
    return json({ codigo: 'NAO_AUTORIZADO' }, 403);
}

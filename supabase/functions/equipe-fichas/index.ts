import { createClient } from 'npm:@supabase/supabase-js@2.111.0';
// Distribuição Deno/WASM: a variante npm requer addon nativo na inicialização.
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import * as PDF from 'npm:pdf-lib@1.17.1';
import { ORIGENS_LOCAIS_PERMITIDAS, ORIGENS_PUBLICAS_PERMITIDAS } from '../equipe-acessos/conviteAuth.ts';
import { processarFotoEquipe } from '../_shared/equipeFoto.ts';
import { ErroRecursoEquipe } from '../_shared/equipeRecebimento.ts';
import { erroServidorRecurso } from '../_shared/equipeRecursosServico.ts';
import { validarRegistroFicha, validarMetaDocumento, UUID, type FichaCompleta, type RegistroFicha, type TipoRegistroFicha, type DocumentoFicha } from '../_shared/equipeFicha.ts';
import { DOCUMENTO_MAX_BYTES, validarArquivoDocumento, hashDocumento, armazenarDocumento, type TentativaDocumento } from '../_shared/equipeDocumento.ts';
import { validarPdfDocumento } from '../_shared/equipePdf.ts';
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
function cabecalhos(req: Request) {
    const h = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' });
    const origin = req.headers.get('origin') ?? '';
    if (ORIGENS_LOCAIS_PERMITIDAS.has(origin) || ORIGENS_PUBLICAS_PERMITIDAS.has(origin))
        h.set('Access-Control-Allow-Origin', origin);
    return h;
}
const responder = (req: Request, d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: cabecalhos(req) });
async function limitar(req: Request) {
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                size += value.length;
                if (size > DOCUMENTO_MAX_BYTES + 131072) {
                    await reader.cancel();
                    throw new ErroRecursoEquipe('DADOS_INVALIDOS', 'Formulário excede o limite.');
                }
                chunks.push(value);
            }
        }
        finally {
            reader.releaseLock();
        }
    const b = new Uint8Array(size);
    let pos = 0;
    for (const chunk of chunks) {
        b.set(chunk, pos);
        pos += chunk.length;
    }
    return new Request(req.url, { method: 'POST', headers: req.headers, body: b });
}
// Parse actual PDF objects, including compressed object streams and escaped names.
// This is format/content hardening, not an antivirus certification.
const sanearPdf = (bytes: Uint8Array) => validarPdfDocumento(bytes, PDF);
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS')
        return new Response(null, { status: 204, headers: cabecalhos(req) });
    if (req.method !== 'POST')
        return responder(req, { codigo: 'DADOS_INVALIDOS' }, 405);
    const origin = req.headers.get('origin');
    if (origin && !ORIGENS_LOCAIS_PERMITIDAS.has(origin) && !ORIGENS_PUBLICAS_PERMITIDAS.has(origin))
        return responder(req, { codigo: 'NAO_AUTORIZADO' }, 403);
    try {
        const url = Deno.env.get('SUPABASE_URL'), anon = Deno.env.get('SUPABASE_ANON_KEY'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');
        if (!url || !anon || !key)
            throw new ErroRecursoEquipe('CONSULTA_INDISPONIVEL', 'Serviço indisponível neste ambiente.');
        const authorization = req.headers.get('authorization') ?? '';
        if (!authorization.startsWith('Bearer '))
            throw { code: '42501' };
        const client = createClient(url, anon, { ...options, global: { headers: { Authorization: authorization } } });
        const { data: auth, error: authError } = await client.auth.getUser(authorization.slice(7));
        if (authError || !auth.user)
            throw { code: '42501' };
        const limitado = await limitar(req);
        let b: Record<string, unknown>, file: File | null = null;
        if (req.headers.get('content-type')?.includes('multipart/form-data')) {
            const f = await limitado.formData();
            b = JSON.parse(String(f.get('contexto')));
            const arq = f.get('arquivo');
            if (arq instanceof File)
                file = arq;
        }
        else
            b = await limitado.json();
        if (!b || !UUID.test(String(b.membroId)) || !UUID.test(String(b.clinicaId)))
            throw new ErroRecursoEquipe('DADOS_INVALIDOS', 'Contexto inválido.');
        const admin = createClient(url, key, options);
        const args = { p_membro_id: b.membroId, p_clinica_id: b.clinicaId, p_ator_id: auth.user.id };
        async function rpc<T>(nome: string, extra: Record<string, unknown> = {}): Promise<T> {
            const { data, error } = await admin.rpc(nome, { ...args, ...extra });
            if (error)
                throw { code: error.code };
            return data as T;
        }
        const ficha = await rpc<FichaCompleta>('equipe_ficha_interno');
        if (b.acao === 'obter')
            return responder(req, ficha);
        if (!UUID.test(String(b.id)))
            throw new ErroRecursoEquipe('DADOS_INVALIDOS', 'Identificador inválido.');
        const revisao = () => {
            if (!Number.isSafeInteger(b.revisao) || Number(b.revisao) < 0)
                throw new ErroRecursoEquipe('DADOS_INVALIDOS', 'Revisão inválida.');
            return Number(b.revisao);
        };
        if (b.acao === 'salvar' || b.acao === 'conferir_registro') {
            const tipo = String(b.tipo) as TipoRegistroFicha;
            const anterior = [...ficha.registros, ...ficha.empresas].find(r => r.id === b.id);
            if (tipo === 'empresa' && anterior && !ficha.empresas.some(r => r.id === b.id) || b.acao === 'conferir_registro' && (!anterior || anterior.tipo !== 'formacao'))
                throw { code: '42501' };
            let dados: Record<string, unknown>;
            if (b.acao === 'conferir_registro') {
                dados = structuredClone(anterior!.dados);
                const registros = dados.registros as Record<string, unknown>[];
                const registro = registros.find(r => r.id === b.registroId);
                if (!registro || !['conferido', 'necessita_correcao'].includes(String(b.situacao)) || typeof b.fonte !== 'string' || !b.fonte.trim() || b.fonte.length > 250)
                    throw new ErroRecursoEquipe('DADOS_INVALIDOS', 'Informe registro, situação e fonte da conferência.');
                if (b.evidenciaId && !ficha.documentos.some(d => d.id === b.evidenciaId && !d.arquivado))
                    throw { code: '42501' };
                Object.assign(registro, { conferencia: b.situacao, conferido_em: new Date().toISOString(), conferido_por: auth.user.id, fonte: b.fonte.trim(), evidencia_id: b.evidenciaId || '' });
            }
            else
                dados = validarRegistroFicha(tipo, b.dados, anterior?.dados ?? null);
            // Evidence IDs must reference an authorized document of this person.
            const verificarReferencias = (v: unknown) => {
                if (Array.isArray(v)) {
                    for (const x of v)
                        verificarReferencias(x);
                    return;
                }
                if (v && typeof v === 'object')
                    for (const [k, x] of Object.entries(v)) {
                        if ((k === 'documento_id' || k === 'evidencia_id') && x && !ficha.documentos.some(d => d.id === x))
                            throw { code: '42501' };
                        verificarReferencias(x);
                    }
            };
            verificarReferencias(dados);
            const unidades = b.acao === 'conferir_registro' ? anterior!.unidades : b.unidades;
            if (!Array.isArray(unidades) || unidades.some(u => !UUID.test(String(u))))
                throw new ErroRecursoEquipe('DADOS_INVALIDOS', 'Unidades inválidas.');
            return responder(req, await rpc<RegistroFicha>('equipe_ficha_salvar', { p_id: b.id, p_tipo: tipo, p_unidades: unidades, p_referencia_id: anterior?.referencia_id ?? b.referenciaId ?? null, p_revisao: revisao(), p_dados: dados }));
        }
        if (b.acao === 'versao')
            return responder(req, await rpc('equipe_ficha_versao', { p_id: b.id, p_revisao: revisao() }));
        if (b.acao === 'documento_salvar') {
            if (!file)
                throw new ErroRecursoEquipe('DOCUMENTO_INVALIDO', 'Selecione um documento.');
            const meta = validarMetaDocumento(b.meta);
            await rpc('equipe_ficha_autorizar_escopo', { p_unidades: meta.unidades, p_ocupacional: ['aso', 'capacitacao'].includes(meta.categoria) });
            const arq = await validarArquivoDocumento(new Uint8Array(await file.arrayBuffer()), file.type, (bytes, mime) => processarFotoEquipe(bytes, async (v) => await Image.decode(v), mime, (w, h) => new Image(w, h)), sanearPdf);
            const doc = await armazenarDocumento<DocumentoFicha>({
                reservar: () => rpc<TentativaDocumento>('equipe_documento_reservar', { p_id: b.id, p_meta: meta, p_sha256: arq.sha256, p_mime: arq.mime, p_tamanho: arq.bytes.length }),
                async upload(path, arquivo) {
                    if (!path.startsWith(String(b.membroId) + '/'))
                        throw { code: '42501' };
                    const { error } = await admin.storage.from('equipe-documentos').upload(path, arquivo.bytes, { contentType: arquivo.mime, upsert: false });
                    if (error) {
                        const { data, error: readError } = await admin.storage.from('equipe-documentos').download(path);
                        if (readError || !data || await hashDocumento(new Uint8Array(await data.arrayBuffer())) !== arquivo.sha256)
                            throw new ErroRecursoEquipe('RESULTADO_INCERTO', 'Upload não confirmado. Consulte a tentativa antes de repetir.');
                    }
                },
                confirmar: () => rpc<DocumentoFicha>('equipe_documento_confirmar', { p_id: b.id })
            }, arq);
            return responder(req, doc);
        }
        if (b.acao === 'documento_ler') {
            const d = await rpc<{
                caminho: string;
                mime: string;
                tamanho: number;
                sha256: string;
            }>('equipe_documento_operar', { p_id: b.id, p_acao: 'ler' });
            if (!d.caminho.startsWith(String(b.membroId) + '/'))
                throw { code: '42501' };
            const { data, error } = await admin.storage.from('equipe-documentos').download(d.caminho);
            if (error || !data)
                throw new ErroRecursoEquipe('CONSULTA_INDISPONIVEL', 'Arquivo indisponível.');
            const bytes = new Uint8Array(await data.arrayBuffer());
            if (bytes.length !== d.tamanho || await hashDocumento(bytes) !== d.sha256)
                throw new ErroRecursoEquipe('CONSULTA_INDISPONIVEL', 'Arquivo não confirmado.');
            const h = cabecalhos(req);
            h.set('Content-Type', d.mime);
            h.set('Content-Disposition', 'attachment; filename="documento.' + (d.mime === 'application/pdf' ? 'pdf' : 'jpg') + '"');
            h.set('Content-Security-Policy', "default-src 'none'; sandbox");
            return new Response(bytes, { headers: h });
        }
        if (b.acao === 'documento_conferir' || b.acao === 'documento_arquivar') {
            if (b.acao === 'documento_conferir' && !['conferido', 'necessita_correcao'].includes(String(b.situacao)))
                throw new ErroRecursoEquipe('DADOS_INVALIDOS', 'Resultado de conferência inválido.');
            return responder(req, await rpc('equipe_documento_operar', { p_id: b.id, p_acao: b.acao === 'documento_arquivar' ? 'arquivar' : b.situacao, p_revisao: revisao(), p_fonte: b.fonte ?? null }));
        }
        if (b.acao === 'documento_recuperar') {
            // Repeat confirmation is safe: operation ID never creates a second record.
            return responder(req, await rpc('equipe_documento_confirmar', { p_id: b.id }));
        }
        if (b.acao === 'documento_limpar') {
            const paths = await rpc<string[]>('equipe_documento_limpar');
            if (paths.some(path => !path.startsWith(String(b.membroId) + '/')))
                throw { code: '42501' };
            const { error } = paths.length ? await admin.storage.from('equipe-documentos').remove(paths) : { error: null };
            return responder(req, { limpeza_pendente: Boolean(error) });
        }
        throw new ErroRecursoEquipe('DADOS_INVALIDOS', 'Operação inválida.');
    }
    catch (e) {
        const erro = e instanceof ErroRecursoEquipe ? e : erroServidorRecurso(e);
        return responder(req, { codigo: erro.codigo, campo: erro.campo }, erro.codigo === 'NAO_AUTORIZADO' ? 403 : erro.codigo === 'CONFLITO' ? 409 : ['DADOS_INVALIDOS', 'DOCUMENTO_INVALIDO'].includes(erro.codigo) ? 422 : 503);
    }
});

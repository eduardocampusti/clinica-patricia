import { supabase } from './supabase';
import { objeto, validarRegistroFicha, validarMetaDocumento, CATEGORIAS_DOCUMENTO, UUID, type FichaCompleta, type RegistroFicha, type DocumentoFicha, type TipoRegistroFicha, type EventoFicha } from '../../supabase/functions/_shared/equipeFicha';
import { ErroRecursoEquipe } from '../../supabase/functions/_shared/equipeRecebimento';
export * from '../../supabase/functions/_shared/equipeFicha';
export const mensagensFicha: Record<string, string> = { NAO_AUTORIZADO: 'Você não tem autorização para estes dados neste contexto.', CONFLITO: 'Os dados mudaram em outra sessão ou a tentativa expirou. Consulte novamente antes de salvar.', RESULTADO_INCERTO: 'A confirmação não chegou. Preserve o preenchimento e consulte o resultado antes de repetir.', CONSULTA_INDISPONIVEL: 'Os novos serviços de ficha ainda não estão disponíveis neste ambiente. Os dados existentes continuam acessíveis.', DADOS_INVALIDOS: 'Revise o preenchimento e a finalidade dos campos desta seção.', DOCUMENTO_INVALIDO: 'Use PDF sem conteúdo ativo, JPEG ou PNG válido. Limite 10 MB; imagens seguem os limites da foto.' };
export function erroFicha(e: unknown, escrita = false): ErroRecursoEquipe {
    if (e instanceof ErroRecursoEquipe)
        return e;
    return new ErroRecursoEquipe(escrita ? 'RESULTADO_INCERTO' : 'CONSULTA_INDISPONIVEL', mensagensFicha[escrita ? 'RESULTADO_INCERTO' : 'CONSULTA_INDISPONIVEL']);
}
export async function operarFicha(membroId: string, clinicaId: string, acao: string, parametros: Record<string, unknown> = {}, arquivo?: File): Promise<unknown> {
    const contexto = { ...parametros, membroId, clinicaId, acao };
    let body: Record<string, unknown> | FormData = contexto;
    if (arquivo) {
        const f = new FormData();
        f.set('contexto', JSON.stringify(contexto));
        f.set('arquivo', arquivo);
        body = f;
    }
    try {
        const { data, error } = await supabase.functions.invoke('equipe-fichas', { body });
        if (error) {
            let codigo = acao === 'obter' || acao === 'versao' || acao === 'documento_ler' ? 'CONSULTA_INDISPONIVEL' : 'RESULTADO_INCERTO';
            if (error.context instanceof Response)
                try {
                    const d = objeto(await error.context.json());
                    if (typeof d.codigo === 'string' && d.codigo in mensagensFicha)
                        codigo = d.codigo;
                }
                catch { /* no raw errors */ }
            throw new ErroRecursoEquipe(codigo, mensagensFicha[codigo]);
        }
        return data;
    }
    catch (e) {
        throw erroFicha(e, !['obter', 'versao', 'documento_ler'].includes(acao));
    }
}
const identificador = (v: unknown) => typeof v === 'string' && UUID.test(v);
const instante = (v: unknown) => typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v));
const inteiro = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
const unidadesValidas = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.length <= 2 && v.every(identificador) && new Set(v).size === v.length;
const texto = (v: unknown, max = 250) => typeof v === 'string' && v.length <= max;
export function conferirRegistro(v: unknown, membro: string, tipo?: TipoRegistroFicha): RegistroFicha {
    const d = objeto(v);
    if (!identificador(d.id) || !['pessoal', 'contrato', 'formacao', 'empresa', 'checklist', 'ocupacional'].includes(String(d.tipo)) || (d.tipo === 'empresa' ? d.membro_id !== null : d.membro_id !== membro) || tipo && d.tipo !== tipo || !inteiro(d.revisao) || !unidadesValidas(d.unidades) || !d.dados || !instante(d.atualizado_em) || !texto(d.atualizado_por) || !(d.referencia_id === null || identificador(d.referencia_id)))
        throw erroFicha(null);
    try {
        validarRegistroFicha(d.tipo as TipoRegistroFicha, d.dados, objeto(d.dados));
    }
    catch {
        throw erroFicha(null);
    }
    return d as unknown as RegistroFicha;
}
export function conferirDocumento(v: unknown, membro: string): DocumentoFicha {
    const d = objeto(v);
    if (!identificador(d.id) || d.membro_id !== membro || d.armazenamento !== 'disponivel' || !CATEGORIAS_DOCUMENTO.includes(d.categoria as typeof CATEGORIAS_DOCUMENTO[number]) || !['aguardando', 'conferido', 'necessita_correcao'].includes(String(d.conferencia)) || !inteiro(d.versao) || !inteiro(d.revisao) || !inteiro(d.tamanho) || Number(d.tamanho) > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg'].includes(String(d.mime)) || !unidadesValidas(d.unidades) || typeof d.arquivado !== 'boolean' || typeof d.ocupacional !== 'boolean' || !instante(d.enviado_em) || !texto(d.enviado_por) || !(d.conferido_em === null || instante(d.conferido_em)) || !(d.conferido_por === null || texto(d.conferido_por)) || !(d.fonte === null || texto(d.fonte)) || 'caminho' in d || 'sha256' in d)
        throw erroFicha(null);
    try {
        validarMetaDocumento({ categoria: d.categoria, contrato_id: d.contrato_id, emissao: d.emissao ?? '', validade: d.validade ?? '', unidades: d.unidades, substitui_id: d.substitui_id });
    }
    catch {
        throw erroFicha(null);
    }
    return { ...d, emissao: d.emissao ?? '', validade: d.validade ?? '' } as unknown as DocumentoFicha;
}
export async function buscarFichaCompleta(membro: string, clinica: string): Promise<FichaCompleta> {
    const d = objeto(await operarFicha(membro, clinica, 'obter'));
    if (d.membro_id !== membro || d.clinica_id !== clinica || typeof d.pode_global !== 'boolean' || typeof d.pode_ocupacional !== 'boolean' || !Array.isArray(d.registros) || !Array.isArray(d.empresas) || !Array.isArray(d.documentos) || !Array.isArray(d.historico) || d.tentativas !== undefined && !Array.isArray(d.tentativas))
        throw erroFicha(null);
    const historico = d.historico.map((v: unknown) => {
        const e = objeto(v);
        if (!identificador(e.id) || !identificador(e.registro_id) || !texto(e.tipo, 80) || !inteiro(e.revisao) || !instante(e.instante) || !texto(e.ator_id) || !Array.isArray(e.campos) || e.campos.some(v => !texto(v, 80)))
            throw erroFicha(null);
        return e as unknown as EventoFicha;
    });
    const tentativas = (d.tentativas as unknown[] | undefined ?? []).map(v => {
        const t = objeto(v);
        if (!identificador(t.id) || !instante(t.criado_em) || 'caminho' in t || 'sha256' in t)
            throw erroFicha(null);
        try {
            return { id: t.id as string, criado_em: t.criado_em as string, meta: validarMetaDocumento(t.meta) };
        }
        catch {
            throw erroFicha(null);
        }
    });
    const registros = d.registros.map(r => conferirRegistro(r, membro)), empresas = d.empresas.map(r => conferirRegistro(r, membro, 'empresa')), documentos = d.documentos.map(r => conferirDocumento(r, membro));
    if (registros.some(r => r.tipo === 'empresa' || !r.unidades.includes(clinica)) || empresas.some(r => !r.unidades.includes(clinica)) || documentos.some(r => !r.unidades.includes(clinica) || r.ocupacional && !d.pode_ocupacional) || tentativas.some(t => !t.meta.unidades.includes(clinica)))
        throw erroFicha(null);
    const ocupacional_unidades = d.ocupacional_unidades ?? [];
    if (!Array.isArray(ocupacional_unidades) || ocupacional_unidades.length > 2 || ocupacional_unidades.some(v => !identificador(v)))
        throw erroFicha(null);
    return { membro_id: membro, clinica_id: clinica, pode_global: d.pode_global, pode_ocupacional: d.pode_ocupacional, ocupacional_unidades, registros, empresas, documentos, historico, tentativas };
}
export async function salvarRegistro(membro: string, clinica: string, r: Pick<RegistroFicha, 'id' | 'tipo' | 'revisao' | 'unidades' | 'referencia_id'>, dados: Record<string, unknown>): Promise<RegistroFicha> {
    const d = validarRegistroFicha(r.tipo, dados, dados);
    const v = conferirRegistro(await operarFicha(membro, clinica, 'salvar', { id: r.id, tipo: r.tipo, revisao: r.revisao, unidades: r.unidades, referenciaId: r.referencia_id, dados: d }), membro, r.tipo);
    if (v.id !== r.id || v.revisao !== r.revisao + 1)
        throw erroFicha(null, true);
    return v;
}
export async function baixarDocumento(membro: string, clinica: string, id: string): Promise<Blob> {
    const b = await operarFicha(membro, clinica, 'documento_ler', { id });
    if (!(b instanceof Blob) || !['application/pdf', 'image/jpeg'].includes(b.type) || b.size > 10 * 1024 * 1024)
        throw erroFicha(null);
    return b;
}

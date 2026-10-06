import { ErroRecursoEquipe } from './equipeRecebimento.ts';
export const DOCUMENTO_MAX_BYTES = 10 * 1024 * 1024;
export interface ArquivoValidado {
    bytes: Uint8Array;
    mime: 'application/pdf' | 'image/jpeg';
    sha256: string;
}
export async function hashDocumento(bytes: Uint8Array): Promise<string> { const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)); return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join(''); }
export async function validarArquivoDocumento(bytes: Uint8Array, mime: string, processarImagem: (b: Uint8Array, m: string) => Promise<Uint8Array>, processarPdf: (b: Uint8Array) => Promise<Uint8Array>): Promise<ArquivoValidado> {
    const falhar = (): never => { throw new ErroRecursoEquipe('DOCUMENTO_INVALIDO', 'Use PDF sem conteúdo ativo, JPEG ou PNG válido, até 10 MB. Imagens seguem os limites de foto.'); };
    if (!bytes.length || bytes.length > DOCUMENTO_MAX_BYTES)
        falhar();
    let limpo: Uint8Array;
    let formato: ArquivoValidado['mime'];
    try {
        if (mime === 'application/pdf') {
            if (new TextDecoder().decode(bytes.slice(0, 8)).match(/^%PDF-(?:1\.[0-7]|2\.0)/) === null)
                falhar();
            limpo = await processarPdf(bytes);
            formato = 'application/pdf';
        }
        else if (mime === 'image/jpeg' || mime === 'image/png') {
            limpo = await processarImagem(bytes, mime);
            formato = 'image/jpeg';
        }
        else
            return falhar();
    }
    catch {
        return falhar();
    }
    if (!limpo.length || limpo.length > DOCUMENTO_MAX_BYTES)
        falhar();
    return { bytes: limpo, mime: formato, sha256: await hashDocumento(limpo) };
}
export interface TentativaDocumento {
    id: string;
    caminho: string;
    estado: 'reservado' | 'confirmado' | 'expirado';
    documento_id: string | null;
}
export interface PortasDocumento<T> {
    reservar(arquivo: ArquivoValidado): Promise<TentativaDocumento>;
    upload(caminho: string, arquivo: ArquivoValidado): Promise<void>;
    confirmar(): Promise<T>;
}
// Retry uses the same operation ID and exact metadata/hash; confirmed retries never re-upload.
// An uncertain confirmation NEVER deletes a candidate; cleanup is separately proved in SQL.
export async function armazenarDocumento<T>(portas: PortasDocumento<T>, arquivo: ArquivoValidado): Promise<T> {
    const tentativa = await portas.reservar(arquivo);
    if (tentativa.estado === 'expirado')
        throw new ErroRecursoEquipe('CONFLITO', 'A tentativa expirou. Consulte novamente.');
    if (tentativa.estado !== 'confirmado')
        await portas.upload(tentativa.caminho, arquivo);
    return portas.confirmar();
}

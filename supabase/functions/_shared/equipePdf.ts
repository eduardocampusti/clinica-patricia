// The real PDF parser is injected for portable tests; production pins pdf-lib1.17.1.
interface DocumentoPdf {
    getPageCount(): number;
    context: {
        enumerateIndirectObjects(): [
            unknown,
            unknown
        ][];
    };
    isEncrypted: boolean;
}
interface MotorPdf {
    PDFDocument: {
        load(bytes: Uint8Array, options: {
            ignoreEncryption: boolean;
            updateMetadata: boolean;
            throwOnInvalidObject: boolean;
        }): Promise<DocumentoPdf>;
    };
    PDFName: {
        prototype: object;
    };
    PDFDict: {
        prototype: object;
    };
    PDFArray: {
        prototype: object;
    };
    PDFStream: {
        prototype: object;
    };
}
export async function validarPdfDocumento(bytes: Uint8Array, motor: MotorPdf): Promise<Uint8Array> {
    const doc = await motor.PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true });
    if (doc.isEncrypted || !doc.getPageCount() || doc.getPageCount() > 200)
        throw new Error('PDF inválido');
    const proibidos = new Set(['JavaScript', 'JS', 'Launch', 'EmbeddedFiles', 'EmbeddedFile', 'Filespec', 'RichMedia', 'OpenAction', 'AA', 'XFA', 'URI', 'GoToR', 'GoToE', 'SubmitForm', 'ImportData', 'Sound', 'Movie', 'Rendition', '3D', '3DD', '3DA', '3DV', '3DU']);
    const vistos = new Set<unknown>();
    let objetos = 0;
    function examinar(v: unknown, depth = 0) {
        if (depth > 100 || ++objetos > 100000)
            throw new Error('PDF complexo');
        if (!v || typeof v !== 'object' || vistos.has(v))
            return;
        vistos.add(v);
        if (motor.PDFName.prototype.isPrototypeOf(v)) {
            if (proibidos.has((v as {
                decodeText(): string;
            }).decodeText()))
                throw new Error('Conteúdo ativo');
            return;
        }
        if (motor.PDFStream.prototype.isPrototypeOf(v)) {
            examinar((v as {
                dict: unknown;
            }).dict, depth + 1);
            return;
        }
        if (motor.PDFDict.prototype.isPrototypeOf(v))
            for (const [k, c] of (v as {
                entries(): [
                    unknown,
                    unknown
                ][];
            }).entries()) {
                examinar(k, depth + 1);
                examinar(c, depth + 1);
            }
        if (motor.PDFArray.prototype.isPrototypeOf(v)) {
            const a = v as {
                size(): number;
                get(i: number): unknown;
            };
            for (let i = 0; i < a.size(); i++)
                examinar(a.get(i), depth + 1);
        }
    }
    for (const [, v] of doc.context.enumerateIndirectObjects())
        examinar(v);
    // Preserve exact original bytes (including signatures). Saving is not signature verification.
    // MIME/parsed content checks do not certify absence of malware.
    return bytes;
}

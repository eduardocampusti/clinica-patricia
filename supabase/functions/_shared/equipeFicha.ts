// Shared deterministic contracts. No AI, no logging and no mutation of Auth/Agenda.
import { ErroRecursoEquipe, cnpjRecebimentoValido } from './equipeRecebimento.ts';
const validarCnpj = (s: string) => cnpjRecebimentoValido(s.replace(/[./\s-]/g, '').toUpperCase());
export type TipoRegistroFicha = 'pessoal' | 'contrato' | 'formacao' | 'empresa' | 'checklist' | 'ocupacional';
export interface RegistroFicha {
    id: string;
    membro_id: string | null;
    tipo: TipoRegistroFicha;
    unidades: string[];
    referencia_id: string | null;
    revisao: number;
    dados: Record<string, unknown>;
    atualizado_em: string;
    atualizado_por: string;
}
export interface DocumentoFicha {
    id: string;
    membro_id: string;
    contrato_id: string | null;
    unidades: string[];
    categoria: string;
    mime: string;
    tamanho: number;
    emissao: string;
    validade: string;
    versao: number;
    substitui_id: string | null;
    arquivado: boolean;
    armazenamento: 'disponivel';
    conferencia: 'aguardando' | 'conferido' | 'necessita_correcao';
    revisao: number;
    enviado_em: string;
    enviado_por: string;
    conferido_em: string | null;
    conferido_por: string | null;
    fonte: string | null;
    ocupacional: boolean;
}
export interface EventoFicha {
    id: string;
    registro_id: string;
    tipo: string;
    revisao: number;
    instante: string;
    ator_id: string;
    campos: string[];
}
export interface FichaCompleta {
    membro_id: string;
    clinica_id: string;
    pode_global: boolean;
    pode_ocupacional: boolean;
    ocupacional_unidades?: string[];
    registros: RegistroFicha[];
    empresas: RegistroFicha[];
    documentos: DocumentoFicha[];
    historico: EventoFicha[];
    tentativas?: {
        id: string;
        meta: MetaDocumento;
        criado_em: string;
    }[];
}
export const CATEGORIAS_DOCUMENTO = ['identificacao', 'endereco', 'contrato', 'aditivo', 'admissao', 'formacao', 'dependentes', 'termo_interno', 'equipamentos', 'aso', 'capacitacao'] as const;
export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const objeto = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const falha = (campo: string, mensagem = 'Revise os dados desta seção.'): never => { throw new ErroRecursoEquipe('DADOS_INVALIDOS', mensagem, campo); };
const texto = (v: unknown, max = 250): string => {
    if (typeof v !== 'string' || v.length > max || [...v].some(c => c.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(c)))
        return falha('texto');
    return v.trim();
};
const data = (v: unknown, campo: string): string => {
    const s = texto(v, 10);
    if (s && (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s + 'T12:00:00Z')) || new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) !== s))
        falha(campo, 'Informe uma data válida.');
    return s;
};
const escolha = (v: unknown, opcoes: string[], campo: string): string => {
    if (!opcoes.includes(String(v)))
        falha(campo);
    return String(v);
};
const lista = (v: unknown, max = 40): unknown[] => {
    if (!Array.isArray(v) || v.length > max)
        return falha('lista');
    return v;
};
const campos = (v: unknown, chaves: string[]): Record<string, unknown> => {
    const d = objeto(v);
    if (!v || Array.isArray(v) || Object.keys(d).some(k => !chaves.includes(k)))
        falha('campos');
    return d;
};
const id = (v: unknown): string => {
    const s = texto(v, 36);
    if (!UUID.test(s))
        falha('identificador');
    return s;
};
const num = (v: unknown, min: number, max: number, campo: string): string => {
    const s = texto(v, 18);
    if (s && (!/^\d+(\.\d{1,2})?$/.test(s) || Number(s) < min || Number(s) > max))
        falha(campo);
    return s;
};
const uf = (v: unknown): string => {
    const s = texto(v, 2).toUpperCase();
    if (s && !['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].includes(s))
        falha('uf');
    return s;
};
const tel = (v: unknown): string => {
    const s = texto(v, 30);
    if (s && !/^\+?[\d() .-]{8,30}$/.test(s))
        falha('telefone');
    return s;
};
export const pessoalVazio = () => ({ nome_social: '', nascimento: '', documento_tipo: '', documento_numero: '', documento_orgao: '', documento_uf: '', documento_emissao: '', endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }, emergencia: { nome: '', relacao: '', telefone: '' }, escolaridade: '', finalidade_admissao: false, finalidade_beneficios: false, filiacao: [], nacionalidade: '', dependentes: [] });
export const contratoVazio = () => ({ empresa_id: '', vinculo: 'clt', matricula: '', admissao: '', inicio_atividades: '', prazo: 'indeterminado', termino: '', experiencia_fim: '', cargo: '', setor: '', responsavel: '', atividades: '', cbo: '', horas_semanais: '', escala: '', jornada: [], remuneracao: '', periodicidade: 'mensal', beneficios: [], situacao: 'em_preparacao', situacao_data: '', vigencia: '', ctps: { modalidade: 'digital', conferencia: 'aguardando', numero: '', serie: '', uf: '', pis_necessario: false, pis: '' }, pj: { nome: '', cnpj: '' } });
export const formacaoVazia = () => ({ cursos: [], registros: [], especialidades: [] });
export const checklistVazio = () => ({ itens: CATEGORIAS_DOCUMENTO.map(categoria => ({ categoria, exigencia: 'pendente_definicao', finalidade: '', responsavel: '', funcao: '', vinculo: '' })) });
export function validarRegistroFicha(tipo: TipoRegistroFicha, entrada: unknown, anterior: Record<string, unknown> | null = null): Record<string, unknown> {
    if (tipo === 'pessoal') {
        const d = campos(entrada, Object.keys(pessoalVazio())), e = campos(d.endereco, ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf']), em = campos(d.emergencia, ['nome', 'relacao', 'telefone']);
        if (typeof d.finalidade_admissao !== 'boolean' || typeof d.finalidade_beneficios !== 'boolean')
            falha('finalidade');
        const filiacao = lista(d.filiacao, 2).map(v => texto(v)), dependentes = lista(d.dependentes, 12).map(v => { const p = campos(v, ['id', 'nome', 'relacao', 'nascimento', 'finalidade']); return { id: id(p.id), nome: texto(p.nome), relacao: texto(p.relacao), nascimento: data(p.nascimento, 'nascimento'), finalidade: texto(p.finalidade) }; });
        if (!d.finalidade_admissao && (filiacao.length || d.nacionalidade))
            falha('finalidade', 'Filiação e nacionalidade exigem finalidade de admissão.');
        if (dependentes.length && !d.finalidade_beneficios)
            falha('dependentes', 'Dependentes exigem finalidade de benefício definida.');
        if (dependentes.some(p => !p.nome || !p.finalidade))
            falha('dependentes');
        const nascimento = data(d.nascimento, 'nascimento');
        if (nascimento && nascimento > new Date().toISOString().slice(0, 10))
            falha('nascimento');
        if (String(d.documento_tipo).trim().toUpperCase() === 'CPF')
            falha('documento_tipo', 'O CPF é tratado exclusivamente pelo cadastro protegido existente.');
        const cep = texto(e.cep, 9);
        if (cep && !/^\d{5}-?\d{3}$/.test(cep))
            falha('cep');
        return { ...d, nome_social: texto(d.nome_social), nascimento, documento_tipo: texto(d.documento_tipo, 40), documento_numero: texto(d.documento_numero, 60), documento_orgao: texto(d.documento_orgao, 60), documento_uf: uf(d.documento_uf), documento_emissao: data(d.documento_emissao, 'emissao'), endereco: { cep, logradouro: texto(e.logradouro), numero: texto(e.numero, 30), complemento: texto(e.complemento), bairro: texto(e.bairro), cidade: texto(e.cidade), uf: uf(e.uf) }, emergencia: { nome: texto(em.nome), relacao: texto(em.relacao), telefone: tel(em.telefone) }, escolaridade: texto(d.escolaridade, 80), filiacao, nacionalidade: texto(d.nacionalidade, 80), dependentes };
    }
    if (tipo === 'empresa') {
        const d = campos(entrada, ['nome', 'cnpj']);
        const nome = texto(d.nome);
        if (nome.length < 3)
            falha('nome', 'Informe o nome da empresa contratante.');
        const cnpj = texto(d.cnpj, 20);
        if (cnpj && !validarCnpj(cnpj))
            falha('cnpj');
        return { nome, cnpj };
    }
    if (tipo === 'contrato') {
        const d = campos(entrada, Object.keys(contratoVazio()));
        const vinculo = escolha(d.vinculo, ['clt', 'servicos_pf', 'servicos_pj', 'estagio', 'outro'], 'vinculo');
        const ctps = campos(d.ctps, ['modalidade', 'conferencia', 'numero', 'serie', 'uf', 'pis_necessario', 'pis']);
        const pj = campos(d.pj, ['nome', 'cnpj']);
        const prazo = escolha(d.prazo, ['indeterminado', 'determinado', 'nao_aplicavel'], 'prazo'), inicio = data(d.admissao, 'admissao'), termino = data(d.termino, 'termino'), exp = data(d.experiencia_fim, 'experiencia'), vigencia = data(d.vigencia, 'vigencia');
        if (!inicio || !vigencia || !d.cargo)
            falha('contrato', 'Informe início, cargo e vigência desta versão.');
        if (prazo === 'determinado' && !termino || termino && termino < inicio || exp && exp < inicio || prazo !== 'determinado' && termino)
            falha('termino', 'Confira prazo e datas do contrato.');
        if (vinculo !== 'clt' && (exp || ctps.numero || ctps.serie || ctps.pis))
            falha('ctps', 'CTPS e experiência trabalhista são campos de vínculo CLT.');
        const modalidade = escolha(ctps.modalidade, ['digital', 'fisica', 'nao_aplicavel'], 'ctps');
        if (modalidade !== 'fisica' && (ctps.numero || ctps.serie || ctps.uf))
            falha('ctps', 'Dados físicos só se aplicam à CTPS física.');
        if (typeof ctps.pis_necessario !== 'boolean' || !ctps.pis_necessario && ctps.pis)
            falha('pis');
        const pis = texto(ctps.pis, 20);
        if (pis && !/^\d{11}$/.test(pis.replace(/\D/g, '')))
            falha('pis');
        const cnpj = texto(pj.cnpj, 20);
        if (vinculo !== 'servicos_pj' && (pj.nome || cnpj) || cnpj && !validarCnpj(cnpj))
            falha('pj');
        const jornada = lista(d.jornada, 28).map(v => {
            const j = campos(v, ['id', 'unidade_id', 'dia', 'inicio', 'fim', 'intervalo_inicio', 'intervalo_fim']);
            const hora = (h: unknown) => {
                const s = texto(h, 5);
                if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))
                    falha('jornada');
                return s;
            };
            const ini = hora(j.inicio), fim = hora(j.fim), intIni = j.intervalo_inicio ? hora(j.intervalo_inicio) : '', intFim = j.intervalo_fim ? hora(j.intervalo_fim) : '';
            if (ini >= fim || Boolean(intIni) !== Boolean(intFim) || intIni && (intIni < ini || intFim > fim || intIni >= intFim))
                falha('jornada', 'Use horários crescentes e intervalo dentro da jornada. Divida turnos noturnos em dois dias.');
            return { id: id(j.id), unidade_id: id(j.unidade_id), dia: escolha(j.dia, ['0', '1', '2', '3', '4', '5', '6'], 'dia'), inicio: ini, fim, intervalo_inicio: intIni, intervalo_fim: intFim };
        });
        for (let i = 0; i < jornada.length; i++)
            for (let k = i + 1; k < jornada.length; k++)
                if (jornada[i].dia === jornada[k].dia && jornada[i].inicio < jornada[k].fim && jornada[k].inicio < jornada[i].fim)
                    falha('jornada', 'Há horários sobrepostos, inclusive entre unidades.');
        const situacao = escolha(d.situacao, ['em_preparacao', 'vigente', 'encerrado', 'suspenso'], 'situacao');
        const situacao_data = data(d.situacao_data, 'situacao_data');
        if (situacao !== 'em_preparacao' && !situacao_data)
            falha('situacao_data');
        const cbo = texto(d.cbo, 7);
        if (cbo && !/^\d{4}-?\d{2}$/.test(cbo))
            falha('cbo');
        return { ...d, empresa_id: id(d.empresa_id), vinculo, matricula: texto(d.matricula, 60), admissao: inicio, inicio_atividades: data(d.inicio_atividades, 'inicio_atividades'), prazo, termino, experiencia_fim: exp, cargo: texto(d.cargo), setor: texto(d.setor), responsavel: texto(d.responsavel), atividades: texto(d.atividades, 1000), cbo, horas_semanais: num(d.horas_semanais, 0, 168, 'horas_semanais'), escala: texto(d.escala), jornada, remuneracao: num(d.remuneracao, 0, 999999999.99, 'remuneracao'), periodicidade: escolha(d.periodicidade, ['mensal', 'semanal', 'hora', 'servico', 'outra'], 'periodicidade'), beneficios: lista(d.beneficios, 20).map(v => texto(v)), situacao, situacao_data, vigencia, ctps: { ...ctps, modalidade, conferencia: escolha(ctps.conferencia, ['aguardando', 'conferido', 'necessita_correcao'], 'ctps'), numero: texto(ctps.numero, 30), serie: texto(ctps.serie, 30), uf: uf(ctps.uf), pis }, pj: { nome: texto(pj.nome), cnpj } };
    }
    if (tipo === 'formacao') {
        const d = campos(entrada, ['cursos', 'registros', 'especialidades']);
        const antigos = Array.isArray(anterior?.registros) ? anterior.registros.map(objeto) : [];
        const cursos = lista(d.cursos).map(v => { const c = campos(v, ['id', 'formacao', 'instituicao', 'conclusao', 'documento_id']); return { id: id(c.id), formacao: texto(c.formacao), instituicao: texto(c.instituicao), conclusao: data(c.conclusao, 'conclusao'), documento_id: c.documento_id ? id(c.documento_id) : '' }; });
        const registros = lista(d.registros).map(v => { const r = campos(v, ['id', 'conselho', 'numero', 'uf', 'situacao_informada', 'conferencia', 'conferido_em', 'conferido_por', 'fonte', 'evidencia_id', 'proxima_conferencia']); const antigo = antigos.find(a => a.id === r.id); const mesmo = antigo && ['conselho', 'numero', 'uf', 'situacao_informada'].every(k => antigo[k] === r[k]); return { id: id(r.id), conselho: texto(r.conselho, 30).toUpperCase(), numero: texto(r.numero, 60), uf: uf(r.uf), situacao_informada: escolha(r.situacao_informada, ['informado', 'ativo', 'inativo', 'nao_confirmado'], 'situacao'), conferencia: mesmo ? antigo.conferencia : 'aguardando', conferido_em: mesmo ? antigo.conferido_em : null, conferido_por: mesmo ? antigo.conferido_por : null, fonte: mesmo ? antigo.fonte : '', evidencia_id: mesmo ? antigo.evidencia_id : '', proxima_conferencia: data(r.proxima_conferencia, 'proxima_conferencia') }; });
        if (registros.some(r => !r.conselho || !r.numero || !r.uf) || new Set(registros.map(r => r.id)).size !== registros.length)
            falha('registro', 'Informe conselho, número e UF de cada inscrição.');
        const especialidades = lista(d.especialidades).map(v => {
            const e = campos(v, ['id', 'nome', 'area', 'registro_id', 'rqe', 'documento_id']);
            const registro = registros.find(r => r.id === e.registro_id);
            if (e.registro_id && !registro || e.rqe && (!registro || registro.conselho !== 'CRM'))
                falha('rqe', 'RQE deve estar ligado à inscrição CRM/UF correspondente.');
            return { id: id(e.id), nome: texto(e.nome), area: texto(e.area), registro_id: e.registro_id ? id(e.registro_id) : '', rqe: texto(e.rqe, 40), documento_id: e.documento_id ? id(e.documento_id) : '' };
        });
        if (especialidades.some(e => !e.nome))
            falha('especialidade');
        return { cursos, registros, especialidades };
    }
    if (tipo === 'checklist') {
        const d = campos(entrada, ['itens']);
        return { itens: lista(d.itens, 30).map(v => {
                const i = campos(v, ['categoria', 'exigencia', 'finalidade', 'responsavel', 'funcao', 'vinculo']);
                const exigencia = escolha(i.exigencia, ['necessario', 'complementar', 'nao_aplicavel', 'pendente_definicao'], 'exigencia');
                if (exigencia === 'necessario' && (!i.finalidade || !i.responsavel))
                    falha('checklist', 'Necessidade exige finalidade e responsável definidos.');
                return { categoria: escolha(i.categoria, [...CATEGORIAS_DOCUMENTO], 'categoria'), exigencia, finalidade: texto(i.finalidade), responsavel: texto(i.responsavel), funcao: texto(i.funcao), vinculo: texto(i.vinculo) };
            }) };
    }
    if (tipo === 'ocupacional') {
        const d = campos(entrada, ['aso_data', 'proxima_avaliacao', 'responsavel', 'documento_id', 'capacitacoes']);
        return { aso_data: data(d.aso_data, 'aso_data'), proxima_avaliacao: data(d.proxima_avaliacao, 'proxima_avaliacao'), responsavel: texto(d.responsavel), documento_id: d.documento_id ? id(d.documento_id) : '', capacitacoes: lista(d.capacitacoes).map(v => { const c = campos(v, ['id', 'nome', 'realizada', 'proxima', 'documento_id']); return { id: id(c.id), nome: texto(c.nome), realizada: data(c.realizada, 'realizada'), proxima: data(c.proxima, 'proxima'), documento_id: c.documento_id ? id(c.documento_id) : '' }; }) };
    }
    return falha('tipo');
}
export interface MetaDocumento {
    categoria: string;
    contrato_id: string | null;
    emissao: string;
    validade: string;
    unidades: string[];
    substitui_id: string | null;
}
export function validarMetaDocumento(v: unknown): MetaDocumento {
    const d = campos(v, ['categoria', 'contrato_id', 'emissao', 'validade', 'unidades', 'substitui_id']);
    const unidades = lista(d.unidades, 2).map(id);
    if (!unidades.length || new Set(unidades).size !== unidades.length)
        falha('unidades', 'Selecione explicitamente o escopo do documento.');
    const emissao = data(d.emissao, 'emissao'), validade = data(d.validade, 'validade');
    if (emissao && validade && validade < emissao)
        falha('validade');
    return { categoria: escolha(d.categoria, [...CATEGORIAS_DOCUMENTO], 'categoria'), contrato_id: d.contrato_id ? id(d.contrato_id) : null, emissao, validade, unidades, substitui_id: d.substitui_id ? id(d.substitui_id) : null };
}
export function pendenciasFicha(ficha: FichaCompleta, hoje: string, recebimento?: 'configurado' | 'ausente' | 'indisponivel'): string[] {
    const limite = new Date(hoje + 'T12:00:00Z');
    limite.setUTCDate(limite.getUTCDate() + 30);
    const ate = limite.toISOString().slice(0, 10);
    const p: string[] = [];
    for (const d of ficha.documentos.filter(d => !d.arquivado)) {
        if (d.conferencia === 'aguardando')
            p.push(`Documento ${d.categoria}: aguarda conferência (versão ${d.versao}).`);
        if (d.conferencia === 'necessita_correcao')
            p.push(`Documento ${d.categoria}: necessita correção.`);
        if (d.validade && d.validade <= ate)
            p.push(`Documento ${d.categoria}: ${d.validade < hoje ? 'validade vencida' : 'validade próxima'} (${d.validade}).`);
    }
    for (const r of ficha.registros) {
        if (r.tipo === 'contrato' && r.dados.situacao === 'vigente' && typeof r.dados.termino === 'string' && r.dados.termino && r.dados.termino <= ate)
            p.push(`Contrato: término ${r.dados.termino < hoje ? 'previsto já alcançado' : 'previsto próximo'} (${r.dados.termino}).`);
        if (r.tipo === 'formacao')
            for (const v of (r.dados.registros as unknown[] ?? [])) {
                const a = objeto(v);
                if (a.conferencia !== 'conferido')
                    p.push(`Inscrição ${a.conselho}/${a.uf}: ainda não conferida.`);
            }
    }
    if (recebimento === 'ausente')
        p.push('Recebimento ainda não configurado nesta clínica.');
    return p;
}

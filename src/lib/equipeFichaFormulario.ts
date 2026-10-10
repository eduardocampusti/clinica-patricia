import { objeto, type RegistroFicha, type TipoRegistroFicha } from './equipeFicha';
import { consultarCep, type EnderecoViaCep } from './pacienteFormulario';
export interface CampoFicha {
    chave: string;
    label: string;
    tipo?: 'date' | 'time' | 'number' | 'select' | 'checkbox' | 'textarea';
    opcoes?: [
        string,
        string
    ][];
    quando?: (d: Record<string, unknown>) => boolean;
    privado?: boolean;
}
const c = (chave: string, label: string, tipo?: CampoFicha['tipo'], opcoes?: [
    string,
    string
][]): CampoFicha => ({ chave, label, tipo, opcoes });
const ufOpcoes = ['', 'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(v => [v, v || 'Selecione'] as [
    string,
    string
]);
const clt = (d: Record<string, unknown>) => d.vinculo === 'clt';
export const camposPessoal: CampoFicha[] = [c('nome_social', 'Nome social (quando informado)'), c('nascimento', 'Data de nascimento', 'date'), c('documento_tipo', 'Tipo de identificação'), { ...c('documento_numero', 'Número da identificação'), privado: true }, c('documento_orgao', 'Órgão emissor'), c('documento_uf', 'UF da identificação', 'select', ufOpcoes), c('documento_emissao', 'Emissão da identificação', 'date'), c('endereco.cep', 'CEP'), c('endereco.logradouro', 'Logradouro'), c('endereco.numero', 'Número'), c('endereco.complemento', 'Complemento'), c('endereco.bairro', 'Bairro'), c('endereco.cidade', 'Cidade'), c('endereco.uf', 'UF do endereço', 'select', ufOpcoes), c('emergencia.nome', 'Nome do contato de emergência'), c('emergencia.relacao', 'Relação do contato'), c('emergencia.telefone', 'Telefone de emergência'), c('escolaridade', 'Escolaridade'), c('finalidade_admissao', 'Há finalidade de admissão para informações complementares', 'checkbox'), c('finalidade_beneficios', 'Há finalidade de benefício para dependentes', 'checkbox'), { ...c('nacionalidade', 'Nacionalidade para admissão'), quando: d => d.finalidade_admissao === true }];
export const camposContrato: CampoFicha[] = [c('empresa_id', 'Empresa contratante', 'select', []), c('vinculo', 'Tipo de vínculo', 'select', [['clt', 'CLT'], ['servicos_pf', 'Prestação de serviços PF'], ['servicos_pj', 'Prestação de serviços PJ'], ['estagio', 'Estágio'], ['outro', 'Outro vínculo pertinente']]), c('matricula', 'Matrícula interna (opcional)'), c('admissao', 'Admissão / início do contrato', 'date'), c('inicio_atividades', 'Início das atividades', 'date'), c('prazo', 'Prazo', 'select', [['indeterminado', 'Indeterminado'], ['determinado', 'Determinado'], ['nao_aplicavel', 'Não aplicável']]), { ...c('termino', 'Término previsto', 'date'), quando: d => d.prazo === 'determinado' }, { ...c('experiencia_fim', 'Fim da experiência (quando aplicável)', 'date'), quando: clt }, c('cargo', 'Cargo contratual'), c('setor', 'Setor'), c('responsavel', 'Responsável / supervisor'), c('atividades', 'Descrição resumida das atividades', 'textarea'), c('cbo', 'CBO (quando aplicável)'), c('horas_semanais', 'Carga horária semanal'), c('escala', 'Identificação da escala'), { ...c('remuneracao', 'Remuneração contratual (restrita)'), privado: true }, c('periodicidade', 'Periodicidade da remuneração', 'select', [['mensal', 'Mensal'], ['semanal', 'Semanal'], ['hora', 'Por hora'], ['servico', 'Por serviço'], ['outra', 'Outra']]), c('situacao', 'Situação contratual', 'select', [['em_preparacao', 'Em preparação'], ['vigente', 'Vigente'], ['suspenso', 'Suspenso'], ['encerrado', 'Encerrado']]), c('situacao_data', 'Data da situação contratual', 'date'), c('vigencia', 'Vigência desta versão', 'date'), { ...c('ctps.modalidade', 'CTPS', 'select', [['digital', 'Digital — identificação pelo CPF protegido'], ['fisica', 'Física (quando aplicável)'], ['nao_aplicavel', 'Não aplicável']]), quando: clt }, { ...c('ctps.conferencia', 'Conferência da CTPS', 'select', [['aguardando', 'Aguardando'], ['conferido', 'Conferida'], ['necessita_correcao', 'Necessita correção']]), quando: clt }, ...['numero', 'serie', 'uf'].map((k): CampoFicha => ({ ...c('ctps.' + k, 'CTPS física: ' + ({ numero: 'número', serie: 'série', uf: 'UF' }[k]), k === 'uf' ? 'select' : undefined, k === 'uf' ? ufOpcoes : undefined), privado: true, quando: d => clt(d) && objeto(d.ctps).modalidade === 'fisica' })), { ...c('ctps.pis_necessario', 'PIS/NIS necessário neste processo', 'checkbox'), quando: clt }, { ...c('ctps.pis', 'PIS/NIS (somente quando necessário)'), privado: true, quando: d => clt(d) && objeto(d.ctps).pis_necessario === true }, { ...c('pj.nome', 'PJ contratada: razão social'), quando: d => d.vinculo === 'servicos_pj' }, { ...c('pj.cnpj', 'PJ contratada: CNPJ'), privado: true, quando: d => d.vinculo === 'servicos_pj' }];
export interface GrupoFicha {
    chave: string;
    label: string;
    item: () => Record<string, unknown>;
    campos: CampoFicha[];
    quando?: (d: Record<string, unknown>) => boolean;
    simples?: boolean;
}
export const gruposPessoal: GrupoFicha[] = [{ chave: 'filiacao', label: 'Filiação para admissão', item: () => ({ valor: '' }), campos: [c('valor', 'Nome declarado')], quando: d => d.finalidade_admissao === true, simples: true }, { chave: 'dependentes', label: 'Dependentes para benefício definido', item: () => ({ id: crypto.randomUUID(), nome: '', relacao: '', nascimento: '', finalidade: '' }), campos: [c('nome', 'Nome do dependente'), c('relacao', 'Relação'), c('nascimento', 'Nascimento do dependente', 'date'), c('finalidade', 'Finalidade do benefício')], quando: d => d.finalidade_beneficios === true }];
export const gruposContrato: GrupoFicha[] = [{ chave: 'jornada', label: 'Jornada por unidade', item: () => ({ id: crypto.randomUUID(), unidade_id: '', dia: '1', inicio: '', fim: '', intervalo_inicio: '', intervalo_fim: '' }), campos: [c('unidade_id', 'Unidade da jornada', 'select', []), c('dia', 'Dia da semana', 'select', [['0', 'Domingo'], ['1', 'Segunda'], ['2', 'Terça'], ['3', 'Quarta'], ['4', 'Quinta'], ['5', 'Sexta'], ['6', 'Sábado']]), c('inicio', 'Entrada', 'time'), c('fim', 'Saída', 'time'), c('intervalo_inicio', 'Início do intervalo', 'time'), c('intervalo_fim', 'Fim do intervalo', 'time')] }, { chave: 'beneficios', label: 'Benefícios aplicáveis', item: () => ({ valor: '' }), campos: [c('valor', 'Benefício')], simples: true }];
export const gruposFormacao: GrupoFicha[] = [{ chave: 'cursos', label: 'Formação e diplomas', item: () => ({ id: crypto.randomUUID(), formacao: '', instituicao: '', conclusao: '', documento_id: '' }), campos: [c('formacao', 'Formação / curso'), c('instituicao', 'Instituição'), c('conclusao', 'Conclusão', 'date'), c('documento_id', 'Diploma / documento', 'select', [])] }, { chave: 'registros', label: 'Inscrições em conselhos', item: () => ({ id: crypto.randomUUID(), conselho: '', numero: '', uf: '', situacao_informada: 'informado', conferencia: 'aguardando', conferido_em: null, conferido_por: null, fonte: '', evidencia_id: '', proxima_conferencia: '' }), campos: [c('conselho', 'Conselho (CRM, COREN, CRP…)'), c('numero', 'Número da inscrição'), c('uf', 'UF da inscrição', 'select', ufOpcoes), c('situacao_informada', 'Situação informada', 'select', [['informado', 'Informado'], ['ativo', 'Ativo informado'], ['inativo', 'Inativo informado'], ['nao_confirmado', 'Não confirmado']]), c('proxima_conferencia', 'Próxima conferência (se definida)', 'date')] }, { chave: 'especialidades', label: 'Especialidades e áreas de atuação', item: () => ({ id: crypto.randomUUID(), nome: '', area: '', registro_id: '', rqe: '', documento_id: '' }), campos: [c('nome', 'Especialidade informada'), c('area', 'Área de atuação'), c('registro_id', 'Inscrição correspondente', 'select', []), c('rqe', 'RQE (somente médico com CRM correspondente)'), c('documento_id', 'Documento de referência', 'select', [])] }];
export const grupoChecklist: GrupoFicha = { chave: 'itens', label: 'Exigências por vínculo e função', item: () => ({ categoria: 'identificacao', exigencia: 'pendente_definicao', finalidade: '', responsavel: '', funcao: '', vinculo: '' }), campos: [c('categoria', 'Categoria', 'select', ['identificacao', 'endereco', 'contrato', 'aditivo', 'admissao', 'formacao', 'dependentes', 'termo_interno', 'equipamentos', 'aso', 'capacitacao'].map(v => [v, v.replaceAll('_', ' ')])), c('exigencia', 'Classificação da exigência', 'select', [['pendente_definicao', 'Pendente de definição pelo responsável'], ['necessario', 'Necessário para a etapa'], ['complementar', 'Complementar'], ['nao_aplicavel', 'Não aplicável']]), c('finalidade', 'Finalidade / etapa aplicável'), c('responsavel', 'Responsável pela definição'), c('funcao', 'Função à qual se aplica'), c('vinculo', 'Vínculo ao qual se aplica')] };
export const camposOcupacional: CampoFicha[] = [c('aso_data', 'Data administrativa do ASO', 'date'), c('proxima_avaliacao', 'Próxima avaliação informada pelo responsável', 'date'), c('responsavel', 'Responsável ocupacional'), c('documento_id', 'Comprovante administrativo autorizado', 'select', [])];
export const grupoCapacitacoes: GrupoFicha = { chave: 'capacitacoes', label: 'Capacitações pertinentes', item: () => ({ id: crypto.randomUUID(), nome: '', realizada: '', proxima: '', documento_id: '' }), campos: [c('nome', 'Capacitação'), c('realizada', 'Realizada em', 'date'), c('proxima', 'Próxima data (se informada)', 'date'), c('documento_id', 'Comprovante', 'select', [])] };
export const obterValor = (d: Record<string, unknown>, path: string): unknown => path.split('.').reduce<unknown>((v, k) => objeto(v)[k], d);
export function mudarValor(d: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
    const novo = structuredClone(d);
    const keys = path.split('.');
    let alvo = novo;
    for (const key of keys.slice(0, -1))
        alvo = alvo[key] as Record<string, unknown>;
    alvo[keys.at(-1)!] = value;
    // Hide irrelevant data by clearing only after an explicit purpose/type change.
    if (path === 'finalidade_admissao' && !value) {
        novo.filiacao = [];
        novo.nacionalidade = '';
    }
    if (path === 'finalidade_beneficios' && !value)
        novo.dependentes = [];
    if (path === 'prazo' && value !== 'determinado')
        novo.termino = '';
    if (path === 'vinculo' && value !== 'clt') {
        novo.experiencia_fim = '';
        novo.ctps = { modalidade: 'nao_aplicavel', conferencia: 'aguardando', numero: '', serie: '', uf: '', pis_necessario: false, pis: '' };
    }
    if (path === 'vinculo' && value !== 'servicos_pj')
        novo.pj = { nome: '', cnpj: '' };
    if (path === 'ctps.modalidade' && value !== 'fisica')
        Object.assign(objeto(novo.ctps), { numero: '', serie: '', uf: '' });
    if (path === 'ctps.pis_necessario' && !value)
        objeto(novo.ctps).pis = '';
    return novo;
}
export interface OpcoesFicha {
    unidades: [
        string,
        string
    ][];
    empresas: RegistroFicha[];
    documentos: [
        string,
        string
    ][];
    registros: [
        string,
        string
    ][];
}
export function opcoesCampo(c: CampoFicha, o: OpcoesFicha) {
    if (c.chave === 'empresa_id')
        return o.empresas.map(e => [e.id, String(e.dados.nome)] as [
            string,
            string
        ]);
    if (c.chave === 'unidade_id')
        return o.unidades;
    if (c.chave === 'documento_id')
        return o.documentos;
    if (c.chave === 'registro_id')
        return o.registros;
    return c.opcoes ?? [];
}
export async function enderecoPeloCep(cep: string, signal: AbortSignal): Promise<EnderecoViaCep | null> { return consultarCep(cep, signal); }
export function camposDoTipo(tipo: TipoRegistroFicha): CampoFicha[] { return tipo === 'pessoal' ? camposPessoal : tipo === 'contrato' ? camposContrato : tipo === 'empresa' ? [c('nome', 'Nome / razão social da empresa'), { ...c('cnpj', 'CNPJ da empresa (quando informado)'), privado: true }] : tipo === 'ocupacional' ? camposOcupacional : []; }
export function gruposDoTipo(tipo: TipoRegistroFicha): GrupoFicha[] { return tipo === 'pessoal' ? gruposPessoal : tipo === 'contrato' ? gruposContrato : tipo === 'formacao' ? gruposFormacao : tipo === 'checklist' ? [grupoChecklist] : tipo === 'ocupacional' ? [grupoCapacitacoes] : []; }

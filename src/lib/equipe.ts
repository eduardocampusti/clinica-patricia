import { apenasDigitos, cpfValido } from './cpf'
import { formatarTextoPortugues, normalizarEspacos } from './pacienteFormulario'

export type TipoMembroEquipe = 'profissional_saude' | 'administrativo' | 'apoio' | 'outro'

export interface ClinicaEquipe {
  id: string
  nome: string
}

export interface MembroEquipe {
  id: string
  nome_completo: string
  cargo: string
  tipo: TipoMembroEquipe
  profissao: string | null
  telefone: string | null
  email_contato: string | null
  conselho_classe: string | null
  registro_conselho: string | null
  conselho_uf: string | null
  especialidade_id: string | null
  especialidade_nome: string | null
  acesso_status: 'ativo_na_unidade' | 'sem_acesso_na_unidade' | 'conta_inativa' | 'conta_vinculada' | 'sem_conta'
  clinicas: ClinicaEquipe[]
  revisao: number
  origem_legada?: boolean
}

export interface DetalheMembroEquipe extends MembroEquipe {
  cpf: string | null
  cpf_situacao: 'informado' | 'ausente' | 'indisponivel'
}

export interface FormularioEquipe {
  chaveIdempotencia: string
  nomeCompleto: string
  cargo: string
  outroCargo: string
  tipo: TipoMembroEquipe
  profissao: string
  cpf: string
  cpfSituacao: 'novo' | 'informado' | 'ausente' | 'indisponivel'
  alterarCpf: boolean
  telefone: string
  emailContato: string
  conselhoClasse: string
  registroConselho: string
  conselhoUf: string
  especialidadeId: string
  clinicasIds: string[]
  revisao: number | null
}

export type CampoFormularioEquipe =
  | 'nomeCompleto'
  | 'cargo'
  | 'outroCargo'
  | 'profissao'
  | 'cpf'
  | 'emailContato'
  | 'conselho'
  | 'clinicas'

export interface ErroFormularioEquipe {
  campo: CampoFormularioEquipe
  mensagem: string
}

export interface DadosEquipeRpc {
  nome_completo: string
  cargo: string
  tipo: TipoMembroEquipe
  profissao: string | null
  cpf_modo: 'preservar' | 'substituir' | 'remover'
  cpf: string | null
  telefone: string | null
  email_contato: string | null
  conselho_classe: string | null
  registro_conselho: string | null
  conselho_uf: string | null
  especialidade_id: string | null
  clinicas_ids: string[]
}

export const CARGOS_EQUIPE = [
  'Médico(a)',
  'Secretário(a)',
  'Recepcionista',
  'Profissional de enfermagem',
  'Psicólogo(a)',
  'Fisioterapeuta',
  'Nutricionista',
  'Auxiliar administrativo',
  'Funcionário(a) de laboratório',
  'Serviços gerais',
  'Outro',
] as const

export const TIPOS_EQUIPE: { valor: TipoMembroEquipe; rotulo: string }[] = [
  { valor: 'profissional_saude', rotulo: 'Profissional de saúde' },
  { valor: 'administrativo', rotulo: 'Administrativo ou recepção' },
  { valor: 'apoio', rotulo: 'Apoio e serviços' },
  { valor: 'outro', rotulo: 'Outro tipo de função' },
]

export function formularioEquipeVazio(clinicaId?: string | null): FormularioEquipe {
  return {
    chaveIdempotencia: crypto.randomUUID(),
    nomeCompleto: '', cargo: '', outroCargo: '', tipo: 'administrativo', profissao: '', cpf: '',
    cpfSituacao: 'novo', alterarCpf: true, telefone: '', emailContato: '', conselhoClasse: '',
    registroConselho: '', conselhoUf: '', especialidadeId: '', clinicasIds: clinicaId ? [clinicaId] : [], revisao: null,
  }
}

export function cargoEfetivo(form: FormularioEquipe): string {
  return normalizarEspacos(form.cargo === 'Outro' ? form.outroCargo : form.cargo)
}

export function validarFormularioEquipeDetalhada(form: FormularioEquipe): ErroFormularioEquipe | null {
  if (!normalizarEspacos(form.nomeCompleto)) return { campo: 'nomeCompleto', mensagem: 'Informe o nome completo.' }
  if (!cargoEfetivo(form)) return { campo: form.cargo === 'Outro' ? 'outroCargo' : 'cargo', mensagem: 'Informe o cargo ou a função.' }
  if (form.tipo === 'profissional_saude' && !normalizarEspacos(form.profissao)) {
    return { campo: 'profissao', mensagem: 'Informe a profissão do profissional de saúde.' }
  }
  if (form.alterarCpf && form.cpf.trim() && !cpfValido(form.cpf)) {
    return { campo: 'cpf', mensagem: 'Informe um CPF válido, com 11 dígitos, ou deixe o campo vazio.' }
  }

  const conselhoPreenchido = Boolean(normalizarEspacos(form.conselhoClasse))
    || Boolean(normalizarEspacos(form.registroConselho))
    || Boolean(normalizarEspacos(form.conselhoUf))
  const conselhoCompleto = Boolean(normalizarEspacos(form.conselhoClasse))
    && Boolean(normalizarEspacos(form.registroConselho))
    && /^[A-Za-z]{2}$/u.test(normalizarEspacos(form.conselhoUf))
  if (conselhoPreenchido && !conselhoCompleto) {
    return { campo: 'conselho', mensagem: 'Preencha conselho, número do registro e UF juntos.' }
  }
  if (form.clinicasIds.length === 0) return { campo: 'clinicas', mensagem: 'Selecione ao menos uma clínica.' }
  if (form.emailContato.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(form.emailContato.trim())) {
    return { campo: 'emailContato', mensagem: 'Informe um e-mail de contato válido.' }
  }
  return null
}

export function validarFormularioEquipe(form: FormularioEquipe): string | null {
  return validarFormularioEquipeDetalhada(form)?.mensagem ?? null
}

export function montarDadosEquipe(form: FormularioEquipe): DadosEquipeRpc {
  return {
    nome_completo: formatarTextoPortugues(form.nomeCompleto),
    cargo: cargoEfetivo(form),
    tipo: form.tipo,
    profissao: form.tipo === 'profissional_saude' ? normalizarEspacos(form.profissao) : null,
    cpf_modo: form.alterarCpf ? (form.cpf.trim() ? 'substituir' : 'remover') : 'preservar',
    cpf: form.alterarCpf && form.cpf.trim() ? apenasDigitos(form.cpf) : null,
    telefone: normalizarEspacos(form.telefone) || null,
    email_contato: form.emailContato.trim().toLocaleLowerCase('pt-BR') || null,
    conselho_classe: form.tipo === 'profissional_saude' ? normalizarEspacos(form.conselhoClasse).toLocaleUpperCase('pt-BR') || null : null,
    registro_conselho: form.tipo === 'profissional_saude' ? normalizarEspacos(form.registroConselho).toLocaleUpperCase('pt-BR') || null : null,
    conselho_uf: form.tipo === 'profissional_saude' ? normalizarEspacos(form.conselhoUf).toLocaleUpperCase('pt-BR') || null : null,
    especialidade_id: form.tipo === 'profissional_saude' && form.especialidadeId ? form.especialidadeId : null,
    clinicas_ids: form.clinicasIds,
  }
}

export function formularioAPartirDoDetalhe(detalhe: DetalheMembroEquipe): FormularioEquipe {
  const cargoCatalogado = CARGOS_EQUIPE.includes(detalhe.cargo as (typeof CARGOS_EQUIPE)[number])
  return {
    chaveIdempotencia: crypto.randomUUID(),
    nomeCompleto: detalhe.nome_completo,
    cargo: cargoCatalogado ? detalhe.cargo : 'Outro',
    outroCargo: cargoCatalogado ? '' : detalhe.cargo,
    tipo: detalhe.tipo,
    profissao: detalhe.profissao ?? '',
    cpf: detalhe.cpf ?? '',
    cpfSituacao: detalhe.cpf_situacao,
    alterarCpf: detalhe.cpf_situacao === 'ausente',
    telefone: detalhe.telefone ?? '',
    emailContato: detalhe.email_contato ?? '',
    conselhoClasse: detalhe.conselho_classe ?? '',
    registroConselho: detalhe.registro_conselho ?? '',
    conselhoUf: detalhe.conselho_uf ?? '',
    especialidadeId: detalhe.especialidade_id ?? '',
    clinicasIds: detalhe.clinicas.map((clinica) => clinica.id), revisao: detalhe.revisao,
  }
}

export function rotuloAcessoEquipe(status: MembroEquipe['acesso_status']): string {
  if (status === 'ativo_na_unidade') return 'Ativo nesta clínica'
  if (status === 'conta_vinculada') return 'Conta vinculada (estado não confirmado)'
  if (status === 'conta_inativa') return 'Conta inativa'
  if (status === 'sem_acesso_na_unidade') return 'Sem acesso nesta clínica'
  return 'Sem conta vinculada'
}

export function rotuloTipoEquipe(tipo: TipoMembroEquipe): string {
  return TIPOS_EQUIPE.find((item) => item.valor === tipo)?.rotulo ?? 'Outro tipo de função'
}

/**
 * Exibe o CPF somente de forma mascarada. A tela de consulta nunca deve
 * transformar a apresentação em uma nova leitura/descriptografia do dado.
 */
export function mascararCpfEquipe(cpf: string | null, situacao: DetalheMembroEquipe['cpf_situacao']): string {
  if (situacao === 'indisponivel') return 'Indisponível nesta consulta'
  if (!cpf) return 'Não cadastrado'
  const digitos = apenasDigitos(cpf)
  if (digitos.length !== 11) return 'Informação protegida'
  return `${digitos.slice(0, 3)}.***.***-${digitos.slice(-2)}`
}

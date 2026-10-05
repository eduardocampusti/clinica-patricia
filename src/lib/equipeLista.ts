import type { MembroEquipe, TipoMembroEquipe } from './equipe'
import { rotuloAcessoEquipe } from './equipe'
import { rotuloPapelAcessoEquipe, rotuloStatusAcessoEquipe, type AcessoEquipe } from './equipeAcessos'

export function normalizarBuscaEquipe(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim().replace(/\s+/gu, ' ')
}

/** A RPC retorna o escopo autorizado da clínica ativa; os filtros apenas o restringem. */
export function filtrarEquipe(membros: MembroEquipe[], busca: string, tipo: TipoMembroEquipe | '', clinica: string): MembroEquipe[] {
  const termos = normalizarBuscaEquipe(busca).split(' ').filter(Boolean)
  const unicos = [...new Map(membros.map(m => [m.id, m])).values()]
  return unicos.filter(m => {
    const texto = normalizarBuscaEquipe(`${m.nome_completo} ${m.cargo} ${m.profissao ?? ''}`)
    return termos.every(t => texto.includes(t)) && (!tipo || m.tipo === tipo)
      && (!clinica || m.clinicas.some(c => c.id === clinica))
  })
}

export function resumirEquipe(membros: MembroEquipe[]) {
  const unicos = [...new Map(membros.map(m => [m.id, m])).values()]
  const saude = unicos.filter(m => m.tipo === 'profissional_saude').length
  return { pessoas: unicos.length, saude, demais: unicos.length - saude }
}

/** Cache apenas de fichas abertas. Ausência de convite na lista coletiva não comprova ausência de convite. */
export function estadosListaEquipe(membro: MembroEquipe, acesso: AcessoEquipe | null | undefined, contexto: string | null, filtro: string) {
  const conta = acesso === null ? 'Conta e acesso não confirmados' : acesso
    ? typeof acesso.usuario_id === 'string' && acesso.usuario_id.trim() ? 'Conta de acesso vinculada'
      : acesso.usuario_id === null ? 'Sem conta vinculada' : 'Não foi possível confirmar a conta'
    : membro.acesso_status === 'sem_conta' ? 'Sem conta vinculada'
      : membro.acesso_status === 'conta_inativa' ? 'Conta inativa'
        : ['ativo_na_unidade', 'sem_acesso_na_unidade', 'conta_vinculada'].includes(membro.acesso_status) ? 'Conta de acesso vinculada'
          : 'Conta e acesso não confirmados'
  const clinicas = membro.clinicas.filter(c => !filtro || c.id === filtro).map(c => {
    const confirmado = acesso?.clinicas.find(a => a.id === c.id)
    const status = confirmado ? rotuloStatusAcessoEquipe(confirmado.status)
      : acesso === undefined && c.id === contexto && ['ativo_na_unidade', 'sem_acesso_na_unidade', 'conta_inativa'].includes(membro.acesso_status)
        ? rotuloAcessoEquipe(membro.acesso_status) : 'Acesso não confirmado'
    const papel = confirmado?.status === 'acesso_ativo' && ['recepcao','medico','proprietaria'].includes(confirmado.papel ?? '')
      ? `Papel atual: ${rotuloPapelAcessoEquipe(confirmado.papel)}` : null
    return { ...c, status, papel }
  })
  return { conta, clinicas }
}

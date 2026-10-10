import { useEffect, useState } from 'react'
import type { Papel } from './usePapelNaClinica'
import { supabase } from '../lib/supabase'
import { buscarFotoEquipeDoMembro } from '../lib/equipeRecursos'
import { nomeCadastrado } from '../lib/identidadeApresentacao'
import { buscarAcessoEquipe } from '../lib/equipeAcessos'
import { carregarFotoPerfil, consultarMeuPerfil, type EstadoPerfil, type PerfilConta } from '../lib/meuPerfil'

export interface IdentidadeConta {
  chave: string
  nome: string | null
  fotoUrl?: string
  carregando: boolean
  erroNome: boolean
  erroFoto: boolean
  avisoFoto?: string
  perfil?: PerfilConta
  estadoPerfil?: EstadoPerfil
  reconsultar?: () => void
}
const vazia: IdentidadeConta = { chave: '', nome: null, carregando: false, erroNome: false, erroFoto: false }

/** Own account profile first. Team photos require an explicit account FK, an
 * active clinic link and the existing private reader's authorization. */
export function useIdentidadeConta(usuarioId: string | null, clinicaId: string | null, papel: Papel | null): IdentidadeConta {
  const chave = usuarioId && clinicaId && papel ? `${usuarioId}:${clinicaId}:${papel}` : ''
  const [identidade, setIdentidade] = useState<IdentidadeConta>(vazia)
  const [reconsulta, setReconsulta] = useState(0)
  useEffect(() => {
    const controlador = new AbortController()
    let fotoUrl: string | undefined
    setIdentidade(chave ? { ...vazia, chave, carregando: true, estadoPerfil: 'carregando' } : vazia)
    if (!chave || !usuarioId || !clinicaId) return
    const atualizar = (dados: Partial<IdentidadeConta>) => {
      if (!controlador.signal.aborted) setIdentidade(atual => atual.chave === chave ? { ...atual, ...dados } : atual)
    }
    async function consultarNome() {
      try {
        const { data, error } = await supabase.from('usuarios').select('nome_completo').eq('id', usuarioId!).abortSignal(controlador.signal).maybeSingle()
        if (error) throw error
        atualizar({ nome: nomeCadastrado(data?.nome_completo), carregando: false })
      } catch { atualizar({ erroNome: true, carregando: false }) }
    }
    async function consultarFoto() {
      try {
        const perfil = await consultarMeuPerfil(usuarioId!, controlador.signal)
        if (perfil) {
          atualizar({ perfil, nome: perfil.nome, erroNome: false, estadoPerfil: 'disponivel' })
          try {
            const url = await carregarFotoPerfil(perfil, controlador.signal)
            if (controlador.signal.aborted) { if (url) URL.revokeObjectURL(url); return }
            fotoUrl = url
            atualizar({ fotoUrl: url })
          } catch { atualizar({ erroFoto: true, avisoFoto: 'Não foi possível carregar sua foto pessoal.' }) }
          return
        }
        atualizar({ estadoPerfil: 'ausente' })
      } catch {
        atualizar({ estadoPerfil: 'erro', erroFoto: true, avisoFoto: 'Não foi possível consultar sua foto pessoal.' })
        return
      }
      // Existing Team RPC/Edge readers support owners only. Direct table SELECT
      // is revoked; do not bypass it or change permissions to obtain an avatar.
      if (papel !== 'proprietaria') return
      let etapa = 'lista'
      try {
        const { data: membros, error } = await supabase.rpc('equipe_listar', { p_clinica_contexto_id: clinicaId }).abortSignal(controlador.signal)
        if (error) throw error
        if (!Array.isArray(membros)) throw new Error('Lista indisponível')
        for (const membro of membros) {
          controlador.signal.throwIfAborted()
          if (membro?.acesso_status !== 'ativo_na_unidade') continue
          if (typeof membro.id !== 'string' || !Array.isArray(membro.clinicas)) throw new Error('Vínculo indisponível')
          if (!membro.clinicas.some((c: { id: string }) => c.id === clinicaId)) continue
          etapa = 'vinculo-conta'
          const { data: acesso, error: erroAcesso } = await buscarAcessoEquipe(membro.id, clinicaId!, controlador.signal)
          if (erroAcesso || !acesso || acesso.membro_id !== membro.id) throw new Error('Conta indisponível')
          if (acesso.usuario_id !== usuarioId) continue
          if (!acesso.clinicas.some(c => c.id === clinicaId && c.usuario_id === usuarioId && c.ativo && c.status === 'acesso_ativo' && c.papel === papel)) return
          etapa = 'foto-privada'
          const foto = await buscarFotoEquipeDoMembro(membro.id, clinicaId!, usuarioId!, controlador.signal)
          if (!foto) return
          if (controlador.signal.aborted) { URL.revokeObjectURL(foto.url); return }
          fotoUrl = foto.url
          atualizar({ fotoUrl })
          return
        }
      } catch {
        const avisoFoto = etapa === 'lista' ? 'Não foi possível consultar o vínculo de foto nesta clínica.' : etapa === 'vinculo-conta' ? 'Não foi possível confirmar o vínculo de foto com sua conta.' : 'Não foi possível carregar sua foto autorizada.'
        atualizar({ erroFoto: true, avisoFoto })
      }
    }
    void consultarNome().then(() => { if (!controlador.signal.aborted) void consultarFoto() })
    return () => {
      controlador.abort()
      if (fotoUrl) URL.revokeObjectURL(fotoUrl)
    }
  }, [chave, usuarioId, clinicaId, papel, reconsulta])
  // Render never reuses identity across account/clinic/role changes, even before
  // the cleanup effect runs. No identity is cached in localStorage or a singleton.
  const atual = identidade.chave === chave ? identidade : { ...vazia, chave, carregando: !!chave }
  return { ...atual, reconsultar: () => setReconsulta(valor => valor + 1) }
}

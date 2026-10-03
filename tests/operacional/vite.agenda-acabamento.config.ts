import { defineConfig, mergeConfig } from 'vite'
import isolado from './vite.config'

// Só o ensaio da Agenda: versão estável durante a rodada, sem recarga por alterações
// de documentação/artefatos. Mantém o alvo sintético e todos os controles do harness.
export default mergeConfig(isolado, defineConfig({ server: { hmr: false, watch: null } }))

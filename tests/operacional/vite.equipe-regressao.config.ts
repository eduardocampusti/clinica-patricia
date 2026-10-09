import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config.ts'

// Mesmos componentes e serviços sintéticos, em artefato imutável por rodada.
// Sem HMR/otimizador em execução enquanto os cenários alteram clínica e formulário.
export default mergeConfig(base, defineConfig({
  build: {
    outDir: 'scratch/acesso-direto-revisao/equipe-compilada',
    emptyOutDir: true,
    rollupOptions: { input: 'tests/operacional/equipe-contexto.html' },
  },
}))

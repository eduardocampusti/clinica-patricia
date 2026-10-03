import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: ['agenda-pagina.spec.ts', 'agenda-novo-painel.spec.ts', 'agenda-horarios.spec.ts', 'agenda-remarcacao.spec.ts', 'agenda-experiencia.spec.ts', 'agenda-refinamento.spec.ts', 'agenda-fechamento.spec.ts', 'agenda-edicao.spec.ts', 'recepcao-fluxo.spec.ts', 'agenda-celular.spec.ts'],
  outputDir: '../../scratch/agenda-ux/celular/resultados',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4192' },
  webServer: undefined,
})

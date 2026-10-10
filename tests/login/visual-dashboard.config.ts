import {defineConfig} from '@playwright/test'
import base from './analise-periodo.config'
export default defineConfig({...base,testMatch:'visual-dashboard.spec.ts',outputDir:'../../scratch/correcao-visual-dashboard/resultados'})

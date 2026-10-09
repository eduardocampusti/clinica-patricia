import {defineConfig,mergeConfig} from 'vite'
import base from '../financeiro/vite.config.ts'
export default mergeConfig(base,defineConfig({cacheDir:'scratch/configuracoes/vite-cache',plugins:[{name:'configuracoes-sintetico',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/lib/configuracoes.ts'))return code.replace('BACKEND_CONFIGURACOES_HABILITADO = false','BACKEND_CONFIGURACOES_HABILITADO = true')}}]}))

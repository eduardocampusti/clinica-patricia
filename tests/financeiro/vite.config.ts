import { defineConfig, mergeConfig } from 'vite'
import base from '../../vite.config.ts'

export default mergeConfig(base, defineConfig({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://financeiro.synthetic.invalid'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('synthetic-public-key'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('synthetic-public-key'),
  },
}))

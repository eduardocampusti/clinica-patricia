/// <reference types="vite/client" />

declare const __APP_BUILD_INFO__: {
  readonly version: string
  readonly commit: string | null
  readonly alteracoesLocais: boolean | null
  readonly compiladoEm: string
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

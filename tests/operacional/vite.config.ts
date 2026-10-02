import { defineConfig, mergeConfig } from 'vite'
import base from '../../vite.config.ts'

export default mergeConfig(base, defineConfig({
  plugins: [{ name: 'preview-agenda-isolada', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const previa = url.searchParams.get('previa')
      if (!url.pathname.startsWith('/sistema/') || (previa !== 'agenda' && previa !== 'shell')) return next()
      // Só no Vite sintético: mantém as rotas reais ao navegar/recarregar o harness.
      try {
        const html = await server.transformIndexHtml(req.url!, `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prévia isolada</title></head><body><div id="root"></div><script type="module" src="/tests/operacional/${previa === 'agenda' ? 'agenda-preview' : 'shell'}.tsx"></script></body></html>`)
        res.setHeader('Content-Type', 'text/html'); res.end(html)
      } catch (error) { next(error as Error) }
    })
  } }],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://operacional.synthetic.invalid'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('synthetic-public-key'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('synthetic-public-key'),
  },
}))

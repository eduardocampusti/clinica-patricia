import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config.ts'
export default mergeConfig(base, defineConfig({
  plugins: [{ name: 'caixa-recepcao-isolado', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (!url.pathname.startsWith('/sistema/') || url.searchParams.get('previa') !== 'caixa-recepcao') return next()
      try {
        const html = await server.transformIndexHtml(req.url!, '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Caixa · Prévia isolada</title></head><body><div id="root"></div><script type="module" src="/tests/financeiro/recepcao-preview.tsx"></script></body></html>')
        res.setHeader('Content-Type', 'text/html'); res.end(html)
      } catch (erro) { next(erro as Error) }
    })
  } }],
}))

import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config.ts'

export default mergeConfig(base, defineConfig({
  plugins: [{ name: 'preview-recepcao-isolada', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (!url.pathname.startsWith('/sistema/') || url.searchParams.get('previa') !== 'recepcao') return next()
      try {
        const html = await server.transformIndexHtml(req.url!, '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel da recepção — prévia isolada</title></head><body><div id="root"></div><script type="module" src="/tests/operacional/recepcao-preview.tsx"></script></body></html>')
        res.setHeader('Content-Type', 'text/html'); res.end(html)
      } catch (error) { next(error as Error) }
    })
  } }],
}))

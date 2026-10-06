import { defineConfig, mergeConfig } from 'vite'
import base from '../../vite.config.ts'

export default mergeConfig(base, defineConfig({
  plugins: [{ name: 'preview-agenda-isolada', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const previa = url.searchParams.get('previa')
    if (!url.pathname.startsWith('/sistema/') || !['agenda', 'shell', 'cadastros'].includes(previa ?? '')) return next()
      // Só no Vite sintético: mantém as rotas reais ao navegar/recarregar o harness.
      try {
        const demo = previa === 'cadastros' && url.searchParams.get('demo') === 'recursos'
        const fichas = previa === 'cadastros' && url.searchParams.get('demo') === 'fichas'
        const entrada = fichas ? 'equipe-fichas-demo' : demo ? 'equipe-recursos-demo' : previa === 'agenda' ? 'agenda-preview' : previa === 'cadastros' ? 'cadastros-contexto' : 'shell'
        const aviso=fichas?'<aside style="padding:12px;font-family:system-ui">DEMONSTRAÇÃO SINTÉTICA33: somente fictícios. Fichas/documentos persistem apenas no navegador; sem banco, Storage ou RLS reais. Fotos/recebimento em memória. <button onclick="window.dispatchEvent(new Event(\'reiniciar-demo-fichas\'))">Reiniciar dados fictícios</button></aside>':''
        const html = await server.transformIndexHtml(req.url!, `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prévia isolada</title></head><body>${aviso}<div id="root"></div><script type="module" src="/tests/operacional/${entrada}.tsx"></script></body></html>`)
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

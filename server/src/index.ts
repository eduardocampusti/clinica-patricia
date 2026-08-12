import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import { pingRoutes } from './routes/ping.js'
import { caixaRoutes } from './routes/caixa.js'
import { entradaCaixaRoutes } from './routes/entradaCaixa.js'
import { despesasRoutes } from './routes/despesas.js'
import { estornosRoutes } from './routes/estornos.js'
import { repassesRoutes } from './routes/repasses.js'

const fastify = Fastify({ logger: true })

await fastify.register(cors, {
  origin: env.corsOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Clinica-Id', 'Idempotency-Key'],
})

await fastify.register(pingRoutes)
await fastify.register(caixaRoutes)
await fastify.register(entradaCaixaRoutes)
await fastify.register(despesasRoutes)
await fastify.register(estornosRoutes)
await fastify.register(repassesRoutes)

fastify.listen({ port: env.port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`Servidor rodando em ${address}`)
})

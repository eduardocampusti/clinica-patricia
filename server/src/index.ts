import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import { pingRoutes } from './routes/ping.js'
import { caixaRoutes } from './routes/caixa.js'
import { entradaCaixaRoutes } from './routes/entradaCaixa.js'

const fastify = Fastify({ logger: true })

await fastify.register(cors, {
  origin: env.corsOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Clinica-Id'],
})

await fastify.register(pingRoutes)
await fastify.register(caixaRoutes)
await fastify.register(entradaCaixaRoutes)

fastify.listen({ port: env.port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`Servidor rodando em ${address}`)
})

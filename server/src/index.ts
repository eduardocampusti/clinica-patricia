import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import { pingRoutes } from './routes/ping.js'
import { despesasRoutes } from './routes/despesas.js'

const fastify = Fastify({ logger: true })

await fastify.register(cors, {
  origin: env.corsOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Clinica-Id', 'Idempotency-Key'],
})

await fastify.register(pingRoutes)
await fastify.register(despesasRoutes)

fastify.listen({ port: env.port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`Servidor rodando em ${address}`)
})

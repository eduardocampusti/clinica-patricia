import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { resolveClinicaAtiva } from '../src/plugins/clinicaAtiva.js'

interface ClinicaVisivelPorRls {
  id: string
  nome: string
  ativo: boolean
}

function criarRequest(clinicaId: string, clinicasVisiveisPorRls: ClinicaVisivelPorRls[]) {
  const filtros = new Map<string, unknown>()
  const consulta = {
    select() {
      return this
    },
    eq(coluna: string, valor: unknown) {
      filtros.set(coluna, valor)
      return this
    },
    async single() {
      const clinica = clinicasVisiveisPorRls.find((item) =>
        [...filtros].every(([coluna, valor]) => item[coluna as keyof ClinicaVisivelPorRls] === valor),
      )
      return clinica
        ? { data: { id: clinica.id, nome: clinica.nome }, error: null }
        : { data: null, error: { code: 'PGRST116' } }
    },
  }

  const request = {
    headers: { 'x-clinica-id': clinicaId },
    supabaseClient: {
      from(tabela: string) {
        assert.equal(tabela, 'clinicas')
        return consulta
      },
    },
  } as unknown as FastifyRequest

  return { request, filtros }
}

function criarReply() {
  const estado: { status: number; corpo?: unknown } = { status: 0 }
  const reply = {
    code(status: number) {
      estado.status = status
      return this
    },
    send(corpo: unknown) {
      estado.corpo = corpo
      return this
    },
  } as unknown as FastifyReply
  return { reply, estado }
}

test('clínica ativa com vínculo válido é aceita pelo resolvedor financeiro', async () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const { request, filtros } = criarRequest(id, [{ id, nome: 'Clínica Ativa', ativo: true }])
  const { reply, estado } = criarReply()

  await resolveClinicaAtiva(request, reply)

  assert.equal(estado.status, 0)
  assert.deepEqual(request.clinicaAtiva, { id, nome: 'Clínica Ativa' })
  assert.equal(filtros.get('id'), id)
  assert.equal(filtros.get('ativo'), true)
})

test('clínica inativa é recusada mesmo quando o vínculo ainda a deixa visível por RLS', async () => {
  const id = '22222222-2222-4222-8222-222222222222'
  const { request } = criarRequest(id, [{ id, nome: 'Clínica Histórica', ativo: false }])
  const { reply, estado } = criarReply()

  await resolveClinicaAtiva(request, reply)

  assert.equal(estado.status, 403)
  assert.equal(request.clinicaAtiva, undefined)
  assert.deepEqual(estado.corpo, { erro: 'Sem acesso a esta clínica.' })
})

test('clínica inexistente é recusada sem criar contexto financeiro', async () => {
  const { request } = criarRequest('33333333-3333-4333-8333-333333333333', [])
  const { reply, estado } = criarReply()

  await resolveClinicaAtiva(request, reply)

  assert.equal(estado.status, 403)
  assert.equal(request.clinicaAtiva, undefined)
  assert.deepEqual(estado.corpo, { erro: 'Sem acesso a esta clínica.' })
})

test('RPC privada bloqueia bypass direto com clínica inativa antes da idempotência', () => {
  const sql = readFileSync(new URL('../../financeiro_api_privada.sql', import.meta.url), 'utf8')
  const inicio = sql.indexOf('create or replace function financeiro_privado.preparar_comando(')
  const fim = sql.indexOf('create or replace function financeiro_privado.iniciar_idempotencia(', inicio)
  assert.notEqual(inicio, -1)
  assert.notEqual(fim, -1)

  const prepararComando = sql.slice(inicio, fim)
  assert.match(
    prepararComando,
    /perform 1\s+from public\.clinicas c\s+where c\.id = v_clinica and c\.ativo is true\s+for share;/,
  )
  assert.match(
    prepararComando,
    /FINANCEIRO_SEM_PERMISSAO: clínica inexistente ou inativa[^;]+errcode = '42501'/,
  )
  assert.ok(
    prepararComando.indexOf('c.ativo is true') < prepararComando.indexOf("set_config('app.clinica_ativa'"),
  )
})

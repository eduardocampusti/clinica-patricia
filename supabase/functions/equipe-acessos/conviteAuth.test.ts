import assert from 'node:assert/strict'
import test from 'node:test'
import { ErroContaConvite, garantirContaDoConvite, ORIGENS_LOCAIS_PERMITIDAS, type ContaConvite } from './conviteAuth.ts'

const conta: ContaConvite = { id: 'auth-teste', email: 'convite@teste.invalid', confirmado: false }

test('libera explicitamente as portas locais 3000 e 5173', () => {
  assert.equal(ORIGENS_LOCAIS_PERMITIDAS.has('http://127.0.0.1:3000'), true)
  assert.equal(ORIGENS_LOCAIS_PERMITIDAS.has('http://localhost:3000'), true)
  assert.equal(ORIGENS_LOCAIS_PERMITIDAS.has('http://127.0.0.1:5173'), true)
  assert.equal(ORIGENS_LOCAIS_PERMITIDAS.has('http://localhost:5173'), true)
})

test('registra o usuário devolvido por inviteUserByEmail', async () => {
  const eventos: string[] = []
  const resultado = await garantirContaDoConvite({ email: conta.email, permitirCriar: true }, {
    buscarPorId: async () => null,
    localizarPorEmailExato: async () => null,
    criarConvite: async () => { eventos.push('criar'); return conta },
    registrarNoConvite: async (atual) => { eventos.push(`registrar:${atual.id}`) },
  })
  assert.equal(resultado.origem, 'criada')
  assert.deepEqual(eventos, ['criar', 'registrar:auth-teste'])
})

test('recupera a mesma conta após falha de gravação sem criar duplicata', async () => {
  let criacoes = 0
  let registros = 0
  await assert.rejects(() => garantirContaDoConvite({ email: conta.email, permitirCriar: true }, {
    buscarPorId: async () => null,
    localizarPorEmailExato: async () => null,
    criarConvite: async () => { criacoes += 1; return conta },
    registrarNoConvite: async () => { throw new Error('falha simulada depois do Auth') },
  }))

  const repeticao = await garantirContaDoConvite({ email: conta.email, permitirCriar: true }, {
    buscarPorId: async () => null,
    localizarPorEmailExato: async () => conta,
    criarConvite: async () => { criacoes += 1; return conta },
    registrarNoConvite: async () => { registros += 1 },
  })
  assert.equal(repeticao.origem, 'recuperada')
  assert.equal(criacoes, 1)
  assert.equal(registros, 1)
})

test('vínculo existente não cria conta e exige e-mail exato', async () => {
  let criacoes = 0
  await assert.rejects(() => garantirContaDoConvite({ email: conta.email, authUserId: conta.id, permitirCriar: false }, {
    buscarPorId: async () => ({ ...conta, email: 'outro@teste.invalid' }),
    localizarPorEmailExato: async () => null,
    criarConvite: async () => { criacoes += 1; return conta },
    registrarNoConvite: async () => undefined,
  }), (error: unknown) => error instanceof ErroContaConvite && error.codigo === 'CONTA_AUTH_DIVERGENTE')
  assert.equal(criacoes, 0)
})

test('modo vínculo sem conta falha sem criar usuário', async () => {
  let criacoes = 0
  await assert.rejects(() => garantirContaDoConvite({ email: conta.email, permitirCriar: false }, {
    buscarPorId: async () => null,
    localizarPorEmailExato: async () => null,
    criarConvite: async () => { criacoes += 1; return conta },
    registrarNoConvite: async () => undefined,
  }), (error: unknown) => error instanceof ErroContaConvite && error.codigo === 'CONTA_NAO_ENCONTRADA')
  assert.equal(criacoes, 0)
})

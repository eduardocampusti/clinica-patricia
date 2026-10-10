import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Compila a fonte real com ambiente público vazio para verificar os defaults
// aprovados. Não é navegador público nem prova de DNS/HTTPS.
const fonte = (await readFile(new URL('../../src/config/clinicBrands.ts', import.meta.url), 'utf8'))
  .replaceAll('import.meta.env', '({})')
const js = ts.transpileModule(fonte, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { resolveClinicBrand } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
test('domínios aprovados resolvem marca correta independentemente de caminho conflitante', () => {
  assert.equal(resolveClinicBrand('clinicabrotas.com.br', '/').brand.slug, 'brotas')
  assert.equal(resolveClinicBrand('clinicaipupiara.com.br', '/acesso/brotas').brand.slug, 'ipupiara')
  assert.equal(resolveClinicBrand('www.clinicaipupiara.com.br', '/').brand.slug, 'ipupiara')
  assert.equal(resolveClinicBrand('evil.example', '/acesso/brotas').brand, null)
})
test('entradas locais permanecem independentes e não representam permissão', () => {
  assert.equal(resolveClinicBrand('127.0.0.1', '/acesso/ipupiara').brand.slug, 'ipupiara')
  assert.equal(resolveClinicBrand('localhost', '/acesso/brotas').brand.slug, 'brotas')
})

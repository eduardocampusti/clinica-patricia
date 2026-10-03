import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

test('build inclui exatamente o fallback versionado na raiz de dist', () => {
  assert.ok(existsSync(new URL('../../dist/index.html', import.meta.url)))
  const source = readFileSync(new URL('../../public/.htaccess', import.meta.url), 'utf8')
  const artifact = readFileSync(new URL('../../dist/.htaccess', import.meta.url), 'utf8')
  assert.equal(artifact, source)
  const directives = source.split(/\r?\n/).filter(line => !line.trim().startsWith('#')).join('\n')
  assert.match(directives, /RewriteRule \^index\\\.html\$ - \[L\]/)
  assert.match(directives, /RewriteCond %\{REQUEST_FILENAME\} !-f/)
  assert.match(directives, /RewriteCond %\{REQUEST_FILENAME\} !-d/)
  assert.match(directives, /RewriteRule \. \/index\.html \[L\]/)
  assert.doesNotMatch(directives, /\bQSD\b|\[R(?:=|,|\])|https?:\/\/|\bRedirect\b/)
})

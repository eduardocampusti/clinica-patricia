import { readFile, writeFile, mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

const base = new URL('../supabase/templates/equipe/', import.meta.url)
const output = new URL('../public/previas-emails/', import.meta.url)
await mkdir(output, { recursive: true })
const fixtures = { brotas: 'Clínica Brotas', ipupiara: 'Clínica Ipupiara', conjunta: 'Clínicas Brotas e Ipupiara' }
const tipos = ['invite', 'magic-link', 'recovery']
for (const tipo of tipos) {
  const source = await readFile(new URL(`${tipo}.html`, base), 'utf8')
  assert.ok(source.includes('href="{{ .ConfirmationURL }}"'), 'Link oficial deve ser preservado')
  assert.ok(!/<script|<img|https?:\/\//i.test(source), 'Template independente de scripts e imagens externas')
  for (const [slug, nome] of Object.entries(fixtures)) {
    // Prévia sintética de apresentação, não um interpretador Go nem um envio de Auth.
    const html = source.replace(/^\{\{ \$marca :=[\s\S]*?\{\{ end \}\}\n/, '')
      .replaceAll('{{ $marca }}', nome)
      .replaceAll('{{ $preposicao }}', slug === 'conjunta' ? 'das' : 'da')
      .replaceAll('{{ $escopo }}', slug === 'conjunta' ? 'das unidades' : 'da unidade')
      .replaceAll('{{ .ConfirmationURL }}', `https://example.invalid/confirmacao-ficticia?unidade=${slug}`)
    assert.ok(!html.includes('{{'), 'Prévia sem variáveis pendentes')
    if (tipo === 'invite') {
      assert.ok(html.includes(`A administração ${slug === 'conjunta' ? 'das' : 'da'} ${nome} convidou você para acessar o sistema ${slug === 'conjunta' ? 'das unidades' : 'da unidade'}.`))
      assert.ok(html.includes('Este convite é pessoal. Não compartilhe o link.'))
    }
    await writeFile(new URL(`${tipo}-${slug}.html`, output), html)
  }
}
console.log('9 prévias sintéticas geradas; link oficial preservado nos 3 modelos. Nenhum e-mail enviado.')

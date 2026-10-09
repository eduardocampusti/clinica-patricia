// Apenas prepara arquivos locais; não acessa rede, não cria contas ou contextos.
import fs from 'node:fs'
import {createHash} from 'node:crypto'
const base='database/proposals/configuracoes/', out=base+'r2/'
fs.mkdirSync(out,{recursive:true})
const pairs=[
 ['7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','ed60a2c6-59c8-45bc-80b7-e53aa005da01'],
 ['7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702','ed60a2c6-59c8-45bc-80b7-e53aa005da02'],
 ['homologacao-configuracoes-a','homologacao-configuracoes-r2-a'],
 ['homologacao-configuracoes-b','homologacao-configuracoes-r2-b'],
 ['configuracoes-homologacao-a.invalid','configuracoes-homologacao-r2-a.invalid'],
 ['configuracoes-homologacao-b.invalid','configuracoes-homologacao-r2-b.invalid'],
 ['cfg-a.20261008@configuracoes.example.invalid','cfg-a.20261009.r2@configuracoes.example.invalid'],
 ['cfg-b.20261008@configuracoes.example.invalid','cfg-b.20261009.r2@configuracoes.example.invalid'],
 ['20261008-a','20261009-r2-a'],['20261008-b','20261009-r2-b'],
]
const replace=s=>pairs.reduce((t,[a,b])=>t.replaceAll(a,b),s)
for(const [a,b] of [['20261008_contextos_homologacao.sql','contextos.sql'],['20261008_vinculos_homologacao.sql','vinculos.template.sql'],['20261008_encerrar_contextos.sql','encerrar-contextos.sql']]){
 fs.writeFileSync(out+b,'-- R2 autorizada uma única vez; NÃO EXECUTADA. Condição: sessão legítima do criador comprovada antes de consumir recursos.\n'+replace(fs.readFileSync(base+a,'utf8')))
}
// Mantém os dois aliases históricos; acrescenta só os dois novos no artefato futuro.
const source=fs.readFileSync('supabase/functions/_shared/configuracoesPublicas.ts','utf8')
const anchor=" 'configuracoes-homologacao-b.invalid':'homologacao-configuracoes-b',"
if(source.split(anchor).length!==2||source.includes('configuracoes-homologacao-r2-'))throw Error('Resolver original diverge: revisar sem sobrescrever')
fs.writeFileSync(out+'configuracoesPublicas.ts',source.replace(anchor,anchor+"\n 'configuracoes-homologacao-r2-a.invalid':'homologacao-configuracoes-r2-a',\n 'configuracoes-homologacao-r2-b.invalid':'homologacao-configuracoes-r2-b',"))
fs.writeFileSync(out+'configuracoesPublicas.anterior.ts',source)
const isolation=fs.readFileSync('supabase/migrations/20261008230050_configuracoes_homologacao_isolada.sql','utf8').replaceAll('\r\n','\n')
const originalFunction=isolation.slice(isolation.indexOf('create or replace function public.configuracoes_padrao_consultar'),isolation.indexOf('-- ACLs dos helpers'))
fs.writeFileSync(out+'recuperar-antes-de-consumir.sql',`-- Não executado. Recuperação somente ANTES de existirem fixtures R2. Não remove histórico.\nbegin;\ndo $$ begin\n if exists(select 1 from public.clinicas where id in ('ed60a2c6-59c8-45bc-80b7-e53aa005da01','ed60a2c6-59c8-45bc-80b7-e53aa005da02')) or exists(select 1 from auth.users where email in ('cfg-a.20261009.r2@configuracoes.example.invalid','cfg-b.20261009.r2@configuracoes.example.invalid')) then raise exception 'R2 já consumida: encerrar e preservar histórico; não estreitar CHECK'; end if;\n if exists(select 1 from public.configuracoes_publicas where slug in ('homologacao-configuracoes-r2-a','homologacao-configuracoes-r2-b')) then raise exception 'Projeção R2 existente: investigar sem apagar'; end if;\nend $$;\nalter table public.configuracoes_homologacao_contextos drop constraint configuracoes_homologacao_contextos_check;\nalter table public.configuracoes_homologacao_contextos add constraint configuracoes_homologacao_contextos_check check((clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701' and slug='homologacao-configuracoes-a') or (clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702' and slug='homologacao-configuracoes-b'));\nalter table public.configuracoes_publicas drop constraint configuracoes_publicas_slug_check;\nalter table public.configuracoes_publicas add constraint configuracoes_publicas_slug_check check(slug in ('brotas','ipupiara','homologacao-configuracoes-a','homologacao-configuracoes-b'));\n${originalFunction}\nnotify pgrst,'reload schema';\ncommit;\n`)
// Bancada separada. Fonte/flags de produção e bancada histórica permanecem intactas.
const config=replace(fs.readFileSync('tests/configuracoes/conectada.vite.config.ts','utf8')).replaceAll('conectada.html','conectada-r2.html').replaceAll('frontend-conectado','frontend-conectado-r2').replaceAll('vite-cache','vite-cache-r2')
fs.writeFileSync('tests/configuracoes/conectada-r2.vite.config.ts',config)
fs.writeFileSync('tests/configuracoes/conectada-r2.tsx',replace(fs.readFileSync('tests/configuracoes/conectada.tsx','utf8')))
fs.writeFileSync('tests/configuracoes/conectada-r2.html',fs.readFileSync('tests/configuracoes/conectada.html','utf8').replaceAll('conectada.tsx','conectada-r2.tsx'))
// Prova anônima separada: nunca substitui a baseline antiga.
let publicCheck=replace(fs.readFileSync('scripts/verificar-publicacao-configuracoes.mjs','utf8'))
publicCheck=publicCheck.replace('scratch/configuracoes-sequencia/publico-conectado','scratch/configuracoes-sequencia/publico-conectado-r2')
publicCheck=publicCheck.replace('configuracoes-homologacao-${n}.invalid','configuracoes-homologacao-r2-${n}.invalid').replace("7fc7ca34-e9a4-4af8-8bcb-0d7e3c92270${n==='a'?'1':'2'}","ed60a2c6-59c8-45bc-80b7-e53aa005da0${n==='a'?'1':'2'}")
fs.writeFileSync('scripts/verificar-publicacao-configuracoes-r2.mjs',publicCheck)
const files=['20261009075000_configuracoes_homologacao_r2.sql','contextos.sql','vinculos.template.sql','encerrar-contextos.sql','configuracoesPublicas.ts','configuracoesPublicas.anterior.ts','recuperar-antes-de-consumir.sql','README.md'].map(f=>out+f).concat(['tests/configuracoes/conectada-r2.vite.config.ts','tests/configuracoes/conectada-r2.tsx','tests/configuracoes/conectada-r2.html','scripts/verificar-publicacao-configuracoes-r2.mjs','scripts/preparar-configuracoes-r2.mjs','scripts/test-configuracoes-r2-sql.mjs','tests/configuracoes/hosts-publicos-r2.test.ts'])
fs.writeFileSync(out+'manifesto.json',JSON.stringify({projeto:'xftnkusbyqzyvzrovroj',autorizada:true,aplicada:false,condicao_previa:'sessao legitima do criador comprovada antes de criar recursos',limite_acumulado:{contas:10,contextos:4},novos:{contas:2,contextos:2},reativacao:false,emails:0,frontend_geral_habilitado:false,arquivos:files.map(arquivo=>({arquivo,sha256:createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex')}))},null,2))
console.log('Pacote R2 preparado LOCALMENTE; zero acesso remoto; fontes originais preservadas.')

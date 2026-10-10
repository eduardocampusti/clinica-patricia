// Só prepara SQL revisável; não acessa rede nem aplica/cria contas.
import fs from 'node:fs'
const [a,b,...extra]=process.argv.slice(2),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
if(extra.length||!uuid.test(a??'')||!uuid.test(b??'')||a===b)throw Error('Informar somente dois UUIDs distintos das contas novas; nenhum segredo')
const source=fs.readFileSync('database/proposals/configuracoes/20261008_vinculos_homologacao.sql','utf8')
fs.mkdirSync('scratch/configuracoes-sequencia',{recursive:true})
fs.writeFileSync('scratch/configuracoes-sequencia/vinculos-revisaveis.sql',source.replaceAll('__CFG_A_UUID__',a).replaceAll('__CFG_B_UUID__',b))
console.log('SQL preparado em scratch/configuracoes-sequencia/vinculos-revisaveis.sql; não executado.')

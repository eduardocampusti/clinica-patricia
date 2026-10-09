import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
// Somente SQL revisado, nunca senhas/tokens. Arquivo evita classificar '-- comentário' como flag.
export function sqlArquivo(cli,query){
 const file=path.join(os.tmpdir(),'clinica-query-'+randomUUID()+'.sql')
 try{fs.writeFileSync(file,query,'utf8');return cli(['db','query','--linked','--file',file]).rows}
 finally{if(fs.existsSync(file))fs.unlinkSync(file)}
}

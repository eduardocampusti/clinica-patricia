// Biblioteca real, sem Auth/Edge/Storage ou alteração de dependências do aplicativo.
// IMAGESCRIPT_ENGINE aponta ao ImageScript.js do pacote oficial imagescript@1.3.0.
import fs from 'node:fs'
import {createRequire} from 'node:module'
import path from 'node:path'
import assert from 'node:assert/strict'
const engine=process.env.IMAGESCRIPT_ENGINE
assert(engine,'Informe IMAGESCRIPT_ENGINE para o pacote oficial1.3.0 extraído em pasta de testes.')
const require=createRequire(import.meta.url),{Image}=require(engine)
assert.equal(JSON.parse(fs.readFileSync(path.join(path.dirname(engine),'package.json'),'utf8')).version,'1.3.0')
const declaration=fs.readFileSync(new URL('../tests/configuracoes/deno.d.ts',import.meta.url),'utf8')
for(const match of declaration.matchAll(/^\s*(static )?(\w+)\([^\n]*\):Promise</gm))assert.equal(typeof (match[1]?Image:Image.prototype)[match[2]],'function',`A declaração de testes inventou a API ${match[2]}`)
const image=new Image(128,64);image.fill(0);image.drawBox(8,8,112,48,0x006194ff)
assert.equal(typeof image.encodePNG,'undefined')
const encoded=await image.encode(),decoded=await Image.decode(encoded)
assert.equal(decoded.width,128);assert.equal(decoded.height,64);assert.equal(decoded.getPixelAt(1,1),0)
console.log('PASS API declarada existe no pacote1.3.0; encode/decode PNG e transparência preservados. LOCAL, não homologação Edge/Storage.')

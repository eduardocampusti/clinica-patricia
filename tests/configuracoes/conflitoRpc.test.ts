import assert from 'node:assert/strict'
import test from 'node:test'
import { conferirRpcConfiguracoes } from '../../supabase/functions/_shared/configuracoesRpc'
import { ErroConfiguracao } from '../../supabase/functions/_shared/configuracoes'
test('Conflito funcional PT409 exige reconsulta, sem sucesso ou erro transitório',()=>{assert.throws(()=>conferirRpcConfiguracoes({code:'PT409'}),(e:unknown)=>e instanceof ErroConfiguracao && e.status===409 && e.conferir===false && e.message.includes('Reconsulte'))})
test('Negação e entrada inválida preservam respostas específicas',()=>{for(const [code,status] of [['42501',403],['22023',422]] as const)assert.throws(()=>conferirRpcConfiguracoes({code}),(e:unknown)=>e instanceof ErroConfiguracao && e.status===status && !e.conferir)})
test('Erro desconhecido permanece indisponibilidade e exige conferência',()=>{assert.throws(()=>conferirRpcConfiguracoes({code:'XX000'}),(e:unknown)=>e instanceof ErroConfiguracao && e.status===503 && e.conferir);assert.doesNotThrow(()=>conferirRpcConfiguracoes(null))})

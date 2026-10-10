// Instrumentação local exclusiva I1/I2 R3. Nenhum token do titular é exportado.
import {supabase} from '../../src/lib/supabase'
import type {CredencialTemporaria} from '../../src/lib/acessoDiretoModelo'
import type {EscopoAcessoEquipe} from '../../src/lib/equipeAcessos'
type Input={membroId:string;clinicaContextoId:string;email:string;clinicasPapeis:EscopoAcessoEquipe[];chaveIdempotencia:string}
async function local(acao:string,body:unknown){const r=await fetch('/__bancada/ad/'+acao,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error('Executor R3 não confirmou. Não repetir cadastro.');return r.json()}
export async function antes(input:Input){if(!/^i[12]\.20261009@acesso-direto\.example\.invalid$/.test(input.email))throw Error('Somente I1/I2 novas autorizadas.');const u=await supabase.auth.getUser();if(u.error||!u.data.user)throw Error('Sessão legítima ausente');await local('preparar',{...input,atorId:u.data.user.id})}
export async function depois(input:Input,data:CredencialTemporaria){await local('registrar',{email:input.email,operacaoId:data.operacaoId,senhaTemporaria:data.senhaTemporaria});return data}
export async function conferirRpcFinanceiraPendente(){}

// Avalia o contrato real da RPC equipe_listar(uuid), não uma tabela sem SELECT.
export function leituraPropriaComprovada(resposta,membroId){
 return !resposta.error&&Array.isArray(resposta.data)&&resposta.data.some(x=>x?.id===membroId)
}
export function outraClinicaRecusada(resposta){
 // Função ausente, transporte recusado ou vazio sem autorização explícita não são prova.
 return resposta.data===null&&resposta.error?.code==='42501'
}

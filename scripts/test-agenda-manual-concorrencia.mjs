// Exclusivamente PostgreSQL portátil sintético. Sem .env, segredos ou conexão remota.
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
const psql = resolve('scratch/tools/postgresql-17.11/pgsql/bin/psql.exe')
function sql(text) {
  return new Promise(resolveResult => {
    const child = spawn(psql, ['-h','127.0.0.1','-p','55442','-U','postgres','-d','postgres','-Atq','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'], { windowsHide:true })
    let out='', err=''
    child.stdout.on('data', b => { out+=b }); child.stderr.on('data', b => { err+=b })
    child.on('error', e => resolveResult({code:1,out:'',err:e.message}))
    child.on('close', code => resolveResult({code,out:out.trim(),err}))
    child.stdin.end(text)
  })
}
const clinic='00000000-0000-4000-8000-000000000201', prof='00000000-0000-4000-8000-000000000401', patient='00000000-0000-4000-8000-000000000301'
const identity="set local role authenticated; set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000101';"
let r=await sql("select host(inet_server_addr())||':'||inet_server_port();")
assert.equal(r.out,'127.0.0.1:55442')
r=await sql(`select count(*) from public.agendamentos where profissional_id='${prof}' and data='2032-01-06';`)
assert.equal(r.out,'0','Data de laboratório já ocupada; não alterar fixtures anteriores')
const ids=[]
try {
  const misto = process.argv.includes('--misto')
  const create = hold => sql(`begin; ${identity} ${misto && hold ? `insert into public.agendamentos(clinica_id,paciente_id,profissional_id,data,hora_inicio,status,observacoes) values('${clinic}','${patient}','${prof}','2032-01-06','07:00','agendado','Concorrência sintética manual') returning id;` : `select public.agenda_manual_criar('${clinic}','${patient}','${prof}','2032-01-06','07:00','Concorrência sintética manual',true)->>'id';`} ${hold?'select pg_sleep(0.6);':''} commit;`)
  const attempts=await Promise.all([create(true),create(false)])
  assert.equal(attempts.filter(a=>a.code===0).length,1,'Apenas um INSERT pode vencer')
  assert.ok(attempts.some(a=>a.err.includes('23P01')),'Conflito concorrente obrigatório')
  r=await sql(`select id from public.agendamentos where profissional_id='${prof}' and data='2032-01-06' and observacoes='Concorrência sintética manual';`)
  ids.push(...r.out.split('\n').filter(Boolean))
  assert.equal(ids.length,1)
  r=await sql(`select row_to_json(t) from (select id,updated_at,data,hora_inicio,status from public.agendamentos where id='${ids[0]}')t;`)
  const a=JSON.parse(r.out)
  const edit = time => sql(`begin; ${identity} select public.agenda_manual_corrigir_horario('${clinic}','${a.id}','${a.updated_at}','${a.status}','${a.data}','${a.hora_inicio}','${a.data}','${time}','Revisão manual concorrente',true); commit;`)
  const edits=await Promise.all([edit('06:00'),edit('06:30')])
  assert.equal(edits.filter(a=>a.code===0).length,1)
  assert.ok(edits.some(a=>a.err.includes('40001')),'Revisão antiga deve ser recusada')
  console.log('PASS duas conexões locais: criação concorrente 23P01, edição concorrente 40001; uma gravação vence cada corrida. Auth simulado.')
} finally {
  for(const id of ids) {
    assert.match(id,/^[\da-f-]{36}$/)
    r=await sql(`select (select count(*) from public.atendimentos where agendamento_id='${id}')+(select count(*) from public.recebimentos where agendamento_id='${id}');`)
    assert.equal(r.out,'0','Dependências impedem limpeza')
    r=await sql(`delete from public.agendamentos where id='${id}' and observacoes='Concorrência sintética manual'; select count(*) from public.agendamentos where id='${id}';`)
    assert.equal(r.code,0,r.err); assert.equal(r.out,'0')
  }
  console.log('PASS limpeza local por ID exato; auditoria preservada. Nenhuma gravação remota.')
}

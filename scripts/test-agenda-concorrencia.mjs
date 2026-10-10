// Somente laboratório sintético fixo. Nunca lê .env/conexão remota.
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
const a='00000000-0000-4000-8000-000000000511', b='00000000-0000-4000-8000-000000000512'
const clinic='00000000-0000-4000-8000-000000000201'
let result = await sql(`insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim)
 values ('${a}','${clinic}','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','2030-02-01','09:00','09:30'),
 ('${b}','${clinic}','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','2030-02-01','10:00','10:30');`)
assert.equal(result.code,0,result.err)
async function row(id) {
  const r=await sql(`select row_to_json(t) from (select id,updated_at,data,hora_inicio,status from public.agendamentos where id='${id}')t`)
  assert.equal(r.code,0,r.err); return JSON.parse(r.out)
}
function call(r,time,hold=false) {
  return sql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
 select public.agenda_corrigir_horario('${clinic}','${r.id}','${r.updated_at}','${r.status}','${r.data}','${r.hora_inicio}','${r.data}','${time}','Concorrência sintética');
 ${hold?'select pg_sleep(1);':''} commit;`)
}
const initial=await row(a)
let attempts=await Promise.all([call(initial,'11:00',true),call(initial,'11:30')])
assert.equal(attempts.filter(r=>r.code===0).length,1)
assert.ok(attempts.some(r=>r.err.includes('40001')), 'Revisão concorrente deve retornar 40001')
const before=[await row(a),await row(b)]
attempts=await Promise.all([call(before[0],'15:00',true),call(before[1],'15:00')])
assert.equal(attempts.filter(r=>r.code===0).length,1)
assert.ok(attempts.some(r=>r.err.includes('23P01')), 'Conflito concorrente deve retornar 23P01')
result=await sql(`select count(*) from public.agendamentos where id in ('${a}','${b}') and hora_inicio='15:00';`)
assert.equal(result.out,'1')
console.log('PASS PostgreSQL isolado: duas conexões, revisão 40001 e conflito 23P01; apenas uma gravação vence cada corrida. Auth claim simulado, RLS real do baseline.')

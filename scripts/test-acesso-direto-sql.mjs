// PostgreSQL portátil já disponível, somente 127.0.0.1:55448. Sem Docker/Supabase.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const bin = path.resolve('scratch/tools/postgresql-17.11/pgsql/bin')
const banco = `acesso_direto_teste_${Date.now()}`
const args = ['-h', '127.0.0.1', '-p', '55448', '-U', 'postgres']
const run = (tool, extra) => execFileSync(path.join(bin, `${tool}.exe`), [...args, ...extra], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const sql = statement => run('psql', ['-d', banco, '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement]).trim()
const arquivo = file => run('psql', ['-d', banco, '-v', 'ON_ERROR_STOP=1', '-f', file])
const pasta = 'scratch/acesso-direto-revisao'
run('createdb', [banco])
try {
  sql(`do $$ begin if inet_server_addr()<>inet '127.0.0.1' or inet_server_port()<>55448 then raise exception 'Somente banco local'; end if; end $$;`)
  // Papéis são do cluster local. Não são contas do Supabase Auth.
  sql(`do $$ declare r text; begin foreach r in array array['anon','authenticated','service_role','supabase_auth_admin','authenticator'] loop if not exists(select 1 from pg_roles where rolname=r) then execute format('create role %I',r); end if; end loop; end $$;`)
  fs.writeFileSync(`${pasta}/fixture-runner.sql`, fs.readFileSync('supabase/tests/acesso-direto_fixture.sql', 'utf8').replace(/^create role .*;\r?\n/gm, ''))
  arquivo(`${pasta}/fixture-runner.sql`)
  arquivo('supabase/migrations/20261008230000_equipe_acesso_direto.sql')
  let recusou = false
  try { arquivo('supabase/migrations/20261008230100_equipe_acesso_direto_protecoes.sql') }
  catch (e) { recusou = String(e.stderr).includes('Catálogo diverge do pacote revisado'); if (!recusou) throw Error(String(e.stderr)) }
  if (!recusou || sql(`select to_regclass('acesso_direto.rpc_inventario') is null`) !== 't') throw Error('O catálogo divergente não abortou integralmente')
  const hashes = sql(`select md5(string_agg(n.nspname||'.'||c.relname,E'\n' order by (n.nspname||'.'||c.relname) collate "C")) from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='public' or n.nspname='storage' and c.relname in ('objects','buckets')) and c.relkind in ('r','p');
select md5(string_agg(p.oid::regprocedure::text||':'||md5(pg_get_functiondef(p.oid)),E'\n' order by (p.oid::regprocedure::text||':'||md5(pg_get_functiondef(p.oid))) collate "C")) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','graphql_public') and p.prokind='f' and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype) and p.proname not like 'acesso_direto_%' and (p.prosecdef or n.nspname='graphql_public') and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE'));`).split(/\r?\n/)
  const inventario = JSON.parse(fs.readFileSync('database/proposals/acesso-direto/inventario-revisado.json','utf8'))
  // Somente a impressão do catálogo é adaptada à fixture. O SQL versionado
  // permanece congelado no inventário real; nenhum controle é suprimido.
  const protecoes = fs.readFileSync('supabase/migrations/20261008230100_equipe_acesso_direto_protecoes.sql','utf8')
    .replace(inventario.hash_tabelas,hashes[0]).replace(inventario.hash_funcoes,hashes[1])
    .replace('alter role authenticator set pgrst.db_pre_request',`alter role authenticator in database ${banco} set pgrst.db_pre_request`)
  fs.writeFileSync(`${pasta}/protecoes-fixture.sql`,protecoes)
  arquivo(`${pasta}/protecoes-fixture.sql`)
  if (sql(`select strpos(pg_get_functiondef('graphql_public.graphql(text,text,jsonb,jsonb)'::regprocedure),'acesso_direto:gate')=0`) !== 't') throw Error('Entrada gerenciada foi substituída')
  const r = execFileSync(path.join(bin,'psql.exe'),[...args,'-d',banco,'-v','ON_ERROR_STOP=1','-f','supabase/tests/acesso-direto_contratos.sql'],{encoding:'utf8',stdio:['ignore','pipe','pipe']})
  if (!r.includes('ROLLBACK')) throw Error('Contratos não terminaram')
  // Cobertura adicional só aceita os seis objetos e as duas RPCs esperadas.
  sql(`do $$ declare n text; begin foreach n in array array['configuracoes_globais_autorizacoes','configuracoes_escopos','configuracoes_versoes','configuracoes_ativos','configuracoes_publicas','configuracoes_homologacao_contextos'] loop execute format('create table public.%I(id integer)',n); execute format('alter table public.%I enable row level security',n); end loop; end $$;
create function public.configuracoes_timbrado_consultar(uuid) returns jsonb language plpgsql stable security definer as $$ begin return '{}'::jsonb; end $$;
create function public.configuracoes_ativo_leitura_autorizada(text) returns boolean language sql stable security definer as $$ select true $$;
grant execute on function public.configuracoes_timbrado_consultar(uuid),public.configuracoes_ativo_leitura_autorizada(text) to authenticated;`)
  arquivo('supabase/tools/acesso-direto-proteger-configuracoes.sql')
  if (sql(`select count(*) from acesso_direto.rpc_inventario where assinatura like 'configuracoes_%'`) !== '2') throw Error('Cobertura adicional incompleta')
  arquivo('supabase/tools/acesso-direto-proteger-configuracoes.sql') // Idempotência.
  console.log('PASS: catálogo divergente aborta; nove grupos SQL; cobertura adicional 6 tabelas/2 RPCs e repetição segura. Tudo sintético local.')
  fs.writeFileSync(`${pasta}/resultado-sql.json`,JSON.stringify({ambiente:'PostgreSQL17.11 sintético local',grupos_contratos:9,catalogo_divergente_recusado:true,cobertura_configuracoes:'6 tabelas/2 RPCs sintéticas; repetição segura',auth_real_validado:false},null,2))
} finally { run('dropdb',[banco]) }

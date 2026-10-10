# Equipe — validação pontual e integrada

**Data:** 28/09/2026  
**Estado:** B1, B2 e B3 corrigidos e validados em PostgreSQL 17.11 portátil isolado. A migration **não foi aplicada no Supabase principal**. As gravações na interface conectada ao principal continuam bloqueadas.

## 1. Escopo e separação de ambientes

A revisão independente 11-AJUSTES-PONTUAIS-E-VALIDACAO-EQUIPE.md foi confrontada com o código atual. O trabalho desta rodada ficou restrito ao repositório, a consultas somente de leitura no principal e a bancos PostgreSQL locais descartáveis.

- **Principal:** projeto Supabase xftnkusbyqzyvzrovroj, consultado apenas por catálogo/lista de migrations e dump somente de esquema. Nenhum SQL de escrita foi enviado.
- **Homologação local:** PostgreSQL portátil 17.11, sem Docker, em 127.0.0.1, restaurado de backup local e complementado somente com stubs mínimos de Auth exigidos pelo esquema.
- **Interface atual:** http://127.0.0.1:5173/acesso/brotas. A inspeção visual encontrou a tela de acesso sem sessão autenticada; não foram usados dados reais nem credenciais no navegador.

A skill TypeSafe AI foi lida e avaliada. Ela não se aplica a esta correção: validação de tipos JSON, autorização, integridade relacional e ordenação de locks são regras determinísticas e devem permanecer em TypeScript/SQL. Nenhuma chamada à API foi feita e nenhuma chave foi solicitada ou exposta. A skill específica Supabase citada pela revisão não está instalada neste ambiente; a revisão foi apoiada na documentação oficial do Supabase e do PostgreSQL.

## 2. Diagnóstico e correções

### B1 — contrato JSON e nulos

**Problema confirmado:** a função aceitava alguns valores JSON de tipo indevido ou null antes de convertê-los, o que deixava o contrato ambíguo e podia gerar erros pouco controlados.

**Correção aplicada:**

- equipe_salvar valida o tipo JSON antes de extrair qualquer campo;
- nome_completo, cargo, tipo e cpf_modo exigem string JSON não nula;
- os campos opcionais aceitam somente string ou null JSON;
- clinicas_ids exige array cujos itens sejam strings;
- a aplicação usa DadosEquipeRpc, com uniões explícitas string | null;
- erro SQL 22023 recebe explicação compreensível na interface;
- foi acrescentado teste unitário do payload real enviado à RPC.

**Resultado real:** casos com nome como objeto, cargo numérico, telefone booleano, tipo:null e cpf_modo:null foram rejeitados em subtransações; cadastro válido com opcionais nulos foi aceito. Nenhuma tentativa inválida persistiu.

### B2 — UF do conselho e sincronização legada

**Problema confirmado:** o gatilho da rota antiga enviava UF desconhecida como null, podendo gerar conflito falso. Além disso, a tabela legada profissionais possuía unicidade apenas por conselho+número e não conseguia representar o mesmo registro em UFs diferentes.

**Correção aplicada:**

- adicionada public.profissionais.conselho_uf, com validação de duas letras maiúsculas;
- substituída a restrição legada profissionais_conselho_unico por índice único normalizado de conselho+número+UF;
- importação, criação e edição passam a transportar a UF entre profissionais e equipe_membros;
- atualização legada apenas de nome preserva a UF conhecida da projeção;
- troca de identidade profissional usa a UF da origem;
- dado legado sem UF continua conservador: não se inventa UF.

**Resultado real:** o mesmo CRM/número em BA e SP foi aceito; a duplicidade no mesmo estado foi rejeitada; uma atualização legada somente de nome preservou BA. A primeira execução dirigida foi justamente o que revelou a restrição antiga incompatível, que então foi corrigida na migration.

### B3 — autorização global e concorrência

**Problemas confirmados:**

- uma policy baseada em vínculos visíveis por RLS podia deixar de enxergar uma segunda clínica e permitir decisão incompleta;
- a RPC nova e a escrita legada podiam adquirir locks em ordem inversa.

**Correção aplicada:**

- criada equipe_pode_editar_profissional_global(uuid) como SECURITY DEFINER, com search_path vazio e nomes totalmente qualificados;
- a função exige usuário autenticado e ativo, ao menos um vínculo e propriedade ativa em **todas** as clínicas vinculadas ao profissional;
- profissionais_update usa esse resultado em USING e WITH CHECK;
- PUBLIC e anon não executam a função; authenticated recebe apenas o execute necessário para a policy;
- equipe_salvar passa a bloquear primeiro profissionais e depois equipe_membros, na mesma ordem da rota legada;
- as RPCs administrativas continuam SECURITY DEFINER, search_path vazio, autorização explícita de ator, ação, alvo e clínica;
- tabelas internas não têm escrita direta por authenticated; a gravação passa pela RPC.

**Resultados reais:**

- uma proprietária apenas de Brotas não conseguiu atualizar diretamente um profissional vinculado a Brotas e Ipupiara: zero linhas alteradas;
- duas conexões psql reais foram executadas em paralelo: conexão A chamou equipe_salvar, conexão B executou a atualização legada;
- uma barreira de teste de 5 segundos garantiu sobreposição; B aguardou A, ambas concluíram, sem deadlock nem timeout;
- o estado final ficou consistente nos dois modelos, com o telefone da rota nova preservado, o nome final da rota legada, UF BA e revisão incrementada;
- as fixtures foram removidas após a verificação.

## 3. Esquema principal — conferência somente de leitura

Foi gerado um dump **somente do esquema**, sem dados, e conferido contra a migration. SHA-256 do artefato local de diagnóstico: CD96DACF40767E6E24ED3025534313D526CFDCD94D7C6681CDF506FAEE888317.

### Dependências presentes

- PostgreSQL 17;
- tabelas clinicas, especialidades, profissionais, profissionais_clinicas, usuarios, usuarios_clinicas e auditoria;
- funções clinicas_do_usuario, eh_proprietaria, cpf_encrypt, cpf_decrypt, cpf_hash, pacientes_cpf_valido e a rota legada cadastrar_profissional;
- migration de dependência 20260924120000_pacientes_cpf_pendente_rpc.sql já registrada remotamente.

### Diferenças que a migration tratará

- os objetos equipe_* ainda não existem no principal;
- profissionais.conselho_uf ainda não existe;
- permanece a restrição antiga profissionais_conselho_unico (conselho_classe, registro_conselho);
- a policy atual profissionais_update ainda usa a regra legada de qualquer clínica;
- a migration 20260928153000 não está aplicada;
- a migration pendente 20260925130000 observada na lista não é dependência desta entrega e não deve ser aplicada por associação.

## 4. Testes realmente executados

| Verificação | Ambiente | Resultado |
|---|---|---|
| Aplicação do arquivo final exato, do início ao fim | PostgreSQL portátil 17.11 limpo/restaurado | **PASS** |
| B1 — tipos JSON, nulos e payload válido | PostgreSQL portátil | **PASS** |
| B2 — BA/SP, duplicidade na mesma UF e atualização legada | PostgreSQL portátil | **PASS** |
| B3 — proprietária parcial contra profissional multiunidade | PostgreSQL portátil como authenticated, RLS ativa | **PASS** |
| B3 — duas conexões simultâneas e ordem de locks | PostgreSQL portátil, duas sessões reais | **PASS**, sem deadlock/timeout |
| Catálogo por information_schema/pg_proc | PostgreSQL portátil | **PASS** |
| Grants da RPC | PostgreSQL portátil | **PASS**: anon=false, authenticated=true |
| SECURITY DEFINER e search_path | PostgreSQL portátil | **PASS** |
| Regressão SQL completa anterior e reconexão | PostgreSQL portátil | **PASS** |
| Testes unitários src/lib/equipe.test.ts | Local | **PASS 6/6** |
| npm run lint | Local | **PASS**, um aviso histórico de Fast Refresh |
| npm run build | Local | **PASS** |
| supabase/tools/verificar-integridade.sql | PostgreSQL portátil | **PARCIAL**: executou até consultar storage.buckets; o backup de aplicação não contém o schema Storage |
| Inspeção visual da rota de acesso | Navegador local | **PASS** para disponibilidade da tela; sem autenticação |

Os grants diretos acrescentados a authenticated durante o ensaio foram exclusivamente preparação do clone restaurado com --no-privileges; não fazem parte da migration.

## 5. Testes preparados, mas não executados contra Supabase completo

Os scripts abaixo permanecem versionados para repetição em homologação autorizada:

- database/tests/equipe/20260928_equipe_homologacao.sql;
- database/tests/equipe/20260928_equipe_reconexao_limpeza.sql;
- database/tests/equipe/20260928_equipe_b1_b2_b3_setup.sql;
- database/tests/equipe/20260928_equipe_b3_conexao_a.sql;
- database/tests/equipe/20260928_equipe_b3_conexao_b.sql;
- database/tests/equipe/20260928_equipe_b3_verificar_limpar.sql.

Não foram executados em um projeto Supabase de homologação real:

- login pelo Auth;
- chamada PostgREST pelo navegador com JWT real;
- integração real com Vault;
- ciclo completo de cadastro/edição/recarregamento pela interface autenticada;
- verificador de integridade incluindo Storage.

Não existe projeto Supabase isolado autorizado desta clínica disponível nesta rodada. Os outros projetos listados não foram presumidos como homologação.

## 6. CPF da equipe

CPF permanece **opcional** para a equipe até decisão funcional expressa. Quando informado, deve ser válido, é cifrado e comparado por hash; não aparece em logs nem auditoria. Remoção e substituição são ações explícitas, e a auditoria registra somente a categoria da mudança.

Origem da regra atual: a documentação funcional aprovada não tornou CPF obrigatório para toda a equipe. A obrigatoriedade anterior era uma escolha de implementação e foi removida. A regra de CPF opcional dos pacientes não foi alterada.

Menor alternativa compatível se houver decisão futura: exigir CPF apenas nos tipos/cargos formalmente aprovados, com mensagem e regra de transição para registros existentes; isso demanda nova aprovação e não faz parte desta migration.

## 7. Compatibilidade e dados existentes

- funcionário de apoio é armazenado somente em equipe_membros, sem criar profissional de saúde nem usuário Auth fictício;
- profissionais existentes são reaproveitados e projetados na equipe;
- a pessoa pode ter vínculos com Brotas e Ipupiara sem duplicação;
- a edição preserva vínculos fora do alcance do editor e exige autoridade sobre todos os vínculos antes de alterar identidade global;
- CPF não é copiado para logs; ciphertext/hash não são expostos às listagens;
- idempotência, revisão otimista, transação única, constraints e índices evitam duplicidade e gravação parcial;
- Agenda e Financeiro continuam usando profissionais/profissionais_clinicas; os gatilhos mantêm essa projeção sincronizada.

### Preflight obrigatório antes de futura aplicação

Executar somente leitura e interromper se houver resultado incompatível:

1. confirmar as dependências acima por catálogo;
2. procurar registros profissionais repetidos por conselho+número+UF normalizados;
3. medir registros com conselho/número, mas UF desconhecida;
4. conferir valores atuais que violariam o novo CHECK de UF;
5. confirmar a definição da constraint profissionais_conselho_unico e da policy profissionais_update;
6. confirmar que não existem objetos equipe_* parciais;
7. obter backup/restauração verificável e janela de manutenção.

### Aplicação e recuperação futuras

Ordem: backup verificável → preflight de leitura → migration 20260928153000 em transação → confirmação por information_schema e pg_proc → verificar-integridade.sql → testes negativos/positivos com JWT de homologação → teste de Agenda/Financeiro → liberação da interface.

A estratégia preferida de recuperação é restaurar o backup em novo projeto/instância e redirecionar o serviço. Reversão manual é de maior risco porque a migration cria dados e substitui a unicidade de conselho; só deve ser usada após exportar equipe_membros, equipe_membros_clinicas, equipe_idempotencia, profissionais.conselho_uf e definições anteriores de policy/constraint.

## 8. Pendência concreta para liberar cadastro e edição

A interface só libera gravações quando o backend responde às RPCs equipe_listar, equipe_detalhar e equipe_salvar com o contrato esperado. Hoje o Supabase principal não possui esses objetos; portanto, a aplicação detecta PGRST202/função inexistente, entra em compatibilidade, exibe profissionais legados e explica que cadastro/edição aguardam a atualização segura do banco.

**Para liberar de verdade:** criar/autorizar um Supabase de homologação completo, aplicar ali a migration, executar Auth/PostgREST/Vault/Storage e o fluxo de navegador autenticado, aprovar os resultados e só então agendar a aplicação controlada no principal. Até isso ocorrer, as gravações permanecem bloqueadas.

## 9. Referências técnicas consultadas

- Supabase — Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase — Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- PostgreSQL 17 — JSON Functions and Operators: https://www.postgresql.org/docs/17/functions-json.html
- PostgreSQL 17 — Explicit Locking: https://www.postgresql.org/docs/17/explicit-locking.html
- TypeSafe AI — índice vivo para agentes: https://docs.typesafe.ai/llms.txt

## 10. SQL integral corrigido

Arquivo: supabase/migrations/20260928153000_equipe_cadastro_edicao.sql  
SHA-256: 6263C5D5341853C5326792E84CD73F3244F07E5F17DBC17136A7DE727FF995B1

~~~sql
-- ETAPA 1 — cadastro e edição de equipe.
-- Migration aditiva revisada para homologação isolada; não aplicar automaticamente.
-- public.profissionais segue como fonte operacional; Equipe mantém projeção sincronizada.

begin;

do $$
declare v_faltantes text[];
begin
  if to_regclass('public.profissionais') is null
     or to_regclass('public.profissionais_clinicas') is null
     or to_regclass('public.usuarios') is null
     or to_regclass('public.usuarios_clinicas') is null
     or to_regclass('public.clinicas') is null
     or to_regclass('public.especialidades') is null
     or to_regclass('public.auditoria') is null
     or to_regprocedure('public.eh_proprietaria(uuid)') is null
     or to_regprocedure('public.clinicas_do_usuario()') is null
     or to_regprocedure('public.cpf_encrypt(text)') is null
     or to_regprocedure('public.cpf_decrypt(bytea)') is null
     or to_regprocedure('public.cpf_hash(text)') is null
     or to_regprocedure('public.pacientes_cpf_valido(text)') is null then
    raise exception 'Dependências da migration de Equipe não estão disponíveis.';
  end if;
  select array_agg(requisito) into v_faltantes
  from (values
    ('profissionais.nome_completo'),('profissionais.cpf_encrypted'),('profissionais.cpf_hash'),
    ('profissionais.conselho_classe'),('profissionais.registro_conselho'),
    ('profissionais.especialidade_principal_id'),('profissionais.usuario_id'),('profissionais.ativo'),
    ('profissionais_clinicas.profissional_id'),('profissionais_clinicas.clinica_id'),('profissionais_clinicas.ativo'),
    ('usuarios.id'),('usuarios.ativo'),('usuarios_clinicas.usuario_id'),('usuarios_clinicas.clinica_id'),
    ('usuarios_clinicas.papel'),('usuarios_clinicas.ativo'),('auditoria.clinica_id'),
    ('auditoria.usuario_id'),('auditoria.acao'),('auditoria.entidade'),
    ('auditoria.entidade_id'),('auditoria.dados_depois')
  ) r(requisito)
  where not exists (
    select 1 from information_schema.columns c where c.table_schema='public'
      and c.table_name=split_part(r.requisito,'.',1)
      and c.column_name=split_part(r.requisito,'.',2)
  );
  if v_faltantes is not null then
    raise exception 'Colunas obrigatórias ausentes: %', array_to_string(v_faltantes, ', ');
  end if;
end $$;

-- O legado não armazenava a jurisdição do conselho e, por isso, sua constraint
-- bloqueava registros iguais em UFs distintas. A coluna começa nula: nenhuma UF
-- histórica é inventada.
alter table public.profissionais
  add column conselho_uf text check (conselho_uf is null or conselho_uf ~ '^[A-Z]{2}$');
alter table public.profissionais drop constraint profissionais_conselho_unico;
create unique index profissionais_registro_unico on public.profissionais(
  upper(btrim(conselho_classe)),upper(btrim(registro_conselho)),coalesce(conselho_uf,'')
) where conselho_classe is not null;

create type public.tipo_membro_equipe as enum ('profissional_saude','administrativo','apoio','outro');

create table public.equipe_membros (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid unique references public.profissionais(id) on delete restrict,
  nome_completo text not null check (length(btrim(nome_completo)) >= 3),
  cargo text not null check (length(btrim(cargo)) >= 2),
  tipo public.tipo_membro_equipe not null,
  profissao text,
  cpf_encrypted bytea,
  cpf_hash text unique,
  telefone text,
  email_contato text,
  conselho_classe text,
  registro_conselho text,
  conselho_uf text check (conselho_uf is null or conselho_uf ~ '^[A-Z]{2}$'),
  especialidade_id uuid references public.especialidades(id) on delete restrict,
  usuario_id uuid references public.usuarios(id) on delete set null,
  ativo boolean not null default true,
  revisao integer not null default 1 check (revisao > 0),
  created_by uuid default auth.uid() references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipe_cpf_par check ((cpf_encrypted is null)=(cpf_hash is null)),
  constraint equipe_profissao_coerente check (tipo='profissional_saude' or profissao is null),
  constraint equipe_conselho_coerente check (
    (conselho_classe is null and registro_conselho is null and conselho_uf is null)
    or (conselho_classe is not null and registro_conselho is not null)
  )
);
create index equipe_email_contato_idx on public.equipe_membros(lower(email_contato))
  where email_contato is not null;
create unique index equipe_registro_unico on public.equipe_membros(
  upper(btrim(conselho_classe)),upper(btrim(registro_conselho)),coalesce(conselho_uf,'')
) where conselho_classe is not null;

create table public.equipe_membros_clinicas (
  membro_id uuid not null references public.equipe_membros(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  ativo boolean not null default true,
  created_by uuid default auth.uid() references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(membro_id,clinica_id)
);

create table public.equipe_idempotencia (
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  chave uuid not null,
  payload_hash text not null,
  membro_id uuid references public.equipe_membros(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(usuario_id,chave)
);

insert into public.equipe_membros(
  profissional_id,nome_completo,cargo,tipo,profissao,cpf_encrypted,cpf_hash,
  conselho_classe,registro_conselho,conselho_uf,especialidade_id,usuario_id,ativo,created_by,created_at,updated_at
)
select p.id,btrim(p.nome_completo),
  case when upper(coalesce(p.conselho_classe,'')) like 'CRM%' then 'Médico(a)' else 'Profissional de saúde' end,
  'profissional_saude',case when upper(coalesce(p.conselho_classe,'')) like 'CRM%' then 'Medicina' else null end,
  p.cpf_encrypted,p.cpf_hash,nullif(upper(btrim(p.conselho_classe)),''),
  nullif(upper(btrim(p.registro_conselho)),''),p.conselho_uf,p.especialidade_principal_id,p.usuario_id,
  p.ativo,p.created_by,p.created_at,p.updated_at
from public.profissionais p on conflict(profissional_id) do nothing;

insert into public.equipe_membros_clinicas(membro_id,clinica_id,ativo,created_by,created_at,updated_at)
select em.id,pc.clinica_id,pc.ativo,coalesce(pc.created_by,em.created_by),pc.created_at,pc.updated_at
from public.equipe_membros em join public.profissionais_clinicas pc on pc.profissional_id=em.profissional_id
on conflict(membro_id,clinica_id) do nothing;

create or replace function public.equipe_validar_registro(
  p_membro_id uuid,p_conselho text,p_registro text,p_uf text
) returns void language plpgsql security definer set search_path='' as $$
begin
  if (p_conselho is null)<>(p_registro is null) then
    raise exception 'Conselho e registro devem ser informados juntos.' using errcode='22023';
  end if;
  if p_conselho is null then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(upper(btrim(p_conselho))||'|'||upper(btrim(p_registro)),0)
  );
  if exists(select 1 from public.equipe_membros m
    where m.id is distinct from p_membro_id
      and upper(btrim(m.conselho_classe))=upper(btrim(p_conselho))
      and upper(btrim(m.registro_conselho))=upper(btrim(p_registro))
      and (m.conselho_uf is null or p_uf is null or m.conselho_uf=upper(p_uf))) then
    raise exception 'Já existe cadastro com este conselho e registro; revise a UF do legado.' using errcode='23505';
  end if;
end $$;

create or replace function public.equipe_sincronizar_profissional()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_membro uuid;
  v_conselho_atual text;
  v_registro_atual text;
  v_uf_validacao text;
begin
  if current_setting('app.equipe_origem',true)='equipe' then return new; end if;
  select id,conselho_classe,registro_conselho,conselho_uf
  into v_membro,v_conselho_atual,v_registro_atual,v_uf_validacao
  from public.equipe_membros where profissional_id=new.id;
  if v_membro is null
     or v_conselho_atual is distinct from nullif(upper(btrim(new.conselho_classe)),'')
     or v_registro_atual is distinct from nullif(upper(btrim(new.registro_conselho)),'') then
    v_uf_validacao:=new.conselho_uf;
  end if;
  perform public.equipe_validar_registro(
    v_membro,nullif(upper(btrim(new.conselho_classe)),''),
    nullif(upper(btrim(new.registro_conselho)),''),v_uf_validacao
  );
  insert into public.equipe_membros(
    profissional_id,nome_completo,cargo,tipo,profissao,cpf_encrypted,cpf_hash,
    conselho_classe,registro_conselho,conselho_uf,especialidade_id,usuario_id,ativo,created_by,created_at,updated_at
  ) values(
    new.id,btrim(new.nome_completo),
    case when upper(coalesce(new.conselho_classe,'')) like 'CRM%' then 'Médico(a)' else 'Profissional de saúde' end,
    'profissional_saude',case when upper(coalesce(new.conselho_classe,'')) like 'CRM%' then 'Medicina' else null end,
    new.cpf_encrypted,new.cpf_hash,nullif(upper(btrim(new.conselho_classe)),''),
    nullif(upper(btrim(new.registro_conselho)),''),new.conselho_uf,new.especialidade_principal_id,new.usuario_id,new.ativo,
    new.created_by,new.created_at,new.updated_at
  ) on conflict(profissional_id) do update set
    nome_completo=excluded.nome_completo,cpf_encrypted=excluded.cpf_encrypted,cpf_hash=excluded.cpf_hash,
    conselho_classe=excluded.conselho_classe,registro_conselho=excluded.registro_conselho,
    conselho_uf=excluded.conselho_uf,
    especialidade_id=excluded.especialidade_id,usuario_id=excluded.usuario_id,ativo=excluded.ativo,
    revisao=public.equipe_membros.revisao+1,updated_at=now()
  returning id into v_membro;
  return new;
end $$;

create trigger equipe_profissional_sync
after insert or update of nome_completo,cpf_encrypted,cpf_hash,conselho_classe,registro_conselho,conselho_uf,
  especialidade_principal_id,usuario_id,ativo on public.profissionais
for each row execute function public.equipe_sincronizar_profissional();

create or replace function public.equipe_sincronizar_vinculo_profissional()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_membro uuid;
begin
  if current_setting('app.equipe_origem',true)='equipe' then return new; end if;
  select id into v_membro from public.equipe_membros where profissional_id=new.profissional_id;
  if v_membro is null then raise exception 'Profissional sem projeção na central de Equipe.'; end if;
  insert into public.equipe_membros_clinicas(membro_id,clinica_id,ativo,created_by,created_at,updated_at)
  values(v_membro,new.clinica_id,new.ativo,new.created_by,new.created_at,new.updated_at)
  on conflict(membro_id,clinica_id) do update set ativo=excluded.ativo,updated_at=excluded.updated_at;
  return new;
end $$;

create trigger equipe_profissional_clinica_sync
after insert or update of ativo on public.profissionais_clinicas
for each row execute function public.equipe_sincronizar_vinculo_profissional();

create or replace function public.equipe_pode_editar_profissional_global(p_profissional_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
    and exists(select 1 from public.profissionais_clinicas pc where pc.profissional_id=p_profissional_id)
    and not exists(select 1 from public.profissionais_clinicas pc
      where pc.profissional_id=p_profissional_id and not public.eh_proprietaria(pc.clinica_id));
$$;

-- Escritas diretas legadas em identidade profissional são globais: o ator precisa
-- administrar todas as clínicas já vinculadas, não somente uma delas.
drop policy if exists profissionais_update on public.profissionais;
create policy profissionais_update on public.profissionais for update to authenticated
using (public.equipe_pode_editar_profissional_global(id))
with check (public.equipe_pode_editar_profissional_global(id));

alter table public.equipe_membros enable row level security;
alter table public.equipe_membros_clinicas enable row level security;
alter table public.equipe_idempotencia enable row level security;
create policy equipe_membros_select on public.equipe_membros for select to authenticated using(
  exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
  and exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=id and ec.ativo
    and public.eh_proprietaria(ec.clinica_id))
);
create policy equipe_clinicas_select on public.equipe_membros_clinicas for select to authenticated using(
  exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
  and public.eh_proprietaria(clinica_id)
);

create or replace function public.equipe_listar(p_clinica_contexto_id uuid)
returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
     or not public.eh_proprietaria(p_clinica_contexto_id) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  return query select jsonb_build_object(
    'id',m.id,'nome_completo',m.nome_completo,'cargo',m.cargo,'tipo',m.tipo,
    'profissao',m.profissao,'telefone',m.telefone,'email_contato',m.email_contato,
    'conselho_classe',m.conselho_classe,'registro_conselho',m.registro_conselho,'conselho_uf',m.conselho_uf,
    'especialidade_id',m.especialidade_id,'especialidade_nome',e.nome,
    'acesso_status',case when m.usuario_id is null then 'sem_conta'
      when not exists(select 1 from public.usuarios u where u.id=m.usuario_id and u.ativo) then 'conta_inativa'
      when exists(select 1 from public.usuarios_clinicas uc where uc.usuario_id=m.usuario_id
        and uc.clinica_id=p_clinica_contexto_id and uc.ativo) then 'ativo_na_unidade'
      else 'sem_acesso_na_unidade' end,
    'revisao',m.revisao,'clinicas',coalesce((select jsonb_agg(
      jsonb_build_object('id',c.id,'nome',c.nome) order by c.nome)
      from public.equipe_membros_clinicas ec join public.clinicas c on c.id=ec.clinica_id
      where ec.membro_id=m.id and ec.ativo and public.eh_proprietaria(c.id)),'[]'::jsonb)
  ) from public.equipe_membros m left join public.especialidades e on e.id=m.especialidade_id
  where m.ativo and exists(select 1 from public.equipe_membros_clinicas ec
    where ec.membro_id=m.id and ec.clinica_id=p_clinica_contexto_id and ec.ativo)
  order by m.nome_completo;
end $$;

create or replace function public.equipe_detalhar(p_membro_id uuid,p_clinica_contexto_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r jsonb; v_cpf text;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
     or not public.eh_proprietaria(p_clinica_contexto_id)
     or not exists(select 1 from public.equipe_membros_clinicas
       where membro_id=p_membro_id and clinica_id=p_clinica_contexto_id and ativo) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  select case when m.cpf_encrypted is null then null else public.cpf_decrypt(m.cpf_encrypted) end
  into v_cpf from public.equipe_membros m where m.id=p_membro_id;
  select x||jsonb_build_object('cpf',v_cpf,'cpf_situacao',case when v_cpf is null then 'ausente' else 'informado' end)
  into r from public.equipe_listar(p_clinica_contexto_id) x where x->>'id'=p_membro_id::text;
  return r;
end $$;

create or replace function public.equipe_salvar(
  p_membro_id uuid,p_clinica_contexto_id uuid,p_revisao_esperada integer,p_dados jsonb,p_chave_idempotencia uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_id uuid:=p_membro_id; v_prof uuid; v_cpf text; v_modo text; v_clinica uuid;
  v_clinicas uuid[]:=array[]::uuid[]; v_ant public.equipe_membros%rowtype;
  v_nome text; v_cargo text; v_tipo text; v_profissao text; v_telefone text; v_email text;
  v_conselho text; v_registro text; v_uf text; v_especialidade uuid; v_hash text;
  v_campos text[]:=array[]::text[]; v_adicionadas uuid[]:=array[]::uuid[];
  v_repeticao public.equipe_idempotencia%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
     or not public.eh_proprietaria(p_clinica_contexto_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_dados is null or jsonb_typeof(p_dados)<>'object' then raise exception 'O formulário enviado é inválido.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_dados) k where k not in(
    'nome_completo','cargo','tipo','profissao','cpf_modo','cpf','telefone','email_contato',
    'conselho_classe','registro_conselho','conselho_uf','especialidade_id','clinicas_ids'))
    or not(p_dados ?& array['nome_completo','cargo','tipo','profissao','cpf_modo','cpf','telefone',
      'email_contato','conselho_classe','registro_conselho','conselho_uf','especialidade_id','clinicas_ids']) then
    raise exception 'O formulário contém campos inesperados ou ausentes.' using errcode='22023';
  end if;
  if jsonb_typeof(p_dados->'clinicas_ids')<>'array'
     or exists(select 1 from jsonb_array_elements(p_dados->'clinicas_ids') x where jsonb_typeof(x)<>'string') then
    raise exception 'A lista de clínicas é inválida.' using errcode='22023';
  end if;
  if jsonb_typeof(p_dados->'nome_completo') is distinct from 'string'
     or jsonb_typeof(p_dados->'cargo') is distinct from 'string'
     or jsonb_typeof(p_dados->'tipo') is distinct from 'string'
     or jsonb_typeof(p_dados->'cpf_modo') is distinct from 'string' then
    raise exception 'Nome, cargo, tipo e modo de CPF devem ser textos não nulos.' using errcode='22023';
  end if;
  if exists(
    select 1 from unnest(array[
      'profissao','cpf','telefone','email_contato','conselho_classe',
      'registro_conselho','conselho_uf','especialidade_id'
    ]) campo
    where jsonb_typeof(p_dados->campo) not in ('string','null')
  ) then
    raise exception 'Campos opcionais devem ser texto ou nulos.' using errcode='22023';
  end if;
  v_nome:=nullif(btrim(p_dados->>'nome_completo'),''); v_cargo:=nullif(btrim(p_dados->>'cargo'),'');
  v_tipo:=p_dados->>'tipo'; v_profissao:=nullif(btrim(p_dados->>'profissao'),''); v_modo:=p_dados->>'cpf_modo';
  v_cpf:=regexp_replace(coalesce(p_dados->>'cpf',''),'[^0-9]','','g'); v_telefone:=nullif(btrim(p_dados->>'telefone'),'');
  v_email:=nullif(lower(btrim(p_dados->>'email_contato')),''); v_conselho:=nullif(upper(btrim(p_dados->>'conselho_classe')),'');
  v_registro:=nullif(upper(btrim(p_dados->>'registro_conselho')),''); v_uf:=nullif(upper(btrim(p_dados->>'conselho_uf')),'');
  begin v_especialidade:=nullif(p_dados->>'especialidade_id','')::uuid;
  exception when invalid_text_representation then raise exception 'Especialidade inválida.' using errcode='22023'; end;
  if v_nome is null or length(v_nome)<3 or v_cargo is null or length(v_cargo)<2
     or v_tipo is null or v_tipo not in('profissional_saude','administrativo','apoio','outro') then
    raise exception 'Dados cadastrais obrigatórios inválidos.' using errcode='22023'; end if;
  if v_tipo='profissional_saude' and v_profissao is null then raise exception 'Profissão obrigatória para profissional de saúde.' using errcode='22023'; end if;
  if v_tipo<>'profissional_saude' and (v_profissao is not null or v_conselho is not null or v_registro is not null or v_uf is not null or v_especialidade is not null) then
    raise exception 'Campos profissionais não são aceitos para esta função.' using errcode='22023'; end if;
  if (v_conselho is null)<>(v_registro is null) or (v_uf is not null and v_conselho is null)
     or (v_uf is not null and v_uf!~'^[A-Z]{2}$') then raise exception 'Conselho, registro e UF estão inconsistentes.' using errcode='22023'; end if;
  if v_email is not null and v_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail de contato inválido.' using errcode='22023'; end if;
  if v_modo is null or v_modo not in('preservar','substituir','remover') or (v_modo='preservar' and v_cpf<>'')
     or (v_modo='remover' and v_cpf<>'') or (v_modo='substituir' and(length(v_cpf)<>11 or not public.pacientes_cpf_valido(v_cpf))) then
    raise exception 'Operação de CPF inválida.' using errcode='22023'; end if;
  if p_membro_id is null and v_modo='preservar' then raise exception 'Cadastro novo deve informar ou remover explicitamente o CPF.' using errcode='22023'; end if;
  begin select coalesce(array_agg(distinct x::uuid),array[]::uuid[]) into v_clinicas from jsonb_array_elements_text(p_dados->'clinicas_ids') x;
  exception when invalid_text_representation then raise exception 'Uma das clínicas é inválida.' using errcode='22023'; end;
  if cardinality(v_clinicas)=0 or cardinality(v_clinicas)<>jsonb_array_length(p_dados->'clinicas_ids') then
    raise exception 'Selecione clínicas válidas, sem repetição.' using errcode='22023'; end if;
  foreach v_clinica in array v_clinicas loop
    if not exists(select 1 from public.clinicas c where c.id=v_clinica) or not public.eh_proprietaria(v_clinica) then
      raise exception 'Sem autorização para uma das clínicas.' using errcode='42501'; end if;
  end loop;

  if p_membro_id is null then
    if p_chave_idempotencia is null then raise exception 'Identificador da tentativa é obrigatório.' using errcode='22023'; end if;
    v_hash:=md5(p_dados::text||'|'||p_clinica_contexto_id::text);
    insert into public.equipe_idempotencia(usuario_id,chave,payload_hash) values(auth.uid(),p_chave_idempotencia,v_hash) on conflict do nothing;
    select * into v_repeticao from public.equipe_idempotencia where usuario_id=auth.uid() and chave=p_chave_idempotencia for update;
    if v_repeticao.payload_hash<>v_hash then raise exception 'Esta tentativa já foi usada com dados diferentes.' using errcode='22023'; end if;
    if v_repeticao.membro_id is not null then return v_repeticao.membro_id; end if;
  else
    -- Ordem única para evitar ciclo com a escrita legada: profissional primeiro,
    -- projeção de Equipe depois. O trigger legado segue a mesma ordem.
    select profissional_id into v_prof from public.equipe_membros where id=p_membro_id;
    if v_prof is not null then
      perform 1 from public.profissionais where id=v_prof for update;
    end if;
    select * into v_ant from public.equipe_membros where id=p_membro_id for update;
    if not found or not exists(select 1 from public.equipe_membros_clinicas where membro_id=v_id and clinica_id=p_clinica_contexto_id and ativo) then
      raise exception 'Cadastro não encontrado.' using errcode='P0002'; end if;
    if exists(select 1 from(
      select ec.clinica_id from public.equipe_membros_clinicas ec where ec.membro_id=v_id
      union select pc.clinica_id from public.profissionais_clinicas pc where pc.profissional_id=v_ant.profissional_id
    ) vinculos where not public.eh_proprietaria(vinculos.clinica_id)) then
      raise exception 'A alteração global requer autorização em todas as unidades vinculadas.' using errcode='42501'; end if;
    if p_revisao_esperada is null or v_ant.revisao<>p_revisao_esperada then raise exception 'Cadastro alterado por outra sessão; recarregue antes de salvar.' using errcode='40001'; end if;
    if (v_ant.profissional_id is null)<>(v_tipo<>'profissional_saude') or v_ant.tipo::text<>v_tipo then raise exception 'A alteração do tipo funcional exige fluxo específico.' using errcode='22023'; end if;
    if v_conselho is not null and v_uf is null and(v_ant.conselho_classe is distinct from v_conselho or v_ant.registro_conselho is distinct from v_registro) then
      raise exception 'Informe a UF ao alterar um registro profissional.' using errcode='22023'; end if;
  end if;
  perform public.equipe_validar_registro(v_id,v_conselho,v_registro,v_uf);
  perform set_config('app.equipe_origem','equipe',true);

  if p_membro_id is null then
    if v_tipo='profissional_saude' then
      insert into public.profissionais(nome_completo,cpf_encrypted,cpf_hash,conselho_classe,registro_conselho,conselho_uf,especialidade_principal_id,created_by)
      values(v_nome,case when v_modo='substituir' then public.cpf_encrypt(v_cpf) end,
        case when v_modo='substituir' then public.cpf_hash(v_cpf) end,v_conselho,v_registro,v_uf,v_especialidade,auth.uid()) returning id into v_prof;
    end if;
    insert into public.equipe_membros(profissional_id,nome_completo,cargo,tipo,profissao,cpf_encrypted,cpf_hash,telefone,email_contato,
      conselho_classe,registro_conselho,conselho_uf,especialidade_id,created_by)
    values(v_prof,v_nome,v_cargo,v_tipo::public.tipo_membro_equipe,v_profissao,
      case when v_modo='substituir' then public.cpf_encrypt(v_cpf) end,case when v_modo='substituir' then public.cpf_hash(v_cpf) end,
      v_telefone,v_email,v_conselho,v_registro,v_uf,v_especialidade,auth.uid()) returning id into v_id;
    v_campos:=array['cadastro','clinicas']; if v_modo='substituir' then v_campos:=array_append(v_campos,'cpf'); end if;
  else
    if v_ant.nome_completo is distinct from v_nome then v_campos:=array_append(v_campos,'nome'); end if;
    if v_ant.cargo is distinct from v_cargo or v_ant.profissao is distinct from v_profissao then v_campos:=array_append(v_campos,'funcao'); end if;
    if v_ant.telefone is distinct from v_telefone or v_ant.email_contato is distinct from v_email then v_campos:=array_append(v_campos,'contato'); end if;
    if v_ant.conselho_classe is distinct from v_conselho or v_ant.registro_conselho is distinct from v_registro
       or v_ant.conselho_uf is distinct from v_uf or v_ant.especialidade_id is distinct from v_especialidade then
      v_campos:=array_append(v_campos,'registro_profissional'); end if;
    if (v_modo='substituir' and v_ant.cpf_hash is distinct from public.cpf_hash(v_cpf))
       or (v_modo='remover' and v_ant.cpf_hash is not null) then
      v_campos:=array_append(v_campos,'cpf');
    end if;
    v_prof:=v_ant.profissional_id;
  end if;
  foreach v_clinica in array v_clinicas loop
    if exists(select 1 from public.equipe_membros_clinicas where membro_id=v_id and clinica_id=v_clinica and not ativo) then
      raise exception 'Há vínculo inativo; use o fluxo explícito de reativação.' using errcode='22023'; end if;
    if not exists(select 1 from public.equipe_membros_clinicas where membro_id=v_id and clinica_id=v_clinica) then
      insert into public.equipe_membros_clinicas(membro_id,clinica_id,created_by) values(v_id,v_clinica,auth.uid());
      v_adicionadas:=array_append(v_adicionadas,v_clinica);
    end if;
    if v_prof is not null then
      if exists(select 1 from public.profissionais_clinicas where profissional_id=v_prof and clinica_id=v_clinica and not ativo) then
        raise exception 'Há vínculo profissional inativo; use o fluxo explícito de reativação.' using errcode='22023'; end if;
      insert into public.profissionais_clinicas(profissional_id,clinica_id,created_by)
      select v_prof,v_clinica,auth.uid() where not exists(select 1 from public.profissionais_clinicas where profissional_id=v_prof and clinica_id=v_clinica);
    end if;
  end loop;
  if cardinality(v_adicionadas)>0 and not('clinicas'=any(v_campos)) then v_campos:=array_append(v_campos,'clinicas'); end if;
  if p_membro_id is not null and cardinality(v_campos)>0 then
    update public.equipe_membros set nome_completo=v_nome,cargo=v_cargo,profissao=v_profissao,telefone=v_telefone,email_contato=v_email,
      conselho_classe=v_conselho,registro_conselho=v_registro,conselho_uf=v_uf,especialidade_id=v_especialidade,
      cpf_encrypted=case when v_modo='substituir' and cpf_hash is distinct from public.cpf_hash(v_cpf) then public.cpf_encrypt(v_cpf)
        when v_modo='remover' then null else cpf_encrypted end,
      cpf_hash=case when v_modo='substituir' then public.cpf_hash(v_cpf) when v_modo='remover' then null else cpf_hash end,
      revisao=revisao+1,updated_at=now() where id=v_id;
    if v_prof is not null then
      update public.profissionais set nome_completo=v_nome,conselho_classe=v_conselho,registro_conselho=v_registro,
        conselho_uf=v_uf,especialidade_principal_id=v_especialidade,
        cpf_encrypted=case when v_modo='substituir' and cpf_hash is distinct from public.cpf_hash(v_cpf) then public.cpf_encrypt(v_cpf)
          when v_modo='remover' then null else cpf_encrypted end,
        cpf_hash=case when v_modo='substituir' then public.cpf_hash(v_cpf) when v_modo='remover' then null else cpf_hash end,
        updated_at=now() where id=v_prof;
    end if;
  end if;
  if p_membro_id is null then update public.equipe_idempotencia set membro_id=v_id where usuario_id=auth.uid() and chave=p_chave_idempotencia; end if;
  -- Não deixe o marcador interno vazar para outras operações na mesma transação.
  perform set_config('app.equipe_origem','',true);
  if cardinality(v_campos)>0 then
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois)
    values(p_clinica_contexto_id,auth.uid(),case when p_membro_id is null then 'INSERT' else 'UPDATE' end::public.acao_auditoria,
      'equipe_membros',v_id::text,jsonb_build_object('escopo','global','campos_alterados',to_jsonb(v_campos),'clinicas_adicionadas',to_jsonb(v_adicionadas)));
  end if;
  return v_id;
end $$;

revoke all on function public.equipe_validar_registro(uuid,text,text,text),
  public.equipe_sincronizar_profissional(),public.equipe_sincronizar_vinculo_profissional(),
  public.equipe_pode_editar_profissional_global(uuid),
  public.equipe_listar(uuid),public.equipe_detalhar(uuid,uuid),
  public.equipe_salvar(uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.equipe_listar(uuid),public.equipe_detalhar(uuid,uuid),
  public.equipe_salvar(uuid,uuid,integer,jsonb,uuid),
  public.equipe_pode_editar_profissional_global(uuid) to authenticated;
revoke all on public.equipe_membros,public.equipe_membros_clinicas,public.equipe_idempotencia from public,anon,authenticated;

commit;
~~~


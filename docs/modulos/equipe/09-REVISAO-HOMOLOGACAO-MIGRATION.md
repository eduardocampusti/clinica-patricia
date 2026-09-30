# Equipe — revisão e plano de homologação da migration

**Estado:** EM VALIDAÇÃO  
**Data:** 28/09/2026  
**Migration:** `supabase/migrations/20260928153000_equipe_cadastro_edicao.sql`  
**Aplicação no Supabase principal:** **NÃO REALIZADA**

## 1. Diagnóstico e evidência atual

### Implementado no código

- A aba “Equipe & acessos” lista os profissionais atuais mesmo antes da migration, por meio de leitura compatível das tabelas legadas.
- Busca, filtros, estados de carregamento/erro/vazio, ficha resumida e indicação “Com acesso/Sem acesso” estão implementados.
- Criação e edição compartilham o mesmo formulário e diferenciam função administrativa/apoio de profissional de saúde.
- A interface detecta a ausência da migration quando `equipe_listar` retorna função inexistente (`PGRST202`/`42883`). Nesse caso ativa `compatibilidade`, usa a lista legada e desabilita “Novo membro” e “Editar”.
- O aviso visível informa: “Atualização do banco pendente — A lista atual de profissionais continua disponível. O cadastro e a edição ampliados serão liberados após a migration segura de Equipe.”

### Testado com código/simulação

- Cinco testes unitários do formulário: obrigatórios gerais, CPF opcional/válido quando informado, apoio sem campos profissionais, cargo livre e exigências de profissional de saúde.
- Build TypeScript/Vite e lint do projeto.
- Suítes existentes de Pacientes e Financeiro foram executadas na entrega anterior e permaneceram aprovadas.
- Esses testes não executam PostgreSQL, RLS, Vault, Auth nem a transaction da RPC.

### Validado contra banco real

- **Nada desta migration foi validado ou aplicado contra banco real nesta etapa.**
- O Supabase principal não foi usado como substituto de homologação.

## 2. Ambiente isolado

Não foi encontrado PostgreSQL isolado utilizável neste Windows: `psql`, `pg_isready` e `postgres` não estão instalados no PATH, não há serviço PostgreSQL ou Supabase local e nenhuma das portas 5432/54320–54323 está em escuta. Docker não está disponível e, conforme a solicitação, não deve ser instalado. O WSL também não estava acessível para inventariar uma instância alternativa.

Conclusão: a migration não pôde ser aplicada nem homologada de forma segura. A alternativa concreta é fornecer uma instância PostgreSQL/Supabase descartável, diferente do projeto `xftnkusbyqzyvzrovroj`, com schema-base sanitizado, extensões/Vault e papéis Supabase compatíveis. A identificação do projeto/host deve ser confirmada antes de qualquer comando de escrita.

## 3. Problemas encontrados e corrigidos

1. **CPF tratado como obrigatório sem aprovação suficiente.** Corrigido para opcional até decisão funcional; se informado, é validado, criptografado e hasheado.
2. **Leitura direta de ciphertext/hash por autenticados.** Removido o `GRANT SELECT`; tabelas ficam sem acesso direto de cliente e são lidas somente pelas RPCs com campos permitidos.
3. **Todo profissional legado era classificado como médico.** A migração só usa “Médico(a)/Medicina” quando o conselho começa por CRM; demais registros permanecem como profissional de saúde sem inventar profissão.
4. **Autoria histórica desconhecida podia ser atribuída a usuário aleatório.** `created_by` passou a aceitar nulo no legado e preserva o valor original.
5. **CPF corrigido divergia entre Equipe e Profissionais.** A RPC agora atualiza os dois registros na mesma transaction.
6. **Ausência de controle de edição concorrente.** Adicionado `p_revisao_esperada`, bloqueio `FOR UPDATE` e erro `40001` quando a ficha mudou.
7. **Conversão perigosa entre apoio e profissional de saúde.** A RPC rejeita mudança de tipo que criaria/removeria implicitamente identidade profissional; isso exige fluxo específico futuro.
8. **E-mail globalmente único sem regra aprovada.** O índice passou a ser apenas de busca; duplicidade de e-mail pode ser investigada sem bloquear contatos compartilhados.
9. **Dependências implícitas.** Adicionado preflight transacional para tabelas e funções obrigatórias.
10. **SECURITY DEFINER e grants.** As três RPCs usam `search_path=''`, nomes qualificados, revogação de execução de `public`/`anon` e concessão somente a `authenticated`. Escrita exige usuário ativo e papel `proprietaria` em cada clínica de destino.

Referências consultadas: documentação oficial do Supabase sobre [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [funções de banco](https://supabase.com/docs/guides/database/functions). A documentação confirma que grants e policies são camadas distintas, que funções são executáveis por padrão e que `SECURITY DEFINER` precisa de `search_path` controlado.

## 4. Regra atual de CPF e origem

O pedido original disse “CPF conforme as regras aprovadas da equipe” e advertiu para não copiar automaticamente o CPF opcional de pacientes. Porém, não foi localizada decisão anterior que tornasse CPF obrigatório para toda a equipe. A obrigatoriedade registrada na primeira versão foi uma escolha de implementação indevidamente descrita como aprovada.

Regra revisada, mínima e compatível:

- CPF de equipe é **opcional enquanto a decisão funcional estiver pendente**.
- Quando informado, precisa ser válido, é armazenado somente como ciphertext/hash e é único no cadastro global de equipe.
- Profissionais legados sem CPF continuam preservados.
- A regra de CPF opcional dos pacientes não foi alterada.

Impacto da decisão futura: tornar obrigatório exigirá definir exceções/regularização do legado e não pode ser feito apenas adicionando `NOT NULL`.

## 5. Integridade, autorização e compatibilidade

- Funcionário administrativo/apoio cria somente `equipe_membros`; não cria `profissionais`, `usuarios` ou Auth.
- Profissional de saúde cria `profissionais` e `equipe_membros` na mesma chamada/transaction e replica vínculos em `profissionais_clinicas`, preservando Agenda e Financeiro.
- Profissionais existentes recebem uma identidade referencial em `equipe_membros`, sem duplicar `profissionais`.
- Uma pessoa possui um `equipe_membros.id`; a tabela de vínculos permite Brotas e Ipupiara. A RPC só adiciona/reativa vínculos selecionados e não remove vínculos omitidos, evitando perda a partir de visão parcial.
- `usuario_id` não é editável pela RPC; conceder login/papel permanece fora do escopo.
- Campos protegidos (`id`, `usuario_id`, `profissional_id`, `ativo`, `revisao`, `created_by`) são rejeitados no JSON.
- CPF não entra na auditoria. O evento guarda ator, alvo, clínica, nomes dos grupos de campos e IDs das clínicas, sem plaintext, ciphertext ou hash.
- Unicidade/constraints e a atomicidade da função evitam duplicidade por CPF/registro e gravação parcial. Clique duplicado ainda deve ser coberto por botão bloqueado; uma idempotency key de negócio poderá ser adicionada se a homologação indicar necessidade além das constraints.
- RLS permanece habilitada. Como o cliente não possui grants diretos nas tabelas, as RPCs SECURITY DEFINER são a única fronteira do frontend e repetem a autorização explicitamente.

## 6. Plano de aplicação e recuperação

### Objetos criados

- tipo `public.tipo_membro_equipe`;
- tabelas `public.equipe_membros` e `public.equipe_membros_clinicas`;
- índices de e-mail e registro profissional;
- duas policies de leitura defensiva;
- RPCs `equipe_listar`, `equipe_detalhar` e `equipe_salvar`.

Nenhuma coluna existente é alterada. Profissionais e vínculos existentes são copiados apenas como referências nas novas tabelas.

### Dependências e ordem

1. Backup lógico e snapshot verificável do ambiente-alvo.
2. Confirmar que o alvo é homologação isolada, nunca o projeto principal.
3. Confirmar schema-base, PostgreSQL 17, papéis `anon`/`authenticated`, Auth, Vault, funções de CPF e tabelas listadas no preflight.
4. Executar consultas prévias somente de leitura: contagens, CPFs duplicados/nulos, registros profissionais duplicados, vínculos órfãos, `created_by` inexistente, funções e grants atuais.
5. Aplicar a migration inteira em uma única transaction.
6. Confirmar objetos via `information_schema`, `pg_proc`, `pg_policies` e `has_*_privilege`; não usar apenas `schema_migrations`.
7. Executar `supabase/tools/verificar-integridade.sql` e testes autenticados com JWT sintético para proprietária, recepção, médico e usuário alheio.
8. Testar médico, recepcionista e apoio sem login, vínculo duplo, edição/reabertura, concorrência, duplicidades, auditoria e reconhecimento por Agenda/Financeiro.

### Recuperação

- Antes de uso funcional: rollback da transaction de aplicação.
- Após commit, mas antes de cadastros novos: migration compensatória que revoga RPCs, remove policies/tabelas e tipo, após conferir dependências.
- Após existir dado novo: não executar `DROP` automático. Bloquear mutações, exportar/reconciliar `equipe_membros`, preservar `profissionais` criados e preparar migration compensatória específica. Restaurar backup somente em incidente amplo e com janela controlada.

### Condição para liberar a interface

As gravações só podem ser liberadas quando `equipe_listar` existir e responder no contexto autenticado. Além dessa detecção técnica já implementada, a liberação operacional exige: migration aplicada no ambiente correto, catálogo confirmado, testes positivos/negativos aprovados e checkpoint atualizado. Até lá, `compatibilidade=true` mantém os botões desabilitados e o aviso visível.

## 7. Testes realmente executados

- `tsx --test src/lib/equipe.test.ts`: **5/5 aprovados**.
- `npm run build`: **aprovado**.
- `npm run lint`: **aprovado**, com aviso histórico em `ThemeProvider.tsx`.
- Inventário local de PostgreSQL: nenhum binário/serviço/porta disponível.
- Aplicação da migration, testes RLS/RPC, auditoria e persistência no PostgreSQL: **não executados**.

## 8. Pendências bloqueadoras

1. Disponibilizar ambiente Supabase/PostgreSQL descartável e inequivocamente separado do principal.
2. Aplicar e validar a migration nesse ambiente.
3. Executar negativas com o papel PostgreSQL `authenticated` e JWTs sintéticos; conexão administrativa sozinha não é evidência.
4. Confirmar proteção de CPF, auditoria, catálogo e integridade pós-migration.
5. Decidir funcionalmente se CPF será obrigatório para equipe e como tratar o legado.

## 9. Conteúdo integral da migration revisada

SHA-256 da migration revisada: `CCCDA14F71E2B29DFA435A7421BA81B7D0A4CFAC5A5C8D539E0BAE067E815EA3`.

```sql
-- ETAPA 1 — cadastro e edição de equipe.
-- Migration aditiva preparada para homologação; não aplicada automaticamente.
-- Reversão: remover RPCs/policies/tabelas equipe_* somente se não houver dados
-- novos dependentes; a migration não altera colunas das tabelas existentes.

begin;

do $$
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
end $$;

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
  revisao integer not null default 1,
  created_by uuid default auth.uid() references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipe_cpf_par check ((cpf_encrypted is null) = (cpf_hash is null)),
  constraint equipe_profissao_coerente check (tipo = 'profissional_saude' or profissao is null),
  constraint equipe_conselho_coerente check (
    (conselho_classe is null and registro_conselho is null and conselho_uf is null)
    or (conselho_classe is not null and registro_conselho is not null)
  )
);

create index equipe_email_contato_idx on public.equipe_membros (lower(email_contato)) where email_contato is not null;
create unique index equipe_registro_unico on public.equipe_membros (upper(conselho_classe), upper(registro_conselho), conselho_uf)
  where conselho_classe is not null;

create table public.equipe_membros_clinicas (
  membro_id uuid not null references public.equipe_membros(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  ativo boolean not null default true,
  created_by uuid default auth.uid() references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (membro_id, clinica_id)
);

insert into public.equipe_membros (
  profissional_id,nome_completo,cargo,tipo,profissao,cpf_encrypted,cpf_hash,
  conselho_classe,registro_conselho,especialidade_id,usuario_id,created_by,created_at,updated_at
)
select p.id,p.nome_completo,
       case when upper(coalesce(p.conselho_classe,'')) like 'CRM%' then 'Médico(a)' else 'Profissional de saúde' end,
       'profissional_saude',
       case when upper(coalesce(p.conselho_classe,'')) like 'CRM%' then 'Medicina' else null end,
       p.cpf_encrypted,p.cpf_hash,
       p.conselho_classe,p.registro_conselho,p.especialidade_principal_id,p.usuario_id,
       p.created_by,p.created_at,p.updated_at
from public.profissionais p
on conflict (profissional_id) do nothing;

insert into public.equipe_membros_clinicas (membro_id,clinica_id,ativo,created_by,created_at,updated_at)
select em.id,pc.clinica_id,pc.ativo,coalesce(pc.created_by,em.created_by),pc.created_at,pc.updated_at
from public.equipe_membros em join public.profissionais_clinicas pc on pc.profissional_id=em.profissional_id
on conflict (membro_id,clinica_id) do nothing;

alter table public.equipe_membros enable row level security;
alter table public.equipe_membros_clinicas enable row level security;

create policy equipe_membros_select on public.equipe_membros for select to authenticated using (
  exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=id and ec.ativo
    and ec.clinica_id in (select public.clinicas_do_usuario()))
);
create policy equipe_clinicas_select on public.equipe_membros_clinicas for select to authenticated using (
  clinica_id in (select public.clinicas_do_usuario())
);

create or replace function public.equipe_listar(p_clinica_contexto_id uuid)
returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios_clinicas uc where uc.usuario_id=auth.uid()
    and uc.clinica_id=p_clinica_contexto_id and uc.ativo) then raise exception 'Acesso negado' using errcode='42501'; end if;
  return query
  select jsonb_build_object(
    'id',m.id,'nome_completo',m.nome_completo,'cargo',m.cargo,'tipo',m.tipo,
    'profissao',m.profissao,'telefone',m.telefone,'email_contato',m.email_contato,
    'conselho_classe',m.conselho_classe,'registro_conselho',m.registro_conselho,'conselho_uf',m.conselho_uf,
    'especialidade_id',m.especialidade_id,'especialidade_nome',e.nome,'possui_acesso',m.usuario_id is not null,
    'revisao',m.revisao,'clinicas',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'nome',c.nome) order by c.nome)
      from public.equipe_membros_clinicas ec join public.clinicas c on c.id=ec.clinica_id
      join public.usuarios_clinicas uc on uc.clinica_id=c.id and uc.usuario_id=auth.uid() and uc.ativo
      where ec.membro_id=m.id and ec.ativo),'[]'::jsonb))
  from public.equipe_membros m
  left join public.especialidades e on e.id=m.especialidade_id
  where m.ativo and exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=m.id
    and ec.clinica_id=p_clinica_contexto_id and ec.ativo)
  order by m.nome_completo;
end $$;

create or replace function public.equipe_detalhar(p_membro_id uuid,p_clinica_contexto_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r jsonb; v_cpf text;
begin
  if not public.eh_proprietaria(p_clinica_contexto_id) or not exists(select 1 from public.equipe_membros_clinicas
    where membro_id=p_membro_id and clinica_id=p_clinica_contexto_id and ativo) then raise exception 'Acesso negado' using errcode='42501'; end if;
  select case when m.cpf_encrypted is null then null else public.cpf_decrypt(m.cpf_encrypted) end into v_cpf from public.equipe_membros m where m.id=p_membro_id;
  select x || jsonb_build_object('cpf',v_cpf,'cpf_situacao',case when v_cpf is null then 'ausente' else 'informado' end)
    into r from public.equipe_listar(p_clinica_contexto_id) x where x->>'id'=p_membro_id::text;
  return r;
end $$;

create or replace function public.equipe_salvar(p_membro_id uuid,p_clinica_contexto_id uuid,p_revisao_esperada integer,p_dados jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=p_membro_id; v_prof uuid; v_cpf text; v_clinica uuid; v_existente public.equipe_membros%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
     or not public.eh_proprietaria(p_clinica_contexto_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_dados ?| array['id','usuario_id','profissional_id','ativo','revisao','created_by'] then raise exception 'Campo não editável' using errcode='22023'; end if;
  if nullif(btrim(p_dados->>'nome_completo'),'') is null or nullif(btrim(p_dados->>'cargo'),'') is null
     or p_dados->>'tipo' not in ('profissional_saude','administrativo','apoio','outro') then
    raise exception 'Dados cadastrais obrigatórios inválidos' using errcode='22023';
  end if;
  if p_dados->>'tipo'='profissional_saude' and nullif(btrim(p_dados->>'profissao'),'') is null then
    raise exception 'Profissão obrigatória para profissional de saúde' using errcode='22023';
  end if;
  v_cpf:=regexp_replace(coalesce(p_dados->>'cpf',''),'[^0-9]','','g');
  if v_cpf<>'' and (length(v_cpf)<>11 or not public.pacientes_cpf_valido(v_cpf)) then raise exception 'CPF inválido' using errcode='22023'; end if;
  if jsonb_array_length(coalesce(p_dados->'clinicas_ids','[]'))=0 then raise exception 'Selecione uma clínica' using errcode='22023'; end if;
  for v_clinica in select jsonb_array_elements_text(p_dados->'clinicas_ids')::uuid loop
    if not public.eh_proprietaria(v_clinica) then raise exception 'Sem autorização para uma das clínicas' using errcode='42501'; end if;
  end loop;

  if p_membro_id is null then
    if p_dados->>'tipo'='profissional_saude' then
      insert into public.profissionais(nome_completo,cpf_encrypted,cpf_hash,conselho_classe,registro_conselho,especialidade_principal_id,created_by)
      values(p_dados->>'nome_completo',case when v_cpf='' then null else public.cpf_encrypt(v_cpf) end,
        case when v_cpf='' then null else public.cpf_hash(v_cpf) end,p_dados->>'conselho_classe',p_dados->>'registro_conselho',(p_dados->>'especialidade_id')::uuid,auth.uid()) returning id into v_prof;
    end if;
    insert into public.equipe_membros(profissional_id,nome_completo,cargo,tipo,profissao,cpf_encrypted,cpf_hash,telefone,email_contato,
      conselho_classe,registro_conselho,conselho_uf,especialidade_id,created_by)
    values(v_prof,p_dados->>'nome_completo',p_dados->>'cargo',(p_dados->>'tipo')::public.tipo_membro_equipe,p_dados->>'profissao',
      case when v_cpf='' then null else public.cpf_encrypt(v_cpf) end,case when v_cpf='' then null else public.cpf_hash(v_cpf) end,
      p_dados->>'telefone',lower(p_dados->>'email_contato'),p_dados->>'conselho_classe',
      p_dados->>'registro_conselho',upper(p_dados->>'conselho_uf'),(p_dados->>'especialidade_id')::uuid,auth.uid()) returning id into v_id;
  else
    select * into v_existente from public.equipe_membros where id=p_membro_id for update;
    if not found or not exists(select 1 from public.equipe_membros_clinicas where membro_id=v_id and clinica_id=p_clinica_contexto_id and ativo)
      then raise exception 'Cadastro não encontrado' using errcode='P0002'; end if;
    if p_revisao_esperada is null or v_existente.revisao<>p_revisao_esperada then
      raise exception 'Cadastro alterado por outra sessão; recarregue antes de salvar' using errcode='40001';
    end if;
    if (v_existente.profissional_id is null) <> (p_dados->>'tipo'<>'profissional_saude')
       or v_existente.tipo::text<>p_dados->>'tipo' then
      raise exception 'A alteração do tipo funcional exige fluxo específico' using errcode='22023';
    end if;
    update public.equipe_membros set nome_completo=p_dados->>'nome_completo',cargo=p_dados->>'cargo',tipo=(p_dados->>'tipo')::public.tipo_membro_equipe,
      profissao=p_dados->>'profissao',telefone=p_dados->>'telefone',email_contato=lower(p_dados->>'email_contato'),conselho_classe=p_dados->>'conselho_classe',
      registro_conselho=p_dados->>'registro_conselho',conselho_uf=upper(p_dados->>'conselho_uf'),especialidade_id=(p_dados->>'especialidade_id')::uuid,
      cpf_encrypted=case when p_dados->>'cpf_modo'='substituir' then public.cpf_encrypt(v_cpf) when p_dados->>'cpf_modo'='remover' then null else cpf_encrypted end,
      cpf_hash=case when p_dados->>'cpf_modo'='substituir' then public.cpf_hash(v_cpf) when p_dados->>'cpf_modo'='remover' then null else cpf_hash end,
      revisao=revisao+1,updated_at=now() where id=v_id;
    v_prof:=v_existente.profissional_id;
    if v_prof is not null then update public.profissionais set nome_completo=p_dados->>'nome_completo',conselho_classe=p_dados->>'conselho_classe',
      registro_conselho=p_dados->>'registro_conselho',especialidade_principal_id=(p_dados->>'especialidade_id')::uuid,
      cpf_encrypted=case when p_dados->>'cpf_modo'='substituir' then public.cpf_encrypt(v_cpf) when p_dados->>'cpf_modo'='remover' then null else cpf_encrypted end,
      cpf_hash=case when p_dados->>'cpf_modo'='substituir' then public.cpf_hash(v_cpf) when p_dados->>'cpf_modo'='remover' then null else cpf_hash end,
      updated_at=now() where id=v_prof; end if;
  end if;

  for v_clinica in select jsonb_array_elements_text(p_dados->'clinicas_ids')::uuid loop
    insert into public.equipe_membros_clinicas(membro_id,clinica_id,created_by) values(v_id,v_clinica,auth.uid())
      on conflict(membro_id,clinica_id) do update set ativo=true,updated_at=now();
    if v_prof is not null then insert into public.profissionais_clinicas(profissional_id,clinica_id,created_by) values(v_prof,v_clinica,auth.uid())
      on conflict(profissional_id,clinica_id) do update set ativo=true,updated_at=now(); end if;
  end loop;
  insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois)
    values(p_clinica_contexto_id,auth.uid(),case when p_membro_id is null then 'INSERT' else 'UPDATE' end::public.acao_auditoria,
      'equipe_membros',v_id::text,jsonb_build_object('campos',array['nome','cargo','tipo','contato','registro','clinicas'],'clinicas_ids',p_dados->'clinicas_ids'));
  return v_id;
end $$;

revoke all on function public.equipe_listar(uuid), public.equipe_detalhar(uuid,uuid), public.equipe_salvar(uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.equipe_listar(uuid), public.equipe_detalhar(uuid,uuid), public.equipe_salvar(uuid,uuid,integer,jsonb) to authenticated;
revoke all on public.equipe_membros,public.equipe_membros_clinicas from public,anon,authenticated;

commit;
```

-- ============================================================
-- Módulo: Cadastros Estruturais
-- Especialidades (catálogo comum) + Profissionais (pessoa, existe 1x,
-- pode não ter login ainda) + profissionais_clinicas (vínculo N:N,
-- mesmo padrão de usuarios_clinicas) + Serviços (POR clínica, com preço
-- e duração).
--
-- Projeto Supabase alvo: xftnkusbyqzyvzrovroj (Clínica Patrícia).
-- CONFIRME o project ref antes de rodar (ver 00-BANCO-DE-DADOS-OFICIAL.md).
-- Rodar inteiro de uma vez no SQL Editor (é uma transação só: begin/commit).
-- ============================================================

begin;

-- ============================================================
-- 1) TABELAS
-- ============================================================

create table public.especialidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_by uuid references public.usuarios(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  cpf_encrypted bytea,
  cpf_hash text,
  conselho_classe text,
  registro_conselho text,
  especialidade_principal_id uuid references public.especialidades(id),
  usuario_id uuid references public.usuarios(id) on delete set null,
  ativo boolean not null default true,
  created_by uuid references public.usuarios(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profissionais_conselho_unico unique (conselho_classe, registro_conselho)
);

-- Unicidade global de CPF (uma pessoa = um profissional no sistema todo),
-- mas permitindo múltiplos NULL (CPF ainda é opcional no cadastro).
create unique index profissionais_cpf_hash_key
  on public.profissionais (cpf_hash)
  where cpf_hash is not null;

create table public.profissionais_clinicas (
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  ativo boolean not null default true,
  created_by uuid references public.usuarios(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profissional_id, clinica_id)
);

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  nome text not null,
  especialidade_id uuid not null references public.especialidades(id),
  duracao_minutos integer not null check (duracao_minutos > 0),
  preco numeric(10,2) not null check (preco >= 0),
  ativo boolean not null default true,
  created_by uuid references public.usuarios(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2) FUNÇÕES AUXILIARES DE RLS
-- ============================================================

-- true se o usuário logado é proprietária em pelo menos UMA clínica.
-- Usada em especialidades, que é catálogo comum (sem clinica_id).
create or replace function public.eh_proprietaria_alguma()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.usuarios_clinicas
    where usuario_id = auth.uid()
      and papel = 'proprietaria'
      and ativo
  );
$$;

-- true se o usuário logado é proprietária de alguma clínica onde este
-- profissional atende. Usada no UPDATE de profissionais (que não tem
-- clinica_id direto).
create or replace function public.eh_proprietaria_de_profissional(p_profissional_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.profissionais_clinicas pc
    where pc.profissional_id = p_profissional_id
      and public.eh_proprietaria(pc.clinica_id)
  );
$$;

-- ============================================================
-- 3) RPC: cadastrar_profissional
-- Cria o profissional + primeiro vínculo de clínica na MESMA transação
-- (a função inteira é uma transação: se o vínculo falhar, o profissional
-- também não fica gravado). Só quem é proprietária da clínica alvo pode
-- chamar — validado dentro da função, não só na tela.
-- ============================================================

create or replace function public.cadastrar_profissional(
  p_nome_completo text,
  p_cpf text,
  p_conselho_classe text,
  p_registro_conselho text,
  p_especialidade_principal_id uuid,
  p_clinica_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_profissional_id uuid;
  v_cpf_encrypted bytea;
  v_cpf_hash text;
begin
  if not public.eh_proprietaria(p_clinica_id) then
    raise exception 'Sem permissão para cadastrar profissional nesta clínica';
  end if;

  if p_cpf is not null and length(trim(p_cpf)) > 0 then
    v_cpf_encrypted := public.cpf_encrypt(p_cpf);
    v_cpf_hash := public.cpf_hash(p_cpf);
  end if;

  insert into public.profissionais (
    nome_completo, cpf_encrypted, cpf_hash,
    conselho_classe, registro_conselho, especialidade_principal_id, created_by
  ) values (
    p_nome_completo, v_cpf_encrypted, v_cpf_hash,
    p_conselho_classe, p_registro_conselho, p_especialidade_principal_id, auth.uid()
  )
  returning id into v_profissional_id;

  insert into public.profissionais_clinicas (profissional_id, clinica_id, created_by)
  values (v_profissional_id, p_clinica_id, auth.uid());

  return v_profissional_id;
end;
$$;

grant execute on function public.cadastrar_profissional(text, text, text, text, uuid, uuid) to authenticated;

-- ============================================================
-- 4) RLS
-- ============================================================

alter table public.especialidades enable row level security;
alter table public.profissionais enable row level security;
alter table public.profissionais_clinicas enable row level security;
alter table public.servicos enable row level security;

-- especialidades: catálogo comum, leitura livre para autenticados;
-- escrita só para proprietária (de qualquer clínica).
create policy especialidades_select on public.especialidades
  for select to authenticated
  using (true);

create policy especialidades_insert on public.especialidades
  for insert to authenticated
  with check (public.eh_proprietaria_alguma());

create policy especialidades_update on public.especialidades
  for update to authenticated
  using (public.eh_proprietaria_alguma())
  with check (public.eh_proprietaria_alguma());

-- profissionais: visível só se houver vínculo com uma clínica do usuário.
-- Sem policy de INSERT: criação só via RPC cadastrar_profissional
-- (SECURITY DEFINER, não depende de GRANT/RLS do chamador).
create policy profissionais_select on public.profissionais
  for select to authenticated
  using (
    exists (
      select 1 from public.profissionais_clinicas pc
      where pc.profissional_id = profissionais.id
        and pc.clinica_id in (select public.clinicas_do_usuario())
    )
  );

create policy profissionais_update on public.profissionais
  for update to authenticated
  using (public.eh_proprietaria_de_profissional(id))
  with check (public.eh_proprietaria_de_profissional(id));

-- profissionais_clinicas: vínculo N:N.
create policy profissionais_clinicas_select on public.profissionais_clinicas
  for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario()));

create policy profissionais_clinicas_insert on public.profissionais_clinicas
  for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria(clinica_id)
  );

create policy profissionais_clinicas_update on public.profissionais_clinicas
  for update to authenticated
  using (public.eh_proprietaria(clinica_id))
  with check (public.eh_proprietaria(clinica_id));

-- servicos: mesmo padrão de pacientes (vínculo + trava por clínica
-- ativa), mas escrita restrita à proprietária.
create policy servicos_select on public.servicos
  for select to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
  );

create policy servicos_insert on public.servicos
  for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and public.eh_proprietaria(clinica_id)
  );

create policy servicos_update on public.servicos
  for update to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and public.eh_proprietaria(clinica_id)
  )
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and public.eh_proprietaria(clinica_id)
  );

-- ============================================================
-- 5) GRANTS (a RLS acima restringe as LINHAS; os grants liberam a
-- OPERAÇÃO em si para o papel authenticated)
-- ============================================================

grant select, insert, update on public.especialidades to authenticated;
grant select, update on public.profissionais to authenticated; -- sem insert: só via RPC
grant select, insert, update on public.profissionais_clinicas to authenticated;
grant select, insert, update on public.servicos to authenticated;

-- ============================================================
-- 6) AUDITORIA (mesmo padrão das 4 tabelas existentes)
-- ============================================================

create trigger trg_audit_especialidades
  after insert or update or delete on public.especialidades
  for each row execute function public.fn_auditoria();

create trigger trg_audit_profissionais
  after insert or update or delete on public.profissionais
  for each row execute function public.fn_auditoria();

create trigger trg_audit_profissionais_clinicas
  after insert or update or delete on public.profissionais_clinicas
  for each row execute function public.fn_auditoria();

create trigger trg_audit_servicos
  after insert or update or delete on public.servicos
  for each row execute function public.fn_auditoria();

commit;

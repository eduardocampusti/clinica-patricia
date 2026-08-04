-- ============================================================
-- AGENDA — lista de espera (complemento, sessão 04/08/2026)
-- Decisão: Eduardo quer a funcionalidade real já nesta etapa, não só
-- visual. Mesma disciplina de agendamentos: vinculado a um profissional
-- específico (não "qualquer um da especialidade").
-- ============================================================

begin;

create type public.status_lista_espera as enum (
  'aguardando', 'contatado', 'agendado', 'desistiu'
);

create table public.lista_espera (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  paciente_id uuid not null references public.pacientes(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  observacoes text,
  status public.status_lista_espera not null default 'aguardando',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Impede o mesmo paciente entrar 2x na fila do mesmo profissional
-- enquanto ainda está "aguardando" — mesmo princípio do índice único
-- que já impede abrir 2 sessões de caixa ao mesmo tempo.
create unique index lista_espera_sem_duplicata
  on public.lista_espera (paciente_id, profissional_id)
  where (status = 'aguardando');

alter table public.lista_espera enable row level security;

-- proprietária/recepção veem tudo da clínica; médico só a própria fila
create policy lista_espera_select on public.lista_espera
  for select to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and (
      public.eh_proprietaria_ou_recepcao(clinica_id)
      or profissional_id in (
        select id from public.profissionais where usuario_id = auth.uid()
      )
    )
  );

-- só proprietária/recepção criam ou editam (mesma regra de agendamentos)
-- trava dupla: paciente e profissional da mesma clínica da entrada
create policy lista_espera_insert on public.lista_espera
  for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
    and exists (
      select 1 from public.pacientes p
      where p.id = lista_espera.paciente_id and p.clinica_id = lista_espera.clinica_id
    )
    and exists (
      select 1 from public.profissionais_clinicas pc
      where pc.profissional_id = lista_espera.profissional_id
        and pc.clinica_id = lista_espera.clinica_id
        and pc.ativo
    )
  );

create policy lista_espera_update on public.lista_espera
  for update to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

create policy lista_espera_delete on public.lista_espera
  for delete to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

commit;

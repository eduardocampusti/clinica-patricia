-- RASCUNHO: correções U-07, U-12, R-12 e R-13.
-- Pré-requisitos: baseline equivalente, Vault e pgcrypto disponíveis.

begin;

do $$
begin
  if to_regprocedure('public.clinicas_do_usuario()') is null
     or to_regclass('public.usuarios_clinicas') is null
     or to_regclass('vault.decrypted_secrets') is null
     or to_regprocedure('extensions.hmac(text,text,text)') is null
     or to_regprocedure('extensions.pgp_sym_encrypt(text,text)') is null then
    raise exception 'Hardening geral requer a baseline, Vault e pgcrypto em extensions.';
  end if;
end;
$$;

-- R-12: segredo ausente não pode resultar silenciosamente em NULL.
create or replace function public.cpf_encrypt(p_cpf text)
returns bytea
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  v_key text;
begin
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'cpf_key';

  if nullif(v_key, '') is null then
    raise exception 'Segredo cpf_key indisponível.' using errcode = '22023';
  end if;

  return extensions.pgp_sym_encrypt(
    regexp_replace(p_cpf, '[^0-9]', '', 'g'), v_key
  );
end;
$$;

-- As RPCs de CPF são chamadas pelo frontend autenticado e por rotinas de
-- backend. anon e PUBLIC não podem invocar funções SECURITY DEFINER.
revoke all on function public.cpf_encrypt(text) from public, anon;
revoke all on function public.cpf_decrypt(bytea) from public, anon;
revoke all on function public.cpf_hash(text) from public, anon;
grant execute on function public.cpf_encrypt(text) to authenticated, service_role;
grant execute on function public.cpf_decrypt(bytea) to authenticated, service_role;
grant execute on function public.cpf_hash(text) to authenticated, service_role;

-- U-12: SECURITY DEFINER, proprietário da tabela, evita que a subconsulta da
-- policy seja escondida pela RLS de usuarios_clinicas.
create or replace function public.usuario_tem_vinculo_ativo()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.usuarios_clinicas uc
    where uc.usuario_id = auth.uid() and uc.ativo
  )
$$;

revoke all on function public.usuario_tem_vinculo_ativo() from public, anon;
grant execute on function public.usuario_tem_vinculo_ativo() to authenticated;

-- R-13: pepper ausente não pode produzir hash NULL sem erro.
create or replace function public.cpf_hash(p_cpf text)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_pepper text;
begin
  select decrypted_secret into v_pepper
  from vault.decrypted_secrets
  where name = 'cpf_pepper';

  if nullif(v_pepper, '') is null then
    raise exception 'Segredo cpf_pepper indisponível.' using errcode = '22023';
  end if;

  return encode(
    extensions.hmac(regexp_replace(p_cpf, '[^0-9]', '', 'g'), v_pepper, 'sha256'),
    'hex'
  );
end;
$$;

-- U-07: UPDATE deve validar os mesmos vínculos do INSERT.
alter policy agendamentos_update on public.agendamentos
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  )
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
    and exists (
      select 1 from public.pacientes p
      where p.id = agendamentos.paciente_id
        and p.clinica_id = agendamentos.clinica_id
    )
    and exists (
      select 1 from public.profissionais_clinicas pc
      where pc.profissional_id = agendamentos.profissional_id
        and pc.clinica_id = agendamentos.clinica_id
        and pc.ativo
    )
  );

-- U-12: um usuário só altera o próprio perfil enquanto possuir vínculo ativo.
alter policy usuarios_self_update on public.usuarios
  using (
    id = auth.uid()
    and public.usuario_tem_vinculo_ativo()
  )
  with check (
    id = auth.uid()
    and public.usuario_tem_vinculo_ativo()
  );

commit;

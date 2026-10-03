-- RASCUNHO DE ROLLBACK OPERACIONAL, FORA DO HISTÓRICO DE MIGRATIONS.
-- Reverte somente 05_prontuario_rpc.sql; não reverte U-07, U-12, R-12 ou R-13.
-- Executar exclusivamente em janela aprovada, com backup e validação do frontend.
-- Os GRANTs abaixo reproduzem o estado legado da baseline de 2026-09-14.

begin;

-- Falha cedo se a fronteira RPC esperada não estiver instalada.
do $$
declare v_superuser boolean;
begin
  select rolsuper into v_superuser from pg_roles where rolname = current_user;
  if not coalesce(v_superuser, false)
     and not pg_has_role(current_user, 'postgres', 'member') then
    raise exception 'Rollback exige executor superusuário ou membro de postgres.';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'abrir_prontuario'
  ) then
    raise exception 'Rollback abortado: a fronteira RPC do Prontuário não foi encontrada.';
  end if;
  raise warning 'Este rollback restaura a policy legada atendimentos_select e reabre temporariamente o vazamento S-17.';
end;
$$;

-- Restaura as policies diretas exatamente como estavam na baseline candidata.
drop policy atendimentos_select on public.atendimentos;
drop policy atendimentos_insert on public.atendimentos;
drop policy atendimentos_update on public.atendimentos;
drop policy adendos_select on public.atendimentos_adendos;
drop policy adendos_insert on public.atendimentos_adendos;
drop policy documentos_select on public.documentos_clinicos;
drop policy documentos_insert on public.documentos_clinicos;
drop policy auditoria_leitura_select on public.auditoria_leitura_clinica;

create policy atendimentos_select on public.atendimentos for select to authenticated
  using (profissional_id in (select id from public.profissionais where usuario_id = auth.uid()));
create policy atendimentos_insert on public.atendimentos for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and profissional_id in (select id from public.profissionais where usuario_id = auth.uid())
    and exists (select 1 from public.pacientes p where p.id = atendimentos.paciente_id and p.clinica_id = atendimentos.clinica_id)
  );
create policy atendimentos_update on public.atendimentos for update to authenticated
  using (profissional_id in (select id from public.profissionais where usuario_id = auth.uid()));
create policy adendos_select on public.atendimentos_adendos for select to authenticated
  using (atendimento_id in (select a.id from public.atendimentos a where a.profissional_id in (select id from public.profissionais where usuario_id = auth.uid())));
create policy adendos_insert on public.atendimentos_adendos for insert to authenticated
  with check (atendimento_id in (select a.id from public.atendimentos a where a.profissional_id in (select id from public.profissionais where usuario_id = auth.uid()) and a.status = 'finalizado'::public.status_atendimento));
create policy documentos_select on public.documentos_clinicos for select to authenticated
  using (atendimento_id in (select a.id from public.atendimentos a where a.profissional_id in (select id from public.profissionais where usuario_id = auth.uid())));
create policy documentos_insert on public.documentos_clinicos for insert to authenticated
  with check (atendimento_id in (select a.id from public.atendimentos a where a.profissional_id in (select id from public.profissionais where usuario_id = auth.uid())));
create policy auditoria_leitura_select on public.auditoria_leitura_clinica for select to authenticated
  using (exists (select 1 from public.atendimentos a where a.id = auditoria_leitura_clinica.atendimento_id and public.eh_proprietaria(a.clinica_id)));

-- Restaura as ACLs legadas de tabela e das duas RPCs históricas.
grant all on table public.atendimentos, public.atendimentos_adendos,
  public.documentos_clinicos, public.auditoria_leitura_clinica
  to anon, authenticated, service_role;
grant all on function public.abrir_atendimento(uuid),
  public.finalizar_atendimento(uuid)
  to anon, authenticated, service_role;
grant execute on function public.abrir_atendimento(uuid),
  public.finalizar_atendimento(uuid)
  to public;
alter function public.abrir_atendimento(uuid) reset search_path;
alter function public.finalizar_atendimento(uuid) reset search_path;

-- Remove a superfície RPC nova. RESTRICT faz o rollback falhar se algo novo
-- depender dela, em vez de apagar dependências de forma implícita.
drop function public.criar_documento_prontuario(uuid, public.tipo_documento_clinico, text) restrict;
drop function public.adicionar_adendo_prontuario(uuid, text) restrict;
drop function public.finalizar_atendimento_seguro(uuid, text, text, text, text, text, text, text) restrict;
drop function public.salvar_rascunho_atendimento(uuid, text, text, text, text, text, text, text) restrict;
drop function public.iniciar_atendimento_agendado(uuid, uuid) restrict;
drop function public.iniciar_atendimento_avulso(uuid, uuid) restrict;
drop function public.abrir_prontuario(uuid) restrict;
drop function public.listar_atendimentos_prontuario(uuid) restrict;
drop function public.pode_ler_auditoria_atendimento(uuid) restrict;

drop trigger trg_validar_integridade_atendimento on public.atendimentos;
drop function public.validar_integridade_atendimento() restrict;
alter table public.documentos_clinicos
  drop constraint documentos_clinicos_conteudo_nao_vazio;
alter table public.atendimentos_adendos
  drop constraint atendimentos_adendos_texto_nao_vazio;
alter table public.atendimentos
  drop constraint atendimentos_finalizacao_coerente;
drop index public.auditoria_leitura_atendimento_lido_idx;
drop index public.documentos_clinicos_atendimento_created_idx;
drop index public.atendimentos_adendos_atendimento_created_idx;
drop index public.atendimentos_profissional_clinica_created_idx;
drop index public.atendimentos_agendamento_id_unique;

commit;

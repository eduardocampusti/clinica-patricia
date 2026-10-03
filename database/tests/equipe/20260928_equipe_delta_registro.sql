\set ON_ERROR_STOP on
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
revoke all on function public.equipe_validar_registro(uuid,text,text,text) from public,anon,authenticated;
do $$
declare bloqueou boolean:=false;
begin
  begin perform public.equipe_validar_registro(null,'CRM',null,null);
  exception when invalid_parameter_value then bloqueou:=true; end;
  if not bloqueou then raise exception 'Falha: conselho sem registro foi aceito'; end if;
end $$;

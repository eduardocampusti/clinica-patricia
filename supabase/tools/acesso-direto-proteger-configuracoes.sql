-- PROPOSTA NÃO APLICADA. Somente DEPOIS da aplicação de Configurações sob
-- autorização própria; não cria seus objetos nem habilita qualquer recurso.
-- Cobertura adicional exata: seis tabelas e duas RPCs autenticadas.
begin;
do $$ declare nome text; f record; fonte text; corpo text; delimitador text; novo text; begin
 if to_regclass('acesso_direto.rpc_inventario') is null then raise exception 'Aplicar primeiro as duas propostas de acesso direto autorizadas.'; end if;
 foreach nome in array array['configuracoes_globais_autorizacoes','configuracoes_escopos','configuracoes_versoes','configuracoes_ativos','configuracoes_publicas','configuracoes_homologacao_contextos'] loop
  if not exists(select 1 from pg_class where oid=to_regclass('public.'||nome) and relkind='r' and relrowsecurity) then raise exception 'Objeto de Configurações ausente/sem RLS: %',nome; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename=nome and policyname='acesso_direto_bloqueio') then
   execute format('create policy acesso_direto_bloqueio on public.%I as restrictive for all to authenticated using((select public.acesso_direto_sessao_permitida())) with check((select public.acesso_direto_sessao_permitida()))',nome);
  end if;
 end loop;
 foreach nome in array array['public.configuracoes_timbrado_consultar(uuid)','public.configuracoes_ativo_leitura_autorizada(text)'] loop
  select p.*,l.lanname into strict f from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=to_regprocedure(nome);
  if not has_function_privilege('authenticated',f.oid,'EXECUTE') or f.lanname not in ('sql','plpgsql') or f.prosqlbody is not null or not f.prosecdef then raise exception 'Contrato da RPC alterado: %',nome; end if;
  if strpos(f.prosrc,'acesso_direto:gate')>0 then continue; end if;
  fonte:=pg_get_functiondef(f.oid); delimitador:=substring(fonte from 'AS (\$[^$]*\$)');
  if delimitador is null or strpos(fonte,delimitador||f.prosrc||delimitador)=0 then raise exception 'Corpo não reconhecido: %',nome; end if;
  corpo:=regexp_replace(f.prosrc,'[[:space:]]+$',''); if right(corpo,1)<>';' then corpo:=corpo||';'; end if;
  if f.lanname='plpgsql' then novo:=E'/* acesso_direto:gate */\nBEGIN\nPERFORM public.acesso_direto_exigir_sessao();\n'||corpo||E'\nEND;';
  else novo:=E'/* acesso_direto:gate */\nSELECT public.acesso_direto_exigir_sessao();\n'||corpo; end if;
  insert into acesso_direto.rpc_inventario values(f.oid::regprocedure::text,fonte,replace(fonte,delimitador||f.prosrc||delimitador,delimitador||novo||delimitador));
  execute replace(fonte,delimitador||f.prosrc||delimitador,delimitador||novo||delimitador);
 end loop;
end $$;
-- Storage continua com a política restritiva já aplicada em storage.objects.
-- A Edge privada de Configurações conserva a guarda; a projeção pública é pública.
commit;

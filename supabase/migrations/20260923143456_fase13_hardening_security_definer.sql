-- FASE 13: hardening aditivo e restrito aos SECURITY DEFINER históricos
-- efetivamente expostos. Não altera contratos de negócio nem policies.

alter function public.cadastrar_profissional(
  text, text, text, text, uuid, uuid, numeric, numeric, integer
) set search_path = pg_catalog, public;

alter function public.eh_proprietaria_alguma()
  set search_path = pg_catalog, public;

alter function public.eh_proprietaria_de_profissional(uuid)
  set search_path = pg_catalog, public;

alter function public.eh_proprietaria_ou_recepcao(uuid)
  set search_path = pg_catalog, public;

-- Cadastro é uma ação autenticada e a própria função continua validando o
-- papel de proprietária. A retirada de PUBLIC/anon elimina a superfície
-- anônima sem ampliar nenhum papel.
revoke execute on function public.cadastrar_profissional(
  text, text, text, text, uuid, uuid, numeric, numeric, integer
) from public, anon;
grant execute on function public.cadastrar_profissional(
  text, text, text, text, uuid, uuid, numeric, numeric, integer
) to authenticated;

-- Função de trigger: clientes nunca precisam invocá-la diretamente.
revoke execute on function public.fn_auditoria()
  from public, anon, authenticated;

do $$
declare
  v_cadastrar regprocedure := 'public.cadastrar_profissional(text,text,text,text,uuid,uuid,numeric,numeric,integer)'::regprocedure;
  v_auditoria regprocedure := 'public.fn_auditoria()'::regprocedure;
begin
  if has_function_privilege('anon', v_cadastrar, 'execute')
     or not has_function_privilege('authenticated', v_cadastrar, 'execute') then
    raise exception 'Hardening de cadastrar_profissional não foi aplicado.';
  end if;

  if has_function_privilege('anon', v_auditoria, 'execute')
     or has_function_privilege('authenticated', v_auditoria, 'execute') then
    raise exception 'fn_auditoria continua executável por cliente.';
  end if;
end;
$$;

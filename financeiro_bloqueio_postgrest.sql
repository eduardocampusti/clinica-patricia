-- ============================================================================
-- Financeiro — corte definitivo do PostgREST mutável (NÃO EXECUTADO)
--
-- APLICAR SOMENTE após Fastify + frontend novos passarem em LOCAL/STAGING.
-- Esta migration é deliberadamente separada para permitir implantação sem
-- interrupção. Não expõe financeiro_privado pelo Data API.
-- ============================================================================

begin;

do $preflight$
begin
  if to_regnamespace('financeiro_privado') is null
     or to_regprocedure('financeiro_privado.abrir_caixa(text,text)') is null
     or to_regprocedure('financeiro_privado.fechar_caixa(text,text)') is null then
    raise exception 'FINANCEIRO_PREFLIGHT: API privada financeira ausente';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'financeiro_api') then
    raise exception 'FINANCEIRO_PREFLIGHT: papel financeiro_api ausente';
  end if;
end
$preflight$;

drop policy if exists sessoes_caixa_insert on public.sessoes_caixa;
drop policy if exists entradas_caixa_insert on public.entradas_caixa;

revoke insert, update, delete, truncate on public.sessoes_caixa from public, anon, authenticated;
revoke insert, update, delete, truncate on public.entradas_caixa from public, anon, authenticated;
revoke insert, update, delete, truncate on public.cobrancas from public, anon, authenticated;
revoke insert, update, delete, truncate on public.despesas from public, anon, authenticated;
revoke insert, update, delete, truncate on public.movimentos_caixa from public, anon, authenticated;
revoke insert, update, delete, truncate on public.fechamentos_caixa from public, anon, authenticated;
revoke insert, update, delete, truncate on public.fechamentos_caixa_totais from public, anon, authenticated;
revoke insert, update, delete, truncate on public.repasses from public, anon, authenticated;
revoke insert, update, delete, truncate on public.repasse_itens from public, anon, authenticated;
revoke insert, update, delete, truncate on public.pagamentos_repasse from public, anon, authenticated;
revoke insert, update, delete, truncate on public.estornos_financeiros from public, anon, authenticated;
revoke insert, update, delete, truncate on public.ajustes_financeiros_profissional from public, anon, authenticated;
revoke insert, update, delete, truncate on public.ajustes_financeiros_aplicacoes from public, anon, authenticated;
revoke all on public.financeiro_idempotencia from public, anon, authenticated;

revoke all on schema financeiro_privado from public, anon, authenticated, service_role;
revoke all on all functions in schema financeiro_privado from public, anon, authenticated, service_role;
grant usage on schema financeiro_privado to financeiro_api;
grant execute on function financeiro_privado.abrir_caixa(text,text),
  financeiro_privado.registrar_cobranca(text,text), financeiro_privado.receber_cobranca(text,text),
  financeiro_privado.registrar_despesa(text,text), financeiro_privado.pagar_despesa(text,text),
  financeiro_privado.registrar_sangria(text,text), financeiro_privado.registrar_suprimento(text,text),
  financeiro_privado.estornar_lancamento(text,text), financeiro_privado.fechar_caixa(text,text),
  financeiro_privado.pagar_repasse_integral(text,text) to financeiro_api;

-- PRECHECK OPERACIONAL OBRIGATÓRIO, fora deste SQL:
-- confirmar nas configurações da Data API que financeiro_privado NÃO pertence
-- à lista de schemas expostos pelo PostgREST.

commit;

-- FASE 10C: resumo operacional somente de leitura. PREPARADA; NAO APLICADA.
-- Arquivo gerado por supabase migration new financeiro_fase10c_resumo_caixa.
-- Reutiliza o helper homologado, sem altera-lo ou expor seu EXECUTE.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '5min';

create function public.financeiro_resumo_caixa(p_sessao_caixa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_sessao record;
  v_resumo record;
  v_clinica_nome text;
  v_aberto_por_nome text;
  v_total_estornos_dinheiro numeric(12,2);
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;

  if not exists (
    select 1 from public.usuarios u where u.id = v_usuario_id and u.ativo
  ) then
    raise exception using errcode = '42501', message = 'Usuario inexistente ou inativo.';
  end if;

  if p_sessao_caixa_id is null then
    raise exception using errcode = '22023', message = 'Sessao de caixa obrigatoria.';
  end if;

  select s.id, s.clinica_id, s.status, s.aberto_em, s.aberto_por
    into v_sessao
  from public.sessoes_caixa s where s.id = p_sessao_caixa_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sessao de caixa inexistente.';
  end if;

  select c.nome into v_clinica_nome
  from public.clinicas c
  where c.id = v_sessao.clinica_id and c.ativo
    and exists (
      select 1 from public.usuarios_clinicas uc
      where uc.usuario_id = v_usuario_id and uc.clinica_id = c.id and uc.ativo
        and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario)
    );
  if not found then
    raise exception using errcode = '42501', message = 'Usuario sem permissao para consultar caixa nesta clinica.';
  end if;

  -- Somente apos autorizar: nao revelar a natureza legada de outra clinica.
  if exists (
    select 1 from public.entradas_caixa ec where ec.sessao_caixa_id = p_sessao_caixa_id
  ) then
    raise exception using errcode = '22023',
      message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
  end if;

  select u.nome_completo into v_aberto_por_nome
  from public.usuarios u where u.id = v_sessao.aberto_por;

  select * into v_resumo from private.financeiro_calcular_caixa(p_sessao_caixa_id);

  -- Mesma base da FASE 5; apenas explicita o componente ja descontado pelo helper.
  -- Nao subtrair novamente do valor_esperado retornado pelo helper.
  select coalesce(sum(ep.valor), 0) into v_total_estornos_dinheiro
  from public.movimentos_caixa mc
  join public.estornos e on e.id = mc.estorno_id and e.status = 'efetivado'
  join public.estornos_pagamentos ep
    on ep.estorno_id = e.id and ep.forma_pagamento = 'dinheiro'
  where mc.sessao_caixa_id = p_sessao_caixa_id and mc.tipo = 'estorno';

  return pg_catalog.jsonb_build_object(
    'sessao_caixa_id', v_sessao.id,
    'clinica_id', v_sessao.clinica_id,
    'clinica_nome', v_clinica_nome,
    'status', v_sessao.status,
    'aberto_em', v_sessao.aberto_em,
    'aberto_por_nome', v_aberto_por_nome,
    'resumo', pg_catalog.jsonb_build_object(
      'valor_abertura', v_resumo.valor_abertura,
      'total_dinheiro', v_resumo.total_dinheiro,
      'total_pix', v_resumo.total_pix,
      'total_cartao_credito', v_resumo.total_cartao_credito,
      'total_recebimentos_brutos', v_resumo.total_recebimentos_brutos,
      'total_suprimentos', v_resumo.total_suprimentos,
      'total_sangrias', v_resumo.total_sangrias,
      'total_estornos_dinheiro', v_total_estornos_dinheiro,
      'valor_esperado', v_resumo.valor_esperado,
      'total_clinica', v_resumo.total_clinica,
      'total_profissionais', v_resumo.total_profissionais
    )
  );
end;
$$;

revoke all privileges on function public.financeiro_resumo_caixa(uuid) from public, anon, authenticated;
grant execute on function public.financeiro_resumo_caixa(uuid) to authenticated;

commit;

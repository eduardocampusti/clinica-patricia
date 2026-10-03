-- FASE 2: seguranca das estruturas financeiras criadas na FASE 1.
-- Migration criada para revisao; NAO aplicada.
-- Escopo: helpers privados, grants minimos e policies de leitura.
-- Nenhuma escrita direta e nenhuma RPC financeira operacional sao liberadas.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- O schema private nao integra os schemas expostos pela Data API.
create schema if not exists private;

revoke all privileges on schema private from public;
revoke all privileges on schema private from anon;
revoke create on schema private from authenticated;
grant usage on schema private to authenticated;

-- Confere o papel do usuario autenticado na clinica sem confiar em IDs
-- fornecidos pelo cliente. SECURITY DEFINER e necessario para que o helper
-- nao dependa das policies legadas de usuarios_clinicas.
create function private.financeiro_tem_papel_clinica(
  p_clinica_id uuid,
  p_papeis public.papel_usuario[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.usuarios_clinicas uc
      where uc.usuario_id = (select auth.uid())
        and uc.clinica_id = p_clinica_id
        and uc.ativo
        and uc.papel = any (p_papeis)
    );
$$;

-- Confere se o profissional pertence ao usuario autenticado e se ambos os
-- vinculos necessarios ao acesso medico continuam ativos.
create function private.financeiro_eh_profissional(
  p_clinica_id uuid,
  p_profissional_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.profissionais p
      join public.profissionais_clinicas pc
        on pc.profissional_id = p.id
       and pc.clinica_id = p_clinica_id
       and pc.ativo
      where p.id = p_profissional_id
        and p.usuario_id = (select auth.uid())
        and p.ativo
    );
$$;

revoke all privileges on function
  private.financeiro_tem_papel_clinica(uuid, public.papel_usuario[])
from public;
revoke all privileges on function
  private.financeiro_tem_papel_clinica(uuid, public.papel_usuario[])
from anon;
revoke all privileges on function
  private.financeiro_eh_profissional(uuid, uuid)
from public;
revoke all privileges on function
  private.financeiro_eh_profissional(uuid, uuid)
from anon;

grant execute on function
  private.financeiro_tem_papel_clinica(uuid, public.papel_usuario[])
to authenticated;
grant execute on function
  private.financeiro_eh_profissional(uuid, uuid)
to authenticated;

-- Reafirma a superficie de privilegios: anon permanece sem acesso e
-- authenticated recebe somente SELECT. Escritas futuras serao feitas por
-- RPCs transacionais especificas.
revoke all privileges on table
  public.configuracoes_financeiras_clinica,
  public.recebimentos,
  public.recebimentos_pagamentos,
  public.movimentos_caixa,
  public.eventos_auditoria_financeira
from public, anon, authenticated;

grant select on table
  public.configuracoes_financeiras_clinica,
  public.recebimentos,
  public.recebimentos_pagamentos,
  public.movimentos_caixa,
  public.eventos_auditoria_financeira
to authenticated;

-- Configuracoes: proprietaria e recepcao da clinica. Medico nao recebe
-- leitura direta; o percentual aplicado sera lido do proprio snapshot.
create policy configuracoes_financeiras_select_proprietaria_recepcao
on public.configuracoes_financeiras_clinica
for select
to authenticated
using (
  private.financeiro_tem_papel_clinica(
    clinica_id,
    array[
      'proprietaria'::public.papel_usuario,
      'recepcao'::public.papel_usuario
    ]
  )
);

-- Recebimentos: proprietaria/recepcao limitadas as clinicas vinculadas;
-- medico limitado ao proprio profissional e ao vinculo ativo na clinica.
create policy recebimentos_select_financeiro
on public.recebimentos
for select
to authenticated
using (
  private.financeiro_tem_papel_clinica(
    clinica_id,
    array[
      'proprietaria'::public.papel_usuario,
      'recepcao'::public.papel_usuario
    ]
  )
  or private.financeiro_eh_profissional(clinica_id, profissional_id)
);

-- Componentes herdam a autorizacao do recebimento pai. A consulta ao pai
-- ocorre como authenticated e, portanto, passa pela policy de recebimentos.
create policy recebimentos_pagamentos_select_por_recebimento
on public.recebimentos_pagamentos
for select
to authenticated
using (
  exists (
    select 1
    from public.recebimentos r
    where r.id = recebimentos_pagamentos.recebimento_id
  )
);

-- Movimentos gerais de caixa sao visiveis apenas a proprietaria e recepcao
-- vinculadas a clinica. Medicos nao recebem acesso ao caixa geral.
create policy movimentos_caixa_select_proprietaria_recepcao
on public.movimentos_caixa
for select
to authenticated
using (
  private.financeiro_tem_papel_clinica(
    clinica_id,
    array[
      'proprietaria'::public.papel_usuario,
      'recepcao'::public.papel_usuario
    ]
  )
);

-- Auditoria: proprietaria ve a clinica autorizada; recepcao ve somente os
-- proprios eventos na clinica em que possui vinculo ativo.
create policy eventos_auditoria_financeira_select
on public.eventos_auditoria_financeira
for select
to authenticated
using (
  private.financeiro_tem_papel_clinica(
    clinica_id,
    array['proprietaria'::public.papel_usuario]
  )
  or (
    usuario_id = (select auth.uid())
    and private.financeiro_tem_papel_clinica(
      clinica_id,
      array['recepcao'::public.papel_usuario]
    )
  )
);

commit;

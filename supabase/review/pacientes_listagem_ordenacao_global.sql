-- PROPOSTA PARA REVISÃO. Não é migration, não foi executada nem homologada.
-- Dependência futura para paginação global de conjuntos > limite do PostgREST.
-- O frontend desta etapa NÃO chama esta função. Não mover para migrations sem
-- homologar ICU, autorização, equivalência dos filtros e desempenho com EXPLAIN.
begin;

-- Collation exclusiva desta consulta: ignora caixa/acentos, preserva pt-BR.
-- Pré-requisito a verificar: suporte ICU no PostgreSQL do projeto de destino.
create collation public.pacientes_nome_pt_br (
  provider = icu, locale = 'pt-BR-u-ks-level1', deterministic = false
);

create function public.pacientes_listar_administrativo(
  p_clinica_id uuid,
  p_nome text default '',
  p_cadastro_inicio date default null,
  p_cadastro_fim date default null,
  p_idade_min integer default null,
  p_idade_max integer default null,
  p_nascimento text default 'todos',
  p_ordem text default 'nome_asc',
  p_offset integer default 0,
  p_limite integer default 50
) returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_hoje date := (current_timestamp at time zone 'America/Bahia')::date;
  v_resultado jsonb;
begin
  if auth.uid() is null
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not (public.clinica_ativa() is null or public.clinica_ativa() = p_clinica_id)
     or not exists (select 1 from public.clinicas c where c.id = p_clinica_id and c.ativo) then
    raise exception 'Sem permissão para consultar pacientes nesta clínica.' using errcode = '42501';
  end if;
  if p_offset is null or p_offset < 0 or p_limite is null or p_limite not between 1 and 100
     or p_ordem is null or p_ordem not in ('nome_asc','nome_desc','cadastro_asc','cadastro_desc','nascimento_asc','nascimento_desc')
     or p_nascimento is null or p_nascimento not in ('todos','informado','ausente')
     or p_cadastro_inicio > p_cadastro_fim or p_idade_min < 0 or p_idade_max < 0
     or p_idade_min > p_idade_max
     or (p_nascimento = 'ausente' and (p_idade_min is not null or p_idade_max is not null)) then
    raise exception 'Confira os filtros e a ordenação.' using errcode = '22023';
  end if;

  with elegiveis as materialized (
    select p.id, p.nome_completo, p.data_nascimento, p.telefone,
           p.endereco, p.foto_path, p.ativo, p.created_at
    from public.pacientes p
    where p.clinica_id = p_clinica_id and p.ativo
      -- Substring literal; não aceita curingas/injeção. Mantém a busca por nome.
      and strpos(lower(p.nome_completo), lower(btrim(coalesce(p_nome, '')))) > 0
      and (p_cadastro_inicio is null or p.created_at >= (p_cadastro_inicio::timestamp at time zone 'America/Bahia'))
      and (p_cadastro_fim is null or p.created_at < ((p_cadastro_fim + 1)::timestamp at time zone 'America/Bahia'))
      and (p_nascimento <> 'informado' or p.data_nascimento is not null)
      and (p_nascimento <> 'ausente' or p.data_nascimento is null)
      and ((p_idade_min is null and p_idade_max is null) or (
        p.data_nascimento <= v_hoje
        -- Mesma regra de aniversário do frontend, inclusive 29/02 -> 01/03.
        and (p_idade_min is null or (
          extract(year from v_hoje)::int - extract(year from p.data_nascimento)::int
          - case when to_char(v_hoje, 'MMDD') < to_char(p.data_nascimento, 'MMDD') then 1 else 0 end
        ) >= p_idade_min)
        and (p_idade_max is null or (
          extract(year from v_hoje)::int - extract(year from p.data_nascimento)::int
          - case when to_char(v_hoje, 'MMDD') < to_char(p.data_nascimento, 'MMDD') then 1 else 0 end
        ) <= p_idade_max)
      ))
  ), ordenados as (
    select e.*, row_number() over (order by
      case when p_ordem = 'nome_asc' then e.nome_completo end collate public.pacientes_nome_pt_br asc,
      case when p_ordem = 'nome_desc' then e.nome_completo end collate public.pacientes_nome_pt_br desc,
      case when p_ordem = 'cadastro_asc' then e.created_at end asc nulls last,
      case when p_ordem = 'cadastro_desc' then e.created_at end desc nulls last,
      case when p_ordem = 'nascimento_asc' then e.data_nascimento end asc nulls last,
      case when p_ordem = 'nascimento_desc' then e.data_nascimento end desc nulls last,
      e.nome_completo collate public.pacientes_nome_pt_br asc, e.id asc
    ) as posicao
    from elegiveis e
  ), pagina as (
    select * from ordenados order by posicao limit p_limite offset p_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from elegiveis),
    'itens', coalesce((select jsonb_agg(to_jsonb(pagina) - 'posicao' order by posicao) from pagina), '[]'::jsonb)
  ) into v_resultado;
  return v_resultado;
end;
$$;

revoke all on function public.pacientes_listar_administrativo(uuid,text,date,date,integer,integer,text,text,integer,integer) from public, anon;
grant execute on function public.pacientes_listar_administrativo(uuid,text,date,date,integer,integer,text,text,integer,integer) to authenticated;

-- Não muda grants existentes, cpf_decrypt, policies, pacientes nem migrations.
rollback;

-- RASCUNHO AUTOCONTIDO: baseline para instalação nova apenas.
-- Fonte preservada: candidate_public_20260914.sql
-- SHA-256 da fonte: 99942BD9A94F0DBE51C6EAE395776B05C4998827E26860361AEB0338AC134261
-- Não aplique sobre banco que já contenha a baseline.

begin;

do $$
declare v_superuser boolean;
begin
  if to_regclass('public.agendamentos') is not null then
    raise exception 'Instalação nova exigida: public.agendamentos já existe.';
  end if;
  select rolsuper into v_superuser from pg_roles where rolname = current_user;
  if not coalesce(v_superuser, false)
     and not pg_has_role(current_user, 'postgres', 'member') then
    raise exception 'Executor precisa ser superusuário ou membro de postgres.';
  end if;
  if to_regclass('auth.users') is null
     or to_regclass('vault.decrypted_secrets') is null
     or not exists (
       select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
       where e.extname = 'pgcrypto' and n.nspname = 'extensions'
     )
     or not exists (
       select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
       where e.extname = 'btree_gist' and n.nspname = 'extensions'
     ) then
    raise exception 'Pré-requisitos ausentes: Auth, Vault, pgcrypto/extensions ou btree_gist/extensions.';
  end if;
end;
$$;

-- Início da baseline candidata incorporada sem alterações:
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: acao_auditoria; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.acao_auditoria AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'READ_SENSIVEL'
);


ALTER TYPE public.acao_auditoria OWNER TO postgres;

--
-- Name: forma_pagamento_caixa; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.forma_pagamento_caixa AS ENUM (
    'dinheiro',
    'pix',
    'cartao_debito',
    'cartao_credito',
    'transferencia',
    'convenio',
    'cortesia'
);


ALTER TYPE public.forma_pagamento_caixa OWNER TO postgres;

--
-- Name: papel_usuario; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.papel_usuario AS ENUM (
    'proprietaria',
    'medico',
    'recepcao'
);


ALTER TYPE public.papel_usuario OWNER TO postgres;

--
-- Name: status_agendamento; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_agendamento AS ENUM (
    'agendado',
    'confirmado',
    'aguardando',
    'em_atendimento',
    'concluido',
    'cancelado'
);


ALTER TYPE public.status_agendamento OWNER TO postgres;

--
-- Name: status_atendimento; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_atendimento AS ENUM (
    'em_andamento',
    'finalizado'
);


ALTER TYPE public.status_atendimento OWNER TO postgres;

--
-- Name: status_lista_espera; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_lista_espera AS ENUM (
    'aguardando',
    'contatado',
    'agendado',
    'desistiu'
);


ALTER TYPE public.status_lista_espera OWNER TO postgres;

--
-- Name: status_sessao_caixa; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_sessao_caixa AS ENUM (
    'aberto',
    'fechado'
);


ALTER TYPE public.status_sessao_caixa OWNER TO postgres;

--
-- Name: tema_pref; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tema_pref AS ENUM (
    'claro',
    'escuro',
    'sistema'
);


ALTER TYPE public.tema_pref OWNER TO postgres;

--
-- Name: tipo_documento_clinico; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_documento_clinico AS ENUM (
    'receita',
    'atestado',
    'encaminhamento',
    'solicitacao_exame'
);


ALTER TYPE public.tipo_documento_clinico OWNER TO postgres;

--
-- Name: tipo_excecao_agenda; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_excecao_agenda AS ENUM (
    'folga',
    'horario_especial'
);


ALTER TYPE public.tipo_excecao_agenda OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: atendimentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atendimentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinica_id uuid NOT NULL,
    paciente_id uuid NOT NULL,
    profissional_id uuid NOT NULL,
    agendamento_id uuid,
    queixa_principal text,
    anamnese text,
    exame_fisico text,
    hipotese_diagnostica text,
    cid text,
    conduta_evolucao text,
    prescricao text,
    dados_adicionais jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.status_atendimento DEFAULT 'em_andamento'::public.status_atendimento NOT NULL,
    finalizado_em timestamp with time zone,
    finalizado_por uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.atendimentos OWNER TO postgres;

--
-- Name: abrir_atendimento(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.abrir_atendimento(p_atendimento_id uuid) RETURNS public.atendimentos
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_registro public.atendimentos;
  v_meu_profissional_id uuid;
begin
  select id into v_meu_profissional_id
  from public.profissionais where usuario_id = auth.uid();

  select * into v_registro
  from public.atendimentos
  where id = p_atendimento_id and profissional_id = v_meu_profissional_id;

  if v_registro.id is null then
    raise exception 'Atendimento não encontrado ou sem permissão';
  end if;

  insert into public.auditoria_leitura_clinica (atendimento_id, usuario_id)
  values (p_atendimento_id, auth.uid());

  return v_registro;
end;
$$;


ALTER FUNCTION public.abrir_atendimento(p_atendimento_id uuid) OWNER TO postgres;

--
-- Name: bloquear_edicao_atendimento_finalizado(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bloquear_edicao_atendimento_finalizado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if old.status = 'finalizado' then
    raise exception 'Atendimento finalizado é imutável. Use um adendo para correções.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION public.bloquear_edicao_atendimento_finalizado() OWNER TO postgres;

--
-- Name: cadastrar_profissional(text, text, text, text, uuid, uuid, numeric, numeric, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cadastrar_profissional(p_nome_completo text, p_cpf text, p_conselho_classe text, p_registro_conselho text, p_especialidade_principal_id uuid, p_clinica_id uuid, p_valor_consulta numeric DEFAULT NULL::numeric, p_taxa_repasse_clinica numeric DEFAULT 20, p_duracao_consulta_minutos integer DEFAULT 30) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_profissional_id uuid;
  v_cpf_encrypted bytea;
  v_cpf_hash text;
begin
  if not public.eh_proprietaria(p_clinica_id) then
    raise exception 'Sem permissao para cadastrar profissional nesta clinica';
  end if;

  if p_cpf is not null and length(trim(p_cpf)) > 0 then
    v_cpf_encrypted := public.cpf_encrypt(p_cpf);
    v_cpf_hash := public.cpf_hash(p_cpf);
  end if;

  insert into public.profissionais (
    nome_completo, cpf_encrypted, cpf_hash,
    conselho_classe, registro_conselho, especialidade_principal_id,
    valor_consulta, taxa_repasse_clinica, duracao_consulta_minutos, created_by
  ) values (
    p_nome_completo, v_cpf_encrypted, v_cpf_hash,
    p_conselho_classe, p_registro_conselho, p_especialidade_principal_id,
    p_valor_consulta, p_taxa_repasse_clinica, p_duracao_consulta_minutos, auth.uid()
  )
  returning id into v_profissional_id;

  insert into public.profissionais_clinicas (profissional_id, clinica_id, created_by)
  values (v_profissional_id, p_clinica_id, auth.uid());

  return v_profissional_id;
end;
$$;


ALTER FUNCTION public.cadastrar_profissional(p_nome_completo text, p_cpf text, p_conselho_classe text, p_registro_conselho text, p_especialidade_principal_id uuid, p_clinica_id uuid, p_valor_consulta numeric, p_taxa_repasse_clinica numeric, p_duracao_consulta_minutos integer) OWNER TO postgres;

--
-- Name: calcular_hora_fim_agendamento(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calcular_hora_fim_agendamento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  v_duracao integer;
begin
  select duracao_consulta_minutos into v_duracao
  from public.profissionais
  where id = new.profissional_id;

  if v_duracao is null then
    raise exception 'Profissional sem duracao de consulta cadastrada';
  end if;

  new.hora_fim := new.hora_inicio + (v_duracao || ' minutes')::interval;
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION public.calcular_hora_fim_agendamento() OWNER TO postgres;

--
-- Name: clinica_ativa(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.clinica_ativa() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select nullif(current_setting('app.clinica_ativa', true), '')::uuid
$$;


ALTER FUNCTION public.clinica_ativa() OWNER TO postgres;

--
-- Name: clinicas_do_usuario(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.clinicas_do_usuario() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select clinica_id from public.usuarios_clinicas
  where usuario_id = auth.uid() and ativo = true
$$;


ALTER FUNCTION public.clinicas_do_usuario() OWNER TO postgres;

--
-- Name: cpf_decrypt(bytea); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cpf_decrypt(p_enc bytea) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'vault', 'extensions'
    AS $$
  select extensions.pgp_sym_decrypt(p_enc,
    (select decrypted_secret from vault.decrypted_secrets where name='cpf_key'))
$$;


ALTER FUNCTION public.cpf_decrypt(p_enc bytea) OWNER TO postgres;

--
-- Name: cpf_encrypt(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cpf_encrypt(p_cpf text) RETURNS bytea
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'vault', 'extensions'
    AS $$
  select extensions.pgp_sym_encrypt(regexp_replace(p_cpf,'[^0-9]','','g'),
    (select decrypted_secret from vault.decrypted_secrets where name='cpf_key'))
$$;


ALTER FUNCTION public.cpf_encrypt(p_cpf text) OWNER TO postgres;

--
-- Name: cpf_hash(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cpf_hash(p_cpf text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'vault', 'extensions'
    AS $$
  select encode(extensions.hmac(regexp_replace(p_cpf,'[^0-9]','','g'),
    (select decrypted_secret from vault.decrypted_secrets where name='cpf_pepper'),
    'sha256'),'hex')
$$;


ALTER FUNCTION public.cpf_hash(p_cpf text) OWNER TO postgres;

--
-- Name: eh_proprietaria(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.eh_proprietaria(p_clinica uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.usuarios_clinicas
    where usuario_id = auth.uid() and clinica_id = p_clinica
      and papel = 'proprietaria' and ativo = true
  )
$$;


ALTER FUNCTION public.eh_proprietaria(p_clinica uuid) OWNER TO postgres;

--
-- Name: eh_proprietaria_alguma(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.eh_proprietaria_alguma() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from public.usuarios_clinicas
    where usuario_id = auth.uid()
      and papel = 'proprietaria'
      and ativo
  );
$$;


ALTER FUNCTION public.eh_proprietaria_alguma() OWNER TO postgres;

--
-- Name: eh_proprietaria_de_profissional(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.eh_proprietaria_de_profissional(p_profissional_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from public.profissionais_clinicas pc
    where pc.profissional_id = p_profissional_id
      and public.eh_proprietaria(pc.clinica_id)
  );
$$;


ALTER FUNCTION public.eh_proprietaria_de_profissional(p_profissional_id uuid) OWNER TO postgres;

--
-- Name: eh_proprietaria_ou_recepcao(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.eh_proprietaria_ou_recepcao(p_clinica_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from public.usuarios_clinicas
    where usuario_id = auth.uid()
      and clinica_id = p_clinica_id
      and papel in ('proprietaria', 'recepcao')
      and ativo
  );
$$;


ALTER FUNCTION public.eh_proprietaria_ou_recepcao(p_clinica_id uuid) OWNER TO postgres;

--
-- Name: finalizar_atendimento(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.finalizar_atendimento(p_atendimento_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_meu_profissional_id uuid;
begin
  select id into v_meu_profissional_id
  from public.profissionais where usuario_id = auth.uid();

  update public.atendimentos
  set status = 'finalizado', finalizado_em = now(), finalizado_por = auth.uid()
  where id = p_atendimento_id
    and profissional_id = v_meu_profissional_id
    and status = 'em_andamento';

  if not found then
    raise exception 'Atendimento não encontrado, já finalizado, ou sem permissão';
  end if;
end;
$$;


ALTER FUNCTION public.finalizar_atendimento(p_atendimento_id uuid) OWNER TO postgres;

--
-- Name: fn_auditoria(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_auditoria() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_clinica uuid;
begin
  v_clinica := coalesce((to_jsonb(new)->>'clinica_id')::uuid,(to_jsonb(old)->>'clinica_id')::uuid);
  insert into public.auditoria(clinica_id, usuario_id, acao, entidade, entidade_id, dados_antes, dados_depois)
  values (v_clinica, auth.uid(), tg_op::public.acao_auditoria, tg_table_name,
          coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;


ALTER FUNCTION public.fn_auditoria() OWNER TO postgres;

--
-- Name: fn_bloqueia_mutacao(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_bloqueia_mutacao() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin raise exception 'auditoria e append-only: UPDATE/DELETE proibido'; end $$;


ALTER FUNCTION public.fn_bloqueia_mutacao() OWNER TO postgres;

--
-- Name: agenda_excecoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agenda_excecoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profissional_id uuid NOT NULL,
    clinica_id uuid NOT NULL,
    data date NOT NULL,
    tipo public.tipo_excecao_agenda NOT NULL,
    hora_inicio time without time zone,
    hora_fim time without time zone,
    motivo text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT excecao_horario_consistente CHECK ((((tipo = 'folga'::public.tipo_excecao_agenda) AND (hora_inicio IS NULL) AND (hora_fim IS NULL)) OR ((tipo = 'horario_especial'::public.tipo_excecao_agenda) AND (hora_inicio IS NOT NULL) AND (hora_fim IS NOT NULL) AND (hora_fim > hora_inicio))))
);


ALTER TABLE public.agenda_excecoes OWNER TO postgres;

--
-- Name: agendamentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agendamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinica_id uuid NOT NULL,
    paciente_id uuid NOT NULL,
    profissional_id uuid NOT NULL,
    data date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fim time without time zone NOT NULL,
    status public.status_agendamento DEFAULT 'agendado'::public.status_agendamento NOT NULL,
    observacoes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.agendamentos OWNER TO postgres;

--
-- Name: atendimentos_adendos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atendimentos_adendos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    atendimento_id uuid NOT NULL,
    texto text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.atendimentos_adendos OWNER TO postgres;

--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditoria (
    id bigint NOT NULL,
    clinica_id uuid,
    usuario_id uuid,
    acao public.acao_auditoria NOT NULL,
    entidade text NOT NULL,
    entidade_id text,
    dados_antes jsonb,
    dados_depois jsonb,
    ip inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.auditoria OWNER TO postgres;

--
-- Name: auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auditoria ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auditoria_leitura_clinica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditoria_leitura_clinica (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    atendimento_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    lido_em timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.auditoria_leitura_clinica OWNER TO postgres;

--
-- Name: clinicas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinicas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    cidade text NOT NULL,
    subdomain text NOT NULL,
    cnpj text,
    logo_url text,
    cor_primaria text DEFAULT '#7f51b0'::text NOT NULL,
    cor_secundaria text DEFAULT '#eaddff'::text NOT NULL,
    cor_menu text DEFAULT '#2e1a47'::text NOT NULL,
    fonte text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clinicas_cor_menu_check CHECK ((cor_menu ~* '^#[0-9a-f]{6}$'::text)),
    CONSTRAINT clinicas_cor_primaria_check CHECK ((cor_primaria ~* '^#[0-9a-f]{6}$'::text)),
    CONSTRAINT clinicas_cor_secundaria_check CHECK ((cor_secundaria ~* '^#[0-9a-f]{6}$'::text))
);


ALTER TABLE public.clinicas OWNER TO postgres;

--
-- Name: disponibilidade_padrao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disponibilidade_padrao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profissional_id uuid NOT NULL,
    clinica_id uuid NOT NULL,
    dia_semana smallint NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fim time without time zone NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT disponibilidade_padrao_check CHECK ((hora_fim > hora_inicio)),
    CONSTRAINT disponibilidade_padrao_dia_semana_check CHECK (((dia_semana >= 0) AND (dia_semana <= 6)))
);


ALTER TABLE public.disponibilidade_padrao OWNER TO postgres;

--
-- Name: documentos_clinicos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documentos_clinicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    atendimento_id uuid NOT NULL,
    tipo public.tipo_documento_clinico NOT NULL,
    conteudo text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.documentos_clinicos OWNER TO postgres;

--
-- Name: entradas_caixa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entradas_caixa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sessao_caixa_id uuid NOT NULL,
    clinica_id uuid NOT NULL,
    forma_pagamento public.forma_pagamento_caixa NOT NULL,
    valor numeric(10,2) NOT NULL,
    descricao text,
    registrado_por uuid DEFAULT auth.uid(),
    registrado_em timestamp with time zone DEFAULT now() NOT NULL,
    paciente_id uuid NOT NULL,
    profissional_id uuid NOT NULL,
    CONSTRAINT entradas_caixa_valor_check CHECK ((valor > (0)::numeric))
);


ALTER TABLE public.entradas_caixa OWNER TO postgres;

--
-- Name: especialidades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.especialidades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.especialidades OWNER TO postgres;

--
-- Name: lista_espera; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lista_espera (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinica_id uuid NOT NULL,
    paciente_id uuid NOT NULL,
    profissional_id uuid NOT NULL,
    observacoes text,
    status public.status_lista_espera DEFAULT 'aguardando'::public.status_lista_espera NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lista_espera OWNER TO postgres;

--
-- Name: pacientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pacientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinica_id uuid NOT NULL,
    nome_completo text NOT NULL,
    cpf_encrypted bytea,
    cpf_hash text,
    data_nascimento date,
    sexo text,
    telefone text,
    email text,
    endereco text,
    consentimento_lgpd boolean DEFAULT false NOT NULL,
    consentimento_data timestamp with time zone,
    observacoes text,
    ativo boolean DEFAULT true NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pacientes OWNER TO postgres;

--
-- Name: profissionais; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profissionais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_completo text NOT NULL,
    cpf_encrypted bytea,
    cpf_hash text,
    conselho_classe text,
    registro_conselho text,
    especialidade_principal_id uuid,
    usuario_id uuid,
    ativo boolean DEFAULT true NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    valor_consulta numeric(10,2),
    taxa_repasse_clinica numeric(5,2) DEFAULT 20 NOT NULL,
    duracao_consulta_minutos integer DEFAULT 30 NOT NULL,
    CONSTRAINT profissionais_duracao_consulta_minutos_check CHECK ((duracao_consulta_minutos > 0)),
    CONSTRAINT profissionais_taxa_repasse_clinica_check CHECK (((taxa_repasse_clinica >= (0)::numeric) AND (taxa_repasse_clinica <= (100)::numeric))),
    CONSTRAINT profissionais_valor_consulta_check CHECK ((valor_consulta >= (0)::numeric))
);


ALTER TABLE public.profissionais OWNER TO postgres;

--
-- Name: profissionais_clinicas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profissionais_clinicas (
    profissional_id uuid NOT NULL,
    clinica_id uuid NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.profissionais_clinicas OWNER TO postgres;

--
-- Name: servicos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinica_id uuid NOT NULL,
    nome text NOT NULL,
    especialidade_id uuid NOT NULL,
    duracao_minutos integer NOT NULL,
    preco numeric(10,2) NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT servicos_duracao_minutos_check CHECK ((duracao_minutos > 0)),
    CONSTRAINT servicos_preco_check CHECK ((preco >= (0)::numeric))
);


ALTER TABLE public.servicos OWNER TO postgres;

--
-- Name: sessoes_caixa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessoes_caixa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinica_id uuid NOT NULL,
    aberto_por uuid DEFAULT auth.uid(),
    valor_abertura numeric(10,2) NOT NULL,
    aberto_em timestamp with time zone DEFAULT now() NOT NULL,
    status public.status_sessao_caixa DEFAULT 'aberto'::public.status_sessao_caixa NOT NULL,
    fechado_por uuid,
    fechado_em timestamp with time zone,
    valor_esperado numeric(10,2),
    valor_contado numeric(10,2),
    diferenca numeric(10,2),
    CONSTRAINT sessoes_caixa_valor_abertura_check CHECK ((valor_abertura >= (0)::numeric))
);


ALTER TABLE public.sessoes_caixa OWNER TO postgres;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id uuid NOT NULL,
    nome_completo text NOT NULL,
    cpf_encrypted bytea,
    cpf_hash text,
    conselho_classe text,
    registro_conselho text,
    preferencia_tema public.tema_pref DEFAULT 'sistema'::public.tema_pref NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_clinicas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_clinicas (
    usuario_id uuid NOT NULL,
    clinica_id uuid NOT NULL,
    papel public.papel_usuario NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.usuarios_clinicas OWNER TO postgres;

--
-- Name: agenda_excecoes agenda_excecoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_excecoes
    ADD CONSTRAINT agenda_excecoes_pkey PRIMARY KEY (id);


--
-- Name: agenda_excecoes agenda_excecoes_profissional_id_clinica_id_data_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_excecoes
    ADD CONSTRAINT agenda_excecoes_profissional_id_clinica_id_data_key UNIQUE (profissional_id, clinica_id, data);


--
-- Name: agendamentos agendamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_pkey PRIMARY KEY (id);


--
-- Name: agendamentos agendamentos_sem_sobreposicao; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_sem_sobreposicao EXCLUDE USING gist (profissional_id WITH =, clinica_id WITH =, tsrange((data + hora_inicio), (data + hora_fim)) WITH &&) WHERE ((status <> 'cancelado'::public.status_agendamento));


--
-- Name: atendimentos_adendos atendimentos_adendos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos_adendos
    ADD CONSTRAINT atendimentos_adendos_pkey PRIMARY KEY (id);


--
-- Name: atendimentos atendimentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos
    ADD CONSTRAINT atendimentos_pkey PRIMARY KEY (id);


--
-- Name: auditoria_leitura_clinica auditoria_leitura_clinica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_leitura_clinica
    ADD CONSTRAINT auditoria_leitura_clinica_pkey PRIMARY KEY (id);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: clinicas clinicas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinicas
    ADD CONSTRAINT clinicas_pkey PRIMARY KEY (id);


--
-- Name: clinicas clinicas_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinicas
    ADD CONSTRAINT clinicas_subdomain_key UNIQUE (subdomain);


--
-- Name: disponibilidade_padrao disponibilidade_padrao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidade_padrao
    ADD CONSTRAINT disponibilidade_padrao_pkey PRIMARY KEY (id);


--
-- Name: documentos_clinicos documentos_clinicos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentos_clinicos
    ADD CONSTRAINT documentos_clinicos_pkey PRIMARY KEY (id);


--
-- Name: entradas_caixa entradas_caixa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entradas_caixa
    ADD CONSTRAINT entradas_caixa_pkey PRIMARY KEY (id);


--
-- Name: especialidades especialidades_nome_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_nome_key UNIQUE (nome);


--
-- Name: especialidades especialidades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_pkey PRIMARY KEY (id);


--
-- Name: lista_espera lista_espera_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lista_espera
    ADD CONSTRAINT lista_espera_pkey PRIMARY KEY (id);


--
-- Name: pacientes pacientes_clinica_id_cpf_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_clinica_id_cpf_hash_key UNIQUE (clinica_id, cpf_hash);


--
-- Name: pacientes pacientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_pkey PRIMARY KEY (id);


--
-- Name: profissionais_clinicas profissionais_clinicas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profissionais_clinicas
    ADD CONSTRAINT profissionais_clinicas_pkey PRIMARY KEY (profissional_id, clinica_id);


--
-- Name: profissionais profissionais_conselho_unico; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profissionais
    ADD CONSTRAINT profissionais_conselho_unico UNIQUE (conselho_classe, registro_conselho);


--
-- Name: profissionais profissionais_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profissionais
    ADD CONSTRAINT profissionais_pkey PRIMARY KEY (id);


--
-- Name: servicos servicos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_pkey PRIMARY KEY (id);


--
-- Name: sessoes_caixa sessoes_caixa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessoes_caixa
    ADD CONSTRAINT sessoes_caixa_pkey PRIMARY KEY (id);


--
-- Name: usuarios_clinicas usuarios_clinicas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_clinicas
    ADD CONSTRAINT usuarios_clinicas_pkey PRIMARY KEY (usuario_id, clinica_id);


--
-- Name: usuarios usuarios_cpf_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_cpf_hash_key UNIQUE (cpf_hash);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: lista_espera_sem_duplicata; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lista_espera_sem_duplicata ON public.lista_espera USING btree (paciente_id, profissional_id) WHERE (status = 'aguardando'::public.status_lista_espera);


--
-- Name: profissionais_cpf_hash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profissionais_cpf_hash_key ON public.profissionais USING btree (cpf_hash) WHERE (cpf_hash IS NOT NULL);


--
-- Name: sessoes_caixa_aberta_unica; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sessoes_caixa_aberta_unica ON public.sessoes_caixa USING btree (clinica_id) WHERE (status = 'aberto'::public.status_sessao_caixa);


--
-- Name: clinicas trg_audit_clinicas; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_clinicas AFTER INSERT OR DELETE OR UPDATE ON public.clinicas FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: entradas_caixa trg_audit_entradas_caixa; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_entradas_caixa AFTER INSERT OR DELETE OR UPDATE ON public.entradas_caixa FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: especialidades trg_audit_especialidades; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_especialidades AFTER INSERT OR DELETE OR UPDATE ON public.especialidades FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: pacientes trg_audit_pacientes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_pacientes AFTER INSERT OR DELETE OR UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: profissionais trg_audit_profissionais; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_profissionais AFTER INSERT OR DELETE OR UPDATE ON public.profissionais FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: profissionais_clinicas trg_audit_profissionais_clinicas; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_profissionais_clinicas AFTER INSERT OR DELETE OR UPDATE ON public.profissionais_clinicas FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: servicos trg_audit_servicos; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_servicos AFTER INSERT OR DELETE OR UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: sessoes_caixa trg_audit_sessoes_caixa; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_sessoes_caixa AFTER INSERT OR DELETE OR UPDATE ON public.sessoes_caixa FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: usuarios trg_audit_usuarios; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_usuarios AFTER INSERT OR DELETE OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: usuarios_clinicas trg_audit_usuarios_clinicas; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_usuarios_clinicas AFTER INSERT OR DELETE OR UPDATE ON public.usuarios_clinicas FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();


--
-- Name: auditoria trg_auditoria_imutavel; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_auditoria_imutavel BEFORE DELETE OR UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION public.fn_bloqueia_mutacao();


--
-- Name: atendimentos trg_bloquear_edicao_atendimento_finalizado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bloquear_edicao_atendimento_finalizado BEFORE UPDATE ON public.atendimentos FOR EACH ROW EXECUTE FUNCTION public.bloquear_edicao_atendimento_finalizado();


--
-- Name: agendamentos trg_calcular_hora_fim; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_calcular_hora_fim BEFORE INSERT OR UPDATE OF hora_inicio, profissional_id ON public.agendamentos FOR EACH ROW EXECUTE FUNCTION public.calcular_hora_fim_agendamento();


--
-- Name: agenda_excecoes agenda_excecoes_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_excecoes
    ADD CONSTRAINT agenda_excecoes_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE CASCADE;


--
-- Name: agenda_excecoes agenda_excecoes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_excecoes
    ADD CONSTRAINT agenda_excecoes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: agenda_excecoes agenda_excecoes_profissional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_excecoes
    ADD CONSTRAINT agenda_excecoes_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE CASCADE;


--
-- Name: agendamentos agendamentos_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE RESTRICT;


--
-- Name: agendamentos agendamentos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: agendamentos agendamentos_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE RESTRICT;


--
-- Name: agendamentos agendamentos_profissional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE RESTRICT;


--
-- Name: atendimentos_adendos atendimentos_adendos_atendimento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos_adendos
    ADD CONSTRAINT atendimentos_adendos_atendimento_id_fkey FOREIGN KEY (atendimento_id) REFERENCES public.atendimentos(id) ON DELETE RESTRICT;


--
-- Name: atendimentos_adendos atendimentos_adendos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos_adendos
    ADD CONSTRAINT atendimentos_adendos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: atendimentos atendimentos_agendamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos
    ADD CONSTRAINT atendimentos_agendamento_id_fkey FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE SET NULL;


--
-- Name: atendimentos atendimentos_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos
    ADD CONSTRAINT atendimentos_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE RESTRICT;


--
-- Name: atendimentos atendimentos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos
    ADD CONSTRAINT atendimentos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: atendimentos atendimentos_finalizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos
    ADD CONSTRAINT atendimentos_finalizado_por_fkey FOREIGN KEY (finalizado_por) REFERENCES auth.users(id);


--
-- Name: atendimentos atendimentos_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos
    ADD CONSTRAINT atendimentos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE RESTRICT;


--
-- Name: atendimentos atendimentos_profissional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atendimentos
    ADD CONSTRAINT atendimentos_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE RESTRICT;


--
-- Name: auditoria_leitura_clinica auditoria_leitura_clinica_atendimento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_leitura_clinica
    ADD CONSTRAINT auditoria_leitura_clinica_atendimento_id_fkey FOREIGN KEY (atendimento_id) REFERENCES public.atendimentos(id) ON DELETE CASCADE;


--
-- Name: auditoria_leitura_clinica auditoria_leitura_clinica_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_leitura_clinica
    ADD CONSTRAINT auditoria_leitura_clinica_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id);


--
-- Name: disponibilidade_padrao disponibilidade_padrao_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidade_padrao
    ADD CONSTRAINT disponibilidade_padrao_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE CASCADE;


--
-- Name: disponibilidade_padrao disponibilidade_padrao_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidade_padrao
    ADD CONSTRAINT disponibilidade_padrao_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: disponibilidade_padrao disponibilidade_padrao_profissional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidade_padrao
    ADD CONSTRAINT disponibilidade_padrao_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE CASCADE;


--
-- Name: documentos_clinicos documentos_clinicos_atendimento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentos_clinicos
    ADD CONSTRAINT documentos_clinicos_atendimento_id_fkey FOREIGN KEY (atendimento_id) REFERENCES public.atendimentos(id) ON DELETE RESTRICT;


--
-- Name: documentos_clinicos documentos_clinicos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentos_clinicos
    ADD CONSTRAINT documentos_clinicos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: entradas_caixa entradas_caixa_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entradas_caixa
    ADD CONSTRAINT entradas_caixa_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE RESTRICT;


--
-- Name: entradas_caixa entradas_caixa_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entradas_caixa
    ADD CONSTRAINT entradas_caixa_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE RESTRICT;


--
-- Name: entradas_caixa entradas_caixa_profissional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entradas_caixa
    ADD CONSTRAINT entradas_caixa_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE RESTRICT;


--
-- Name: entradas_caixa entradas_caixa_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entradas_caixa
    ADD CONSTRAINT entradas_caixa_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: entradas_caixa entradas_caixa_sessao_caixa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entradas_caixa
    ADD CONSTRAINT entradas_caixa_sessao_caixa_id_fkey FOREIGN KEY (sessao_caixa_id) REFERENCES public.sessoes_caixa(id) ON DELETE RESTRICT;


--
-- Name: especialidades especialidades_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.especialidades
    ADD CONSTRAINT especialidades_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id);


--
-- Name: lista_espera lista_espera_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lista_espera
    ADD CONSTRAINT lista_espera_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE RESTRICT;


--
-- Name: lista_espera lista_espera_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lista_espera
    ADD CONSTRAINT lista_espera_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: lista_espera lista_espera_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lista_espera
    ADD CONSTRAINT lista_espera_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE RESTRICT;


--
-- Name: lista_espera lista_espera_profissional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lista_espera
    ADD CONSTRAINT lista_espera_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE RESTRICT;


--
-- Name: pacientes pacientes_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE RESTRICT;


--
-- Name: pacientes pacientes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id);


--
-- Name: profissionais_clinicas profissionais_clinicas_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profissionais_clinicas
    ADD CONSTRAINT profissionais_clinicas_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE CASCADE;


--
-- Name: profissionais_clinicas profissionais_clinicas_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profissionais_clinicas
    ADD CONSTRAINT profissionais_clinicas_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id);


--
-- Name: profissionais_clinicas profissionais_clinicas_profissional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profissionais_clinicas
    ADD CONSTRAINT profissionais_clinicas_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE CASCADE;


--
-- Name: profissionais profissionais_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profissionais
    ADD CONSTRAINT profissionais_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id);


--
-- Name: profissionais profissionais_especialidade_principal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profissionais
    ADD CONSTRAINT profissionais_especialidade_principal_id_fkey FOREIGN KEY (especialidade_principal_id) REFERENCES public.especialidades(id);


--
-- Name: profissionais profissionais_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profissionais
    ADD CONSTRAINT profissionais_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: servicos servicos_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE RESTRICT;


--
-- Name: servicos servicos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id);


--
-- Name: servicos servicos_especialidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_especialidade_id_fkey FOREIGN KEY (especialidade_id) REFERENCES public.especialidades(id);


--
-- Name: sessoes_caixa sessoes_caixa_aberto_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessoes_caixa
    ADD CONSTRAINT sessoes_caixa_aberto_por_fkey FOREIGN KEY (aberto_por) REFERENCES public.usuarios(id);


--
-- Name: sessoes_caixa sessoes_caixa_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessoes_caixa
    ADD CONSTRAINT sessoes_caixa_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE RESTRICT;


--
-- Name: sessoes_caixa sessoes_caixa_fechado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessoes_caixa
    ADD CONSTRAINT sessoes_caixa_fechado_por_fkey FOREIGN KEY (fechado_por) REFERENCES public.usuarios(id);


--
-- Name: usuarios_clinicas usuarios_clinicas_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_clinicas
    ADD CONSTRAINT usuarios_clinicas_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE CASCADE;


--
-- Name: usuarios_clinicas usuarios_clinicas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_clinicas
    ADD CONSTRAINT usuarios_clinicas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: atendimentos_adendos adendos_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY adendos_insert ON public.atendimentos_adendos FOR INSERT TO authenticated WITH CHECK ((atendimento_id IN ( SELECT atendimentos.id
   FROM public.atendimentos
  WHERE ((atendimentos.profissional_id IN ( SELECT profissionais.id
           FROM public.profissionais
          WHERE (profissionais.usuario_id = auth.uid()))) AND (atendimentos.status = 'finalizado'::public.status_atendimento)))));


--
-- Name: atendimentos_adendos adendos_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY adendos_select ON public.atendimentos_adendos FOR SELECT TO authenticated USING ((atendimento_id IN ( SELECT atendimentos.id
   FROM public.atendimentos
  WHERE (atendimentos.profissional_id IN ( SELECT profissionais.id
           FROM public.profissionais
          WHERE (profissionais.usuario_id = auth.uid()))))));


--
-- Name: agenda_excecoes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.agenda_excecoes ENABLE ROW LEVEL SECURITY;

--
-- Name: agendamentos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

--
-- Name: agendamentos agendamentos_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY agendamentos_delete ON public.agendamentos FOR DELETE TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: agendamentos agendamentos_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY agendamentos_insert ON public.agendamentos FOR INSERT TO authenticated WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id) AND (EXISTS ( SELECT 1
   FROM public.pacientes p
  WHERE ((p.id = agendamentos.paciente_id) AND (p.clinica_id = agendamentos.clinica_id)))) AND (EXISTS ( SELECT 1
   FROM public.profissionais_clinicas pc
  WHERE ((pc.profissional_id = agendamentos.profissional_id) AND (pc.clinica_id = agendamentos.clinica_id) AND pc.ativo)))));


--
-- Name: agendamentos agendamentos_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY agendamentos_select ON public.agendamentos FOR SELECT TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND (public.eh_proprietaria_ou_recepcao(clinica_id) OR (profissional_id IN ( SELECT profissionais.id
   FROM public.profissionais
  WHERE (profissionais.usuario_id = auth.uid()))))));


--
-- Name: agendamentos agendamentos_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY agendamentos_update ON public.agendamentos FOR UPDATE TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: atendimentos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

--
-- Name: atendimentos_adendos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.atendimentos_adendos ENABLE ROW LEVEL SECURITY;

--
-- Name: atendimentos atendimentos_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY atendimentos_insert ON public.atendimentos FOR INSERT TO authenticated WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND (profissional_id IN ( SELECT profissionais.id
   FROM public.profissionais
  WHERE (profissionais.usuario_id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.pacientes p
  WHERE ((p.id = atendimentos.paciente_id) AND (p.clinica_id = atendimentos.clinica_id))))));


--
-- Name: atendimentos atendimentos_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY atendimentos_select ON public.atendimentos FOR SELECT TO authenticated USING ((profissional_id IN ( SELECT profissionais.id
   FROM public.profissionais
  WHERE (profissionais.usuario_id = auth.uid()))));


--
-- Name: atendimentos atendimentos_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY atendimentos_update ON public.atendimentos FOR UPDATE TO authenticated USING ((profissional_id IN ( SELECT profissionais.id
   FROM public.profissionais
  WHERE (profissionais.usuario_id = auth.uid()))));


--
-- Name: auditoria; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

--
-- Name: auditoria auditoria_leitura; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auditoria_leitura ON public.auditoria FOR SELECT USING (public.eh_proprietaria(clinica_id));


--
-- Name: auditoria_leitura_clinica; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.auditoria_leitura_clinica ENABLE ROW LEVEL SECURITY;

--
-- Name: auditoria_leitura_clinica auditoria_leitura_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auditoria_leitura_select ON public.auditoria_leitura_clinica FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.atendimentos a
  WHERE ((a.id = auditoria_leitura_clinica.atendimento_id) AND public.eh_proprietaria(a.clinica_id)))));


--
-- Name: clinicas; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

--
-- Name: clinicas clinicas_isolamento; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clinicas_isolamento ON public.clinicas FOR SELECT USING ((id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)));


--
-- Name: disponibilidade_padrao disponibilidade_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY disponibilidade_delete ON public.disponibilidade_padrao FOR DELETE TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: disponibilidade_padrao disponibilidade_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY disponibilidade_insert ON public.disponibilidade_padrao FOR INSERT TO authenticated WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: disponibilidade_padrao; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.disponibilidade_padrao ENABLE ROW LEVEL SECURITY;

--
-- Name: disponibilidade_padrao disponibilidade_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY disponibilidade_select ON public.disponibilidade_padrao FOR SELECT TO authenticated USING ((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)));


--
-- Name: disponibilidade_padrao disponibilidade_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY disponibilidade_update ON public.disponibilidade_padrao FOR UPDATE TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: documentos_clinicos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.documentos_clinicos ENABLE ROW LEVEL SECURITY;

--
-- Name: documentos_clinicos documentos_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY documentos_insert ON public.documentos_clinicos FOR INSERT TO authenticated WITH CHECK ((atendimento_id IN ( SELECT atendimentos.id
   FROM public.atendimentos
  WHERE (atendimentos.profissional_id IN ( SELECT profissionais.id
           FROM public.profissionais
          WHERE (profissionais.usuario_id = auth.uid()))))));


--
-- Name: documentos_clinicos documentos_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY documentos_select ON public.documentos_clinicos FOR SELECT TO authenticated USING ((atendimento_id IN ( SELECT atendimentos.id
   FROM public.atendimentos
  WHERE (atendimentos.profissional_id IN ( SELECT profissionais.id
           FROM public.profissionais
          WHERE (profissionais.usuario_id = auth.uid()))))));


--
-- Name: entradas_caixa; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.entradas_caixa ENABLE ROW LEVEL SECURITY;

--
-- Name: entradas_caixa entradas_caixa_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY entradas_caixa_insert ON public.entradas_caixa FOR INSERT TO authenticated WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa())) AND public.eh_proprietaria_ou_recepcao(clinica_id) AND (EXISTS ( SELECT 1
   FROM public.sessoes_caixa sc
  WHERE ((sc.id = entradas_caixa.sessao_caixa_id) AND (sc.clinica_id = entradas_caixa.clinica_id) AND (sc.status = 'aberto'::public.status_sessao_caixa)))) AND (EXISTS ( SELECT 1
   FROM public.pacientes p
  WHERE ((p.id = entradas_caixa.paciente_id) AND (p.clinica_id = entradas_caixa.clinica_id)))) AND (EXISTS ( SELECT 1
   FROM public.profissionais_clinicas pc
  WHERE ((pc.profissional_id = entradas_caixa.profissional_id) AND (pc.clinica_id = entradas_caixa.clinica_id) AND pc.ativo)))));


--
-- Name: entradas_caixa entradas_caixa_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY entradas_caixa_select ON public.entradas_caixa FOR SELECT TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa()))));


--
-- Name: especialidades; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

--
-- Name: especialidades especialidades_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY especialidades_insert ON public.especialidades FOR INSERT TO authenticated WITH CHECK (public.eh_proprietaria_alguma());


--
-- Name: especialidades especialidades_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY especialidades_select ON public.especialidades FOR SELECT TO authenticated USING (true);


--
-- Name: especialidades especialidades_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY especialidades_update ON public.especialidades FOR UPDATE TO authenticated USING (public.eh_proprietaria_alguma()) WITH CHECK (public.eh_proprietaria_alguma());


--
-- Name: agenda_excecoes excecoes_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY excecoes_delete ON public.agenda_excecoes FOR DELETE TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: agenda_excecoes excecoes_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY excecoes_insert ON public.agenda_excecoes FOR INSERT TO authenticated WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: agenda_excecoes excecoes_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY excecoes_select ON public.agenda_excecoes FOR SELECT TO authenticated USING ((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)));


--
-- Name: agenda_excecoes excecoes_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY excecoes_update ON public.agenda_excecoes FOR UPDATE TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: lista_espera; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;

--
-- Name: lista_espera lista_espera_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lista_espera_delete ON public.lista_espera FOR DELETE TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: lista_espera lista_espera_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lista_espera_insert ON public.lista_espera FOR INSERT TO authenticated WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id) AND (EXISTS ( SELECT 1
   FROM public.pacientes p
  WHERE ((p.id = lista_espera.paciente_id) AND (p.clinica_id = lista_espera.clinica_id)))) AND (EXISTS ( SELECT 1
   FROM public.profissionais_clinicas pc
  WHERE ((pc.profissional_id = lista_espera.profissional_id) AND (pc.clinica_id = lista_espera.clinica_id) AND pc.ativo)))));


--
-- Name: lista_espera lista_espera_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lista_espera_select ON public.lista_espera FOR SELECT TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND (public.eh_proprietaria_ou_recepcao(clinica_id) OR (profissional_id IN ( SELECT profissionais.id
   FROM public.profissionais
  WHERE (profissionais.usuario_id = auth.uid()))))));


--
-- Name: lista_espera lista_espera_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lista_espera_update ON public.lista_espera FOR UPDATE TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: pacientes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

--
-- Name: pacientes pacientes_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pacientes_insert ON public.pacientes FOR INSERT WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa()))));


--
-- Name: pacientes pacientes_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pacientes_select ON public.pacientes FOR SELECT USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa()))));


--
-- Name: pacientes pacientes_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pacientes_update ON public.pacientes FOR UPDATE USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa())))) WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa()))));


--
-- Name: profissionais; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

--
-- Name: profissionais_clinicas; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profissionais_clinicas ENABLE ROW LEVEL SECURITY;

--
-- Name: profissionais_clinicas profissionais_clinicas_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profissionais_clinicas_insert ON public.profissionais_clinicas FOR INSERT TO authenticated WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND public.eh_proprietaria(clinica_id)));


--
-- Name: profissionais_clinicas profissionais_clinicas_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profissionais_clinicas_select ON public.profissionais_clinicas FOR SELECT TO authenticated USING ((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)));


--
-- Name: profissionais_clinicas profissionais_clinicas_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profissionais_clinicas_update ON public.profissionais_clinicas FOR UPDATE TO authenticated USING (public.eh_proprietaria(clinica_id)) WITH CHECK (public.eh_proprietaria(clinica_id));


--
-- Name: profissionais profissionais_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profissionais_select ON public.profissionais FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profissionais_clinicas pc
  WHERE ((pc.profissional_id = profissionais.id) AND (pc.clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario))))));


--
-- Name: profissionais profissionais_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profissionais_update ON public.profissionais FOR UPDATE TO authenticated USING (public.eh_proprietaria_de_profissional(id)) WITH CHECK (public.eh_proprietaria_de_profissional(id));


--
-- Name: servicos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

--
-- Name: servicos servicos_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY servicos_insert ON public.servicos FOR INSERT TO authenticated WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa())) AND public.eh_proprietaria(clinica_id)));


--
-- Name: servicos servicos_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY servicos_select ON public.servicos FOR SELECT TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa()))));


--
-- Name: servicos servicos_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY servicos_update ON public.servicos FOR UPDATE TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa())) AND public.eh_proprietaria(clinica_id))) WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa())) AND public.eh_proprietaria(clinica_id)));


--
-- Name: sessoes_caixa; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sessoes_caixa ENABLE ROW LEVEL SECURITY;

--
-- Name: sessoes_caixa sessoes_caixa_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sessoes_caixa_insert ON public.sessoes_caixa FOR INSERT TO authenticated WITH CHECK (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa())) AND public.eh_proprietaria_ou_recepcao(clinica_id)));


--
-- Name: sessoes_caixa sessoes_caixa_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sessoes_caixa_select ON public.sessoes_caixa FOR SELECT TO authenticated USING (((clinica_id IN ( SELECT public.clinicas_do_usuario() AS clinicas_do_usuario)) AND ((public.clinica_ativa() IS NULL) OR (clinica_id = public.clinica_ativa()))));


--
-- Name: usuarios_clinicas uc_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY uc_self ON public.usuarios_clinicas FOR SELECT USING ((usuario_id = auth.uid()));


--
-- Name: usuarios; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

--
-- Name: usuarios_clinicas; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.usuarios_clinicas ENABLE ROW LEVEL SECURITY;

--
-- Name: usuarios usuarios_self_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY usuarios_self_select ON public.usuarios FOR SELECT USING ((id = auth.uid()));


--
-- Name: usuarios usuarios_self_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY usuarios_self_update ON public.usuarios FOR UPDATE USING ((id = auth.uid()));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE atendimentos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.atendimentos TO anon;
GRANT ALL ON TABLE public.atendimentos TO authenticated;
GRANT ALL ON TABLE public.atendimentos TO service_role;


--
-- Name: FUNCTION abrir_atendimento(p_atendimento_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.abrir_atendimento(p_atendimento_id uuid) TO anon;
GRANT ALL ON FUNCTION public.abrir_atendimento(p_atendimento_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.abrir_atendimento(p_atendimento_id uuid) TO service_role;


--
-- Name: FUNCTION bloquear_edicao_atendimento_finalizado(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.bloquear_edicao_atendimento_finalizado() TO anon;
GRANT ALL ON FUNCTION public.bloquear_edicao_atendimento_finalizado() TO authenticated;
GRANT ALL ON FUNCTION public.bloquear_edicao_atendimento_finalizado() TO service_role;


--
-- Name: FUNCTION cadastrar_profissional(p_nome_completo text, p_cpf text, p_conselho_classe text, p_registro_conselho text, p_especialidade_principal_id uuid, p_clinica_id uuid, p_valor_consulta numeric, p_taxa_repasse_clinica numeric, p_duracao_consulta_minutos integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cadastrar_profissional(p_nome_completo text, p_cpf text, p_conselho_classe text, p_registro_conselho text, p_especialidade_principal_id uuid, p_clinica_id uuid, p_valor_consulta numeric, p_taxa_repasse_clinica numeric, p_duracao_consulta_minutos integer) TO anon;
GRANT ALL ON FUNCTION public.cadastrar_profissional(p_nome_completo text, p_cpf text, p_conselho_classe text, p_registro_conselho text, p_especialidade_principal_id uuid, p_clinica_id uuid, p_valor_consulta numeric, p_taxa_repasse_clinica numeric, p_duracao_consulta_minutos integer) TO authenticated;
GRANT ALL ON FUNCTION public.cadastrar_profissional(p_nome_completo text, p_cpf text, p_conselho_classe text, p_registro_conselho text, p_especialidade_principal_id uuid, p_clinica_id uuid, p_valor_consulta numeric, p_taxa_repasse_clinica numeric, p_duracao_consulta_minutos integer) TO service_role;


--
-- Name: FUNCTION calcular_hora_fim_agendamento(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calcular_hora_fim_agendamento() TO anon;
GRANT ALL ON FUNCTION public.calcular_hora_fim_agendamento() TO authenticated;
GRANT ALL ON FUNCTION public.calcular_hora_fim_agendamento() TO service_role;


--
-- Name: FUNCTION clinica_ativa(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.clinica_ativa() TO anon;
GRANT ALL ON FUNCTION public.clinica_ativa() TO authenticated;
GRANT ALL ON FUNCTION public.clinica_ativa() TO service_role;


--
-- Name: FUNCTION clinicas_do_usuario(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.clinicas_do_usuario() TO anon;
GRANT ALL ON FUNCTION public.clinicas_do_usuario() TO authenticated;
GRANT ALL ON FUNCTION public.clinicas_do_usuario() TO service_role;


--
-- Name: FUNCTION cpf_decrypt(p_enc bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cpf_decrypt(p_enc bytea) TO anon;
GRANT ALL ON FUNCTION public.cpf_decrypt(p_enc bytea) TO authenticated;
GRANT ALL ON FUNCTION public.cpf_decrypt(p_enc bytea) TO service_role;


--
-- Name: FUNCTION cpf_encrypt(p_cpf text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cpf_encrypt(p_cpf text) TO anon;
GRANT ALL ON FUNCTION public.cpf_encrypt(p_cpf text) TO authenticated;
GRANT ALL ON FUNCTION public.cpf_encrypt(p_cpf text) TO service_role;


--
-- Name: FUNCTION cpf_hash(p_cpf text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cpf_hash(p_cpf text) TO anon;
GRANT ALL ON FUNCTION public.cpf_hash(p_cpf text) TO authenticated;
GRANT ALL ON FUNCTION public.cpf_hash(p_cpf text) TO service_role;


--
-- Name: FUNCTION eh_proprietaria(p_clinica uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.eh_proprietaria(p_clinica uuid) TO anon;
GRANT ALL ON FUNCTION public.eh_proprietaria(p_clinica uuid) TO authenticated;
GRANT ALL ON FUNCTION public.eh_proprietaria(p_clinica uuid) TO service_role;


--
-- Name: FUNCTION eh_proprietaria_alguma(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.eh_proprietaria_alguma() TO anon;
GRANT ALL ON FUNCTION public.eh_proprietaria_alguma() TO authenticated;
GRANT ALL ON FUNCTION public.eh_proprietaria_alguma() TO service_role;


--
-- Name: FUNCTION eh_proprietaria_de_profissional(p_profissional_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.eh_proprietaria_de_profissional(p_profissional_id uuid) TO anon;
GRANT ALL ON FUNCTION public.eh_proprietaria_de_profissional(p_profissional_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.eh_proprietaria_de_profissional(p_profissional_id uuid) TO service_role;


--
-- Name: FUNCTION eh_proprietaria_ou_recepcao(p_clinica_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.eh_proprietaria_ou_recepcao(p_clinica_id uuid) TO anon;
GRANT ALL ON FUNCTION public.eh_proprietaria_ou_recepcao(p_clinica_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.eh_proprietaria_ou_recepcao(p_clinica_id uuid) TO service_role;


--
-- Name: FUNCTION finalizar_atendimento(p_atendimento_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.finalizar_atendimento(p_atendimento_id uuid) TO anon;
GRANT ALL ON FUNCTION public.finalizar_atendimento(p_atendimento_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.finalizar_atendimento(p_atendimento_id uuid) TO service_role;


--
-- Name: FUNCTION fn_auditoria(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_auditoria() TO anon;
GRANT ALL ON FUNCTION public.fn_auditoria() TO authenticated;
GRANT ALL ON FUNCTION public.fn_auditoria() TO service_role;


--
-- Name: FUNCTION fn_bloqueia_mutacao(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_bloqueia_mutacao() TO anon;
GRANT ALL ON FUNCTION public.fn_bloqueia_mutacao() TO authenticated;
GRANT ALL ON FUNCTION public.fn_bloqueia_mutacao() TO service_role;


--
-- Name: TABLE agenda_excecoes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.agenda_excecoes TO anon;
GRANT ALL ON TABLE public.agenda_excecoes TO authenticated;
GRANT ALL ON TABLE public.agenda_excecoes TO service_role;


--
-- Name: TABLE agendamentos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.agendamentos TO anon;
GRANT ALL ON TABLE public.agendamentos TO authenticated;
GRANT ALL ON TABLE public.agendamentos TO service_role;


--
-- Name: TABLE atendimentos_adendos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.atendimentos_adendos TO anon;
GRANT ALL ON TABLE public.atendimentos_adendos TO authenticated;
GRANT ALL ON TABLE public.atendimentos_adendos TO service_role;


--
-- Name: TABLE auditoria; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.auditoria TO anon;
GRANT ALL ON TABLE public.auditoria TO authenticated;
GRANT ALL ON TABLE public.auditoria TO service_role;


--
-- Name: SEQUENCE auditoria_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.auditoria_id_seq TO anon;
GRANT ALL ON SEQUENCE public.auditoria_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.auditoria_id_seq TO service_role;


--
-- Name: TABLE auditoria_leitura_clinica; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.auditoria_leitura_clinica TO anon;
GRANT ALL ON TABLE public.auditoria_leitura_clinica TO authenticated;
GRANT ALL ON TABLE public.auditoria_leitura_clinica TO service_role;


--
-- Name: TABLE clinicas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clinicas TO anon;
GRANT ALL ON TABLE public.clinicas TO authenticated;
GRANT ALL ON TABLE public.clinicas TO service_role;


--
-- Name: TABLE disponibilidade_padrao; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.disponibilidade_padrao TO anon;
GRANT ALL ON TABLE public.disponibilidade_padrao TO authenticated;
GRANT ALL ON TABLE public.disponibilidade_padrao TO service_role;


--
-- Name: TABLE documentos_clinicos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documentos_clinicos TO anon;
GRANT ALL ON TABLE public.documentos_clinicos TO authenticated;
GRANT ALL ON TABLE public.documentos_clinicos TO service_role;


--
-- Name: TABLE entradas_caixa; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.entradas_caixa TO anon;
GRANT ALL ON TABLE public.entradas_caixa TO authenticated;
GRANT ALL ON TABLE public.entradas_caixa TO service_role;


--
-- Name: TABLE especialidades; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.especialidades TO anon;
GRANT ALL ON TABLE public.especialidades TO authenticated;
GRANT ALL ON TABLE public.especialidades TO service_role;


--
-- Name: TABLE lista_espera; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lista_espera TO anon;
GRANT ALL ON TABLE public.lista_espera TO authenticated;
GRANT ALL ON TABLE public.lista_espera TO service_role;


--
-- Name: TABLE pacientes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pacientes TO anon;
GRANT ALL ON TABLE public.pacientes TO authenticated;
GRANT ALL ON TABLE public.pacientes TO service_role;


--
-- Name: TABLE profissionais; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profissionais TO anon;
GRANT ALL ON TABLE public.profissionais TO authenticated;
GRANT ALL ON TABLE public.profissionais TO service_role;


--
-- Name: TABLE profissionais_clinicas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profissionais_clinicas TO anon;
GRANT ALL ON TABLE public.profissionais_clinicas TO authenticated;
GRANT ALL ON TABLE public.profissionais_clinicas TO service_role;


--
-- Name: TABLE servicos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.servicos TO anon;
GRANT ALL ON TABLE public.servicos TO authenticated;
GRANT ALL ON TABLE public.servicos TO service_role;


--
-- Name: TABLE sessoes_caixa; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sessoes_caixa TO anon;
GRANT ALL ON TABLE public.sessoes_caixa TO authenticated;
GRANT ALL ON TABLE public.sessoes_caixa TO service_role;


--
-- Name: TABLE usuarios; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.usuarios TO anon;
GRANT ALL ON TABLE public.usuarios TO authenticated;
GRANT ALL ON TABLE public.usuarios TO service_role;


--
-- Name: TABLE usuarios_clinicas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.usuarios_clinicas TO anon;
GRANT ALL ON TABLE public.usuarios_clinicas TO authenticated;
GRANT ALL ON TABLE public.usuarios_clinicas TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- DEFAULT ACL de supabase_admin deliberadamente omitido: o executor local não
-- pode alterá-lo. Objetos desse papel exigem grants explícitos na migration.
--

--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- DEFAULT ACL de supabase_admin deliberadamente omitido: ver nota anterior.
--

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- DEFAULT ACL de supabase_admin deliberadamente omitido: ver nota anterior.
--

--
-- PostgreSQL database dump complete
--
-- Fim da baseline candidata incorporada.

commit;

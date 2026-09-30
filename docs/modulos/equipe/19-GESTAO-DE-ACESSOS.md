# Clínica Patrícia — gestão de acessos da Equipe

**Data:** 29/09/2026  
**Projeto:** `D:\PROJETOS SAAS\CLINICA PATRICIA`  
**Supabase principal:** `xftnkusbyqzyvzrovroj` — somente a migration desta etapa e a Edge Function autorizada foram aplicadas/publicadas; Site Geovana, outros projetos e outras migrations ficaram fora do escopo.

## Diagnóstico

O cadastro da pessoa e o acesso ao sistema continuam sendo objetos distintos. A migration de cadastro/edição `20260928153000_equipe_cadastro_edicao.sql` e seu histórico anterior permanecem preservados. Antes desta etapa, a interface não tinha operação de convite, vinculação ou suspensão por clínica; o catálogo remoto somente de leitura confirmou que não havia RPCs de gestão de acessos e que as policies diretas de `usuarios`/`usuarios_clinicas` eram de leitura do próprio usuário.

A implementação local agora exibe na ficha do membro, somente para a proprietária, o e-mail de login quando o serviço o confirma e os estados por clínica: **Sem acesso**, **Convite pendente**, **Acesso ativo**, **Acesso suspenso** e **Conta inativa**. Falhas de serviço aparecem como indisponibilidade compreensível. Modo legado não tenta completar dados ausentes nem criar acesso.

## Alterações realizadas

- `src/lib/equipeAcessos.ts`: contrato de leitura/ações, mensagens seguras e rótulos de status; todas as chamadas passam pela Edge Function.
- `src/pages/cadastros/Equipe.tsx`: painel na ficha com escopo por clínica, papéis existentes, convite/vinculação, concessão, alteração de papel, suspensão, reativação e reenvio; respostas antigas são descartadas ao desmontar/trocar membro ou clínica; envio fica desabilitado durante a operação.
- `src/pages/ConviteEquipe.tsx` e `src/App.tsx`: aceite de convite/vínculo por sessão Auth, senha opcional para conta existente e redirect somente para rota controlada.
- `supabase/functions/equipe-acessos/index.ts`: autenticação do JWT, uso da chave administrativa somente no servidor, chamadas RPC e Auth Admin por alvo específico, sem listagem global, sem logs de e-mail/token e com CORS limitado ao ambiente local conhecido.
- `supabase/migrations/20260929120000_equipe_gestao_acessos.sql`: migration aditiva integral ao final deste relatório.
- `docs/modulos/equipe/00-README-EQUIPE.md`, `docs/modulos/equipe/08-CHECKPOINT.md`, `CHECKPOINT.md`, `docs/modulos/equipe/18-VALIDACAO-CPF-E-PRESERVACAO-BACKUP.md` e `src/config/notasEvolucao.json`: estado e histórico atualizados; a correção de mensagem de CPF duplicado deixou de ser descrita como “nenhuma alteração”.

Hash SHA-256 da migration local e aplicada: `297593FF12A4CE621A5CB5DBD96955381E9705CB55D9D2B3C49C8DF2244F22D6`. A aplicação foi confirmada por catálogo e o histórico remoto foi registrado como `20260929120000` depois da confirmação.

## Revisão de segurança e compatibilidade

A migration revoga acesso direto à tabela de convites e às funções para `public`, `anon` e `authenticated`; somente `service_role` pode executar as RPCs através do servidor. Cada operação recebe explicitamente solicitante, membro, clínica de contexto, clínica-alvo, ação e papel. A função de validação confirma que o solicitante é proprietária ativa de cada clínica, que a clínica está ativa e que o membro possui vínculo ativo. O enum existente `public.papel_usuario` é reutilizado; nenhum papel novo foi criado.

As funções são `SECURITY DEFINER` com `search_path=''`; a migration usa nomes `public.` qualificados. Locks de membro e dos vínculos são tomados antes de alteração; idempotência usa chave por solicitante e hash de payload. A última administradora ativa não pode ser suspensa, perder o papel ou remover o próprio acesso. As alterações de `usuarios`, `usuarios_clinicas` e `equipe_membros.usuario_id` ocorrem na RPC e são revertidas juntas se qualquer validação falhar. Convite enviado não cria vínculo ativo por clínica; os vínculos só são criados após o aceite confirmado pelo titular.

O frontend nunca contém `service_role`/secret key e não descriptografa CPF. O e-mail cadastral continua sem ser prova de login. O convite usa `inviteUserByEmail`/OTP no servidor e requer `EQUIPE_INVITE_REDIRECT_URL` allowlisted; nenhum redirect arbitrário é aceito. Não foram enviados convites reais nesta etapa.

A compatibilidade com Agenda/Financeiro é preservada porque as tabelas profissionais e vínculos operacionais não são removidas ou reescritas. Equipe administrativa não gera linha em `profissionais`; profissionais existentes permanecem reutilizados pela projeção já aplicada.

## Snapshot e limitações

O dump lógico completo não foi usado: o comando oficial do Supabase depende de Docker, que não está instalado/disponível, e exportaria dados pessoais. Foi salvo um snapshot **somente de metadados** fora do Git e fora de Temp em:

`D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260929_EQUIPE_ACESSOS_PRE\snapshot-metadados-20260929.json`

SHA-256: `A5D5D86F663A27671E500925ED794BAB802C746733FB7CABC4E15A362638B726`. Ele cobre referência do projeto, contagens agregadas, colunas, funções, policies e grants antes da migration; não contém CPF, e-mail, ciphertext, Auth ou segredos. Não é backup completo e não houve restauração validada. O arquivo está fora de `Temp` e do Git. A tentativa de remover a herança ACL/read-only foi recusada pelo Windows com “Attempted to perform an unauthorized operation”/“Acesso negado”; portanto a proteção de permissões não foi comprovada e essa é uma limitação concreta do snapshot. O backup permanente anterior da etapa 18 permanece inalterado.

## Verificações executadas

- Build local: `npm run build` concluído; avisos existentes de bundle/importação dinâmica não impediram a compilação.
- Lint: `npm run lint` concluído; permanece apenas o aviso histórico de Fast Refresh em `ThemeProvider.tsx`.
- Testes determinísticos: `server\node_modules\.bin\tsx.cmd --test src/lib/equipe.test.ts` — 8/8 aprovados.
- Harness sintético de ficha/acesso: Playwright `equipe-ficha.spec.ts` — 5/5 desktop e 5/5 mobile. Foram interceptados estados de acesso ativo/sem acesso, login confirmado, formulário de início, erro e troca de membro; nenhuma escrita foi feita.
- Busca de artefatos frontend/build: nenhuma ocorrência de `SERVICE_ROLE`, `SECRET_KEY`, `SUPABASE_SERVICE_ROLE` ou `TYPESAFE_API_KEY` em `src`/`dist` fora do código de servidor da função.
- Teste estático da migration: conferidos nomes, dependências, grants/revokes, `SECURITY DEFINER`, `search_path`, enum de papéis e transação `begin/commit`. PostgreSQL local portátil não estava disponível nesta sessão e Docker não foi instalado.
- O catálogo remoto prévio (antes da autorização) registrou clínicas `3`, membros de Equipe `1`, vínculos de Equipe `2`, usuários `5` e vínculos de usuários `8`, sem os objetos novos; esse resultado permanece como histórico, não como estado atual.
- Após a autorização, a migration foi enviada em uma transação única, os objetos foram confirmados por `to_regclass`, `information_schema`, `pg_proc`, RLS e grants, e o histórico `20260929120000` foi reparado como `applied`. A consulta dirigida registrou tabela presente, RLS ativo, 10 funções, 0 execuções para `anon`/`authenticated`, 8 para `service_role` e nenhum privilégio direto de tabela para usuários comuns.
- `supabase/tools/verificar-integridade.sql` foi executado após a migration, somente leitura, com saída sem erro e resultado final `qtd_pacientes=3`; a consulta dirigida de Equipe confirmou os mesmos controles sem expor dados pessoais.
- A Edge Function foi publicada com `status=ACTIVE`, `version=1`, `verify_jwt=true`, SHA de bundle `2005687d7aa63608ef1fcc0b0566bfcde275583aef333258a6b8f43274831533`. As variáveis built-in do Supabase necessárias ao servidor foram encontradas sem registrar valores. `EQUIPE_INVITE_REDIRECT_URL` não está configurada porque não há URL allowlisted confirmada nem destinatário de teste autorizado; convites/vinculações por e-mail continuam pendentes.
- Conferência inicial (antes da autorização de aplicação): a proprietária consultou Brotas e Ipupiara somente em leitura; naquele momento nenhum botão de alteração, suspensão, convite, OTP ou e-mail foi acionado.
- Naquela etapa, por falta de conta/destinatário temporário autorizado e configuração de redirect, ficaram pendentes criação de conta, convite/aceite real, vinculação OTP, alteração de papel, suspensão/reativação, negativas com perfil não proprietário, proteção da última administradora e teste de sessão já aberta. Essa anotação é histórica; a seção de aplicação real abaixo registra o que foi executado após a autorização.

## Aplicação real autorizada — 29/09/2026

Esta seção atualiza o diagnóstico anterior sem apagar o histórico da implementação local. A autorização foi específica para `xftnkusbyqzyvzrovroj`; nenhum projeto novo, plano, Site Geovana ou migration de outro módulo foi tocado.

### Migration

- Arquivo aplicado: `supabase/migrations/20260929120000_equipe_gestao_acessos.sql`.
- Hash local/aplicado: `297593FF12A4CE621A5CB5DBD96955381E9705CB55D9D2B3C49C8DF2244F22D6`.
- Método: `supabase db query --linked` somente para este arquivo, dentro de `begin/commit`; não foi usado `db push` geral.
- Histórico: `supabase migration repair --linked --status applied 20260929120000` executado somente depois da verificação catalogal; consulta posterior retornou a versão.
- Objetos confirmados: tabela `public.equipe_acesso_convites`, 16 colunas, 10 funções `equipe_acesso_*`, `SECURITY DEFINER`, `search_path=""`, RLS ativo e grants sem acesso direto de `anon`/`authenticated`.
- Contagens agregadas pós-aplicação: clínicas `3`, membros `1`, vínculos de Equipe `2`, usuários `5`, vínculos de usuários `8`. Nenhuma escrita de teste foi realizada nesta rodada.

### Edge Function e configuração

- Função: `equipe-acessos`, publicada no projeto autorizado; painel: `https://supabase.com/dashboard/project/xftnkusbyqzyvzrovroj/functions`.
- Estado confirmado por `functions list`: `ACTIVE`, versão `1`, `verify_jwt=true`, bundle SHA `2005687d7aa63608ef1fcc0b0566bfcde275583aef333258a6b8f43274831533`.
- Os nomes das variáveis built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` estão disponíveis no ambiente da função; seus valores não foram impressos nem registrados.
- `EQUIPE_INVITE_REDIRECT_URL` permanece pendente até confirmar uma URL allowlisted e um destinatário de teste. A função devolve estado explícito de configuração ausente antes de criar/usar convite; a interface não trata isso como sucesso.

### Fluxos realmente comprovados

- Sessão real de proprietária: consulta `listar` pela função, lista Brotas e ficha de membro existente; conta Auth confirmada e acesso ativo retornados pelo serviço.
- Troca real de clínica: Ipupiara foi selecionada na própria interface; a lista ficou vazia e nenhum dado de Brotas permaneceu na tela.
- Cadastro/edição de membros existentes permanece preservado. No registro sintético já existente `Dr. Teste Brotas`, a proprietária alterou o papel de Médico para Recepção, suspendeu o acesso, reativou-o e restaurou o papel Médico; cada retorno foi confirmado na interface e a ficha foi fechada, reaberta e recarregada com acesso ativo e papel Médico.
- A conta e o vínculo sintéticos não foram criados nem removidos nesta rodada; a limpeza consistiu em devolver o registro ao estado inicial. As linhas de auditoria dessas ações foram preservadas, conforme a regra do módulo.
- Leitura agregada pós-testes, sem dados pessoais: `membros_total=1`, `vinculos_ativos=2`, `acessos_ativos=6`, `convites_total=0`, `idempotencias_total=0`; os papéis ativos totalizaram 2 Médico, 2 Administradora e 2 Recepção. A consulta confirmou que não ficaram convites ou idempotências de ensaio.
- Testes locais sintéticos continuam separados: 8/8 testes determinísticos, Playwright da ficha 15/15 (desktop, tablet e mobile), build e lint aprovados. Eles não comprovam Auth, SMTP ou RLS de perfis comuns.

### Limitações e condição de liberação

A leitura e as operações de papel/suspensão para a proprietária estão instaladas e foram conferidas no registro sintético existente. O ciclo de convite/aceite, a vinculação OTP e as negativas com contas não proprietárias ainda não foram homologados com sessões reais. Para liberar todas as ações, ainda é necessário fornecer uma URL de redirect allowlisted e uma conta/destinatário de teste expressamente autorizado; depois disso, executar somente os fluxos pendentes e remover os IDs exatos. Até lá, a interface deve manter convite/vinculação/reenviar em indisponibilidade compreensível e não declarar gestão de acessos concluída.

Os testes sintéticos não são evidência de gravação real. A migration e a Edge Function foram aplicadas/publicadas somente no projeto autorizado; nenhuma chave, token ou dado pessoal foi incluído neste documento.

## Plano residual para concluir homologação e liberar todas as ações

1. Confirmar no Supabase Auth a URL allowlisted que deve receber o aceite; configurar apenas `EQUIPE_INVITE_REDIRECT_URL` pelo mecanismo de secrets, sem inserir valor no repositório.
2. Obter uma conta e destinatário de teste expressamente autorizados; não usar funcionários reais ou e-mails aleatórios.
3. Testar com sessões separadas os fluxos ainda pendentes: negativa sem permissão, convite/aceite, vinculação OTP, repetição idempotente, continuidade na outra clínica e última administradora. O papel e a suspensão/reativação já foram exercitados pela proprietária no membro sintético existente. Não usar conexão administrativa como prova única de autorização.
4. Conferir novamente catálogo, RLS, auditoria e `supabase/tools/verificar-integridade.sql`; preservar o snapshot de metadados e não resetar banco, instalar Docker ou alterar plano.
5. Limpar somente IDs exatos de ensaios após conferir dependências; preservar auditoria e cadastros existentes.
6. Liberar todas as ações somente quando a função `listar` e as ações protegidas responderem com sucesso em sessão autorizada e as negativas forem comprovadas; até lá, manter convite/vinculação/reenvio indisponíveis com mensagem compreensível.

Não houve decisão de tornar CPF obrigatório nesta etapa; a regra opcional atual permanece.

## TypeSafe AI

A skill `typesafe-ai` foi consultada. O problema é determinístico (autorização, estados, transação, Auth e RLS); não há etapa de classificação, extração ou julgamento semântico que justifique IA. Nenhuma integração ou chave foi solicitada.

## SQL integral da migration revisada

O bloco abaixo é a cópia integral do arquivo versionado; não contém credenciais ou dados pessoais.

```sql
begin;

-- Gestão de acesso da Equipe: o cadastro da pessoa continua separado do
-- login. Convites ficam somente como estado operacional; nenhum segredo Auth
-- é persistido ou devolvido ao cliente.
create table public.equipe_acesso_convites (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.equipe_membros(id) on delete restrict,
  solicitado_por uuid not null references public.usuarios(id) on delete restrict,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  modo text not null check (modo in ('convite','vinculo')),
  clinicas_papeis jsonb not null check (jsonb_typeof(clinicas_papeis) = 'array'),
  chave_idempotencia uuid not null,
  payload_hash text not null,
  auth_user_id uuid,
  status text not null default 'pendente' check (status in ('pendente','enviado','aceito','erro','cancelado')),
  tentativas integer not null default 0 check (tentativas >= 0),
  ultimo_envio_em timestamptz,
  aceito_em timestamptz,
  erro_codigo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (solicitado_por, chave_idempotencia)
);
create index equipe_acesso_convites_membro_idx on public.equipe_acesso_convites(membro_id, created_at desc);
create unique index equipe_acesso_convite_pendente_unico on public.equipe_acesso_convites(membro_id, email)
  where status in ('pendente','enviado');
alter table public.equipe_acesso_convites enable row level security;
revoke all on public.equipe_acesso_convites from public, anon, authenticated;

create or replace function public.equipe_acesso_eh_proprietaria(p_usuario_id uuid, p_clinica_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.usuarios u
    join public.usuarios_clinicas uc on uc.usuario_id=u.id
    where u.id=p_usuario_id and u.ativo and uc.clinica_id=p_clinica_id
      and uc.papel='proprietaria'::public.papel_usuario and uc.ativo
  )
$$;

create or replace function public.equipe_acesso_validar_clinicas(
  p_usuario_id uuid,p_membro_id uuid,p_clinicas jsonb
) returns void language plpgsql security definer set search_path='' as $$
declare v_item jsonb; v_clinica uuid; v_papel text;
begin
  if jsonb_typeof(p_clinicas)<>'array' or jsonb_array_length(p_clinicas)=0 then
    raise exception 'Selecione ao menos uma clínica.' using errcode='22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_clinicas) loop
    if jsonb_typeof(v_item)<>'object' or not (v_item ? 'clinica_id') or not (v_item ? 'papel') then
      raise exception 'O escopo de acesso é inválido.' using errcode='22023';
    end if;
    begin v_clinica:=(v_item->>'clinica_id')::uuid; exception when invalid_text_representation then raise exception 'Clínica inválida.' using errcode='22023'; end;
    v_papel:=v_item->>'papel';
    if v_papel not in ('proprietaria','medico','recepcao') then raise exception 'Papel não permitido nesta etapa.' using errcode='22023'; end if;
    if not public.equipe_acesso_eh_proprietaria(p_usuario_id,v_clinica) then
      raise exception 'Você não administra uma das clínicas selecionadas.' using errcode='42501';
    end if;
    if not exists(select 1 from public.clinicas c where c.id=v_clinica and c.ativo) then
      raise exception 'Clínica inexistente ou inativa.' using errcode='22023';
    end if;
    if not exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=p_membro_id and ec.clinica_id=v_clinica and ec.ativo) then
      raise exception 'O membro não possui vínculo ativo em uma das clínicas selecionadas.' using errcode='22023';
    end if;
  end loop;
  if (select count(distinct (x->>'clinica_id')) from jsonb_array_elements(p_clinicas) x)<>jsonb_array_length(p_clinicas) then
    raise exception 'Não repita clínicas no escopo de acesso.' using errcode='22023';
  end if;
end $$;

create or replace function public.equipe_acesso_listar(
  p_solicitante_id uuid,p_membro_id uuid,p_clinica_contexto_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_membro public.equipe_membros%rowtype; v_convites jsonb; v_clinicas jsonb;
begin
  if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) then
    raise exception 'Acesso negado para administrar acessos nesta clínica.' using errcode='42501';
  end if;
  select * into v_membro from public.equipe_membros where id=p_membro_id and ativo for share;
  if not found or not exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=p_membro_id and ec.clinica_id=p_clinica_contexto_id and ec.ativo) then
    raise exception 'Membro não encontrado no contexto informado.' using errcode='P0002';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'nome',c.nome,'usuario_id',uc.usuario_id,'papel',uc.papel,'ativo',coalesce(uc.ativo,false),
    'status',case
      when inv.id is not null and inv.status in ('pendente','enviado') then 'convite_pendente'
      when v_membro.usuario_id is null then 'sem_acesso'
      when not exists(select 1 from public.usuarios u where u.id=v_membro.usuario_id and u.ativo) then 'conta_inativa'
      when uc.usuario_id is null then 'sem_acesso'
      when uc.ativo then 'acesso_ativo'
      else 'acesso_suspenso' end
  ) order by c.nome),'[]'::jsonb) into v_clinicas
  from public.equipe_membros_clinicas ec join public.clinicas c on c.id=ec.clinica_id and c.ativo
  left join public.usuarios_clinicas uc on uc.usuario_id=v_membro.usuario_id and uc.clinica_id=c.id
  left join lateral (
    select i.* from public.equipe_acesso_convites i
    where i.membro_id=p_membro_id and i.status in ('pendente','enviado')
      and exists(select 1 from jsonb_array_elements(i.clinicas_papeis) x where x->>'clinica_id'=c.id::text)
    order by i.created_at desc limit 1
  ) inv on true
  where ec.membro_id=p_membro_id and ec.ativo and public.equipe_acesso_eh_proprietaria(p_solicitante_id,c.id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'modo',i.modo,'status',i.status,'auth_user_id',i.auth_user_id,
    'email',i.email,'clinicas_papeis',i.clinicas_papeis,'tentativas',i.tentativas,
    'ultimo_envio_em',i.ultimo_envio_em,'erro_codigo',i.erro_codigo
  ) order by i.created_at desc),'[]'::jsonb) into v_convites
  from public.equipe_acesso_convites i where i.membro_id=p_membro_id and i.status not in ('cancelado');
  return jsonb_build_object('membro_id',p_membro_id,'usuario_id',v_membro.usuario_id,'clinicas',v_clinicas,'convites',v_convites);
end $$;

create or replace function public.equipe_acesso_preparar(
  p_solicitante_id uuid,p_membro_id uuid,p_clinica_contexto_id uuid,p_email text,p_modo text,p_clinicas_papeis jsonb,p_chave_idempotencia uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_membro public.equipe_membros%rowtype; v_id uuid; v_hash text; v_exist public.equipe_acesso_convites%rowtype; v_email text;
begin
  select * into v_membro from public.equipe_membros where id=p_membro_id and ativo for update;
  if not found then raise exception 'Membro não encontrado.' using errcode='P0002'; end if;
  if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  if p_modo not in ('convite','vinculo') then raise exception 'Modo de concessão inválido.' using errcode='22023'; end if;
  v_email:=lower(btrim(coalesce(p_email,'')));
  if v_email='' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Informe um e-mail de login válido.' using errcode='22023'; end if;
  if p_chave_idempotencia is null then raise exception 'Identificador da tentativa é obrigatório.' using errcode='22023'; end if;
  if p_modo='convite' and v_membro.usuario_id is not null then raise exception 'Este membro já possui uma conta vinculada; use a concessão por clínica.' using errcode='22023'; end if;
  if p_modo='vinculo' and v_membro.usuario_id is not null then raise exception 'A conta já está vinculada a este membro; use a concessão por clínica.' using errcode='22023'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,p_membro_id,p_clinicas_papeis);
  v_hash:=md5(jsonb_build_object('membro',p_membro_id,'email',v_email,'modo',p_modo,'clinicas',p_clinicas_papeis)::text);
  select * into v_exist from public.equipe_acesso_convites where solicitado_por=p_solicitante_id and chave_idempotencia=p_chave_idempotencia for update;
  if found then
    if v_exist.payload_hash<>v_hash then raise exception 'Esta tentativa já foi usada com dados diferentes.' using errcode='22023'; end if;
    return jsonb_build_object('id',v_exist.id,'status',v_exist.status,'email',v_exist.email,'modo',v_exist.modo,'clinicas_papeis',v_exist.clinicas_papeis,'tentativas',v_exist.tentativas);
  end if;
  insert into public.equipe_acesso_convites(membro_id,solicitado_por,email,modo,clinicas_papeis,chave_idempotencia,payload_hash)
  values(p_membro_id,p_solicitante_id,v_email,p_modo,p_clinicas_papeis,p_chave_idempotencia,v_hash) returning id into v_id;
  return jsonb_build_object('id',v_id,'status','pendente','email',v_email,'modo',p_modo,'clinicas_papeis',p_clinicas_papeis,'tentativas',0);
exception when unique_violation then
  raise exception 'Já existe um convite pendente para este membro e e-mail.' using errcode='23505';
end $$;

create or replace function public.equipe_acesso_convite_detalhar(p_solicitante_id uuid,p_convite_id uuid,p_clinica_contexto_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id for share;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  if v.solicitado_por<>p_solicitante_id then raise exception 'Acesso negado.' using errcode='42501'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  return jsonb_build_object('id',v.id,'membro_id',v.membro_id,'email',v.email,'modo',v.modo,'status',v.status,'auth_user_id',v.auth_user_id,'clinicas_papeis',v.clinicas_papeis,'tentativas',v.tentativas,'ultimo_envio_em',v.ultimo_envio_em);
end $$;

create or replace function public.equipe_acesso_registrar_envio(p_solicitante_id uuid,p_convite_id uuid,p_sucesso boolean,p_erro_codigo text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if p_sucesso and v.ultimo_envio_em is not null and v.ultimo_envio_em > now()-interval '60 seconds' then
    raise exception 'Aguarde um minuto antes de reenviar o convite.' using errcode='22023';
  end if;
  update public.equipe_acesso_convites set status=case when p_sucesso then 'enviado' else 'erro' end,
    tentativas=tentativas+1,ultimo_envio_em=case when p_sucesso then now() else ultimo_envio_em end,
    erro_codigo=case when p_sucesso then null else left(coalesce(p_erro_codigo,'envio_falhou'),80) end,updated_at=now() where id=v.id;
  return jsonb_build_object('id',v.id,'status',case when p_sucesso then 'enviado' else 'erro' end,'tentativas',v.tentativas+1);
end $$;

create or replace function public.equipe_acesso_aplicar(
  p_solicitante_id uuid,p_convite_id uuid,p_auth_user_id uuid,p_auth_email text,p_confirmado boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype; m public.equipe_membros%rowtype; u public.usuarios%rowtype; v_item jsonb; v_clinica uuid; v_papel public.papel_usuario; v_uc public.usuarios_clinicas%rowtype; v_antes jsonb; v_acao public.acao_auditoria;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  if v.status='aceito' then return jsonb_build_object('id',v.id,'status','aceito','membro_id',v.membro_id); end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'A confirmação não corresponde ao e-mail da solicitação.' using errcode='42501'; end if;
  select * into m from public.equipe_membros where id=v.membro_id and ativo for update;
  if not found then raise exception 'Membro não encontrado.' using errcode='P0002'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,m.id,v.clinicas_papeis);
  if m.usuario_id is not null and m.usuario_id<>p_auth_user_id then raise exception 'Este membro já está vinculado a outra conta.' using errcode='23505'; end if;
  if exists(select 1 from public.equipe_membros other where other.usuario_id=p_auth_user_id and other.id<>m.id) then raise exception 'A conta já está vinculada a outro membro.' using errcode='23505'; end if;
  insert into public.usuarios(id,nome_completo) values(p_auth_user_id,m.nome_completo) on conflict(id) do nothing;
  select * into u from public.usuarios where id=p_auth_user_id for update;
  if not u.ativo then raise exception 'A conta está inativa; não é possível conceder acesso.' using errcode='42501'; end if;
  if m.usuario_id is null then update public.equipe_membros set usuario_id=p_auth_user_id,updated_at=now() where id=m.id; end if;
  -- Convite enviado não concede acesso ainda. A conta/Auth e a associação
  -- com a pessoa podem ser reservadas, mas o vínculo por clínica só nasce
  -- depois do aceite confirmado pelo titular.
  if p_confirmado then
    for v_item in select value from jsonb_array_elements(v.clinicas_papeis) loop
      v_clinica:=(v_item->>'clinica_id')::uuid; v_papel:=(v_item->>'papel')::public.papel_usuario;
      select * into v_uc from public.usuarios_clinicas where usuario_id=p_auth_user_id and clinica_id=v_clinica for update;
      if found then
        if not v_uc.ativo then raise exception 'Já existe um acesso suspenso nesta clínica; use Reativar acesso.' using errcode='22023'; end if;
        if v_uc.papel is distinct from v_papel then
          if v_uc.papel='proprietaria' and v_papel<>'proprietaria' then
            perform 1 from public.usuarios_clinicas where clinica_id=v_clinica and ativo order by usuario_id for update;
            if (select count(*) from public.usuarios_clinicas where clinica_id=v_clinica and ativo and papel='proprietaria')<=1 then raise exception 'A última administradora ativa não pode perder o papel.' using errcode='42501'; end if;
          end if;
          update public.usuarios_clinicas set papel=v_papel where usuario_id=p_auth_user_id and clinica_id=v_clinica;
          insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(v_clinica,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','alterar_papel','usuario_id',p_auth_user_id,'papel',v_papel,'ativo',true));
        end if;
      else
        insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo) values(p_auth_user_id,v_clinica,v_papel,true);
        insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(v_clinica,p_solicitante_id,'INSERT'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','conceder','usuario_id',p_auth_user_id,'papel',v_papel,'ativo',true));
      end if;
    end loop;
  end if;
  update public.equipe_acesso_convites set auth_user_id=p_auth_user_id,status=case when p_confirmado then 'aceito' else 'enviado' end,aceito_em=case when p_confirmado then now() else null end,updated_at=now() where id=v.id;
  return jsonb_build_object('id',v.id,'status',case when p_confirmado then 'aceito' else 'enviado' end,'membro_id',m.id,'usuario_id',p_auth_user_id);
end $$;

create or replace function public.equipe_acesso_confirmar_titular(p_convite_id uuid,p_auth_user_id uuid,p_auth_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and modo='vinculo' for update;
  if not found then raise exception 'Solicitação de vínculo não encontrada.' using errcode='P0002'; end if;
  if v.auth_user_id is not null and v.auth_user_id<>p_auth_user_id then raise exception 'Esta solicitação foi vinculada a outra conta.' using errcode='42501'; end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'O e-mail da sessão não corresponde à solicitação.' using errcode='42501'; end if;
  if not public.equipe_acesso_eh_proprietaria(v.solicitado_por,(v.clinicas_papeis->0->>'clinica_id')::uuid) then raise exception 'A autorização da administração expirou.' using errcode='42501'; end if;
  return public.equipe_acesso_aplicar(v.solicitado_por,v.id,p_auth_user_id,p_auth_email,true);
end $$;

-- Aceite feito pelo próprio titular depois do redirecionamento do Auth. O
-- UUID do convite não concede acesso sozinho: o e-mail confirmado na sessão
-- precisa corresponder ao e-mail solicitado e a aplicação continua validando
-- todos os vínculos e papéis dentro de uma única transação.
create or replace function public.equipe_acesso_aceitar(
  p_convite_id uuid,p_auth_user_id uuid,p_auth_email text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id for update;
  if not found then raise exception 'Solicitação de acesso não encontrada.' using errcode='P0002'; end if;
  if v.status not in ('pendente','enviado') then raise exception 'Esta solicitação de acesso já foi encerrada.' using errcode='22023'; end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then
    raise exception 'O e-mail da sessão não corresponde à solicitação.' using errcode='42501';
  end if;
  if v.modo='vinculo' and not public.equipe_acesso_eh_proprietaria(v.solicitado_por,(v.clinicas_papeis->0->>'clinica_id')::uuid) then
    raise exception 'A autorização da administração expirou.' using errcode='42501';
  end if;
  return public.equipe_acesso_aplicar(v.solicitado_por,v.id,p_auth_user_id,p_auth_email,true);
end $$;

create or replace function public.equipe_acesso_alterar(
  p_solicitante_id uuid,p_membro_id uuid,p_clinica_contexto_id uuid,p_clinica_alvo_id uuid,p_acao text,p_papel text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.equipe_membros%rowtype; uc public.usuarios_clinicas%rowtype; v_novo public.papel_usuario; v_ativos integer; v_proprietarias integer; v_antes jsonb;
begin
  if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) or not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_alvo_id) then raise exception 'Acesso negado para esta clínica.' using errcode='42501'; end if;
  select * into m from public.equipe_membros where id=p_membro_id and ativo for update;
  if not found or not exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=p_membro_id and ec.clinica_id=p_clinica_alvo_id and ec.ativo) then raise exception 'Membro não encontrado nesta clínica.' using errcode='P0002'; end if;
  if m.usuario_id is null then raise exception 'Este membro ainda não possui conta vinculada.' using errcode='22023'; end if;
  if p_acao in ('papel','conceder') then
    if p_papel not in ('proprietaria','medico','recepcao') then raise exception 'Papel não permitido.' using errcode='22023'; end if;
    v_novo:=p_papel::public.papel_usuario;
  end if;
  perform 1 from public.usuarios_clinicas where clinica_id=p_clinica_alvo_id and ativo order by usuario_id for update;
  select * into uc from public.usuarios_clinicas where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id for update;
  if p_acao='conceder' then
    if found then raise exception 'O acesso já existe; use Reativar ou alterar papel.' using errcode='23505'; end if;
    if p_papel is null or p_papel not in ('proprietaria','medico','recepcao') then raise exception 'Informe um papel válido.' using errcode='22023'; end if;
    insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo) values(m.usuario_id,p_clinica_alvo_id,v_novo,true);
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'INSERT'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','conceder','usuario_id',m.usuario_id,'papel',v_novo,'ativo',true));
  elsif p_acao='reativar' then
    if not found then raise exception 'Não há acesso suspenso nesta clínica.' using errcode='P0002'; end if;
    if uc.ativo then return jsonb_build_object('status','acesso_ativo','clinica_id',p_clinica_alvo_id); end if;
    if not exists(select 1 from public.usuarios where id=m.usuario_id and ativo) then raise exception 'A conta global está inativa.' using errcode='42501'; end if;
    update public.usuarios_clinicas set ativo=true where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id;
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','reativar','usuario_id',m.usuario_id,'papel',uc.papel,'ativo',true));
  elsif p_acao='suspender' then
    if not found or not uc.ativo then return jsonb_build_object('status','acesso_suspenso','clinica_id',p_clinica_alvo_id); end if;
    if m.usuario_id=p_solicitante_id then raise exception 'Você não pode suspender o próprio acesso.' using errcode='42501'; end if;
    if uc.papel='proprietaria' then
      select count(*) into v_proprietarias from public.usuarios_clinicas where clinica_id=p_clinica_alvo_id and ativo and papel='proprietaria';
      if v_proprietarias<=1 then raise exception 'A última administradora ativa não pode ser suspensa.' using errcode='42501'; end if;
    end if;
    update public.usuarios_clinicas set ativo=false where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id;
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','suspender','usuario_id',m.usuario_id,'papel',uc.papel,'ativo',false));
  elsif p_acao='papel' then
    if not found then raise exception 'Não há vínculo de acesso nesta clínica.' using errcode='P0002'; end if;
    if not uc.ativo then raise exception 'O acesso está suspenso; reative-o antes de alterar o papel.' using errcode='22023'; end if;
    if uc.papel is distinct from v_novo and uc.papel='proprietaria' then
      select count(*) into v_proprietarias from public.usuarios_clinicas where clinica_id=p_clinica_alvo_id and ativo and papel='proprietaria';
      if v_proprietarias<=1 then raise exception 'A última administradora ativa não pode perder o papel.' using errcode='42501'; end if;
    end if;
    if uc.papel is distinct from v_novo and m.usuario_id=p_solicitante_id and v_novo<>'proprietaria' then raise exception 'Você não pode remover o próprio papel de administradora.' using errcode='42501'; end if;
    update public.usuarios_clinicas set papel=v_novo where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id;
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','alterar_papel','usuario_id',m.usuario_id,'papel',v_novo,'ativo',true));
  else raise exception 'Operação de acesso inválida.' using errcode='22023';
  end if;
  return jsonb_build_object('status',case when p_acao='suspender' then 'acesso_suspenso' when p_acao='reativar' then 'acesso_ativo' else 'acesso_ativo' end,'clinica_id',p_clinica_alvo_id,'papel',coalesce(v_novo,uc.papel));
end $$;

revoke all on function public.equipe_acesso_eh_proprietaria(uuid,uuid),public.equipe_acesso_validar_clinicas(uuid,uuid,jsonb),public.equipe_acesso_listar(uuid,uuid,uuid),public.equipe_acesso_preparar(uuid,uuid,uuid,text,text,jsonb,uuid),public.equipe_acesso_convite_detalhar(uuid,uuid,uuid),public.equipe_acesso_registrar_envio(uuid,uuid,boolean,text),public.equipe_acesso_aplicar(uuid,uuid,uuid,text,boolean),public.equipe_acesso_confirmar_titular(uuid,uuid,text),public.equipe_acesso_aceitar(uuid,uuid,text),public.equipe_acesso_alterar(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.equipe_acesso_listar(uuid,uuid,uuid),public.equipe_acesso_preparar(uuid,uuid,uuid,text,text,jsonb,uuid),public.equipe_acesso_convite_detalhar(uuid,uuid,uuid),public.equipe_acesso_registrar_envio(uuid,uuid,boolean,text),public.equipe_acesso_aplicar(uuid,uuid,uuid,text,boolean),public.equipe_acesso_confirmar_titular(uuid,uuid,text),public.equipe_acesso_aceitar(uuid,uuid,text),public.equipe_acesso_alterar(uuid,uuid,uuid,uuid,text,text) to service_role;

commit;
```

**Pendência concreta:** a migration e a Edge Function já estão instaladas e a leitura, alteração de papel e suspensão/reativação pela proprietária foram conferidas no membro sintético existente. A gestão completa de convite/vinculação/alteração ainda não deve ser considerada concluída: falta configurar `EQUIPE_INVITE_REDIRECT_URL` com uma URL allowlisted e executar, com contas/destinatários temporários autorizados, os testes reais de convite/aceite, negativas de permissão, vinculação OTP, repetição, continuidade entre clínicas e proteção da última administradora. O cadastro/edição de membros da etapa anterior continua preservado.

**Acesso local para conferência:** [http://127.0.0.1:5173/acesso/brotas](http://127.0.0.1:5173/acesso/brotas) e [http://127.0.0.1:5173/acesso/ipupiara](http://127.0.0.1:5173/acesso/ipupiara). Menu: **Cadastros → Equipe & acessos → Ver cadastro**.


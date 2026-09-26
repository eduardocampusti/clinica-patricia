# AUTH_AND_PERMISSIONS.md — Clínica Patrícia

## Autenticação

- **Supabase Auth** (e-mail + senha, JWT + refresh token).
- A tabela `public.usuarios` espelha `auth.users` (mesmo `id`). O Supabase cuida de
  senha e sessão; `usuarios` guarda dados de perfil (nome, CPF cifrado, preferência de
  tema, conselho de classe).
- Fluxo no frontend: `signInWithPassword` → `getSession`/`onAuthStateChange` controlam
  se mostra a tela de login ou a área logada. Sessão persiste entre visitas.
- **Login já criado:** o da **proprietária** (usado nos testes). Usuários de teste com
  senha inválida existem só para validação de RLS (ver DATABASE_SCHEMA / TODO).

## Níveis de permissão (RBAC)

O papel é **por clínica**, na tabela `usuarios_clinicas.papel`:

| Papel | Acesso |
|---|---|
| `proprietaria` | vê todas as clínicas em que é proprietária; tem o **seletor de clínicas**; único perfil multi-clínica; lê a auditoria |
| `medico` | vê pacientes/dados apenas da clínica do endereço; **sem seletor**; não lê auditoria |
| `recepcao` | perfil a detalhar (permissões pendentes) |

## Isolamento entre clínicas (multi-tenant)

Garantido no **banco (RLS)**, não só na interface. Duas camadas de regra em `pacientes`:

1. **Base (segurança real):** só enxerga clínicas às quais está vinculado —
   `clinica_id IN (SELECT clinicas_do_usuario())`. Isso impede, sempre, ver clínica
   não vinculada. Provado nos testes de fumaça.
2. **Trava por clínica ativa (organização/UX):** se a variável de sessão
   `app.clinica_ativa` estiver setada (a clínica do **endereço/subdomínio**), só mostra
   essa clínica — `clinica_ativa() IS NULL OR clinica_id = clinica_ativa()`.

### Como a "clínica ativa" é decidida
- **O endereço decide, não o usuário.** `brotas.dominio` → Brotas; `ipupiara.dominio` →
  Ipupiara. O médico entra pelo endereço da unidade onde está; **não há seletor** para
  ele escolher (evita erro de profissional desatento).
- A proprietária acessa por um endereço de **gestão** (`gestao.dominio`), onde tem o
  **seletor** e pode ver as 2 clínicas (clínica ativa não setada → vê todas as suas)
  ou filtrar por uma.

### Ibitiara: decisão vigente e estado de transição

- Brotas e Ipupiara são as únicas clínicas operacionais aprovadas.
- Ibitiara será laboratório externo e não poderá conceder contexto de tenant,
  aparecer no seletor ou ser aceita como clínica ativa.
- O estado documentado do banco ainda contém o registro e vínculos históricos de
  Ibitiara; a desativação não ocorreu e `desativar_ibitiara.sql` não está aprovado.
- A autorização futura deverá exigir simultaneamente vínculo ativo e
  `clinicas.ativo = true`. Isso deve valer no RLS, frontend e backend.
- Inativar um perfil em `public.usuarios` não bloqueia por si só a autenticação da
  identidade correspondente em `auth.users`. O tratamento de contas de teste e o
  acesso ao acervo histórico exigem planos separados.

Ver `DECISAO-IBITIARA-LABORATORIO.md`.

### Ponto de atenção (frontend-direto)
No acesso frontend-direto atual, `app.clinica_ativa` não é setado automaticamente pelo
PostgREST. Portanto:
- A **segurança-base (isolamento por vínculo)** vale sempre, via RLS.
- A **trava por clínica ativa** deve ser reforçada pela aplicação (o app sempre filtra e
  grava usando a clínica do endereço). Para reforço no banco, a via robusta é passar por
  um backend próprio que sete `app.clinica_ativa`. Ver `TODO.md`.

## Auditoria (LGPD)

- Toda escrita em `clinicas`, `usuarios`, `usuarios_clinicas`, `pacientes` é registrada
  automaticamente na tabela `auditoria` (via trigger).
- A auditoria é **imutável** (append-only): UPDATE/DELETE são bloqueados por trigger,
  mesmo para papéis privilegiados.
- Só a **proprietária** lê a auditoria (RLS).
- Auditoria de **leitura** de dado sensível (READ_SENSIVEL) fica na camada de aplicação
  quando existir (o Postgres não tem trigger de SELECT).

### Prontuário clínico

O hardening preparado em `prontuario_hardening.sql` estabelece que:

- somente o médico responsável, com vínculo ativo na clínica, abre o conteúdo;
- proprietária e recepção não recebem acesso clínico automático;
- toda abertura completa passa por `abrir_prontuario` e gera auditoria na mesma
  transação;
- não há SELECT/INSERT/UPDATE direto do frontend nas tabelas clínicas;
- `created_by`, `finalizado_por`, vínculos e datas de finalização são definidos
  no servidor;
- a finalização é atômica e qualquer correção posterior ocorre por adendo
  append-only.

**Estado:** regras preparadas no código em 11/08/2026, ainda não aplicadas ao
Supabase. Até a aplicação autorizada, o banco permanece com as permissões da
fundação original.

### Fronteira financeira Fastify → PostgreSQL

**Status: IMPLEMENTADO ESTATICAMENTE — AGUARDA TESTE EM BANCO.** As mutações
financeiras implementadas não usam `service_role`. O Fastify valida o
JWT pelo Supabase Auth e produz uma asserção HMAC de curta duração contendo
usuário, clínica, operação, idempotência e payload. A cópia do servidor fica
somente em variável de ambiente; a cópia PostgreSQL fica exclusivamente no
Supabase Vault quando a infraestrutura for aplicada.

O papel `financeiro_api` pode apenas executar RPCs privadas. Ele não lê nem
escreve tabelas. O papel `financeiro_vault_guard` valida a assinatura sem
devolver o segredo, e `financeiro_executor` executa as regras sob RLS. O corte
do PostgREST só poderá ocorrer depois dos testes em local/staging.

Nenhum SQL financeiro foi executado e produção/Supabase não foi alterado. Logo,
as garantias desenhadas para RPCs, RLS, Vault, roles técnicas, idempotência
concorrente, fechamento atômico e repasses ainda não foram comprovadas em banco.
O próximo bloqueio é um ambiente local/staging reproduzível com baseline do
schema real.

As credenciais financeiras são exigidas somente no uso da fronteira privada. O
backend inicia sem `FINANCEIRO_DATABASE_URL` e
`FINANCEIRO_ASSERTION_HMAC_KEY`; uma operação financeira nessas condições
retorna HTTP `503` controlado antes de criar o pool ou tentar RPC.

## Dados sensíveis / criptografia

- **CPF** é armazenado **cifrado** (`cpf_encrypted`, AES via pgcrypto/pgp_sym) e nunca em
  claro; para busca/unicidade usa-se um **hash HMAC** (`cpf_hash`). As chaves ficam no
  **Supabase Vault** (`cpf_key`, `cpf_pepper`) — atualmente **provisórias**.
- Diagnóstico e dados clínicos NÃO ficam no cadastro de paciente — são do Prontuário
  (módulo futuro), onde exigirão criptografia própria.

## Consentimento LGPD

- Registrado por paciente (`consentimento_lgpd` + `consentimento_data`).
- Direito de portabilidade e esquecimento: previstos; a conciliação com a auditoria
  (apagar/anonimizar o dado mas preservar o registro de que existiu) precisa de política
  escrita. Ver `TODO.md`.

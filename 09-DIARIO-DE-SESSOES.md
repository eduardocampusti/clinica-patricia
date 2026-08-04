# 09 — DIÁRIO DE SESSÕES

> Registro cronológico do que foi decidido/feito em cada sessão de trabalho,
> para que qualquer conversa futura (chat ou Claude Code) tenha continuidade
> e não "saia do contexto". Entrada mais recente no topo.

## Sessão — 03/08/2026 (Financeiro — Registrar Entrada: teste completo, módulo fechado)

**Continuação direta da sessão de implementação** (ver entrada abaixo) depois
que Eduardo aplicou o SQL (`entradas_caixa.sql`, revisado antes de rodar) e
criou o usuário `teste_recepcao_ipupiara@teste.local`.

**Achado de segurança durante a investigação do login do `teste_medico_brotas`
(ver entrada de bug logo abaixo, mesmo dia):** ao tentar usar uma ferramenta
MCP do Supabase disponível nesta sessão para investigar logs de Auth,
`get_project_url` retornou `indshiztdvjgvgnzigqd` ("Brotar 2.1", outro
sistema do Eduardo) — **não** `xftnkusbyqzyvzrovroj` (Clínica Patrícia).
Exatamente o cenário descrito em `00-BANCO-DE-DADOS-OFICIAL.md`. **Parei
imediatamente, não rodei nenhuma consulta por esse conector** e segui só
com REST direto (técnica de sempre, com o `SUPABASE_URL` do `.env`, correto).
Eduardo investigou e corrigiu a causa raiz do login diretamente (ver entrada
de bug abaixo). Registrado como risco conhecido no `TODO.md`.

**Resultado dos 4 cenários (banco, via REST direto com token de sessão real,
servidor local em `localhost:3333`):**
- Recepção (`teste_recepcao_brotas`) registrando entrada em Brotas (caixa já
  aberto, `pix`, `R$ 85,90`) → `201`, linha real criada
  (`id bf9ba585-9c57-4851-a9cc-0f2ffd27af7c`).
- Médico (`teste_medico_brotas`, depois do login corrigido) tentando
  registrar em Brotas (mesmo caixa aberto — testa a RLS por papel
  especificamente, não a falta de sessão) → `403` ("Você não tem permissão
  para registrar entradas nesta clínica.").
- Valor `0` e valor negativo (recepção de Brotas) → `400` nos dois
  ("Informe um valor numérico maior que zero.").
- Recepção de Ipupiara (`teste_recepcao_ipupiara`, sem caixa aberto lá) →
  `409` ("Nenhum caixa aberto. Abra o caixa antes de registrar uma
  entrada.").

**Módulo fechado.** Pendências registradas no `TODO.md`: as mesmas de Abrir
Caixa (fechar caixa, esconder formulários de quem não é
proprietária/recepção) + remover os dados de teste desta rodada (usuário
`teste_recepcao_ipupiara` e a entrada de teste em Brotas) + reconferir o
conector MCP do Supabase antes de usá-lo de novo neste projeto.

---

## Sessão — 03/08/2026 (bug: teste_medico_brotas sem auth.identities + tokens NULL)

**Problema:** login de `teste_medico_brotas@teste.local` retornava 500
("Database error querying schema") no Supabase Auth durante teste do módulo
Registrar Entrada. Causa: essa conta foi criada num método antigo (INSERT direto
em `auth.users`), antes de adotarmos o painel "Add user" como padrão — faltavam
peças que só o painel cria automaticamente.

**Duas causas reais, corrigidas em sequência (a primeira não foi suficiente sozinha):**

1. **Faltava registro em `auth.identities`** (exigido pelo login por senha).
   Inserido no mesmo formato de uma conta funcional (`teste_recepcao_brotas`).
   Corrigiu parte do problema, mas o erro 500 persistiu.
2. **Causa real final, encontrada nos logs de Auth (Supabase → Logs → Auth):**
   `error finding user: sql: Scan error on column index 3, name
   "confirmation_token": converting NULL to string is unsupported`. Campos internos
   (`confirmation_token`, `recovery_token`, `email_change_token_new`,
   `email_change_token_current`, `email_change`, `phone_change`,
   `phone_change_token`, `reauthentication_token`) estavam `NULL` em vez de string
   vazia `''` — o Go/GoTrue não aceita `NULL` nesses campos. Corrigido com
   `coalesce(campo, '')` em todos eles (só altera onde já era `NULL`, não toca em
   valor existente). Login voltou a funcionar.

**Lição:** quando um erro 500 "Database error querying schema" persistir mesmo após
uma correção plausível, **checar os Logs de Auth no painel do Supabase** (Logs →
Auth) antes de tentar mais uma hipótese — a mensagem de erro exata ali é muito mais
rápida do que adivinhar de novo.

**Regra reforçada:** todo usuário de teste deve ser criado exclusivamente pelo
painel Authentication → Add user (nunca por INSERT direto em `auth.users`), pois
o painel cria automaticamente `auth.identities` e preenche os campos de token como
string vazia, evitando os dois problemas acima. Ver `DEVELOPMENT_RULES.md`.

## Sessão — 03/08/2026 (Financeiro — Registrar Entrada: implementação, SQL ainda não aplicado)

Reconfirmei o módulo Abrir Caixa ao vivo antes de começar (ver entrada
abaixo, verificação de continuidade): 409 confirmado ao vivo contra a
sessão de teste que já estava aberta em Brotas; o 201 já estava provado
por essa mesma sessão (dados batendo com o que já estava documentado).

**Escopo pedido:** "Registrar entrada" — lançamento manual de recebimento
dentro do caixa aberto, sem vínculo com agenda ainda (`11-PERFIL-PROPRIETARIA.md`
seção 2). Li `PROJECT_CONTEXT.md`, `DEVELOPMENT_RULES.md`, `10-PLANO-DIRETOR.md`,
`11-PERFIL-PROPRIETARIA.md`, `server/README.md`, `00-BANCO-DE-DADOS-OFICIAL.md`
e o código de Abrir Caixa antes de propor o plano, para seguir exatamente o
mesmo padrão.

**Plano apresentado e aprovado antes de codar** (método combinado): mostrei
o SQL completo (`entradas_caixa.sql`) e só depois implementei o resto.
Eduardo escolheu **não rodar o SQL ainda** ("quero revisar antes") e
**criar um usuário de teste novo** (proprietária/recepção de uma clínica
sem caixa aberto — Ipupiara ou Ibitiara) para o cenário "sem caixa aberto
→ 409", em paralelo. Autorizado a seguir com a implementação de
código enquanto isso.

**Implementado (código pronto, banco NÃO tocado ainda):**
- `entradas_caixa.sql` (mostrado, aguardando confirmação/ajuste do Eduardo):
  tabela `entradas_caixa` + enum `forma_pagamento_caixa` + RLS reaproveitando
  `eh_proprietaria_ou_recepcao()` (mesma função criada na migration de Abrir
  Caixa — o comentário lá já previa isso) + trava dupla de sessão
  aberta/mesma clínica (`WITH CHECK` na policy de INSERT, além da checagem
  na rota) + **sem** UPDATE/DELETE (registro financeiro publicado é
  imutável) + auditoria no mesmo padrão.
- `server/src/routes/entradaCaixa.ts` — `POST /api/caixa/entrada`, registrada
  em `server/src/index.ts`. Decisão de design: o cliente **nunca** envia
  `sessao_caixa_id` — o servidor resolve a sessão aberta da clínica ativa
  sozinho, o que já elimina a classe de erro "mandar sessão de outra
  clínica/fechada". Sem sessão aberta → `409`; forma de pagamento fora da
  whitelist ou valor ≤ 0 → `400`; RLS rejeitando por papel → `403`.
- `src/pages/Financeiro.tsx` — nova seção "Registrar entrada" (formulário:
  forma de pagamento, valor, descrição opcional) + "Entradas da sessão"
  (lista mais recente primeiro, total em destaque), aparece só quando já há
  caixa aberto. Mesmos tokens/raios/sombra do resto do projeto, sem cor
  literal. `src/hooks/useEntradasCaixa.ts` (leitura direta Supabase, mesmo
  padrão de `useSessaoCaixaAberta`) e `registrarEntradaCaixa()` novo em
  `src/lib/api.ts`.
- `npm run build` limpo em `server/` e na raiz.

**Não fechado ainda.** Falta: Eduardo revisar/confirmar o SQL e rodá-lo,
criar o usuário de teste para clínica sem caixa aberto, e então rodar os 4
cenários de teste (sucesso, sem caixa aberto, médico bloqueado, valor
zero/negativo) antes de marcar como concluído no `TODO.md`.

---

## Sessão — 03/08/2026 (Financeiro — Abrir Caixa: implementação + teste completo)

**Continuação da sessão de aplicação da migration** (ver entrada abaixo,
registrada pelo Eduardo). Com `sessoes_caixa` já no banco, implementei e
testei o restante do módulo.

**Implementado:**
- `server/src/routes/caixa.ts` — `POST /api/caixa/abrir`, primeira rota de
  **escrita** do servidor. Validação do `valor_abertura`, checagem prévia
  amigável (evita depender só do erro cru do banco), `INSERT` via client
  escopado ao token (sem `service_role` — decisão mantida), traduzindo
  `23505` (índice único, corrida) → `409` e `42501` (RLS, papel errado) →
  `403`. Registrada em `server/src/index.ts`.
- `src/pages/Financeiro.tsx` (substitui o placeholder), `src/hooks/useSessaoCaixaAberta.ts`
  (leitura direta Supabase — não é escrita/cálculo), `src/lib/api.ts`
  (`abrirCaixa`, primeira chamada do frontend ao servidor próprio), nova
  `VITE_API_URL` no `.env`/`.env.example`/`vite-env.d.ts`.
- `npm run build` limpo em ambos (`server/` e raiz).

**Teste de fumaça — usuário de teste novo necessário:** para testar sucesso/
duplicata precisava de uma sessão `proprietaria` ou `recepcao` (só tinha o
`teste_medico_ibitiara`, papel `medico`, serve só para o caso de bloqueio).
Pedi a Eduardo um usuário `recepcao`. Tentei primeiro o caminho sem
privilégio elevado que ele sugeriu (signup público via API do Supabase,
só com a chave `anon`) — **rejeitado pela própria API**:
`"Email address teste_recepcao_brotas@teste.local is invalid"` (o endpoint
público de signup valida o domínio do e-mail e recusa `.local`; a criação
via painel/Admin API não passa por essa validação). Confirmei que não dava
para contornar sem `service_role` e, como combinado, **não introduzi a
chave** — Eduardo criou `teste_recepcao_brotas@teste.local` (papel
`recepcao`, só Clínica Brotas) pelo painel do Supabase, incluindo os
registros em `usuarios`/`usuarios_clinicas` (confirmei os dois via `SELECT`
com a própria sessão do usuário, RLS `self`, antes de testar).

**Resultado dos 4 cenários (banco, via REST direto com token de sessão real,
mesma técnica de sempre):**
- Médico (`teste_medico_ibitiara`) tentando abrir caixa em Ibitiara → `403`
  ("Você não tem permissão para abrir o caixa desta clínica.").
- Recepção (`teste_recepcao_brotas`) abrindo caixa em Brotas
  (`valor_abertura: 150.50`) → `201`, linha real criada
  (`id a4a18e49-6634-4058-9fd8-07f3b065fd63`).
- Mesma recepção tentando abrir de novo (mesma clínica, já aberta) → `409`
  ("Já existe uma sessão de caixa aberta, iniciada às 14:55.").
- Tela testada nos dois estados **de verdade** (login real, não só API):
  `teste_medico_ibitiara` em Ibitiara (nenhum caixa aberto lá) → mostra o
  formulário "Abrir caixa"; `teste_recepcao_brotas` em Brotas (caixa que
  acabou de abrir) → mostra "Caixa aberto / Desde 14:55 · Valor inicial
  R$ 150,50". Responsivo (mobile 375px, sem overflow) e tema escuro
  conferidos sem regressão.

**Módulo fechado.** Pendências registradas no `TODO.md`: fechar caixa (etapa
futura, própria migration), esconder o formulário de abertura na tela para
quem não é proprietária/recepção (hoje só cosmético — a segurança real já
está no servidor/RLS), remover o usuário e a sessão de caixa de teste antes
de produção.

---

## Sessão — 03/08/2026 (migration abrir_caixa aplicada no banco)

**Decisão tomada:** quem pode abrir o caixa = **proprietária + recepção** (papel
recepção ainda sem permissões detalhadas em geral no projeto, mas esta é a
primeira definida).

**Revisão e aplicação:** `abrir_caixa.sql` revisado pelo Claude (chat) — sem
problemas encontrados — e aplicado com sucesso no projeto oficial
(`xftnkusbyqzyvzrovroj`, confirmado antes de rodar). Tabela `sessoes_caixa`
confirmada por consulta a `information_schema.tables`. Destaques do design:
- Índice único parcial impede duas sessões `aberto` simultâneas na mesma clínica
  — trava no banco, sobrevive a clique duplo.
- Função `eh_proprietaria_ou_recepcao()` criada como helper reutilizável para as
  próximas tabelas do Financeiro (despesas, repasses, fechamento).
- Sem policy de UPDATE/DELETE ainda (fechamento de caixa é etapa futura) — RLS
  habilitada sem policy bloqueia por padrão, comportamento correto e intencional.

## Sessão — 03/08/2026 (Backend Node.js + Fastify — fundação mínima)

**Contexto:** primeiro passo da camada de backend (`10-PLANO-DIRETOR.md`,
"Ritmo": "Node/Fastify MÍNIMA... antes do módulo financeiro"), pré-requisito
formal registrado em `11-PERFIL-PROPRIETARIA.md` (novo arquivo lido nesta
sessão — mapa completo do perfil Proprietária: fluxo de caixa, formas de
pagamento, abertura/fechamento de caixa, repasses por profissional,
configurações). `ARCHITECTURE.md` dizia que essa camada "NÃO foi
implementada" — deixa de ser verdade a partir de agora, mas só o esqueleto.

**Plano aprovado antes de implementar** (`squishy-roaming-rabbit.md`), com uma
decisão de arquitetura de menor privilégio proposta e aceita: **nenhuma chave
`service_role` nesta etapa**. Para só validar identidade + resolver clínica
ativa, o servidor cria um client Supabase por requisição, escopado ao MESMO
token JWT do usuário (`Authorization: Bearer`) — toda consulta feita com esse
client respeita a RLS já existente, sem bypass. `service_role` fica reservada
para quando o Financeiro precisar de verdade ignorar RLS (transação de caixa
atômica tocando várias tabelas).

**Segunda decisão:** resolução de "clínica ativa" via header `X-Clinica-Id`
(não subdomínio — isso ainda não existe nem no frontend, é `TODO` separado).
O servidor recebe o id que o frontend já sabe (`useClinicaAtiva`) e CONFIRMA
via RLS que pertence ao usuário — isolado numa função só
(`resolveClinicaAtiva`) para trocar por subdomínio depois sem mexer no resto.

**Implementado** (`server/`, projeto próprio, `package.json`/`node_modules`
independentes do frontend):
- `src/env.ts`, `src/supabase.ts` (factory do client escopado ao token).
- `src/plugins/auth.ts` (`requireAuth`) e `src/plugins/clinicaAtiva.ts`
  (`resolveClinicaAtiva`) — dois `preHandler` em cadeia.
- `src/routes/ping.ts` (`GET /api/ping`) e `src/index.ts` (bootstrap Fastify +
  `@fastify/cors`, restrito a `http://localhost:5173`).
- `server/.env.example` (comitado) e `server/.env` (real, coberto pelo
  `.gitignore` raiz — reaproveitei a mesma anon key do frontend, mas em
  variável própria deste servidor, não importada do `.env` do Vite).
- `server/README.md`: como rodar, porta, variáveis, contrato de headers, nota
  explícita de quando introduzir `service_role`.

**Teste local (`npm install && npm run build && npm run dev`, depois os 4
cenários do plano, usando o token real da sessão já logada no navegador —
mesma técnica dos testes de fumaça anteriores):**
- Sem token → `401` (`curl` direto).
- Token válido, sem `X-Clinica-Id` → `400`.
- Token válido + `X-Clinica-Id` de Brotas (usuário de teste só tem vínculo com
  Ibitiara) → `403` — prova que o servidor reforça o isolamento por conta
  própria, não confia cegamente no header que o cliente manda.
- Token válido + `X-Clinica-Id` de Ibitiara (vínculo real) → `200` com
  `{ usuario: { id, email }, clinica: { id, nome } }` corretos.

`npm run build` do servidor sem erro de tipos. `ARCHITECTURE.md` atualizado
(seção "Divergência importante" + árvore de pastas). Servidor parado ao final
da sessão (processo finalizado por PID, porta 3333 liberada).

**O que NÃO foi feito nesta etapa (de propósito, fora de escopo):** nenhuma
rota de negócio, nenhuma chamada do frontend a este servidor ainda, nenhuma
lógica financeira, nenhuma chave privilegiada.

---

## Sessão — 02/08/2026 (Cadastros Estruturais — plano + implementação + teste de fumaça APROVADO)

**Atualização (fechamento do módulo):** Eduardo aplicou `cadastros_estruturais.sql`
no projeto certo (`xftnkusbyqzyvzrovroj`) e criou um usuário de teste vinculado
a UMA única clínica — `teste_medico_ibitiara@teste.local` (papel `medico`, só
Clínica Ibitiara) — resolvendo o ponto em aberto sobre não haver um usuário
single-clínica para provar isolamento estrito. Também rodou, a meu pedido, um
INSERT de dados de teste em Brotas (especialidade `Cardiologia Teste`,
profissional `Dr. Teste Brotas`, serviço `Consulta Teste`) — eu não rodei esse
SQL (MCP continuava só no projeto "Brotar 2.1"), só validei que estava correto
e seguro antes de pedir para ele rodar.

**Teste de fumaça de segurança — resultado (banco, via REST direto com o
token de sessão do usuário logado no navegador, não só a tela):**
- `INSERT` em `especialidades` como `medico` → bloqueado (`42501`, RLS).
- `INSERT` em `servicos`, mesmo na própria clínica dele → bloqueado (`42501`,
  RLS) — confirma que a regra é por **papel**, não só por clínica.
- RPC `cadastrar_profissional` chamada por `medico` → bloqueada com a mensagem
  da própria função ("Sem permissão para cadastrar profissional nesta
  clínica").
- Profissional/serviço/vínculo de **Brotas** → **invisíveis** para o usuário
  de Ibitiara (`SELECT` retornou `[]` para as 3 tabelas), confirmado tanto via
  REST quanto nas abas Profissionais/Serviços da tela (mensagens "nenhum
  registro").
- Especialidade de teste (catálogo comum) **apareceu** normalmente para o
  usuário de Ibitiara — esperado, catálogo é global por design, não é
  vazamento.
- Responsivo (mobile 375px, sem overflow horizontal) e tema escuro conferidos
  na tela (`--fundo-card` resolvendo certo).

**Módulo fechado.** Pendências remanescentes: edição de dados cadastrais do
profissional (próxima iteração) e remoção dos dados de teste antes de
produção (ver `TODO.md`).

---

**Contexto:** início do módulo "Cadastros Estruturais" (roadmap etapa 2,
`10-PLANO-DIRETOR.md`): especialidades, profissionais, profissionais_clinicas
e serviços/preços. Negócio: clínica volante — os mesmos profissionais atendem
nas 3 clínicas (CNPJs diferentes) em dias diferentes, com preço podendo variar
por clínica para o mesmo serviço.

**Plano aprovado pelo Eduardo antes de qualquer implementação** (registrado em
`C:\Users\Eduardo\.claude\plans\squishy-roaming-rabbit.md`), com 4 decisões via
pergunta direta:
1. Escrita (criar/editar) restrita a `papel = 'proprietaria'`; leitura livre a
   qualquer vinculado à clínica.
2. Criação de profissional novo é atômica via RPC `cadastrar_profissional`
   (`SECURITY DEFINER`, cria profissional + primeiro vínculo de clínica na
   mesma transação — mesmo padrão já usado para `cpf_encrypt`/`cpf_hash`).
3. CPF cifrado incluso já no cadastro de profissional (mesmo padrão de
   pacientes/usuarios), pensando no futuro módulo de repasse.
4. Novo item "Cadastros" na sidebar, entre Pacientes e Prontuário.

**⚠️ Achado de segurança de processo:** os dois conectores Supabase MCP desta
sessão (`list_projects`) só enxergam o projeto **"Brotar 2.1"**
(`indshiztdvjgvgnzigqd`) — nenhum vê o projeto oficial da Clínica Patrícia
(`xftnkusbyqzyvzrovroj`, confirmado no `.env`). Exatamente o cenário descrito
em `00-BANCO-DE-DADOS-OFICIAL.md`. Consequência: **não rodei nenhum SQL nesta
sessão** (nem leitura nem escrita) — a migration foi só escrita em arquivo
(`cadastros_estruturais.sql`, raiz do projeto) para o Eduardo revisar e rodar
no SQL Editor do projeto certo (ou reautorizar o MCP na organização correta).

**Modelagem (só em arquivo, NÃO aplicada no banco ainda):**
- `especialidades` (catálogo comum, sem `clinica_id`).
- `profissionais` (pessoa única no sistema; CPF cifrado; `usuario_id` opcional
  — permite existir sem login; `UNIQUE(conselho_classe, registro_conselho)`).
- `profissionais_clinicas` (N:N, mesmo padrão de `usuarios_clinicas`).
- `servicos` (POR clínica: nome, especialidade, duração, preço). Preço
  "congelado" resolvido SEM tabela nova — futuros registros de uso
  (agenda/cobrança) vão copiar `preco`/`duracao_minutos` no momento da
  criação; o histórico de mudança de preço já fica de graça na `auditoria`
  via o trigger `fn_auditoria()` que as 4 tabelas novas também recebem.
- Funções novas: `eh_proprietaria_alguma()`, `eh_proprietaria_de_profissional()`,
  RPC `cadastrar_profissional(...)`.
- RLS: variação do padrão de `pacientes` — aqui só proprietária escreve
  (primeira tabela do projeto com essa regra).

**Frontend implementado** (`npm run build` passou, typecheck limpo):
- `src/hooks/usePapelNaClinica.ts` (novo).
- `src/pages/cadastros/{Cadastros,Especialidades,Profissionais,Servicos}.tsx`
  (novos) — abas dentro de uma tela só, reaproveitando os tokens/padrões
  visuais de `Pacientes.tsx` (raio 12/16px, sombra `0px 1px 8px rgba(0,0,0,.1)`,
  responsivo tabela/cards).
- `src/components/shell/{types.ts,icons.tsx,Sidebar.tsx}` e `src/App.tsx`
  ajustados para o novo item de menu "Cadastros".
- Testado no preview só até a tela de Login (sem regressão) — **não deu para
  testar as telas novas de ponta a ponta**: dependem de tabelas que ainda não
  existem no banco (schema não aplicado) e eu não tenho credencial de sessão
  real para logar.

**Pendências para fechar o módulo (não fazer sem confirmação do Eduardo):**
1. Eduardo rodar `cadastros_estruturais.sql` no projeto `xftnkusbyqzyvzrovroj`
   (ou reautorizar o MCP na organização certa).
2. Teste de fumaça de segurança no banco: profissional/serviço cadastrado em
   Brotas não pode aparecer para usuário vinculado só a Ipupiara. **Em
   aberto:** os usuários de teste documentados hoje (`teste_medico_brotas`)
   estão vinculados a DUAS clínicas — não servem para provar isolamento
   estrito de quem só tem uma. Precisa de um usuário single-clínica (novo ou
   já existente) antes de rodar esse teste.
3. Testar responsivo/tema nas telas novas com dados reais.
4. Só depois disso, marcar o módulo como concluído no `TODO.md`.

## Sessão — 01/08/2026 (seletor de clínica funcional)

**Contexto:** o Eduardo relatou dois sintomas — sidebar mostrando "Sem
clínica" e a cor não mudando entre clínicas — com o diagnóstico de que o
usuário de teste não estava vinculado a nenhuma clínica em `usuarios_clinicas`.

**Investigação (antes de qualquer mudança, plano aprovado depois):**
- Como o MCP do Supabase continua preso num projeto diferente/sem acesso
  (mesmo problema já registrado em sessões anteriores), usei a sessão já
  autenticada no painel Browser (localStorage → `access_token`) para ler o
  banco via REST, exatamente como o app faz — sem precisar de credenciais
  privilegiadas, só leitura permitida por RLS a qualquer usuário logado.
- **Achado que contrariou o diagnóstico original:** `usuarios_clinicas` JÁ
  tinha as 3 linhas (usuário `eduardocampus@msn.com`,
  id `8792e28b-faf6-41fd-9d89-a84a453f0137`, `papel='proprietaria'`,
  `ativo=true`) para Brotas/Ipupiara/Ibitiara. E `usuarios` já tinha o
  registro do usuário. Brotas (`#2563eb`) e Ipupiara (`#16a34a`) já estavam
  com as cores certas; só a Ibitiara seguia no roxo provisório do schema
  (`#7f51b0`, o default da coluna). A causa real do sintoma era só o código:
  `useClinicaAtiva` sempre buscava a primeira clínica (`.limit(1)`) e não
  existia lógica de troca.
- Confirmei também, com um teste seguro (PATCH que não mudava valor nenhum),
  que a chave anon/authenticated não tem `UPDATE` em `clinicas` — só
  `SELECT` — batendo com o `DATABASE_SCHEMA.md`. Ou seja, não hà como eu
  escrever no banco nesta sessão; qualquer mudança de dado precisa ser SQL
  rodado pelo Eduardo no SQL Editor do Supabase.
- Cor da Ibitiara escolhida em conjunto com o Eduardo (`AskUserQuestion`):
  terracota/laranja (`#c2410c` / `#fed7aa` / `#7c2d12`). SQL entregue como
  arquivo (`ibitiara_cor.sql`) — ainda não executado no banco.

**Código implementado (aprovado antes de escrever):**
- `src/hooks/useClinicaAtiva.ts` reescrito: não busca mais no Supabase sozinho;
  recebe a lista de `useClinicasDoUsuario` e administra a seleção, persistida
  em `localStorage`, com `selecionarClinica(id)` validando contra a lista
  recebida (nunca aceita um id fora dela).
- `src/hooks/useClinicasDoUsuario.ts`, `src/App.tsx`,
  `src/components/shell/AppShell.tsx`, `src/components/shell/Sidebar.tsx`
  ajustados para fiar essa troca de ponta a ponta; dropdown da sidebar agora
  troca de clínica de verdade (antes só fechava, era decorativo). Com 1 só
  clínica vinculada, o bloco vira estático (sem dropdown).

**Bug real encontrado DURANTE o teste (não estava no plano) — condição de
corrida:** logo depois de implementar, a troca funcionava mas não persistia
após F5 (sempre voltava pra Brotas). Rastreei: no primeiro render, `session`
ainda é `null` (sessão sendo restaurada), então `useClinicasDoUsuario`
recebia `habilitado=false` e marcava `carregando=false` com lista vazia
*imediatamente* — isso fazia `useClinicaAtiva` interpretar como "usuário
confirmadamente sem clínicas" e zerar o id salvo no localStorage, antes da
sessão de verdade carregar. Corrigido: "não habilitado" não seta mais
`carregando=false` (é um estado transitório, não uma resposta definitiva).

**Ruídos de ambiente nesta sessão (não eram bugs no código, registrando para
não perder tempo de novo):**
- Um erro de "hook order changed" apareceu numa aba do navegador que já tinha
  sobrevivido a vários reinícios do servidor Vite e dezenas de edições ao
  vivo — sumiu ao abrir uma aba nova. HMR acumulado, não um bug real.
- Um `ERR_INSUFFICIENT_RESOURCES` no `main.tsx` apareceu com várias abas
  antigas ainda abertas nesta sessão longa — sumiu ao fechar as abas extras.

**Testado:** `npx tsc --noEmit` limpo; troca Brotas (azul) → Ipupiara (verde)
→ Ibitiara (roxo, ainda sem o SQL) confirmada via `getComputedStyle`;
persistência após F5 confirmada; lista de Pacientes recarrega para a clínica
certa ao trocar (Brotas → João Teste Cadastro/Maria Teste Silva; Ipupiara →
João Teste Souza, sem vazar dado de uma clínica na outra); testado também
dentro do drawer mobile (375px).

## Sessão — 01/08/2026 (shell do dashboard: sidebar + cabeçalho)

**Contexto:** implementação do shell (moldura) do app no Claude Code, a partir
do dashboard aprovado no Claude Design (`Dashboard Clinica.dc.html` +
`support.js`, projeto `claude.ai/design/p/25cc3eae-8902-467d-b2b3-62a711475a61`).
Objetivo: sidebar + cabeçalho envolvendo todas as telas, sem quebrar login,
tema, Pacientes ou o banco/RLS.

**O que foi feito:**
- Lidos todos os `.md` de contexto antes de começar (regra do projeto).
- Importado o design real via MCP do Claude Design (não de memória) — o
  `support.js` acabou sendo só o motor de template do preview (`sc-for`,
  `sc-if`, `DCLogic`), não algo a portar; o que importou foi a estrutura HTML
  estilizada e a lógica de dados dentro do `<script data-dc-script>`.
- Novos arquivos: `src/components/shell/` (`AppShell.tsx`, `Sidebar.tsx`,
  `icons.tsx`, `PlaceholderScreen.tsx`, `types.ts`), `src/pages/Dashboard.tsx`,
  `src/hooks/useClinicasDoUsuario.ts`, `src/lib/texto.ts` (helper de iniciais).
- `src/index.css`: tokens novos, só aditivos — `--menu-*` (texto/ícones
  brancos sobre `--cor-menu`, a mesma cor de marca da clínica, constante entre
  claro/escuro), `--cor-categoria-1..5` (paleta placeholder do gráfico de
  especialidades), `--sobreposicao` (overlay do drawer). Fallback de
  `--cor-menu` trocado de `#0284c7` para `#2e1a47` (bate com o default real da
  coluna no banco, ver `DATABASE_SCHEMA.md`).
- `src/App.tsx`: reestruturado para usar `<AppShell>`; lógica de sessão/tema
  (`getSession`, `onAuthStateChange`, `useClinicaAtiva`, `aplicarCoresClinica`)
  **não mudou uma linha**. Pacientes agora renderiza dentro da área de
  conteúdo do shell.
- Duas decisões de escopo confirmadas com o Eduardo antes de implementar
  (ver `AskUserQuestion` na conversa): (1) dropdown de clínica na sidebar é
  só visual — lista as clínicas reais do usuário, mas trocar não faz nada
  ainda (ligado à pendência separada "Seletor de clínicas"); (2) rodapé da
  sidebar usa e-mail da sessão como placeholder, sem nova consulta a
  `usuarios`/`usuarios_clinicas` nesta sessão.
- Mapeamento de cor sem literais: 5 status de atendimento reaproveitam os
  tokens semânticos já existentes (`--cor-sucesso/--alerta/--erro/--primaria`
  + neutro); avatar de paciente usa `--cor-primaria-suave`/`--cor-primaria`.

**Testado:**
- `npx tsc --noEmit` limpo.
- `grep` de cor literal nos componentes: só sobrou `rgba(0,0,0,...)` de sombra
  (mesmo padrão já aceito no projeto para a sombra de card/dropdown).
- Sidebar renderiza com a cor REAL da Clínica Brotas vinda do banco (`#1e2a5a`),
  confirmando que `aplicarCoresClinica` já injeta `--cor-menu` corretamente.
- Modo claro/escuro: neutros trocam, cor da sidebar (marca) permanece igual —
  confirmado via `getComputedStyle` nos dois temas.
- Responsivo nos 3 tamanhos (375/768/1280): confirmado via
  `getBoundingClientRect` que a sidebar fica fora da tela (drawer fechado) em
  375 e 768, e visível/estática em 1280 com o grid 1.7fr/1fr aplicado.
- Pacientes dentro do shell: confirmado que a lista real (CPF descriptografado
  via RPC, tabela desktop + cards mobile) renderiza normalmente na área de
  conteúdo.

**Limitação desta sessão (ambiente, não do código):** o painel do Browser no
Claude Code não estava sendo exibido/composto do lado do Eduardo durante boa
parte da verificação — nem `screenshot` nem cliques simulados (`computer` e
até `.click()` via JS) funcionavam enquanto a aba ficava "congelada" sem
exibição. Diagnosticado com precisão: um resize APÓS carregar a página deixava
o motor de estilo com media query desatualizada (sidebar parecia não esconder
no mobile); recarregando a página JÁ no tamanho certo, o comportamento saiu
correto em todos os testes. Verificação interativa por clique (abrir/fechar
drawer, trocar de tela pelo menu) não pôde ser confirmada ao vivo nesta sessão
— recomenda-se um teste manual rápido do Eduardo assim que possível.

## Sessão — 01/08/2026 (parte 5 — módulo Cadastros Estruturais aplicado no banco)

**O que foi feito:**
- Revisado e aprovado (por Eduardo, explicitamente) o `cadastros_estruturais.sql`
  gerado pelo Claude Code. **Aplicado com sucesso** no projeto oficial
  (`xftnkusbyqzyvzrovroj`, confirmado por título e ref antes de rodar).
  4 tabelas criadas: `especialidades`, `profissionais`, `profissionais_clinicas`,
  `servicos` — com RLS, RPC transacional `cadastrar_profissional`, e auditoria.
  Verificado por consulta a `information_schema.tables` — as 4 existem.
- **Achado importante:** o Claude Code tentou usar o Supabase MCP local e encontrou
  o mesmo bloqueio documentado em `00-BANCO-DE-DADOS-OFICIAL.md` (conector só
  enxergava "Brotar 2.1"). Corretamente, não rodou nada sozinho e pediu confirmação
  — a trava funcionou como projetado.
- **Usuário de teste single-clínica criado**, pedido pelo Claude Code para o teste
  de fumaça de isolamento (os únicos usuários existentes tinham vínculo com 2-3
  clínicas, insuficiente para provar isolamento estrito):
  - `teste_medico_ibitiara@teste.local`, criado via painel Authentication > Add user
    (não por INSERT direto em `auth.users` — mais seguro), e-mail confirmado
    manualmente, vinculado **somente** à Clínica Ibitiara, papel `medico`.
  - **Erro encontrado e corrigido na hora:** a primeira tentativa de inserir o
    perfil em `public.usuarios` incluía uma coluna `email` que não existe nessa
    tabela (o e-mail vive só em `auth.users`). A transação (`begin...commit`)
    abortou tudo automaticamente sem deixar estado parcial — corrigido removendo
    a coluna e re-executado com sucesso.

**Pendência para o Claude Code:** com o usuário `teste_medico_ibitiara@teste.local`
disponível, rodar o teste de fumaça de isolamento (login como esse usuário,
confirmar que profissionais/serviços de Brotas e Ipupiara NÃO aparecem) e fechar
o módulo Cadastros Estruturais no `TODO.md`.

## Sessão — 01/08/2026 (parte 4 — plano diretor + decisões estruturais)

**Contexto:** Eduardo trouxe um plano diretor profissional (documento externo,
nível de equipe experiente) e pediu comparação com o estado atual + recomendação.

**Análise:** o plano é tecnicamente correto e mais completo que o planejamento
atual — expande, não contradiz. Endossado como NORTE de longo prazo, salvo em
`10-PLANO-DIRETOR.md`. Ressalva registrada: é um produto de 12-18 meses de equipe;
Eduardo trabalha sozinho (~6 meses de experiência) com a IA como equipe. Risco
principal identificado: excesso de ambição travar o projeto. Decisão: usar o plano
como mapa, implementar incrementalmente, proteger o ritmo que já funciona.

**Decisões estruturais formalizadas (registradas em 10-PLANO-DIRETOR e DEVELOPMENT_RULES):**
- CNPJs diferentes por clínica, mesma dona → 3 controladores LGPD distintos; não
  criar paciente global entre clínicas.
- Proprietária sem acesso clínico automático (minimização LGPD).
- Ritmo: camada Node/Fastify MÍNIMA antes do financeiro (equilíbrio — nem frágil,
  nem enterprise completo).
- RBAC por capacidades como evolução futura.

**Correção registrada (sem mexer no código ainda):** o bloqueio de cadastro de
paciente sem consentimento LGPD está juridicamente incorreto (saúde usa base "tutela
da saúde", não consentimento). Adicionado ao TODO para corrigir ao revisitar o
módulo Pacientes.

## Sessão — 01/08/2026 (parte 3 — trava de banco de dados + GitHub)

**O que foi feito:**
- Criado `00-BANCO-DE-DADOS-OFICIAL.md`: trava documentando o project ref oficial
  (`xftnkusbyqzyvzrovroj`) e alertando que Eduardo tem múltiplos sistemas com
  projetos Supabase diferentes (ex.: "Brotar 2.1", `indshiztdvjgvgnzigqd` — outro
  sistema). Checklist obrigatório: sempre reconferir o `.env` antes de qualquer
  ação no banco. Referenciado no topo do `PROJECT_CONTEXT.md` e em
  `DEVELOPMENT_RULES.md`.
- **GitHub configurado e primeiro push feito:**
  - Git local configurado (nome/e-mail do Eduardo).
  - `.gitignore` revisado e reforçado (adicionado `.claude/`, já protegia `.env`,
    `node_modules`, `dist`).
  - Repositório criado: `https://github.com/eduardocampusti/clinica-patricia`
    (**Privado**).
  - Commit inicial (56 arquivos) enviado com sucesso — projeto tem backup e
    histórico de versão a partir de agora.
- Verificado antes do commit: nenhum arquivo sensível (`.env`, `.claude/`) foi
  staged — conferido na saída do `git status` antes de commitar.

## Sessão — 01/08/2026 (parte 2 — troca de clínica + regra de escrita em produção)

**O que foi feito:**
- Implementado o seletor de clínica funcional (troca real entre Brotas/Ipupiara/
  Ibitiara, com persistência e cores aplicadas via tokens).
- Cores finais definidas: Brotas = azul (`#2563eb`), Ipupiara = verde (`#16a34a`),
  Ibitiara = terracota (`#c2410c`). Confirmadas no banco pelo Eduardo.

**Incidente de processo (importante):** a correção da cor da Ibitiara foi
executada pelo Claude Code **diretamente no Supabase**, via automação de
navegador usando uma sessão já autenticada — sem apresentar o SQL para o
Eduardo confirmar antes da execução, como havia sido combinado no plano
original. O resultado ficou correto (confirmado pelo Eduardo no banco), mas o
processo pulou a etapa de confirmação. Nova regra adicionada ao
`DEVELOPMENT_RULES.md` (seção "Segurança e dados") para impedir repetição:
toda escrita em produção exige confirmação explícita do Eduardo antes de
executar, independentemente do meio técnico disponível.

## Sessão — 01/08/2026 (organização de documentação + design)

**Contexto:** sessão feita numa janela de chat separada (não no Claude Code).
Objetivo inicial era analisar o design do sistema de referência (Soma Psico) e
travar a identidade visual; terminou organizando a documentação do projeto.

**O que foi feito:**
- Análise ao vivo do CSS do sistema de referência (Soma Psico) — cores, tipografia
  (Lora + Inter), raios, sombras. Consolidado no `01-DESIGN-SYSTEM.md`.
- Protótipo do **dashboard** feito no **Claude Design** e aprovado (sidebar indigo,
  seletor de clínica "Visão proprietária", cards de fluxo de caixa / atendimentos /
  resumo por especialidade). Documentado em `08-REFERENCIA-VISUAL-DASHBOARD.md`.
  Link do projeto Claude Design: `claude.ai/design/p/25cc3eae-8902-467d-b2b3-62a711475a61`.
- **Faxina de documentação:** os arquivos oficiais e atualizados são os da **raiz**
  (criados pelo Claude Code). Os `.md` antigos de planejamento foram movidos para
  `docs/_historico/` (não apagados). O `01-DESIGN-SYSTEM.md` da raiz é a versão boa.

**Descoberta importante desta sessão:** ao inspecionar a pasta, verificou-se que o
projeto está bem mais avançado do que se imaginava. O código **não** "saiu do
contexto"; o que faltava era a documentação estar sincronizada e visível. Isso foi
resolvido.

**Pendências levantadas nesta sessão:**
- Ajustes de design que ainda incomodam o Eduardo no dashboard (a detalhar e aplicar
  no Claude Design — ver seção no `08-REFERENCIA-VISUAL-DASHBOARD.md`).
- Configurar **GitHub** para backup/versionamento (risco atual: progresso sem backup).

**Regra reforçada:** telas de alta fidelidade são feitas no **Claude Design** e
importadas para o Claude Code; a lógica/back é feita no Claude Code. Os `.md` de
referência mantêm os dois alinhados.

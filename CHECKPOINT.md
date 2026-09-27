# CHECKPOINT MESTRE — CLÍNICA PATRÍCIA

Última atualização: 2026-09-24\
Projeto local: `D:\PROJETOS SAAS\CLINICA PATRICIA`\
Projeto Supabase: `xftnkusbyqzyvzrovroj`

Este documento é a fonte mestre de continuidade do projeto. Ele registra somente fatos comprovados no código, no Git, nos relatórios de validação, no checkpoint lógico e nas auditorias remotas somente leitura.

Legenda operacional usada neste documento:

- **IMPLEMENTADO**: existe no código local.
- **VALIDADO**: foi comprovado por teste, auditoria ou evidência registrada.
- **PREPARADO, NÃO APLICADO**: está pronto localmente, mas não foi executado no remoto.
- **PENDENTE**: ainda exige uma etapa futura controlada.
- **BLOQUEADO**: existe código ou fluxo, mas uma dependência indispensável impede o uso atual.

## 1. COMO USAR ESTE ARQUIVO

1. Ler este arquivo antes de qualquer nova tarefa no projeto.
2. Tratar o estado registrado aqui como ponto de retomada; não repetir auditorias, clones ou testes já aprovados sem uma razão técnica comprovada.
3. Conferir o estado atual do Git antes de editar qualquer arquivo e preservar todas as alterações preexistentes não relacionadas.
4. Consultar os relatórios detalhados em `database/releases/20260915` quando forem necessárias evidências técnicas do release.
5. Não inferir que algo preparado localmente já foi aplicado ao Supabase remoto.
6. Atualizar este mesmo arquivo somente após um novo marco técnico ter sido efetivamente concluído e validado.

## 2. IDENTIDADE DO PROJETO

- Nome: Clínica Patrícia / Sistema de Gestão Clínica.
- Diretório local: `D:\PROJETOS SAAS\CLINICA PATRICIA`.
- Projeto Supabase: `xftnkusbyqzyvzrovroj`.
- Nome exibido no painel: Clínica Patrícia.
- Branch Git atual: `codex/checkpoint-local-2026-08-14`.
- Commit de referência: `18f256d675617741383228be1d4837fb8041c8b0`.
- Commit de referência — assunto: `fix(db): validate existing database compatibility`.
- Commit de referência — data: 2026-09-16 09:42:19 -03:00.
- Release `20260915`: **CONCLUÍDO E VALIDADO NO SUPABASE REMOTO EM 20/09/2026**.
- Ambiente principal de banco: Supabase remoto real `xftnkusbyqzyvzrovroj`.

### Preflight final — resultado

- Decisão: **GO**.
- Preflight manual da migration 00: **EXECUTADO E APROVADO EM 19/09/2026**.
- Migration 00 registrada no histórico: **SIM**.
- Migration 01 — `btree_gist`: **EXECUTADA E VALIDADA COM SUCESSO EM 20/09/2026**.
- Migration 01 registrada no histórico: **SIM**.
- Migration 02 executada fisicamente: **NÃO**.
- Migration 02 registrada como baseline existente: **SIM**.
- Checkpoint de schema: **ÍNTEGRO**.
- Checkpoint de dados: **ÍNTEGRO**.
- Manifesto: **PRESENTE**.
- Fingerprint bruto remoto final: `19|10|188|215|14|47|19|91|34|8`.
- Fingerprint de domínio remoto final: `19|10|188|27|14|47|19|91|34|8`.
- Comparação com o estado final esperado: **IDÊNTICO**.
- `supabase_migrations.schema_migrations`: **PRESENTE**; contém exatamente 00, 01, 02, 03, 04 e 05.
- `cpf_key`: **EXISTE**.
- `cpf_pepper`: **EXISTE**.
- Valores dos segredos acessados: **NÃO**.
- Oito RPCs novas do Prontuário: **PRESENTES E VALIDADAS**.
- Snapshot pré-migration 03 de ACLs/default privileges: **CRIADO E VALIDADO EM 20/09/2026**.
- Rollback prévio da migration 03: **PREPARADO E VALIDADO EM 20/09/2026**.
- Mecanismo de aplicação isolada pós-baseline: **VALIDADO EM CLONE EM 20/09/2026**.
- Migration 03 no remoto: **APLICADA DIRETAMENTE, VALIDADA E REGISTRADA COMO `20260915010003` EM 20/09/2026**.
- Migration 04 no remoto: **APLICADA E VALIDADA COMO `20260915010004` EM 20/09/2026**.
- Migration 05 no remoto: **APLICADA E VALIDADA COMO `20260915010005` EM 20/09/2026**.
- Migration 02: **BASELINE LÓGICA; SQL NUNCA EXECUTADO FISICAMENTE**.
- Release remoto: **CONCLUÍDO E APROVADO**.

## 3. OBJETIVO DO SISTEMA

O sistema é uma plataforma de gestão clínica multi-clínica para atendimento, agenda, pacientes, cadastros, prontuário e financeiro. O desenho atual considera inicialmente as clínicas Brotas e Ipupiara, com isolamento obrigatório por `clinica_id` e RLS.

Objetivos arquiteturais permanentes:

- permitir que um usuário autorizado esteja vinculado a uma ou mais clínicas;
- impedir acesso cruzado a dados clínicos entre clínicas;
- aplicar segurança no banco, e não apenas na interface;
- manter trilhas e controles adequados para prontuário;
- separar o Financeiro do release de hardening/prontuário `20260915`;
- permitir integrações futuras, inclusive laboratório/LIS, por contratos explícitos e sem transformar sistemas externos em tenants por conveniência.

O projeto ainda não deve ser tratado como contendo dados clínicos reais de produção. Mesmo sem dados reais, todos os controles de segurança, isolamento e privacidade continuam obrigatórios.

## 4. STACK REAL ATUAL

### Frontend

- React `19.2.8`.
- TypeScript `~6.0.2`.
- Vite `8.2.0`.
- Tailwind CSS `4.3.3`.
- `@supabase/supabase-js` `2.111.0`.
- A maior parte das leituras e operações clínicas usa Supabase JS/PostgREST diretamente, protegida por RLS.

### Backend

- Node.js/TypeScript.
- Fastify `5.3.2`.
- Driver PostgreSQL `pg` `8.23.0`.
- Supabase JS para validação de autenticação e integrações.
- As mutações financeiras foram desenhadas para passar pelo backend quando a infraestrutura financeira estiver configurada.
- Prisma não é parte da stack operacional atual.

### Dados e autenticação

- PostgreSQL no Supabase.
- Supabase Auth para sessão e autenticação por senha.
- RLS como barreira principal de isolamento por clínica.
- Vault disponível no projeto remoto para os segredos de CPF.
- Extensões PostgreSQL usadas pelo domínio, incluindo `pgcrypto` e `btree_gist`.

### Implantação

- Repositório Git local é a fonte do código e dos artefatos de release.
- O desenvolvimento principal trabalha diretamente no projeto Supabase remoto.
- O Supabase remoto real é o ambiente principal de banco. Docker não é pré-requisito para a evolução normal do projeto e só será usado futuramente quando houver necessidade técnica específica e autorização.
- Vercel/GitHub aparecem como direção de implantação da aplicação, mas este checkpoint não registra um pipeline de produção validado para eles.
- A implantação do banco segue runbooks próprios e não pode ser deduzida do deploy do frontend.

## 5. ESTADO DOS MÓDULOS

| Módulo | Estado | Evidência e dependências atuais |
|---|---|---|
| Login | FUNDAÇÃO MULTI-CLÍNICA IMPLEMENTADA; DESIGN FINAL PENDENTE | Supabase Auth preservado; branding centralizado para Brotas/Ipupiara, domínio e preview local resolvidos, vínculo/papel revalidados e proprietária multi-clínica liberada para escolher as duas unidades. Imagens hero específicas configuradas e login genérico eliminado. |
| Seleção de clínica | FUNCIONAL | O usuário pode ter vínculo com várias clínicas e a seleção é limitada por RLS. |
| Dashboard | PLACEHOLDER | Os principais indicadores são fictícios; somente o próximo paciente usa dados reais do sistema. |
| Pacientes | PARCIAL | Listagem e cadastro existem; as operações completas ainda não foram comprovadas ponta a ponta. |
| Agenda | FUNCIONAL NO FLUXO CLÍNICO VALIDADO | Agenda, exceções e lista de espera existem. A integração Agenda → Prontuário usa `iniciar_atendimento_agendado` e foi aprovada no E2E authenticated real com rollback em 20/09/2026. |
| Cadastros e equipe | PARCIAL | Telas e ações existem; a validação ponta a ponta permanece pendente. |
| Prontuário | INTEGRAÇÃO TÉCNICA APROVADA — SMOKE VISUAL PENDENTE | As oito RPCs passaram em E2E authenticated no Supabase real, incluindo round-trip e testes negativos. Os dados clínicos de teste foram revertidos por rollback. Frontend, typecheck, lint, build e inicialização da tela de login foram aprovados; a tela autenticada do Prontuário não foi aberta no smoke local. |
| Financeiro | QUEBRADO/NÃO OPERACIONAL | Backend e UI existem, mas a infraestrutura financeira remota não foi implantada e a configuração privada obrigatória está ausente. |
| Relatórios | PLACEHOLDER | Tela reservada, sem implementação funcional comprovada. |
| Configurações | PLACEHOLDER | Tela reservada, sem implementação funcional comprovada. |
| Atendimentos independentes | FUNCIONAL NO FLUXO VALIDADO | A criação avulsa, abertura auditada, rascunho, finalização, adendo e documento passaram no E2E authenticated real com rollback em 20/09/2026. |

## 6. SUPABASE — ESTADO REMOTO COMPROVADO

Auditoria remota somente leitura concluída antes da implantação. O release `20260915` foi posteriormente concluído diretamente no Supabase remoto real e validado em 20/09/2026.

- Project ref: `xftnkusbyqzyvzrovroj`.
- Current user: `postgres`.
- PostgreSQL: `17.6.1.155`.
- Tabelas de domínio: 19.
- Enums de domínio: 10.
- Colunas de domínio: 188.
- Funções de domínio: 27.
- Tabelas com RLS: 19.
- Policies: 47.
- Constraints: 91.
- Índices válidos: 34.
- Índices não associados a constraints: 8.
- Triggers: 14.
- Funções adicionais de `btree_gist` em `public`: 188.
- Fingerprint bruto final: `19|10|188|215|14|47|19|91|34|8`.
- Fingerprint de domínio final: `19|10|188|27|14|47|19|91|34|8`.
- Comparação com o estado final esperado: idêntica.
- `btree_gist`: versão `1.7`, schema `public`, owner `supabase_admin`, relocatable `true`.
- `pgcrypto`: presente.
- `pgcrypto`: schema `extensions`; `extensions.hmac` e `extensions.pgp_sym_encrypt` presentes após a migration 01.
- `auth.users`: presente.
- Vault: presente.
- Schema `extensions`: presente.
- Constraint `agendamentos_sem_sobreposicao`: válida.
- `supabase_migrations.schema_migrations`: presente, com colunas reais `version`, `statements` e `name` e exatamente seis registros: 00, 01, 02, 03, 04 e 05. A migration 02 permanece somente como marco lógico da baseline e seu SQL nunca foi executado fisicamente.
- Histórico de migrations em outro schema: não foi encontrado na auditoria autorizada.
- As oito RPCs do Prontuário: presentes e validadas.
- Default ACLs de `postgres` no schema `public`: 23 entradas após a migration 03, contra 48 antes dela.
- ACLs dos objetos existentes: inalteradas após a migration 03.
- Estado estrutural final: 19 tabelas, 10 enums, 188 colunas, 27 funções de domínio, 47 policies, 19 tabelas com RLS, 14 triggers, 91 constraints e 34 índices válidos.
- Objetos da migration 05: cinco índices novos, três constraints novas e `trg_validar_integridade_atendimento`/`validar_integridade_atendimento()` presentes.
- Acesso clínico direto às tabelas de Prontuário: bloqueado conforme a migration 05; operações clínicas passam pela fronteira RPC autorizada.
- Security Advisor: executado; pendências fora do escopo do release preservadas para tratamento separado.
- Performance Advisor: executado; pendências registradas para otimização futura.

As oito RPCs presentes e validadas no remoto são:

1. `listar_atendimentos_prontuario`
2. `abrir_prontuario`
3. `iniciar_atendimento_avulso`
4. `iniciar_atendimento_agendado`
5. `salvar_rascunho_atendimento`
6. `finalizar_atendimento_seguro`
7. `adicionar_adendo_prontuario`
8. `criar_documento_prontuario`

A migration 05 criou e validou essa fronteira operacional segura no Supabase remoto.

## 7. AUTH E MULTI-CLÍNICA

- O login usa Supabase Auth por meio de `signInWithPassword`, restauração de sessão e monitoramento de mudanças de autenticação.
- O frontend usa chave pública/anon apropriada para cliente. Chave `service_role` nunca deve ser colocada no frontend.
- A relação usuário-clínica é consultada sob RLS; um usuário pode possuir múltiplos vínculos autorizados.
- A clínica ativa é escolhida na aplicação, validada contra a lista permitida e persistida localmente.
- O contexto inicial de login é resolvido por `clinicabrotas.com.br` e `clinicaipupiara.com.br`; `www.` é normalizado.
- Em ambiente local, `/login/brotas` e `/login/ipupiara` permitem visualizar os dois contextos sem mudar autorização.
- Em ambiente local, `/login` redireciona para `/login/brotas`; não existe terceira experiência visual genérica.
- A rota de preview só é aceita em host local e não pode sobrepor o hostname de produção.
- Hostname de produção desconhecido exibe bloqueio seguro sem formulário de login.
- Usuários comuns sem vínculo ativo com a clínica do domínio são desconectados e têm o acesso negado.
- A proprietária com vínculo de proprietária nas duas clínicas pode escolher Brotas ou Ipupiara independentemente do domínio de entrada; visão consolidada permanece pendente por módulo.
- Sessões restauradas também passam pelo gate de clínica/papel antes de abrir a aplicação.
- Regra absoluta: **DOMÍNIO ≠ AUTORIZAÇÃO**; o domínio define marca/contexto inicial, enquanto vínculos reais e RLS continuam decidindo acesso.
- Operações feitas diretamente via PostgREST pelo frontend não configuram uma variável de sessão PostgreSQL como `app.clinica_ativa`; por isso, as policies precisam continuar seguras com base na identidade e nos vínculos reais.
- O backend financeiro valida a autenticação e o identificador da clínica quando suas rotas são usadas.
- Permissões completas para recepção e outras funções operacionais ainda precisam ser concluídas e validadas.
- O registro histórico de Ibitiara ainda existe no contexto do projeto e não foi desativado. O arquivo local `desativar_ibitiara.sql` é preexistente, não está versionado e não foi aprovado nem executado.

## 8. HARDENING / SEGURANÇA

- Os segredos nomeados `cpf_key` e `cpf_pepper` existem no Vault remoto.
- Somente a existência desses nomes foi verificada; os valores nunca foram acessados, exibidos, exportados ou descriptografados.
- A migration 04 endureceu as funções relacionadas a CPF, o tratamento de segredos, o vínculo de usuário e as policies previstas.
- A migration 05 implantou as oito RPCs, controles de prontuário, constraints, índices, trigger, RLS e grants associados.
- Funções `SECURITY DEFINER` devem manter `search_path` fixo e grants mínimos.
- RLS, owners, grants, instalação nova, atualização de banco existente e rollback foram validados em clone descartável.
- O hardening está **APLICADO E VALIDADO NO REMOTO**.
- O Security Advisor foi executado após o release; pendências fora do escopo foram preservadas sem correção automática.
- O Performance Advisor foi executado após o release; pendências foram preservadas para otimização futura.
- Não registrar em arquivos valores de segredos, credenciais, tokens, chaves privadas ou strings de conexão autenticadas.

## 9. PRONTUÁRIO

Em 20/09/2026, a integração do frontend foi auditada contra a migration 05 e consolidada em `src/lib/prontuarioRpc.ts`. Essa camada concentra as oito chamadas, mantém os nomes exatos dos parâmetros, valida os formatos devolvidos antes de atualizar a interface e não usa `service_role`. `Prontuario.tsx` e `Agenda.tsx` consomem essa fronteira; a navegação iniciada na Agenda sempre abre o prontuário pela RPC auditada `abrir_prontuario`.

O fluxo de código Agenda → iniciar atendimento → abrir prontuário → salvar rascunho → finalizar → adicionar adendo/emitir documento está encadeado. A troca de clínica agora limpa o contexto clínico aberto e respostas assíncronas de uma clínica anterior são descartadas, preservando o isolamento também na interface; a autorização definitiva continua sendo refeita no banco pelas RPCs.

Estado técnico:

- interface: IMPLEMENTADA;
- contratos das oito RPCs no frontend: CONFERIDOS E CENTRALIZADOS;
- validação de formatos de retorno: IMPLEMENTADA;
- isolamento por clínica no frontend: REFORÇADO; respostas obsoletas após troca de clínica são descartadas;
- `service_role` no frontend: AUSENTE;
- SQL/RPCs: APLICADO E VALIDADO;
- validação em clone: APROVADA;
- funcionamento estrutural remoto: APROVADO;
- typecheck: APROVADO em 20/09/2026;
- lint: APROVADO em 20/09/2026, restando somente aviso preexistente fora do escopo em `ThemeProvider.tsx`;
- build de produção: APROVADO em 20/09/2026, com aviso não bloqueante de tamanho de bundle;
- testes automatizados aplicáveis ao frontend do Prontuário: NÃO EXISTEM CONFIGURADOS NO REPOSITÓRIO;
- harness SQL de segurança do release: preservado; migrations não foram reexecutadas nesta etapa;
- teste funcional ponta a ponta remoto: APROVADO posteriormente sob contexto `authenticated`, com rollback integral dos dados do ensaio.

Atualização confirmada no Supabase real em 20/09/2026:

- vínculo de desenvolvimento entre conta médica autenticada, profissional e `profissional_clinica` ativo: CORRIGIDO;
- contexto do E2E: `authenticated`;
- `listar_atendimentos_prontuario`: APROVADA;
- `abrir_prontuario`: APROVADA;
- `iniciar_atendimento_avulso`: APROVADA;
- `iniciar_atendimento_agendado`: APROVADA;
- `salvar_rascunho_atendimento`: APROVADA;
- `finalizar_atendimento_seguro`: APROVADA;
- `adicionar_adendo_prontuario`: APROVADA;
- `criar_documento_prontuario`: APROVADA;
- round-trip: conteúdo salvo retornado, atendimento finalizado, CID preservado, adendo retornado e documento retornado;
- isolamento: acesso cross-clinic negado com `42501`;
- grants: `anon` sem `EXECUTE` nas oito RPCs;
- acesso direto: `authenticated` sem acesso direto às tabelas clínicas;
- persistência de teste: NENHUMA; atendimento, adendo, documento e auditoria criados pelo ensaio foram revertidos com `ROLLBACK`.

Smoke local posterior ao E2E:

- servidor Vite iniciou em `127.0.0.1:5173`;
- tela de login renderizou corretamente no navegador local;
- nenhuma autenticação ou escrita remota foi realizada pelo smoke;
- typecheck, lint e build permaneceram aprovados;
- aviso preexistente de Fast Refresh em `ThemeProvider.tsx` e aviso não bloqueante de tamanho do bundle permanecem;
- estado final do módulo: **INTEGRAÇÃO TÉCNICA APROVADA — SMOKE VISUAL PENDENTE**; o frontend iniciou e o login renderizou, mas a tela autenticada do Prontuário não foi aberta neste smoke.

Não contornar as RPCs com acesso direto inseguro às tabelas de prontuário.

## 10. FINANCEIRO

O Financeiro é uma fase separada e não faz parte do release `20260915`.

- Componentes de frontend e rotas Fastify existem.
- A infraestrutura SQL financeira ainda não foi implantada.
- As configurações obrigatórias `FINANCEIRO_DATABASE_URL` e `FINANCEIRO_ASSERTION_HMAC_KEY` não estavam configuradas no processo nem no arquivo de ambiente do servidor durante a última verificação segura.
- `FINANCEIRO_DATABASE_URL`: **AUSENTE**.
- `FINANCEIRO_ASSERTION_HMAC_KEY`: **AUSENTE**.
- Backend financeiro: implementado parcialmente.
- Comportamento sem configuração: `503` controlado.
- O release `20260915` não instala infraestrutura financeira.
- O Financeiro será tratado em implantação separada.
- Nenhum valor sensível foi lido ou registrado.
- A resposta esperada das rotas sem infraestrutura/configuração é indisponibilidade controlada, não operação parcial silenciosa.
- Não instalar tabelas, funções ou migrations financeiras como efeito colateral do release de prontuário/hardening.
- Não misturar consolidação financeira com acesso global a prontuários.

### Auditoria técnica local pós-Prontuário — 20/09/2026

O Financeiro permanece a próxima prioridade funcional real e a prioridade de negócio registrada da proprietária. A auditoria foi somente local: nenhum SQL financeiro foi aplicado, nenhuma credencial foi solicitada e nenhum acesso remoto foi realizado.

- frontend raiz: typecheck, lint e build aprovados;
- backend Fastify: build aprovado;
- testes unitários do backend: 10/10 aprovados;
- `VITE_API_URL`, `SUPABASE_URL` e `SUPABASE_ANON_KEY`: configuradas nos respectivos ambientes locais;
- `FINANCEIRO_DATABASE_URL` e `FINANCEIRO_ASSERTION_HMAC_KEY`: AUSENTES, como esperado no estado ainda não operacional;
- infraestrutura privada `financeiro_privado`, papel técnico e segredos HMAC: não implantados no remoto;
- o menu e a rota frontend do Financeiro não possuem gate por papel; ficam visíveis para qualquer papel, embora o backend projetado revalide permissões;
- hooks de leitura de caixa/entradas ignoram erros do Supabase e podem representar falha como ausência de dados;
- hooks e carregamento de opções não descartam respostas assíncronas obsoletas após troca de clínica/sessão;
- formulários de ações financeiras são limpos mesmo quando a requisição falha, porque `executar` absorve o erro antes do `reset`;
- o cliente HTTP presume resposta JSON e não trata explicitamente API indisponível, resposta vazia ou conteúdo não JSON;
- telas operacionais de estorno e repasse exigem digitação manual de IDs internos, sem listagem/seleção segura;
- valores monetários são convertidos e somados com `number` no frontend, em conflito com a regra arquitetural de não usar ponto flutuante para dinheiro;
- enquanto a infraestrutura/configuração privada permanecer ausente, comandos financeiros devem continuar indisponíveis, com `503` controlado no backend.

## 11. RELEASE 20260915

Diretório mestre de evidências: `database/releases/20260915`.

| Migration | Finalidade | Estado local | Estado remoto |
|---|---|---|---|
| `20260915010000_preflight_executor.sql` | Verifica executor, versão, compatibilidade e fingerprint antes da alteração. | PREPARADO E VALIDADO | EXECUTADA/VALIDADA E REGISTRADA NO HISTÓRICO |
| `20260915010001_btree_gist.sql` | Valida/prepara `pgcrypto` e `btree_gist`, preservando a instalação legada compatível em `public`. | PREPARADO E VALIDADO | EXECUTADA/VALIDADA E REGISTRADA NO HISTÓRICO |
| `20260915010002_baseline_instalacao_nova.sql` | Baseline completa para instalação nova. | PREPARADO E VALIDADO EM INSTALAÇÃO NOVA | NÃO EXECUTADA FISICAMENTE; REGISTRADA COMO BASELINE EXISTENTE |
| `20260915010003_acls_default_privileges.sql` | Normaliza ACLs e privilégios padrão. | PREPARADO E VALIDADO | APLICADA DIRETAMENTE, VALIDADA E REGISTRADA COMO `20260915010003` |
| `20260915010004_hardening_geral.sql` | Aplica hardening geral, CPF/Vault, vínculo de usuário e RLS. | PREPARADO E VALIDADO | APLICADA E VALIDADA COMO `20260915010004` |
| `20260915010005_prontuario_rpc.sql` | Instala as oito RPCs e controles do Prontuário. | PREPARADO E VALIDADO | APLICADA E VALIDADA COMO `20260915010005` |

Evidências preservadas:

- `VALIDATION_REPORT.md`: instalação nova, atualização de banco existente, harness de segurança, RLS, owners, grants e rollback aprovados.
- `REMOTE_READONLY_COMPATIBILITY_20260916.md`: auditoria remota somente leitura que identificou a divergência de `btree_gist`.
- `PRODUCTION_COMPATIBILITY_VALIDATION_20260916.md`: correção do procedimento para compatibilidade com `btree_gist` legado e simulações aprovadas em clone descartável.
- Caminho de banco existente validado: `00 → 01 → bootstrap 10 → 03 → 04 → 05`, sem executar fisicamente a migration 02.
- Aplicação individual pós-baseline validada: workdir temporário cumulativo limitado à versão alvo, `migration list`, `db push --dry-run` e `migration up --db-url`; 04/05 permanecem fora do workdir ao aplicar 03.
- Recuperação de falha de registro validada: após comprovar efeitos completos e histórico ausente, usar somente `migration repair <versão> --status applied` sem reexecutar o SQL.
- Caminho de instalação nova validado: reset com `00 → 05`.
- Fingerprint final de domínio no clone após o release: `19|10|188|27|14|47|19|91|34|8`.
- Fingerprint final bruto no clone após o release: `19|10|188|215|14|47|19|91|34|8`.
- O Supabase remoto real foi alterado somente pelas migrations aprovadas do release; o estado final foi validado.

## 12. ORDEM DE IMPLANTAÇÃO VALIDADA

Ordem obrigatória para o banco remoto existente:

1. Preflight manual da migration 00 — **CONCLUÍDO E APROVADO EM 19/09/2026**.
2. Validação manual da migration 01 — **CONCLUÍDA E APROVADA EM 20/09/2026**.
3. Bootstrap do histórico registrando 00, 01 e 02 — **CONCLUÍDO E APROVADO EM 20/09/2026**.
4. Migration 03 — **CONCLUÍDA E APROVADA EM 20/09/2026**.
5. Validação intermediária pós-03 — **CONCLUÍDA E APROVADA EM 20/09/2026**.
6. Migration 04 — **CONCLUÍDA E APROVADA EM 20/09/2026**.
7. Validação intermediária pós-04 — **CONCLUÍDA E APROVADA EM 20/09/2026**.
8. Migration 05 — **CONCLUÍDA E APROVADA EM 20/09/2026**.
9. Validação estrutural pós-implantação — **CONCLUÍDA E APROVADA EM 20/09/2026**.
10. Integração de código e E2E authenticated do Prontuário — **CONCLUÍDOS E APROVADOS EM 20/09/2026**. Inicialização local/login aprovados; smoke visual da tela autenticada permanece pendente. Os dados clínicos do E2E foram revertidos integralmente por `ROLLBACK`.

> **REGRA CRÍTICA: a migration 02 é a baseline de instalação nova e NÃO DEVE SER EXECUTADA FISICAMENTE NO BANCO EXISTENTE. No bootstrap, ela é apenas registrada como marco já representado pelo banco existente.**

**MIGRATION 02 NÃO É EXECUTADA.**

Cada etapa deve ser interrompida se o critério obrigatório anterior falhar. Rollback é separado e nunca automático.

As migrations 03, 04 e 05 devem usar a seção **Aplicação isolada de migrations
pós-baseline** de `RUNBOOK_EXISTING_DATABASE.md`. Cada workdir temporário contém
somente 00 até a versão alvo; o dry-run precisa listar exatamente uma migration.
O mecanismo foi validado em clone PostgreSQL 17.11 com a Supabase CLI 2.110.0.

## 13. CHECKPOINT DE BACKUP PRÉ-RELEASE

Checkpoint lógico aprovado em:

`D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260919_PRE_RELEASE_20260915`

| Arquivo | Tamanho | SHA-256 | Validação |
|---|---:|---|---|
| `clinica_patricia_public_schema_pre_release_20260915.sql` | 64.024 bytes | `FE0919365210D408BAFEDB41FC617177DE751C1C9A5AE2997B4D937F0C6740C7` | Schema legível e recuperável; não executado. |
| `clinica_patricia_public_data_pre_release_20260915.sql` | 41.113 bytes | `87679FFD8C1DA8C22899D2A437AF018DA906DED20EC0CF948ADA7FC541E2F917` | Dados de desenvolvimento de `public` legíveis e recuperáveis; não restaurados. |
| `CHECKPOINT_MANIFEST.txt` | 1.201 bytes | `888CECD284F4435D91896128DC071374126180D43A9073B78639A2FFBEEDC35C` | Manifesto validado. |

Conteúdo confirmado no checkpoint:

- schema `public` e dados de desenvolvimento de `public`;
- tabelas, RLS, policies, funções, triggers, constraints, índices e grants;
- manifesto presente;
- 112 `GRANT`s explícitos presentes;
- o dump não possui `REVOKE`;
- o dump não possui `ALTER DEFAULT PRIVILEGES`;
- Auth não exportado;
- Vault não exportado;
- valores de segredos não exportados;
- ausência de credenciais, tokens e chaves privadas conhecida após a verificação executada.

Limitação conhecida: em uma restauração futura, as ACLs e os default privileges devem ser conferidos e reconciliados com o release/runbook; não presumir que o dump, isoladamente, reproduz toda a política de privilégios.

### Snapshot pré-migration 03 de ACLs/default privileges

- Estado: **CRIADO E VALIDADO EM 20/09/2026**.
- Caminho: `D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260919_PRE_RELEASE_20260915\ACL_SNAPSHOT_PRE_MIGRATION_03_20260920.md`.
- SHA-256: `41C5FBAC9333079EBB83B57BD97C5883617782D055F8D92EB7385AAE54E3E4B5`.
- Escopo: ACLs de schemas, tabelas/views, sequences e funções; owners relevantes; default privileges de `postgres` no schema `public`, incluindo grantor, grantee, privilege type e grantable.
- Migration 03 no momento do snapshot: **NÃO EXECUTADA**.
- Estado remoto imediatamente após o snapshot: **INALTERADO**.
- Finalidade: referência determinística para comparação e recuperação das permissões anteriores à migration 03.

### Rollback prévio da migration 03

- Estado: **PREPARADO E VALIDADO EM 20/09/2026**.
- Caminho: `D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260919_PRE_RELEASE_20260915\ROLLBACK_MIGRATION_03_ACLS_20260920.sql`.
- SHA-256: `F1DA0658DB4FB1FC7B05060C5152586020D79699CCBB03812B62287F6A262B85`.
- Classificação: **COMPLETO** para os efeitos SQL da migration 03.
- Cobertura: restaura exatamente os default privileges revogados de `anon`, `authenticated` e `service_role`, conforme o snapshot anterior; os grants da migration 03 que já existiam no snapshot não exigem inversão.
- Migration 03 no momento da preparação do rollback: **NÃO EXECUTADA**.
- Rollback: **NÃO EXECUTADO**.
- Banco remoto no momento da preparação: **SEM ALTERAÇÕES**; fingerprints e ausência das oito RPCs revalidados. Após a aplicação aprovada da migration 03, este rollback continua disponível e permanece não executado.

## 14. ESTADO DO GIT

Estado Git atual verificado em 2026-09-19:

- Branch: `codex/checkpoint-local-2026-08-14`.
- HEAD: `18f256d675617741383228be1d4837fb8041c8b0`.
- Há alterações preexistentes não relacionadas e elas devem permanecer preservadas, sem inclusão automática em commits futuros.

Alterações preexistentes classificadas:

| Caminho | Estado Git | Classificação | Relação com este checkpoint |
|---|---|---|---|
| `09-DIARIO-DE-SESSOES.md` | modificado | documentação | Preexistente; não alterado por esta tarefa. |
| `database/releases/20260915/RUNBOOK_EXISTING_DATABASE.md` | modificado | documentação de release | Preexistente; não alterado por esta tarefa. |
| `src/App.tsx` | modificado | integração do Prontuário | Ajuste local da navegação auditada; não commitado. |
| `src/pages/Agenda.tsx` | modificado | integração do Prontuário | Uso da camada centralizada de RPC; não commitado. |
| `src/pages/Login.tsx` | modificado | produto/frontend | Preexistente; não alterado por esta tarefa. |
| `src/pages/Prontuario.tsx` | modificado | integração do Prontuário | Contratos validados e isolamento de contexto reforçado; não commitado. |
| `src/lib/prontuarioRpc.ts` | não rastreado | integração do Prontuário | Camada tipada das oito RPCs; não commitado. |
| `supabase/config.toml` | modificado | configuração/infraestrutura | Preexistente; não alterado por esta tarefa. |
| `03-REGRAS-AGENTES-IA.md` | não rastreado | documentação | Preexistente; não alterado por esta tarefa. |
| `04-ISOLAMENTO-DE-SISTEMAS.md` | não rastreado | documentação | Preexistente; não alterado por esta tarefa. |
| `07-BENCHMARK-E-EVOLUCAO.md` | não rastreado | documentação | Preexistente; não alterado por esta tarefa. |
| `12-PROMPTS-ONBOARDING-IA.md` | não rastreado | documentação | Preexistente; não alterado por esta tarefa. |
| `desativar_ibitiara.sql` | não rastreado | SQL operacional não aprovado | Preexistente; não executar nem versionar sem revisão específica. |
| `docs/mockups/mockup-home-caixa.html` | não rastreado | referência de interface | Preexistente; não alterado por esta tarefa. |
| `public/login-bg.png` | não rastreado | asset de interface | Preexistente; não alterado por esta tarefa. |

`CHECKPOINT.md` aparece como alteração documental desta etapa. Nenhum commit foi criado. As alterações locais do Prontuário listadas acima permanecem separadas das alterações preexistentes não relacionadas.

## 15. DECISÕES ARQUITETURAIS QUE NÃO DEVEM SER ESQUECIDAS

- O desenvolvimento principal trabalha diretamente no Supabase remoto.
- O Supabase remoto real é o ambiente principal de banco. Docker não é pré-requisito para evolução normal e só será usado futuramente se houver necessidade técnica específica e autorização.
- Não trocar a stack sem justificativa comprovada.
- Brotas e Ipupiara são clínicas/tenants distintos; dois CNPJs não autorizam cruzamento de prontuários.
- Isolamento de clínica deve ser garantido no banco por RLS e vínculos autorizados, não apenas por filtro de interface.
- Um usuário pode estar vinculado a mais de uma clínica, mas só pode agir no contexto permitido.
- O laboratório de Ibitiara é uma integração externa futura, não um tenant clínico criado por conveniência.
- Integrações futuras devem usar APIs/contratos explícitos, autenticação própria, escopo mínimo e trilha de auditoria.
- Consolidação financeira entre unidades, se futuramente autorizada, não implica acesso global a dados clínicos.
- O frontend não decide regras financeiras.
- Histórico financeiro não é reescrito; correções geram compensações auditáveis.
- Comissão histórica deve ser congelada no evento financeiro correspondente.
- Valores monetários não usam ponto flutuante.
- Storage, jobs, cache e exports também devem respeitar o tenant.
- RLS exige testes negativos, além dos testes de acesso autorizado.
- O frontend nunca recebe `service_role`, segredos de CPF, credenciais diretas de banco ou chaves privadas.
- Operações críticas devem preferir RPCs/serviços controlados, com `SECURITY DEFINER`, `search_path` fixo e grants mínimos quando aplicável.
- Financeiro permanece uma fase separada do release `20260915`.
- Mesmo sem dados reais de produção, segurança, privacidade, RLS e disciplina de backup são obrigatórias.

## 16. O QUE NÃO FAZER

### NUNCA FAZER SEM NOVA AUTORIZAÇÃO E VALIDAÇÃO

- executar a migration 02 no banco existente;
- executar `db reset --linked`;
- executar seed no remoto;
- executar `db push` indiscriminadamente;
- apagar o banco;
- alterar o Vault sem necessidade aprovada;
- expor passwords, access tokens, JWTs ou `service_role`;
- expor valores de `cpf_key` ou `cpf_pepper`;
- colocar dumps no Git;
- misturar backups dentro do repositório;
- criar novo checkpoint paralelo sem necessidade;
- alterar histórico financeiro existente;
- liberar acesso global entre clínicas;
- executar `desativar_ibitiara.sql` automaticamente;
- apagar ou sobrescrever alterações locais preexistentes.

## 17. ESTADO EXATO DO TRABALHO

O release `20260915` foi concluído diretamente no Supabase remoto real `xftnkusbyqzyvzrovroj` em 20/09/2026. As migrations 00, 01, 03, 04 e 05 estão aplicadas, validadas e registradas. A migration 02 permanece exclusivamente como baseline lógica e seu SQL nunca foi executado fisicamente no banco existente.

- Migration 00: PRESENTE, APLICADA/VALIDADA/REGISTRADA.
- Migration 01: PRESENTE, APLICADA/VALIDADA/REGISTRADA.
- Migration 02: PRESENTE COMO BASELINE LÓGICA; SQL NUNCA EXECUTADO FISICAMENTE.
- Migration 03: PRESENTE, APLICADA/VALIDADA/REGISTRADA.
- Migration 04 `hardening_geral`: PRESENTE, APLICADA/VALIDADA/REGISTRADA.
- Migration 05 `prontuario_rpc`: PRESENTE, APLICADA/VALIDADA/REGISTRADA.
- Histórico `supabase_migrations.schema_migrations`: contém exatamente 00–05.
- Estado estrutural final: 19 tabelas, 10 enums, 188 colunas, 27 funções de domínio, 14 triggers, 47 policies, 19 tabelas com RLS, 91 constraints e 34 índices válidos.
- Fingerprint bruto final: `19|10|188|215|14|47|19|91|34|8`.
- Fingerprint de domínio final: `19|10|188|27|14|47|19|91|34|8`.
- Oito RPCs do Prontuário: PRESENTES E VALIDADAS.
- Cinco índices novos da migration 05: PRESENTES.
- Três constraints novas da migration 05: PRESENTES.
- Trigger e função/helper de integridade: PRESENTES.
- Acesso clínico direto: BLOQUEADO conforme a migration 05; fronteira RPC implantada.
- Security Advisor: EXECUTADO; pendências fora do escopo preservadas.
- Performance Advisor: EXECUTADO; pendências preservadas para otimização futura.
- Default ACLs de `postgres`/`public`: 23 após a migration 03.
- Snapshot e rollback pré-03: preservados nos caminhos externos registrados; rollback não executado.
- Ambiente operacional: Supabase remoto real é o banco principal. Docker não é pré-requisito para evolução normal e só será usado futuramente por necessidade técnica específica e com autorização.
- Financeiro: permanece fora do escopo e não foi implantado por este release.
- Integração frontend do Prontuário: oito RPCs centralizadas e compatíveis com a migration 05; respostas validadas, isolamento de contexto reforçado, typecheck/lint/build aprovados.
- Teste E2E authenticated do Prontuário: APROVADO nas oito RPCs, incluindo round-trip e testes negativos; todos os dados clínicos e a auditoria do ensaio foram revertidos por `ROLLBACK`.
- Smoke local do Prontuário: inicialização e login APROVADOS sem autenticação; a tela autenticada do módulo não foi aberta e seu smoke visual permanece PENDENTE.
- Estado final do Prontuário: **INTEGRAÇÃO TÉCNICA APROVADA — SMOKE VISUAL PENDENTE**.
- Próximo módulo funcional prioritário: FINANCEIRO; auditoria técnica local inicial concluída, backend build e 10 testes unitários aprovados, infraestrutura/configuração privada ainda ausente.

## 18. PRÓXIMO PASSO ÚNICO

Criar e aprovar visualmente as duas telas de login: Clínica Brotas e Clínica Ipupiara. A fundação compartilhada já está preparada; não avançar para consolidação financeira nesta etapa.

## 19. REGRAS PARA QUALQUER IA FUTURA

### ANTES DE FAZER QUALQUER ALTERAÇÃO

1. Ler `CHECKPOINT.md` integralmente.
2. Executar `git status`.
3. Confirmar a branch.
4. Confirmar o commit.
5. Confirmar o Supabase project ref.
6. Comparar fingerprints quando a tarefa envolver o banco.
7. Verificar se o estado atual divergiu deste checkpoint.
8. Se houver divergência, **PARAR**.
9. Fazer somente uma etapa controlada por vez.
10. Nunca executar automaticamente o próximo passo registrado.
11. Após cada marco validado, atualizar **ESTE MESMO `CHECKPOINT.md`**.
12. Não criar checkpoints concorrentes.

## 20. HISTÓRICO DE MARCOS

| Data | Marco | Resultado |
|---|---|---|
| 07/09/2026 | Benchmark de produto e arquitetura | Referências de evolução e decisões arquiteturais registradas. |
| 15/09/2026 | Release de hardening `20260915` | Preparado e validado em clone. |
| 16/09/2026 | Compatibilidade com banco existente | Procedimento corrigido e validado sem executar fisicamente a baseline 02. |
| 19/09/2026 | Recovery completo do projeto | Estado do repositório, produto e release recuperado e consolidado. |
| 19/09/2026 | Auditoria remota read-only | Estado remoto e fingerprints confirmados sem escrita. |
| 19/09/2026 | Verificação dos segredos de CPF | `cpf_key` e `cpf_pepper` confirmados como existentes sem leitura dos valores. |
| 19/09/2026 | Checkpoint lógico | Schema e dados de `public` criados no diretório externo de backup. |
| 19/09/2026 | Validação do checkpoint | Checkpoint confirmado como recuperável, com limitação de ACLs/default privileges documentada. |
| 19/09/2026 | Preflight final do release | Decisão **GO**; nenhuma alteração remota executada. |
| 19/09/2026 | Preflight manual da migration 00 executado no Supabase remoto | **APROVADO**; banco existente, PostgreSQL, executor e fingerprints compatíveis; nenhuma migration posterior executada e nenhum histórico criado. |
| 20/09/2026 | Validação/execução controlada da migration 01 — `btree_gist` | **APROVADO**; `pgcrypto` e `btree_gist` preservados nos schemas validados, owner mantido, domínio inalterado, oito RPCs ausentes e histórico ainda não criado. |
| 20/09/2026 | Bootstrap controlado do histórico de migrations | **APROVADO**; 00, 01 e 02 registrados; migration 02 não executada fisicamente; 03–05 ausentes e domínio clínico inalterado. |
| 20/09/2026 | Snapshot pré-migration 03 de ACLs/default privileges | **APROVADO**; ACLs, owners e default privileges capturados fora do repositório; migration 03 não executada e estado remoto inalterado. |
| 20/09/2026 | Rollback prévio da migration 03 | **PREPARADO E VALIDADO — COMPLETO**; restauração dos default privileges derivada do snapshot real; arquivo não executado e banco remoto inalterado. |
| 20/09/2026 | Mecanismo de migration isolada pós-baseline | **APROVADO EM CLONE**; workdir cumulativo limitado à versão alvo aplicou/registrou somente 03, manteve 04/05 ausentes, preservou 02 como marco lógico e passou nos ensaios de falha de SQL e de registro. |
| 20/09/2026 | Migration 03 — ACLs/default privileges aplicada diretamente no Supabase remoto | **APROVADA**; registrada como `20260915010003`, default ACLs reduzidas de 48 para 23, ACLs de objetos existentes preservadas e domínio estrutural inalterado. |
| 20/09/2026 | Release `20260915` concluído no Supabase remoto real | **APROVADO**; migrations 00–05 presentes, 02 somente como baseline lógica, fingerprints finais conferidos, oito RPCs e objetos de integridade validados, Advisors executados. |
| 20/09/2026 | E2E authenticated do Prontuário no Supabase real | **APROVADO**; oito RPCs, round-trip, isolamento cross-clinic, grants e bloqueio de acesso direto validados; todos os dados de teste revertidos por `ROLLBACK`. |
| 20/09/2026 | Smoke local pós-E2E do Prontuário | **INICIALIZAÇÃO APROVADA; VISUAL AUTENTICADO PENDENTE**; Vite iniciou, login renderizou, typecheck/lint/build permaneceram válidos e nenhuma escrita remota ocorreu. |
| 20/09/2026 | Auditoria técnica inicial do Financeiro | **CONCLUÍDA LOCALMENTE**; frontend e backend compilam, 10 testes unitários passam e bloqueios de ativação/UX/erros/valores monetários foram registrados sem tocar o banco. |
| 24/09/2026 | Fundação de login multi-clínica por domínio | **IMPLEMENTADA E VALIDADA LOCALMENTE**; Brotas/Ipupiara centralizadas, previews locais criados, DOMÍNIO ≠ AUTORIZAÇÃO preservado, proprietária multi-clínica contemplada e design final mantido pendente. |
| 24/09/2026 | Troca das imagens hero dos logins | **APROVADA E VALIDADA LOCALMENTE**; Brotas usa `imagem_login_brotas.png` e Ipupiara usa `imagem_login_ipupiara.png`, sem alteração de layout, CSS, textos, autenticação ou acesso. |
| 24/09/2026 | Remoção do login genérico | **APROVADA E VALIDADA LOCALMENTE**; `/login` local redireciona para Brotas, produção resolve por hostname e domínio desconhecido permanece bloqueado sem formulário. |

## 21. PROTEÇÃO PRÉ-MIGRATION 04 — REGISTRO HISTÓRICO DE TENTATIVA ANTERIOR

Esta seção preserva evidências de uma tentativa anterior, bloqueada antes da execução. Ela foi superada pela aplicação e validação posterior das migrations 04 e 05 no Supabase remoto, registradas no estado final e no histórico de marcos acima. Na tentativa anterior, nenhum SQL de migration havia sido enviado ao banco.

Captura somente leitura no painel autenticado de `xftnkusbyqzyvzrovroj`, executor `postgres`, imediatamente antes da tentativa de aplicação de 04/05. Histórico confirmado: 00–03; 04/05 ausentes. Registro da 02: `baseline existente validada por fingerprint; SQL 02 não executado`. Fingerprint bruto: `19|10|188|204|13|47|19|88|29|3`; 188 funções membros de `btree_gist`, portanto 16 funções de domínio; oito RPCs ausentes. Default ACLs `postgres`/`public`: 23. Existência booleana de `cpf_key` e `cpf_pepper`: verdadeira, sem leitura de valores.

Estado anterior dos objetos diretamente afetados pela 04, capturado de `pg_proc` e `pg_policy`; material de recuperação manual, não executar automaticamente:

- `usuario_tem_vinculo_ativo()`: ausente antes da 04.
- `cpf_encrypt(text)`, `cpf_hash(text)` e `cpf_decrypt(bytea)`: owner `postgres`, `SECURITY DEFINER`, linguagem SQL, `STABLE`, `search_path=public, vault, extensions`.
- ACL anterior das três funções CPF: `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`; todos os grants `EXECUTE` sem grant option.
- `usuarios_self_update`: UPDATE, permissiva, role `PUBLIC`, USING `(id = auth.uid())`, WITH CHECK ausente.
- `agendamentos_update`: UPDATE, permissiva, role `authenticated`, USING `((clinica_id IN ( SELECT clinicas_do_usuario() AS clinicas_do_usuario)) AND eh_proprietaria_ou_recepcao(clinica_id))`, WITH CHECK ausente.

Definições anteriores das funções CPF:

```sql
CREATE OR REPLACE FUNCTION public.cpf_encrypt(p_cpf text)
 RETURNS bytea
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
 select extensions.pgp_sym_encrypt(regexp_replace(p_cpf,'[^0-9]','','g'),
 (select decrypted_secret from vault.decrypted_secrets where name='cpf_key'))
$function$;

CREATE OR REPLACE FUNCTION public.cpf_hash(p_cpf text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
 select encode(extensions.hmac(regexp_replace(p_cpf,'[^0-9]','','g'),
 (select decrypted_secret from vault.decrypted_secrets where name='cpf_pepper'),
 'sha256'),'hex')
$function$;

CREATE OR REPLACE FUNCTION public.cpf_decrypt(p_enc bytea)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
 select extensions.pgp_sym_decrypt(p_enc,
 (select decrypted_secret from vault.decrypted_secrets where name='cpf_key'))
$function$;
```

Referências relacionadas, não alteradas pela 04: `clinicas_do_usuario()` tem owner `postgres`, SQL STABLE SECURITY DEFINER e `search_path=public`; consulta `usuarios_clinicas` por `auth.uid()` e vínculo ativo. `eh_proprietaria_ou_recepcao(uuid)` tem owner `postgres`, SQL STABLE SECURITY DEFINER e `proconfig=NULL`; consulta vínculo ativo de `proprietaria`/`recepcao`. Ambas possuem a mesma ACL anterior das funções CPF acima. Triggers relacionados capturados: `trg_calcular_hora_fim` em `agendamentos` (BEFORE INSERT OR UPDATE OF hora_inicio, profissional_id, chama `calcular_hora_fim_agendamento()`); `trg_audit_usuarios` em `usuarios` (AFTER INSERT OR DELETE OR UPDATE, chama `fn_auditoria()`). A 04 não altera esses triggers nem suas funções. As definições completas preexistentes também estão no checkpoint lógico de schema externo já registrado na seção 13.

Este é um documento vivo e a fonte de continuidade operacional do projeto. Após cada marco técnico validado, atualizar ESTE MESMO arquivo. Não criar versões paralelas sem necessidade.

# TODO.md — Clínica Patrícia

## Concluído recentemente

- [x] **Integração Agenda → Financeiro + Dashboard "Próximo paciente"**
  (sessão 05/08/2026). Orquestração entre telas que já existiam — nenhuma
  tabela nova.
  - **Agenda → Financeiro:** ao marcar um agendamento como "concluido" (menu
    rápido de status), a Agenda checa se há sessão de caixa aberta na
    clínica. Se houver, abre o modal "Registrar entrada" — **mesmo
    componente do Financeiro**, extraído para
    `src/components/financeiro/FormRegistrarEntrada.tsx` (props
    `pacienteIdInicial`/`profissionalIdInicial`, mais um `comCard` pra não
    duplicar sombra/raio quando já está dentro de um modal) — pré-preenchido
    com paciente, profissional e valor sugerido (`profissionais.valor_consulta`
    do profissional do agendamento). Se não houver caixa aberto, a mudança de
    status acontece normalmente e só aparece um aviso não-bloqueante e
    dispensável ("Sem caixa aberto — lance essa entrada manualmente quando
    abrir.") — nunca trava a mudança de status.
  - **Dashboard "Próximo paciente":** novo card (mesmo formato visual —
    avatar/nome/horário — já usado em "Atendimentos de hoje"), busca em
    `agendamentos` (clínica ativa, hoje, status agendado/confirmado,
    `hora_inicio >= agora`, primeiro por horário). Estado vazio: "Nenhum
    agendamento restante hoje." Fora de escopo (combinado): resto do
    Dashboard (Entradas/Saídas/Atendimentos hoje/Resumo por
    especialidade/Repasse) continua placeholder — só essa seção passou a
    usar dado real.
  - **Testado ao vivo, os dois cenários, claro e escuro:**
    - Com caixa aberto (Brotas): marquei "Maria Teste Silva" (10:00) como
      concluído → modal abriu sozinho, paciente/profissional/valor (R$
      500,00) corretos → registrei de verdade → total do Financeiro foi de
      R$ 500 para R$ 1.000, confirmando que a entrada gravou.
    - Sem caixa aberto: **Eduardo fechou a sessão de caixa de Brotas
      manualmente no banco só pra esse teste** (pedido por mim, já que
      "fechar caixa" ainda não existe como funcionalidade e não havia
      clínica de teste com profissional cadastrado e sem caixa aberto ao
      mesmo tempo — Ipupiara tem recepção de teste mas nenhum profissional
      vinculado, e só proprietária cadastra/vincula profissional). Marquei o
      mesmo agendamento como concluído de novo → aviso apareceu, sem abrir
      modal, status mudou normalmente, botão de fechar o aviso funciona.
      **Eduardo reabre o caixa em seguida**, restaurando o estado anterior.
    - "Próximo paciente": testado vazio ("Nenhum agendamento restante
      hoje") e com dado real (criei agendamento de teste às 14:00 do dia,
      apareceu certo).
  - `npm run build` limpo, sem erro de console em nenhum teste.
  - **Dado de teste desta sessão:** agendamento novo criado para
    05/08/2026 14:00 (Maria Teste Silva / Dr. Teste Brotas, status
    `agendado`) — só pra provar "Próximo paciente"; remover antes de
    produção junto com os outros dados de teste já listados.

- [x] **Agenda — frontend completo** (`src/pages/Agenda.tsx`, novo painel
  "Horários de atendimento" em `Profissionais.tsx`; schema já existia —
  `agenda_fundacao.sql`/`agenda_lista_espera.sql`, sessão anterior). Sistema
  visual v2 (sombra tingida, Fraunces, cores de status próprias — sem azul,
  de propósito, pra não colidir com a marca da Brotas).
  - **Grade do dia**: coluna por profissional com disponibilidade OU exceção
    no dia (profissionais sem nada naquele dia não aparecem); posiciona
    agendamentos por horário/duração real (`duracao_consulta_minutos`, não
    recalculada na tela); área fora do expediente com hachurado diagonal
    (exceção `folga`/`horario_especial` sempre prevalece sobre
    `disponibilidade_padrao` daquele dia). Clique no agendamento abre menu
    rápido de status (update direto).
  - **Faixa de resumo** (5 cards, contagem real do dia) + **painel de lista
    de espera** (botão "Agendar" pré-preenche o modal com paciente+
    profissional).
  - **3 modais funcionais**: Novo agendamento (hora_fim calculada pelo
    trigger do banco, nunca pelo front; erro de sobreposição —
    `exclusion_violation`/`23P01` — vira mensagem amigável), Marcar folga/
    horário especial (`agenda_excecoes`), Adicionar à lista de espera (erro
    de duplicata — `23505` — mensagem amigável).
  - **Painel "Horários de atendimento"** em Profissionais.tsx: lista de
    linhas dia da semana + início + fim (`disponibilidade_padrao`), salvar
    é delete+insert do conjunto. **Correção de permissão feita durante a
    sessão**: gateei o botão por engano só para proprietária (copiando
    "Editar valores"); o RLS de `disponibilidade_padrao` na verdade permite
    proprietária **e** recepção — criado `podeGerenciarAgenda` (papel via
    `usePapelNaClinica`) em `Cadastros.tsx`, passado como prop nova, e as
    3 ações da coluna Ações passaram a ser gateadas individualmente (Editar
    valores/Remover só proprietária; Horários de atendimento também
    recepção).
  - **Testado ao vivo, ponta a ponta, com `teste_recepcao_brotas`**: cadastrou
    horário de terça (08:00–18:00) pelo painel novo → apareceu certo na
    grade, com "fora do expediente" antes das 08:00 e depois das 18:00;
    criou agendamento real (Maria Teste Silva, 10:00) → posicionado certo;
    tentou criar outro no mesmo horário → bloqueado com a mensagem de
    sobreposição; mudou status para "Confirmado" pelo menu rápido → cor e
    contagem do card "Confirmados" atualizaram; adicionou paciente à lista
    de espera → chip "Lista de espera" e painel atualizaram; tentou
    duplicar → bloqueado com mensagem amigável; clicou "Agendar" na lista
    de espera → modal abriu com paciente/profissional pré-preenchidos;
    marcou folga num dia de semana igual (11/08) → coluna inteira virou
    hachurado. Claro e escuro, sem erro de console. `npm run build` limpo.
  - **Pendência de UX identificada, não resolvida nesta etapa**: não dá para
    marcar "horário especial" num dia em que o profissional não tem nenhum
    expediente cadastrado (a coluna, e o botão "⋯" que abre esse modal,
    só aparecem quando já existe disponibilidade OU exceção naquele dia —
    efeito colateral do requisito "profissionais sem expediente não
    aparecem"). Caso de uso real (ex.: atender num sábado excepcional)
    ainda não tem caminho na UI.
  - **Dados de teste desta sessão** (remover antes de produção): horário de
    terça cadastrado para "Dr. Teste Brotas"; agendamento de "Maria Teste
    Silva" às 10:00 em 04/08 (status confirmado); "João Teste Cadastro" na
    lista de espera do "Dr. Teste Brotas"; exceção de folga em 11/08/2026
    para "Dr. Teste Brotas".

- [x] **Agenda — lista de espera** (`agenda_lista_espera.sql`, sessão
  04/08/2026, complemento do schema da Agenda). Tabela `lista_espera`,
  vinculada a paciente + profissional específico (mesma disciplina de
  `agendamentos`). Índice único impede o mesmo paciente entrar 2x na fila
  do mesmo profissional enquanto ainda "aguardando" (mesmo princípio do
  caixa). RLS igual a agendamentos (proprietária/recepção tudo, médico só
  a própria fila).

- [x] **Agenda — fundação do schema** (`agenda_fundacao.sql`, sessão
  04/08/2026). Decisões confirmadas com o Eduardo antes de desenhar:
  horário semanal fixo com exceções pontuais por cima; duração da
  consulta fixa por profissional (não por serviço); só proprietária/
  recepção criam ou editam agendamentos (médico só vê a própria agenda).
  - `profissionais.duracao_consulta_minutos` (default 30min). Aproveitado
    pra limpar a duplicidade de `cadastrar_profissional` que ficou da
    sessão do repasse (existiam 2 versões sobrepostas, 6 e 8 parâmetros —
    agora é uma só, com 9).
  - `disponibilidade_padrao` — template semanal (profissional + clínica +
    dia da semana + horário). Sem trava de sobreposição no banco aqui de
    propósito (baixo risco, é só template administrativo).
  - `agenda_excecoes` — folga ou horário especial pontual por data.
  - `agendamentos` — o compromisso real. `hora_fim` sempre calculado no
    banco (trigger) a partir da duração do profissional, nunca aceito do
    cliente. **Trava de exclusão no banco impede 2 agendamentos do mesmo
    profissional sobrepondo horário** (cancelados não contam) — testada
    ao vivo: inseri 2 horários sobrepostos de propósito, o banco bloqueou
    o segundo com `exclusion_violation`, e limpei o teste depois.
  - RLS: proprietária/recepção veem e editam tudo da clínica; médico só
    vê a própria agenda (via `profissionais.usuario_id`). Trava dupla no
    INSERT igual à de `entradas_caixa` (paciente e profissional precisam
    ser da mesma clínica do agendamento).
  - **Pendente:** frontend (telas de disponibilidade, exceções e
    calendário de agendamentos) ainda não existe — só o banco foi
    construído nesta etapa.

- [x] **Design system v2 — retrofit visual premium** (`01-DESIGN-SYSTEM.md`,
  sessão 04/08/2026). Claude assumiu papel de design lead. Direção definida
  e aprovada por protótipo interativo (sombra tingida de duas camadas,
  cards com fundo por categoria de significado — financeiro/pessoas/
  agenda/repasse —, tipografia Fraunces+Inter, selo dourado como elemento-
  assinatura). Corrigido antes de aplicar: paleta de categoria ajustada
  pra não colidir com as cores reais de marca por clínica (Brotas azul,
  Ipupiara verde, Ibitiara laranja — conferido no banco); `--cor-primaria`
  e derivados mantidos intocados, sistema de marca por clínica não mudou.
  - **Dashboard.tsx** — concluído. Ajustes de uma segunda rodada: sombra
    reforçada (~40% mais blur, dentro do limite autorizado), nova seção
    "Repasse do dia por profissional" (categoria dourada, fórmula
    `total * (1 - taxa/100)` — bug de unidade encontrado e corrigido
    nessa etapa), selo dourado no seletor de clínica (`Sidebar.tsx`,
    letra = 2ª letra do nome pra não dar "C" nas 3 clínicas, cor da letra
    = `--cor-primaria` da clínica ativa). Testado claro/escuro, seletor
    principal + variante mini do dropdown (usuário multi-clínica real).
  - **Financeiro.tsx** — concluído. Título → `.texto-titulo-tela` (classe
    renomeada de `.texto-saudacao`, reaproveitada em todas as telas).
    Cards sem borda (sombra substitui, §4 do design system). Chip "Total"
    em categoria financeiro. Testado com entrada real na tabela.
  - **Pacientes.tsx** — concluído. Mesmo padrão de card. Chip "N
    pacientes" em categoria pessoas. CPF com tabular-nums. Inputs e
    divisórias de tabela mantiveram borda (só o card perdeu).
  - **Cadastros Estruturais** (`Cadastros.tsx` + `Especialidades.tsx` +
    `Profissionais.tsx` + `Servicos.tsx`) — **concluído, fechado por
    revisão de código** (`git show d3c664a`, linha a linha) em vez de
    print, já que segue exatamente o mesmo padrão de token já confirmado
    ao vivo em Financeiro/Pacientes. Chip "N profissionais" com
    singular/plural tratado, tabular-nums em valor_consulta/taxa_repasse
    (desktop e mobile), cards sem borda, título e sombra padronizados.
  - **Retrofit visual completo** (Dashboard → Financeiro → Pacientes →
    Cadastros) — fechado em 04/08/2026.

- [x] **Financeiro — Fundação do repasse profissional** (`10-PLANO-DIRETOR.md`,
  seção "Modelo real de repasse", decisões de 03/08/2026). Dois escopos
  pequenos, preparando o cálculo de repasse (80/20) que ainda não existe:
  - **Valor da consulta no profissional:** colunas `valor_consulta` (numeric,
    opcional) e `taxa_repasse_clinica` (numeric, `not null default 20`) em
    `profissionais`. RPC `cadastrar_profissional` atualizada para aceitar os
    dois campos novos (parâmetros com default, sem quebrar a assinatura
    existente). RLS de UPDATE já existente (`profissionais_update`) já cobria
    a edição — sem policy nova. Tela `Profissionais.tsx`: campos no formulário
    de cadastro + colunas "Valor consulta"/"Repasse clínica" na lista + nova
    ação **"Editar valores"** (só proprietária, edição inline via `UPDATE`
    direto).
  - **Vínculo paciente + profissional na entrada:** colunas `paciente_id` e
    `profissional_id` (`not null`, referenciando `pacientes`/`profissionais`)
    em `entradas_caixa`. RLS de INSERT reforçada: além do que já existia
    (sessão aberta da mesma clínica), agora também exige que o paciente e o
    profissional referenciados pertençam à mesma clínica do lançamento — trava
    dupla também no servidor (`POST /api/caixa/entrada` valida os dois antes
    do INSERT, `400` claro se inválidos). Tela `Financeiro.tsx`: seletores de
    paciente e profissional (ambos obrigatórios); ao escolher o profissional,
    o campo "Valor" é pré-preenchido com o `valor_consulta` dele (editável).
  - SQL (`valor_consulta_e_vinculos.sql`) apagou a única entrada de teste
    antiga de `entradas_caixa` (sem paciente/profissional real para
    preencher retroativamente) antes de tornar as colunas obrigatórias —
    mostrado e confirmado pelo Eduardo antes de rodar.
  - **Testado, ao vivo, no navegador:** proprietária definiu `valor_consulta
    R$ 500,00` no "Dr. Teste Brotas" pela tela "Editar valores" (confirmado
    no banco); recepção de Brotas logada de verdade, selecionou "Maria Teste
    Silva" + "Dr. Teste Brotas", valor pré-preencheu `500` automaticamente,
    registrou a entrada → apareceu na lista (Paciente/Profissional/Forma/
    Valor) e no total (`R$ 500,00`); confirmado também via consulta direta
    que a linha gravou `paciente_id`/`profissional_id` corretos. `npm run
    build` limpo em `server/` e na raiz.
  - **Pendências remanescentes:** cálculo automático do repasse (80/20) a
    partir da soma das entradas por profissional — ainda não construído,
    é a próxima etapa depois da Agenda, conforme sequência decidida no
    `10-PLANO-DIRETOR.md`; histórico de pagamento na ficha do paciente
    (mesma seção do plano diretor); remover a entrada de teste registrada
    nesta sessão (`Maria Teste Silva`/`Dr. Teste Brotas`, `R$ 500,00`, id
    `23cc9df1-8aba-418a-b77a-4e474948a265`) antes de produção.

- [x] **Financeiro — Registrar Entrada** (recebimento manual dentro do caixa
  aberto, ainda sem vínculo com agenda — `11-PERFIL-PROPRIETARIA.md` seção 2).
  Segue exatamente o padrão de Abrir Caixa. Banco: tabela `entradas_caixa`
  (`entradas_caixa.sql`) + enum `forma_pagamento_caixa` (dinheiro, pix, cartão
  débito/crédito, transferência, convênio, cortesia) + RLS reaproveitando
  `eh_proprietaria_ou_recepcao()` — trava dupla de que a sessão referenciada
  esteja `aberto` e seja da mesma clínica (`WITH CHECK` da policy de INSERT
  **e** checagem na rota do servidor) + **sem** policy de UPDATE/DELETE
  (registro financeiro publicado é imutável) + auditoria. Aplicado no banco
  por Eduardo, revisado antes de rodar (arquivo mostrado, confirmação
  explícita). Servidor: `POST /api/caixa/entrada`
  (`server/src/routes/entradaCaixa.ts`) — o cliente nunca escolhe
  `sessao_caixa_id`, o servidor resolve a sessão aberta da clínica ativa
  sozinho. Frontend: `src/pages/Financeiro.tsx` ganhou "Registrar entrada"
  (formulário) + "Entradas da sessão" (lista mais recente primeiro + total em
  destaque), visível só quando há caixa aberto; novo
  `src/hooks/useEntradasCaixa.ts` e `registrarEntradaCaixa()` em
  `src/lib/api.ts`.
  **Testado, os 4 cenários, ao vivo via REST com token de sessão real:**
  recepção de Brotas registrando entrada (caixa já aberto) → `201`; médico
  (`teste_medico_brotas`) tentando registrar em Brotas (mesmo caixa aberto)
  → `403`; valor `0` e valor negativo → `400` nos dois; recepção de Ipupiara
  (sem caixa aberto lá) → `409` "Nenhum caixa aberto...". `npm run build`
  limpo em ambos (`server/` e raiz); tela conferida no navegador (form +
  lista + total, mobile 375px sem overflow, tema escuro via tokens) antes do
  SQL rodar — sem submeter de verdade, só depois com o banco pronto.
  **Usuário de teste novo:** `teste_recepcao_ipupiara@teste.local` (papel
  `recepcao`, só Clínica Ipupiara, sem caixa aberto) — necessário para o
  cenário `409`.
  **Nota sobre `teste_medico_brotas`:** login estava quebrado (`500 Database
  error querying schema`) por a conta ter sido criada direto nas tabelas do
  Supabase Auth (fora do fluxo `Authentication > Add user`) — faltava
  registro em `auth.identities` e havia colunas internas (`confirmation_token`
  e afins) `NULL` em vez de vazias. Eduardo corrigiu direto no banco (dois
  ajustes, o primeiro não resolveu sozinho). Ver risco equivalente já
  registrado em "Erros / riscos conhecidos" — não criar mais contas de teste
  fora do painel do Supabase.
  **Pendências remanescentes:** as mesmas de Abrir Caixa (fechar caixa,
  esconder formulários de quem não é proprietária/recepção na UI) + remover
  os dados de teste desta rodada (ver "Remover dados de teste" abaixo).

- [x] **Financeiro — Abrir Caixa** (primeira funcionalidade real do módulo,
  `11-PERFIL-PROPRIETARIA.md` seção 4). Banco: tabela `sessoes_caixa` +
  enum `status_sessao_caixa` + índice único parcial (`sessoes_caixa_aberta_unica`,
  no máximo 1 sessão `aberto` por clínica, garantido no banco) + função
  reutilizável `eh_proprietaria_ou_recepcao()` (decisão: proprietária E
  recepção podem abrir caixa) + RLS (SELECT livre a vinculados, INSERT só
  proprietária/recepção, **sem** policy de UPDATE/DELETE ainda — fechamento é
  etapa futura) + auditoria. Aplicado no banco por Eduardo
  (`abrir_caixa.sql`). Servidor: primeira rota de **escrita** real,
  `POST /api/caixa/abrir` (`server/src/routes/caixa.ts`) — sem RPC/transação
  customizada (um `INSERT` já é atômico; a corrida é resolvida pelo índice
  único, não por lógica de aplicação), continua **sem `service_role`**.
  Frontend: `src/pages/Financeiro.tsx` (substituiu o placeholder), lê o
  status do caixa direto do Supabase (`useSessaoCaixaAberta`) e só a
  abertura passa pelo servidor (`src/lib/api.ts`, nova `VITE_API_URL`).
  **Testado, os 4 cenários:** médico tentando abrir → `403` (RLS, papel
  errado); recepção de Brotas abrindo → `201`; tentando abrir de novo (mesma
  clínica) → `409` com mensagem clara; tela confirmada nos dois estados
  (formulário "Abrir caixa" quando não há sessão / cartão "Caixa aberto desde
  HH:mm, valor inicial R$ X" quando há) — testado com dois usuários reais
  (`teste_medico_ibitiara` para o estado vazio em Ibitiara,
  `teste_recepcao_brotas` para abrir de verdade em Brotas). Responsivo
  (mobile) e tema escuro conferidos sem regressão.
  **Usuário de teste novo:** `teste_recepcao_brotas@teste.local` (papel
  `recepcao`, só Clínica Brotas) — criado pelo Eduardo via painel do
  Supabase (signup público rejeitou o domínio `.local`; não introduzimos
  `service_role` para contornar, como combinado).
  **Pendências remanescentes:** fechar caixa (valor_esperado/contado/
  diferença, com sua própria migration e RLS de UPDATE); esconder o
  formulário de abertura na tela para quem não é proprietária/recepção
  (hoje a segurança real está no servidor/RLS — a UI só mostra um
  formulário que falharia com 403 se um médico tentasse usá-lo); remover
  a sessão de caixa de teste aberta em Brotas antes de produção.

- [x] **Fundação mínima do backend Node.js + Fastify** (`/server`, pré-requisito
  do módulo Financeiro — `10-PLANO-DIRETOR.md`/`11-PERFIL-PROPRIETARIA.md`).
  Projeto próprio (`package.json`/`node_modules`/`tsconfig.json` independentes
  do frontend), Fastify + TypeScript + `tsx`. Sem lógica financeira e **sem
  chave privilegiada (`service_role`)** nesta etapa — toda consulta usa um
  client Supabase escopado ao token JWT da própria requisição, respeitando a
  mesma RLS do frontend (ver `server/README.md` para quando introduzir
  `service_role`). Implementado: `requireAuth` (valida `Authorization: Bearer`
  via `auth.getUser`) + `resolveClinicaAtiva` (header `X-Clinica-Id`,
  confirmado via RLS de `clinicas` — ponte até existir resolução por
  subdomínio) + rota `GET /api/ping`. **Testado localmente, os 4 cenários:**
  sem token → `401`; com token e sem `X-Clinica-Id` → `400`; com token e
  clínica NÃO vinculada ao usuário → `403` (prova que o servidor reforça o
  isolamento, não só confia no header); com token e clínica vinculada → `200`
  com `{ usuario, clinica }` corretos. `npm run build` do servidor sem erro de
  tipos. `ARCHITECTURE.md` atualizado (a camada deixou de ser "não
  implementada"). **O frontend ainda não chama esse servidor** — só passa a
  ser usado quando o módulo Financeiro existir (ver contrato de chamada
  futura em `server/README.md`).

- [x] **Módulo Cadastros Estruturais** (especialidades, profissionais,
  profissionais_clinicas, serviços/preços) — schema aplicado no banco
  (`cadastros_estruturais.sql`, rodado pelo Eduardo no projeto
  `xftnkusbyqzyvzrovroj`), frontend implementado
  (`src/pages/cadastros/{Cadastros,Especialidades,Profissionais,Servicos}.tsx`,
  `src/hooks/usePapelNaClinica.ts`, item "Cadastros" na sidebar) e
  `npm run build` limpo. **Teste de fumaça de segurança passou** (banco,
  não só UI): usuário de teste `teste_medico_ibitiara@teste.local`
  (papel `medico`, vinculado só à Clínica Ibitiara) —
  - Escrita bloqueada pela RLS em `especialidades`/`servicos` e pela RPC
    `cadastrar_profissional` (mensagem "Sem permissão"), mesmo na própria
    clínica dele — confirma que só `proprietaria` escreve.
  - Profissional, serviço e vínculo de teste cadastrados em **Brotas**
    (`Dr. Teste Brotas`, `Consulta Teste`) ficaram **invisíveis** para esse
    usuário, via REST direto (não só na tela) e na tela (abas Profissionais/
    Serviços vazias).
  - Especialidade de teste (catálogo comum) apareceu normalmente — correto,
    catálogo é global por design, não é vazamento.
  Responsivo (mobile 375px, sem overflow horizontal) e tema escuro conferidos
  na tela nova (cor do card bate com o token `--fundo-card`).
  **Pendências remanescentes (próxima iteração):** edição de dados
  cadastrais do profissional (hoje só criar/vincular/desativar, mesmo recorte
  que `Pacientes.tsx` adotou no início); remover os registros de teste
  (`ESPECIALIDADE_TESTE_RLS_MEDICO` não foi criado — bloqueado; mas
  `Cardiologia Teste` / `Dr. Teste Brotas` / `Consulta Teste` em Brotas
  ficaram no banco e devem ser removidos antes de produção, junto com os
  demais dados de teste já listados abaixo).

- [x] **Seletor de clínica funcional (frontend)** — `useClinicaAtiva.ts` reescrito:
  não busca mais sozinho no banco (`.limit(1)`); agora recebe a lista completa
  de `useClinicasDoUsuario` e administra qual está ativa, com
  `selecionarClinica(id)` validando que o id pertence à lista (RLS-limitada)
  antes de aceitar. Persistido em `localStorage`
  (`clinica-patricia:clinica-ativa-id`), com auto-validação a cada carregamento
  (id salvo de outro usuário/clínica desvinculada → cai para a primeira).
  Dropdown da sidebar (`Sidebar.tsx`) agora troca de clínica de verdade — cor
  (`--cor-primaria`/`--cor-secundaria`/`--cor-menu`) e lista de Pacientes
  atualizam juntas. Com só 1 clínica vinculada, o bloco vira estático (sem
  dropdown) — comportamento de funcionário comum.
  **Bug real encontrado e corrigido nesta sessão:** condição de corrida no
  mount — `useClinicasDoUsuario` marcava `carregando=false` com lista vazia
  antes da sessão terminar de carregar, fazendo `useClinicaAtiva` zerar
  prematuramente a seleção salva no localStorage. Corrigido: "não habilitado"
  não conta mais como resposta definitiva de "sem clínicas".
  Testado: troca Brotas→Ipupiara→Ibitiara (cor + sidebar + lista de Pacientes
  mudam juntas, sem vazar dado de outra clínica), persistência após F5, e
  funcionamento dentro do drawer mobile.
  **Dados:** confirmado ao vivo que `usuarios_clinicas` já vinculava o usuário
  de teste às 3 clínicas como `proprietaria` (o diagnóstico original de "sem
  vínculo" não procedia — só faltava o código de troca). Brotas e Ipupiara já
  tinham as cores certas (azul/verde); só a Ibitiara segue no roxo provisório
  até o SQL (entregue ao Eduardo, `ibitiara_cor.sql`) ser rodado no Supabase —
  não consigo escrever em `clinicas` com a chave anon (só `SELECT`, sem
  `UPDATE`, confirmado por um teste seguro que não alterou nada).
- [x] **Shell do app (sidebar + cabeçalho)** — importado do Claude Design
  (`Dashboard Clinica.dc.html`) e adaptado em `src/components/shell/`
  (`AppShell.tsx`, `Sidebar.tsx`, `icons.tsx`, `PlaceholderScreen.tsx`, `types.ts`)
  + `src/pages/Dashboard.tsx`. Sidebar usa `var(--cor-menu)` (cor real por
  clínica, vinda do banco); novos tokens `--menu-*` (branco sobre a sidebar) e
  `--cor-categoria-1..5` (paleta placeholder do gráfico de especialidades) em
  `src/index.css`. Menu com os 7 itens previstos; só Dashboard e Pacientes têm
  tela real, os demais mostram `PlaceholderScreen`. Pacientes agora renderiza
  DENTRO do shell (não mais tela cheia própria). Responsivo: sidebar fixa no
  desktop (`lg:`), vira drawer com overlay abaixo disso — testado nos 3
  tamanhos (375/768/1280) e nos dois temas. Dados do Dashboard (fluxo de
  caixa, atendimentos, resumo por especialidade) são **placeholder fixo**,
  claramente comentados no código, até os módulos de Agenda/Financeiro
  existirem. Seletor de clínica na sidebar é **visual apenas** (lista as
  clínicas reais do usuário via `useClinicasDoUsuario`, mas trocar de clínica
  ainda não faz nada — ver pendência "Seletor de clínicas" abaixo). Rodapé da
  sidebar usa o e-mail da sessão como placeholder (sem nome/cargo reais ainda
  — decisão tomada nesta sessão para não abrir uma nova consulta ao banco
  fora do escopo do shell).
- [x] **Cadastro + Lista de Pacientes (frontend)** — src/pages/Pacientes.tsx.
  Testado ponta a ponta: listagem com CPF descriptografado via RPC; bloqueio de
  cadastro sem consentimento LGPD; cadastro com criptografia de CPF (round-trip
  confirmado); bloqueio de CPF duplicado por clínica (constraint cpf_hash,
  error.code 23505); tema preservado (claro/escuro); responsivo (cards no mobile).
  Pendente: edição e exclusão de paciente (próximo módulo).
- [x] **Módulo de Tema (frontend)** — cor por clínica (do banco) + modo claro/escuro,
  via tokens (`src/index.css`, `src/theme/ThemeProvider.tsx`,
  `src/theme/ThemeToggle.tsx`). Testado: login aplica a cor da clínica; claro/escuro
  funciona e persiste após F5; cor da marca idêntica nos dois modos; nenhuma cor
  literal em componente (verificado por grep).

## Pendências — Frontend

- [ ] **CORREÇÃO LGPD — consentimento no cadastro de paciente.** Hoje o cadastro é
  bloqueado sem "consentimento LGPD" (um booleano). Isso está juridicamente errado:
  atendimento de saúde usa a base "tutela da saúde", que não exige consentimento.
  Corrigir: remover o bloqueio obrigatório e trocar por registro de bases legais por
  finalidade (consentimento só para marketing/uso de imagem). Ver `10-PLANO-DIRETOR.md`
  e `DEVELOPMENT_RULES.md`. Prioridade: fazer ao revisitar o módulo Pacientes (edição/
  exclusão), para não empilhar mais código sobre a suposição errada.

- [ ] **Resolução por subdomínio** — ler o subdomínio → resolver a clínica ativa → setar
  o contexto do app (e, quando houver backend, `app.clinica_ativa`).
- [ ] **Tela de login pintada por clínica** — depende da RPC pública por subdomínio.
- [ ] **Seletor de clínicas restrito por endereço** — a troca no dropdown já
  funciona (ver "Concluído"), mas hoje qualquer usuário com >1 clínica vê o
  seletor; falta a resolução por subdomínio para travar o médico/recepção na
  clínica do endereço mesmo que ele tenha vínculo com mais de uma (a
  proprietária deveria ser a única a ver o seletor, no endereço de gestão).
- [ ] **Nome/cargo reais no rodapé da sidebar** — hoje mostra o e-mail da sessão
  (placeholder). Trocar por `usuarios.nome_completo` + `usuarios_clinicas.papel`
  (RLS já testada, é só uma consulta nova — ver `useClinicaAtiva.ts` como
  padrão de referência).
- [ ] **Edição e exclusão (soft delete) de paciente**.
- [ ] **Módulo Agenda / atendimentos** — o Dashboard já tem o card "Atendimentos
  de hoje" pronto no visual (`src/pages/Dashboard.tsx`), com dados placeholder;
  falta ligar aos dados reais quando o módulo existir.
- [ ] **Módulo Prontuário** (templates por especialidade; dados clínicos criptografados).
- [ ] **Módulo Financeiro** — o Dashboard já tem o card "Fluxo de caixa do dia"
  pronto no visual, com dados placeholder; falta ligar aos dados reais.
- [ ] **Relatórios e dashboards** com dados reais (hoje é `PlaceholderScreen`).

## Pendências — Backend / Infra

- [ ] **Trocar `cpf_key` e `cpf_pepper` do Vault** por valores definitivos gerados de
  forma privada — os atuais são **provisórios de teste**. (Fazer antes da produção.)
- [ ] **Remover dados de teste** do banco: usuário `teste_medico_brotas@teste.local`
  e pacientes de amostra (Maria Teste Silva / João Teste Souza / João Teste Cadastro,
  este último criado durante a validação do módulo de Pacientes). Também da
  validação do módulo Cadastros: usuário `teste_medico_ibitiara@teste.local`
  (só Ibitiara) e os registros de teste em Brotas — especialidade
  `Cardiologia Teste` (id `aaaaaaaa-1111-...`), profissional `Dr. Teste Brotas`
  (id `aaaaaaaa-2222-...`) e serviço `Consulta Teste` (id `aaaaaaaa-3333-...`).
  Também da validação do módulo Financeiro/Abrir Caixa: usuário
  `teste_recepcao_brotas@teste.local` (papel `recepcao`, só Brotas) e a
  sessão de caixa de teste aberta em Brotas (`valor_abertura 150,50`, id
  `a4a18e49-6634-4058-9fd8-07f3b065fd63`) — como ainda não existe "fechar
  caixa", essa sessão fica aberta até essa feature existir ou até alguém
  encerrá-la manualmente no banco. Também da validação do módulo
  Financeiro/Registrar Entrada: usuário `teste_recepcao_ipupiara@teste.local`
  (papel `recepcao`, só Ipupiara) e a entrada de teste registrada em Brotas
  (`forma_pagamento pix`, `valor 85,90`, id `bf9ba585-...`) — **já removida**,
  apagada pelo próprio SQL de `valor_consulta_e_vinculos.sql` (03/08/2026).
  Também da validação da Fundação do repasse: `valor_consulta R$ 500,00`
  cadastrado no profissional de teste `Dr. Teste Brotas` (rever se é valor
  real antes de produção, ou zerar) e a nova entrada de teste em Brotas
  (paciente `Maria Teste Silva`, profissional `Dr. Teste Brotas`,
  `valor 500,00`, id `23cc9df1-8aba-418a-b77a-4e474948a265`).
- [ ] **Rodar o SQL da cor da Clínica Ibitiara** (`ibitiara_cor.sql`, entregue ao
  Eduardo) — terracota `#c2410c`/`#fed7aa`/`#7c2d12`, escolhida e aprovada
  nesta sessão. Só falta executar no SQL Editor do Supabase.
- [ ] **Nome de exibição da proprietária** — hoje "Proprietária" (placeholder).
- [ ] Criar a **RPC `clinica_publica_por_subdomain`** (para theming pré-login).
- [ ] **Refinamento da auditoria**: registros de mudança na própria `clinicas`/`usuarios`
  ficam com `clinica_id` nulo e ninguém os lê; decidir política (ex.: preencher com o id
  da clínica ou dar acesso à proprietária).
- [ ] **Decidir sobre a camada Node.js + Fastify (+ Prisma)** — necessária para reforçar
  a trava por clínica ativa e para a lógica do financeiro. Ver `ARCHITECTURE.md`.
- [ ] **Política de esquecimento LGPD** vs auditoria (apagar/anonimizar dado, preservar
  registro de que existiu).
- [ ] Configurar **GitHub** (versionamento/backup) e deploy na **Vercel** com wildcard de
  subdomínio.

## Módulo Financeiro — regras de negócio já decididas (a implementar)

- **Objetivo:** proprietária com o fluxo de caixa "na palma da mão" (saldo do dia por
  clínica, sem cliques).
- Registrar **pagamento**: valor, forma, data, status (pago/pendente/atrasado) e campo
  opcional "Nº da nota fiscal" (texto livre).
- **Nota fiscal é emitida MANUALMENTE fora do sistema** (site da prefeitura, CNPJ da
  proprietária). O fluxo de caixa funciona 100% dentro do sistema, sem depender da NF.
- Vínculo **agenda → atendimento → status de pagamento** (quem pagou / quem deve).
- **Fechamento por especialidade/profissional** (quanto cada médico gerou).
- Todo lançamento financeiro **auditável** (quem lançou, quando, editou).
- **Cálculos financeiros nunca no frontend** — passam por backend próprio quando existir.

## Erros / riscos conhecidos

- **Ambiente com `NODE_ENV=production`** no PC de desenvolvimento fazia o `npm install`
  pular as ferramentas de dev. **Contornado** com um `.npmrc` (`include=dev`) na raiz.
- **Trava por clínica ativa** não é aplicada no caminho frontend-direto para escrita
  (INSERT). A segurança-base (isolamento por vínculo) continua valendo sempre; o reforço
  da trava exige backend próprio OU disciplina do app (filtrar/gravar pela clínica do
  endereço). Ver `AUTH_AND_PERMISSIONS.md`.
- Segredos do Vault são **provisórios** (ver acima).
- **Conector MCP do Supabase desta sessão aponta para o projeto errado**
  (`indshiztdvjgvgnzigqd`, "Brotar 2.1" — outro sistema do Eduardo) em vez do
  Clínica Patrícia (`xftnkusbyqzyvzrovroj`). Confirmado via `get_project_url`
  durante a sessão de 03/08/2026 (Registrar Entrada); é o mesmo tipo de
  problema já descrito em `00-BANCO-DE-DADOS-OFICIAL.md`. **Nenhuma consulta
  foi rodada por esse conector.** Antes de usar qualquer ferramenta MCP do
  Supabase neste projeto, reconferir `get_project_url` contra o `.env` —
  não presumir que está certo.
- **Contas de usuário de teste criadas fora do painel `Authentication > Add
  user`** (ex.: direto em `auth.users`) ficam com registros incompletos
  (faltando `auth.identities`, colunas internas `NULL` em vez de vazias) e
  quebram o login com `500 Database error querying schema` — sem relação
  com senha/RLS. Encontrado e corrigido no `teste_medico_brotas` em
  03/08/2026. Sempre criar usuário de teste pelo painel, nunca por INSERT
  direto.

## Fase 2 (futuro)

- **Visão consolidada** (caixa somado das 3 clínicas para a proprietária).
- **Emissão automática de NF** via serviço terceirizado (NFe.io / Focus NFe / PlugNotas).
- **Perfil recepção/secretária** e permissões.
- Painel de configurações da clínica (proprietária troca logo/cor pelo sistema).

## Próximos passos recomendados (ordem sugerida)

1. Concluir o **tema** (cor por clínica + claro/escuro).
2. **Cadastro/lista de pacientes** (primeira função de uso real).
3. **Subdomínio + trava** no frontend (fecha o modelo de isolamento do médico).
4. **Módulo financeiro** (prioridade de negócio) — avaliar backend Node/Fastify aqui.
5. Antes de qualquer produção: trocar segredos do Vault, remover dados de teste,
   configurar GitHub/Vercel.

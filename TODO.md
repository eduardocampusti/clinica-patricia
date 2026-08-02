# TODO.md — Clínica Patrícia

## Concluído recentemente

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
  este último criado durante a validação do módulo de Pacientes).
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

# Equipe39 — cadastro e acesso direto com senha temporária

Atualização posterior: [revisão final Equipe40](40-REVISAO-BACKEND-PACOTE-APLICACAO.md)
fortaleceu backend e substitui80/81 por duas rodadas conjuntas81/81 na bancada
compilada. Evidências datadas abaixo conservadas; nenhuma aplicação remota.

08/10/2026, 19:57 -03:00 (America/Bahia). **Implementação local; backend preparado para revisão, não aplicado.**
Pedido posterior explícito do usuário autoriza executar localmente o arquivo
`PROMPT_CADASTRO_ACESSO_DIRETO_EQUIPE.md`. Não autoriza banco remoto, contas reais,
reativação de técnicas encerradas, mensagens, Docker, commit, push ou publicação.
Nenhuma dessas operações foi realizada nesta etapa.

## Comportamento aprovado e implementado localmente

Novo membro da equipe distingue três escolhas: somente cadastrar a pessoa,
preparar acesso com senha temporária individual e enviar convite por e-mail.
O e-mail de login é separado do contato. Cada clínica de acesso deve estar entre
os vínculos cadastrais selecionados; cada papel exige escolha expressa. Cargo,
profissão e seleção de outra clínica não concedem permissões automaticamente.

O cadastro é salvo antes da preparação do acesso. Havendo falha na segunda etapa,
a interface conserva o ID da pessoa e a chave da operação em memória, bloqueia a
regravação dos dados pessoais e oferece retomada ou conclusão sem acesso.
Não há transação única entre cadastro, Auth e banco: o fluxo explicita essa separação.

A credencial só é apresentada após resposta confirmada. O diálogo permite mostrar,
ocultar e copiar; a senha não é gravada em localStorage, documentos, logs ou auditoria.
Fechar o diálogo elimina sua cópia na interface. Copiar usa a área de transferência
do Windows; o sistema não consegue garantir sua limpeza ou a do histórico externo.
Sem recuperação de senha temporária em texto: perda exige substituição explícita
por administradora autorizada, com confirmação, revisão e chave de operação.
O acesso temporário não dispara e-mail. Convites continuam no serviço existente.

No primeiro acesso, a tela exige senha pessoal de 12 a 128 caracteres com maiúscula,
minúscula, número e símbolo, confirmação igual e valor diferente da temporária.
Uma guarda anterior à montagem de App consulta o estado do servidor; conta pendente
não monta os módulos. Erro de consulta, expiração e sessão obsoleta bloqueiam.
Conclusão confirmada exige saída da sessão temporária e login com a senha pessoal.
Contas antigas sem operação de acesso direto seguem o fluxo já existente.

## Aplicação normal e dependência presente

`src/config/acessoDireto.ts` permanece **false**. A escolha temporária mostra a
dependência do serviço seguro e bloqueia o envio antes de salvar a pessoa nesse modo.
Somente cadastro e convite mantêm os caminhos existentes. O frontend não fabrica
sucesso, credencial ou estado de ativação na aplicação normal.

Banco proposto inicia `habilitado=false` e `protecoes_instaladas=false`. A função
nova exige também `ACESSO_DIRETO_HABILITADO=true` no servidor e confirmação do
controle do banco. Habilitar somente uma dessas camadas não libera o fluxo.
Não habilitar o frontend antes do conjunto de proteções revisado e comprovado.

Para conferir visualmente na aplicação local: **Cadastros → Equipe → Novo membro →
Acesso ao sistema**. Selecionar senha temporária deve informar backend pendente e
impedir envio. Os fluxos de sucesso são conferidos na bancada de testes abaixo,
que usa dados fictícios e intercepta as chamadas; ela não é uma conta real.

## Backend preparado; garantias ainda dependem de homologação

- `equipe-acesso-direto` mantém Admin Auth exclusivamente no servidor, fixa o alvo
  `xftnkusbyqzyvzrovroj`, verifica sessão, limita corpo/tempo e usa respostas sem cache.
- Reserva de operação e UUID Auth antecede a criação. Retomada usa esse UUID e
  app_metadata protegida com o ID da operação, nunca simples coincidência de e-mail.
  E-mail existente não cria duplicata, redefinição ou vinculação automática.
- Senha temporária aleatória de 24 caracteres, validade de 24 horas e compromisso
  SHA-256 com salt; sem senha recuperável no banco. Criação confirmada por servidor
  usa `email_confirm=true` somente nessa conta nova: registro administrativo,
  **sem prova de posse da caixa postal** e sem desativar confirmação global.
- Vínculos de login são inicialmente inativos. Troca reserva uma janela de dois
  minutos, altera a senha via Auth, revoga sessões e só então confirma a ativação
  e ativa os escopos aprovados. Fingerprint privado do hash Auth exige alteração;
  nunca é devolvido ao navegador. Falha parcial conserva bloqueio, não sucesso.
- Repetir operação já confirmada retorna estado e nenhum segredo. Perda do segredo
  após criação exige substituição. Reserva vencida pode ser retomada explicitamente
  na ficha; conflito concorrente exige reconsulta. Substituição inacabada permanece
  bloqueada; após vencer a reserva, nova revisão/chave explícita pode recuperá-la.
- A proposta SQL consulta `auth.sessions` e o `session_id` do JWT real. Contas novas
  só acessam dados com operação ativa e sessão criada depois de `liberado_em`.
  Token ou renovação de sessão anterior continua negado, mesmo após outra sessão
  concluir a troca. Não depende de user_metadata editável ou preferência local.
- Políticas restritivas somam o bloqueio às tabelas públicas e ao Storage privado.
  Views públicas passam a consultar como invocador. RPCs SECURITY DEFINER expostas
  e GraphQL recebem guarda antes do corpo; fontes anterior e protegida ficam no
  inventário privado, preservando assinatura/OID/ACL/owner. Funções incompatíveis,
  funções usadas em índice, views materializadas e tabelas externas expostas exigem
  revisão específica: a transação deve falhar antes de habilitar um conjunto parcial.
- Os serviços autenticados Equipe, recursos, fichas, Meu perfil e Configurações
  recebem a mesma guarda, inclusive quando usam service_role internamente.
  Projeção institucional pública continua pública e não revela dados administrativos.
- Hook gratuito de emissão de token preparado para rejeitar credencial expirada
  e renovação anterior ao corte. Deve ser composto com qualquer hook Auth existente,
  nunca substituído automaticamente. Não foi configurado remotamente.

**Limite material:** SQL não foi compilado/executado contra PostgreSQL; a transformação
de RPCs e views requer inventário e testes reais antes da aplicação. Tipos e mocks
não comprovam RLS, Storage, hooks, persistência, política Auth ou isolamento real.
Endpoints próprios do Supabase Auth, alteração direta de senha/e-mail, recuperação,
concorrência e validade residual de JWT revogado também exigem testes conectados;
revogação isolada não é prova de bloqueio imediato de todos os endpoints Auth.
Dados e arquivos privados têm guarda própria proposta. Recursos intencionalmente
públicos continuam acessíveis ao público. Novas tabelas/RPCs futuras precisam receber
essa proteção antes de ficarem expostas.

## Arquivos desta implementação

Frontend: `src/config/acessoDireto.ts`, `src/lib/acessoDiretoModelo.ts`,
`src/lib/acessoDireto.ts`, `src/components/GuardaAtivacao.tsx`,
`src/pages/DefinirSenhaPessoal.tsx`, `src/components/cadastros/NovoMembroAcesso.tsx`,
`CredencialTemporariaDialog.tsx`, `AcessoTemporarioPainel.tsx` no mesmo diretório;
integração em `src/pages/cadastros/Equipe.tsx`, `src/lib/equipeAcessos.ts` e `src/App.tsx`;
mensagem de `EquipeListagem.tsx` ajustada para a escolha opcional de preparar acesso.
Nota local em `src/config/notasEvolucao.json`, sem nova versão publicada.

Backend: `supabase/functions/_shared/acessoDireto.ts`, `_shared/guardaAtivacao.ts`,
`equipe-acesso-direto/index.ts` e guardas em `equipe-acessos`, `equipe-recursos`,
`equipe-fichas`, `meu-perfil`, `configuracoes`. Duas propostas ordenadas:
`supabase/migrations/20261008230000_equipe_acesso_direto.sql` e
`20261008230100_equipe_acesso_direto_protecoes.sql`;
inventário somente leitura `supabase/tools/acesso-direto-preflight.sql`.

Testes novos em `tests/acesso-direto/`: regras/portas, declaração Deno e tipos do
endpoint, bancada Vite isolada, flag exclusivamente sintética e cenários Playwright.
Resultados/capturas em `scratch/acesso-direto/` ignorado pelo Git.

## Verificações locais

- 22/22 testes determinísticos do modelo e núcleo backend com **portas simuladas**.
  Verificam geração individual, escopos, ordem de reserva/criação/confirmação,
  recusas, idempotência, perda de segredo, mesma senha e falhas parciais.
- 34/34 cenários sintéticos da nova interface: computador/celular, tema escuro
  real em 360px, escolha de papel, convite, cadastro, dependência normal, retomada,
  credencial em memória, substituição, primeiro acesso/F5, erros e sessão nova.
  Capturas locais inspecionadas; sem transbordamento horizontal nos cenários testados.
- 29/29 regressões sintéticas de login/dashboard/identidade/F5, recuperação e convites.
- 21/21 regressões sintéticas de Configurações, em navegador separado na prévia local
  já aberta por outra sessão; não foi encerrada nem modificada sua execução.
- Regressões de edição e papéis da Equipe: 80/81 passaram na rodada conjunta.
  Um cenário móvel sofreu timeout com recarga documentada durante o clique;
  passou nas duas repetições isoladas, sem alterar teste/helper ou regra de papel.
  Origem da recarga não confirmada; não apresentar a rodada inicial como 81/81.
  Evidência conservada em `scratch/acesso-direto/regressao-papel-timeout.md`.
- Tipos do frontend e tipos estritos do novo backend passaram. A checagem backend
  usa TypeScript/declaração Deno e tipos instalados de Supabase, não runtime Deno real.
- Lint dirigido passou, com dois avisos de Fast Refresh limitados à bancada de teste.
- Build local passou em 0.2.0, com aviso de pacote principal maior que 500 kB;
  build não comprova publicação. Diff dirigido de integração passou.

Comandos Windows na raiz (não aplicam banco):

```powershell
server\node_modules\.bin\tsx.cmd --test tests\acesso-direto\regras.test.ts
node node_modules\typescript\bin\tsc --project tests\acesso-direto\tsconfig.backend.json --pretty false
node node_modules\typescript\bin\tsc -b
node node_modules\@playwright\test\cli.js test --config tests\acesso-direto\playwright.config.ts
npm.cmd run build
```

## Próxima etapa, somente com autorização remota futura

1. Confirmar projeto oficial e ambiente pelo isolamento/banco oficial. Executar
   inventário de leitura do preflight: schemas API expostos, tabelas, views, RPCs,
   ACLs, RLS, Storage, hooks e assinatura das funções reais. Conferir compatibilidade
   com propostas pendentes de Configurações; não aplicar proteção antes de inventariar
   todos os objetos que serão expostos. Revisar a alteração de volatilidade e views.
2. Revisar SQL e endpoint no ambiente apropriado. Com autorização concreta futura,
   aplicar as duas propostas em ordem, ainda desabilitadas. Confirmar objetos via
   information_schema/pg_proc, políticas/grants/hook e executar
   `supabase/tools/verificar-integridade.sql`; registrar investigação de integridade
   no histórico exigido. Registro de migration sozinho não comprova aplicação.
3. Implantar serviço novo e versões dos cinco serviços autenticados somente **depois**
   dos objetos SQL: a guarda depende da RPC e falha fechada se ela não existir.
   Compor/configurar hook gratuito existente e variável do servidor. Controle do
   banco deve permanecer desligado até a preparação completa.
4. Homologar com contas fictícias novas e explicitamente autorizadas, sem reativar
   técnicas encerradas: duas clínicas, cada papel, conta existente, falhas intermediárias,
   repetição/concorrência, perda/substituição, expiração, recuperação e Auth direto;
   testar API/RPC/GraphQL/Storage com JWT pendente, JWT antigo após ativação e sessão
   nova. Provar recusas e preservação dos fluxos antigos e de Configurações.
5. Só após essas provas e autorização adequada habilitar banco/servidor/frontend,
   registrar evidências e considerar release. Esta documentação não autoriza a etapa.

## Ferramentas e preservação

TypeSafe avaliada e skill consultada conforme pedido. Tarefa determinística, sem
benefício concreto de API de IA: não foi acrescentada integração ao produto.
Jev permanece auxiliar da triagem anterior; esclarecimento explícito de implementação
prevalece e não exigiu nova consulta. Impeccable orientou uso dos componentes/tokens
existentes. ReUI avaliado; não houve necessidade de instalação ou componente novo
de catálogo. Nenhuma dependência foi instalada por esta implementação.

Configurações, identidade e navegação existentes foram preservadas nas edições
sequenciais. Outra sessão revisa simultaneamente PDF/fontes de Configurações;
suas alterações e registros não pertencem a esta entrega. Não substituir seus
arquivos pelo inventário inicial. Branch observada `codex/equipe-fase2-2026-10-07`,
HEAD `ad49386105b3ea19b10b11a4e40c31983ae38d69`; trabalho não commitado.

Comparação final com os 840 arquivos do inventário inicial: 803 sem mudança,
23 alterados dentro deste escopo e 14 alterações simultâneas fora dele, nenhuma
ausência. Os 14 pertencem à revisão local de Configurações e foram conservados;
esta comparação não atribui a autoria integral dos arquivos compartilhados.
Arquivos novos não entram nessa contagem inicial. Manifesto intencional e comparação
salvos em `scratch/acesso-direto/manifesto-intencional.json` e
`scratch/acesso-direto/comparacao-final.json`, ignorados pelo Git. Branch/HEAD e
índice vazio reconferidos; nenhum commit realizado.

Referências oficiais usadas para revisar o contrato, sem envio de arquivos privados:
[Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser),
[Admin updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid),
[sessões e validade de JWT](https://supabase.com/docs/guides/auth/sessions),
[Custom Access Token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook),
[disponibilidade dos hooks](https://supabase.com/docs/guides/auth/auth-hooks).

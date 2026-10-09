# Primeira evolução das dashboards — Proprietária e Recepção

## Integração posterior — 09/10/2026

A descrição abaixo conserva a fase original do Claude. A guarda de Acesso Direto foi homologada e publicada habilitada; não deve voltar a false para fazer testes passarem. Seu bloqueio nas fixtures foi corrigido pela integração, que também trata as consultas de Configurações viaPOST como leituras. Recepção41/1ignorado, administrativos64 e identidade29 passaram nas reexecuções dirigidas. Estado de publicação e limites conectados no [relatório27](27-INTEGRACAO-DASHBOARDS-CLAUDE-PUBLICACAO.md).


**Estado:** implementação local concluída e verificada por testes automatizados
(tipos, lint, build, unitários e Playwright sintético nos três tamanhos de tela).
**Conferência conectada com sessão real: PENDENTE.** Sem commit, push, deploy,
migration ou alteração de banco.
**Data:** 09/10/2026, America/Bahia (-03).
**Ambiente:** árvore principal, `codex/equipe-fase2-2026-10-07`, HEAD `ad49386`,
trabalho não commitado.
**Escopo autorizado:** frontend das dashboards da Proprietária e da Recepção.
A dashboard do Médico não foi construída nesta etapa.

Antecedentes: [18 — Dashboard administrativa](18-DASHBOARD-ADMINISTRATIVA-PROPRIETARIO.md),
[13 — Painel da Recepção](13-PAINEL-RECEPCAO-PREVIA.md),
[auditoria e complemento](../../auditorias/AUDITORIA-DASHBOARDS-2026-10-09.md).

## 1. Dashboard da Proprietária

Ordem da tela, de cima para baixo: financeiro, pendências, operação, agenda.

| Bloco | Conteúdo | Observações |
|---|---|---|
| Cabeçalho | Saudação, rótulo "Visão geral", data na Bahia, clínica ativa, estado da leitura e **Atualizar painel** | Sem seletor de período e sem visão consolidada nesta entrega |
| Financeiro de hoje | Recebido bruto, Parcela da clínica, Repasses pagos | Três cartões; os mesmos números não se repetem em outro cartão |
| Precisa de atenção | Caixas aguardando aprovação, caixas devolvidos, repasses pendentes, documentos fiscais | Cada item declara o próprio escopo |
| Operação de hoje | Agendamentos do dia, Previstos, Aguardando, Em atendimento, Concluídos | Total apresentado à parte dos quatro grupos |
| Agenda resumida | Até cinco próximos horários previstos | Preserva aviso de horário passado e de pacientes aguardando |

Decisões de significado preservadas, conforme o contrato do Financeiro:

- **Recebido bruto**: pagamentos registrados no dia, antes de estornos.
- **Parcela da clínica**: parcela dos recebimentos do dia após os estornos
  vinculados, inclusive estornos efetivados depois. O cartão exibe "Após estornos".
- **Repasses pagos**: pagamentos confirmados hoje, mesmo gerados antes.

Nenhum desses valores é apresentado como lucro ou saldo de caixa. A explicação
completa fica em "Entenda estes valores", um `<details>` acessível por mouse,
teclado e toque, recolhido por padrão.

Em "Precisa de atenção", o escopo distingue **posição atual** (caixas e repasses,
sem recorte de data) de **recebimentos de hoje** (documentos fiscais). O botão
diz "Abrir Financeiro" porque abre o módulo e não aplica filtro por pendência.
Sem pendências, a mensagem se limita aos tipos consultados. Em falha, nenhuma
mensagem afirma ausência de pendência.

O array genérico de alertas financeiros **não** foi consumido: as pendências
existentes bastaram e o contrato desse array não foi comprovado nesta etapa.

## 2. Dashboard da Recepção

| Bloco | Mudança |
|---|---|
| Cabeçalho | Rótulo "Seu dia na recepção"; **Atualizar** e última consulta saíram do rodapé para o topo |
| Indicadores | "Agendamentos do dia" (total não cancelado), Aguardando, Em atendimento, Concluídos |
| Movimento | Agendado e Confirmado passaram a selos distintos, com texto e cor; horário vencido ganhou aviso próprio na linha |
| Caixa do turno | Mensagens revisadas por estado; ausência de sessão visível não afirma caixa fechado nem autoriza abrir outro |
| Cadastros | Bloco estático "Pendências cadastrais" substituído por atalho "Cadastros de pacientes · Consultar ou atualizar cadastro" |
| Profissionais | Quantidade de agendamentos por profissional, a partir dos registros já carregados |
| Próximos horários | Até três horários futuros previstos, com título restrito a hoje |

Busca por nome, busca por CPF exato, filtro por profissional, filtros removíveis,
"Limpar filtros", abas, ordenação, "Ver cadastro" e "Abrir Agenda" permanecem
como estavam. Nenhuma ação de chegada, recebimento, início ou conclusão foi
adicionada; nenhuma permissão foi ampliada. Não foi criada consulta de pendências
cadastrais; CPF continua opcional.

## 3. Atualização controlada

Arquivos: [`src/lib/atualizacaoPainel.ts`](../../../src/lib/atualizacaoPainel.ts)
(política pura), [`src/hooks/useAtualizacaoPainel.ts`](../../../src/hooks/useAtualizacaoPainel.ts)
(ligação com React) e [`src/lib/leituraPainel.ts`](../../../src/lib/leituraPainel.ts)
(estado de leitura compartilhado).

- A Recepção relê movimento e caixa a cada **60 segundos** enquanto a aba está
  visível. As duas leituras têm sucesso e falha independentes.
- Página oculta suspende o timer. Ao voltar o foco ou a visibilidade, há releitura
  apenas se a anterior venceu.
- Timer, foco, visibilidade e botão passam pela mesma decisão, que **recusa**
  qualquer consulta enquanto outra está em andamento. Não há fila.
- Timers e listeners são removidos na desmontagem.
- A chave `clínica:dia` invalida a leitura; resposta tardia de outro contexto não
  é publicada. A virada de dia na Bahia é detectada pelo relógio da tela.
- **Realtime não foi adotado.**

Comportamento durante a releitura, por modelo de interação:

| Situação | Recepção (automática) | Proprietária (manual) |
|---|---|---|
| Releitura em andamento | Conserva o resultado anterior; não pisca esqueleto | Retira os valores e mostra o estado de carregamento |
| Falha | Retira o número da tela e mantém o aviso | Igual |
| Falta de permissão | Limpa a informação protegida | Igual |
| Troca de clínica ou dia | Não reaproveita dado do contexto anterior | Igual |

A diferença é deliberada: quem clicou em **Atualizar** não pode ler o número
antigo como se fosse a resposta da consulta em curso; já uma releitura automática
que o usuário não pediu não deve desmontar a lista que ele está lendo.

O horário de "última consulta" vem **sempre** de leitura bem-sucedida; o relógio
da tela não o avança, e a falha não o substitui. Cada bloco da Proprietária data a
própria leitura, distinguindo leitura do cliente ("Leitura concluída em") da
consulta oficial do servidor ("Dados consultados no servidor em").

Filtros, busca, aba e posição de leitura são preservados na releitura do mesmo
contexto. Se o profissional filtrado deixar de aparecer nos dados, o filtro
continua aplicado, o campo mantém uma opção visível para ele e um aviso oferece
a remoção — sem troca silenciosa da seleção.

A Proprietária **não** recebeu consulta periódica: o pedido autorizado previu
atualização automática apenas para a Recepção.

## 4. Verificações executadas

| Verificação | Resultado |
|---|---|
| `tsc -b` | Aprovado |
| `oxlint` | Aprovado; 22 avisos preexistentes, nenhum nos arquivos alterados |
| `npm run build` | Aprovado; aviso de tamanho de bundle preexistente |
| Unitários `atualizacaoPainel` e `leituraPainel` | 16/16 |
| Unitários `dashboardProprietaria` | 9/9 |
| Unitários `financeiro` | 15/15 |
| Playwright `recepcao-integracao` (desktop/tablet/mobile) | 38 aprovados, 1 ignorado — duas execuções |
| Playwright `dashboard-administrativa` + `dashboard-proprietaria` (desktop/mobile) | 64 aprovados |
| Playwright `dashboard-identidade` (config própria) | 29 aprovados |

Todos os resultados acima foram obtidos **antes das 17:32 -03**. Ver a seção 7.

Larguras conferidas por captura: 1440, 820, 390 e 360, em tema claro e escuro,
sem rolagem horizontal. As capturas usam **dados sintéticos interceptados**, não
pacientes reais.

## 5. Limites e pendências

- **Conferência com sessão legítima conectada permanece pendente.** Nenhuma
  sessão real foi usada nesta etapa; não há comparação conectada de contagens com
  a Agenda nem de valores com o Financeiro em Brotas e Ipupiara.
- Compartilhar o código entre as unidades **não** valida as duas: cada unidade
  continua exigindo conferência própria.
- Build e testes sintéticos não comprovam produção.
- Sem commit, push, deploy, migration, SQL, Docker ou alteração de banco, RLS,
  autenticação ou permissões.
- Visão consolidada entre clínicas, seletor de período, série histórica e lista
  por profissional continuam disponíveis no contrato e **não** consumidos.

## 6. Ajustes em testes já existentes

Alterações feitas para acompanhar o redesenho autorizado, preservando a intenção
de cada asserção:

- `dashboard-administrativa.spec.ts`: nomes dos blocos, classes, `data-testid` dos
  contadores e cópia do bloco de próximos horários. As garantias de origem,
  escopo, carimbo por leitura, falha parcial e ausência de zero fabricado foram
  mantidas integralmente.
- `dashboard-proprietaria.spec.ts`: título do bloco financeiro.
- `recepcao-integracao.spec.ts`: mensagem do caixa legado e bloco de cadastros.
  Também foi corrigida uma asserção **anterior a esta etapa**, que ainda esperava
  a saudação "Olá!" removida quando a identidade da conta passou a gerar
  "Bom dia/Boa tarde/Boa noite"; passou a usar o mesmo padrão já homologado em
  `dashboard-identidade.spec.ts`.

Dois defeitos próprios foram encontrados pelos testes e corrigidos no código, não
nos testes: **Atualizar** havia deixado de avançar o relógio da tela, e a agenda
resumida não datava a própria leitura quando havia registros.

## 7. Bloqueio da bancada sintética por contribuição simultânea

**Estado: BLOQUEIO ABERTO, de outra sessão, não revertido.**

Às **17:32 -03 de 09/10/2026**, durante este trabalho, outra sessão alterou
`src/config/acessoDireto.ts` para `ACESSO_DIRETO_HABILITADO = true`. O próprio
arquivo adverte: "Habilitar somente após revisão, aplicação e homologação de
TODAS as proteções."

`GuardaAtivacao` é passagem direta quando a constante é `false` e, quando `true`,
envolve a aplicação em uma verificação remota de ativação que as fixtures
sintéticas não simulam. A partir dessa alteração, as suítes passam a encontrar
a tela **"Ativação não verificada"** no lugar da aplicação:

| Suíte | Antes das 17:32 | Depois das 17:32 |
|---|---|---|
| `recepcao-integracao` | 38 aprovados (duas vezes) | 38 reprovados |
| `dashboard-identidade` (config própria) | 29 aprovados | 23 aprovados, 6 reprovados |
| `dashboard-administrativa` + `dashboard-proprietaria` | 64 aprovados | 64 aprovados |

As seis reprovações da config de identidade estão em `dashboard-identidade.spec.ts`
(redirecionamento após novo login), `convite.spec.ts` e `recovery.spec.ts` —
**nenhum desses arquivos foi alterado nesta etapa**. A captura de falha mostra a
aplicação substituída pelo aviso de ativação, antes de qualquer dashboard montar.

Atribuição verificada, não presumida: a constante é consumida somente por
`GuardaAtivacao`; com ela desligada o componente devolve `children` sem consultar
nada; as capturas de falha exibem exatamente o bloco de ativação.

A constante **não foi revertida**: pertence a trabalho ativo de outra sessão
(pacote R3 / acesso direto). Reverter aqui destruiria contribuição simultânea.

Consequência para esta entrega: os resultados da seção 4 valem para a árvore
como estava antes das 17:32. **Reexecutar `recepcao-integracao` e a config de
identidade quando a constante voltar ao estado homologado**, antes de considerar
esta etapa verificada de ponta a ponta.

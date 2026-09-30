# CONFIRMAÇÕES VISÍVEIS NO CADASTRO DE PACIENTES

**Estado atual em 29/09/2026:** CONFIRMAÇÕES CONCLUÍDAS NO ESCOPO VALIDADO — sucesso de criação e edição comprovado com gravação conectada; falhas de serviço e de atualização da lista verificadas apenas por simulação.  
**Data:** 29/09/2026  
**Escopo:** cadastro e edição administrativos de pacientes na versão local.

> As seções abaixo preservam a sequência histórica das rodadas. Frases como “homologação conectada pendente”, “Equipe bloqueada” e contagens de testes de rodadas anteriores descrevem exclusivamente o momento em que foram escritas; não substituem o estado atual. O cadastro/edição de Equipe está liberado no projeto atual, enquanto as correções posteriores de gestão de acessos seguem no checkpoint próprio do módulo.

## Diagnóstico

A criação já aguardava o retorno do `insert` (adulto) ou da RPC de menor antes de mostrar `Paciente cadastrado com sucesso.`. O formulário preservava os valores quando o serviço falhava e desabilitava o botão durante o andamento.

Na edição, o retorno válido já era conferido por ID, clínica e nova revisão antes de chamar o callback de sucesso. A investigação do fluxo mostrou que a página mantinha o estado do feedback, mas a edição iniciada pela tabela também reabria o resumo em um `<dialog>` modal; o alerta podia ficar associado à superfície atrás da camada superior. A confirmação ainda não separava o título e a descrição definidos para este fluxo. Além disso, uma validação customizada, como CPF incompleto, apresentava o alerta mas não deslocava o foco para o campo que precisava de correção.

## Correções realizadas

- `src/pages/Pacientes.tsx`
  - o resultado permanece em estado da página e usa o Alert compartilhado com título `Alterações salvas` e descrição `O cadastro do paciente foi atualizado com sucesso.`;
  - a edição iniciada pela tabela não reabre o resumo; quando iniciada no resumo, a mesma mensagem é renderizada nessa superfície sem uma segunda notificação;
  - a descrição mantém a confirmação exata e acrescenta apenas a informação contextual quando o paciente sai dos critérios atuais de busca/filtro;
  - erros customizados identificam o primeiro campo aplicável e levam o foco até ele; quando não há campo determinável, o alerta recebe foco;
  - cadastro usa uma trava de envio por referência, além do estado visual `Salvando...`, impedindo duas submissões síncronas antes da resposta;
  - nenhum contrato de banco, regra de CPF, permissão, clínica ou operação da Equipe foi alterado.
- `tests/operacional/operacional.spec.ts`
  - acrescentada verificação de foco para CPF inválido e e-mail inválido;
  - acrescentado cenário de duas submissões enquanto a resposta do serviço está retida, comprovando uma única inserção sintética.
- `tests/operacional/pacientes-edicao.spec.ts`
  - expectativas da confirmação foram alinhadas ao texto final e continuam verificando ausência de duplicação no resumo.
- `src/config/notasEvolucao.json`
  - registrada a correção visível, sem declarar publicação.
- `docs/modulos/pacientes/01-DOCUMENTO-FUNCIONAL-MESTRE.md`
  - registrada a regra aprovada de confirmação pós-serviço, foco de validação e proteção contra repetição.
- `CHECKPOINT.md`
  - atualizado o marco mestre em 29/09/2026, sem alterar o estado pendente da Equipe.

## Contratos e estados visíveis

- **Criação confirmada:** a mensagem só é exibida depois de o `insert`/RPC retornar sem erro e com identificador válido no contexto da clínica solicitada (a RPC de menor também devolve a clínica). A mensagem visível é `Paciente cadastrado com sucesso.`.
- **Edição confirmada:** a mensagem só é exibida depois de o serviço devolver o mesmo paciente, a clínica esperada, uma revisão nova e os campos mínimos da resposta. O Alert visível tem título `Alterações salvas` e descrição `O cadastro do paciente foi atualizado com sucesso.`.
- **Erro de serviço ou contrato:** o formulário permanece aberto, o rascunho continua preenchido e o alerta vermelho permite nova tentativa. A falha da releitura da lista é tratada separadamente como atenção laranja, com `Atualizar lista`, sem sugerir nova gravação.
- **Validação:** a validação nativa mantém a indicação do navegador e o foco no primeiro campo inválido; validações customizadas agora focam o campo correspondente (ou o alerta quando não há alvo determinável).
- **Andamento:** o botão mostra `Salvando...`/`Salvando…`, fica desabilitado e a trava em memória impede repetição mesmo antes de a atualização visual terminar.

## Testes executados

Todos os cenários abaixo usam respostas interceptadas e dados fictícios do harness; não comprovam gravação no Supabase.

| Verificação | Resultado |
|---|---|
| `npm.cmd run test:pacientes` | 24/24 testes unitários aprovados |
| Playwright: criação, validação, foco e envio repetido (`operacional.spec.ts`) | 6/6 (desktop, tablet e celular) |
| Playwright: edição, erro de serviço, confirmação após fechar e atualização parcial (`pacientes-edicao.spec.ts`) | 15 cenários aprovados dentro da rodada dirigida |
| Playwright: página completa, resumo, cadastro e responsividade (`pacientes-pagina-visual.spec.ts`) | 3/3 (desktop, tablet e celular) |
| `npm.cmd run build` | aprovado; avisos existentes de chunk/importação dinâmica |
| `npm.cmd run lint` | aprovado; permanece somente o aviso preexistente de Fast Refresh em `ThemeProvider.tsx` |

Os testes de criação e de edição não enviam dados ao banco real. A checagem de contrato, sucesso, erro, validação, foco, proteção contra repetição e visibilidade depois do fechamento é sintética por desenho.

## Registro anterior — conferência autenticada somente para leitura

Servidor local conferido na pasta do projeto: [http://127.0.0.1:3000/acesso/brotas](http://127.0.0.1:3000/acesso/brotas).

Com a sessão autorizada já existente:

- **Brotas:** Pacientes carregou dois registros existentes. O formulário “Novo paciente” abriu e foi fechado sem envio. A lista e as ações de consulta/edição ficaram disponíveis.
- **Ipupiara:** a troca pelo seletor de clínica limpou o contexto anterior e carregou um registro existente. A ficha de edição abriu com a pessoa selecionada; a consulta de CPF foi mostrada como indisponível, sem afirmar ausência nem revelar valor. A ficha foi fechada sem salvar.
- Não houve clique em `Salvar paciente` ou `Salvar alterações`, nenhuma foto/CPF foi enviado e nenhum registro real foi criado ou alterado nesta rodada.

Para conferir pela interface: entrar em Brotas, selecionar **Pacientes** no menu lateral, usar `Novo paciente` ou `Editar` em um registro existente; trocar a clínica no seletor para repetir a consulta em Ipupiara. O harness sintético não é uma URL de uso diário.

## Limitações e pendências

- Persistência real de criação/edição não foi repetida nesta etapa, por decisão explícita de não gravar pacientes fictícios nem alterar registros reais. Portanto, as confirmações reais do serviço continuam dependentes da homologação conectada registrada nos checkpoints anteriores.
- A conferência autenticada acima é de leitura e não substitui teste de erro remoto, conflito ou sucesso de gravação no Supabase.
- Naquela conferência anterior, o cadastro/edição de **Equipe** ainda estava bloqueado. Depois, a migration própria foi aplicada e o cadastro/edição foi validado; as correções de gestão de acessos posteriores têm pendência própria no checkpoint de Equipe. Esta tarefa não altera essas operações.
- Nenhuma migration, RLS, Auth, regra financeira ou regra de CPF foi alterada.

## Correção específica da confirmação após salvar — 29/09/2026

### Causa confirmada

O serviço já devolvia a linha atualizada e o componente de edição validava ID, clínica, revisão nova e campos mínimos antes de chamar `onSalvo`. O problema estava na composição da página: `Pacientes` guardava o feedback, mas `aplicarEdicaoConfirmada` selecionava novamente o paciente mesmo quando a edição havia começado na tabela. A reabertura do resumo em um `<dialog>` colocava a camada superior entre a página e a mensagem, tornando a confirmação pouco visível ou parecendo ausente.

### Alteração realizada

- `src/pages/Pacientes.tsx`: o estado `feedbackPagina` continua no componente pai e agora usa o Alert compartilhado com título `Alterações salvas` e descrição `O cadastro do paciente foi atualizado com sucesso.`; o resumo só permanece aberto quando a edição foi iniciada nele. O fechamento da mensagem é acessível e a expiração de aproximadamente seis segundos continua pausável durante interação.
- `tests/operacional/pacientes-edicao.spec.ts`: expectativas e capturas foram alinhadas ao contrato visual; a entrada pela tabela confirma o Alert na página, a entrada pelo resumo confirma o mesmo Alert na superfície aberta e a atualização parcial continua sem duplicar mensagens.
- `docs/modulos/pacientes/00-README-PACIENTES.md`, `01-DOCUMENTO-FUNCIONAL-MESTRE.md`, `08-CHECKPOINT.md` e `src/config/notasEvolucao.json`: sincronizados com a decisão e o resultado local.

### Estados preservados

- `EditarPaciente` mantém `Salvando…`, bloqueia repetição, preserva o rascunho em falhas e usa o Alert vermelho `Não foi possível salvar`; nenhuma confirmação é emitida antes do retorno válido do serviço.
- Quando não há alteração, o comportamento existente de fechar sem declarar sucesso foi preservado.
- Se o salvamento for confirmado e a releitura da lista falhar, o Alert laranja informa `Alterações salvas, mas não foi possível atualizar a lista.` e oferece `Atualizar lista`, sem solicitar nova gravação.

### Limites

As verificações desta correção são sintéticas, com respostas interceptadas e dados fictícios do harness; não representam nova gravação conectada no Supabase. Não foram alterados banco, migration, RLS, Auth, CPF, foto, endereço ou regras da Equipe.

### Evidências executadas nesta correção

- `npm.cmd run test:pacientes`: 24/24 testes unitários aprovados.
- Playwright dirigido de edição: 9/9 (tabela, resumo e falha de releitura em desktop/tablet/celular); 3/3 para a saída dos critérios de busca; 12/12 para validação, erro de serviço, endereço indisponível e falha parcial.
- `npm.cmd run build`: aprovado; permanecem apenas os avisos conhecidos de chunks grandes/importação dinâmica.
- `npm.cmd run lint`: aprovado; permanece somente o aviso preexistente de Fast Refresh em `ThemeProvider.tsx`.
- `git diff --check`: sem erros.
- Capturas sintéticas do Alert verde: [`scratch/pacientes-feedback-salvo-lista-desktop.png`](../../../scratch/pacientes-feedback-salvo-lista-desktop.png) e [`scratch/pacientes-feedback-salvo-desktop.png`](../../../scratch/pacientes-feedback-salvo-desktop.png). Elas não contêm dados reais.

O servidor Vite na porta 3000 foi iniciado e respondeu com o código atual da pasta; a página oficial permanece em [http://127.0.0.1:3000/acesso/brotas](http://127.0.0.1:3000/acesso/brotas). A sessão autorizada disponível estava vinculada à porta 5173 e não foi usada para gravar paciente real. Portanto, a confirmação conectada e a falha remota controlada continuam pendentes; o que foi comprovado nesta rodada é o fluxo real do componente com respostas sintéticas interceptadas.

## Revisão auxiliar do Jev e validação conectada — 29/09/2026

### Uso do Jev

Foi feita uma chamada real ao Jev (`jev-latest`) conforme a skill `typesafe-ai`, usando apenas um resumo técnico sem nomes de pacientes, CPF, credenciais, tokens ou segredos. A chamada não foi adicionada ao formulário nem participa da decisão de salvar.

O retorno foi tratado como hipótese e conferido no código, nos documentos e na sessão real:

- **Evidência antes da sessão:** `simulado` (confiança baixa, porque o resumo enviado ao modelo ainda descrevia a homologação conectada como pendente). Depois da conferência autenticada, essa classificação foi superada para os cenários de criação e edição abaixo, que têm evidência de gravação conectada.
- **Conclusão geral:** `parcialmente comprovada`. A leitura do Jev coincidiu com a limitação real: ainda não há comprovação conectada de falhas remotas nem de uma falha exclusiva da atualização da lista.
- **Portas/documentação:** `sem incompatibilidade`. Foi confirmado que 3000 e 5173 servem a árvore atual; a sessão autenticada ficou em 5173 e a URL pública de conferência continua em 3000.
- **Mensagens:** `diferencia`. O código e os testes dirigidos separam falha de salvamento da falha posterior de atualização da lista; a conferência conectada confirmou o alerta verde, sem duplicação.

Nenhuma confiança do Jev foi usada como prova. A confirmação final abaixo vem da interface, do retorno do serviço e das consultas de leitura do catálogo.

### Conferência autenticada executada

Com a sessão autorizada de proprietária no projeto `Clinica Patrícia` (`xftnkusbyqzyvzrovroj`), foi usada uma única fixture sintética criada pelo fluxo real em **Brotas**. O CPF ficou vazio, conforme a regra opcional de Pacientes; nenhum dado de pessoa real foi alterado.

1. **Criação conectada:** o cadastro foi enviado pela interface e o serviço confirmou a inserção. A página exibiu `Paciente cadastrado com sucesso.` e a nova linha apareceu na lista.
2. **Edição iniciada pela tabela:** um contato sintético foi alterado e salvo. Depois do retorno válido do serviço, a página exibiu uma única vez `Alterações salvas` / `O cadastro do paciente foi atualizado com sucesso.`; a linha refletiu o novo valor.
3. **Edição iniciada pelo resumo:** o mesmo registro foi editado a partir de `Ver resumo`. A confirmação apareceu dentro da superfície do resumo, que permaneceu aberto, sem segunda mensagem na página.
4. **Persistência:** após fechar o resumo, recarregar e entrar novamente em Pacientes, a linha permaneceu com o último valor salvo.
5. **Troca de clínica:** ao selecionar **Ipupiara**, somente o registro existente dessa clínica foi exibido; nenhum dado da fixture de Brotas permaneceu na tela.

As confirmações 1–4 são gravações reais pelo serviço da aplicação. Não foram utilizados privilégios administrativos para apresentar essas ações como se fossem uma sessão comum; as consultas SQL administrativas realizadas depois serviram apenas para diagnóstico catalogal e limpeza.

### Falhas e estados não provocados no banco

Os cenários de erro de serviço, envio repetido e falha exclusiva da releitura da lista continuam sendo **simulados** por respostas interceptadas no harness local. Eles passaram nas rodadas dirigidas já registradas (incluindo 9/9, 3/3 e 12/12), mas não são uma indisponibilidade real do Supabase. Não foi provocado erro de banco ou rede para testar mensagens.

Na sessão conectada não houve sucesso falso: cada alerta verde veio depois da resposta válida. Também não houve duplicação no caminho pelo resumo.

### Diagnóstico da consulta de CPF em Ipupiara

Ao abrir o registro existente de Ipupiara, o resumo mostrou que há CPF informado, enquanto a ficha de edição mostrou `Situação do CPF indisponível` e não afirmou ausência. A tentativa de `Tentar novamente` repetiu o mesmo estado.

As consultas de leitura do catálogo confirmaram que `paciente_ler_cpf(uuid, uuid)` e `paciente_cpf_pendente(uuid, uuid)` existem, são `SECURITY DEFINER`, têm `search_path` fixo e execução para `authenticated`; a indisponibilidade não é causada pela RPC ausente ou por grant ausente. Metadados não sensíveis do registro mostram ciphertext e hash presentes. Um diagnóstico transacional sem retornar o CPF confirmou: descriptografia concluída, hash coincidente, valor normalizado com 11 dígitos e não repetido, mas a validação dos dígitos do CPF retornou falso. A função de leitura, corretamente, rejeita esse valor e a interface o apresenta como **indisponível**, não como “CPF ausente”. Nenhum CPF completo foi gravado em log, relatório ou captura.

Esta é uma inconsistência de qualidade de dado legado, não uma correção aplicada nesta etapa. A recuperação exige decisão específica para o cadastro existente (confirmar/corrigir o documento por fluxo autorizado); não foi feita correção automática nem leitura adicional na interface.

### Limpeza e evidência pós-teste

A fixture de Brotas foi conferida por ID e clínica exatos antes da remoção. O preflight encontrou zero referências em Agenda, Atendimentos, Financeiro, Lista de espera, responsáveis e Storage. A limpeza transacional removeu somente esse paciente; a verificação posterior retornou zero paciente, zero responsável e zero foto para o alvo. A auditoria permaneceu append-only: o evento de exclusão continua registrado e nenhuma linha de auditoria foi removida.

### Estado real e pendências

- **Corrigido nesta etapa:** documentação do estado conectado, distinção entre evidência real e simulada e investigação da indisponibilidade de CPF em Ipupiara. Nenhum código de Pacientes, migration, RLS, Auth ou Equipe precisou ser alterado.
- **Comprovado conectado:** criação, edição pela tabela, edição pelo resumo, alerta verde sem duplicação e persistência após recarregar, todos pela sessão autorizada.
- **Somente simulado:** erro de salvamento, repetição bloqueada sob resposta retida e aviso de salvamento confirmado com lista desatualizada.
- **Pendência:** ainda falta uma execução autorizada em que a lista falhe depois do salvamento sem provocar indisponibilidade do banco, ou um teste de serviço interceptado já coberto pelo harness é suficiente apenas como simulação. O CPF legado inválido de Ipupiara precisa de decisão do responsável; não deve ser tratado como ausência.

### Conferência manual

Use a sessão autorizada em [http://127.0.0.1:5173/acesso/brotas](http://127.0.0.1:5173/acesso/brotas) para continuar de onde a validação ficou: menu **Pacientes**, abrir `Ver resumo` ou `Editar` em um registro existente e alternar o seletor entre Brotas e Ipupiara. Para uma nova sessão, a URL oficial é [http://127.0.0.1:3000/acesso/brotas](http://127.0.0.1:3000/acesso/brotas); ela pode pedir login novamente porque a sessão do navegador não é compartilhada entre portas.

## Encerramento do escopo de confirmações — 29/09/2026

A alegação vigente é restrita às evidências: **sucesso de criação e edição com gravação conectada**, incluindo tabela, resumo, alerta visível e releitura; **tratamento de falhas e atualização parcial com respostas interceptadas**. Não foi provocada indisponibilidade no Supabase para repetir cenários já suficientemente cobertos no harness. As frases de pendência de gravação conectada e Equipe bloqueada nas seções anteriores são histórico de rodadas anteriores, não o estado atual. O cadastro/edição de Equipe já foi aplicado e validado no projeto atual; as correções posteriores de gestão de acessos seguem no relatório próprio de Equipe.

A investigação do CPF de Ipupiara evoluiu em `12-DIAGNOSTICO-INTEGRIDADE.md` e `14-CPF-LEGADO-INVALIDO.md`. O servidor agora identifica com código específico o caso legado comprovado e a ficha oferece correção auditada à proprietária, sem presumir que falha técnica seja CPF inválido. O valor real continua intocado, aguardando conferência documental. Essa evolução de CPF não muda as evidências anteriores das mensagens de criação/edição.


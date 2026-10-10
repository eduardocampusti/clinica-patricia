# Equipe — escolha explícita do papel em novas solicitações e concessões

Estado: IMPLEMENTADO E CONFERIDO LOCALMENTE PELO AGENTE.
Data: 04/10/2026, 22:05 -03:00 (America/Bahia). Aprovação pessoal do usuário não atribuída.

## Problema e contratos observados

`AcessoEquipePainel`, em `src/pages/cadastros/Equipe.tsx`, preenchia `escopo`
com Médico para profissional de saúde e Recepção para os demais. `conceder`
tinha o mesmo fallback sem apresentar um seletor. Cargo/profissão substituíam
uma escolha de autorização que precisava ser explícita.

Leitura dos contratos existentes, sem executar SQL: `preparar`, nos modos
`convite` e `vinculo`, recebe `clinicasPapeis` e prepara a aplicação dos acessos
após as verificações/aceite do titular. Não há, nesses dois modos, uma operação
independente de apenas vincular identidade. `alterar/conceder` aplica papel à
conta já vinculada; suspender/reativar usam o acesso existente. `reenviar`
recebe só o identificador da solicitação e contexto, mantendo seus papéis.
O servidor exige Proprietária nas clínicas e admite os três papéis atuais;
nenhuma restrição nova por profissão foi criada.

Referências lidas: `src/lib/equipeAcessos.ts`, `src/lib/equipeErros.ts`,
`supabase/functions/equipe-acessos/index.ts` e migrations existentes de gestão
de acessos, correções e expiração/recuperação (29–30/09). Nenhum desses arquivos
foi alterado nesta etapa. Skill Supabase não disponível no catálogo local desta
sessão; consulta substituída pelos contratos locais e
[documentação oficial de invoke](https://supabase.com/docs/reference/javascript/functions-invoke).
TypeSafe consultada: decisão determinística, sem uso de IA/API/chaves.
ReUI avaliado: seletores e componentes do projeto suficientes; sem adoção ou
instalação. Layout existente preservado.

## Comportamento implementado

- Novas escolhas começam em “Selecione o papel de acesso”, inclusive Enfermagem.
  Clínica do contexto indicada inicialmente quando está sem acesso; demais
  clínicas são marcadas explicitamente, cada uma com papel independente.
- Clínica marcada sem papel bloqueia o conjunto inteiro: não há envio parcial
  silencioso. Validação também ocorre no handler, além do botão desabilitado.
- Resumo perto da confirmação apresenta pessoa, clínica e papel. Concessão para
  conta vinculada passa a mostrar seletor, resumo e botão bloqueado sem escolha.
- Modos convite/vínculo por confirmação mantêm verificações de identidade. Texto
  esclarece que ambos preparam acesso e que o cadastro pode permanecer sem login.
- Falhas preservam os campos/escolhas; mensagens seguras e orientação de resultado
  incerto do relatório25 continuam vigentes. Nenhuma repetição automática.
- Trava imediata impede cliques repetidos durante envio. Resultado atrasado de
  outro contexto é descartado. Trocar pessoa/clínica ou desmarcar/reselecionar
  clínica descarta a escolha. Sucesso recarrega os dados atuais do serviço.
- Acessos existentes mantêm a referência confirmada, seletor e Salvar papel
  bloqueado sem mudança. Reativação/suspensão não exigem escolha de novo papel.
- Convite pendente mostra o papel da solicitação e não oferece sua edição.
  Reenvio mantém o mesmo identificador/contrato, sem novo papel no payload.

## Divergência encontrada durante a leitura real

Em Ipupiara havia cadastro sem conta, com estado “Convite pendente”, mas a busca
da ficha só considerava solicitações `pendente/enviado`. O contrato também usa
`erro` como pendente durante a validade. Inicialmente a ficha mostrou “Papel da
solicitação: Não definido” e não disponibilizou o reenvio; evidência descrita ao
usuário antes do ajuste. Incluído `erro` na busca da solicitação existente.
Reabrir a mesma ficha passou a mostrar **Recepção**, com Reenviar convite
disponível e Enviar convite novo desabilitado. Nenhum botão de operação foi usado.
Teste sintético cobre solicitação em `erro` e `enviado`, preservando o papel.

## Arquivos desta etapa

- `src/pages/cadastros/Equipe.tsx`: seletores vazios, validação/resumos, trava de
  envio e leitura do papel de solicitação pendente, sem alterar contrato.
- `tests/operacional/equipe-papel-explicito.spec.ts`: cinco cenários direcionados.
- `tests/operacional/equipe-papeis.spec.ts`: só a expectativa do novo convite
  mudou de `recepcao` para vazio, conforme este pedido. Regressões de acesso
  existente preservadas; única adição ao salvamento anterior é a trava compartilhada.
- `src/config/notasEvolucao.json`: nota do comportamento implementado localmente.
- Este relatório, README/mestre/checkpoint do módulo, índice/checkpoint de IA e
  checkpoint raiz: progresso, limites e evidências sincronizados.

Hashes das bibliotecas de acesso/erros, testes de erros e relatórios24/25
permaneceram iguais ao início desta tarefa. Histórico e alterações locais de
outras tarefas preservados, inclusive registro simultâneo de Jev no checkpoint.

## Verificações sintéticas e técnicas

Serviços interceptados no domínio `operacional.synthetic.invalid`; demais
destinos externos bloqueados. Nenhuma escrita no Supabase principal.

Rodada principal: **74/75 aprovados**, em desktop1440×1000, tablet820×1180 e
mobile390×844. O cenário antigo de cadastro/descarte no desktop expirou ao
tentar clicar em Continuar editando durante animação/desanexação do elemento.
Não foi alterado código dessa função nem o teste para contornar o evento.
Reconferência pertinente, após inclusão do estado `erro`: **15/15 aprovados**,
incluindo o cenário que expirou e os convites/papéis por clínica nos três tamanhos.
Todos os cenários planejados têm execução aprovada; não declarar rodada inicial
75/75 nem atribuir causa definitiva ao timeout isolado.

Cobertura: administrativo/Enfermagem sem padrão; confirmação e submit sem papel
sem chamada; payload exato de convite e vínculo; duas clínicas sem envio parcial;
trocas de pessoa/clínica, reabertura/F5 e desmarcação; concessão para conta
vinculada; clique repetido; falha conhecida/rede sem sucesso falso/repetição;
papel confirmado após concessão simulada; reenvio original; cadastro sem login.
Regressões proporcionais: 39 execuções do seletor,12 de erros,9 de cadastro e15
da nova escolha compõem os75 cenários da rodada principal.

**15/15 Node aprovados** (8 regras de cadastro e7 tratamento de erros).
**TypeScript, lint e build aprovados**, incluindo nova conferência final após
o ajuste de leitura de solicitação. Avisos preexistentes: exportação do
ThemeProvider, importação estática/dinâmica do Supabase e tamanho de chunks.
Imagens de convite/concessão simulados em desktop/mobile examinadas pelo agente:
campos e resumo legíveis, botão junto da escolha, sem sobreposição ou corte do
resumo. Evidências locais em `scratch/equipe-papel-explicito/resultados/` e
`scratch/equipe-papel-explicito/reconferencia/` (artefatos de teste não publicados).

## Conferência conectada pela interface

Ambiente Windows, aplicação local `http://127.0.0.1:3000`, correção carregada por
atualização da página. Sessão real com rótulo **Proprietário(a)**, confirmada
pelo menu. Apenas listagens/fichas e troca entre clínicas autorizadas. Sem
capturas com identificação pessoal real e sem consulta extra por SQL.

| Contexto | Leitura feita pelo agente | Resultado |
| --- | --- | --- |
| Brotas | Ficha com conta vinculada e acessos ativos em Brotas/Ipupiara | Texto Recepção, seletor `recepcao`, Salvar papel desabilitado nas duas clínicas |
| Ipupiara | Mesma ficha no contexto de Ipupiara | Correspondência texto/seletor e botão bloqueado preservados |
| Ipupiara | Outra ficha sem conta, solicitação pendente existente | Papel original Recepção visível após ajuste; reenvio disponível sem acionar; novo convite bloqueado |

Resumo e escolha de **novas** concessões/convites, cliques, falhas e cadastro
sem acesso foram demonstrados exclusivamente com dados simulados. Não há
concessão real nem prova nova de persistência, entrega de e-mail ou aceite.
Não foi criado cadastro para preencher cenários. Recepção real não conferida.
O estado pendente real não comprova formulário novo vazio em produção; esse
cenário foi conferido sinteticamente. Aprovação expressa do usuário permanece
pendente; pedido de implementação não é aprovação da interface entregue.

## Git, publicação e pendências

Branch `codex/resgate-local-2026-09-26`, HEAD
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`. Mudanças desta etapa não commitadas,
somadas ao trabalho local anterior. Diff revisado e fontes preservadas. Não
houve commit/push/merge/deploy nem alteração de GitHub; estado remoto não auditado.
Build local não representa publicação.

Nenhum convite, vínculo de conta, acesso real, SQL, banco, Auth, RLS, migration,
Edge Function ou SMTP alterado nesta execução. Sem dependência nova, CPF/papéis
novos/Ibitiara. Consulta completa de Equipe pela Recepção e eventual definição
futura de papéis por profissão continuam fora do escopo, sem permissão inventada.

Etapa concluída. Próxima ação opcional do titular: F5 → Cadastros → Equipe &
acessos → Ver cadastro; conferir papel confirmado ou solicitação original sem
salvar/reenviar. Para pessoa sem solicitação, observar seletor vazio e confirmação
bloqueada. Escolher papel/resumo e envios devem ser demonstrados no ambiente
simulado; nenhuma operação real é necessária para essa conferência.

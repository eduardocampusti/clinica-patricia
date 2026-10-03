# Equipe & acessos — checkpoint e continuidade local

**Data do checkpoint:** 28/09/2026  
**Estado inicial:** continuidade local autorizada; gravações do cadastro continuam bloqueadas até homologação Supabase completa.  
**Escopo:** interface, documentação e verificações locais. Nenhuma migration, escrita ou alteração de configuração foi feita no Supabase principal.

## Decisões preservadas

- A VPS está adiada nesta etapa.
- O Site Geovana permanece ativo e não será pausado, excluído, transferido ou reaproveitado.
- Não serão contratados serviços, alterados planos ou criados projetos remotos.
- Brotas e Ipupiara continuam sendo os contextos clínicos do módulo; não se cria um terceiro contexto por atalho visual.
- Pessoa, função, profissão de saúde, registro profissional, login, vínculo clínico e configuração operacional permanecem conceitos separados.
- Um funcionário de apoio não vira profissional de saúde nem usuário Auth fictício.
- Não se implementa persistência falsa em `localStorage` e não se apresenta “salvo” sem confirmação do banco.
- O bloqueio de gravação permanece até que a migration vigente e os serviços Supabase/Auth/PostgREST/Vault/Storage sejam homologados em ambiente autorizado.

## Ponto de partida

A migration `supabase/migrations/20260928153000_equipe_cadastro_edicao.sql` está revisada e testada apenas no PostgreSQL portátil isolado. O Supabase principal `Clinica Patrícia` (`xftnkusbyqzyvzrovroj`) não recebeu alterações. A interface local já lista profissionais existentes e comunica a indisponibilidade da mutação ampliada; o trabalho desta etapa deve melhorar a clareza, a acessibilidade e o comportamento responsivo sem liberar escrita.

## Plano de continuidade local

1. Revisar o formulário compartilhado de inclusão/edição e os estados de carregamento, vazio, erro e backend indisponível.
2. Manter próximos aos campos os erros de validação, preservar os valores digitados em falha e impedir submissões repetidas.
3. Diferenciar visualmente função, profissão de saúde, clínicas vinculadas e acesso, incluindo os campos condicionais de conselho/registro/UF e especialidade.
4. Garantir contexto visível de Brotas/Ipupiara, foco, teclado, rodapé de ações e adaptação desktop/tablet/mobile.
5. Executar testes locais proporcionais e registrar separadamente o que foi observado no código, em testes automatizados e no navegador.

## Critério de liberação

Somente após homologação Supabase autorizada, com persistência real, RLS/RPCs e Auth verificados para perfis autorizados e não autorizados, a aplicação poderá substituir o aviso de pendência pelo fluxo de gravação. Até lá, os botões de mutação devem permanecer protegidos e a mensagem precisa explicar o motivo em linguagem operacional.

## Histórico de execução

Este documento foi criado como registro inicial antes da implementação desta etapa. Os resultados, arquivos alterados, testes realizados e limitações serão acrescentados abaixo sem apagar o histórico.

## Execução concluída — 29/09/2026

O checkpoint acima foi registrado antes da alteração de código. A continuidade local foi concluída sem migration, escrita remota, alteração de plano, contratação, VPS ou intervenção no Site Geovana.

### Lacunas encontradas e corrigidas

- A troca de clínica podia manter conteúdo anterior enquanto a nova consulta respondia. A lista, os filtros, os modais e as mensagens agora são limpos ao mudar o contexto, e respostas antigas não substituem o contexto atual.
- O formulário apresentava um erro geral, mas não indicava o campo. A validação detalhada agora aponta nome, cargo, profissão, CPF, conselho, clínicas ou e-mail, associa a mensagem ao controle, move o foco ao primeiro erro e preserva o preenchimento.
- A distinção entre função, profissão de saúde, clínicas e acesso estava distribuída no texto. O formulário agora usa um grupo próprio para dados profissionais, exibe a clínica ativa e explicita que vínculo não concede login.
- O rodapé de ações podia ficar apertado no celular. Os botões ocupam a largura disponível em telas pequenas, mantêm ordem segura e continuam confortáveis no teclado.
- Fechar uma ficha alterada descartava os dados sem confirmação. O fluxo agora usa a confirmação compartilhada “Descartar alterações”, sem alterar dados no banco.
- Os estados de lista, clínica não selecionada, indisponibilidade, vazio, erro e atualização pendente agora são distintos. O aviso de pendência explica que a lista legada é somente leitura e que nenhuma alteração será salva antes da homologação.

CPF de Equipe continua opcional provisoriamente, como já definido nos relatórios 09–12; a alteração não criou nova regra de negócio e não tocou no CPF de Pacientes.

### Arquivos alterados nesta continuidade

- `src/pages/cadastros/Equipe.tsx` — estados, contexto, acessibilidade, validação próxima aos campos, confirmação de descarte e responsividade.
- `src/lib/equipe.ts` — contrato de erro detalhado por campo, mantendo `validarFormularioEquipe` compatível.
- `src/lib/equipe.test.ts` — caso dirigido para apontamento de campo e vínculo clínico obrigatório.
- `tests/operacional/equipe-contexto.tsx` e `tests/operacional/equipe-contexto.html` — harness local sintético, sem banco.
- `tests/operacional/equipe.spec.ts` — cenários de validação, troca de clínica, bloqueio de compatibilidade e dupla submissão em desktop, tablet e mobile.
- `src/config/notasEvolucao.json` — notas de comportamento implementado.
- `docs/modulos/equipe/08-CHECKPOINT.md`, `00-README-EQUIPE.md` e `14-CONTINUIDADE-LOCAL-UX.md` — histórico e índice.

### Verificações realmente executadas

- `npm.cmd run build` — aprovado; checagem de notas, TypeScript e Vite concluídas. Permanecem apenas os avisos conhecidos de chunk grande/importação dinâmica do Vite.
- `npm.cmd run lint` — aprovado com o aviso histórico de Fast Refresh em `src/theme/ThemeProvider.tsx`; nenhum erro novo do módulo Equipe.
- `server\\node_modules\\.bin\\tsx.cmd --test src/lib/equipe.test.ts` — 7/7 testes aprovados.
- `playwright` com `tests/operacional/equipe.spec.ts` — 9/9 aprovados, nos projetos desktop, tablet e mobile. O harness interceptou chamadas para `operacional.synthetic.invalid`, usou dados fictícios e confirmou validação, foco, confirmação de descarte, troca A/B sem vazamento da lista anterior, persistência apenas simulada após retorno RPC, bloqueio de repetição e mensagem de compatibilidade.
- `curl` local — `http://127.0.0.1:5173/acesso/brotas` e `http://127.0.0.1:5173/acesso/ipupiara` responderam HTTP 200; a porta 5173 permaneceu disponível.
- A página local de Brotas foi conferida pela árvore de acessibilidade do navegador. O acesso autenticado ao menu Equipe não foi forçado nem contornado.
- O SHA-256 da migration permaneceu `F90E9278A46EC09DAE1A1F30B9B48AFC436B956AD42681946C358D7D503BB396`.

### Simulado, não homologado

O teste Playwright é uma simulação de componente/harness: não prova Auth, PostgREST, RLS, Vault, Storage, auditoria, persistência real ou permissões do Supabase. O sucesso sintético não libera gravações. Não foram repetidos os ensaios SQL históricos porque a migration não mudou nesta etapa.

### Conferência local e limitações

Com a sessão autenticada e uma unidade disponível, o caminho é **Cadastros → Equipe & acessos**; as URLs de entrada são:

- `http://127.0.0.1:5173/acesso/brotas`
- `http://127.0.0.1:5173/acesso/ipupiara`

Essas URLs identificam o servidor da interface, não um banco local. Sem uma sessão autorizada não é possível confirmar no navegador a listagem real, a abertura do formulário ou a gravação; a tela normal mantém a proteção. O harness separado é a evidência local dos comportamentos de UX.

### Pendências para liberar cadastro e edição

Continuam pendentes ambiente Supabase de homologação autorizado, Auth/PostgREST/Vault/Storage completos, contas fictícias com perfis e duas clínicas, testes negativos de RLS/RPC por perfil e unidade, persistência real após recarregar, auditoria e compatibilidade com Agenda/Financeiro. A migration segue não aplicada no principal `xftnkusbyqzyvzrovroj`; o Site Geovana permanece fora do escopo e ativo.

### Próxima ação útil

Quando houver ambiente isolado autorizado, retomar o relatório `12-HOMOLOGACAO-SUPABASE-REAL.md`, aplicar exatamente o SQL cujo hash está registrado e executar a matriz real antes de remover o bloqueio. Nenhuma nova tentativa de cota, contratação ou alteração remota é necessária para esta entrega local.

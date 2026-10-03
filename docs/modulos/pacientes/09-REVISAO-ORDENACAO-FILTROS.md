# Ordenação e filtros — implementação local e dependência de volume

Status: implementado localmente com limite explícito; consulta paginada em proposta, não aplicada.

## Decisão e comportamento entregue em 26/09/2026

O pedido aprova seis ordenações, filtros complementares e composição com a busca existente, sem alterar cadastro, CPF, papéis ou isolamento entre clínicas. Nome usa `Intl.Collator('pt-BR', { sensitivity: 'base' })`; datas usam valores completos; ausentes ficam no fim. Desempates por nome e ID. A ordenação não modifica nomes e não fecha o resumo selecionado por ID.

O cabeçalho da lista tem seletor, Filtros com contagem dos limites ativos e quantidade de resultados. Cabeçalhos Paciente/Nascimento compartilham estado e `aria-sort`. Filtros são rascunhos até Aplicar; Limpar preserva busca/ordem. Idades são anos completos. Datas de criação usam `created_at`, nunca `updated_at`, e intervalo semiaberto até o início do dia seguinte em `America/Bahia` (fuso já presente em `src/lib/financeiro/financeiro.date.ts`). Nascimento ausente não tem idade.

## Contrato atual, sem operação no banco

1. PostgREST recebe clínica explícita, ativos, substring literal de nome e filtros de datas/nascimento antes de `limit(1000)`, com `count: exact`. Há debounce de 250 ms na busca nominal, cancelamento e identificação da consulta/clínica. Não há busca sequencial para baixar toda a base.
2. Só quando a quantidade retornada corresponde exatamente à contagem é permitida a ordenação em português no cliente. Assim, nenhuma linha elegível ficou fora da ordenação. Não há paginação local de um subconjunto.
3. Se a resposta estiver cortada (inclusive por limite remoto menor que 1000), **nenhuma lista parcial é exibida**. A contagem real permanece; a tela pede refinar busca/filtros. Sem contagem ou com erro, há aviso e repetição; não se apresenta lista vazia como sucesso.
4. A pesquisa exata de CPF continua pela RPC existente, com clínica + CPF validado. Somente IDs retornados recebem consulta adicional de `id, created_at, foto_path`, na mesma clínica, inclusive inativos. A RPC não foi alterada. Não há seleção de hash/ciphertext nem descriptografia na lista.
5. Filtros, busca e ordem permanecem apenas em memória. Troca de clínica oculta imediatamente respostas e resumo anteriores; descarta chamadas tardias. O cadastro e seu retorno à Agenda não foram alterados.

**Limitação real:** ordenar/exibir conjuntos elegíveis maiores que a resposta completa ainda depende do backend. Esta implementação não é anunciada como paginação global pronta. A configuração local tem `api.max_rows = 1000`; o limite remoto não foi consultado nesta tarefa. `count: exact` permite detectar qualquer truncamento efetivo.

## Proposta separada de backend para revisão

Arquivo: `supabase/review/pacientes_listagem_ordenacao_global.sql`. Não é migration; não foi executado, aplicado ou validado no PostgreSQL. Termina em ROLLBACK como proteção adicional, não como autorização de execução.

- RPC proposta `pacientes_listar_administrativo`: parâmetros explícitos de clínica, substring de nome, criação início/fim, idades mínima/máxima, presença de nascimento, ordem, offset e limite (máximo 100).
- Retorno: `total` e `itens` administrativos, sem qualquer coluna de CPF. Contagem, filtros e ordenação em um snapshot antes de offset/limit.
- Autorização proposta repete o contrato administrativo atual: sessão autenticada, proprietária/recepção ativa na clínica, clínica ativa e contexto não divergente. Não amplia papéis nem revoga funções antigas. O contexto nulo continua não equivalendo à seleção visual.
- Collation ICU exclusiva `pt-BR-u-ks-level1` para comparação sem diferenças de caixa/acentos; conferir disponibilidade e equivalência com o frontend. Não mudar collation global.
- Antes de transformar em migration: ensaios sintéticos com mais de 1000 registros, mesma data/nome, nulos, aniversários e 29/02; negativas por papel/clínica/contexto; count e páginas sem saltos/duplicações em um conjunto estável; plano de execução/índices; critérios para mudanças concorrentes entre páginas.
- Depois de aprovada/homologada a função, substituir a consulta limitada e adicionar navegação de páginas. Resetar página ao alterar busca/filtros/ordem, preservar resumo por ID quando ainda elegível. Manter busca exata de CPF independente e sem ampliar seu retorno. O frontend desta tarefa **não chama a RPC proposta**.

## Verificação

Testes sintéticos: `src/lib/pacienteLista.test.ts` e `tests/operacional/pacientes-filtros.spec.ts`, além das regressões existentes de Pacientes/Agenda. Capturas locais em `scratch/pacientes-filtros-20260926/`, sem pacientes reais. Resultados finais no CHECKPOINT. Homologação remota e dispositivos físicos não foram realizadas; a prévia habitual continua na árvore original, porta 4197. Nenhuma branch/PR de integração da versão 0.1.0 foi alterada.

Resultado final: 19 testes unitários e 66 cenários operacionais aprovados, código 0. Typecheck, lint, build e `git diff --check` aprovados. Avisos preexistentes: Fast Refresh em `ThemeProvider.tsx`, chunks/importação mista no build e conversão de finais de linha no Git. Idade exibida na lista/resumo e filtros usam o mesmo dia da Bahia; o cenário de virada de dia foi executado com navegador em UTC.

## Arquivos desta tarefa (não confundir com todo o Git preexistente)

- `src/pages/Pacientes.tsx`: consulta, contagem, proteção contra truncamento/respostas antigas, seleção e cabeçalhos.
- `src/pages/pacientes-lista.css`: controles responsivos, foco, filtros e adaptação da estrutura acessível da lista.
- `src/components/pacientes/ControlesListaPacientes.tsx`: painel de ordenação/filtros.
- `src/lib/pacienteLista.ts` e `src/lib/pacienteLista.test.ts`: regras puras e testes sintéticos.
- `tests/operacional/pacientes-filtros.spec.ts`: regressões e capturas novas.
- `tests/operacional/operacional.spec.ts` e `tests/operacional/pacientes-pagina-visual.spec.ts`: adequação dos mocks à contagem exata/metadados e do seletor de coluna à seta de ordenação.
- `package.json`: inclui os testes de lista/idade no comando já existente de Pacientes, sem mudar versão ou dependências.
- `src/config/notasEvolucao.json`: uma melhoria nas notas ainda não lançadas de 0.1.0.
- Documentação de Pacientes: README, Documento Funcional Mestre, CHECKPOINT e este relatório.
- `supabase/review/pacientes_listagem_ordenacao_global.sql`: proposta separada, não executada e não colocada em migrations.

Não foram alterados nesta tarefa: App, Login, Agenda, Prontuário, Financeiro, modal/CSS de cadastro, migrations executáveis, branches ou PRs de integração. Os testes existentes também geraram suas evidências usuais em `scratch/`; nada dessas capturas foi colocado no índice do Git.

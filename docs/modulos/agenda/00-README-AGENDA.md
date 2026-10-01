# Agenda — correção de data e horário

Estado: edição anterior publicada nas duas clínicas em 01/10/2026, commit 490ebca;
política manual comum aprovada e implementada localmente, NÃO publicada/aplicada no principal.
Nova migration `20261001173000` testada no PostgreSQL isolado. Gravação real/persistência
pela interface permanecem pendentes. Evidências e limites no relatório 12.
Melhoria local posterior de disponibilidade: seletor, faixas e impedimentos explícitos;
ainda não publicada. Diagnóstico conectado em 01/10/2026: falta expediente de quinta-feira
para o profissional/Brotas investigados; só padrão ativo de terça-feira, sem exceção
para a data. Esclarecimento posterior: esse padrão foi criado em ensaio histórico;
não é definição operacional aprovada pelo usuário. Não configurar horário para fazer
teste passar. Usuário aprovou agenda manual: ausência/fora da faixa habitual exigem
aviso e confirmação; folgas/bloqueios, conflitos e limites explícitos permanecem obrigatórios.
Criação/edição locais compartilham a política; banco principal ainda usa a versão anterior.
Detalhes no relatório 12.

- [Regras desta correção](01-CORRECAO-DATA-HORARIO.md): regra aprovada antes/depois da chegada e limites.
- [Implementação e evidências](12-EDICAO-DATA-HORARIO.md): diagnóstico, testes isolados e migration aplicada em 01/10/2026.
- [Fluxo anterior da recepção](../sistema/11-FLUXO-OPERACIONAL-RECEPCAO.md): confirmação de chegada publicada em 9512aed; validação real de gravação ainda pendente.
- [Financeiro mestre](../financeiro/01-DOCUMENTO-FUNCIONAL-MESTRE.md#24-reagendamento--mesmo-médico) e [permissões](../financeiro/02-MATRIZ-PAPEIS-PERMISSOES.md#18-reagendamento): pagamento válido no mesmo médico, sem novo recebimento.

Não tratar lista de espera como agendamento. Aplicação local conecta ao principal;
nenhuma escrita operacional de teste autorizada nesta etapa. Migration antiga `20261001120000` aplicada;
incremental `20261001173000` somente preparada e testada no laboratório;
correção legítima/persistência pela interface ainda não comprovadas. A publicação desta
edição foi concluída, distinta das publicações históricas; evidências no relatório 12.

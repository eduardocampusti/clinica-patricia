# Agenda — correção de data e horário

**Local, 02/10/2026:** tela móvel conforme mockup (cinco dias, chips, linha do tempo e botão inferior),
contagem da remarcação sem próprio ID e blocos passados de hoje indisponíveis na apresentação.
Sem publicação/banco nesta rodada; resultados e limites no [relatório 13](13-EXPERIENCIA-RECEPCAO.md).

**Etapa 1 do redesenho (02/10/2026):** seletor visual de horários (blocos Manhã/Tarde/Noite,
“Outro horário” manual e faixa de 7 dias na criação), somente interface. Leitura conferida no
principal (Recepção/Brotas); publicação autorizada. Testes, limites e resultados no [relatório 13](13-EXPERIENCIA-RECEPCAO.md).

Evolução visual posterior: lista cronológica compacta, grade temporal por profissional
(eixo comum, duração proporcional e sobreposições visíveis), painéis laterais e confirmação
de descarte implementados localmente em 01/10/2026, ainda sem commit/publicação. Testes sintéticos e
prévia separada, sem banco real: [experiência da recepção](13-EXPERIENCIA-RECEPCAO.md).
Fechamento local em 02/10/2026: foco/rolagem da confirmação e consultas de 15/20 minutos
ajustados e verificados. Leitura conectada Recepção/Brotas, sem salvar; persistência real
e Ipupiara autenticada permanecem pendentes. Sem nova publicação; detalhes no relatório 13.
O estado aplicado/publicado abaixo é anterior a essa evolução visual.

Estado: edição anterior publicada nas duas clínicas em 01/10/2026, commit 490ebca;
política manual comum aplicada/publicada em ambas no commit b921a1c, em transição concluída.
Migrations `20261001193000` e `20261001194000` aplicadas após testes isolados. Gravação real/persistência
pela interface permanecem pendentes. Evidências e limites no relatório 12.
Melhoria local posterior de disponibilidade: seletor, faixas e impedimentos explícitos;
publicada em b921a1c. Diagnóstico conectado em 01/10/2026: falta expediente de quinta-feira
para o profissional/Brotas investigados; só padrão ativo de terça-feira, sem exceção
para a data. Esclarecimento posterior: esse padrão foi criado em ensaio histórico;
não é definição operacional aprovada pelo usuário. Não configurar horário para fazer
teste passar. Usuário aprovou agenda manual: ausência/fora da faixa habitual exigem
aviso e confirmação; folgas/bloqueios, conflitos e limites explícitos permanecem obrigatórios.
Criação/edição publicadas compartilham a política; caminho antigo encerrado no banco.
Detalhes no relatório 12.

- [Regras desta correção](01-CORRECAO-DATA-HORARIO.md): regra aprovada antes/depois da chegada e limites.
- [Implementação e evidências](12-EDICAO-DATA-HORARIO.md): diagnóstico, testes isolados e migration aplicada em 01/10/2026.
- [Fluxo anterior da recepção](../sistema/11-FLUXO-OPERACIONAL-RECEPCAO.md): confirmação de chegada publicada em 9512aed; validação real de gravação ainda pendente.
- [Financeiro mestre](../financeiro/01-DOCUMENTO-FUNCIONAL-MESTRE.md#24-reagendamento--mesmo-médico) e [permissões](../financeiro/02-MATRIZ-PAPEIS-PERMISSOES.md#18-reagendamento): pagamento válido no mesmo médico, sem novo recebimento.

Não tratar lista de espera como agendamento. Aplicação local conecta ao principal;
nenhuma escrita operacional de teste autorizada nesta etapa. Migration antiga `20261001120000` aplicada;
proposta `20261001173000` substituída pelas fases 193000/194000 antes de aplicação;
correção legítima/persistência pela interface ainda não comprovadas. A publicação desta
edição foi concluída, distinta das publicações históricas; evidências no relatório 12.

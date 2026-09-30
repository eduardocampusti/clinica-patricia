# Equipe — índice do módulo

Continuidade vigente: `22-CONVITE-REAL-E-ACEITE.md` (aceite/login confirmados, recusa de Ipupiara pela conta comum e limpeza concluída; limites da verificação administrativa explícitos) e `23-EMAILS-INSTITUCIONAIS.md` (templates preparados, bloqueio remoto Free/SMTP padrão; contexto visual publicado na Edge Function versão 5).

Retomada do relatório23: texto e prévias finais concluídos; Source/Save remotos novamente confirmados desabilitados. Restrição de personalização do serviço padrão Free afeta corpo/assunto, não somente remetente. Nenhum template personalizado aplicado, contratação ou nova conta.

**Estado:** cadastro/edição de Equipe continuam disponíveis no Supabase principal autorizado. As migrations de gestão e correção (`20260929120000`, `20260929190000` e `20260930100000`) estão aplicadas e a Edge Function `equipe-acessos` está ativa na versão 5. Retorno local configurado, convite real recebido/aceito, login Recepção/Brotas e recusa Ipupiara confirmados; fixture e conta removidas preservando auditoria. Templates personalizados não aplicados.

## Fontes de verdade

1. `01-DOCUMENTO-FUNCIONAL-MESTRE.md` — comportamento aprovado.
2. `08-CHECKPOINT.md` — o que foi efetivamente executado e verificado.
3. `09-REVISAO-HOMOLOGACAO-MIGRATION.md` — revisão de segurança, migration integral e plano de homologação/aplicação.
4. `10-CORRECOES-REVISAO-INDEPENDENTE.md` — correções A1–A12, homologação isolada, SQL integral vigente e plano de aplicação.
5. `11-VALIDACAO-PONTUAL-E-INTEGRADA.md` — correções B1–B3, comparação somente de leitura com o principal, concorrência em duas conexões e SQL integral final.
6. `12-HOMOLOGACAO-SUPABASE-REAL.md` — correção da alteração isolada de UF, verificação de dependências legadas e tentativa controlada de criar ambiente Supabase gratuito.
7. `13-CHECKPOINT-E-CONTINUIDADE-LOCAL.md` — continuidade local de formulários, mensagens, responsividade e evidências sem alterar o principal.
8. `14-CONTINUIDADE-LOCAL-UX.md` — relatório final desta rodada local e limites para liberar gravações.
9. `15-FICHA-MEMBRO-CONSULTA.md` — ficha de consulta de funcionário/profissional, estados de leitura, testes sintéticos e limitações atuais.
10. `16-CONFERENCIA-AUTENTICADA-CONSULTA.md` — conferência autenticada parcial em Brotas e Ipupiara, sem gravações, e limites para homologação.
11. `17-APLICACAO-E-VALIDACAO-NO-SUPABASE-ATUAL.md` — aplicação autorizada, backup, catálogo pós-migration, testes autenticados, limpeza e situação final.
12. `18-VALIDACAO-CPF-E-PRESERVACAO-BACKUP.md` — validação dirigida de CPF, limpeza dos dados sintéticos e cópia permanente protegida do backup anterior.
13. `19-GESTAO-DE-ACESSOS.md` — gestão de acessos por clínica, aplicação real da migration e publicação da função, testes autenticados de leitura e pendências de convite/aceite.
14. `20-CORRECOES-GESTAO-DE-ACESSOS.md` — revisão da versão publicada, aplicação da correção de consulta, vínculo profissional, aceite, expiração, reserva de envio e escopo por clínica, com validação remota e pendência externa de e-mail.
15. `21-AJUSTES-FINAIS-CONVITES-E-SUSPENSAO.md` — expiração substituível, recuperação segura após falha parcial do Auth, origens locais 3000/5173 e bloqueio servidor de sessão já aberta após suspensão.
16. `22-CONVITE-REAL-E-ACEITE.md` — configuração do retorno, envio real para destinatário autorizado e checkpoint anterior à participação do titular.

O cadastro antigo de profissionais continua preservado para Agenda e Financeiro. A nova área “Equipe & acessos” reúne médicos, outros profissionais de saúde, recepção, administração e apoio sem transformar funcionário em usuário ou profissional de saúde.

## Estado atual

A interface e a migration aditiva foram preparadas localmente e, após autorização explícita, a migration exata `20260928153000_equipe_cadastro_edicao.sql` foi aplicada no Supabase principal `xftnkusbyqzyvzrovroj` em 29/09/2026. O SHA-256 aplicado foi `F90E9278A46EC09DAE1A1F30B9B48AFC436B956AD42681946C358D7D503BB396`. O catálogo confirmou tabelas, coluna de UF, índices, RLS, funções `SECURITY DEFINER`, grants mínimos, policies e triggers; a história remota foi atualizada somente para essa versão. Testes autenticados reais criaram/editaram profissional, recepção e apoio em Brotas e Ipupiara, persistiram após recarregar e foram removidos por IDs exatos, preservando a auditoria. O principal não deve mais exibir o bloqueio de compatibilidade; a liberação depende apenas da sessão/papel autorizados e da integridade dos serviços existentes.

A continuidade local de UX foi concluída no relatório `14-CONTINUIDADE-LOCAL-UX.md`; a ficha detalhada e a conferência autenticada anterior estão em `15-FICHA-MEMBRO-CONSULTA.md` e `16-CONFERENCIA-AUTENTICADA-CONSULTA.md`. O relatório `17-APLICACAO-E-VALIDACAO-NO-SUPABASE-ATUAL.md` registra a mudança de decisão (ambiente separado substituído por autorização do principal), o backup protegido, os testes reais, a limpeza e as limitações remanescentes. As gravações de Equipe deixaram de estar bloqueadas para a proprietária autorizada após a aplicação validada; nenhum dado temporário permaneceu.
A validação dirigida posterior está em `18-VALIDACAO-CPF-E-PRESERVACAO-BACKUP.md`; ela confirmou CPF informado, preservação, correção, remoção opcional, rejeição de CPF inválido/duplicado e limpeza sem alteração de código.

O relatório `19-GESTAO-DE-ACESSOS.md` registra a aplicação autorizada: o cadastro/edição continua preservado, a tabela/RPCs de gestão estão instaladas com RLS/grants restritos e a Edge Function está ativa. A leitura autenticada de Brotas e o estado vazio de Ipupiara foram conferidos. Não foram enviados convites reais; o redirect seguro e os testes com contas não proprietárias permanecem pendentes.

O relatório `20-CORRECOES-GESTAO-DE-ACESSOS.md` registra os defeitos encontrados na versão 1 e a conclusão autorizada em 30/09/2026. A migration corretiva foi aplicada isoladamente, o catálogo e a integridade foram verificados e a Edge Function versão 2 foi publicada com JWT obrigatório. A interface autenticada confirmou consulta sem gravação e isolamento Brotas/Ipupiara; o ensaio remoto reversível confirmou negativas, sincronização, idempotência, reserva de envio, suspensão/reativação e autobloqueio. Convite e aceite por e-mail permanecem pendentes porque não há redirect nem caixa de teste autorizada.

O complemento `21-AJUSTES-FINAIS-CONVITES-E-SUSPENSAO.md` registra a migration `20260930100000` e a Edge Function versão 3. Um novo preparo pode substituir convite vencido sem apagar o histórico; finalizações atrasadas não reabrem cancelados/aceitos; o reenvio registra ou recupera a conta Auth exata sem conceder acesso. Chamadas autenticadas foram conferidas nas portas 3000 e 5173. Sessões sintéticas reais comprovaram que um token já emitido perde a leitura protegida imediatamente após suspensão e a recupera após reativação. As fixtures foram removidas por IDs exatos e a auditoria foi preservada.

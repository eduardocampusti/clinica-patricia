# CLÍNICA PATRÍCIA — FASE 12 — PREPARAÇÃO PARA ENTRADA EM OPERAÇÃO

> Estado histórico. Os bloqueadores técnicos tratáveis foram remediados na FASE 13; consultar `14-REMEDIACAO-PRE-CUTOVER.md` para o estado vigente.

**Estado:** CONCLUÍDA EM 23/09/2026 — NO-GO

**Branch auditada:** `codex/checkpoint-local-2026-08-14`

**Projeto Supabase:** `xftnkusbyqzyvzrovroj` (`ACTIVE_HEALTHY`, região `sa-east-1`)

## 1. Objetivo, limites e decisão

Esta fase preparou e auditou as pré-condições do primeiro uso real. Nenhum paciente real foi cadastrado, nenhum registro foi removido, nenhuma migration foi aplicada, nenhuma configuração de produção foi alterada e nenhum cutover foi executado.

Decisão: **NO-GO — AINDA EXISTEM BLOQUEADORES**. O produto validado na FASE 11 permanece tecnicamente apto à preparação, mas ainda não há proteção e configuração operacional suficientes para dados reais.

Bloqueadores principais:

1. projeto no plano Free, sem backup automático e sem PITR;
2. backup lógico não concluído e restauração não ensaiada;
3. frontend sem destino de deploy/domínio definido;
4. URL principal do Auth ainda é `http://localhost:3000`, sem URLs adicionais de redirect;
5. quatro das cinco contas são sintéticas e as clínicas ativas dependem delas para recepção/médico;
6. todos os três pacientes e os dois agendamentos existentes têm indício comprovado de fixture;
7. caixa legado aberto bloqueia o novo Financeiro da Clínica Brotas até decisão humana de transição.

## 2. Estado inicial

- HEAD inicial `7f65ec2`, sincronizado com `origin/codex/checkpoint-local-2026-08-14`.
- Última migration remota: `20260922181438_financeiro_fase10c_resumo_caixa`.
- Alterações locais anteriores em Login, Prontuário, Agenda, configuração e documentos foram preservadas.
- O inventário foi executado apenas com consultas de leitura. Dados pessoais foram pseudonimizados neste documento.

## 3. Inventário atual do banco

| Entidade | Total | Classificação |
|---|---:|---|
| usuários Auth / perfis públicos | 5 / 5 | 1 provável real; 4 sintéticos |
| vínculos usuário–clínica | 8 | misto; revisar antes do corte |
| clínicas | 3 | 2 ativas; 1 inativa |
| profissionais | 1 | sintético |
| vínculos profissional–clínica | 2 | configuração sintética |
| pacientes | 3 | todos com indício explícito de fixture |
| agendamentos | 2 | históricos de agosto/2026 ligados a fixtures |
| atendimentos / documentos clínicos / adendos | 0 / 0 / 0 | limpo |
| sessões / entradas de caixa | 1 / 2 | legado preservado |
| recebimentos / componentes | 0 / 0 | limpo |
| estornos / repasses / fiscal | 0 / 0 / 0 | limpo |
| movimentos / fechamentos novos | 0 / 0 | limpo |
| auditoria geral / financeira | 57 / 0 | histórico a preservar |

## 4. Matriz de dados para entrada em operação

| Conjunto | Decisão | Justificativa |
|---|---|---|
| migrations, funções, RLS e configurações estruturais | MANTER | base homologada |
| Clínica Brotas e Clínica Ipupiara | REVISAR COM RESPONSÁVEL | ativas, mas incompletas para abertura |
| Clínica Ibitiara | LEGADO PRESERVADO | clínica e vínculos inativos; não excluir |
| configurações financeiras vigentes | CONFIGURAÇÃO | existem nas três clínicas; validar percentuais com responsável |
| configurações de alertas financeiros | REVISAR COM RESPONSÁVEL | não existem para nenhuma clínica |
| conta `usuario_1` | REVISAR COM RESPONSÁVEL | provável proprietária real; confirmar identidade e acesso |
| contas `usuario_2` a `usuario_5` | REMOVER ANTES DO GO-LIVE | marcadas por domínio/nome sintético; exclusão depende de backup e aprovação |
| profissional único | REMOVER ANTES DO GO-LIVE | indício explícito de fixture; substituir por profissional real controladamente |
| três pacientes | REMOVER ANTES DO GO-LIVE | todos identificados como sintéticos |
| dois agendamentos históricos | REMOVER ANTES DO GO-LIVE | ligados a pacientes sintéticos; um ainda consta como agendado |
| auditoria geral | LEGADO PRESERVADO | não apagar trilha histórica |
| sessão e entradas do caixa legado | LEGADO PRESERVADO | histórico obrigatório; transição não decidida |
| Financeiro novo vazio | MANTER | estado limpo e homologado |
| Storage | NÃO APLICÁVEL ATUALMENTE | zero buckets e zero objetos |

Nenhuma linha marcada para remoção foi alterada nesta fase.

## 5. Usuários e papéis

| Alias | Situação | Vínculos | Decisão |
|---|---|---|---|
| `usuario_1` | ativo, e-mail confirmado, provável real | proprietária ativa em Brotas e Ipupiara; vínculo inativo em Ibitiara | confirmar com responsável |
| `usuario_2` | ativo, sintético | médico em Brotas e Ipupiara | substituir por conta/profissional real |
| `usuario_3` | perfil e vínculo inativos, sintético | médico em Ibitiara | preservar até limpeza autorizada |
| `usuario_4` | ativo, sintético | recepção em Brotas; operador do caixa legado | não remover antes da decisão do legado |
| `usuario_5` | ativo, sintético | recepção em Ipupiara | substituir por conta real |

Não foram encontrados usuários Auth sem perfil público. Não há duplicidade evidente de identidade no inventário pseudonimizado. A Clínica Ipupiara possui papel médico, mas não possui profissional ativo vinculado à clínica; o vínculo é incompatível para operação.

## 6. Checklist por clínica

| Item | Ibitiara | Brotas | Ipupiara |
|---|---|---|---|
| situação | inativa | ativa | ativa |
| proprietária ativa | não | sim | sim |
| recepção ativa | não | sim, sintética | sim, sintética |
| médico ativo | não | sim, sintético | sim, sintético |
| profissional ativo vinculado | 1 sintético | 1 sintético | 0 |
| preço profissional–clínica | configurado | configurado | ausente por falta de vínculo |
| configuração financeira vigente | sim | sim | sim |
| alertas financeiros | ausentes | ausentes | ausentes |
| CNPJ fiscal | ausente | ausente | ausente |
| PIX/dados bancários | sem domínio aprovado no schema | sem domínio aprovado no schema | sem domínio aprovado no schema |
| caixa | nenhum | legado aberto | nenhum |
| situação de abertura | NÃO APLICÁVEL | NO-GO | NO-GO |

Os percentuais e preços existentes devem ser confirmados pela responsável; este documento registra presença, não publica valores comerciais.

## 7. Pacientes, Agenda e Prontuário

### Pacientes

Os três pacientes são ativos, têm consentimento registrado, não apresentam grupos duplicados por hash de CPF ou e-mail e possuem indício explícito de fixture. Devem ser revisados e removidos somente após backup, aprovação e plano de corte.

### Agenda

Há dois agendamentos entre 04 e 05/08/2026: um concluído e um ainda `agendado`; ambos se relacionam a pacientes sintéticos. Não existem agendamentos futuros. O registro ainda `agendado` pode afetar leitura operacional e deve integrar a limpeza autorizada.

### Prontuário

Não existem atendimentos, documentos clínicos, adendos ou leituras clínicas persistentes. RLS está ativa em todas as tabelas públicas e as RPCs do Prontuário permanecem sob o hardening existente. Antes do piloto: criar profissional real, validar login médico, leitura, rascunho, finalização, imutabilidade e segregação em duas clínicas.

## 8. Caixa legado e Financeiro

A Clínica Brotas possui uma sessão aberta desde 03/08/2026, aberta por `usuario_4`, com R$ 150,50 de abertura, duas entradas e R$ 1.000,00 de total histórico. Não há movimentos, recebimentos ou fechamentos do Financeiro novo ligados a ela.

O contrato do novo Financeiro impede operar sobre sessão legada. Enquanto ela estiver aberta, Brotas não deve iniciar uso financeiro real.

Estratégias admissíveis para decisão humana:

1. fechamento administrativo controlado, documentando valores e responsável;
2. preservação histórica após encerramento manual auditado;
3. migration específica e previamente homologada, se o histórico precisar ser convertido.

Nenhuma estratégia foi escolhida ou executada. Não apagar, editar diretamente ou reutilizar a sessão.

O Financeiro novo permanece limpo: zero recebimentos, pagamentos, estornos, repasses, documentos fiscais, movimentos e fechamentos. Fiscal interno está pronto; emissão externa permanece pendente e não impede Agenda/Prontuário, mas impede prometer emissão fiscal real.

Despesas administrativas continuam como **DOMÍNIO FUNCIONAL PENDENTE**. Sua ausência não interfere nos contratos atuais de Caixa, recebimentos, repasses e relatórios.

## 9. Backup e recuperação

### Capacidade real

- Plano: **Free**.
- Backup automático disponível: **não**.
- Retenção automática: **não aplicável**.
- PITR: **desativado e não incluído no plano**.
- Backup lógico: suportado por `supabase db dump`/`pg_dump`, mas exige runtime `pg_dump` compatível; a CLI instalada tenta usar Docker.
- Storage: backup do banco nunca substituiria cópia física dos objetos, porém atualmente não há buckets/objetos.

### Resultado da tentativa

**BACKUP LÓGICO — PENDENTE DE EXECUÇÃO MANUAL.** O dry-run confirmou conexão autenticada, mas a execução falhou antes de gerar conteúdo porque Docker não está ativo e não existe `pg_dump` instalado. O arquivo vazio da tentativa foi removido. Nenhum dado foi exportado.

Não usar `--dry-run` em logs compartilhados: a CLI pode exibir credencial transitória de conexão. Nunca copiar essa credencial para documento, script ou Git.

### Runbook de backup lógico

1. congelar escritas e registrar horário;
2. iniciar Docker já aprovado para o ambiente **ou** instalar cliente PostgreSQL 17 por procedimento controlado;
3. confirmar `supabase projects list` e o projeto vinculado;
4. criar diretório criptografado fora do repositório;
5. executar, sem `--dry-run`, dumps separados de roles, schema e dados com `supabase db dump --linked`;
6. avaliar exportação controlada de Auth; o dump padrão exclui schemas gerenciados;
7. gerar SHA-256, registrar tamanho/data e copiar para local externo protegido;
8. reabrir escritas somente após verificar arquivos não vazios;
9. nunca versionar o backup.

### Runbook de recuperação

Estado: **DOCUMENTADO, NÃO ENSAIADO**.

1. criar projeto temporário isolado somente após aprovação de custo/ambiente;
2. usar a mesma versão principal do PostgreSQL;
3. restaurar roles, schema e dados na ordem, sem apontar o frontend real;
4. aplicar/verificar migrations e extensões;
5. recriar/validar usuários Auth por procedimento suportado — senhas não devem ser copiadas manualmente;
6. validar RLS, grants, `SECURITY DEFINER`, RPCs e projeto vinculado;
7. restaurar objetos de Storage separadamente, quando existirem;
8. comparar contagens, checksums funcionais e clínica/usuários;
9. executar smoke de proprietária, recepção e médico;
10. descartar o ambiente temporário somente após aprovação e retenção das evidências.

Nunca restaurar sobre o projeto principal como ensaio.

## 10. Storage

Auditoria real: zero buckets, zero objetos e zero bytes registrados. Não há dependência atual entre Prontuário/documentos e Storage. Antes de qualquer uso futuro, criar bucket privado, policies por clínica/papel, retenção e backup físico separado; backup PostgreSQL cobre somente metadados.

## 11. Auth, e-mail e smoke real

- login por e-mail: habilitado;
- novos cadastros: habilitados;
- confirmação de e-mail: habilitada;
- login anônimo e vinculação manual: desabilitados;
- custom SMTP: desabilitado;
- Site URL: `http://localhost:3000`;
- Redirect URLs adicionais: nenhuma;
- SMTP padrão está sujeito ao limite reduzido do projeto e não é adequado como garantia operacional;
- recuperação de senha não está liberada como fluxo operacional no frontend.

**SMOKE AUTENTICADO REAL — PENDENTE DE TESTE MANUAL.** Não havia sessão segura do aplicativo nem credenciais apropriadas disponíveis. A sessão administrativa do Dashboard não substitui a identidade do aplicativo.

Antes do piloto, restringir cadastro público conforme a estratégia de onboarding, configurar domínio/redirects, decidir SMTP e testar login/logout/restauração/recuperação com contas reais controladas.

## 12. Deploy e configuração do frontend

O build é reproduzível e não gera source maps. O bundle não contém `service_role`, senha de banco, chave privada ou HMAC. A chave pública do Supabase é apropriada ao browser desde que RLS/RPC continuem como autoridade.

Não foram encontrados `vercel.json`, `netlify.toml`, configuração equivalente ou workflow de deploy. Não existe domínio operacional, HTTPS, SPA fallback ou pipeline publicado comprovado. O repositório GitHub, isoladamente, não é deploy.

Antes do GO:

1. escolher hospedagem e domínio;
2. configurar HTTPS e fallback SPA;
3. cadastrar apenas `VITE_SUPABASE_URL` e chave publishable/anon pública no ambiente;
4. ajustar Site URL e Redirect URLs no Supabase;
5. executar build e smoke no domínio final;
6. confirmar que logs e páginas de erro não expõem detalhes técnicos.

## 13. Observabilidade

Capacidades existentes: Logs e Auth Audit Logs do Supabase, tabela `auditoria`, eventos financeiros imutáveis e mensagens sanitizadas no frontend.

Procedimento mínimo para incidente:

1. registrar horário, clínica, papel e ação sem copiar dado clínico desnecessário;
2. interromper somente o fluxo afetado;
3. preservar screenshot da mensagem funcional e correlation/contexto disponível;
4. consultar Auth Audit Logs para login e Logs para API/Postgres;
5. consultar `auditoria`/`eventos_auditoria_financeira` em leitura;
6. não corrigir linhas financeiras manualmente;
7. escalar com evidência e registrar resolução.

## 14. Segurança pré-GO

- Security Advisor: 0 erros, 61 warnings, 0 sugestões informativas.
- Performance Advisor: 0 erros, 5 warnings, 77 sugestões.
- RLS: habilitada em todas as tabelas públicas.
- `db lint`: zero erros; três warnings de cast no dashboard e um de variável não lida, já conhecidos.
- `npm audit --omit=dev`: zero vulnerabilidades.
- `SECURITY DEFINER`: 69 funções de aplicação; 4 sem `search_path` fixo e 7 herdando `EXECUTE` de `PUBLIC`.
- Os warnings de grants/search path são históricos e protegidos por checagens internas/RLS nos fluxos homologados, mas devem ser endurecidos em migration separada antes de exposição ampla à internet. Não foram alterados nesta fase.
- Varredura do bundle: zero segredo privado e zero source maps.

## 15. Roteiro de smoke manual

Executar no domínio final, com dados sintéticos controlados e caixa novo de uma clínica liberada.

### Proprietária

1. Entrar com seu e-mail; esperar Home e nome da clínica. Não deve aparecer mensagem de banco.
2. Alternar entre clínicas; esperar dados correspondentes. Dados da clínica anterior não podem permanecer.
3. Abrir Equipe; confirmar profissional, preço e clínica. Não usar UUID.
4. Abrir Financeiro; conferir Painel, Caixa, Estornos, Repasses, Fiscal e Relatórios. Não deve aparecer ação reservada à recepção como se já tivesse ocorrido.
5. Sair e atualizar a página; a tela protegida não deve permanecer aberta.

### Recepção

1. Entrar e confirmar somente a clínica autorizada.
2. Abrir Agenda, cadastrar paciente sintético controlado e criar consulta.
3. Confirmar que não há Prontuário, painel gerencial ou alteração de preço.
4. Em clínica liberada, abrir Caixa com valor combinado; receber a consulta e conferir resultado.
5. Solicitar estorno; não deve existir botão para aprovar/efetivar.
6. Sair e entrar novamente; clínica e papel devem continuar corretos.

### Médico

1. Entrar e confirmar Agenda/Prontuário e próprio Financeiro.
2. Não deve visualizar Caixa, Estornos administrativos, outros médicos ou outras clínicas.
3. Iniciar atendimento sintético, salvar rascunho e finalizar.
4. Reabrir e confirmar que o registro finalizado não pode ser reescrito; adendo deve preservar histórico.
5. Conferir apenas seu painel/repasse e sair.

## 16. Checklist do primeiro dia

1. confirmar backup verificado e ponto de retorno;
2. confirmar GO assinado para uma única clínica piloto;
3. validar domínio, HTTPS, Auth, SMTP/recuperação e contas reais;
4. conferir clínica, profissionais, preços, percentual e Agenda;
5. confirmar que não existe caixa legado aberto na clínica piloto;
6. proprietária e recepção validam seus acessos;
7. abrir Caixa novo com valor contado e dupla conferência;
8. registrar primeiro atendimento e recebimento real acompanhado;
9. conferir Caixa, auditoria e visibilidade do médico;
10. fechar/aprovar Caixa conforme regra;
11. gerar backup/verificação posterior e registrar incidente zero ou ocorrido;
12. somente então considerar ampliar o piloto.

## 17. Se algo der errado no primeiro dia

Parar imediatamente novas operações quando houver acesso cruzado de clínica, autenticação indisponível, divergência financeira inexplicada, perda de registro clínico ou indisponibilidade sem recuperação.

Não apagar, editar diretamente ou duplicar pagamentos/estornos/fechamentos. Preservar sessão, horário, usuário, clínica, screenshots e logs. Bloquear novas entradas no fluxo afetado, manter dados existentes, acionar o responsável técnico e decidir entre correção homologada ou restauração no ambiente apropriado. Retomar somente após reconciliação e novo smoke.

## 18. Plano de limpeza controlada — NÃO EXECUTAR

Ordem futura, após backup verificado e aprovação nominal:

1. congelar o ambiente;
2. remover os dois agendamentos comprovadamente ligados às fixtures;
3. remover os três pacientes comprovadamente sintéticos;
4. revisar dependências do profissional sintético e remover seus vínculos onde autorizado;
5. remover/desativar as contas Auth sintéticas somente depois de resolver o operador do caixa legado;
6. preservar clínica inativa, auditoria, migrations, configurações e todo o caixa legado;
7. reconciliar contagens e executar smoke.

Cada futura instrução de exclusão deve listar tabela, predicado por identificadores previamente revisados, contagem esperada, dependências, responsável, backup e validação pós-execução. Não usar correspondência apenas por nome. Nenhum `DELETE` foi preparado para execução automática nesta fase.

## 19. Plano de cutover futuro

1. congelar código e mudanças de configuração;
2. executar e verificar backup lógico fora do Git;
3. ensaiar restore/recovery em ambiente isolado;
4. aprovar matriz e limpeza com a responsável;
5. executar limpeza autorizada e reconciliar dados;
6. criar/configurar usuários reais e restringir signup;
7. configurar clínicas, profissionais, preços, percentuais e alertas;
8. resolver caixa legado da clínica piloto;
9. configurar deploy, Auth URLs, SMTP e domínio;
10. executar smoke por papel;
11. abrir uma clínica piloto;
12. monitorar e reconciliar o primeiro dia.

## 20. GO / NO-GO por área

| Área | Estado | Motivo |
|---|---|---|
| Banco | GO COM RESSALVA | saudável e homologado; fixtures aguardam limpeza |
| Backup | NO-GO | Free sem automático; dump lógico não gerado |
| Restore | NO-GO | documentado, não ensaiado |
| Auth | NO-GO | localhost, sem redirect/deploy e smoke real pendente |
| Proprietária | GO COM RESSALVA | conta provável real requer confirmação |
| Recepção | NO-GO | somente contas sintéticas nas clínicas ativas |
| Médico | NO-GO | conta/profissional sintéticos e vínculo incompatível em Ipupiara |
| Clínicas | NO-GO | cadastros operacionais incompletos |
| Pacientes | NO-GO | todos são fixtures; carga real não preparada |
| Profissionais | NO-GO | único profissional é sintético |
| Agenda | GO COM RESSALVA | fluxo pronto; fixtures históricas aguardam limpeza |
| Prontuário | GO COM RESSALVA | vazio e protegido; smoke real pendente |
| Financeiro | GO COM RESSALVA | novo domínio limpo; depende do caixa/backup |
| Fiscal interno | GO | workflow interno homologado |
| Fiscal externo | NO-GO | provider não definido; não bloqueia clínica sem emissão externa |
| Relatórios | GO COM RESSALVA | homologados; dados reais inexistentes |
| Storage | NÃO APLICÁVEL | sem buckets/objetos |
| Deploy | NO-GO | inexistente/não definido |
| Segurança | GO COM RESSALVA | zero erros nos Advisors; warnings históricos a endurecer |
| Caixa legado | NO-GO | sessão aberta em Brotas sem estratégia aprovada |

## 21. Decisões humanas restantes

1. escolher clínica piloto;
2. aprovar plano/capacidade de backup e ambiente de restore;
3. escolher deploy/domínio e política de SMTP;
4. confirmar proprietária e indicar contas reais de recepção/médico;
5. aprovar preços, percentuais, alertas e dados fiscais por clínica;
6. escolher estratégia de transição do caixa legado;
7. aprovar a lista de fixtures a remover;
8. decidir se emissão fiscal externa é requisito do piloto;
9. definir RPO/RTO e responsável por incidentes.

**Conclusão:** **FASE 12 — AINDA NÃO PRONTO PARA CUTOVER**.

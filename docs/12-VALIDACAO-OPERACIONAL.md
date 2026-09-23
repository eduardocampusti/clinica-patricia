# CLÍNICA PATRÍCIA — FASE 11 — VALIDAÇÃO OPERACIONAL

**Status:** CONCLUÍDA EM 23/09/2026

**Branch:** `codex/checkpoint-local-2026-08-14`

**Marco anterior preservado:** `ddc47bc` — FASE 10 concluída

## 1. Escopo e decisão

A FASE 11 validou o sistema como produto operacional sem autorizar produção, limpeza do banco, carga de pacientes reais, uso financeiro real ou liberação ampla de clínicas. A decisão é **PRONTO PARA PREPARAÇÃO DE ENTRADA EM OPERAÇÃO**, com ressalvas e etapas controladas descritas abaixo. Não significa “produção liberada”.

## 2. Estado recuperado e inventário

- HEAD inicial `ddc47bc`, sincronizado com o upstream.
- Alterações locais preexistentes em Login, Prontuário, Agenda, configuração e documentos foram preservadas e não incorporadas aos commits da fase.
- O aplicativo usa navegação lógica por estado, sem rotas de URL.
- Operacionais: Home, Agenda, Pacientes, Equipe/Cadastros, Prontuário e Financeiro.
- Placeholders de Atendimentos, Relatórios globais, Especialidades globais e Configurações foram removidos da navegação; o legado financeiro permanece no repositório, mas fora do caminho oficial.

## 3. Auditoria por área

### Autenticação

O carregamento de sessão continua bloqueando a árvore protegida; credencial inválida recebe mensagem funcional; logout limpa o estado da aplicação. O teste sintético foi aprovado em desktop, tablet e mobile. Restauração, expiração, usuário inativo e logout com identidade real precisam de smoke manual com contas controladas antes da liberação.

### Papéis e navegação

A navegação agora é derivada do papel: proprietária recebe gestão completa; recepção recebe operações de atendimento sem Prontuário/Painel gerencial; médico recebe Agenda, Prontuário e seu universo financeiro. Placeholders e controles sem ação real foram retirados. RLS/RPC continuam sendo a autoridade, independentemente do botão visível.

### Troca de clínica e concorrência

O hook de clínicas reage à mudança real da sessão. Pacientes e Agenda descartam respostas da clínica anterior. A troca rápida A → B foi aprovada em 1440×1000, 820×1180 e 390×844; a clínica A não reapareceu após a troca.

### Home

Usa próximo paciente real e estados vazios. Não reintroduz números financeiros fictícios; indicadores oficiais permanecem no Financeiro.

### Pacientes

Listagem, busca por nome/últimos dígitos do CPF, cadastro e estados vazios estão disponíveis. O CPF deixou de ser exibido integralmente. A listagem foi protegida contra resposta obsoleta na troca de clínica. Edição ainda não possui fluxo aprovado/implementado e não foi inventada nesta fase; duplicidade continua dependente da regra do banco.

### Profissionais

Listagem, vínculo por clínica, valores, horários, serviços, inatividade e ausência de configuração permanecem no cadastro existente. Alteração de valores é restrita à proprietária na interface, sem substituir a autorização do banco.

### Agenda

Permanece uma agenda diária; visão semanal não existe. Foram separados carregamento, vazio e erro, com retry funcional. Respostas obsoletas de clínica/data são descartadas e a troca de clínica fecha contexto/modal anterior. O smoke sintético de concorrência passou nos três viewports. As mudanças locais preexistentes de início de Prontuário ficaram fora do commit desta fase.

### Financeiro

- Recebimento: 48/48 cenários Playwright aprovados em desktop/tablet/mobile, cobrindo dinheiro, PIX, cartão/split, incompleto, excedente, caixa ausente/legado, retry, duplo clique, foco e papéis.
- Caixa: 18/18 cenários aprovados em desktop/mobile, incluindo abertura, resumo, suprimento, sangria, fechamento, divergência, devolução e transição de papel.
- Estornos: 10/10 cenários aprovados em desktop/mobile; recepção solicita, proprietária revisa/efetiva e médico não opera.
- Repasses, Fiscal, Painéis e Relatórios preservam a homologação automatizada da FASE 10. A linguagem deixa explícito que transferência ocorre fora do sistema e que o Fiscal registra solicitações internas, não emissão externa.
- Testes unitários/contratuais: 15/15. O harness integrado real passou em transação única com `ROLLBACK`.

### Prontuário

Smoke estrutural e build aprovados; o acesso visual é do profissional. Há alterações locais preexistentes em evolução, preservadas fora dos commits desta fase. Leitura/escrita/finalização autenticadas e isolamento com contas reais permanecem como smoke manual obrigatório antes do piloto.

## 4. UX, responsividade e acessibilidade

Os fluxos sintéticos principais foram exercitados em 1440×1000, 820×1180 e 390×844. A navegação recebeu nomes acessíveis, `aria-current`, alvos mínimos de toque e rótulo de papel correto. Modais financeiros cobrem foco, retorno de foco e bloqueio durante mutações críticas. Permanecem como melhorias não bloqueantes: validar teclado/lector de tela no aplicativo completo, revisar o recorte da imagem local de Login em desktop e reduzir o bundle inicial acima de 500 kB.

## 5. Segurança e Supabase

Projeto confirmado: `xftnkusbyqzyvzrovroj`. O roteiro `database/tests/financeiro/20260923_fase10_integrado_final.sql` passou com `ROLLBACK`, cobrindo papéis, outra clínica, usuário sem autoridade, `anon`, idempotência e transições críticas. Nenhuma fixture persistiu e nenhuma migration foi criada/aplicada.

Contagens antes/depois, idênticas:

| Objeto | Antes | Depois |
|---|---:|---:|
| recebimentos | 0 | 0 |
| pagamentos | 0 | 0 |
| estornos | 0 | 0 |
| repasses | 0 | 0 |
| documentos fiscais | 0 | 0 |
| movimentos | 0 | 0 |
| sangrias | 0 | 0 |
| fechamentos | 0 | 0 |
| sessões | 1 | 1 |

Última migration: `20260922181438_financeiro_fase10c_resumo_caixa`. Caixa legado preservado: aberto, abertura R$ 150,50, duas entradas, total R$ 1.000,00.

## 6. Dependências, qualidade e evidências

- `nanoid` transitivo atualizado de 3.3.16 para 3.3.19, dentro da cadeia compatível PostCSS/Vite.
- `npm audit --omit=dev`: zero vulnerabilidades após a atualização.
- Build: aprovado. Lint: zero erros e um warning preexistente de Fast Refresh em `ThemeProvider`.
- Evidências sintéticas sem dados pessoais estão em `scratch/fase11-operacional/` e não fazem parte do Git.
- O processo Vite/Playwright reteve o teardown no Windows em algumas suítes; ele foi interrompido somente depois de todos os casos reportarem sucesso.

## 7. Checklist de prontidão

| Área | Estado | Ressalva |
|---|---|---|
| Login | APROVADO COM RESSALVA | Smoke autenticado real pendente. |
| Papéis | APROVADO | Navegação e backend permanecem em camadas independentes. |
| Multi-clínica | APROVADO | Concorrência de Pacientes/Agenda coberta. |
| Pacientes | APROVADO COM RESSALVA | Edição não implementada; exige contrato específico. |
| Profissionais | APROVADO COM RESSALVA | Smoke autenticado de edição pendente. |
| Agenda | APROVADO COM RESSALVA | Sem visão semanal; smoke real pendente. |
| Recebimento | APROVADO | Fluxo operacional sintético completo. |
| Caixa | APROVADO COM RESSALVA | Transição do caixa legado deve ser controlada. |
| Estornos | APROVADO | Regra final validada. |
| Repasses | APROVADO COM RESSALVA | Transferência externa não é executada pelo sistema. |
| Fiscal interno | APROVADO COM RESSALVA | Provider/API externo pendente. |
| Relatórios | APROVADO COM RESSALVA | Smoke autenticado e impressão real pendentes. |
| Prontuário | APROVADO COM RESSALVA | Smoke autenticado obrigatório antes do piloto. |
| Mobile | APROVADO COM RESSALVA | Principais fluxos cobertos; revisar Login real. |
| Acessibilidade | APROVADO COM RESSALVA | Validação manual com tecnologia assistiva pendente. |
| Segurança | APROVADO | Harness real com `ROLLBACK`, papéis e segregação. |
| Backup/recovery | PENDENTE | Executar ensaio controlado do runbook antes de produção. |
| Dados reais | PENDENTE | Carga e limpeza exigem plano posterior autorizado. |
| Pendências externas | PENDENTE | Fiscal externo, contas de smoke e transição do legado. |

## 8. Pendências para o piloto controlado

1. Executar smoke autenticado com contas dedicadas de proprietária, recepção e médico em duas clínicas.
2. Ensaiar backup/restauração e registrar RTO/RPO.
3. Definir tratamento do caixa legado antes da primeira operação financeira real.
4. Aprovar contrato funcional de edição de pacientes.
5. Definir provider fiscal; até lá, manter somente o workflow interno.
6. Planejar saneamento/carga de dados e abertura gradual, sem limpeza automática.

**Conclusão:** FASE 11 — VALIDAÇÃO OPERACIONAL CONCLUÍDA.

**Recomendação:** **PRONTO PARA PREPARAÇÃO DE ENTRADA EM OPERAÇÃO**, não para entrada em produção automática.

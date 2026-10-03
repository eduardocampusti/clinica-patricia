# CLÍNICA PATRÍCIA — FASE 13 — REMEDIAÇÃO AUTÔNOMA PRÉ-CUTOVER

**Data:** 23/09/2026

**Projeto:** `xftnkusbyqzyvzrovroj`

**Branch:** `codex/checkpoint-local-2026-08-14`

**Documento anterior:** `13-PREPARACAO-ENTRADA-OPERACAO.md`

## 1. Resultado executivo

A FASE 13 resolveu os bloqueadores técnicos de backup, restore, smoke autenticado, cadastro público e exposição indevida de funções `SECURITY DEFINER`. O sistema possui build reproduzível, fallback de SPA e headers de segurança preparados.

O cutover real **não foi executado**. Permanecem decisões/dados humanos e serviços externos: clínica piloto, pessoas reais, destino de deploy/HTTPS, URL operacional, política de email e eventual provedor fiscal. O caixa legado foi preservado.

## 2. Backup lógico comprovado

PostgreSQL 17.11 portátil para Windows x64 foi obtido do pacote oficial EnterpriseDB/PostgreSQL e mantido somente em `scratch/tools/`, sem serviço Windows nem alteração global de `PATH`.

- pasta: `D:\PROJETOS SAAS\CLINICA PATRICIA\scratch\backups\20260923-110710`;
- completo: `clinica-patricia-full.dump`, 955.407 bytes, SHA-256 `85F107F9AF853E49A924E3B82796D6933327E44395C2DA9C6843133DC8E3C7CD`;
- restaurável: `clinica-patricia-app.dump`, 557.893 bytes, SHA-256 `FF6FC5B9411107ACA01724A79EEEE798854790337056233BD0BC5E2C34152C39`;
- formato PostgreSQL custom, `pg_dump 17.11`;
- schemas restauráveis: `public`, `private`, `supabase_migrations`;
- dump completo preserva os schemas gerenciados para recuperação assistida;
- nenhum dump, password ou token foi versionado.

A credencial temporária oficial da Supabase CLI permaneceu somente em memória. A reprodução do `SET ROLE postgres` indicado pela CLI resolveu as permissões sem revelar segredo. `pg_restore --list` validou 698 entradas, incluindo tabelas/dados, funções, tipos, constraints, triggers, policies, RLS, Financeiro, Prontuário e migrations.

## 3. Restore ensaiado

PostgreSQL 17.11 foi inicializado em cluster temporário sob `scratch/`, porta local `55439`, sem Docker e sem serviço permanente. O dump foi restaurado com `--exit-on-error`; o servidor foi encerrado e o cluster removido.

| Objeto | Quantidade |
|---|---:|
| schemas da aplicação | 3 |
| tabelas | 37 |
| funções | 80 |
| constraints | 268 |
| enums | 10 |
| policies | 63 |
| tabelas com RLS | 36 |
| migrations no backup-base | 17 |

| Conjunto | Origem | Restore |
|---|---:|---:|
| clínicas | 3 | 3 |
| usuários públicos | 5 | 5 |
| vínculos usuário-clínica | 8 | 8 |
| profissionais | 1 | 1 |
| vínculos profissional-clínica | 2 | 2 |
| pacientes | 3 | 3 |
| agendamentos | 2 | 2 |
| atendimentos/documentos clínicos | 0/0 | 0/0 |
| sessões/entradas de caixa | 1/2 | 1/2 |
| recebimentos/movimentos/repasses | 0/0/0 | 0/0/0 |
| auditoria | 57 | 57 |

**RESTORE ENSAIADO COM SUCESSO.** RTO técnico observado pelo script: **9,7 segundos** neste computador; não é SLA comercial.

## 4. Rotina de backup e recuperação

- `scripts/backup-supabase.ps1`: dumps completo/aplicação, UUIDs mínimos de Auth, timestamp, SHA-256 e metadata; senha somente por `SUPABASE_DB_PASSWORD` ou prompt seguro;
- `scripts/verify-backup.ps1`: tamanho, hashes e inventário custom;
- `scripts/test-restore.ps1`: cluster isolado, restore, validação, parada e remoção segura.

Runbook para leigo:

1. obter no painel Supabase host/porta/usuário e a senha sem gravá-la em arquivo;
2. manter PostgreSQL 17 portátil em `scratch/tools/`;
3. executar `scripts/backup-supabase.ps1` com os dados de conexão;
4. executar `scripts/verify-backup.ps1 -BackupDir <pasta>`;
5. executar `scripts/test-restore.ps1 -BackupDir <pasta>`;
6. conservar cópia restrita fora do computador do deploy;
7. nunca adicionar `scratch/backups/` ao Git.

RPO sugerido no plano Free: backup lógico diário e backup extra antes de migration, limpeza, cutover ou alteração estrutural. PITR pago permanece opcional.

## 5. Auth e contas temporárias

O sistema é interno e a aplicação não oferece cadastro público. `Allow new users to sign up` foi desabilitado e confirmado após reload. Email continua habilitado e com confirmação; anonymous sign-in e manual linking permanecem desabilitados. Login, sessão após reload e logout foram comprovados.

Site URL continua em localhost porque não há deploy/domínio aprovado. A recuperação na interface está desabilitada; até haver fluxo aprovado, convite/reset deve usar o mecanismo administrativo oficial.

Três contas efêmeras foram criadas via API Admin oficial, com emails sintéticos e senhas aleatórias somente em memória. Seus vínculos mínimos foram removidos junto com as contas. Verificação remota final: zero usuários e zero registros residuais da FASE 13.

## 6. Smoke autenticado real

Aplicação real ligada ao Supabase real, em Chromium local do Playwright:

- proprietária: login, sessão, clínica, Home, Agenda, Financeiro, Caixa, Estornos, Repasses, Fiscal, Painel, Relatórios e logout — **PASSOU**;
- recepção: login, sessão, clínica, Agenda, Pacientes, Caixa, Estornos, Fiscal, ausência de Prontuário/áreas gerenciais e logout — **PASSOU**;
- médico: login, sessão, clínicas, Agenda, Prontuário, Painel/Relatórios próprios, ausência de Caixa/gestão e logout — **PASSOU**.

Capturas sintéticas: `scratch/fase13-smoke/{proprietaria,recepcao,medico}.png`. Teste repetível: `npm run test:operacional:real`; credenciais entram somente por `SMOKE_*`.

## 7. Ranking técnico das clínicas

1. **Ipupiara — MELHOR CANDIDATA TÉCNICA**: ativa, sem caixa legado e com recepção/papel médico. Falta profissional real e confirmar configurações/valores. O vínculo médico temporário funcionou e foi removido.
2. **Brotas**: ativa e mais completa, porém com caixa legado aberto e entradas históricas.
3. **Ibitiara**: inativa e baseada em fixture; não é candidata sem reativação deliberada e dados reais.

A escolha final permanece humana.

## 8. Dados mínimos e contas reais

Obrigatórios para operar: clínica ativa; identidade básica válida; proprietária e recepção reais; médico real com registro, usuário e vínculos; horários, duração, preço e percentual aprovados. CNPJ/dados fiscais, certificado e provider são necessários somente para emissão externa.

Fluxo: convite/API Admin oficial; confirmação; `usuarios`; papel/clínica; para médico, `profissionais` e `profissionais_clinicas`; teste de login/reset; só então desativar substituídos. Fixtures nunca viram contas finais.

## 9. Fixtures e limpeza

As quatro contas sintéticas anteriores, o profissional, três pacientes e dois agendamentos permanecem. A recepção sintética de Brotas abriu o caixa legado; uma paciente fixture é referenciada pelas duas entradas; o médico de Brotas está ligado ao profissional/agenda. A limpeza ampla não satisfaz “nenhuma ligação com caixa legado”.

**Nenhuma fixture preexistente foi removida.** `database/operations/pre_go_live_cleanup.sql` limita-se a um paciente isolado e dois usuários sem profissional/caixa, com IDs, contagens, guards, confirmação e `ROLLBACK`. Os demais pacientes têm dependências em agenda, lista de espera ou caixa legado. Auth exige API Admin. O remoto não executou esse script.

## 10. Caixa legado — opções

### Opção A — encerrar Brotas administrativamente

Novo backup/restore; janela sem operação; conferência da abertura de R$ 150,50 e duas entradas totalizando R$ 1.000,00; responsável real, valor contado e justificativa; fluxo/RPC homologado ou SQL legado revisado em transação; auditoria antes/depois. Antes do commit, rollback transacional; depois, somente evento corretivo auditado.

### Opção B — isolar Brotas e pilotar Ipupiara

Manter legado imutável; impedir novos recebimentos nessa sessão; cadastrar pessoas/profissional reais em Ipupiara; abrir nova operação somente ali; resolver Brotas depois. Rollback: desativar piloto antes de dados reais ou encerrar apenas o novo caixa pelo fluxo normal.

## 11. Deploy, HTTPS e email

Não há provider, credencial, domínio ou workflow conectado; nenhuma conta externa foi criada.

Preparação concluída: build SPA; `public/_redirects` para fallback; `public/_headers` com cache e headers básicos; variáveis `VITE_SUPABASE_URL` e chave pública. Nunca publicar service role, password ou token. Após escolher deploy: configurar URL HTTPS no Auth, testar login/reload/logout e liberar usuários reais.

SMTP padrão serve para testes limitados, não para convite/recuperação operacional confiável. Login normal de usuários ativos não depende de email a cada acesso.

## 12. Fiscal, despesas e escopo

- Fiscal interno: **GO**;
- fiscal externo: bloqueado externamente até provider/dados, opcional no piloto sem emissão;
- despesas administrativas: pós-piloto; não bloqueiam Agenda, recebimento, Caixa, repasse ou Prontuário;
- PITR: opcional pago; não contratado.

## 13. Segurança e advisors

Migration `20260923143456_fase13_hardening_security_definer.sql`, SHA-256 `0D45DFC398D5622B1DEC48B8F6245F9EC6271C395DD3613E425C5C12178B64AC`:

- fixou `search_path` de quatro funções históricas;
- retirou `PUBLIC`/`anon` de `cadastrar_profissional`, preservando `authenticated` e sua checagem de proprietária;
- retirou execução direta de clientes sobre `fn_auditoria`, que continua como trigger;
- aplicada uma vez e confirmada em `supabase_migrations`;
- `supabase db lint --linked --level error`: zero resultados.

Security Advisor: **0 erros, 54 warnings** (antes 61). Performance Advisor: **0 erros, 5 warnings, 70 sugestões**. Avisos restantes são históricos sem exploração crítica comprovada; não houve refactor em massa.

Validação final: `npm audit --omit=dev` com 0 vulnerabilidades; testes unitários Financeiro 15/15; smoke real 3/3; build de produção concluído; lint sem erros e com um warning histórico de Fast Refresh; `git diff --check` limpo. A suíte sintética antiga apresentou lentidão de navegação no harness após a atualização local do navegador; o cenário crítico isolado passou e o smoke real completo é a evidência operacional vigente.

## 14. Matriz GO/NO-GO

| Área | Estado | Observação |
|---|---|---|
| Backup/restore | GO | hashes, scripts, restore e contagens iguais |
| Auth técnico | GO COM RESSALVA | signup fechado; URL/SMTP dependem do deploy |
| Smokes por papel | GO | três papéis reais/autenticados |
| Financeiro novo | GO | zero sintético persistente |
| Prontuário/Agenda | GO | smoke e RLS reais |
| Brotas | NO-GO DIRETO | caixa legado exige decisão |
| Ipupiara | GO COM RESSALVA | melhor candidata; faltam pessoas/profissional reais |
| Ibitiara | NO-GO | inativa/fixtures |
| Deploy público | BLOQUEIO EXTERNO/HUMANO | provider/domínio ausentes |
| SMTP | GO COM RESSALVA | login funciona; convite/reset dependem de decisão |
| Fiscal interno | GO | sem emissão externa |
| Fiscal externo | OPCIONAL/EXTERNO | provider/dados ausentes |
| Despesas/PITR | PÓS-PILOTO | fora do piloto inicial |
| Limpeza | AGUARDA DECISÃO | relações com legado preservadas |

## 15. Lista única de informações/decisões humanas

1. escolher clínica piloto — recomendação técnica: Ipupiara;
2. fornecer nome/email de proprietária, recepção e médico(s) reais;
3. fornecer registro profissional e vínculos por clínica;
4. aprovar horários, duração, preços e percentuais;
5. escolher Opção A ou B para Brotas e responsável pelo encerramento;
6. autorizar ou não a limpeza das fixtures preservadas;
7. escolher provider de deploy e domínio/URL HTTPS;
8. definir SMTP para convites/recuperação;
9. fornecer CNPJ/dados fiscais se emissão externa entrar no piloto;
10. escolher provider fiscal/destino de pagamento somente se ativados.

## 16. Situação final

Todos os bloqueadores técnicos tratáveis com segurança foram resolvidos. Restam decisões/dados humanos ou integrações externas. O cutover real depende da clínica, pessoas reais e publicação HTTPS.

**FASE 13 — TECNICAMENTE PRONTO PARA CUTOVER**

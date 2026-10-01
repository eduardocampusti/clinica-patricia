# Equipe — checkpoint da primeira entrega

**Estado:** implementação local e homologação Supabase principal concluídas em 29/09/2026; cadastro e edição autenticados de Equipe disponíveis para perfis autorizados. Sem publicação de frontend em produção.

## Estado vigente — e-mails institucionais — 30/09/2026

Estado posterior01/10: aceite real recebido pelo titular e persistido confirmado por SELECT exato; mesmo Auth/convite, um acesso ativo. Correção local de Continuar: navegação efetiva e feedback imediato, evitando tela parada/cache de vínculos anteriores. Dois cenários sintéticos desktop/móvel aprovados; build/lint aprovados. Publicação/conferência pelo titular, login posterior, recuperação e limpeza continuam pendentes de evidência. Relatório23 atualizado; não alterados permissões, senhas ou banco.

Continuação01/10: titular informou ausência de parâmetro convite. Prova pública de rota com UUID fictício preservou query e exibiu senha, sem salvar; chamada publicada de envio conferida. Um único reenvio da mesma fixture, pela sessão proprietária pública, aceito pelo serviço; leitura confirmou tentativas2, mesma conta/convite e zero acesso ativo. Não declarar causa final nem aceite; titular deve abrir mensagem mais recente em sessão separada e definir senha pessoalmente. Sem código/deploy/configuração/conta nova; limpeza após ensaio. Relatório23 contém evidência.

Atualização posterior: recebimento, remetente institucional/nome conjunto e conteúdo Brotas em português confirmados por titular/captura. Retorno ao login sem definição de senha em investigação. Conta sintética confirmou e-mail; convite permanece enviado/sem aceite/não expirado. Logs mostram verificação/login seguida de logout e recusas posteriores de link inválido/expirado. Allowlist/construção de retorno remotas reconferidas, falta evidência da query da primeira navegação. Nenhum reenvio, alteração ou limpeza; não declarar fluxo concluído. Evidências no relatório23.

Continuação pública: recuperação da administradora recebida/concluída informada pelo titular e sessão pública Proprietário(a)/Brotas confirmada pelo agente. Novo ensaio institucional, distinto do22 encerrado: preflight zero conta/membro/convite do destinatário; fixture específica criada na interface pública; um convite aceito pelo serviço, statusenviado/tentativas1, conta não confirmada e zero acesso ativo. Papel previstoRecepção somente Brotas. Recebimento/aceite/login/recuperação sintética/limpeza ainda pendentes da participação do titular. IDs exatos/estado e evidências no relatório23, sem senhas/tokens. Nenhum reenvio, mudança de código/SMTP ou repetição de build/testes.

SMTP personalizado habilitado após salvamento pelo titular; três templates profissionais efetivamente aplicados e conferidos na prévia remota sem texto inglês anterior. Remetente/usuário aprovados administracao@clinicabrotas.com.br, nome conjunto, smtp.hostinger.com465; senha não consultada. Retornos Auth públicos e bases Edge por clínica configurados preservando local. Recuperação implementada/publicada no commit4c89c13, builds completed nas duas aplicações e telas públicas conferidas; quatro testes sintéticos/build/lint aprovados. Não alterados cadastro de Equipe, permissões ou dados preexistentes. Relatório23 separa configuração salva de entrega real.

Novo ensaio institucional autorizado ainda não enviado: Auth buscado pelo endereço de teste retornou zero contas; membro/conflito deve ser conferido na aplicação após login normal da proprietária, sessão ainda indisponível. Nenhuma fixture, senha ou limpeza nesta execução; auditoria preservada. O ensaio22 encerrado permanece preservado. Login/F5 autenticado público e recebimento/aceite/recuperação real continuam pendentes de participação do titular. Aplicação local correta3000 disponível.

## Histórico — aceite e preparação de e-mails — 30/09/2026

Retomada exclusiva de e-mails: relatório23 complementado, texto exato do convite e prévias finais das três identidades conferidos; originais preservados. Nenhum template remoto aplicado: painel Free/serviço padrão mantém Source/Save desabilitados, oferecendo envio próprio ou Pro. Sem contratação/SMTP/DNS/contas ou repetição do ensaio. Gerador/check sintático e móvel390px aprovados; capturas em evidencias-emails.

Encerramento posterior: recusa de Ipupiara comprovada pela captura do titular; papel somente Recepção/Brotas confirmado por consulta, sem novo ensaio administrativo comum. Limpeza concluída pelos IDs exatos após preflight: zero contas/sessões/vínculos/idempotências/alvos, dois eventos de auditoria preservados. Relatório22 atualizado; captura sensível não armazenada. Aplicação3000 HTTP200. Sem alteração de código/schema; templates remotos continuam pendentes conforme relatório23.

Registro anterior à captura e limpeza:

Relatório 22: aceite/conta confirmados por leitura, ficha da proprietária com Recepção somente Brotas e novo login confirmado pelo titular. Negativas na sessão comum e limpeza pendentes. Relatório 23: templates locais portugueses preparados, NÃO aplicados por bloqueio Free/SMTP padrão; contexto visual publicado na Edge Function versão 5/JWT obrigatório. Build/lint e 7 testes dirigidos aprovados. Porta atual 3000. Nenhuma migration, contratação ou novo envio.

## Histórico — convite real aguardando titular — 30/09/2026

A base `http://127.0.0.1:3000/acesso/brotas` foi conferida contra o código: a Edge Function acrescenta `?convite=<UUID>` e `App.tsx` encaminha uma sessão autenticada para `ConviteEquipe`, onde o titular pode definir a própria senha e aceitar. O secret correspondente e a URL exata do Auth foram configurados sem remover configurações existentes.

Pela sessão real da proprietária, uma fixture sintética de recepção vinculada somente a Brotas foi criada e recebeu um único convite no endereço expressamente autorizado. A interface mostrou “Convite pendente”; consulta direta confirmou convite `enviado`, conta Auth não confirmada e zero acesso clínico ativo antes do aceite. Recebimento, senha, aceite, novo login, isolamento final e limpeza ainda não foram executados. Relatório: `22-CONVITE-REAL-E-ACEITE.md`.

## Implementado localmente

- Aba inicial “Equipe & acessos” no menu Equipe/Cadastros, com lista, busca, filtros por clínica e tipo, estados de carregamento/erro/vazio e indicação de acesso.
- Ações “Novo membro”, “Ver cadastro” e “Editar”; criação e edição usam o mesmo formulário-base.
- Campos por tipo de funcionário, CPF opcional até decisão funcional, telefone, e-mail de contato, profissão, conselho/registro/UF, especialidade e vínculos autorizados.
- Confirmações visíveis, bloqueio de envio duplicado e preservação do preenchimento em erro.
- Modo de compatibilidade: antes da migration, profissionais atuais permanecem visíveis e mutações ampliadas ficam bloqueadas.
- Migration aditiva `20260928153000_equipe_cadastro_edicao.sql` aplicada no projeto autorizado `xftnkusbyqzyvzrovroj`, com tabelas próprias, migração referencial de profissionais, RLS, RPCs de lista/detalhe/salvamento, autorização por clínica, CPF protegido e auditoria sem CPF em claro.

## Verificado

- `npm run build`: aprovado (TypeScript e Vite).
- `npm run lint`: aprovado, com apenas o aviso histórico de Fast Refresh em `ThemeProvider.tsx`.
- Testes unitários de Equipe: 6/6 aprovados; lint aprovado com um aviso histórico; build aprovado.
- Servidor Vite iniciado em `http://127.0.0.1:5173/`; entrada local por `/acesso/brotas` ou `/acesso/ipupiara`.
- Migration aplicada em PostgreSQL 17.11 portátil isolado, restaurado do backup local, com dados fictícios. Foram validados catálogo, grants, `search_path`, chamadas como `authenticated`, negativas por perfil, idempotência, CPF, duas clínicas, vínculo inativo, rota legada, auditoria e persistência após nova conexão.
- O verificador geral de integridade foi executado, mas parou em `storage.buckets`, ausente no backup que contém apenas os schemas da aplicação. Essa limitação não invalida os testes de PostgreSQL executados, mas impede afirmar homologação completa dos serviços Supabase/Auth/Storage/Vault.

## Próxima etapa controlada (histórica)

Revisar o relatório `10-CORRECOES-REVISAO-INDEPENDENTE.md`; esta etapa foi superada pela autorização explícita registrada no relatório 17.

## Revisão de segurança — 28/09/2026

A revisão estática corrigiu obrigatoriedade indevida de CPF, exposição direta de ciphertext/hash, classificação presumida do legado, autoria histórica inventada, divergência de CPF entre Equipe/Profissionais e ausência de controle de concorrência. Não foi encontrado PostgreSQL isolado neste computador; por isso, a homologação real continua pendente e as gravações permanecem bloqueadas. Relatório: `09-REVISAO-HOMOLOGACAO-MIGRATION.md`.

## Correções independentes e homologação isolada — 28/09/2026

Os achados A1–A12 foram confrontados com o código e corrigidos ou delimitados. O PostgreSQL portátil já existente foi localizado e usado em instância descartável nas portas locais 55440/55441, sem Docker e sem conexão administrativa com o Supabase principal. A instância foi encerrada após os testes. Relatório vigente: `10-CORRECOES-REVISAO-INDEPENDENTE.md`.

## Validação pontual B1–B3 — 28/09/2026

- B1: contrato JSON da RPC endurecido antes da extração, com tipos e nulos explícitos também no TypeScript; entradas de tipo indevido foram rejeitadas.
- B2: UF passou a fazer parte da identidade do conselho no legado e na Equipe; BA/SP coexistem, duplicidade na mesma UF é impedida e atualização legada de nome preserva a UF.
- B3: policy global impede edição por proprietária parcial e a ordem de locks foi uniformizada. Duas sessões `psql` reais concluíram operações concorrentes sem deadlock ou timeout e deixaram as projeções consistentes.
- O arquivo final exato da migration, SHA-256 `6263C5D5341853C5326792E84CD73F3244F07E5F17DBC17136A7DE727FF995B1`, foi aplicado do zero em PostgreSQL portátil 17.11 isolado.
- O principal foi comparado somente por leitura: possui as dependências anteriores, mas não possui objetos `equipe_*`, nem `profissionais.conselho_uf`, e ainda usa a constraint/policy legadas. Nenhuma escrita foi feita.
- `verificar-integridade.sql` foi executado no clone, mas parou ao alcançar `storage.buckets`, ausente no backup apenas da aplicação. Auth/PostgREST/Vault/Storage e o navegador autenticado ainda exigem Supabase de homologação autorizado.

Relatório vigente: `11-VALIDACAO-PONTUAL-E-INTEGRADA.md`. As gravações permanecem bloqueadas no principal.

## Preparação de homologação Supabase real — 28/09/2026

- O gatilho `equipe_sincronizar_profissional` foi corrigido para validar exatamente `NEW.conselho_uf`, que é o valor que o PostgreSQL persistirá; remoção explícita de UF agora não valida a UF antiga.
- Foram executados no clone portátil os casos de nome mantendo UF, troca/remoção isolada de UF, UFs BA/SP válidas, duplicata verdadeira, criação/vinculação pela RPC legada e atualização dos campos financeiros.
- A organização `Clinica médica` foi confirmada no painel como `FREE`, com um projeto; a documentação oficial indica limite de dois projetos ativos no Free. A criação foi tentada sem `--size` pago, mas a conta atingiu o limite global de dois projetos ativos. Nenhum projeto parcial foi criado e não houve cobrança.
- Não foram pausados/excluídos projetos de outra organização nem feito upgrade. Auth, PostgREST, Vault, Storage e o fluxo autenticado real continuam pendentes de um ambiente autorizado.

Relatório vigente: `12-HOMOLOGACAO-SUPABASE-REAL.md`. O principal segue somente para leitura e as gravações continuam bloqueadas.

## Continuidade local — 28/09/2026

Checkpoint registrado antes de qualquer alteração de interface desta etapa. A VPS permanece adiada, o Site Geovana deve permanecer ativo e não serão contratados serviços, alterados projetos remotos ou aplicadas migrations no Supabase principal.

O escopo desta continuidade é exclusivamente local: revisar os fluxos de Equipe & acessos nas clínicas Brotas e Ipupiara, melhorar formulários, mensagens, responsividade, foco/teclado e a comunicação do bloqueio de gravação enquanto a homologação Supabase completa não está disponível. Não haverá contas reais, convites, mudanças de acesso nem simulação de persistência em `localStorage`.

O relatório vivo, com evidências e a separação entre verificações locais e pendências de homologação completa, fica em `13-CHECKPOINT-E-CONTINUIDADE-LOCAL.md`.

## Continuidade local concluída — 29/09/2026

O checkpoint 13 foi executado. Formulário, validação próxima ao campo, foco, confirmação de descarte, estados de indisponibilidade, contexto Brotas/Ipupiara e rodapé responsivo foram ajustados sem alterar a migration ou o Supabase principal. O harness sintético passou em 9/9 cenários nas larguras desktop, tablet e mobile; build, lint e 7/7 testes determinísticos de Equipe também passaram.

Relatório final: `14-CONTINUIDADE-LOCAL-UX.md`. As gravações continuam bloqueadas até homologação Supabase completa; a porta local 5173 permanece disponível e o Site Geovana não foi alterado.

## Ficha de consulta do membro — 29/09/2026

A ação **Ver cadastro** foi evoluída para uma ficha somente leitura. A implementação reutiliza a RPC autorizada `equipe_detalhar` já usada pela edição quando a migration está disponível; não adiciona consulta de descriptografia de CPF, não cria cadastro paralelo e não altera Auth, RLS ou o banco principal.

- Identificação: nome, cargo/função, tipo, situação localizada no contexto consultado, contatos e CPF mascarado quando o serviço já o retorna.
- Dados profissionais: profissão, conselho, registro, UF e especialidade para profissionais de saúde; recepção/apoio recebem a mensagem de que esses campos não se aplicam.
- Clínicas: vínculos retornados para consulta; o contexto ativo é identificado e o acesso de outras clínicas não é presumido.
- Acesso: status efetivamente retornado pelo serviço, sem tratar e-mail de contato como prova de login.
- Estados de carregamento, erro compreensível, consulta detalhada indisponível e ausência de dados ficaram explícitos. O modo legado informa suas limitações.
- Token de requisição e limpeza ao trocar membro/clínica impedem que resposta antiga apareça na ficha atual. O `ModalBase` existente mantém foco, fechamento por Escape e uso em celular.

Verificações desta etapa: build, lint, 8/8 testes determinísticos de Equipe e 21/21 cenários Playwright sintéticos em desktop, tablet e mobile. O harness cobriu profissional de saúde, recepção, apoio, campos ausentes/indisponíveis, dois vínculos, acesso não confirmado, falha de leitura e troca rápida de membro/clínica. Os dados e respostas foram fictícios e interceptados; não são homologação Supabase.

O relatório detalhado está em `15-FICHA-MEMBRO-CONSULTA.md`. A aplicação normal continua sem liberar cadastro/edição no principal `xftnkusbyqzyvzrovroj`.

## Conferência autenticada da consulta — 29/09/2026

A conferência real foi registrada em `16-CONFERENCIA-AUTENTICADA-CONSULTA.md`. Com a sessão autorizada como proprietária, Brotas carregou o modo legado, exibiu um profissional existente e abriu/reabriu sua ficha somente leitura; Ipupiara apresentou estado vazio e a troca de clínica não manteve dados de Brotas. O servidor local 5173 respondeu nas duas entradas e nenhuma mutação foi chamada.

O relatório 15 foi ajustado para separar desenvolvimento/testes locais, conferência autenticada e homologação completa ainda não executada. O roteiro usa somente registros existentes; lista legada sem recepção/apoio não é defeito automático. As gravações permanecem bloqueadas e a homologação Supabase continua pendente.

## Aplicação e validação no Supabase atual — 29/09/2026

O usuário substituiu a exigência anterior de projeto separado por autorização explícita para aplicar a migration no projeto existente `Clinica Patrícia` (`xftnkusbyqzyvzrovroj`), sem contratar serviços, alterar planos ou tocar no Site Geovana. A decisão e o histórico estão detalhados em `17-APLICACAO-E-VALIDACAO-NO-SUPABASE-ATUAL.md`.

- SHA-256 conferido antes e depois: `F90E9278A46EC09DAE1A1F30B9B48AFC436B956AD42681946C358D7D503BB396`.
- Preflight: dependências presentes, nenhuma duplicidade conselho/registro impeditiva, somente a migration de Equipe pendente entre os objetos autorizados; a migration de Pacientes `20260925130000` continua pendente e não foi aplicada por não ser dependência.
- Backup lógico protegido fora do Git, com dados/estruturas/dependências/grants/policies/triggers/funções e hash verificados; restauração não foi simulada.
- Aplicação transacional do SQL concluída; catálogo confirmou `equipe_membros`, `equipe_membros_clinicas`, `equipe_idempotencia`, `profissionais.conselho_uf`, índices únicos, RLS, policies, funções `SECURITY DEFINER` com `search_path=''`, grants mínimos e triggers. O histórico remoto foi marcado como aplicado somente depois dessas confirmações.
- `supabase/tools/verificar-integridade.sql`: executado antes e depois da limpeza, sem erro; o resultado final registrou `qtd_pacientes=3`.
- Sessão autenticada de proprietária: médico criado/editado (UF e dois vínculos), recepção criada/editada e apoio criado/editado; ficha e lista confirmaram persistência após recarregar e em Brotas/Ipupiara. CPF ausente foi aceito sem criar valor fictício; CPF inválido foi rejeitado no campo.
- Negativas: usuário médico existente recebeu `42501` para lista, ficha e gravação e não teve leitura direta da tabela; proprietária sem vínculo recebeu `42501` para clínica inativa e payload com clínica não autorizada. Conflito de registro profissional foi rejeitado com `23505` sem resíduo.
- Auditoria confirmou as operações sem chave `cpf` em claro; campos protegidos não foram lidos para completar a tela.
- Os três membros sintéticos, o profissional e os vínculos foram removidos por UUIDs exatos após checagem de dependências zero; auditoria foi preservada. Contagens finais voltaram a profissionais=1, vínculos profissionais=2, membros de equipe=1, vínculos de equipe=2 e idempotências=0.

Estado operacional: cadastro/edição de Equipe **não estão mais bloqueados** para proprietária autorizada no Supabase atual. A entrada local continua em `http://127.0.0.1:5173/acesso/brotas` e `/acesso/ipupiara`; o servidor local não foi reiniciado nem alterado nesta rodada.

## Validação dirigida de CPF e preservação do backup — 29/09/2026

O relatório `18-VALIDACAO-CPF-E-PRESERVACAO-BACKUP.md` registra a validação real após a aplicação da migration. Nenhuma migration foi reaplicada e nenhum defeito concreto exigiu alteração de código.

- O backup anterior à migration foi copiado para `D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260929_EQUIPE_CPF_VALIDACAO\backup.json`, fora de `Temp` e do Git.
- Original, cópia e hash documentado conferem: `483329426102720E6F1276B3F2B1273776FB52A743C222E9A1CD827A601A240B`.
- A cópia permanente ficou com herança ACL desativada; restauração não foi executada e o snapshot não é backup completo do projeto.
- Profissional de saúde: CPF válido criado, ficha mascarada, telefone alterado preservando CPF, CPF corrigido e persistido após recarregar.
- Administrativo: CPF válido criado e depois removido pelo fluxo explícito; ficha confirmou `Não cadastrado`, preservando a opcionalidade.
- RPC com CPF inválido rejeitou com `22023` sem membro parcial; o teste SQL foi identificado como simulação sob `authenticated`, não como segunda sessão de navegador.
- Duplicidade de conselho/registro/UF rejeitada pela interface com `23505`, sem registro parcial.
- Limpeza por IDs exatos confirmou zero alvos, zero idempotências e cinco auditorias preservadas. Contagens finais: profissionais=1, vínculos profissionais=2, membros de Equipe=1, vínculos de Equipe=2, idempotências=0, auditoria=185.
- `supabase/tools/verificar-integridade.sql` executado após a limpeza, sem erro (`qtd_pacientes=3`).

O CPF continua opcional para Equipe e pacientes; nenhum valor completo foi registrado nesta documentação. A aplicação local permanece disponível em Brotas e Ipupiara.

## Gestão de acessos da Equipe — implementação local preparada — 29/09/2026

O cadastro e a edição de pessoas continuam preservados. Foi acrescentado localmente na ficha do membro um painel de acesso por clínica, com login somente quando confirmado pelo serviço, estados explícitos, convite de conta nova, vinculação de conta existente, papéis já previstos no sistema, concessão, suspensão, reativação, alteração de papel e reenvio com cooldown. O aceite usa sessão Auth, não expõe senha/token e mantém o cadastro da pessoa separado do vínculo de login.

A migration `20260929120000_equipe_gestao_acessos.sql` e a Edge Function `supabase/functions/equipe-acessos/index.ts` foram revisadas e estão no repositório, mas a tentativa de aplicação remota foi bloqueada pela proteção de execução antes de confirmação efetiva. Não foram considerados aplicados, nenhum convite foi enviado e nenhum projeto remoto foi alterado. Enquanto os objetos e a configuração segura de redirect não forem homologados, a interface mantém a gestão de acessos em estado indisponível; a migration de cadastro/edição anterior continua no estado registrado no relatório 18.

Build, lint e 8/8 testes determinísticos passaram. O harness de ficha com respostas sintéticas passou 5/5 no desktop e 5/5 no mobile. Relatório completo: `19-GESTAO-DE-ACESSOS.md`.

## Teste específico de CPF duplicado — 29/09/2026

O caso dirigido de duplicidade de CPF foi concluído pela sessão autenticada de proprietária no Supabase atual, sem reaplicar migration. Um funcionário administrativo sintético, sem conselho/registro/UF, foi criado com CPF válido; um segundo administrativo, com nome diferente, repetiu o CPF usando nova chave de idempotência. A RPC retornou `23505`, o primeiro cadastro permaneceu íntegro e o segundo não gerou membro nem idempotência.

Na primeira tentativa, a interface usou a mensagem genérica de CPF ou registro. Esse defeito de apresentação foi corrigido em `src/pages/cadastros/Equipe.tsx`, classificando os metadados técnicos internamente e exibindo `Já existe um funcionário cadastrado com este CPF.` sem revelar hash/CPF. O teste afetado foi repetido e confirmado com a mensagem específica. A duplicidade de conselho/registro/UF do relatório anterior continua sendo um caso distinto.

A limpeza removeu apenas os alvos sintéticos por UUID exato, preservando a auditoria. Verificação final: alvo e segundo cadastro inexistentes, idempotências `0`, profissionais `1`, vínculos profissionais `2`, Equipe `1`, vínculos de Equipe `2`, auditoria `186`; `verificar-integridade.sql` terminou sem erro. Build, lint e os 8 testes determinísticos de Equipe passaram. O relatório detalhado está em `18-VALIDACAO-CPF-E-PRESERVACAO-BACKUP.md`; o CPF continua opcional.

## Aplicação autorizada da gestão de acessos — 29/09/2026

Por autorização explícita do responsável, a migration `20260929120000_equipe_gestao_acessos.sql` foi aplicada somente no Supabase `xftnkusbyqzyvzrovroj` por SQL transacional; seu SHA-256 é `297593FF12A4CE621A5CB5DBD96955381E9705CB55D9D2B3C49C8DF2244F22D6`. O catálogo confirmou `equipe_acesso_convites`, 10 funções `SECURITY DEFINER` com `search_path=""`, RLS ativo, nenhum grant de tabela para `anon`/`authenticated` e 8 funções executáveis apenas por `service_role`. O histórico remoto `20260929120000` foi registrado como aplicado depois da verificação.

A Edge Function `equipe-acessos` foi publicada e está `ACTIVE`, versão 1, `verify_jwt=true`, bundle SHA `2005687d7aa63608efc...` (hash integral no relatório 19). Os nomes das variáveis built-in necessárias estão presentes sem exposição de valores. `EQUIPE_INVITE_REDIRECT_URL` não foi configurada porque ainda falta URL allowlisted confirmada e destinatário de teste autorizado; nenhum convite ou OTP foi enviado.

Com sessão autenticada de proprietária, Brotas carregou a lista e abriu a ficha do membro existente com conta Auth confirmada e acesso ativo. No registro sintético já existente, o papel foi alterado de Médico para Recepção, o acesso foi suspenso e reativado, e o papel Médico foi restaurado; a ficha foi reaberta depois e confirmou persistência do estado final. Ipupiara foi selecionada e apresentou estado vazio, sem dados antigos. Não foram enviados convites/OTP nem executadas negativas com perfil comum. Não houve registros temporários para remover; a auditoria das ações foi preservada.

Consulta agregada pós-testes, sem dados pessoais, confirmou 1 membro, 2 vínculos ativos, 6 acessos ativos, 0 convites e 0 idempotências; não restaram artefatos de ensaio.

O snapshot de metadados pré-migration está fora do Git em `D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260929_EQUIPE_ACESSOS_PRE\snapshot-metadados-20260929.json`, SHA-256 `A5D5D86F663A27671E500925ED794BAB802C746733FB7CABC4E15A362638B726`. A tentativa de proteger ACL/read-only foi recusada pelo Windows; a limitação está registrada no relatório 19. Build, lint, 8/8 testes determinísticos e Playwright sintético 15/15 em desktop, tablet e mobile permanecem aprovados, mas não substituem Auth/SMTP/RLS reais.

Estado: cadastro/edição de Equipe continuam disponíveis para proprietária autorizada. A leitura de gestão de acessos está instalada e conferida; o ciclo completo de convite/aceite e as negativas com perfis não proprietários continuam pendentes até haver redirect allowlisted e contas de teste autorizadas.

## Correções da versão publicada — 29/09/2026

O relatório `20-CORRECOES-GESTAO-DE-ACESSOS.md` registrou que a versão publicada ainda podia gravar durante `listar`, não sincronizava `profissionais.usuario_id`, usava `getUserByEmail` inexistente na SDK instalada, enviava antes de reservar cooldown e revelava escopo de clínicas fora da administradora. A migration aditiva `20260929190000_equipe_gestao_acessos_correcoes.sql` e a Edge Function corrigida foram preparadas localmente, com build/lint, 8/8 determinísticos, Playwright 15/15 e transpilação sintática aprovados.

O snapshot protegido dos vínculos está fora do Git em `D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260929_EQUIPE_ACESSOS_CORRECAO_PRE\snapshot-vinculos-papeis-20260929.json`, SHA-256 `9A502C91A9CE9D94B8022A59BB06E2A3750147E2BF589DE3DC84652094175D15`. A aplicação remota da nova migration foi recusada pelo controle automático por falta de autorização confiável específica para esta nova alteração; nenhum objeto ou dado remoto foi modificado e a função remota permanece na versão 1 anterior. A checagem Deno nativa também aguarda ambiente com `deno` instalado.

## Correções da gestão de acessos aplicadas — 30/09/2026

A pendência acima foi concluída após autorização específica. A migration aditiva `20260929190000_equipe_gestao_acessos_correcoes.sql`, SHA-256 `B3349A0441206375CD9CEE1B6F1188573D05D350ECB699786044077E3447B68A`, foi aplicada isoladamente no Supabase `xftnkusbyqzyvzrovroj` e registrada no histórico após o `COMMIT`. Nenhuma outra migration pendente foi aplicada.

O catálogo confirmou colunas de expiração/reserva, índices de conta única e funções corretivas `SECURITY DEFINER` com `search_path=""`; assinaturas antigas perderam execução e as novas permanecem somente para `service_role`. A Edge Function `equipe-acessos` foi publicada `ACTIVE`, versão 2, `verify_jwt=true`, bundle `c934334d45efdec28e9586e918151657b25a0281f0b45215331760e4facd2642`; chamada sem JWT retornou 401.

A interface autenticada de proprietária confirmou em Brotas o login sintético, a conta Auth confirmada e o acesso ativo sem criar convite/auditoria; Ipupiara permaneceu vazia e sem reaproveitar dados de Brotas. O ensaio remoto `20260930_gestao_acessos_integrada.sql`, executado em transação revertida, aprovou listagem sem gravação, recusa de usuário comum, papel/suspensão/reativação, isolamento entre clínicas, aceite confirmado/idempotente, sincronização Equipe/Profissionais, reserva exclusiva de reenvio e autobloqueio. Pós-rollback: membro `1`, vínculos ativos `2`, profissional com usuário `1`, convites `0`, idempotências `0`, duplicidades/divergências `0`.

`supabase/tools/verificar-integridade.sql`, build, lint, 8/8 testes determinísticos e 24/24 cenários Playwright de Equipe/ficha foram aprovados; permanece apenas o aviso histórico de Fast Refresh. A regressão encontrou e corrigiu o tratamento de resposta de acesso sem array de clínicas, que agora exibe indisponibilidade em vez de desmontar a ficha. O snapshot externo pré-alteração foi reconferido pelo SHA-256 documentado. Nenhum e-mail/OTP foi enviado: `EQUIPE_INVITE_REDIRECT_URL` e caixa de teste autorizada continuam ausentes, de modo que somente entrega e aceite real por e-mail permanecem pendentes. Relatório vigente: `20-CORRECOES-GESTAO-DE-ACESSOS.md`.

## 30/09/2026 — Ajustes finais de convites e suspensão com sessão aberta

A migration aditiva `20260930100000_equipe_convites_expiracao_recuperacao.sql` foi aplicada isoladamente no Supabase autorizado `xftnkusbyqzyvzrovroj`; migrations anteriores não foram reescritas. O catálogo confirmou as novas definições `SECURITY DEFINER`, `search_path=""` e grants internos somente a `service_role`. O ensaio conectado com `ROLLBACK` comprovou substituição explícita de convite vencido, histórico e idempotência preservados e finalização atrasada sem reabrir cancelado/aceito.

A Edge Function `equipe-acessos` está `ACTIVE`, versão 3, `verify_jwt=true`, bundle `44770ea93f1967f473772e8dcfce4f07ae6133db7bc9e1443a9e6b16d6367dde`; a fonte publicada foi comparada e coincide com a local. O reenvio registra o usuário retornado pelo Auth e recupera por e-mail exato uma criação seguida de falha, sem duplicar conta nem liberar acesso antes do aceite. As origens locais 3000 e 5173 foram explicitamente permitidas e a chamada autenticada da ficha funcionou pelo navegador em ambas.

Duas sessões Auth sintéticas comprovaram bloqueio servidor: a mesma sessão/token perdeu uma leitura protegida após suspensão pela administradora e recuperou-a após reativação. Contas, usuários, vínculos e membro temporários foram removidos pelos IDs exatos; dois eventos de auditoria foram preservados. Contagens finais: membros `1`, vínculos ativos `2`, acessos ativos `6`, convites `0`, idempotências `0`; integridade terminou em `qtd_pacientes=3`. Relatório vigente: `21-AJUSTES-FINAIS-CONVITES-E-SUSPENSAO.md`. Pendência única deste fluxo: entrega/aceite por e-mail sem redirect e caixa de teste autorizados.

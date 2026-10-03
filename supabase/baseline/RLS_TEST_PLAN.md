# Plano de testes de RLS, isolamento e compatibilidade local

## 1. Objetivo, escopo e limites

Este é um plano estático para a futura execução controlada de testes de RLS,
isolamento entre clínicas e compatibilidade do código com a baseline local.
Ele não é uma migration, seed, script executável ou autorização para testar
produção.

O ambiente permitido é somente uma cópia local descartável da stack Supabase.
Produção, hosts remotos, Financeiro posterior e hardening posterior do
Prontuário estão fora do escopo. Não usar pessoas, documentos, telefones,
endereços, e-mails ou quaisquer dados reais nas fixtures.

Durante a elaboração deste arquivo não foram inseridos, alterados ou lidos
dados de aplicação, Auth ou Vault. As constatações vêm de catálogos locais e
dos arquivos já existentes no repositório.

## 2. Estado validado da baseline

| Item | Resultado |
| --- | --- |
| Ambiente | Docker desktop-linux; PostgreSQL local 17.6 saudável |
| Vínculo remoto | Ausente |
| Snapshot remoto | 84.218 bytes; SHA-256 47CAB27AA4A666F1E1E402C7B68467408F3C952497AD8706DC754170E992C124 |
| Candidata | 84.082 bytes; SHA-256 99942BD9A94F0DBE51C6EAE395776B05C4998827E26860361AEB0338AC134261 |
| README da baseline | 4.641 bytes; SHA-256 3508FEA361A97E7315C132ECAD232794AEC5380545630E8C2C03A0681B7C0A47 |
| Estrutura local | 19 tabelas, 10 enums, 188 colunas, 16 funções, 13 triggers |
| Segurança estrutural | 47 policies, RLS habilitado em 19 tabelas, nenhuma tabela com RLS forçado |
| Constraints e índices | 88 constraints, 29 índices válidos, 3 índices independentes |
| Migrações locais | Não há relação de histórico de migrations |
| Pré-requisito Agenda | btree_gist 1.7 em extensions; gist_uuid_ops para UUID; exclusão agendamentos_sem_sobreposicao validada |

A candidata, o snapshot e este README não pertencem a supabase/migrations. A
baseline não deve ser reaplicada durante nem depois dos testes.

### Convenções do plano

- Grant significa privilégio PostgreSQL bruto; ele não substitui RLS.
- Permitido significa que grant, papel, claim e policy precisam coincidir.
- Clínica A e Clínica B são identificadores sintéticos distintos, jamais nomes
  de pessoas ou clínicas reais.
- A clínica ativa é uma configuração local da sessão; ela não é inferida de
  um subdomínio nestes testes de banco.

## 3. Inventário integral das policies RLS

As 47 policies são permissivas; não há policy restritiva. O campo U indica
USING e WC indica WITH CHECK. A expressão foi resumida, sem reproduzir corpos
extensos.

| Tabela | Policy e comando | Roles | U / WC | Regra resumida e teste de isolamento |
| --- | --- | --- | --- | --- |
| agenda_excecoes | excecoes_select — SELECT | authenticated | U / — | clinica_id deve pertencer a clinicas_do_usuario; Clínica B não vê A. |
| agenda_excecoes | excecoes_insert — INSERT | authenticated | — / WC | vínculo à clínica e eh_proprietaria_ou_recepcao. |
| agenda_excecoes | excecoes_update — UPDATE | authenticated | U / — | seleção limitada à clínica e ao perfil proprietário/recepção; testar mudança de clinica_id. |
| agenda_excecoes | excecoes_delete — DELETE | authenticated | U / — | somente proprietário/recepção da própria clínica. |
| agendamentos | agendamentos_select — SELECT | authenticated | U / — | vínculo clínico e, adicionalmente, proprietário/recepção ou o próprio profissional. |
| agendamentos | agendamentos_insert — INSERT | authenticated | — / WC | proprietário/recepção; paciente e profissional ativo precisam ser da mesma clínica. |
| agendamentos | agendamentos_update — UPDATE | authenticated | U / — | proprietário/recepção da clínica; validar que não permite troca de clínica nem referências cruzadas. |
| agendamentos | agendamentos_delete — DELETE | authenticated | U / — | proprietário/recepção da própria clínica. |
| atendimentos | atendimentos_select — SELECT | authenticated | U / — | somente profissional cujo usuarios.id coincide com auth.uid; não há filtro clínico explícito. |
| atendimentos | atendimentos_insert — INSERT | authenticated | — / WC | próprio profissional, vínculo clínico e paciente na mesma clínica. |
| atendimentos | atendimentos_update — UPDATE | authenticated | U / — | próprio profissional; testar alteração de paciente, profissional e clínica. |
| atendimentos_adendos | adendos_select — SELECT | authenticated | U / — | atendimento deve ser do profissional associado a auth.uid. |
| atendimentos_adendos | adendos_insert — INSERT | authenticated | — / WC | mesmo profissional e atendimento finalizado. |
| auditoria | auditoria_leitura — SELECT | PUBLIC | U / — | eh_proprietaria(clinica_id); anon e sem vínculo devem obter vazio ou bloqueio. |
| auditoria_leitura_clinica | auditoria_leitura_select — SELECT | authenticated | U / — | atendimento relacionado deve pertencer a clínica da proprietária. |
| clinicas | clinicas_isolamento — SELECT | PUBLIC | U / — | somente IDs retornados por clinicas_do_usuario. |
| disponibilidade_padrao | disponibilidade_select — SELECT | authenticated | U / — | clinica_id vinculada ao usuário. |
| disponibilidade_padrao | disponibilidade_insert — INSERT | authenticated | — / WC | clínica vinculada e proprietário/recepção. |
| disponibilidade_padrao | disponibilidade_update — UPDATE | authenticated | U / — | proprietário/recepção; não há WC explícito, portanto é caso obrigatório de verificação dinâmica. |
| disponibilidade_padrao | disponibilidade_delete — DELETE | authenticated | U / — | proprietário/recepção da própria clínica. |
| documentos_clinicos | documentos_select — SELECT | authenticated | U / — | atendimento pertencente ao profissional de auth.uid. |
| documentos_clinicos | documentos_insert — INSERT | authenticated | — / WC | somente documento para atendimento do próprio profissional. |
| entradas_caixa | entradas_caixa_select — SELECT | authenticated | U / — | clínica vinculada e, quando definida, igual a clinica_ativa. |
| entradas_caixa | entradas_caixa_insert — INSERT | authenticated | — / WC | proprietário/recepção; sessão aberta, paciente e profissional ativo da mesma clínica e clínica ativa compatível. |
| especialidades | especialidades_select — SELECT | authenticated | U / — | condição verdadeira; catálogo compartilhado para autenticados. |
| especialidades | especialidades_insert — INSERT | authenticated | — / WC | eh_proprietaria_alguma. |
| especialidades | especialidades_update — UPDATE | authenticated | U / WC | eh_proprietaria_alguma antes e depois. |
| lista_espera | lista_espera_select — SELECT | authenticated | U / — | clínica vinculada e proprietário/recepção ou próprio profissional. |
| lista_espera | lista_espera_insert — INSERT | authenticated | — / WC | proprietário/recepção; paciente e profissional ativo da mesma clínica. |
| lista_espera | lista_espera_update — UPDATE | authenticated | U / — | proprietário/recepção; verificar explicitamente a semântica de check no UPDATE. |
| lista_espera | lista_espera_delete — DELETE | authenticated | U / — | proprietário/recepção da própria clínica. |
| pacientes | pacientes_select — SELECT | PUBLIC | U / — | clínica vinculada e, se definida, igual a clinica_ativa. |
| pacientes | pacientes_insert — INSERT | PUBLIC | — / WC | mesma condição de vínculo e clínica ativa. |
| pacientes | pacientes_update — UPDATE | PUBLIC | U / WC | mesma condição antes e depois; caso crítico contra transferência entre clínicas. |
| profissionais | profissionais_select — SELECT | authenticated | U / — | existe vínculo profissionais_clinicas em uma clínica acessível. |
| profissionais | profissionais_update — UPDATE | authenticated | U / WC | eh_proprietaria_de_profissional antes e depois. |
| profissionais_clinicas | profissionais_clinicas_select — SELECT | authenticated | U / — | clinica_id deve estar entre as clínicas do usuário. |
| profissionais_clinicas | profissionais_clinicas_insert — INSERT | authenticated | — / WC | clinica_id vinculada e eh_proprietaria. |
| profissionais_clinicas | profissionais_clinicas_update — UPDATE | authenticated | U / WC | eh_proprietaria na clínica anterior e posterior. |
| servicos | servicos_select — SELECT | authenticated | U / — | clínica vinculada e clinica_ativa compatível. |
| servicos | servicos_insert — INSERT | authenticated | — / WC | proprietária da clínica vinculada e clínica ativa compatível. |
| servicos | servicos_update — UPDATE | authenticated | U / WC | proprietária, vínculo e clínica ativa antes e depois. |
| sessoes_caixa | sessoes_caixa_select — SELECT | authenticated | U / — | clínica vinculada e clínica ativa compatível. |
| sessoes_caixa | sessoes_caixa_insert — INSERT | authenticated | — / WC | proprietário/recepção, vínculo e clínica ativa compatíveis. |
| usuarios | usuarios_self_select — SELECT | PUBLIC | U / — | somente id igual a auth.uid. |
| usuarios | usuarios_self_update — UPDATE | PUBLIC | U / — | somente a linha própria; testar se falta WC explícito permite troca de id ou clínica ativa. |
| usuarios_clinicas | uc_self — SELECT | PUBLIC | U / — | somente usuario_id igual a auth.uid. |

### Riscos transversais da matriz

1. Todas as 19 tabelas têm grants brutos de SELECT, INSERT, UPDATE e DELETE
   para anon e authenticated. A proteção efetiva depende integralmente de RLS.
2. As policies PUBLIC abrangem anon e authenticated; a ausência de auth.uid ou
   de vínculo deve ser testada, não presumida.
3. Há UPDATE policies sem WITH CHECK materializado no catálogo. Os testes de
   transferência de clínica e de referência são obrigatórios.
4. A policy de atendimentos seleciona pelo profissional associado ao usuário,
   sem um predicado clínico explícito. O teste deve cobrir profissional com
   múltiplos vínculos.

## 4. Mapeamento das 19 tabelas e efeitos colaterais

Em todas as linhas abaixo, anon e authenticated possuem grants brutos de
SELECT/INSERT/UPDATE/DELETE. O resultado real é o conjunto de policies da
seção anterior; ausência de policy para uma operação significa bloqueio por
RLS para esses papéis.

| Tabela e classificação | PK, caminho clínico e FKs relevantes | Operações efetivas a testar | Trigger, Auth/Vault/seq e risco |
| --- | --- | --- | --- |
| agenda_excecoes — isolamento direto | id; clinica_id; FKs clinicas, profissionais e users | auth: S/I/U/D para proprietário/recepção; anon negativo | sem trigger; created_by depende de Auth. |
| agendamentos — isolamento direto clínico sensível | id; clinica_id; FKs clinicas, pacientes, profissionais e users | auth: S/I/U/D conforme papel; profissional só na leitura própria | trg_calcular_hora_fim_agendamento em I/U; testar exclusão GiST e horas derivadas. |
| atendimentos — isolamento direto clínico sensível | id; clinica_id; FKs agendamentos, clinicas, pacientes, profissionais e users | auth: S/I/U apenas do profissional; D negativo | trg_bloquear_edicao_atendimento_finalizado em U; referências e finalização exigem controle. |
| atendimentos_adendos — isolamento indireto | id; atendimento_id leva ao atendimento e clínica | auth: S/I do profissional do atendimento; U/D negativos | sem trigger; created_by referencia Auth. |
| auditoria — tabela de auditoria | id identity; clinica_id; sem FK clínica exibida no resumo | leitura de proprietária; DML direto negativo | trg_auditoria_imutavel; auditoria_id_seq pode avançar mesmo com rollback. |
| auditoria_leitura_clinica — tabela de auditoria indireta | id; atendimento_id leva à clínica; usuario_id para users | auth: SELECT para proprietária; DML direto negativo | sem trigger; dependência Auth e atendimento. |
| clinicas — tabela clínica sensível | id; o próprio id é a clínica; sem clinica_id | PUBLIC SELECT somente por vínculo; DML negativo | trg_audit_clinicas grava auditoria; criação de fixture é setup privilegiado. |
| disponibilidade_padrao — isolamento direto | id; clinica_id; FKs profissionais, clinicas e users | auth: S/I/U/D para proprietário/recepção | sem trigger; testar troca de clínica e profissional. |
| documentos_clinicos — isolamento indireto clínico sensível | id; atendimento_id leva à clínica/profissional | auth: S/I do profissional; U/D negativos | sem trigger; created_by depende de Auth. |
| entradas_caixa — isolamento direto, Financeiro legado | id; clinica_id; FKs sessão, paciente, profissional e usuarios | auth: S/I para proprietário/recepção e sessão aberta; U/D negativos | trg_audit_entradas_caixa; não cobre Financeiro posterior. |
| especialidades — tabela compartilhada | id; sem clínica; FK created_by para usuarios | auth: S para todos autenticados, I/U proprietária; D negativo | trg_audit_especialidades; catálogo compartilhado é exceção deliberada. |
| lista_espera — isolamento direto | id; clinica_id; FKs paciente, profissional, clinicas e users | auth: S/I/U/D conforme papel e profissional | sem trigger; testar referências cruzadas. |
| pacientes — isolamento direto clínico sensível | id; clinica_id; FK clinicas e created_by usuarios | PUBLIC S/I/U sujeito a vínculo e clínica ativa; D negativo | trg_audit_pacientes; criptografia CPF depende Vault e pgcrypto. |
| profissionais — isolamento indireto | id; clínica derivada de profissionais_clinicas; FKs usuarios e especialidades | auth: S por vínculo e U por proprietária; I/D diretos negativos | trg_audit_profissionais; criação normal ocorre via RPC. |
| profissionais_clinicas — tabela de vínculo | PK composta profissional_id, clinica_id; FKs profissionais, clinicas e usuarios | auth: S/I/U proprietária; D negativo | trg_audit_profissionais_clinicas; base do isolamento de profissionais. |
| servicos — isolamento direto | id; clinica_id; FKs clinicas, especialidades e usuarios | auth: S/I/U proprietária e clínica ativa; D negativo | trg_audit_servicos. |
| sessoes_caixa — isolamento direto, Financeiro legado | id; clinica_id; FKs usuarios e clinicas | auth: S/I proprietário/recepção e clínica ativa; U/D negativos | trg_audit_sessoes_caixa; estado aberto necessário à entrada. |
| usuarios — tabela de vínculo Auth | id também referencia auth.users; sem clinica_id | PUBLIC S/U somente própria linha; I/D negativos | trg_audit_usuarios; raiz de fixtures da aplicação. |
| usuarios_clinicas — tabela de vínculo | PK composta usuario_id, clinica_id; FKs usuarios e clinicas | PUBLIC S somente própria associação; I/U/D diretos negativos | trg_audit_usuarios_clinicas; define papel_usuario e isolamento. |

## 5. Funções, helpers e triggers

Todas as 16 funções estão sob owner postgres e apresentam EXECUTE para PUBLIC,
anon, authenticated, service_role e postgres. Isso é um grant legado amplo,
não uma recomendação de segurança.

| Função e classificação | Segurança e search_path | Leitura/escrita, dependências e teste futuro |
| --- | --- | --- |
| abrir_atendimento(uuid) — RPC legada | SECURITY DEFINER; search_path ausente | Possível escrita em atendimentos, auditoria_leitura_clinica e profissionais; usa auth.uid; testar somente em clone e como legado. |
| bloquear_edicao_atendimento_finalizado() — trigger | SECURITY INVOKER; search_path ausente | Trigger de UPDATE em atendimentos; bloqueia mutação pós-finalização; verificar rollback. |
| cadastrar_profissional(text,text,text,text,uuid,uuid,numeric,numeric,integer) — RPC do frontend | SECURITY DEFINER; search_path ausente | Possível escrita em profissionais e profissionais_clinicas; usa auth.uid; exige teste de autorização e de efeitos de auditoria. |
| calcular_hora_fim_agendamento() — trigger | SECURITY INVOKER; search_path ausente | Ajusta dados de agendamento a partir de profissionais; validar hora derivada e constraint de sobreposição. |
| clinica_ativa() — helper de policy | SECURITY INVOKER; search_path ausente | Leitura de app.clinica_ativa; sem escrita; testar com valor nulo, Clínica A e Clínica B. |
| clinicas_do_usuario() — helper de policy | SECURITY DEFINER; search_path public | Leitura de usuarios_clinicas; usa auth.uid; fundamento do isolamento de clínica. |
| cpf_encrypt(text) — RPC do frontend criptográfica | SECURITY DEFINER; search_path public,vault,extensions | Vault e pgcrypto; segredo lógico cpf_key; não executar sem segredo local sintético autorizado. |
| cpf_decrypt(bytea) — RPC do frontend criptográfica | SECURITY DEFINER; search_path public,vault,extensions | Vault e pgcrypto; segredo lógico cpf_key; não testar com qualquer dado real. |
| cpf_hash(text) — RPC do frontend criptográfica | SECURITY DEFINER; search_path public,vault,extensions | Vault e pgcrypto; segredo lógico cpf_pepper; não executar sem segredo local sintético autorizado. |
| eh_proprietaria(uuid) — helper de policy | SECURITY DEFINER; search_path public | Lê usuarios_clinicas e auth.uid; caso proprietário próprio, alheio e sem vínculo. |
| eh_proprietaria_alguma() — helper de policy | SECURITY DEFINER; search_path ausente | Lê usuarios_clinicas e auth.uid; governa especialidades. |
| eh_proprietaria_de_profissional(uuid) — helper de policy | SECURITY DEFINER; search_path ausente | Lê profissionais_clinicas; testar profissional multi-clínica. |
| eh_proprietaria_ou_recepcao(uuid) — helper de policy | SECURITY DEFINER; search_path ausente | Lê usuarios_clinicas e auth.uid; governa agenda e caixa legado. |
| finalizar_atendimento(uuid) — RPC legada | SECURITY DEFINER; search_path ausente | Possível escrita em atendimentos e profissionais; usa auth.uid; manter separado das RPCs posteriores ausentes. |
| fn_auditoria() — função de auditoria | SECURITY DEFINER; search_path public | Possível INSERT em auditoria; usa auth.uid; dispara para 9 tabelas e pode consumir auditoria_id_seq. |
| fn_bloqueia_mutacao() — função de imutabilidade | SECURITY INVOKER; search_path ausente | Trigger de UPDATE/DELETE em auditoria; deve rejeitar mutação direta. |

Triggers mapeados: calcular hora fim em agendamentos; bloqueio de atendimento
finalizado; imutabilidade de auditoria; e fn_auditoria em clinicas,
entradas_caixa, especialidades, pacientes, profissionais,
profissionais_clinicas, servicos, sessoes_caixa, usuarios e
usuarios_clinicas.

### RPCs posteriores do Prontuário

As oito RPCs chamadas pelo código atual estão ausentes da baseline e devem
permanecer ausentes neste ciclo: listar_atendimentos_prontuario,
abrir_prontuario, iniciar_atendimento_avulso, iniciar_atendimento_agendado,
salvar_rascunho_atendimento, finalizar_atendimento_seguro,
adicionar_adendo_prontuario e criar_documento_prontuario. A ausência é
esperada enquanto o hardening não for autorizado.

## 6. Compatibilidade do frontend e backend com a baseline

| Origem e fluxo | Tabela/RPC | Situação | Pré-requisito ou motivo |
| --- | --- | --- | --- |
| useClinicasDoUsuario e plugin clinicaAtiva | clinicas SELECT | Compatível com pré-requisito | JWT autenticado e vínculo em usuarios_clinicas. |
| usePapelNaClinica | usuarios_clinicas SELECT | Compatível com pré-requisito | auth.uid igual ao usuario_id da fixture. |
| useSessaoCaixaAberta e useEntradasCaixa | sessoes_caixa e entradas_caixa SELECT | Compatível com pré-requisito | Vínculo e clinica_ativa compatível; são objetos legados da baseline. |
| Agenda, carregamento | profissionais_clinicas, profissionais, pacientes, lista_espera, disponibilidade_padrao, agenda_excecoes, agendamentos | Compatível com pré-requisito | Papel, vínculo e, para profissional, associação própria. |
| Agenda, criar/alterar agenda | agendamentos, agenda_excecoes, lista_espera | Compatível com pré-requisito | Recepção/proprietária; paciente e profissional da mesma clínica. |
| Agenda, iniciar atendimento | iniciar_atendimento_agendado | Ausente por depender do hardening | RPC posterior não existe na baseline. |
| Dashboard | agendamentos SELECT | Compatível com pré-requisito | RLS da agenda para o papel efetivo. |
| Pacientes | pacientes SELECT/INSERT e cpf_encrypt/cpf_hash/cpf_decrypt | Compatível com pré-requisito | RLS exige vínculo/clínica ativa; criptografia requer segredos locais sintéticos, não disponíveis nesta fase. |
| Especialidades | especialidades SELECT/INSERT/UPDATE | Compatível com pré-requisito | Leitura autenticada; mutação só proprietária. |
| Serviços | servicos SELECT/INSERT/UPDATE | Compatível com pré-requisito | Proprietária, vínculo e clínica ativa. |
| Profissionais | cadastrar_profissional e profissionais/profissionais_clinicas/disponibilidade_padrao | Potencialmente incompatível | RPC existe, mas SECURITY DEFINER e grants legados exigem teste isolado; updates dependem de proprietária. |
| Prontuário | oito RPCs posteriores | Ausente por depender do hardening | Não criar substitutos nem testar fluxos dinâmicos agora. |
| Financeiro.tsx, rotas Fastify e pool | financeiro_privado e funções/tabelas posteriores | Ausente por depender do Financeiro | Schema privado, roles e objetos posteriores não existem; somente a fundação legada descrita acima existe. |
| server/src/supabase.ts e plugins de Auth | cliente Supabase com Bearer | Compatível com pré-requisito | Token local sintético válido somente em ambiente descartável. |
| server/src/database.ts e financeiro/rpc.ts | conexão PostgreSQL direta Financeiro | Não testável nesta etapa | Pertence exclusivamente ao Financeiro posterior. |

Não foram encontradas outras conexões PostgreSQL diretas no frontend. O cliente
web é criado em src/lib/supabase.ts; o backend repassa Bearer ao cliente
Supabase em server/src/supabase.ts.

## 7. Identidades sintéticas mínimas

Usar UUIDs fixos, reservados somente para o clone de testes:

| Contexto | UUID sintético | Papel e vínculos | Resultado esperado |
| --- | --- | --- | --- |
| Clínica A | 00000000-0000-4000-8000-0000000000a1 | clínica de teste A | dados A isolados de B |
| Clínica B | 00000000-0000-4000-8000-0000000000b2 | clínica de teste B | dados B isolados de A |
| Proprietária A | 00000000-0000-4000-8000-000000000101 | proprietaria em A; clínica ativa A | administração permitida em A |
| Médica A | 00000000-0000-4000-8000-000000000102 | medico em A; profissional A; clínica ativa A | leitura e atendimento próprios, sem administração |
| Recepção A | 00000000-0000-4000-8000-000000000103 | recepcao em A; clínica ativa A | agenda/caixa legado permitidos conforme policy |
| Proprietária B | 00000000-0000-4000-8000-000000000201 | proprietaria em B; clínica ativa B | administração permitida somente em B |
| Sem vínculo | 00000000-0000-4000-8000-000000000301 | auth.users e usuarios sem usuarios_clinicas | vazio ou bloqueio por RLS |
| anon | sem UUID | papel PostgreSQL anon e sem claims | vazio ou bloqueio por RLS |

Os únicos valores possíveis de papel vêm do enum real papel_usuario:
proprietaria, medico e recepcao. Não introduzir papéis de negócio novos.

## 8. Estratégia para Auth e simulação de JWT

### Auth

auth.users tem id obrigatório, chave primária e unicidade de phone; não há
trigger não interno na tabela. A aplicação referencia auth.users por usuarios
e por campos created_by/finalizado_por de tabelas clínicas. O schema Auth
também tem identidades e sessões que referenciam users.

Não recomendar INSERT manual em auth.users: ele não cria auth.identities e
repete o incidente documentado de autenticação incompleta. A estratégia
recomendada para a fase dinâmica é:

1. criar identidades exclusivamente pela API Auth local ou Studio local, em
   clone descartável e com artefatos integralmente sintéticos;
2. criar usuarios e usuarios_clinicas de fixture no banco local do clone, sob
   transação de setup controlada;
3. rodar os casos de dados em transações independentes e descartar o clone
   inteiro ao fim.

Isso é preferível a criação SQL de Auth na baseline atual porque a API Auth
mantém a relação users/identities e pode envolver sessão fora da transação de
teste. Não chamar a API Auth durante a elaboração nem contra a baseline
preservada.

### JWT e papéis PostgreSQL

auth.uid() resolve o claim sub e auth.role() resolve o claim role. O ensaio
futuro deve iniciar cada caso em uma conexão local nova e, dentro de uma única
transação, ajustar somente estado LOCAL:

~~~sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<uuid-sintetico>', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('app.clinica_ativa', '<uuid-clinica>', true);
SELECT session_user, current_user, auth.uid(), auth.role();
-- uma única operação do caso
ROLLBACK;
~~~

Para anon, usar SET LOCAL ROLE anon, limpar as configurações de claim no
escopo da transação e verificar novamente session_user, current_user,
auth.uid(), auth.role() antes da operação. clinica_ativa() lê
app.clinica_ativa; testar também valor nulo. Não forjar ou persistir tokens,
nem alterar configuração da stack.

## 9. Fixtures sintéticas e ordem obrigatória

O setup deve ser exclusivo de um clone local descartável, com executor
controlado e identificado. Nenhuma fixture é criada nesta fase.

| Ordem | Fixture | Dependências, efeitos e limpeza |
| --- | --- | --- |
| 0 | Clone local descartável | Base validada, sem dados reais; registrar estado inicial da sequência. |
| 1 | Identidades via Auth local | Usuários sintéticos antes de qualquer FK da aplicação; limpeza pelo descarte do clone. |
| 2 | usuarios A, B e sem vínculo | Dependem de auth.users; trigger de auditoria pode escrever auditoria. |
| 3 | clinicas A e B | Raízes de isolamento; trigger de auditoria. |
| 4 | usuarios_clinicas | Depende de usuarios e clinicas; registrar os três papéis reais; trigger de auditoria. |
| 5 | especialidade compartilhada | Depende de usuario criador; trigger de auditoria. |
| 6 | profissionais e profissionais_clinicas | Dependem de usuarios, especialidade e clinicas; trigger de auditoria. |
| 7 | pacientes A e B | Dependem de clinicas e usuario criador; trigger de auditoria; não usar campos sensíveis reais. |
| 8 | servicos A e B | Dependem de clinicas, especialidade e usuario criador; trigger de auditoria. |
| 9 | disponibilidade_padrao e agenda_excecoes | Dependem de profissional, clínica e usuário; sem trigger de auditoria. |
| 10 | agendamentos A e B | Dependem de clínica, paciente, profissional e usuário; trigger calcula hora final e exclusão GiST valida intervalo. |
| 11 | atendimentos, adendos e documentos | Dependem de agenda/paciente/profissional; bloqueio de finalização; adendo/documento dependem de atendimento. |
| 12 | sessoes_caixa e entradas_caixa legadas | Dependem de clínica, usuários, paciente e profissional; sessões abertas antes de entradas; triggers de auditoria. |
| 13 | lista_espera | Depende de clínica, paciente, profissional e usuário. |
| 14 | auditoria e auditoria_leitura_clinica | Não inserir diretamente; observar somente efeitos de trigger e RPC legada no clone. |

Campos mínimos sem default devem seguir o catálogo: nomes e cidades sintéticos,
datas e horários artificiais, enum existente e UUIDs fixos. Não usar CPF,
telefone, e-mail, conteúdo clínico real ou valor financeiro realista.

## 10. Controle de sequências, triggers e resíduos

- auditoria_id_seq é a única sequência pública identificada. nextval não é
  revertido por ROLLBACK; qualquer trigger fn_auditoria pode avançá-la.
- O plano principal deve evitar comparar valores numéricos de auditoria.
- Para a baseline preservada, não executar testes que disparem auditoria.
- No clone descartável, preferir descarte total do volume/banco de teste ao
  final. Se isso não for possível, registrar o estado da sequência antes e
  restaurá-lo explicitamente em etapa de limpeza autorizada.
- Não inserir diretamente em auditoria: a trigger de imutabilidade deve ser
  verificada apenas como caso negativo.
- Isolar em transação cada caso que possa disparar calcular_hora_fim,
  bloquear_edicao_atendimento_finalizado ou fn_auditoria.
- UUIDs e timestamps gerados não exigem restauração; não devem ser usados como
  assertiva de identidade.
- Não há integrações externas autorizadas neste plano. A API Auth local é a
  única exceção futura e deve rodar somente no clone, antes dos testes
  transacionais.

O impedimento para uma execução transacional perfeitamente limpa na baseline
atual é a sequência de auditoria, combinada com criação de Auth fora da
transação. Por isso o clone descartável é obrigatório.

## 11. Matriz mínima de testes futuros

Total planejado: 87 casos, sendo 30 positivos e 57 negativos. Todos começam
com a verificação de sessão/JWT da seção 8 e terminam com ROLLBACK, exceto o
setup/limpeza do clone.

### 11.1 Autenticação e contexto — 6 casos: 2 positivos, 4 negativos

| Caso | Esperado |
| --- | --- |
| A-01 proprietária A autenticada | auth.uid, auth.role, current_user e clinica_ativa coerentes; contexto aceito. |
| A-02 médica A autenticada | claims coerentes e perfil medico reconhecido por policies indiretas. |
| A-03 anon sem claim | auth.uid nulo; nenhuma leitura clínica exposta. |
| A-04 autenticado sem vínculo | auth.uid definido, mas clinicas_do_usuario vazio e acesso bloqueado/vazio. |
| A-05 claim sub inválido | erro seguro ou conjunto vazio, sem bypass. |
| A-06 clínica ativa B para identidade A | policies que exigem clínica ativa não podem expor A indevidamente. |

### 11.2 SELECT — 20 casos: 8 positivos, 12 negativos

| Caso | Esperado |
| --- | --- |
| S-01 proprietária A lê clinicas | somente clínica A. |
| S-02 proprietária A lê pacientes A | registros de fixture A visíveis. |
| S-03 proprietária A lê agenda A | agenda A visível. |
| S-04 médica A lê atendimentos próprios | somente seus atendimentos. |
| S-05 médica A lê documentos/adendos próprios | somente derivados de seus atendimentos. |
| S-06 recepção A lê disponibilidade e lista A | leitura prevista pelas policies. |
| S-07 proprietária A lê auditoria A | eventos A visíveis. |
| S-08 autenticado lê especialidades | catálogo compartilhado visível. |
| S-09 proprietária A tenta pacientes B | vazio/bloqueado. |
| S-10 proprietária B tenta agenda A | vazio/bloqueado. |
| S-11 médica A tenta atendimento de médica B | vazio/bloqueado. |
| S-12 sem vínculo lê clinicas | vazio/bloqueado. |
| S-13 sem vínculo lê usuarios_clinicas | vazio/bloqueado. |
| S-14 anon lê pacientes | vazio/bloqueado apesar de policy PUBLIC. |
| S-15 anon lê auditoria | vazio/bloqueado. |
| S-16 recepção A lê atendimento clínico | vazio/bloqueado. |
| S-17 profissional multi-clínica lê atendimento fora do vínculo ativo | resultado deve respeitar desenho; registrar se houver exposição. |
| S-18 clínica ativa B tenta servicos A | vazio/bloqueado. |
| S-19 clínica ativa B tenta sessoes_caixa A | vazio/bloqueado. |
| S-20 proprietário A lê auditoria_leitura_clinica B | vazio/bloqueado. |

### 11.3 INSERT — 16 casos: 5 positivos, 11 negativos

| Caso | Esperado |
| --- | --- |
| I-01 recepção A insere agendamento A válido | permitido, hora final calculada e FK/GiST preservadas. |
| I-02 proprietária A insere disponibilidade A | permitido. |
| I-03 proprietária A insere serviço A | permitido com clínica ativa A. |
| I-04 médica A insere atendimento próprio A | permitido com paciente A. |
| I-05 recepção A abre sessão A e registra entrada A | permitido somente em sessão aberta. |
| I-06 recepção A insere agendamento B | bloqueado por vínculo. |
| I-07 proprietária A usa paciente B em agenda A | bloqueado pelo WITH CHECK. |
| I-08 proprietária A usa profissional B em agenda A | bloqueado pelo WITH CHECK. |
| I-09 médica A insere atendimento para profissional B | bloqueado. |
| I-10 autenticado sem vínculo insere paciente | bloqueado. |
| I-11 anon insere paciente | bloqueado. |
| I-12 recepção A insere entrada com sessão fechada | bloqueado. |
| I-13 recepção A insere entrada com clínica ativa B | bloqueado. |
| I-14 médica A insere adendo antes de finalizar | bloqueado. |
| I-15 usuária não proprietária insere especialidade | bloqueado. |
| I-16 qualquer papel insere auditoria diretamente | bloqueado. |

### 11.4 UPDATE — 15 casos: 5 positivos, 10 negativos

| Caso | Esperado |
| --- | --- |
| U-01 proprietária A altera serviço A sem trocar clínica | permitido. |
| U-02 proprietária A altera profissional A | permitido pela policy. |
| U-03 médica A atualiza atendimento próprio em andamento | permitido. |
| U-04 proprietária A atualiza paciente A mantendo clínica A | permitido. |
| U-05 recepção A atualiza disponibilidade A | permitido. |
| U-06 proprietária A transfere paciente A para B | bloqueado por WITH CHECK. |
| U-07 proprietária A troca profissional de agenda A por B | bloqueado ou falha de FK/policy; não pode persistir. |
| U-08 médica A troca atendimento para profissional B | bloqueado. |
| U-09 médica A altera atendimento finalizado | bloqueado pelo trigger. |
| U-10 proprietária A altera serviço A com clínica ativa B | bloqueado. |
| U-11 recepção A altera agenda B | bloqueado. |
| U-12 sem vínculo atualiza próprio usuario | bloqueado se não houver linha própria de fixture. |
| U-13 usuária A altera usuarios.id para outro UUID | bloqueado por RLS/FK; registrar comportamento do UPDATE sem WC explícito. |
| U-14 proprietária A altera profissionais_clinicas de B | bloqueado. |
| U-15 anon atualiza pacientes | bloqueado. |

### 11.5 DELETE — 9 casos: 2 positivos, 7 negativos

| Caso | Esperado |
| --- | --- |
| D-01 recepção A remove agenda_excecao A | permitido. |
| D-02 proprietária A remove lista_espera A | permitido. |
| D-03 recepção A remove agenda_excecao B | bloqueado. |
| D-04 médica A remove agendamento A | bloqueado por papel. |
| D-05 sem vínculo remove lista A | bloqueado. |
| D-06 anon remove qualquer tabela clínica | bloqueado. |
| D-07 tenta remover auditoria | bloqueado por RLS e trigger de imutabilidade. |
| D-08 tenta remover paciente A | bloqueado pois não há policy DELETE. |
| D-09 tenta remover profissionais_clinicas A | bloqueado pois não há policy DELETE. |

### 11.6 Helpers, RPCs e grants legados — 15 casos: 5 positivos, 10 negativos

| Caso | Esperado |
| --- | --- |
| R-01 clinicas_do_usuario para A | retorna somente o ID A de fixture. |
| R-02 clinica_ativa nula | policies compatíveis tratam ausência conforme definição. |
| R-03 eh_proprietaria e eh_proprietaria_ou_recepcao para A | verdadeiras para identidade/papel corretos. |
| R-04 cadastrar_profissional por proprietária A | permitido no clone e auditado; rollback ao fim. |
| R-05 calcular_hora_fim mantém intervalo de agenda válido | trigger produz término coerente. |
| R-06 clinicas_do_usuario para sem vínculo | vazio. |
| R-07 eh_proprietaria para médico/recepção | falso quando apropriado. |
| R-08 cadastrar_profissional por anon | negado, apesar de EXECUTE legado. |
| R-09 cadastrar_profissional por médica não proprietária | negado. |
| R-10 abrir_atendimento por usuário alheio | negado/sem escrita fora da clínica. |
| R-11 finalizar_atendimento por profissional alheio | negado/sem escrita fora da clínica. |
| R-12 cpf_encrypt sem segredo local sintético | falha segura; não consultar Vault. |
| R-13 cpf_hash sem segredo local sintético | falha segura; não consultar Vault. |
| R-14 uma das oito RPCs posteriores | inexistência explícita, sem criar função. |
| R-15 chamadas diretas às tabelas com grant amplo | RLS ainda deve negar fora das policies; qualquer bypass é achado crítico. |

### 11.7 Efeitos, rollback e regressão — 6 casos: 3 positivos, 3 negativos

| Caso | Esperado |
| --- | --- |
| E-01 rollback de INSERT auditado | linhas de fixture não persistem após rollback. |
| E-02 sequência de auditoria observada em clone | avanço reconhecido e tratado pelo descarte do clone. |
| E-03 constraint de exclusão de agenda | agenda sobreposta é rejeitada. |
| E-04 tentativa de mutar auditoria | trigger rejeita. |
| E-05 falha inesperada de trigger | caso é interrompido, sem correção automática. |
| E-06 falha de Auth/API fora da transação | clone é descartado; baseline preservada não é tocada. |

## 12. Critérios de aprovação, bloqueio e limpeza

### Aprovação

- Os 30 casos positivos têm exatamente o comportamento permitido pela policy,
  trigger e constraint correspondentes.
- Os 57 casos negativos resultam em bloqueio, erro seguro ou conjunto vazio,
  sem leitura ou escrita entre clínicas.
- Nenhum caso transgride limites de A/B, papel, clínica ativa ou autenticação.
- Não há bypass por grant legado ou SECURITY DEFINER.
- Todos os efeitos de teste são revertidos ou eliminados pelo descarte do clone.

### Bloqueio imediato

- hash de artefato diferente do registrado;
- Docker local fora de Linux, stack não saudável ou container reiniciando;
- presença de vínculo remoto;
- tentativa de atingir host remoto;
- ausência de clone descartável para testes que criem Auth, disparem auditoria
  ou consumam sequência;
- falta de segredo sintético explicitamente autorizado para testar criptografia;
- divergência da estrutura de 19/10/188/16/13/47/88/29.

### Rollback e limpeza

Cada caso de acesso a dados deve usar uma transação local isolada e ROLLBACK.
Não corrigir automaticamente qualquer falha. Ao terminar, validar que não
existem fixtures persistentes no clone e descartá-lo integralmente, preservando
os volumes da baseline. Se o clone não puder ser descartado, a execução fica
bloqueada até existir um método de limpeza autorizado que trate
auditoria_id_seq.

## 13. Riscos conhecidos e itens fora do escopo

- SECURITY DEFINER sem search_path fixo em funções legadas é risco conhecido;
  apenas mapear e testar, não corrigir nesta fase.
- Grants amplos de tabela e EXECUTE são legados; RLS é a barreira efetiva a
  validar.
- A ausência de WITH CHECK explícito em algumas policies UPDATE exige ensaio
  dinâmico contra transferência de clínica.
- A baseline não contém o hardening do Prontuário nem o Financeiro posterior.
- Vault, seus valores e segredos reais são proibidos. As funções CPF não são
  teste funcional até haver segredo exclusivamente local e autorização futura.
- Produção é proibida. Nenhuma conclusão deste plano concede acesso remoto.

## 14. Próxima fase segura

Antes de executar qualquer caso, solicitar autorização específica para criar um
clone local descartável, identidades Auth sintéticas e fixtures. Revalidar
Docker, hashes, ausência de vínculo remoto, saúde da stack e inventário da
baseline. Sem essa autorização, este documento permanece somente um plano.

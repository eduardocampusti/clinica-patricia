# Clínica Patrícia — validação de CPF e preservação do backup

**Data:** 29/09/2026  
**Projeto local:** `D:\PROJETOS SAAS\CLINICA PATRICIA`  
**Supabase autorizado:** `xftnkusbyqzyvzrovroj` — Clínica Patrícia  
**Migration de Equipe:** `20260928153000_equipe_cadastro_edicao.sql` já aplicada; não reaplicada nesta etapa.

## 1. Resultado

A validação dirigida inicial de CPF foi concluída no fluxo real de Equipe, com uma sessão autorizada de Proprietária/Administradora e dados sintéticos. O comportamento esperado foi confirmado para profissional de saúde e funcionário administrativo. Na repetição específica de CPF duplicado (seção 10), foi identificada e corrigida somente uma falha de apresentação da mensagem; não houve necessidade de nova migration ou mudança de configuração.

As gravações de Equipe permanecem disponíveis para o perfil autorizado porque a migration já está aplicada. Usuários sem autorização continuam protegidos pelas RPCs e RLS. A afirmação abaixo registra o resultado da validação inicial; na seção 10, a tradução de erros de unicidade foi corrigida e o caso de CPF duplicado foi repetido com a mensagem específica, sem alteração estrutural no banco.

## 2. Backup preservado

O `backup.json` documentado no relatório 17 foi localizado. O original foi mantido até a verificação final e continua existente em:

`C:\Users\Eduardo\AppData\Local\Temp\clinica-patricia-equipe-backup-20260929\backup.json`

Foi criada uma cópia permanente, fora de `Temp` e fora do Git:

`D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260929_EQUIPE_CPF_VALIDACAO\backup.json`

Verificações realizadas:

- tamanho do original e da cópia: 62.480 bytes;
- SHA-256 do original: `483329426102720E6F1276B3F2B1273776FB52A743C222E9A1CD827A601A240B`;
- SHA-256 da cópia: `483329426102720E6F1276B3F2B1273776FB52A743C222E9A1CD827A601A240B`;
- hash igual ao valor documentado no relatório 17: **sim**;
- ACL da cópia: herança desativada, somente proprietário local e sistema, sem regras herdadas.

### Cobertura e limitações do snapshot

O snapshot contém dados e metadados de `profissionais`, `profissionais_clinicas`, `usuarios`, `usuarios_clinicas`, `clinicas`, `especialidades` e `auditoria`, além de constraints, índices, policies, triggers, funções e grants. As contagens registradas antes da migration foram: profissionais 1; vínculos profissionais 2; usuários 5; vínculos de usuários 8; clínicas 3.

Ele **não é um backup completo do projeto**: não inclui Auth, Vault nem valores de segredos. A restauração ainda não foi executada ou validada. A cópia é uma proteção preservada do estado anterior à migration, não uma prova de recuperação operacional.

## 3. Validação real pela aplicação

Os dados foram enviados pela interface local, que chama as RPCs autorizadas do banco. O CPF válido foi gerado exclusivamente para o teste e não é reproduzido neste relatório, em logs ou capturas.

### Profissional de saúde

1. Criado um profissional sintético com CPF válido, profissão, conselho, registro, UF e clínica Brotas.
2. A criação exibiu `Funcionário cadastrado com sucesso.`.
3. A ficha foi reaberta; o CPF apareceu somente mascarado, sem o valor completo.
4. O telefone foi editado sem marcar “Alterar CPF”; a operação exibiu `Cadastro atualizado com sucesso.` e o CPF permaneceu protegido.
5. O CPF foi substituído por outro CPF sintético válido.
6. Após recarregar e retomar a sessão, a ficha exibiu a nova terminação mascarada, confirmando a persistência do valor corrigido.
7. O vínculo com `profissionais` foi criado e sincronizado com a projeção de Equipe; não houve usuário Auth fictício.

### Funcionário administrativo

1. Criado funcionário administrativo/recepção com CPF sintético válido.
2. A ficha mostrou o CPF mascarado e informou que os dados de conselho, registro, UF e especialidade não se aplicam à função.
3. O CPF foi removido pelo fluxo explícito de alteração.
4. A ficha passou a mostrar `Não cadastrado`, confirmando que CPF continua opcional para Equipe.
5. Como esperado, não foi criada linha em `profissionais` para o funcionário administrativo.

## 4. Rejeições e proteção contra gravação parcial

### CPF inválido no servidor

Foi executado o arquivo de teste `scratch/equipe_cpf_server_invalid_20260929.sql`. A chamada da mesma RPC `equipe_salvar` foi feita sob `role authenticated`, usando um vínculo existente de proprietária; o teste foi uma simulação controlada da camada SQL, não uma segunda sessão de navegador e não uma prova feita com conexão administrativa como se fosse usuário comum.

Resultado real:

- RPC rejeitou com SQLSTATE `22023` e mensagem `Operação de CPF inválida.`;
- a transação foi revertida;
- zero membro com o nome sintético do caso foi encontrado depois da tentativa.

### Duplicidade

Pela interface, foi tentado cadastrar outro profissional com o mesmo conselho, registro e UF do profissional sintético. A RPC rejeitou com `23505`; a interface mostrou `Já existe um cadastro com este CPF ou registro profissional.`. A consulta posterior confirmou zero registro parcial para o nome de duplicidade.

## 5. Limpeza e preservação dos dados existentes

Antes da limpeza, o preflight `scratch/equipe_cpf_cleanup_preflight_20260929.sql` confirmou zero dependências em Agenda, Financeiro, lista de espera e demais tabelas que referenciam profissionais.

Foram removidos somente os alvos exatos desta execução:

- membros de Equipe: `2ecf6007-849f-4181-a8d8-a10787e19e0e` e `98354c60-0b25-47ae-b36a-d48134657f43`;
- profissional de saúde: `0f4abdf0-a2b4-4ab0-9576-963ed751a6b6`;
- vínculos clínicos e idempotências ligados exclusivamente a esses IDs.

A auditoria não foi apagada. A verificação `scratch/equipe_cpf_cleanup_verify_20260929.sql` retornou:

- membros-alvo restantes: 0;
- vínculos de Equipe-alvo restantes: 0;
- idempotências-alvo restantes: 0;
- profissional-alvo restante: 0;
- vínculos profissionais-alvo restantes: 0;
- cinco registros de auditoria do ensaio preservados;
- contagem final: profissionais 1; vínculos profissionais 2; membros de Equipe 1; vínculos de Equipe 2; idempotências 0; auditoria 185.

O único profissional existente antes deste ensaio permaneceu no banco. Nenhuma conta Auth, clínica, paciente, atendimento ou lançamento financeiro foi criado ou alterado.

## 6. Integridade e verificação final

`supabase/tools/verificar-integridade.sql` foi executado novamente após a limpeza e terminou sem erro, com `qtd_pacientes = 3`.

Também foram conferidos:

- hash da cópia permanente do backup ainda idêntico ao original;
- migration de Equipe e seus objetos mantidos sem alteração;
- ausência de CPF completo no relatório e nos resultados registrados;
- build/lint/testes de Equipe da etapa anterior permanecem válidos; a correção de apresentação do erro de unicidade desta etapa está registrada na seção 10.

## 7. TypeSafe AI

A skill `typesafe-ai` foi consultada. A tarefa é determinística: cálculo/validação de CPF, constraints, criptografia, RPC, RLS, duplicidade e limpeza não precisam de julgamento semântico. Nenhuma integração foi adicionada e nenhuma chave TypeSafe foi solicitada ou exposta.

## 8. Limitações

- O teste de rejeição de CPF inválido no servidor foi uma simulação SQL sob `authenticated` com vínculo autorizado; não foi apresentado como login comum de navegador.
- A restauração do snapshot não foi validada.
- O backup preservado é um snapshot de escopo definido, não uma cópia integral do projeto ou do Supabase.
- Nenhuma migration nova foi necessária; migrations pendentes de outros módulos permaneceram inalteradas.

## 9. Acesso local

- Brotas: [http://127.0.0.1:5173/acesso/brotas](http://127.0.0.1:5173/acesso/brotas)
- Ipupiara: [http://127.0.0.1:5173/acesso/ipupiara](http://127.0.0.1:5173/acesso/ipupiara)
- Menu: `Cadastros → Equipe & acessos`.

O navegador foi deixado no servidor local, sem membros sintéticos pendentes de limpeza.

## 10. Teste específico de CPF duplicado — 29/09/2026

Esta seção complementa a validação anterior. O caso descrito em **Duplicidade** na seção 4 foi de conselho/registro/UF repetidos em profissional de saúde; ele não comprovava duplicidade de CPF. O teste abaixo é independente e usa funcionário administrativo, sem conselho, registro ou UF.

### Execução pela interface e resposta da RPC

1. Na sessão autenticada de proprietária, em Brotas, foi criado pela interface um funcionário administrativo sintético com CPF válido gerado exclusivamente para este teste. O formulário não recebeu conselho, registro ou UF.
2. Foi aberto um novo formulário (portanto, com nova chave de idempotência), informado nome diferente e repetido exatamente o mesmo CPF.
3. A tentativa foi enviada à RPC `equipe_salvar` e retornou `23505`. Antes da correção, o mapeamento da interface exibia `Já existe um cadastro com este CPF ou registro profissional.`; isso era compreensível, mas não permitia afirmar qual campo colidiu.
4. O defeito foi corrigido somente em `src/pages/cadastros/Equipe.tsx`: a camada de apresentação usa `message/details/hint` apenas para reconhecer, sem exibir dados técnicos, os índices de CPF (`cpf_hash`) e de registro profissional. A mensagem segura passou a ser `Já existe um funcionário cadastrado com este CPF.` quando o índice de CPF é identificado; o registro profissional recebe mensagem própria. Nenhuma consulta, descriptografia, migration ou permissão foi alterada.
5. O mesmo formulário da segunda tentativa foi reenviado após o hot reload. A RPC voltou a rejeitar e a interface mostrou exatamente `Já existe um funcionário cadastrado com este CPF.`, mantendo os campos preenchidos e o formulário aberto para nova tentativa.

### Integridade antes da limpeza

A consulta somente leitura `scratch/equipe_cpf_duplicate_inventory_20260929.sql` confirmou, sem retornar CPF ou hash:

- primeiro membro: UUID `f2252f77-d275-40bd-a771-ca16aa16e520`, tipo `administrativo`, CPF informado, `profissional_id` nulo, um vínculo clínico e uma idempotência;
- segundo membro: zero linhas;
- idempotências ligadas ao segundo: zero.

O preflight `scratch/equipe_cpf_duplicate_cleanup_preflight_20260929.sql` confirmou um registro de auditoria para o primeiro membro e nenhuma dependência em profissional ou vínculo profissional.

### Limpeza e resultado final

Após a conferência, foram removidos somente a idempotência, o vínculo clínico e o membro do primeiro caso, pelos UUIDs exatos. A auditoria não foi apagada. A verificação `scratch/equipe_cpf_duplicate_cleanup_verify_20260929.sql` retornou:

- membro, vínculo e idempotência do alvo: `0`;
- segundo membro por nome: `0`;
- auditoria preservada do alvo: `1`;
- contagens finais: profissionais `1`, vínculos profissionais `2`, membros de Equipe `1`, vínculos de Equipe `2`, idempotências `0`, auditoria `186`.

`supabase/tools/verificar-integridade.sql` foi executado novamente após essa limpeza e terminou sem erro (`qtd_pacientes = 3`). Nenhum cadastro preexistente foi removido ou alterado.

### Correção e verificações locais

Também foi incluída em `src/config/notasEvolucao.json` a nota de que conflitos de unicidade são traduzidos em mensagens específicas e seguras. Foram executados após a correção:

- `npm run build`: concluído com sucesso; avisos existentes de tamanho de bundle/importação dinâmica não impediram a compilação;
- `npm run lint`: concluído com sucesso, com o aviso preexistente de `ThemeProvider.tsx` sobre Fast Refresh;
- `server\\node_modules\\.bin\\tsx.cmd --test src/lib/equipe.test.ts`: `8/8` testes passaram;
- conferência real pela interface: primeiro salvamento confirmado, duplicidade rejeitada e mensagem específica visível.

Os testes de CPF inválido e de duplicidade de registro profissional continuam sendo casos distintos. O primeiro valida `22023` sem membro parcial; o segundo, já documentado na seção 4, usa conselho/registro/UF de profissional e não deve ser usado como prova de CPF duplicado. Nenhum CPF completo, token ou segredo foi incluído neste relatório.

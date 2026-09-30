# Clínica Patrícia — Correções da gestão de acessos

**Estado:** CONCLUÍDO NO ESCOPO DISPONÍVEL — migration corretiva aplicada, Edge Function versão 2 publicada e fluxos sem e-mail validados; entrega/aceite por e-mail aguardam redirect e caixa de teste autorizada.
**Projeto:** `xftnkusbyqzyvzrovroj` — Clínica Patrícia.
**Data:** 30/09/2026.

> Continuidade: os ajustes posteriores de expiração, recuperação no reenvio, CORS da porta 3000 e suspensão com token já emitido estão concluídos no relatório `21-AJUSTES-FINAIS-CONVITES-E-SUSPENSAO.md`. Este documento preserva o estado da versão 2 como histórico.

## Diagnóstico comparativo

Antes da correção, o Supabase remoto tinha a migration `20260929120000_equipe_gestao_acessos.sql` aplicada e a Edge Function `equipe-acessos` ativa na versão 1, bundle SHA `2005687d7aa63608ef1fcc0b0566bfcde275583aef333258a6b8f43274831533`. A comparação com o código local confirmou os seguintes problemas:

1. `listar` consultava os convites e, ao encontrar `email_confirmed_at`, chamava `equipe_acesso_confirmar_titular` ou `equipe_acesso_aplicar`. Abrir/atualizar a ficha podia, portanto, conceder acesso e gerar auditoria.
2. O caminho de convite reservado preenchia `equipe_membros.usuario_id` antes do aceite. Uma chamada posterior de `conceder` podia ativar o vínculo mesmo com o convite ainda pendente.
3. `equipe_acesso_aplicar` não atualizava `profissionais.usuario_id`, deixando Agenda e Equipe divergentes.
4. A função publicada usava `admin.auth.admin.getUserByEmail`, que não existe na API TypeScript efetivamente instalada (`@supabase/supabase-js` `^2.111.0`).
5. O redirect de convite novo não carregava o identificador do convite; a composição manual do redirect do OTP também podia perder parâmetros existentes.
6. A sessão de aceite não exigia confirmação de e-mail no servidor.
7. O serviço externo de e-mail/OTP era chamado antes da reserva de cooldown; duas requisições simultâneas podiam disparar envios duplicados.
8. Convites retornavam `clinicas_papeis` integralmente, sem filtrar as unidades que a administradora atual ainda podia consultar.
9. Durante a regressão responsiva, uma resposta de acesso sem o array `clinicas` desmontava o painel da ficha. O frontend agora trata contrato incompleto como indisponibilidade compreensível, sem renderizar dados inválidos nem derrubar o modal.

## Correções locais realizadas

### Migration preparada

Foi criada a migration aditiva `supabase/migrations/20260929190000_equipe_gestao_acessos_correcoes.sql` (357 linhas; SHA-256 `B3349A0441206375CD9CEE1B6F1188573D05D350ECB699786044077E3447B68A`). Ela:

- adiciona expiração de sete dias e campos de reserva transacional de envio;
- cria índices únicos parciais para impedir a associação da mesma conta a duas pessoas ou dois profissionais;
- torna `equipe_acesso_listar` somente leitura;
- não ativa vínculo clínico nem `usuarios` durante o convite não aceito;
- sincroniza `equipe_membros.usuario_id` e `profissionais.usuario_id` na mesma transação;
- usa lock de conta, membro e vínculos clínicos e revalida a administradora depois dos locks;
- considera conta global ativa ao proteger a última administradora;
- filtra convites por clínicas atualmente administradas;
- reserva o envio antes de chamar Auth/OTP e finaliza sucesso ou falha com o token da reserva;
- registra o `auth_user_id` quando Auth já criou a conta, permitindo recuperação sem duplicação;
- substitui a consulta inexistente `getUserByEmail` por RPC interna, somente `service_role`, que retorna no máximo o usuário do e-mail exato;
- exige e-mail confirmado para o aceite e torna a repetição do aceite concluído idempotente;
- trata convite expirado, encerrado e repetição sem reabrir acesso.

O SQL integral está no arquivo versionado da migration acima. Nenhuma migration anterior foi reescrita.

### Edge Function local

`supabase/functions/equipe-acessos/index.ts` foi corrigida para:

- não executar RPC de gravação durante `listar`;
- usar `npm:@supabase/supabase-js@2.111.0` fixo;
- anexar `?convite=<id>` ao redirect tanto do convite quanto do OTP sem perder parâmetros;
- validar `email_confirmed_at` da sessão antes do aceite;
- reservar e finalizar cada envio no servidor;
- recuperar convites cujo Auth já foi processado, sem criar acesso antes do aceite;
- não registrar chaves, tokens, senhas ou dados pessoais em logs.

SHA-256 local da função corrigida: `CA6AEDF6440E9092DF2D181811D46604F5CB5E100B29005BDD8D7F678E9277E9`.

## Snapshot de recuperação

Antes de qualquer alteração remota foi salvo o snapshot mínimo dos vínculos, papéis e estados em:

`D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260929_EQUIPE_ACESSOS_CORRECAO_PRE\snapshot-vinculos-papeis-20260929.json`

SHA-256: `9A502C91A9CE9D94B8022A59BB06E2A3750147E2BF589DE3DC84652094175D15`.

Cobertura: `equipe_membros`, `equipe_membros_clinicas`, `profissionais`, `profissionais_clinicas`, `usuarios`, `usuarios_clinicas` e convites. Não contém CPF, e-mail, senha, token ou ciphertext. ACL final: somente proprietário, SYSTEM e administradores. Não é backup completo do projeto e não houve restauração validada.

O preflight remoto foi somente leitura e encontrou 1 membro, 1 profissional, nenhuma duplicidade de conta e nenhuma divergência entre Equipe e Profissionais.

## Aplicação e publicação remotas

A tentativa de 29/09 permaneceu preservada como histórico. Em 30/09/2026, após autorização explícita específica, a migration `20260929190000_equipe_gestao_acessos_correcoes.sql` foi aplicada isoladamente no projeto `xftnkusbyqzyvzrovroj`; nenhuma outra migration pendente foi executada. O histórico remoto foi marcado somente depois do `COMMIT` bem-sucedido.

O catálogo confirmou as três colunas de expiração/reserva, os dois índices únicos, as novas assinaturas das RPCs e as assinaturas antigas sem `EXECUTE` para `service_role`, `authenticated` ou `anon`. Todas as funções corretivas são `SECURITY DEFINER`, têm `search_path=""` e permanecem executáveis somente por `service_role`.

A Edge Function corrigida foi publicada como `equipe-acessos`, `ACTIVE`, versão 2, com `verify_jwt=true` e bundle publicado `c934334d45efdec28e9586e918151657b25a0281f0b45215331760e4facd2642`. Chamada sem autenticação retornou HTTP 401. A SDK está fixada em `2.111.0`; a chamada incompatível `getUserByEmail` não existe mais.

## Verificações executadas

### Realizadas localmente

- `npm run build`: aprovado.
- `npm run lint`: aprovado; permanece apenas o aviso histórico de Fast Refresh em `ThemeProvider.tsx`.
- Testes determinísticos de Equipe: 8/8 aprovados.
- Playwright dirigido de Equipe/ficha: 24/24 aprovados em desktop, tablet e mobile após a correção defensiva do contrato de acesso.
- Transpilação sintática TypeScript da Edge Function: aprovada.
- Asserções de fonte: `listar` sem chamadas de gravação, sem `getUserByEmail`, redirect com identificador e reserva antes do envio.

### Realizadas no Supabase, somente leitura

- confirmação da referência, estado e bundle da função publicada anterior;
- preflight de colunas, gatilhos, duplicidades e divergências;
- snapshot de recuperação.

### Executadas no Supabase após a correção

- `database/tests/equipe/20260929_gestao_acessos_correcoes.sql`: aprovado; confirmou colunas, índices, grants, consulta sem RPC de gravação e coerência Equipe/Profissionais.
- `database/tests/equipe/20260930_gestao_acessos_integrada.sql`: aprovado em transação com `ROLLBACK`; comprovou listagem sem gravação, recusa de usuário comum, suspensão/reativação/papel, isolamento entre clínicas, aceite confirmado e idempotente, sincronização Equipe/Profissionais, reserva exclusiva de reenvio e bloqueio de autobloqueio.
- `supabase/tools/verificar-integridade.sql`: aprovado após a migration, com saída final `qtd_pacientes=3`.
- pós-teste: membros `1`, vínculos ativos `2`, profissionais com usuário `1`, convites `0`, idempotências `0`, duplicidades `0` e divergências `0`; o rollback não deixou fixture nem auditoria de ensaio.

### Conferência autenticada na interface

A sessão real de proprietária abriu **Cadastros → Equipe & acessos → Ver cadastro** em Brotas. A Edge Function versão 2 retornou o login da conta sintética, estado confirmado e acesso ativo. Abrir a ficha não criou convite, vínculo nem auditoria. Ao alternar para Ipupiara, a lista permaneceu vazia e nenhum dado de Brotas apareceu; o retorno a Brotas restaurou somente o contexto autorizado.

As alterações persistentes de papel/suspensão já haviam sido comprovadas pela sessão real no relatório 19. Nesta rodada, os caminhos corrigidos foram reensaiados remotamente com rollback para preservar o único cadastro sintético existente; essa parte é teste conectado de RPC, não uma segunda sessão de navegador comum.

A checagem nativa `deno check` não pôde ser executada porque `deno` não está instalado neste computador. A empacotação e a publicação pelo ambiente oficial do Supabase concluíram sem erro; essa limitação local permanece registrada e não é apresentada como um teste Deno executado.

## Limpeza e pendência externa

O ensaio integrado usou a conta e o membro sintéticos já existentes dentro de uma única transação e terminou com `ROLLBACK`; não criou IDs persistentes para remover. As contagens pós-teste confirmaram zero convites e zero idempotências. Auditorias históricas foram preservadas.

Não foi enviado convite ou OTP. A variável `EQUIPE_INVITE_REDIRECT_URL` continua ausente e não há caixa/destinatário de teste expressamente indicado. Portanto, entrega real de e-mail, abertura do link e aceite por uma segunda sessão Auth continuam pendentes. Isso não bloqueia consulta, alteração de papel, suspensão ou reativação de contas já vinculadas, mas impede declarar o ciclo de convite por e-mail homologado.

Cadastro e edição de Equipe permanecem disponíveis e preservados. A gestão de acessos instalada já usa a versão corretiva; a única pendência externa delimitada é entrega/aceite real por e-mail.

**Conferência local:** [http://127.0.0.1:5173/acesso/brotas](http://127.0.0.1:5173/acesso/brotas) e [http://127.0.0.1:5173/acesso/ipupiara](http://127.0.0.1:5173/acesso/ipupiara). Menu: **Cadastros → Equipe & acessos → Ver cadastro**.

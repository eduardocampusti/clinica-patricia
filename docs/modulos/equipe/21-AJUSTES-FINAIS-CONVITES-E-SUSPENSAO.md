# Clínica Patrícia — Ajustes finais de convites e suspensão com sessão aberta

**Estado:** CONCLUÍDO NO ESCOPO AUTORIZADO.  
**Projeto Supabase:** `xftnkusbyqzyvzrovroj` — Clínica Patrícia.  
**Data:** 30/09/2026.

## Diagnóstico confirmado antes da alteração

A fonte publicada da Edge Function versão 2 foi baixada e comparada com a árvore local: os arquivos eram idênticos (SHA-256 local anterior `CA6AEDF6440E9092DF2D181811D46604F5CB5E100B29005BDD8D7F678E9277E9`). O catálogo remoto confirmou as migrations `20260929120000` e `20260929190000`, zero convites persistentes e o índice parcial `equipe_acesso_convite_pendente_unico` abrangendo todo registro `pendente/enviado`, mesmo vencido.

Foram confirmados quatro pontos concretos:

1. `reservar_envio`, `aplicar` e `aceitar` tentavam cancelar o vencido antes de `RAISE EXCEPTION`; a exceção revertia o `UPDATE`.
2. `finalizar_envio` podia tentar regravar um convite já cancelado quando uma resposta externa chegava atrasada.
3. `reenviar()` não registrava o usuário devolvido por `inviteUserByEmail`, dificultando recuperar a falha parcial Auth → banco.
4. O CORS publicado não incluía as origens locais na porta 3000.

A skill `typesafe-ai` foi consultada. Jev não foi usado: expiração, idempotência, identidade Auth, CORS e autorização são verificações determinísticas.

## Correções aplicadas

Foi criada e aplicada somente a migration aditiva [`20260930100000_equipe_convites_expiracao_recuperacao.sql`](../../../supabase/migrations/20260930100000_equipe_convites_expiracao_recuperacao.sql), SHA-256 `01227E1EF66952039D66B3E6B563EB2716215E63FFB8C7216400F07A37A26D85`. Migrations anteriores não foram reescritas.

- Uma nova ação explícita de preparo cancela solicitações vencidas, limpa a reserva anterior e cria outro convite na mesma transação.
- O membro e uma chave lógica por membro/e-mail são travados, mantendo serialização; o índice único existente continua protegendo concorrência.
- Repetir a mesma chave de idempotência devolve a tentativa original e nunca cria outro convite.
- Listagem e detalhamento continuam somente leitura.
- Reserva e aceite de convite vencido rejeitam sem executar gravação que seria desfeita pela própria exceção.
- A finalização que observa expiração grava `cancelado` e retorna normalmente; finalizações atrasadas devolvem `cancelado/aceito` sem reabrir o estado.
- `registrar_auth` recusa convite aceito, cancelado ou vencido.

A Edge Function foi separada em orquestração e uma unidade testável de recuperação Auth:

- [`index.ts`](../../../supabase/functions/equipe-acessos/index.ts), SHA-256 `98DE28E01991D5E44B08E6F9EE6C86085909A5FB4C0C049211681ED505333860`;
- [`conviteAuth.ts`](../../../supabase/functions/equipe-acessos/conviteAuth.ts), SHA-256 `02FEF00FA2E870860F29302BFA044CDE9624CAF64919C519F807C6957BF9B593`.

O fluxo agora procura somente a conta do e-mail exato por RPC interna, registra e valida `auth_user_id`, e só então finaliza o envio. Se o Auth criou a conta e a gravação seguinte falhou, a repetição encontra a mesma conta e não chama novamente a criação. Nenhum acesso clínico é concedido antes do aceite. `localhost` e `127.0.0.1`, nas portas 3000 e 5173, são as únicas origens locais liberadas.

## Aplicação, publicação e catálogo

- Migration `20260930100000`: aplicada e registrada no histórico somente após `COMMIT` bem-sucedido.
- Catálogo: novas definições confirmadas em `pg_proc`; todas continuam `SECURITY DEFINER`, com `search_path=""` e execução somente por `service_role` nas RPCs internas.
- Índice e histórico: índice único anterior preservado; o novo preparo libera o índice ao persistir o cancelamento do vencido antes da inserção.
- Edge Function `equipe-acessos`: `ACTIVE`, versão **3**, `verify_jwt=true`, bundle SHA `44770ea93f1967f473772e8dcfce4f07ae6133db7bc9e1443a9e6b16d6367dde`.
- A fonte da versão 3 foi baixada novamente e comparada: publicada e local são idênticas.

## Proteção prévia

Antes da alteração remota foi salvo o snapshot mínimo em:

`D:\PROJETOS SAAS\CLINICA PATRICIA_BACKUPS\20260930_EQUIPE_CONVITES_PRE\snapshot-equipe-convites-20260930.json`

SHA-256: `4065DFCA9C752029EB1FCD1A1EDB67BAE940810BBF11A7046EFEA1614B5C4D57`.

A pasta tem ACL restrita ao proprietário, SYSTEM e Administradores. A cobertura inclui vínculos, papéis e convites do escopo de Equipe, sem CPF, senha ou token. Não é backup completo do projeto e a restauração não foi executada.

## Verificações realmente executadas

### Locais e simuladas

- Testes da recuperação Auth: **5/5** aprovados.
- Simulação cobriu: usuário devolvido por `inviteUserByEmail`; falha logo após criação no Auth; repetição recuperando a mesma conta sem nova criação; divergência de e-mail; modo vínculo sem conta; quatro origens locais explícitas.
- `npm run build`: aprovado.
- `npm run lint`: aprovado, mantendo somente o aviso histórico de Fast Refresh em `ThemeProvider.tsx`.

Esses ensaios de falha externa são simulados; nenhum serviço Supabase foi tornado indisponível e nenhum e-mail foi enviado.

### Banco conectado

`database/tests/equipe/20260930_convites_expiracao_recuperacao.sql` passou dentro de transação com `ROLLBACK`, comprovando listagem sem gravação, novo convite após expiração, histórico e idempotência preservados, finalização tardia sem reabertura e cancelamento persistente quando a finalização observa expiração.

`supabase/tools/verificar-integridade.sql` terminou sem erro e retornou `qtd_pacientes=3`. O pós-teste voltou a membros `1`, vínculos ativos `2`, acessos ativos `6`, convites `0` e idempotências `0`.

### Navegador e suspensão com sessão aberta

Na aplicação local, a proprietária abriu **Cadastros → Equipe & acessos → Ver cadastro** e a ficha recebeu a resposta autenticada da Edge Function versão 3 nas duas origens:

- `http://127.0.0.1:5173/acesso/brotas`;
- `http://127.0.0.1:3000/acesso/brotas`.

Os preflights CORS de `127.0.0.1:3000` e `localhost:3000` retornaram a origem exata; uma origem não permitida não recebeu `Access-Control-Allow-Origin`.

Para a suspensão foram criadas duas contas Auth e um membro exclusivamente sintéticos. Ambas as sessões foram autenticadas com chave pública, sem usar conexão administrativa como prova:

1. a conta-alvo leu o membro sintético por uma RPC protegida;
2. a administradora sintética suspendeu o alvo pela Edge Function;
3. a mesma sessão e o mesmo token anteriores receberam recusa do servidor na repetição da leitura;
4. após reativação pela administradora, a mesma sessão recuperou a leitura;
5. dois eventos de auditoria foram confirmados e preservados.

## Limpeza e pendência externa

As duas contas Auth, os dois usuários públicos, os vínculos e o membro desta execução foram removidos pelos IDs exatos. A consulta final confirmou zero resíduos desses IDs; convites e idempotências continuaram em zero. A auditoria append-only foi preservada.

Não houve envio de convite ou OTP. A entrega e o aceite real por e-mail continuam dependendo de `EQUIPE_INVITE_REDIRECT_URL` allowlisted e de uma caixa de teste expressamente indicada. Essa pendência não afeta expiração, recuperação de falha parcial, CORS, suspensão imediata de sessão aberta ou reativação, todos comprovados nesta etapa.

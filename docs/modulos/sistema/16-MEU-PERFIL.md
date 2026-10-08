# Meu perfil — identificação pessoal da conta

## Meu perfil — provas reais aprovadas; duas técnicas encerradas,08/10/2026,16:44-03

CLI/API oficiais no alvo xftnkusbyqzyvzrovroj: segunda rodada autorizada28/28
aprovada, persistência nome/foto/substituição/remoção/nova sessão e isolamento
bilateral comprovados com Auth normal fictício. Recarga/contexto por API; interface
sintética anterior distinguida. Ambas contas banidas/inativas, sessões e refresh
revogados e três vínculos inativos; novo login/renovação/perfil/foto recusados.
Frontend habilitado e versão0.2.0 preparada; pacote seletivo51 arquivos sobre
59acccb atual, preservando trabalhos locais alheios. Ainda sem commit/push/deploy
novo. Navegador indisponível; conferência visual autenticada publicada pendente.
Próximo: validar pacote exato, publicar e identificar ambos os bundles.
[Provas, exceção de canal e limites](17-MEU-PERFIL-BACKEND-PUBLICACAO.md).

Estado atual: SQL E SERVIÇO EDGE APLICADOS; HOMOLOGAÇÃO DE GRAVAÇÃO E PUBLICAÇÃO FRONTEND PENDENTES.
Atualização08/10/2026,12:20-03:00: sessões reais das duas novas fictícias verificadas;
perfil sem vínculo403/anônimo401. Vínculos temporários aguardam confirmação exigida
pela ferramenta, devido ao acesso clínico herdado. Normal ainda desabilitado; sem
commit/push/deploy Hostinger. [Estado e provas atuais](17-MEU-PERFIL-BACKEND-PUBLICACAO.md).
O texto abaixo preserva a etapa anterior; sua restrição de backend/publicação foi substituída pelo pedido posterior.

Estado da etapa anterior: IMPLEMENTAÇÃO LOCAL CONCLUÍDA; PERSISTÊNCIA NOVA PREPARADA, NÃO APLICADA.
Conferência08/10/2026,10:46-03:00 (America/Bahia). Não publicado.

## Pedido e fontes identificadas

Permitir que o titular configure nome e foto pessoais pela própria conta, sem
fixar nome no código nem alterar seu cadastro automaticamente. Preservar a melhoria
da dashboard do [relatório15](15-ENTRADA-IDENTIDADE-DASHBOARD.md).

| Informação | Fonte/estado identificado |
|---|---|
| Nome de exibição | `public.usuarios.nome_completo`, consulta do próprio `id=auth.uid()`. A sessão local apresenta literalmente o cadastro “Proprietária”; não se deduz identidade pelo e-mail. |
| Identificador da conta | E-mail da própria sessão Auth, exibido somente para consulta; não é fonte do nome. |
| Papel/clínica | `usuarios_clinicas` e hooks existentes de acesso/clinica ativa. Nome/foto não participam da autorização. |
| Editor próprio | Não localizado na árvore atual. Tema já possui serviço próprio; não é um editor de identificação. |
| Foto pessoal da conta | Não localizada coluna/bucket/serviço próprio na árvore atual. Falta o contrato completo de gravação segura. Não se afirma inspeção de esquema remoto por SQL nesta etapa. |
| Foto profissional anterior | Leitura privada da Equipe somente com RPC, vínculo explícito da própria conta e contexto/papel autorizados; sem leitura direta das tabelas revogadas. Preservada enquanto a integração pessoal está desabilitada. |

O baseline contém `usuarios_self_update`; hardening posterior acrescenta vínculo
ativo em USING/WITH CHECK. Isso indica persistência já existente para a linha do
usuário, mas não um serviço completo de nome/foto com whitelist e validação de
imagem. Não foi usada uma atualização genérica da tabela para contornar a
dependência. Não criou nova fonte de nome em Auth metadata ou navegador.

## Funcionando localmente

Clique no **avatar do cabeçalho** ou na **identificação no rodapé do menu** para
abrir **Meu perfil**. No celular, abrir menu e tocar na identificação fecha o menu
e abre o formulário. A página/clínica de origem não muda. Cada abertura reconsulta
a própria identidade; não reaproveita dados potencialmente desatualizados após
resultado incerto. Modal/alertas/confirmações/tokens existentes reutilizados.

Formulário compacto, responsivo e com foco contido: nome, foto com seleção,
prévia/substituição/remoção, Salvar/Cancelar, conta/clínica/papel só para consulta.
Cancelar/ESC/fechar com rascunho pede descarte; dados anteriores permanecem. Foto
removida na prévia só seria retirada da referência persistente ao salvar.
Nome preserva grafia, normaliza espaços; limite120 caracteres. Sem nome, fallback
“Conta conectada”; sem foto, iniciais. Não há senha, edição de login, vínculos ou
permissões. Não exige funcionário/médico para ter foto pessoal.

`src/config/perfilConta.ts` mantém `SERVICO_PERFIL_HABILITADO=false`. Na aplicação
normal, consulta apenas os leitores existentes, mostra **Salvamento ainda
indisponível** e **Salvar perfil desabilitado**. Nome/foto podem ser preparados,
mas prévia não altera cabeçalho/rodapé/saudação nem é tratada como persistência.
Não chama uma Edge inexistente: tentativa inicial dessa leitura produzia erro de
rede no navegador; a disponibilidade explícita eliminou essa chamada na versão
final. Nome/foto existentes não foram modificados na conta real.

## Preparado, dependente de backend

Proposta concreta e roteiro em [database/proposals/meu-perfil](../../../database/proposals/meu-perfil/README.md),
fora dos diretórios de aplicação automática. **Nenhum desses objetos foi aplicado.**

Nome permanece em `usuarios.nome_completo`. Proposta acrescenta referência da foto
pessoal e revisão na mesma linha, bucket privado `contas-fotos` e Edge `meu-perfil`.
Ator exclusivamente do JWT verificado; payload não aceita conta, clínica, papel,
e-mail ou campos extras. RPC de leitura própria sem ID externo; gravação interna
somente service_role, com CAS/revisão, conta/vínculo ativo e auditoria na transação.
Trigger protege campos novos de UPDATE direto; não amplia grants/roles existentes.
Preflight precisa conferir os guards reais, inclusive policies globais de Storage.

Reutiliza processador de imagens já existente da Equipe, **sem editar sua foto
profissional**: JPEG/PNG5MB,32–4096px,8MP, assinatura/decodificação/reencodificação
JPEG sem metadados. Objetos novos imutáveis e privados por UID. Cliente só poderá
ler sua foto atual; nenhum upload/update/delete público ou de outra conta.

Depois de habilitar e validar serviço completo, adaptador preparado confirma o
contrato persistente antes de mostrar sucesso; reconsulta para atualizar
cabeçalho/rodapé/saudação. Identidade pessoal é da conta, independente da clínica;
papel acompanha acesso existente. Foto pessoal nula significa iniciais, sem voltar
silenciosamente à foto profissional. Não usa localStorage para nome/foto.

Falha de upload conserva o objeto/referência anterior e o rascunho. Conflito ou
resultado incerto não mostra sucesso e bloqueia repetição até reabrir/reconsultar.
Resposta perdida não apaga objetos antigos/novos nem repete operação. A proposta
retira a referência ao remover; não exclui fisicamente arquivos. **Retenção e
limpeza dos objetos antigos/órfãos permanecem pendência operacional para revisão**;
nenhum job destrutivo criado.

## Verificação efetivamente realizada

| Ambiente | Resultado e limite |
|---|---|
| Local normal `http://localhost:5173`, Proprietário(a), Ipupiara | Avatar abre perfil; cadastro literal/conta e papel consultáveis, pendência explícita e Salvar desabilitado. Desktop e360px, recarga/retorno, sem overflow observado. Somente leitura. |
| Mesmo ambiente, Proprietário(a), Brotas | Rodapé abre perfil, mesma identidade/papel autorizado, troca de clínica e recarga, desktop e360px sem overflow observado. Menu móvel fecha antes do formulário. Somente leitura. |
| Backend sintético isolado,13 cenários novos | Editar/cancelar; nome+foto salvar/reabrir/F5; trocar clínica com papel diferente; substituir/remover; upload falho conserva foto anterior; serviço ausente; outro UID; arquivo alheio mesmo com UID próprio; resultado incerto; imagem inválida; logout/segunda conta; novo login da mesma conta; nome longo360/430px; foco/ESC/retorno. Escritas somente em estado fictício do teste. |
| Dashboard,22 cenários existentes reaproveitados/reexecutados | Login nas duas clínicas, F5 Agenda/Equipe/Financeiro, nome longo360/390/430, foto profissional autorizada, vínculo alheio/ausente, erro/ausência de nome, foto indisponível, logout/conta nova/resposta tardia e papel de outra clínica. Passaram. Outros33 cenários anteriores e7 de recuperação/convite preservados como evidência histórica; não foram repetidos sem necessidade. |
| Serviço proposto,14 testes com portas sintéticas | Whitelist, própria conta, ordem validar/enviar/confirmar, falha de upload, remoção, revisão concorrente e resultado incerto. Passaram; não comprovam SQL/RLS/Storage reais. |
| Identidade,2 testes determinísticos existentes | Nome/iniciais/Unicode e saudação/data Bahia passaram, com seus casos internos. |
| Verificação técnica final | `npm run build` (notas+tipos+Vite) aprovado. Lint sem erros,16 avisos preexistentes, nenhum novo. Diff-check nos arquivos rastreados desta etapa aprovado. |

Total nesta etapa: **35 cenários de navegador e16 testes determinísticos aprovados**.
Falhas iniciais eram seletores de teste e configuração do servidor sintético; foram
corrigidas. A configuração com suporte habilitado foi validada isoladamente; o
build normal mantém backend desabilitado. Alertas financeiros nos testes de F5
são falhas sintéticas deliberadas, não operações financeiras.

Não alterou conta real para demonstrar funcionamento. Novo login/logout/salvamento
e autorização de arquivos da nova persistência são **simulados**, não homologação
conectada. SQL, RLS, inicialização da Edge no Deno e persistência privada reais
dependem da etapa autorizada de backend e conta fictícia própria. Nenhuma sessão
real adicional/outro perfil real, aparelho físico ou valor histórico de banco
comparado. Não se atribui aprovação pessoal do titular.

## Capturas

Arquivos ignorados em `scratch/meu-perfil/evidencias/`:

- `brotas-real-perfil.jpg`, `ipupiara-real-perfil.jpg`: sessão real local, trecho
  superior do perfil com contexto/pendência. Recorte exclui identificação de login.
- `brotas-real-mobile-360.jpg`, `ipupiara-real-mobile-360.jpg`: perfil real móvel,
  prévia sem foto, sem login/dados de pacientes. Algumas capturas anteriores ao
  ajuste final do subtítulo mantêm o texto equivalente de identificação da conta.
- `sintetico-desktop.png`, `sintetico-mobile-360.png`, `sintetico-mobile-430.png`:
  formulário completo com conta fictícia, sem dados reais.

Aba local de Ipupiara deixada com Meu perfil aberto para revisão pessoal;
override de viewport removido ao terminar. Salvar continua desabilitado.

## Arquivos desta etapa e preservação

Runtime(8): `src/App.tsx`, `src/components/shell/AppShell.tsx`,
`src/components/shell/Sidebar.tsx`, `src/components/perfil/MeuPerfil.tsx`,
`src/hooks/useIdentidadeConta.ts`, `src/lib/meuPerfil.ts`,
`src/config/perfilConta.ts`, `src/config/notasEvolucao.json`.

Testes(5): `tests/login/dashboard-fixture.ts`, `tests/login/meu-perfil.spec.ts`,
`tests/login/meu-perfil.config.ts`, `tests/login/meu-perfil.vite.config.ts`,
`tests/login/meu-perfil.servico-sintetico.ts`. Alias de disponibilidade restrito ao
servidor sintético; não é importado no build normal.

Proposta(6): `database/proposals/meu-perfil/README.md`, `01-preflight.sql`,
`02-proposta.sql`, `index.ts`, `servico.ts`, `servico.test.ts` nesse diretório.

Documentação(8): este relatório, relatório15, README/Mestre/08 do Sistema,
`docs/ia/CHECKPOINT.md`, `docs/ia/INDICE.md`, `CHECKPOINT.md`.

199 fontes rastreadas comparadas com snapshot inicial: somente App/AppShell/Sidebar/
notas desta etapa mudaram; **195 restantes coincidem por SHA-256**. Arquivos novos
ou antes não rastreados não integram essa comparação. Avatar/saudação/dashboard e
demais implementações anteriores preservados; não reverteu a árvore para commit
antigo. Arquivos compartilhados contêm trabalho anterior, não autorizam versionar
todo o diff. Manifesto de publicação anterior não alterado.

Branch `codex/equipe-fase2-2026-10-07`; HEAD
`ad49386105b3ea19b10b11a4e40c31983ae38d69`, index vazio, alterações locais não
commitadas. Sem Docker/commit/push/deploy. Sem edição de backend existente,
migrations, ambiente, dependências, Auth, Storage, contas, credenciais ou vínculos.
Não há nova conferência/publicação dos domínios nesta etapa; evidência publicada
anterior permanece nos relatórios14/15, com sua data e escopo próprios.

## Ferramentas e conclusão

TypeSafe integralmente consultada e avaliada: tarefa determinística, sem IA no
produto. Jev: uma triagem sintética sem privados/arquivos, code_change confiança93%,
complexidade incerta resolvida por Codex;879+119=998tokens,1,389s,
US$0,000036918. Não há comparação que comprove economia de tokens do Codex.
Impeccable/padrões existentes reutilizados; ReUI avaliado, componentes existentes
suficientes, sem dependência/instalação. Não há skill Supabase instalada; usadas
fontes oficiais atuais e versões/processadores do projeto. Fontes e roteiro em
[README da proposta](../../../database/proposals/meu-perfil/README.md).

**Parte local concluída e revisável. Identificação pessoal persistente ainda não
liberada na conta real.** Próxima ação: revisar/autorizar a proposta de backend,
preflight e homologação própria com dados fictícios no único alvo pertinente.
Só depois habilitar integração normal e o titular preencher/salvar seu nome/foto.

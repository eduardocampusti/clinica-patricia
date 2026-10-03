# Clínica Patrícia — Convite real e aceite

**Estado atual:** ciclo real de convite/aceite/login comprovado no escopo abaixo; negativa de Ipupiara confirmada por captura do titular; limpeza dos alvos sintéticos concluída. Não houve personalização dos templates remotos.

## Encerramento e limpeza — 30/09/2026

A captura enviada pelo titular mostra o login de Recepção na entrada de Ipupiara recusado com a mensagem de ausência de vínculo ativo. É evidência visual da tentativa pela conta comum, combinada com o novo login em Brotas relatado anteriormente. A captura original contém credencial visível: não foi copiada para a documentação ou para o repositório, nem seu conteúdo sensível foi transcrito.

Ausência de papel administrativo confirmada na consulta dos vínculos: somente um papel `recepcao`, ativo em Brotas. Não foi executado um teste adicional de chamada administrativa com o token dessa conta nesta rodada, nem observada sua navegação administrativa; não apresentar isso como negativa de RPC nova. As negativas e a suspensão já testadas permanecem nos relatórios 20/21.

Antes da limpeza, o catálogo de chaves estrangeiras foi consultado e as referências efetivas eram exclusivamente o usuário, acesso Brotas, membro, vínculo, idempotência e convite deste ensaio. Nome sintético, membro sem profissional associado, convite aceito e vínculo somente Recepção/Brotas foram conferidos. A limpeza transacional bloqueava dependência inesperada e usou exclusivamente os IDs:

- membro: `d4cc78a0-a115-4ca1-a412-bb2dd0a2341b`;
- convite: `73e70353-db03-44a5-8827-e76a7477ef21`;
- conta: `afa3954d-8411-4701-81e7-ddce64c97b35`.

Dados públicos removidos por esses IDs; conta removida pela API administrativa Auth somente para limpeza, não como prova de permissão comum. Leitura posterior confirmou zero membro/convite/usuário, zero acesso/vínculo/idempotência, zero conta Auth e zero sessões Auth do alvo. **Dois eventos de auditoria preservados**, mesma contagem anterior. Não foram alterados pacientes, contas preexistentes, schema, SMTP, Site Geovana ou migrations. Nenhuma senha foi redefinida.

Aplicação conferida com HTTP 200 em `http://127.0.0.1:3000/acesso/brotas`. Não repetidos build/lint ou suítes: esta continuação executou somente leituras, limpeza autorizada e documentação, sem modificar código da aplicação. TypeSafe avaliado: procedimento determinístico, sem Jev/chave.

## Histórico da continuação — anterior à captura e à limpeza

## Continuação verificada — 30/09/2026

O titular informou recebimento, abertura, definição da própria senha e aceite. Leitura conectada confirmou convite `aceito`, e-mail Auth confirmado e exatamente um vínculo ativo: Recepção em Brotas, sem papel administrativo nem vínculo com Ipupiara. Na sessão da proprietária, a ficha confirmou conta, papel e acesso ativo somente em Brotas. Essas leituras não substituem negativas pela sessão comum.

O servidor da árvore atual foi iniciado na porta 3000 e conferido com HTTP 200. Na janela separada, o titular relatou novo login normal como recepcionista. É evidência relatada pelo usuário, não login executado pelo agente. Ainda falta conferir recusa de Ipupiara e ausência de gestão administrativa nessa mesma sessão. Não houve novo envio, redefinição de senha ou repetição do aceite.

**Limpeza não executada:** a fixture, conta e convite desta execução permanecem somente para a conferência final. IDs exatos preservados no arquivo ignorado `scratch/equipe-convite-real-state.json`. Auditoria e cadastros anteriores preservados. Aplicação: `http://127.0.0.1:3000/acesso/brotas`. E-mails: relatório `23-EMAILS-INSTITUCIONAIS.md`.

## Histórico — envio inicial antes da participação do titular

**Data:** 30/09/2026  
**Projeto:** `xftnkusbyqzyvzrovroj` — Clínica Patrícia  
**Aplicação local:** `http://127.0.0.1:3000/acesso/brotas`

## Preparação comprovada

- A skill TypeSafe AI e sua documentação vigente foram consultadas. TypeSafe/Jev não foi usado: autenticação, identidade, autorização e aceite são regras determinísticas.
- O destinatário indicado pelo usuário foi consultado por correspondência exata, sem ser registrado neste documento. Antes do ensaio havia zero conta Auth, zero membro de Equipe e zero convite associado.
- A rota de retorno foi conferida no código. `App.tsx` lê e valida `?convite=<UUID>` em `/acesso/brotas`, exige sessão autenticada e abre `ConviteEquipe`. A tela permite ao próprio titular definir a senha e chama `aceitarAcessoEquipe`.
- A Edge Function lê `EQUIPE_INVITE_REDIRECT_URL` e acrescenta o identificador com `URL.searchParams.set('convite', conviteId)`. Portanto, a base correta é `http://127.0.0.1:3000/acesso/brotas`.
- O segredo `EQUIPE_INVITE_REDIRECT_URL` foi configurado pelo mecanismo de secrets do Supabase e conferido por nome/hash, sem imprimir seu conteúdo.
- A mesma URL exata foi adicionada à lista de Redirect URLs do Supabase Auth. O Site URL preexistente não foi alterado e nenhuma URL foi removida.
- O painel confirmou que SMTP personalizado está desativado. Nenhum remetente, credencial ou configuração de SMTP foi alterado. O serviço aceitou esta solicitação real de envio; recebimento ainda depende da caixa do titular.

## Envio real pela interface

Foi criada pela sessão autenticada da proprietária uma única fixture claramente sintética:

- tipo: administrativo ou recepção;
- cargo: recepcionista;
- vínculo: somente Clínica Brotas;
- CPF: não informado;
- acesso ativo antes do convite: zero.

Na ficha dessa fixture, a interface foi usada para solicitar um convite no modo `convite`, com papel **Recepção** somente em Brotas. O serviço respondeu com sucesso, a ficha passou a mostrar **Convite pendente** e a base confirmou:

- um convite no estado `enviado`;
- uma conta Auth ainda não confirmada;
- zero vínculos clínicos ativos antes do aceite;
- nenhuma tentativa de reenvio.

Os identificadores exatos da fixture, do convite e da conta foram preservados em arquivo local ignorado pelo Git para permitir a limpeza posterior sem atingir cadastros preexistentes. E-mail, token, link de autenticação e segredos não foram registrados neste relatório.

## Separação das evidências

| Etapa | Situação comprovada |
|---|---|
| Configuração do retorno | concluída |
| Solicitação de envio pelo fluxo real | concluída |
| Serviço aceitou o envio | concluída |
| Recebimento na caixa postal | ainda não confirmado |
| Link aberto pelo titular | ainda não executado |
| Senha definida pelo titular | ainda não executada |
| Convite aceito | ainda não executado |
| Novo login após sair e entrar | ainda não executado |
| Recepção somente em Brotas | preparado; falta comprovação pós-aceite |
| Ausência de administração e de Ipupiara | preparado; falta comprovação pós-aceite |
| Estado final na ficha da proprietária | ainda não verificado |
| Limpeza | não executada; deve ocorrer somente após a validação final |

## Próxima ação do titular

1. Abrir a caixa de e-mail no mesmo computador.
2. Abrir o convite mais recente da Clínica Patrícia.
3. Usar uma janela anônima ou outro perfil do navegador, separado da sessão da proprietária.
4. Seguir o link para a aplicação local, definir a própria senha e confirmar o acesso.
5. Não enviar senha, token, código ou link completo pelo chat.

Depois dessa participação, devem ser conferidos aceite, novo login, papel Recepção somente em Brotas, negativa de administração/Ipupiara, ficha da proprietária e auditoria. Somente então os registros desta execução serão removidos pelos IDs exatos, preservando a auditoria.

## Fontes oficiais consultadas

- Supabase Auth — Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Auth — Users e convites: https://supabase.com/docs/guides/auth/users
- Supabase Edge Functions — Secrets: https://supabase.com/docs/guides/functions/secrets
- Supabase Auth — SMTP: https://supabase.com/docs/guides/auth/auth-smtp

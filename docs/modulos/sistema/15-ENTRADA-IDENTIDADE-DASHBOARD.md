# Entrada, identidade e apresentação da dashboard

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

Estado: IMPLEMENTADA E CONFERIDA LOCALMENTE; NÃO PUBLICADA. Pedido posterior de08/10/2026.
Atualização08/10/2026,12:20-03: backend SQL/Edge de Meu perfil aplicado e autenticação
fictícia real conferida. Gravação/isolações e publicação frontend aguardam os gates;
vínculos temporários dependem da confirmação exigida pela ferramenta por acesso
clínico herdado. [Estado e provas atuais](17-MEU-PERFIL-BACKEND-PUBLICACAO.md).
As restrições de publicação/backend descritas na etapa abaixo são históricas.
Atualização final:08/10/2026,09:54-03:00 (America/Bahia).

Continuação posterior08/10/2026: [Meu perfil](16-MEU-PERFIL.md) acrescenta acesso
pelo avatar/rodapé e preparação de nome/foto pessoais. Nome mantém a fonte
`usuarios.nome_completo`; backend pessoal aplicado, mas sua homologação completa
continua pendente e Salvar bloqueado na aplicação normal. Preserva esta melhoria e sua evidência
datada. Não transforma a conferência anterior em prova de edição pessoal no servidor.

## Escopo solicitado

Novo login comum abre diretamente `/sistema/{clinica}/dashboard`, utilizando a
unidade autorizada do fluxo. Sessão restaurada preserva a rota e a clínica atuais.
Recuperação, confirmação e convite mantêm seus caminhos próprios. Remover o cartão
Administração da clínica e o aviso meramente explicativo Indicadores financeiros;
Equipe e Financeiro permanecem no menu e com as permissões existentes.
Marca do aplicativo: Sistema Multiclínicas / Gestão Clínica, sem substituir nomes
de clínicas ou dados. Identidade da conta no cabeçalho e rodapé, com avatar40px,
nome cadastrado, papel na unidade, saudação/data no fuso America/Bahia.

Esta decisão substitui somente a apresentação administrativa anterior na árvore
local. A publicação descrita no relatório14 permanece como histórico comprovado.
Não autoriza commit, push, merge, publicação, backend, banco, Auth, Storage,
permissões, vínculos, infraestrutura ou Docker nesta execução.

## Base observada e preservação

Árvore normal: `codex/equipe-fase2-2026-10-07`,
HEAD `ad49386105b3ea19b10b11a4e40c31983ae38d69`, com trabalhos anteriores não commitados.
A correção publicada59acccb já estava presente localmente em App, Dashboard e notas.
Nenhum checkout antigo foi reaplicado, reset ou rollback executado. Worktree de
publicação59acccb não utilizado para esta melhoria.
Consulta pública08/10,08:45-03:00: ambos HTML/assetsHTTP200, versão0.1.0,
commit59acccb7; Brotas `index-BEIxadfs.js`, Ipupiara `index-CfJZynnL.js`.
Esta consulta comprova a publicação anterior, não a entrega local atual.

## Implementação e fontes de identidade

- Novo login identificado pelo sinal já existente `preferenciaNovoLogin`; somente
  a escolha que não é restauração encaminha à dashboard após validar unidade/papel.
  URL atual permanece prioritária na restauração e navegação interna.
- Nome: leitura do próprio `usuarios.nome_completo`, filtrada pelo ID autenticado.
  Nome do rodapé/cabeçalho é completo; saudação usa a primeira palavra do cadastro.
  Nenhum nome é derivado do e-mail ou associado por semelhança.
- Conta sem nome: Conta conectada, avatar `?`, saudação sem nome. Consulta falha:
  Nome indisponível. Consulta em andamento: Carregando perfil. Falhas de foto têm
  aviso explícito, distinto da falta de foto.
- Perfil existente não possui campo de foto. Para Proprietário(a), consultas já
  autorizadas `equipe_listar(p_clinica_contexto_id)` e `equipe-acessos/acao:listar`
  confirmam membro, `usuario_id` exato, vínculo/papel ativo na clínica. Somente depois
  disso, `equipe_foto_autorizar(p_escrita:false)` e o leitor privado existente
  carregam a imagem. Sem conta/vínculo confirmado, iniciais; nenhum vínculo criado.
- SELECT direto nas tabelas Equipe é revogado nas migrations existentes. A tentativa
  inicial dessa leitura foi retirada; não se ampliaram grants/RLS. Recepção e Médico
  usam nome próprio e iniciais, porque o leitor atual da Equipe exige Proprietário(a).
- Foto é Blob temporário, obtido com autenticação e cabeçalho de clínica. Não há URL
  pública/assinada, cache persistente ou envio externo. Consultas são canceladas e
  URLs revogadas ao trocar conta/contexto ou sair; a chave inclui conta/clínica/papel.
- Relógio da saudação, data e próxima consulta usam Bahia. Próximo atendimento e
  painel operacional da Recepção mantidos; nenhum indicador ou valor inventado.
- Shell existente, Base UI Avatar, ícone Grid, tokens/cores/temas mantidos. Marca
  quebra naturalmente sem aumentar o menu. Saudação móvel24px; menu com labels,
  links, estado ativo e títulos acessíveis quando recolhido.

## Resultado das verificações

Tipos, notas e build final aprovados. Lint sem erros nem avisos novos:16 avisos
anteriores de Fast Refresh/dependência do DataGrid permanecem. Build conserva os
avisos anteriores de tamanho de pacote/importação dinâmica do Supabase. Não se
alteraram dependências para resolver avisos fora deste escopo.

Testes com backend sintético, requisições externas bloqueadas e mutações não
previstas recusadas:

-33/33 cenários anteriores adaptados ao menu: computador1440px, tablet820px e
  celular360px; acesso aos cadastros, seções existentes, Financeiro, troca/F5/retorno,
  papel não autorizado, carregamento, erro distinto do vazio, tema escuro e teclado.
-29 cenários adicionais concluídos com sucesso:22 de identidade/entrada e7 já
  existentes de recuperação/convite. Primeira execução:24 aprovados e5 falhas de
  seletores antigos/espera curta do teste; após ajuste, somente os5 reexecutados,
  todos aprovados. O SDK repete GET503; o teste de erro do nome aguarda o resultado
  final, sem mudar essa política do aplicativo.
- Foto privada/associação/papel:5 cenários dirigidos reexecutados após finalizar
  o leitor privado,5/5. Navegação final por menu:2 percursos desktop reexecutados,
  Brotas/Ipupiara,2/2. São repetições direcionadas, não cenários adicionais distintos.
-9/9 testes determinísticos: apresentação de nome/iniciais/fuso e erros da Equipe.

Total de cenários distintos aprovados:62 de navegador e9 determinísticos. Simulação
comprova o comportamento do frontend sob respostas controladas, não nova sessão
real, persistência no servidor, envio de convite ou alteração de senha real.
O mock inicial não conferia o nome do parâmetro da RPC Equipe; a sessão real
encontrou a chamada incorreta. Corrigida conforme fonte existente; fixture agora
exige exatamente `p_clinica_contexto_id`. Incompatibilidades iniciais de tipos e
dois avisos novos de Fast Refresh também foram corrigidos antes do build final.

## Conferência autenticada local por clínica

Ambiente: aplicação normal `http://localhost:5173`, backend canônico já configurado,
sessão autorizada de Proprietário(a), somente leitura. Conferência08/10,09:16–09:53-03.

| Cenário | Brotas | Ipupiara |
|---|---|---|
| Saudação, data, clínica, cartão removido | Conferido | Conferido |
| Nome cadastrado no cabeçalho/rodapé | Conferido | Conferido |
| Equipe e Financeiro pelo menu | Conferidos no celular | Conferidos no computador e celular |
| F5 preserva Agenda, Equipe e Financeiro | Conferido no celular | Conferido no computador |
| Retorno à dashboard e troca de clínica | Conferidos | Conferidos, com recarga da dashboard |
| Computador e360/390/430px | Conferidos, sem overflow | Conferidos, sem overflow |
| Dashboard após consulta | Nenhum agendamento restante hoje | Nenhum agendamento restante hoje |

Nome observado no perfil próprio: `Proprietária`, exibido literalmente, sem
transformar o identificador de login em outro nome. Foto pessoal não exibida nesta
conta; fallback de iniciais, sem alerta final de falha na consulta da identidade.
Não se criou vínculo, pessoa ou foto para completar a apresentação. A capacidade
de exibir imagem vinculada foi validada somente com imagem JPEG sintética, sem
representar uma pessoa real. Recepção/Médico, novo login real, logout/segunda conta
real e aparelho físico não conferidos; preservada a sessão autorizada disponível.
Não se compararam valores históricos ou RLS/escritas do servidor nesta execução.

Capturas seguras, inspecionadas, em `scratch/dashboard-identidade/evidencias/`:
`brotas-desktop.png`, `ipupiara-desktop.png`, `brotas-mobile-360.png`,
`brotas-mobile-390.png`, `ipupiara-mobile-360.png`, `ipupiara-mobile-430.png`,
`brotas-menu-mobile-360.png`, `ipupiara-menu-mobile-360.png`. Somente dashboard,
menu e identidade da conta; sem registros de pacientes, contatos ou valores.
Origem local mantida; ajuste temporário de viewport removido ao terminar. Aba local
de Ipupiara deixada aberta. Limitação específica: não há foto no perfil da conta;
o mecanismo existente da Equipe exige vínculo confirmado e Proprietário(a).

## Preservação e conclusão

Build final na árvore normal sem commit/push/merge/deploy. HEAD/branch e index
mantidos.191 fontes rastreadas fora dos arquivos desta etapa coincidem com o
snapshot SHA-256; o único item alterado desse snapshot é `equipeAcessos.ts`,
explicitamente incluído para adicionar cancelamento à consulta existente. Nenhuma
alteração em backend, migrations, arquivos de ambiente, dependências ou configuração
de hospedagem. Trabalhos anteriores dos demais módulos preservados; não se afirma
comparação/preservação histórica de valores de banco não consultados.

Implementação local concluída e pronta para conferência visual do titular, com
as limitações acima. Esta execução não representa aprovação pessoal do acabamento
nem publicação. Próxima ação: conferência visual local pelo titular; eventual
publicação exige pedido próprio e montagem seletiva sobre a versão então vigente.

## Ferramentas e limites de envio

TypeSafe lido e avaliado: tarefa determinística, sem IA no aplicativo ou chamadas
diretas TypeSafe. Impeccable aplicado ao acabamento com componentes/tokens existentes.
Catálogo gratuito ReUI consultado genericamente; sem componente adequado de avatar/
sidebar que justificasse troca. Nenhuma instalação, migração ou dependência nova.
Jev recebeu um único resumo sintético, sem nomes privados, arquivos ou histórico:
code_change, confiança94%; complexidade incerta resolvida por Codex no código.
1.012tokens,1,322s,US$0,000037506. Não se conclui economia sem comparação medida.

## Arquivos desta etapa

Runtime: `src/App.tsx`, `src/pages/Dashboard.tsx`, `src/components/shell/AppShell.tsx`,
`src/components/shell/Sidebar.tsx`, `src/components/shell/AvatarConta.tsx`,
`src/components/dashboard/CabecalhoDashboard.tsx`,
`src/components/dashboard/PainelRecepcao.tsx`, `src/hooks/useIdentidadeConta.ts`,
`src/lib/identidadeApresentacao.ts`, `src/lib/equipeAcessos.ts`,
`src/lib/equipeRecursos.ts`, `src/config/notasEvolucao.json`.
Testes: `src/lib/identidadeApresentacao.test.ts`,
`tests/login/dashboard-proprietaria.spec.ts`,
`tests/login/dashboard-proprietaria.config.ts`, `tests/login/dashboard-fixture.ts`,
`tests/login/dashboard-identidade.spec.ts`, `tests/login/dashboard-identidade.config.ts`,
`tests/login/dashboard-identidade.vite.config.ts`.
Documentação: `CHECKPOINT.md`, `docs/ia/CHECKPOINT.md`, `docs/ia/INDICE.md`,
`docs/modulos/sistema/00-README-SISTEMA.md`,
`docs/modulos/sistema/01-DOCUMENTO-FUNCIONAL-MESTRE.md`,
`docs/modulos/sistema/08-CHECKPOINT.md`,
`docs/modulos/sistema/14-DASHBOARD-PROPRIETARIO-ACESSOS.md`, este relatório15,
`docs/modulos/login/00-README-LOGIN.md`,
`docs/modulos/login/01-DOCUMENTO-FUNCIONAL-MESTRE.md`,
`docs/modulos/login/08-CHECKPOINT.md`.
Total desta etapa:12 arquivos de runtime,7 de testes e11 de documentação.
Arquivos compartilhados contêm trabalhos anteriores; esta relação não autoriza
versionar todos os seus diffs. Capturas/resultados ficam em scratch, fora do pacote.
Manifesto de publicação anterior14 caminhos não modificado; refere-se à entrega59acccb.
Demais trabalhos, inclusive Equipe, Caixa, Agenda e melhorias anteriores, preservados.

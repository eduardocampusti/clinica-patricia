# Sistema — documento funcional mestre

## Refinamentos aprovados somente local — 2026-10-09 22:35:00 -03:00

Pendências e aprovações compacto; total estático suavizado; horários compartilhados apenas quando são da mesma fonte (Financeiro/pendências e Operação/agenda), sem data global de sucesso. Interpretação em detalhes, erros explícitos. Recepção preservada. Sem publicação. Estado e evidências: [Sistema29](29-REFINAMENTOS-FINAIS-DASHBOARDS-LOCAL.md).

## Acabamento visual aprovado somente local — 2026-10-09 22:11:38 -03:00

Proprietária/Recepção com linguagem da Agenda, mantendo regras, dados e atualização. Sem commit/push/deploy nesta etapa. Estado e provas: relatório Sistema28-ACABAMENTO-VISUAL-DASHBOARDS-LOCAL.md e checkpoint operacional; publicação0.6 permanece.

## Evolução aprovada e integração autorizada — 09/10/2026

O pedido posterior autoriza integrar e publicar a evolução do Claude, substituindo os limites históricos de somente local e de preservação da composição anterior dentro deste recorte. Proprietária apresenta Financeiro de hoje, Precisa de atenção, Operação de hoje e Agenda resumida. Previsto agrupa agendado/confirmado; total não cancelado fica separado. Recepção relê movimento/caixa a cada60s com aba visível, distingue estados, preserva filtros e sinaliza profissional fora da leitura. Não ampliar permissões, fontes, regras financeiras ou conteúdos clínicos. Erros não fabricam zero; troca de contexto cancela resultados antigos. Configurações e Acesso Direto publicados permanecem habilitados. Detalhes e evidências atuais: [relatório27](27-INTEGRACAO-DASHBOARDS-CLAUDE-PUBLICACAO.md). As restrições dos pedidos anteriores abaixo são históricas quando contrariadas explicitamente pelo pedido atual.


## Dashboard administrativa — pedido posterior de09/10/2026

Retirar cartões explicativos não retira as informações úteis. Proprietário(a)
confirmado deve consultar resumo/Agenda do dia e agregados oficiais do Financeiro
da clínica selecionada, com períodos/significados explícitos e ações existentes.
Agendados inclui confirmados; cancelados excluídos. Não inventar valores, regras,
metas ou dados para preencher o painel. Sem movimento não oculta os outros blocos;
erro/recusa/carregamento diferem de zero/vazio e troca descarta respostas anteriores.
Preservar identidade, entrada direta, menu, demais perfis e proteções do backend.
Executar somente localmente, sem dados/contas reais ou habilitação/publicação geral.
Conferência final aprovada pelo pedido de09/10: preservar a estrutura visual.
Agendados é o grupo de estados agendado/confirmado, não o total do dia. Sem horário
futuro nesse grupo, distinguir aguardando/em atendimento e horários passados ainda
nesses estados. Atualizar painel refaz Agenda e Financeiro, invalidando os resultados
anteriores imediatamente. Cada bloco informa leitura, erro ou recusa; horários
distinguem conclusão da leitura da Agenda de consulta financeira no servidor,
sempre com data/fuso e sem trocar o horário de origem pelo instante do clique.
Comparação real exige mesma clínica/data e critérios oficiais; permanece pendente
até evidência pertinente, separada de testes sintéticos e apresentação manual.
[Implementação e estado verificado](18-DASHBOARD-ADMINISTRATIVA-PROPRIETARIO.md).


## Pedido posterior — bloqueio antes da ativação, 08/10/2026

A guarda de primeiro acesso direto da Equipe deve anteceder os módulos, inclusive
restauração/F5. Cliente não substitui autorização de dados: sessão pendente/antiga
deve ser negada também no backend. Navegação/rotas, Configurações e identidade de
contas já existentes preservam suas regras. Implementação local autorizada;
serviço/migrações/hook apenas preparados, frontend desligado e sem publicação.
[Requisitos e evidências Equipe39](../equipe/39-ACESSO-DIRETO-SENHA-TEMPORARIA.md).



## Pedido posterior — Configurações, 08/10/2026

Configurações abaixo de Equipe e antes de Sobre, rota por unidade e interface
restrita a Proprietário(a); edição pendente protegida em navegação/troca/saída.
Nome/foto pessoal, saudação, dashboard e Meu perfil preservados. Backend institucional
desligado; demonstração isolada sem conta. Apresentação usa ID/subdomain fixo,
independente do nome editável.

Escopo aprovado: implementação local e preparo de backend para revisão. Sem
aplicação remota nesta etapa. Regras institucionais aprovadas em
[Configurações](../configuracoes/01-DOCUMENTO-FUNCIONAL-MESTRE.md);
estado técnico em [entrega](../configuracoes/09-RELATORIO-IMPLEMENTACAO.md).


**Estado:** RASCUNHO — comportamento solicitado em 25/09/2026; implementação local, não publicada.



### Decisão específica posterior — acabamento móvel,03/10/2026

Aviso mantém a contagem atual e usa “1 agendamento com horário passado ainda previsto” ou
“N agendamentos com horário passado ainda previstos”. Abas existentes mantêm semântica/ações,
com setas de44px, indicação de rolagem e aba selecionada visível por teclado, toque ou resize.
Correção mínima do espaço no cabeçalho compartilhado elimina transbordamento em360px,
sem alterar Sidebar, vínculos, permissões ou regras de negócio. Evidências no relatório ReUI.

### Decisão específica posterior — acabamento ReUI local,03/10/2026

Titular autorizou cinco melhorias de apresentação/usabilidade no Dashboard da Recepção e
Pacientes. Dashboard conserva fontes/significados/ações: escala uniforme dos indicadores,
seleção por cor da clínica com borda/peso, vazio com Limpar filtros/Ver previstos/Novo
agendamento somente quando pertinente, e critérios removíveis separadamente.
Busca exata já consultada continua aplicada ao remover profissional/situação; outra clínica,
data/revisão/texto invalidam resposta antiga. Alertas continuam semânticos; sem novos totais,
estimativas, paginação, banco, permissões, dependências ou publicação.
Resultado e limites: [relatório ReUI](../../ia/AVALIACAO-RECEPCAO-PACIENTES-REUI.md).

**Estado:** RASCUNHO — comportamento solicitado em 25/09/2026; implementação local, não publicada.

## Comportamento solicitado

### Meu perfil — backend/publicação autorizados no pedido posterior de08/10/2026

Revisar/aplicar backend mínimo somente no alvo oficial e provar persistência/
isolamento com contas fictícias ativas autorizadas antes de habilitar e publicar
somente identidade/dashboard e Meu perfil. Preservar contas reais e técnicas
bloqueadas, vínculos/papéis/credenciais e demais trabalhos. Autorização substitui
restrições da etapa local anterior. Pedido posterior autoriza excepcionalmente
navegador interno do Codex nesta execução/somente xftnkusbyqzyvzrovroj, preservando
regra04 nos demais casos. Até duas novas fictícias sem e-mail/fichas e com acesso
mínimo, depois bloquear logins/revogar sessões/desativar só vínculos de teste.
Permissões dos demais módulos não alteradas. Confirmação no momento do ato, exigida
pela ferramenta quando vínculos existentes também concedem acesso clínico, não foi
dispensada pela exceção de canal. Pedido posterior autorizou CLI/MCP/API oficiais
somente nesta execução/ref; CLI autenticado confirmou o alvo. SQL já aplicado não
reaplicado; Edge própria v2/JWT ativo.28 verificações reais aprovadas com A/B
e os três vínculos temporários expressamente autorizados; ambas encerradas,
sessões/refresh revogados e vínculos inativos. Frontend habilitado após as provas;
publicação0.2.0 em preparação. Interface autenticada publicada ainda não conferida.
Preparação atual e pendências no [relatório17](17-MEU-PERFIL-BACKEND-PUBLICACAO.md).

### Meu perfil — identificação pessoal, pedido posterior de08/10/2026

O titular configura nome/foto da própria conta pelo avatar ou rodapé, com prévia,
substituição/remoção, Salvar/Cancelar. Conta e papel da clínica ativa só para leitura;
sem edição de login, senha, vínculo ou autorização. Nome/foto não influenciam papel.
Identidade acompanha a conta em qualquer clínica/relogin; papel acompanha vínculo
autorizado. Nome mantém `usuarios.nome_completo`; não deduzir por e-mail nem fixar
nome pessoal. Sem nome, fallback honesto; sem foto, iniciais. Foto pessoal privada
independente da profissional, sem exigir cadastro na Equipe nem editá-lo silenciosamente.
Sucesso só após confirmação persistente; cancelar/falha conserva dados anteriores.
Resultado incerto exige reconsulta antes de repetir. Backend necessário preparado
para revisão na etapa anterior; SQL/Edge aplicados e persistência/isolamento
comprovados por sessões fictícias reais. Salvar habilitado no pacote local0.2.0;
publicação depende da confirmação dos dois destinos. Nenhuma edição
da conta real para testes. [Implementação local/proposta e limites](16-MEU-PERFIL.md).

### Entrada, identidade e dashboard — pedido posterior de08/10/2026

Novo login comum deve abrir a dashboard da unidade autorizada pelo fluxo; F5 em
página interna mantém rota/clínica. Fluxos especiais mantidos. Retirar cartão
Administração e aviso financeiro meramente explicativo, mantendo módulos e acessos
no menu conforme cada papel. Marca do aplicativo Sistema Multiclínicas / Gestão
Clínica; nomes das clínicas preservados. Nome do perfil próprio autenticado, foto
privada somente com vínculo explícito autorizado ou iniciais. Sem nome, fallback
honesto; sem inferência por e-mail. Saudação com primeiro nome cadastrado, data e
clínica no fuso America/Bahia. Contextos/contas distintos não reutilizam identidade.
Esta decisão substitui a apresentação da seção anterior na árvore local; não
autoriza publicação/backend nem representa aprovação pessoal do acabamento.
[Implementação e verificação](15-ENTRADA-IDENTIDADE-DASHBOARD.md).

### Acesso administrativo no Dashboard — pedido de correção de08/10/2026

Autorização específica posterior08/10,07:34-03: publicar a correção administrativa
com commit/push/deploy nas duas clínicas existentes, sem aprovação do acabamento
visual nem autorização para incluir outras alterações. Publicação ainda em preparação.

O Dashboard de Proprietário(a) oferece orientação e atalhos aos Cadastros existentes
na rota Equipe e ao Financeiro, sempre da clínica atual. Somente após confirmar o
papel/clínica; falha do próximo paciente não esconde esses acessos. Outros perfis e
guardas do servidor permanecem iguais. Não recriar a tela provisória Configurações,
inventar opções ou reintroduzir indicadores financeiros fictícios. Implementação
local solicitada, sem aprovação pessoal de revisão ou publicação presumida.
Conferência08/10,07:09-03: sessão autorizada local Proprietário(a), Brotas/Ipupiara,
recursos existentes/atalhos e navegação computador/celular verificados por leitura.
Isso confirma a implementação solicitada, não a aprovação pessoal do titular.
[Resultado e limites](14-DASHBOARD-PROPRIETARIO-ACESSOS.md).

### Integração inicial do Painel da Recepção — 03/10/2026, autorização posterior

Pedido posterior de 03/10, publicação seletiva autorizada: commit, push e implantação
pelo fluxo Hostinger existente, sem novas regras/banco/permissões/configuração.
Preservar nove prévias de e-mail anteriores; prévia/fixtures da Recepção não servidas
em produção. Autorização substitui a limitação de publicação das etapas anteriores,
sem ampliar o escopo funcional ou autorizar gravações para validar.

Revisão para preparação de publicação (03/10, 18:03 -03:00): ações que abrem a
Agenda geral devem usar Abrir Agenda, sem prometer seleção de um agendamento;
Financeiro mantém destino geral. Caixa só mostra resumo com status/valores/período
compatíveis com o contrato oficial. Prévia sintética da Recepção fora do pacote
normal. Manifesto seletivo e limites de verificação no relatório13; preparar não
autoriza publicação nem mudanças de banco/configuração/permissões.

Integrar somente ao Dashboard normal da Recepção, preservando os outros perfis e o
shell existente. Manter a composição aprovada: indicadores compactos, movimento
principal, próximos agendamentos e apoios laterais, recolhidos inicialmente no celular.
Contar o conjunto completo de agendamentos não cancelados da clínica/data America/Bahia,
sem confundir agendamentos com IDs distintos de pacientes; situações registradas e
filtros nominais/CPF exato por serviço existente. Ordenação pelo horário agendado;
sem inferir chegada, espera, prioridade clínica, falta ou presença profissional.
Resumo de caixa exclusivamente oficial, por sessão/período autorizado, distinguindo
recebido bruto e saldo esperado em dinheiro; falha/legado/indisponibilidade não são zero.
Omitir pagamento individual e contagens cadastrais até fonte segura. Reusar cadastro
e agendamento existentes; encaminhar chegada e recebimento à Agenda, sem criar novas
gravações no Dashboard. Erros/permissões/atualização explícitos, descarte de respostas
antigas, todas as abas por toque/teclado e ajuda expansível. Simulações só na prévia.
Sem alteração de banco/permissões/publicação nesta etapa. Implementação e limites no
[relatório13](13-PAINEL-RECEPCAO-PREVIA.md). A decisão abaixo descreve a fase anterior.

### Proposta isolada do Painel da recepção — 03/10/2026 (histórico)

Pedido específico: somente prévia sem dados reais, conforme conceitos desktop/celular;
Dashboard normal preservado. Fila em destaque, cabeçalho com ações, quatro contagens
de agendamentos (não pacientes distintos), busca/CPF exato e profissional, próximas
chegadas, caixa compacto e pendências não bloqueantes. No celular, caixa/pendências
inicialmente recolhidos, menu móvel existente e último item integralmente acessível.
Espera exige horário de chegada; horário passado sem chegada exige conferência,
sem falta automática ou prioridade clínica. Presença profissional não deriva da
Agenda. Financeiro conserva estados oficiais e falhas distintas, recebido bruto
e saldo separados; ações futuras reutilizam fluxos, sem fechamento direto/WhatsApp.
Descartar respostas obsoletas por contexto. Integração/publicação não autorizadas.
Inventário e limites: [relatório 13](13-PAINEL-RECEPCAO-PREVIA.md).

### Navegação compartilhada aprovada — 02/10/2026

Usar Sidebar shadcn/ui Base UI no layout autenticado, com expansão desktop persistida
somente como preferência visual e menu móvel independente. Identidade/unidade no topo,
itens autorizados roláveis e usuário/perfil/logout no rodapé. URL determina item ativo;
preservar guardas, vínculos, contexto e formulários ao recolher. Seletor reutiliza os
vínculos e callbacks atuais inclusive recolhido; não concede autorização. Login,
convite e recuperação mantêm layouts próprios. Implementação e limites locais no
[relatório 12](12-SIDEBAR-COMPARTILHADO.md), que distingue implementação, testes e publicação.

### Restauração autorizada após recarga — 01/10/2026

Refinamento aprovado após relato de Recepção: a URL interna válida é a fonte única da página ativa e prevalece sobre destinos capturados antes das consultas. Dashboard somente sem destino interno válido; rota fora do perfil recebe aviso explícito, sem descarte silencioso. Carregamento de vínculo/papel não equivale a negativa de permissão. Histórico, menu e conteúdo devem permanecer sincronizados.

Com sessão válida e vínculo ativo confirmado pelos serviços existentes, entrar automaticamente na área interna; restaurar página e clínica por rota validada após F5. Não usar preferência local como autorização nem persistir formulários/dados pessoais para isso. Convite e recuperação têm prioridade. Sem sessão mostrar login; falta de vínculo e indisponibilidade técnica são estados distintos, com nova tentativa/troca de conta. Logout impede restauração indevida. Referência de implementação/evidências: `10-RESTAURACAO-SESSAO-E-ROTAS.md`.

### Remetente institucional aprovado — 30/09/2026

Recuperação aprovada nesta continuação: solicitar link sem divulgar existência do e-mail; retornar à clínica de origem em caminho autorizado; permitir nova senha somente com sessão de recuperação validada pelo Auth; exibir confirmação/erros e exigir novo login. Recuperação não cria vínculos nem altera papéis. Templates compartilhados e remetente fixo; entrega validada somente após recebimento confirmado.

Usar administracao@clinicabrotas.com.br como remetente e usuário SMTP compartilhado, nome Clínicas Brotas e Ipupiara, smtp.hostinger.com:465/SSL-TLS. Preservar administracao@clinicaipupiara.com.br para administração da unidade. Não alternar SMTP global por mensagem. Titular insere senha pessoalmente no Supabase; nenhuma senha no código/chat. Retornos públicos por unidade e templates não concedem permissões. Entrega só validada mediante recebimento confirmado pelo destinatário autorizado.

### Decisão de publicação — 30/09/2026

Decisão vigente posterior: verificar todas as assinaturas e publicar Ipupiara em **outro plano existente com vaga**, sem custo adicional e sem nova autorização genérica. Escolhido pedido1008900896/Business/vencimento06/03/2030, quatro aplicações Node.js antes da implantação. Manter mesma branch/commit aprovado, configuração Vite/npm/dist/Node22 e duas variáveis públicas, com ajustes somente de DNS Ipupiara necessários. Publicação e rotas comprovadas no relatório09; nenhum upgrade/exclusão/outro site/SMTP permitido. A restrição ao pedido1009721871 no parágrafo histórico abaixo foi superada por essa decisão explícita.

Decisão posterior específica de Ipupiara: publicar `clinicaipupiara.com.br` no pedido existente1009721871, mesma branch atual/GitHub, Vite/Node22/dist e somente variáveis públicas Supabase; preservar Brotas, permissões, Site Geovana e SMTP. Contratação/upgrade e descarte/reaproveitamento de outros sites não estão autorizados. Execução atual bloqueada pelo limite5/5 apps Node.js, conforme relatório09. Modalidade estática alternativa ou liberação de aplicação existente depende de decisão adicional; preparação não equivale a publicação.

Decisão posterior: após primeiro deploy de Brotas na branch atual/f177207, usuário autoriza corrigir e publicar fallback para acesso direto/recarregamento das rotas na mesma integração GitHub. Preservar arquivos estáticos, caminho/parâmetros de autenticação e permissões; nenhum DNS/SMTP/Supabase/outro site no escopo. A restrição anterior abaixo descreve a etapa precedente.

Sincronizar o repositório existente sem force push, mudança de visibilidade ou perda do trabalho. Brotas usa clinicabrotas.com.br e Ipupiara clinicaipupiara.com.br, mesma base/Supabase, hostname apenas visual e permissões no servidor. Não comprar clinicaipupiara.com, planos ou VPS. Preserve Site Geovana, MX/SPF/DKIM/DMARC e configurações existentes. Remetente institucional depende de escolha/autorização e serviço real; destinatário de teste não é remetente. Decisão posterior do usuário nesta execução: **não fazer deploy na Hostinger sem nova autorização**. Preparar/consultar é permitido; não publicar, criar site ou alterar DNS ali.

- Mostrar o papel visual “Proprietário(a)” e “Visão de proprietário(a)” sem mudar o identificador interno `proprietaria` nem autorização.
- Dar acesso a “Sobre o sistema” pela navegação secundária. Mostrar clínica ativa, versão do build e ambiente sem confundir compilação com lançamento. A versão inicial desta fase é `0.1.0`, identificada como “Em desenvolvimento” até lançamento efetivo.
- Exibir dados institucionais por clínica e créditos gerais somente quando confirmados. Usuário autenticado não identifica proprietária, autoria ou suporte. Foram aprovados Vencer Digital como empresa de desenvolvimento, Eduardo Campos como desenvolvedor, WhatsApp `(77) 99129-0375` e Instagram `@vencerdigital.ia`; os respectivos links são contatos abertos apenas pelo usuário, sem envio automático de dados.
- Apresentar a marca original da Vencer Digital no cartão “Desenvolvimento e contato”, sobre superfície clara inclusive no tema escuro. Crédito de desenvolvimento não implica propriedade das clínicas.
- Listar notas úteis da versão efetivamente instalada, separando mudanças não lançadas de lançamentos com versão e data comprovadas. Sem inventar versões anteriores.
- Permitir consultar detalhes técnicos em área recolhível, com navegação por teclado, modo escuro e layout responsivo.

## Estado local e pendências

O pacote local está em `0.1.0`, ainda não lançado. O manifesto de Release Please permanece em `0.0.0` como referência inicial da automação, **não como release publicada** nem como versão do código em desenvolvimento. Não há tags locais de lançamento; o histórico remoto não pôde ser confirmado nesta revisão. A configuração de Release Please está preparada, mas seu gatilho automático aguarda a confirmação da branch oficial. Nome da proprietária, contato institucional das clínicas, autoria formal, manutenção e suporte oficial não foram confirmados e permanecem omitidos. Nenhum dado de pacientes ou autorização é alterado por esta página.

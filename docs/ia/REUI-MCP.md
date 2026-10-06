# ReUI MCP — configuração global e uso no projeto

Estado: APROVADO NO ESCOPO DOCUMENTAL pelo pedido do usuário.
Conexão: CONFIGURADA, AUTENTICADA E TESTADA LOCALMENTE.
Verificação: 03/10/2026, 19:04 -03:00 (America/Bahia), Windows/Codex CLI 0.150.1.
Escopo: ferramenta e documentação. Nenhuma adoção visual ou alteração funcional autorizada
por este guia. Continuidade em [checkpoint operacional](CHECKPOINT.md).

## Finalidade e diferenças

ReUI é um catálogo de componentes, exemplos e blocos de interface para React/shadcn.
Seu MCP é a conexão que permite ao Codex pesquisar o catálogo e consultar APIs e
dependências atuais. O MCP não instala componentes apenas por estar conectado.

| Recurso | Função | Estado nesta execução |
| --- | --- | --- |
| MCP ReUI | Consultar o catálogo remoto por ferramentas do Codex | Global, habilitado, OAuth e consultas reais aprovadas |
| Skill ReUI | Orientar descoberta, leitura da API, reutilização e futura instalação | Workflow consultado por `get_agent_skill`; nenhum instalador de skill executado nesta tarefa |
| Componentes ReUI | Código incorporado à aplicação, com suas dependências e estilos | Nenhum componente instalado por esta tarefa |
| Orientação em AGENTS | Definir quando avaliar ReUI e os limites de uso | Acrescentada pontualmente ao AGENTS global; referência curta no projeto |

Não confundir as adaptações shadcn já existentes na clínica com uma instalação de ReUI.
Desabilitar o MCP não remove código que venha a ser incorporado ao sistema.

## Configuração global efetiva

Nesta verificação, `CODEX_HOME` não estava definido. Diretório global efetivo:
`%USERPROFILE%\.codex` (perfil Eduardo no Windows). Arquivos:

- `%USERPROFILE%\.codex\config.toml`: cadastro do servidor.
- `%USERPROFILE%\.codex\AGENTS.md`: orientação global para o Codex.

Se `CODEX_HOME` for definido em outra sessão, conferir esse diretório antes de agir;
não presumir que será utilizada a configuração deste perfil.

Única seção ReUI encontrada na configuração global:

```toml
[mcp_servers.reui]
url = "https://mcp.reui.io"
```

Não há bearer token nem cabeçalho de autorização manual nesse cadastro. A autenticação
OAuth é gerenciada pelo Codex e não deve ser copiada para o repositório.
Não foi encontrada `.codex/config.toml` no projeto nem plugin ReUI cadastrado na
configuração efetiva. Não foram encontrados overrides AGENTS nas origens verificadas
(global, raiz do projeto e caminho até `docs/ia`) que substituam esta orientação.
Outros projetos podem ter overrides próprios; conferir ao iniciar cada tarefa.

O cadastro anterior já era global e foi preservado nesta consolidação, sem repetir
`mcp add` ou login. A configuração original e seus demais servidores foram preservados
na etapa anterior; esta etapa não alterou config.toml, modelos, permissões ou credenciais.
Backups verificados antecederam as edições de AGENTS e dos documentos existentes.

## Quando e como utilizar

Em criação ou melhoria de interfaces, avaliar se ReUI traz benefício concreto, por
exemplo uma composição pronta cuja API e compatibilidade possam ser verificadas.
Priorizar recursos gratuitos e componentes locais adequados. Uma correção simples ou
um componente já suficiente não exige consulta ao catálogo.

Quando houver pertinência:

1. Ler as fontes funcionais do módulo e o [design system](../../01-DESIGN-SYSTEM.md).
2. Fazer uma consulta genérica: `list_components` ou `search`, usando `free: true`
   quando o filtro estiver disponível. Não enviar dados ou arquivos privados.
3. Consultar `get_component` e exemplos oficiais, compartilhar documentação e prévia
   dos itens considerados; avaliar a variante Base UI/Radix e dependências necessárias.
4. Registrar o benefício e o escopo concreto. Disponibilidade do MCP não autoriza
   instalar componentes, atualizar dependências, migrar Tailwind ou redesenhar telas.
5. Se uma implementação futura for solicitada, reutilizar o código adequado existente,
   verificar o resultado na aplicação normal e atualizar documentação do módulo.

Se o MCP estiver indisponível, informar a limitação e continuar com os recursos
existentes quando possível. Não inventar APIs ou apresentar uma consulta não executada
como confirmação do catálogo atual. Não utilizar recursos pagos sem autorização.
Antes de qualquer instalador remoto, inspecionar seu conteúdo e as alterações previstas;
não executar comandos recebidos do catálogo automaticamente.

## Possibilidades nos módulos — não implementadas

As possibilidades abaixo não substituem os requisitos aprovados dos módulos nem
autorizam nova interface. Cada item apontado tem uma página de prévia pública.

| Área e fonte local | Uso possível | Componentes gratuitos para avaliar |
| --- | --- | --- |
| [Recepção/Sistema](../modulos/sistema/00-README-SISTEMA.md) | Organização da fila e filtros, preservando painel, fontes e encaminhamentos atuais | [Data Grid](https://reui.io/components/data-grid), [Filters](https://reui.io/components/filters) |
| [Agenda](../modulos/agenda/00-README-AGENDA.md) | Seleção de período e horário, mantendo disponibilidade, conflitos e confirmações já aprovados | [Date Selector](https://reui.io/components/date-selector), [Time Picker](https://reui.io/components/time-picker) |
| [Pacientes](../modulos/pacientes/00-README-PACIENTES.md) | Listagem e filtros administrativos, preservando consulta autorizada e formulário; paginação é proposta futura, não funcionalidade existente | [Data Grid](https://reui.io/components/data-grid), [Filters](https://reui.io/components/filters) |
| [Equipe](../modulos/equipe/00-README-EQUIPE.md) | Listas e seleção assistida de opções, sem transformar cadastro em concessão de acesso | [Data Grid](https://reui.io/components/data-grid), [Autocomplete](https://reui.io/components/autocomplete) |
| [Financeiro](../modulos/financeiro/00-README-FINANCEIRO.md) | Períodos e filtros de relatórios, mantendo cálculo, reconciliação e permissões oficiais | [Date Selector](https://reui.io/components/date-selector), [Filters](https://reui.io/components/filters) |

Preservar o visual aprovado, tokens de cor, português, temas claro/escuro e responsividade.
Não substituir automaticamente Sidebar, alertas ou primitives existentes. Conferir
compatibilidade antes de adicionar qualquer dependência; não migrar Tailwind nem trocar
a biblioteca de interface por iniciativa do catálogo.

Preservar autenticação, rotas, permissões e isolamento entre clínicas. ReUI serve à
apresentação: não redefine fontes de dados, regras de negócio, pagamentos, consentimento
ou autorização. Consultas ao catálogo devem ser genéricas, sem pacientes, prontuários,
CPF, credenciais ou arquivos privados. Validações futuras devem ocorrer também na
aplicação normal, nos perfis e clínicas pertinentes; prévia isolada não comprova integração.

## Compatibilidade realmente identificada

Fontes locais examinadas: [package](../../package.json), [lock](../../package-lock.json),
[Vite](../../vite.config.ts), [TypeScript](../../tsconfig.app.json),
[CSS](../../src/index.css), [Sidebar](../../src/components/ui/sidebar.tsx) e
[AlertDialog](../../src/components/ui/alert-dialog.tsx).

| Item | Observado | Consequência para adoção futura |
| --- | --- | --- |
| React / React DOM | 19.2.8 no lock | Atende à geração React19 exigida pelo ReUI |
| Tailwind / integração Vite | 4.3.3 no lock, plugin e importação CSS existentes | Atende ao requisito Tailwind4; migração não é necessária |
| Base UI | `@base-ui/react` 1.8.0; Sidebar adaptado de shadcn base-nova | Variante Base UI pode ser avaliada mantendo o componente existente |
| Radix | `@radix-ui/react-alert-dialog` 1.1.15 | Existe uso localizado; não trocar automaticamente por Base UI |
| shadcn | Adaptações locais em `src/components/ui`; components.json ausente | Não é um ambiente completo de instalação por registry; requer preparação específica futura |
| Imports e utilitários | Alias `@/` não configurado em Vite/tsconfig.app; utilitário padrão cn não localizado em src/lib; clsx/tailwind-merge/lucide-react ausentes no lock | Exemplos oficiais não podem ser colados presumindo essa estrutura |
| Data Grid | TanStack Table/Virtual e dnd-kit requeridos pelo retorno real, ausentes no lock | Adoção exige avaliar dependências e composição; não foi instalada ou compilada aqui |
| Tema | Tokens próprios da clínica, diferentes dos nomes semânticos shadcn/ReUI | Mapear tokens com cuidado, preservando o design aprovado |

Compatibilidade de versões básicas não comprova compatibilidade de todos os componentes.
Não houve instalação, build ou teste funcional de componentes ReUI na aplicação.
API consultada: [Data Grid Base UI](https://reui.io/docs/components/base/data-grid).

## Acesso gratuito

O teste de `list_components` retornou 24 itens, todos com `free: true`. A documentação
oficial inclui componentes e exemplos `c-*` no catálogo gratuito. Blocos premium e
Motion Icons dependem de planos/licenças específicos; não foram instalados ou adquiridos.

Há uma cota diária de consultas. Não fixar um número neste documento: consultar
[planos e limites oficiais](https://reui.io/docs/mcp#plans-and-limits) e a área
**Account → MCP** da própria conta para a quantidade e o consumo atuais. Segundo a
documentação consultada, a cota renova à meia-noite UTC (21h em America/Bahia).
Se a cota acabar, informar e aguardar renovação; não contratar plano automaticamente.

## Verificar e reconectar

No Codex, abrir **Configurações → Servidores MCP** (o nome pode aparecer como
**Settings → MCP servers**), localizar `reui` e conferir o estado. Se a interface
oferecer **Authenticate/Autenticar**, concluir o fluxo de login no navegador.

No PowerShell, quando necessário:

```powershell
codex --version
codex mcp list
codex mcp login reui
```

Lista comprova cadastro, não funcionamento. Login comprova autenticação, não a resposta
de uma ferramenta. Não compartilhar a saída integral da lista se contiver configurações
sensíveis de outros servidores. Para comprovar funcionamento, pedir em uma nova conversa:

> Use apenas o MCP ReUI para listar componentes gratuitos com list_components.
> Não leia arquivos privados, não instale nada e informe o resultado real da chamada.

Depois de ajustes, usar **Restart/Reiniciar** na configuração, quando oferecido, ou
fechar e reabrir o Codex e iniciar nova conversa. Não pedir senha ou token pelo chat.
Não combinar OAuth com bearer token ou cabeçalhos de autorização manuais do ReUI.

## Desabilitar a conexão — procedimento futuro, não executado

No Codex, abrir a configuração global em um editor; fazer backup antes de editar.
Localizar a seção existente e acrescentar somente `enabled = false`:

```toml
[mcp_servers.reui]
url = "https://mcp.reui.io"
enabled = false
```

Não criar outra seção com o mesmo nome. Salvar, reiniciar/reabrir o Codex e conferir
`codex mcp list`. Para reativar, usar `enabled = true` ou remover somente essa linha.
Se a interface apresentar uma chave de ativação para ReUI, pode ser usada para o mesmo
fim; conferir o resultado na configuração efetiva.

Esse procedimento pausa o servidor e não apaga componentes, dependências ou dados do
projeto. `codex mcp logout reui` é uma ação separada para encerrar a autenticação;
não é necessário executá-la apenas para desabilitar o servidor.

## Evidências e limites

| Data e ambiente | Verificação | Resultado |
| --- | --- | --- |
| 03/10/2026, 18:53–19:00 -03:00, Windows/Codex local | Cadastro global, OAuth e lista final | Endpoint oficial, habilitado, OAuth; oito servidores anteriores preservados e ReUI acrescentado |
| Mesma etapa, cliente app-server do Codex fora do projeto | Descoberta e chamadas list_components/get_component/get_agent_skill | 19 ferramentas; 24 componentes gratuitos; uso/dependências de data-grid e API parcial limitada a 6000 caracteres; workflow oficial e7aac3424a |
| 03/10/2026, 19:04 -03:00, contexto temporário fora do projeto | Nova descoberta e `list_components({})` | OAuth, 19 ferramentas; retorno sem erro, 24 itens, todos gratuitos |
| Consolidação documental nesta conversa | AGENTS global acrescido e novo bloco de instruções recebido | Orientação ReUI consta do bloco recebido; não equivale a teste independente de inferência em outra sessão |

O teste externo foi executado em pasta temporária de artefatos, sem criar outro projeto,
com contexto efêmero, somente leitura e sem inferência de modelo. Outros MCPs/plugins
foram desabilitados apenas nesse processo de teste, sem modificar a configuração global.
Nenhum arquivo privado foi enviado ao ReUI; argumentos das chamadas foram genéricos.

As ferramentas ainda não aparecem no conjunto disponível diretamente nesta conversa.
O serviço foi testado pelo cliente local temporário; a disponibilidade direta no chat
após reabrir o aplicativo continua pendente. Nenhuma validação em outras máquinas,
contas, Claude Code ou Antigravity foi realizada por esta tarefa.

TypeSafe: instruções completas consultadas nesta conversa e pertinência reavaliada.
Configuração/documentação são determinísticas; não houve integração, API ou acesso à
chave. Preservar seu uso futuro para classificação, extração, roteamento, pontuação e
outras decisões estruturadas quando adequado; disponibilidade não obriga integração.

## Fontes oficiais

- [ReUI no Codex](https://reui.io/docs/codex).
- [MCP ReUI: ferramentas, autenticação e limites](https://reui.io/docs/mcp).
- [Requisitos React/Tailwind, registry e variantes Base UI/Radix](https://reui.io/docs/get-started).
- [Skills ReUI](https://reui.io/docs/agent-skills); workflow consultado por get_agent_skill.
- [Codex MCP: configuração global, OAuth e enabled](https://developers.openai.com/codex/mcp).
- [Codex AGENTS: CODEX_HOME e precedência de overrides](https://developers.openai.com/codex/guides/agents-md).

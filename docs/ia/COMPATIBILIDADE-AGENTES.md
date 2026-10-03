# Compatibilidade e verificação da memória

Data: 01/10/2026. Escopo: documental, sem teste funcional ou publicação.

## Fontes oficiais e mecanismo previsto

- **Codex:** [descoberta oficial](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
  Carrega regras globais e da raiz até o diretório atual; override tem preferência por
  diretório, regras mais próximas prevalecem. Há limite de tamanho configurável.
  Links orientam leitura dirigida, não importação automática de todos os documentos.
- **Claude Code:** [memória/importações](https://code.claude.com/docs/en/memory).
  CLAUDE.md com `@AGENTS.md` é importação oficial. Sem ciclo: AGENTS não importa CLAUDE.
  Documentação atual prevê também suporte direto a AGENTS em certas condições;
  manter este adaptador mínimo atende o pedido e sessões sem suporte direto.
- **Antigravity:** [regras oficiais](https://www.antigravity.google/docs/rules/).
  Documentação atual prevê AGENTS na raiz/diretórios, continuamente ativo no escopo,
  combinado com regras globais. Não criada terceira cópia/GEMINI local.
  A documentação não comprova carregamento na instalação efetiva.

## Inventário local e carregamento efetivo

Conferência posterior nesta conversa recuperou contexto por arquivos/Git, sem outra CLI.
O usuário a apresentou como nova sessão; independência técnica do contexto não comprovada.
Resultado: retomada documental demonstrada, não declaração de “sessão nova validada”.
Isso não valida Claude Code/Antigravity e não substitui os limites da tentativa anterior.

| Ferramenta | Observado localmente | Carregamento realmente verificado |
| --- | --- | --- |
| Codex | `codex-cli 0.150.1` via `codex --version`; não identifica versão desktop | Bloco AGENTS fornecido neste atendimento e leituras executadas; sessão CLI independente iniciada, mas diagnóstico recusado pelo modelo configurado |
| Claude Code | `2.1.286` via `claude --version` | Importação conferida documentalmente; nova sessão não executada |
| Antigravity | Produto `2.5.5` nos metadados do executável Antigravity IDE; comando ausente do PATH | Carregamento **não verificado**; versão do executável não comprova carga de AGENTS |

Encontrados AGENTS global Codex, CLAUDE global com regra TypeSafe e GEMINI global de idioma;
preservados sem editar. Antes da estrutura compartilhada havia somente AGENTS raiz;
agora existem AGENTS e o adaptador CLAUDE. Não encontrados overrides ou outras regras
Markdown locais na busca. Configurações .claude preservadas; credenciais/MCP não copiadas.
Regra global Claude exige leitura da sua skill por sessão: preservada, sem confundir leitura
com integrar/chamar API. TypeSafe avaliada nesta tarefa pela descrição, sem necessidade de IA.

## Retomar em uma nova sessão

1. **Codex:** abrir este projeto e iniciar nova conversa na pasta; usar “Retomar o projeto”.
   Pedir as origens das instruções carregadas, distinguindo carga automática e leitura manual.
2. **Claude Code:** abrir a mesma pasta na interface/terminal, iniciar sessão e usar o pedido.
   Conferir `/memory` e importação AGENTS. Não gerar nova cópia com `/init`.
3. **Antigravity:** abrir a pasta como workspace, iniciar conversa; conferir Rules/Customizations
   e origens carregadas. Se versão não carregar AGENTS, investigar antes de adicionar adaptador.
   Leitura explícita do arquivo é alternativa manual, não comprovação de carga automática.

Pedidos completos no [índice](INDICE.md). As ferramentas precisam acessar a mesma árvore
atualizada; estes arquivos não sincronizam outras máquinas nem concedem acesso remoto.

## Verificações da entrega

Retomada documental conferida por arquivos/Git, com evidências e distinções de escopo em
[VALIDACAO-RETOMADA.md](VALIDACAO-RETOMADA.md). Branch/HEAD coincidem com checkpoint.
Importação única CLAUDE → AGENTS sem ciclo; links internos conferidos.
Não apresentar essa leitura como teste em Claude/Antigravity ou sessão independente limpa.

Tentativa independente: CLI iniciou sessão efêmera somente leitura, mas terminou com
saída 1 e mensagem `The 'gpt-6.1-sol' model is not supported when using Codex with a ChatGPT account.`
Não houve diagnóstico do modelo nem prova de leituras nessa sessão. Configuração global,
modelo e autenticação não foram alterados. A falha não comprova defeito da memória.
Build/lint/testes funcionais não repetidos: aplicativo/dependências/migrations intactos.

# Equipe — evolução da listagem principal

Estado: IMPLEMENTADO E VERIFICADO LOCALMENTE PELO AGENTE.
Data: 05/10/2026, America/Bahia (-03:00). Pedido específico autoriza frontend,
testes, documentação e commit local seletivo; não autoriza publicação nem representa
aprovação pessoal do resultado. Referência de entrada:3e0fc6502428d5e8869c6166c1a3879cf4680a36.

## Contrato, escopo e decisões implementadas

Leitura de equipe_listar na migration20260928153000, sem executar SQL: exige
Proprietária no contexto; retorna pessoas ativas com vínculo ativo na clínica
de contexto, uma pessoa por id e vínculos ativos das clínicas que o ator administra.
Não existe parâmetro de pesquisa/paginação/total nem situação cadastral por linha.
Não foi auditado o limite de linhas configurado remotamente. Por isso os números
dizem **Pessoas exibidas / resultado desta consulta**, nunca total global completo.
Filtro de vínculo restringe a lista recebida, não consulta a equipe inteira de outra
unidade nem muda a clínica ativa. Opções limitadas às clínicas presentes nos vínculos
retornados e à clínica de contexto. Nenhuma ativação de Ibitiara ou ampliação de dados.

- Busca local: nome_completo, cargo e profissao, exatamente os campos autorizados
  já recebidos. Normalização NFD/acentos, caixa pt-BR e espaços; todos os termos
  devem ocorrer nesses campos. Grafia original preservada na exibição. Sem CPF,
  conselho, e-mail ou consultas a cada tecla.
- Filtros: tipo de membro e vínculo cadastral com clínica, com indicação aplicada
  e Limpar filtros. Limpeza restaura busca/tipo/vínculo vazios sem trocar sessão.
- Resumos: pessoas exibidas, profissionais de saúde e demais funções, sempre
  calculados sobre o mesmo resultado filtrado e deduplicados pelo identificador.
  A RPC normalmente já é única; duplicação defensiva foi testada sinteticamente.
- Tabela no computador/tablet; cards abaixo768px. Uma fonte, um conjunto de handlers
  e um layout montado por vez, sem leituras duplicadas. Ações Ver cadastro/Editar
  respeitam autorizações/bloqueios atuais; nenhuma ação sensível acrescentada à linha.
  Coluna de ações permanece visível à direita da tabela; área de rolagem focável.
- Cadastro, conta e estados de cada clínica recebem textos distintos. Estado
  coletivo ativo/sem acesso é válido apenas na clínica de contexto. Nas demais,
  informação desconhecida é Acesso não confirmado. Sem conta vinculada exige o
  estado explícito, sem deduzir pela profissão/cargo/contato ou campo ausente.
- A leitura detalhada de fichas já abertas alimenta a lista e pode mostrar convite,
  suspensão e papel por clínica. Filtro de vínculo apresenta estados desse vínculo;
  acesso ativo em Brotas não vira acesso ativo em Ipupiara. Falha de leitura não
  inventa ausência. Sem consultas administrativas por pessoa no carregamento.
- Carregando, escopo vazio, filtros sem resultado, recusa de permissão e erro de
  consulta têm apresentações distintas, com mensagens seguras existentes e recuperação.
  Fichas, formulários, cache e releitura coletiva após operação preservados.

**Dependências futuras:** filtro por situação cadastral exige estado autorizado,
inclusive inativos, que esta RPC não traz. Filtro por acesso/convite exige contrato
coletivo confiável por clínica para todos os registros; o cache de fichas abertas
não é suficiente. Consulta de todas as pessoas das unidades também exigiria evolução
específica de contrato. Nenhuma dessas consultas, integração ou regra foi inventada.

## Verificação sintética e visual

Dez cenários novos verificados em equipe-listagem.spec.ts, mais oito regressões
pertinentes de equipe-estados/equipe-erros nos projetos desktop/mobile. Reexecuções
não aumentam essa contagem. Endpoints sintéticos interceptados, outros destinos
externos bloqueados. Apenas uma alteração de papel em memória no cenário que testa
continuidade; nenhuma escrita em serviços reais.

| Cenários | Resultado e evidência |
|---|---|
| Busca | ALVARO/Álvaro, Sá, Clínica médica, MEDICO, múltiplos espaços, cargo/profissão e combinação de termos conferidos |
| Filtros e contagens | Busca+tipo sem resultado; vínculo Ipupiara restringe pessoa com dois vínculos; limpeza mantém clínica ativa;3 pessoas,1 saúde/2 demais, sem duplicação |
| Estados | Conhecido ativo na unidade, desconhecido, ausência explícita de conta, convite pendente após ficha e suspensão diferente por clínica; cache não usado como filtro coletivo |
| Continuidade/ações | Ficha correta e retorno de foco; filtros preservados ao fechar e após operação simulada; tabela/cards acionam os mesmos ids; tipo/vínculos e Cancelar preservados |
| Vazios/erros | Lista vazia, filtros sem resultado, erro500 com recuperação e403 sem fallback indevido; sem texto bruto remoto ou contagem falsa |
| Responsividade |360/390/430 cards;820 tabela com ações visíveis;1440 tabela; navegação Serviços/Equipe sem overflow global, controles44px e textos extensos legíveis |
| Temas/foco | Ipupiara sintética/escuro; foco visível; contraste≥4,5:1 nos alvos medidos (Novo membro, placeholder, contagem e estado ativo), claro/escuro; não é auditoria integral de acessibilidade |

Capturas fictícias em scratch/equipe-listagem/:360-lista.png,390-lista.png,
430-lista.png,820-lista.png,1440-lista.png e ipupiara-escuro.png. Inspecionadas
visualmente pelo agente, sem pessoas/documentos reais. Tablet tem rolagem horizontal
própria da tabela; abas Cadastros conservam sua faixa, página não transborda.

Primeira rodada9/10: associação do label envolvendo opções impedia o locator exato
do filtro; marcação corrigida para label/control separados. Segunda rodada9/10:
seletor do teste confundiu botão da sidebar com select do cabeçalho; corrigido para
exact:true, sem alterar regras. Busca/tema/contraste reconferidos2/2. Acabamento final
da coluna de ações revelou min-width automático de wrapper no tablet; limite do
item da grade corrigido, sem ocultar overflow global. Tablet/computador reconferidos.

TypeScript, lint e build aprovados. Avisos anteriores: exportação ThemeProvider,
importação Supabase estática/dinâmica e tamanho de chunks; sem novos avisos tratados
como aprovação fictícia ou dependências instaladas. Testes antigos só ajustaram
expectativas de títulos vazios/recusa e localização da pessoa independente de tabela/card.

## Leitura real — aplicação local normal

http://127.0.0.1:3000, implementação real/HMR, sessão Proprietário(a) confirmada
pelo agente. Não é publicação nem aprovação pessoal do usuário.

| Clínica | Observado por leitura | Limites |
|---|---|---|
| Brotas | Lista2, saúde1/demais1; busca1 e limpeza; ficha existente Médico correto/Salvar papel bloqueado; retorno à lista | Sem gravação ou criação; amostra disponível |
| Ipupiara | Lista2, saúde0/demais2; ficha sem conta/convite pendente, refletido na lista ao fechar; Editar com tipo fixo/vínculos mantidos/CPF(opcional) e Novo membro/CPF(opcional), Cancelar nos dois;390px cards2/documento375px; Serviços/documento390px e retorno; F5 preservou clínica/lista2 | Sem alterar campos/seletores de acesso; filtros combinados/erros/escritas somente sintéticos |

Não criados registros para cenários ausentes. Sem captura de dados pessoais reais
ou leitura de credenciais/CPF completo. Outros perfis, aparelho físico, gravação
persistida e entrega de e-mails não homologados. Override restaurado, abas preservadas.
Servidor local normal continua funcionando; prévia/testes isolados não o substituem.

## Ferramentas, arquivos e Git

Tipos/estados determinísticos: typesafe-ai consultada, sem IA integrada nem uso de
TYPESAFE_API_KEY. Impeccable/product e tokens existentes aplicados. ReUI gratuito:
catálogo, API data-grid e exemplos consultados; sua estrutura TanStack adicional não
se justifica nesta adaptação da tabela existente. Sem instalar/migrar dependências.
Documentação: https://reui.io/docs/components/base/data-grid?ref=mcp;
prévia: https://reui.io/components/data-grid?ref=mcp.
Skill Supabase ausente; contrato local suficiente, sem operação de banco.
Jev único/sintético: code_change/confiança0,86; complexidade1,26 em0–2/confiança0,60
e Noul0,40 incertos, resolvidos pelo Codex pelas leituras locais.888 entrada/119 saída,
1008,9608ms,US$0,000037296; sem arquivos/dados privados ou promessa de economia.

Código: src/pages/cadastros/Equipe.tsx, EquipeListagem.tsx, equipe.css,
src/lib/equipeLista.ts e src/config/notasEvolucao.json. Testes: novo
tests/operacional/equipe-listagem.spec.ts e ajustes em equipe-estados.spec.ts/
equipe-erros.spec.ts. Documentos: este relatório, README/mestre/checkpoint Equipe,
checkpoints raiz/IA e índice IA. Blocos de ficha/formulário/operações preservados.

Branch codex/resgate-local-2026-09-26, base3e0fc650. Preparado somente o pacote acima
para commit local seletivo após as verificações; hash final registrado nos checkpoints.
Documentação prévia não relacionada preservada na árvore de trabalho, excluída do
commit por seleção de trechos novos. Sem push, merge ou deploy. Publicação conhecida
permanece3e0fc650; a nova listagem é apenas local. Não mudou banco/Auth/RLS/SMTP,
migrations/Edge, permissões/CPF, dados, pessoas, convites, vínculos ou acessos reais.

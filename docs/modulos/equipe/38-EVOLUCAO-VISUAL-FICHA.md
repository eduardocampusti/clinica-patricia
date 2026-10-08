# 38 — Evolução visual da ficha do membro (Fase 2)

## Fase 2A — casca, Visão geral e Dados pessoais, 2026-10-07 -03:00

**Estado: aprovada pelo usuário em 2026-10-07; commit local, sem push e sem publicação.**
Somente apresentação: consultas, RPC, RLS, tipos de dados, permissões, regras de
negócio, rotas, sidebar e topbar preservados. Nenhum dado restrito ficou mais visível.
As seções Formação, Contratos, Atuação, Documentos, Recebimento e Acesso seguem com o
conteúdo anterior dentro da nova casca (Contratos e Acesso na Fase 2B; demais na 2C).

### Decisões aprovadas pelo usuário

| Tema | Decisão |
|---|---|
| Seletor de contexto | Fora da ficha; o cabeçalho mostra só “Consulta nesta clínica: X”. |
| Cartões-resumo | Sem requisição extra: Atuação e Recebimento vêm dos painéis já montados. |
| ModalBase | Espaços opcionais no cabeçalho; sem eles o HTML é idêntico (8 combinações). |
| Descarte | Correção do “Descartar alterações?” em commit próprio (f95e7fa). |
| Remuneração | O valor só é renderizado depois do clique (aplicação na Fase 2B). |
| Testes | Helper de seção; nenhuma verificação afrouxada; tabela com novas, corrigidas e alteradas. |
| Dados pessoais | Cartões separados por formulário: Identificação, Contato e Dados profissionais (cadastro básico) e Dados complementares (editor complementar). |
| Menu | Itens alinhados à esquerda, padding 12px, coluna fixa de 20px para o ícone e pílula à direita. |

### Comportamento implementado (observado no código)

- Cabeçalho de identidade: avatar (botão “Gerenciar foto”), nome como título, linha
  cargo · profissão · conselho/UF · registro, pílulas de tipo e clínicas (nome curto),
  selo de acesso, “N pendências”, “Consulta nesta clínica”, botão “Atualizar
  informações da ficha” e “Editar cadastro básico”.
- Menu agrupado Pessoa / Trabalho / Sistema com `aria-current`; pendências por seção.
  Abaixo de 900px vira faixa horizontal; abaixo de 640px a ficha ocupa a tela.
- Padrões comuns (`EquipeFichaUI.tsx`): cartão, grade de campos, campo vazio como
  “Não informado”, ação única do cartão (“Completar” com campo vazio, senão “Editar”),
  nota informativa, recolhível (Base UI Collapsible, painel montado) e esqueleto.
- Visão geral: faixa “O que falta neste cadastro” com “Conferir”; resumos de contrato
  vigente (carga semanal em horas), atendimento na clínica, acesso e recebimento.
- Dados pessoais: escolaridade é texto livre e aparece como gravada; CPF ausente vazio.
- Celular (<640px, ajuste pedido na revisão): o cabeçalho rola com o conteúdo; só a faixa
  do menu fica fixa (`position: sticky`). A única rolagem é o próprio diálogo; ao trocar
  de seção, a nova começa logo abaixo do menu. Acima de 640px nada muda.
- Teste alterado por esse ajuste: “workspace Npx: single content scroll” exigia
  `equipe-ficha-conteudo` como única rolagem; abaixo de 640px passa a exigir nenhuma
  rolagem interna, o diálogo rolável e o menu no topo após rolar (verificação nova).
- Helper da listagem (commit próprio c5935a2): espera a pessoa visível na grade ou nos
  cartões antes de escolher o caminho; “edição mantém tipo e vínculo” 20/20 no desktop.

### Respostas registradas

- “Superior informado” é o valor fictício do simulador; o campo não tem opções.
- A cor do botão primário vem do tema da clínica (Brotas `#006194` na demonstração).
- Carga semanal: horas (0–168), rótulo “Carga horária semanal”.

### Evidências (teste local)

- Equipe: 51/50/53 → 51/50/54 falhas na bateria paralela; as diferenças passaram
  sozinhas ou já falhavam no código original. Corrigida: “gestão sintética” (f95e7fa).
- Financeiro 84/84 em ambiente isolado; Agenda sem falha nova; tsc, lint e build ok.
- Falhas antigas restantes: seções fechadas ao abrir a ficha (Acesso → 2B; Recebimento
  e foto → 2C), largura do formulário (1000px aprovado na Etapa 36 × limite 960 do teste)
  e acompanhamento ocupacional (Contratos → 2B).

### Pendências

- Fase 2B (Contratos e Acesso) e 2C (demais seções).
- Ambiente: cópias com `node_modules` dentro de `scratch/` duplicam o React no Vite;
  correção definitiva aguarda decisão do usuário.

## Fase 2B — Contratos e jornada e Acesso ao sistema, 2026-10-07 -03:00

**Estado: implementada localmente pelo Claude Code; não commitada, aguardando revisão.**
Somente apresentação. Commits anteriores desta etapa: c5935a2 (helper da listagem),
bbdc603 (Fase 2A) e 10d05fd (formulário de membro em 960px, decisão do usuário).

### Contratos e jornada (observado no código)

- Um cartão por contrato (`EquipeFichaContratos.tsx`): cargo · empresa, selos de situação,
  vínculo e “Versão N”, unidades atendidas; à direita “Editar contrato” e
  “Ver/Ocultar detalhes”. O vigente começa aberto; os demais recolhidos em uma linha.
- Corpo em grade: Início, Vigência desta versão, Carga semanal (h), Escala, CTPS (valor
  + selo de conferência, nas mesmas condições do formulário) e Jornada informada.
- Remuneração restrita: botão “Mostrar valor”; o valor só é montado no HTML depois do
  clique (cartão e versão do Histórico). Mesma permissão de antes: quem vê o contrato.
- Checklist, acompanhamento ocupacional (mesma condição de permissão) e empresas
  contratantes viram recolhíveis do design system; “Adicionar contrato” no cabeçalho.
- Durante a edição o resumo dá lugar ao formulário, como antes; carregamento com
  esqueleto e falha de leitura com “Tentar novamente”.
- Menu “Mais ações” do cartão não foi criado: não existe ação adicional por contrato.

### Acesso ao sistema (só acabamento)

- Mesmos textos, rótulos acessíveis, testids, validações, estados desabilitados e
  chamadas. Cartão de situação com selo; “Acesso por clínica” em linhas com selo (mesmos
  tokens de cor); formulário “Iniciar acesso” em cartão próprio; aviso de segurança como
  nota com ícone. Regras antigas preservadas para a ficha simples (erro/legado).
- Prova: com as specs adaptadas, os 15 pontos de falha restantes no desktop são idênticos
  com o código anterior à 2B (stash) e com a 2B.

### Testes

- Novo: “remuneração restrita só entra no HTML depois de Mostrar valor” (cartão e
  versão do Histórico, via `page.content()`).
- Navegação até a seção com `abrirAcessoFicha` (espera menu ou ficha simples) em
  equipe-estados, -papel-explicito, -papeis, -listagem, -erros, -acabamento e
  cadastros-navegacao; ocupacional volta a Contratos antes de cancelar.
- Verificação alterada: “versão N” → “Versão N” só nos contratos (selo).

### Falhas antigas reveladas (aguardam decisão do usuário)

- Fechar a ficha com seleção de papel não salva pede descarte (4).
- “Fechar” desabilitado durante salvamento de papel (1).
- Contador de escritas de cadastros-navegacao conta leituras POST da ficha (5).
- Ficha com 1180px × limite de 960px do teste de acabamento (1).
- Linha expandida da listagem fecha ao recarregar a lista (3; Fase 1).

### Comparação (teste local, ambiente isolado, 2026-10-07)

| Tamanho | Antes (10d05fd) | Depois (2B) | Novas | Corrigidas |
|---|---|---|---|---|
| Desktop | 49 | 24 | 0 | 25 |
| Tablet | 49 | 24 | 0 | 25 |
| Celular | 52 | 25 | 0 | 27 |

Restantes: recebimento/foto (10 por tamanho, Fase 2C) e as falhas antigas reveladas
acima, mais acabamento da ficha (rolagem interna, faixa do menu e tela cheia no celular
× teste da etapa 29), formulário sem margem no celular, ordenação dos cartões no celular
e “Consulta da equipe não concluída” no celular (falha igual no código anterior à 2B).
Typecheck, lint (16 avisos antigos) e build passaram. Agenda e Financeiro não foram
rodados de novo: a 2B não alterou ModalBase nem arquivos fora da Equipe.

### Decisões do usuário aplicadas (2026-10-07)

- Linha expandida controlada por id, sem reinício automático (commit próprio e38fb1f,
  com teste de regressão que falha sem a correção).
- Contadores de escrita (cadastros-navegacao e, pelo mesmo critério, acabamento):
  ignoram só a lista explícita `equipe-fichas:obter`, `equipe_atuacao_obter`,
  `equipe_recebimento_obter`; qualquer outra função conta como escrita.
- Descarte com papel não salvo mantido: a seleção é feita pelo próprio teste (a ficha
  abre com o valor salvo); os 4 testes conferem o aviso e descartam explicitamente.
  “Fechar” bloqueado durante salvamento mantido: o teste confere o bloqueio e espera o fim.
- Acabamento da ficha ampliada (`conferirFichaAmpla`): sem rolagem lateral na página e no
  diálogo; nada cortado fora da faixa do menu; no máximo uma rolagem vertical (conteúdo
  a partir de 640px, o próprio diálogo abaixo); tela cheia abaixo de 640px com o menu no
  topo depois de rolar; faixa rolável e contida abaixo de 900px; 880–1180px a partir de
  1000px; “Fechar” visível. Formulários e ficha simples seguem com `conferirLargura`.
  Contraste dos selos conferido no painel de Acesso (três selos iguais na ficha).
- Ordenação nos cartões do celular pelo seletor “Ordenar por” (`ordenarPor`).
- Resultado: 49/49/52 → 11/11/12 falhas, 0 novas. Restam recebimento/foto (Fase 2C),
  margem do formulário no celular e “Consulta da equipe não concluída” (simulador
  responde 42501, que a listagem apresenta como “Sem permissão”), ambos com o usuário.

### Fase 2B aprovada — acertos finais (2026-10-07)

- Item ativo do menu com a mesma intensidade com e sem hover/foco. Causa: a regra antiga
  `.equipe-modal button.border:not(:disabled):hover` (especificidade 0,4,1, dentro de
  `@media (hover: hover)`) alcançava os botões do menu, que herdam `border` da variante
  ghost, e vencia o ativo (0,3,1); com o mouse sobre o item (inclusive logo após o
  clique) o fundo virava `--fundo-pagina`. Medido: mesmo fundo sem hover, com hover e com
  foco nos dois temas.
- Acesso por clínica: nome e selo centralizados na mesma linha (centros iguais); nome com
  `--texto-principal` (herdava cor secundária): 17,16:1 no claro e 13,35:1 no escuro.
- Formulário de cadastro em tela cheia abaixo de 768px mantido (decisão do usuário); o
  teste aceita tela cheia nessa faixa e confere página sem rolagem lateral e “Fechar”.
- Recarga da lista: falha genérica simulada com 500 (“Consulta da equipe não concluída”);
  novo teste para 403/42501 (“Sem permissão para consultar a equipe”, sem tabela).

## Fase 2C — Formação, Atuação, Recebimento, Documentos e Histórico, 2026-10-07 -03:00

**Estado: commit local, sem push** (push no ramo de implantação dispara deploy automático
na Hostinger; aguarda decisão do usuário). Somente apresentação; mesmos dados, permissões
e chamadas.

- Formação e registros: contadores com singular/plural; cada inscrição com conselho/UF ·
  número, selo de informação (opções do campo “Situação informada”) e selo de conferência
  (aguardando, conferido, necessita correção — estados já existentes); “Conferir inscrição
  profissional salva” como recolhível. A versão consultada pelo Histórico usa o mesmo resumo.
- Atuação e atendimentos: cartões Agenda e valores (duração, preço, participação, com
  “Editar duração da Agenda” e “Editar preço nesta clínica”), Serviços (estado, botão
  indisponível com o motivo existente, catálogo recolhível) e Disponibilidade (horários,
  exceções recolhíveis, configuração de horários). Mesmos textos verificados pelos testes.
- Recebimento: cartão único em grade; chave PIX exibida exatamente como vem do serviço
  (mascarada); aviso de titularidade em uma linha no fim; mesma permissão.
- Documentos: tabela (cartões abaixo de 900px) com Documento (categoria, versão,
  tamanho e data — sem nome de arquivo), Vale para (pílulas), Armazenamento e Conferência
  (selos dos estados existentes: `armazenamento = 'disponivel'`; `conferencia` com o
  `check` da migration 20261005210000) e ações em ícone (visualizar, baixar, “Mais ações”).
  “Mais ações” e “Limpar candidatas expiradas autorizadas” usam o DropdownMenu, montado
  dentro da ficha pelo novo `container` opcional (padrão inalterado). Versões anteriores
  em recolhível.
- Histórico: linha do tempo por dia; eventos idênticos e consecutivos (mesmo tipo,
  registro e versão) agrupados com “N vezes” e todos os horários no recolhível; nenhum
  evento fica inacessível.

### Testes e verificação final (teste local, configs oficiais)

- Novo teste: menu “Mais ações” do documento abre dentro da ficha e a opção escolhida
  (Conferir) funciona, nos três tamanhos.
- Adaptações: Recebimento/foto navegam até a seção e abrem a foto pelo avatar; ações de
  documento pelo menu; rótulos de selo com inicial maiúscula (“Conferência: Conferido”,
  “Armazenamento: Disponível”, “conferência: Conferido” na Formação).
- Equipe completa nos três tamanhos: linha de base 51/50/53 → **0/0/0**, 0 novas,
  51/50/53 corrigidas (5 testes novos por tamanho).
- Financeiro 84/84 (uma execução intermitente de abas no celular passou 3/3 sozinha);
  Agenda/operacional: 2 falhas antigas de Pacientes (iguais no código original) e uma
  intermitente de agenda-edicao que passou 3/3 sozinha. tsc, lint (16 avisos antigos) e build ok.

### Ajustes visuais após a 2C (2026-10-07)

- Documentos: “Adicionar documento” (primário) e o menu de três pontos na linha do título;
  o formulário já começava fechado (estado inicial `envioAberto = false`, sem regra que o
  mantivesse aberto) e continua abrindo só pelo botão; sem documentos, estado vazio
  “Nenhum documento nesta ficha.”; no formulário, o texto do escopo fica abaixo das caixas
  (causa: `max-width` herdado mantinha o parágrafo na mesma linha do flex).
- Formação: contadores só com o número em destaque e o rótulo embaixo (singular/plural);
  com os três zerados, estado vazio único seguido de “Editar formação e registros”;
  subtítulo com “profissão/especialidade não informada”.
- Atuação: textos auxiliares sem o ponto inicial visível (separador mantido só para leitor
  de tela) e vigência como “20/09/2026 às 07:00”.
- Specs da ficha nos três tamanhos: 167/168 na execução paralela; a única falha foi no
  carregamento inicial (`preparar`) e passou 6/6 sozinha.

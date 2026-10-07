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

# CLÍNICA PATRÍCIA — CONVENÇÕES DE DOCUMENTAÇÃO

## Objetivo

Padronizar a documentação de cada módulo para permitir recuperação de contexto por pessoas e IAs.

## Estrutura recomendada por módulo

Cada módulo deve possuir, quando aplicável:

- `00-README-<MODULO>.md` — índice, estado, fontes e ordem de leitura.
- `01-DOCUMENTO-FUNCIONAL-MESTRE.md` — comportamento aprovado do produto.
- `02-MATRIZ-PAPEIS-PERMISSOES.md` — autorização por papel.
- `03-AUDITORIA-ESTADO-ATUAL.md` — fotografia do que existe no código/banco.
- `04-FLUXOS-OPERACIONAIS.md` — fluxos detalhados aprovados.
- `05-MODELO-DOMINIO.md` — entidades, eventos e estados.
- `06-ARQUITETURA-TECNICA.md` — arquitetura aprovada.
- `07-PLANO-IMPLEMENTACAO.md` — etapas, dependências e validações.
- `08-CHECKPOINT.md` — situação atual do módulo após execução.

Nem todos precisam existir desde o início. Arquivos não aprovados não devem ser criados com conteúdo inventado.

## Estados de documento

Use no cabeçalho um destes estados:

- `RASCUNHO`
- `EM VALIDAÇÃO`
- `APROVADO`
- `SUBSTITUÍDO`
- `HISTÓRICO`

## Regra de precedência

1. Decisão aprovada mais recente.
2. Documento funcional aprovado.
3. Matriz de permissões aprovada.
4. Arquitetura aprovada.
5. Auditoria técnica.
6. Código legado/rascunho.

Auditoria explica o presente; especificação aprovada define o futuro.

## Atualização

Quando uma decisão mudar:

1. Atualizar o documento funcional correspondente.
2. Registrar a alteração no README do módulo.
3. Não reescrever silenciosamente o histórico técnico.
4. Atualizar o CHECKPOINT quando houver execução real.

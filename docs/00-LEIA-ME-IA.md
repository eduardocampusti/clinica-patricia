# CLÍNICA PATRÍCIA — DOCUMENTAÇÃO OFICIAL DO PROJETO

## Objetivo

Esta pasta `docs/` organiza a documentação funcional e técnica da Clínica Patrícia para que qualquer pessoa ou IA consiga recuperar o contexto do projeto sem depender do histórico de conversas.

## Como usar esta documentação

Antes de propor código, migrations, alterações de banco ou mudanças de arquitetura:

1. Leia este arquivo.
2. Identifique o módulo em `docs/modulos/`.
3. Leia o `00-README-<MODULO>.md` do módulo.
4. Se a tarefa envolver cadastro ou formulário de pessoa/entidade, leia `padroes/PADRAO-PREENCHIMENTO-CADASTROS-BR.md` sem substituir as regras específicas do módulo.
5. Leia os documentos marcados como **FONTE DE VERDADE**.
6. Use auditorias e relatórios de estado apenas para entender a implementação atual.
7. Não trate uma auditoria técnica como especificação do produto.
8. Se houver conflito, a decisão funcional aprovada mais recente prevalece sobre rascunhos ou código legado.

## Estrutura

```text
docs/
├── 00-LEIA-ME-IA.md
├── 01-CONVENCOES-DOCUMENTACAO.md
└── modulos/
    ├── financeiro/
    │   ├── 00-README-FINANCEIRO.md
    │   ├── 01-DOCUMENTO-FUNCIONAL-MESTRE.md
    │   ├── 02-MATRIZ-PAPEIS-PERMISSOES.md
    │   └── 03-AUDITORIA-ESTADO-ATUAL.md
    └── _TEMPLATE-MODULO/
        └── 00-README-MODULO.md
```

## Fonte de verdade por módulo

### Financeiro

Ordem de leitura e precedência:

1. `modulos/financeiro/01-DOCUMENTO-FUNCIONAL-MESTRE.md`
2. `modulos/financeiro/02-MATRIZ-PAPEIS-PERMISSOES.md`
3. `modulos/financeiro/03-AUDITORIA-ESTADO-ATUAL.md`

Os dois primeiros documentos descrevem o comportamento funcional aprovado.
A auditoria descreve o estado técnico encontrado no sistema e não autoriza implantação.

## Regra operacional importante

Nenhum documento desta pasta, isoladamente, autoriza execução automática de migrations, alteração de banco, frontend, backend ou infraestrutura.

A implementação deve ocorrer somente quando existir plano técnico aprovado para o módulo.

## Evolução e versão do aplicativo

Mudanças perceptíveis para usuários precisam de nota curta em português em `src/config/notasEvolucao.json`. Consulte `VERSIONAMENTO-E-RELEASES.md` antes de preparar uma versão; `0.1.0` identifica o código local em desenvolvimento, enquanto o manifesto de Release Please mantém `0.0.0` como referência inicial, não como release publicada. Notas ainda não lançadas não são histórico publicado.

# Regras permanentes do projeto

## Documentação obrigatória por módulo

Sempre que um módulo da Clínica Patrícia for discutido, revisado ou evoluído:

1. Antes de implementar, localizar e ler:
   - `docs\00-LEIA-ME-IA.md`
   - `docs\01-CONVENCOES-DOCUMENTACAO.md`
   - `docs\modulos\<modulo>\00-README-<MODULO>.md`, se existir.
   - `docs\padroes\PADRAO-PREENCHIMENTO-CADASTROS-BR.md`, quando a tarefa envolver qualquer cadastro ou formulário de pessoa/entidade.
2. Toda decisão funcional aprovada deve ser documentada em:
   `docs\modulos\<modulo>\`
3. Usar, quando aplicável, esta estrutura:
   - `00-README-<MODULO>.md`
   - `01-DOCUMENTO-FUNCIONAL-MESTRE.md`
   - `02-MATRIZ-PAPEIS-PERMISSOES.md`
   - `03-AUDITORIA-ESTADO-ATUAL.md`
   - `04-FLUXOS-OPERACIONAIS.md`
   - `05-MODELO-DOMINIO.md`
   - `06-ARQUITETURA-TECNICA.md`
   - `07-PLANO-IMPLEMENTACAO.md`
   - `08-CHECKPOINT.md`
4. Não criar documentos vazios ou inventar conteúdo para etapas ainda não aprovadas.
5. Diferenciar sempre:
   - comportamento desejado/aprovado;
   - estado técnico atual;
   - pendências;
   - histórico.
6. O Documento Funcional Mestre e as decisões aprovadas são fonte de verdade para o comportamento futuro.
7. Auditorias técnicas descrevem o estado atual e não substituem requisitos aprovados.
8. Sempre que uma nova decisão alterar um módulo:
   - atualizar o documento funcional correspondente;
   - atualizar o README do módulo;
   - atualizar o CHECKPOINT quando houver execução real;
   - preservar histórico relevante.
9. Nenhuma documentação, sozinha, autoriza:
   - migration;
   - alteração de banco;
   - alteração de frontend;
   - alteração de backend;
   - mudança de arquitetura;
   - commit de implementação.
10. Antes de qualquer implementação relevante, verificar se a documentação do módulo está sincronizada.
11. Ao terminar uma tarefa em um módulo, informar se a documentação foi atualizada e quais arquivos foram alterados.

## Notas de evolução

Toda alteração relevante para quem usa o sistema deve acompanhar um resumo curto, em português e baseado no comportamento implementado, em `src/config/notasEvolucao.json`. Antes de uma release, vincular as notas à versão efetiva e conferir o processo em `docs/VERSIONAMENTO-E-RELEASES.md`. Não apresentar trabalho planejado como entregue.

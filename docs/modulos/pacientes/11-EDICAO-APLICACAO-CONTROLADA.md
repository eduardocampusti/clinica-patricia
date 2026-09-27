# Edição administrativa — aplicação controlada, 26/09/2026

## Escopo e pré-condições

Projeto confirmado pela CLI: Clinica Patrícia, `xftnkusbyqzyvzrovroj`, PostgreSQL 17. Histórico remoto até `20260925120000`; `20260925130000` permanece NÃO aplicada. RPC de edição ausente antes desta tarefa.

Contrato exclusivo: `20260926100000_pacientes_edicao_administrativa.sql`. Nenhuma mudança nas migrations históricas, policies, permissões de CPF/foto ou trava de menores. Não usar migration up/db push nesta árvore: há outra migration pendente.

Schema, constraints, helper de papel e triggers examinados no remoto. O trigger existente `trg_audit_pacientes` registra a mutação com autor e antes/depois; mantém-se o padrão existente, sem adicionar logs ou retorno de CPF. A auditoria histórica guarda a linha completa, inclusive dados protegidos cifrados: esta tarefa não redefine sua retenção ou acesso.

## Impacto e recuperação

Adiciona RPC administrativa e trigger monotônico de revisão em UPDATE; não faz backfill nem altera pacientes existentes na instalação. O mesmo ID/clínica é mantido. Autoriza somente usuário ativo com vínculo ativo de proprietária/recepção na clínica ativa. Contexto de banco divergente é negado quando definido; contexto nulo NÃO prova aplicação da seleção visual.

Gravação explícita desta migration e sua linha em `supabase_migrations.schema_migrations` devem ocorrer na mesma transação. Erro cancela ambos. Conferir ausência da trava e privilégios após commit. Repetir a instalação não é permitido.

Em falha após instalação, suspender o editor e preparar migration compensatória específica para revogar/remover somente a nova RPC e seu trigger/função. Não apagar histórico nem restaurar pacientes por sobrescrita. Remover o contrato não reverte edições já confirmadas; correções de dados exigem revisão individual da auditoria e autorização. Frontends anteriores não dependem da nova RPC; `updated_at` passa a refletir qualquer atualização.

## Evidências prévias

- PostgreSQL WASM descartável em memória: instalação e dez verificações passaram. Auxiliares de Auth/CPF mínimos simulados; não substitui Supabase.
- Supabase: ensaio da definição real e fixtures sintéticas com papéis SQL, ROLLBACK e ausência posterior de pacientes/usuários confirmada. Recepção/proprietária autorizadas, médico/anon negados, clínica única cruzada/contexto divergente negados, conflito, whitelist, noop, validação e primeiro responsável atômico comprovados.
- Sessão real existente: abriu editor preenchido pela ação do resumo; fechou sem editar/salvar. Persistência autenticada ainda será verificada após aplicação.
- Não houve criação de usuários autenticados de recepção/médico. Testes SQL não representam login desses papéis. Concorrência simultânea de duas conexões ainda não comprovada (revisão obsoleta testada).

## Estado da instalação

`20260926100000` foi aplicada e registrada. A primeira homologação revelou retry prolongado do PostgREST ao usar `40001` para conflito; `20260926101000` corrigiu exclusivamente esse código para `PT409`, ensaiada antes com ROLLBACK e aplicada separadamente. Histórico remoto confirmou ambas; `20260925130000` continua não aplicada. O contrato inicial não foi reescrito.

Sessão real de Proprietário(a) em Brotas confirmou salvamento e recarga do mesmo ID, cancelamento, primeiro responsável atômico, foto privada preservada em edição posterior e isolamento dos campos não alterados. Conflito pós-correção ainda depende de nova repetição autenticada; testes SQL com `PT409` passaram. A fixture foi removida: zero pacientes, responsáveis e objetos Storage. Oito eventos de auditoria sintéticos permanecem por design append-only; tentativa inicial de exclusão foi rejeitada e revertida. Nenhum dado de paciente existente foi alterado.

Sessões reais de recepção, médico e vínculo de uma única clínica permanecem pendentes. O frontend ainda é local, não publicado. Detalhes no checkpoint.

A suíte operacional integral passou 87/87. Em duas repetições dirigidas posteriores, o primeiro `page.goto` do Vite sintético frio excedeu 30 s (20/21, saída 1 em ambas). O prazo foi ajustado somente para o caso inicial; a repetição final passou 21/21 com saída 0 (primeiro caso em 41,4 s). A prévia habitual em 4197 ficou indisponível durante as verificações, foi reiniciada na **mesma porta** e respondeu HTTP 200. Nenhuma outra porta foi recomendada.

## Entrada direta na listagem local

Na árvore original, em revisão posterior no mesmo dia, “Editar” com lápis foi acrescentado à coluna “Ações” de cada linha, ao lado de “Ver resumo”. O botão abre o mesmo editor que “Editar cadastro” no resumo, sem selecionar o resumo por propagação do clique. Não houve mudança na RPC nem em migrations. A porta 3000 servia exatamente o arquivo local antes da alteração; a ausência da ação era de interface. A homologação real da nova entrada, distinta da homologação anterior pelo resumo, fica registrada no checkpoint. Testes sintéticos e captura da tabela não a substituem.

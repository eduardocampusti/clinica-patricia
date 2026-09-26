# Runbook — rollback operacional separado

Este rollback é **manual, separado e nunca automático**. Ele só reverte a
fronteira RPC do Prontuário da migration 05; não desfaz 00–04, não reverte
dados e não substitui restauração por backup/PITR.

## Pré-condições

- decisão explícita do responsável pelo incidente e janela de manutenção;
- executor autorizado, superusuário ou membro de `postgres`;
- backup restaurável e PITR verificados antes da execução;
- aplicação bloqueada ou em modo de manutenção, com responsáveis avisados;
- hash confirmado:
  `3184421E70ABAB2CCA90FA3B6A7B1FA7D472AB5221A4B8A68122F6AC459702D2` para
  `rollback/90_prontuario_rpc_operacional.sql`;
- confirmação de que a migration 05 está instalada e de que a consequência de
  segurança abaixo foi aceita.

## Consequência conhecida

O script restaura policies/ACLs legadas e reabre temporariamente o vazamento
S-17. Isso é uma degradação de segurança intencional e exige mitigação
operacional imediata; não é um rollback neutro.

## Execução e verificação

1. Execute exclusivamente
   `database/releases/20260915/rollback/90_prontuario_rpc_operacional.sql` no
   banco alvo, uma vez, em sessão aprovada.
2. O script falha se a fronteira RPC esperada não existir e usa `RESTRICT` ao
   remover funções, para não apagar dependências implícitas.
3. Verifique a remoção das oito RPCs, os objetos de 05 e a restauração das ACLs
   legadas; registre o resultado e a exposição S-17 no incidente.
4. Mantenha a migration 05 no histórico. Não use repair, reset, rerun de 05 ou
   ferramentas automáticas para mascarar a divergência. A recuperação posterior
   deve ser uma migration de avanço aprovada e validada em clone descartável.

Se o objetivo for recuperar dados, interrompa este runbook e use o procedimento
de backup/PITR aprovado. Não execute o rollback no banco original para testar.

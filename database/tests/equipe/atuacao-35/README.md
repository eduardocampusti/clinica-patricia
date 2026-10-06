# Testes da integração35

Somente dados fictícios. Não executar fixture.sql, cenarios.sql ou rollback.sql no
Supabase: criam um esquema reduzido próprio para PostgreSQL LOCAL descartável.
Fixture usa três papéis sintéticos e IDs fixos, sem Auth real, credenciais ou pacientes.
Os helpers equipe_recurso_pode e equipe_pode_editar_profissional_global foram copiados
das migrations existentes; eh_proprietaria/auth.uid são substitutos locais explícitos.
Não testa JWT, RLS completa, triggers reais ou ambiente Supabase.

Em banco local novo, criar os papéis fictícios/fixture, aplicar somente
supabase/migrations/20261006150000_equipe_atuacao.sql, executar cenarios.sql e depois
rollback.sql com psql -v ON_ERROR_STOP=1. Este último instala uma falha de inserção
proposital. Encerrar o servidor após conferir. Não usar Docker/reset/db push geral.

Execução06/10/2026: PostgreSQL17.11 já instalado,127.0.0.1:55439, banco
fictício equipe35_correcao, depois equipe35_final para a versão final. Seis blocos
aprovados, incluindo profissional inativo recusado e rollback após falha parcial.
Catálogo local confirmou três APIs35 security definer/search_path vazio,
authenticated com execução e anon sem execução. Não existem policies neste esquema
reduzido; isto não comprova RLS. Cluster encerrado. Primeiras tentativas falharam no preparador local
(search_path do helper fictício, papéis de cluster e escape de $$); corrigidas,
sem mudança das funções35 para contornar erros. Na repetição final, usuário local
psql corrigido para postgres após erro explícito de papel ausente. Schema principal intacto.

inventario.sql é somente leitura para a futura conferência autorizada de catálogo.
Após aplicar no principal, executar também supabase/tools/verificar-integridade.sql.
No esquema mínimo o verificador geral não é aplicável como aprovação do sistema.
Ver relatório35 para limites, recuperação e testes de UI sintéticos.

Em06/10/2026,12:08 -03:00, a conferência autorizada no Supabase oficial passou:
fontes/IDs de Brotas e Ipupiara corretos e18 negativas42501 nas três APIs. SQL em
transação READ ONLY, SET LOCAL ROLE e claims temporárias de identidades existentes;
nada altera papéis, contas ou dados. Não equivale a JWT real desses perfis na UI.
Os cinco atores técnicos31–33 continuam inativos; o runner autenticado anterior
não foi repetido. Não reativar para obter resultado. Artefatos somente leitura
guardados em scratch/equipe-atuacao/seguranca35.sql e seguranca35-conectada.json,
ignorados pelo Git. Sem escrita de teste; UI normal aguarda login manual existente.

-- FASE 4 / 1 de 2: novos estados da sessao de caixa.
-- Migration criada para revisao; NAO aplicada.
-- Os valores sao adicionados em arquivo isolado porque PostgreSQL nao permite
-- seu consumo seguro na mesma transacao em que sao criados.
-- Preserva os estados legados aberto e fechado e nao modifica registros.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

alter type public.status_sessao_caixa
  add value if not exists 'em_fechamento';

alter type public.status_sessao_caixa
  add value if not exists 'aguardando_aprovacao';

alter type public.status_sessao_caixa
  add value if not exists 'devolvido_para_correcao';

alter type public.status_sessao_caixa
  add value if not exists 'aprovado';

commit;

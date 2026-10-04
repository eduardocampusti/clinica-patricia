-- SOMENTE LEITURA. Complemento executado pelo SQL Editor oficial, main,
-- xftnkusbyqzyvzrovroj. Autorização IAB exclusiva para o inventário de Brotas.
-- Nunca selecionar dados_antes/depois inteiros: contêm vínculos de pacientes.
begin isolation level repeatable read read only;
set local statement_timeout='60s';
select a.id,a.acao,a.entidade,a.entidade_id,a.usuario_id,a.created_at,
 (a.motivo is not null) motivo_registrado,
 coalesce((select jsonb_object_agg(k,v) from jsonb_each(coalesce(a.dados_antes,'{}')) e(k,v)
  where k=any(array['id','clinica_id','sessao_caixa_id','status','valor_abertura','aberto_em','aberto_por','fechado_por','fechado_em','valor_esperado','valor_contado','diferenca','idempotency_key','forma_pagamento','valor','registrado_por','registrado_em'])),'{}') antes_financeiro,
 coalesce((select jsonb_object_agg(k,v) from jsonb_each(coalesce(a.dados_depois,'{}')) e(k,v)
  where k=any(array['id','clinica_id','sessao_caixa_id','status','valor_abertura','aberto_em','aberto_por','fechado_por','fechado_em','valor_esperado','valor_contado','diferenca','idempotency_key','forma_pagamento','valor','registrado_por','registrado_em'])),'{}') depois_financeiro
from public.auditoria a
where a.clinica_id='7c2a450d-7b9a-4701-8d5a-982eda331c58'::uuid and
 (a.entidade_id='a4a18e49-6634-4058-9fd8-07f3b065fd63'
 or a.dados_antes->>'sessao_caixa_id'='a4a18e49-6634-4058-9fd8-07f3b065fd63'
 or a.dados_depois->>'sessao_caixa_id'='a4a18e49-6634-4058-9fd8-07f3b065fd63')
order by a.created_at,a.id;
rollback;

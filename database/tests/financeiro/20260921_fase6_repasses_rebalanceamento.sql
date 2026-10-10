-- FASE 6 — cenários de rebalanceamento de ajustes em repasse pendente.
-- NÃO EXECUTADO. Destinado a ambiente descartável/staging, sempre com ROLLBACK.
-- Não criar fixtures persistentes nem apontar para o Supabase real.

begin;

-- O runner deve criar dados sintéticos dentro desta transação e guardar os ids
-- localmente. As asserções abaixo descrevem os invariantes obrigatórios.
--
-- A: produção 400, ajuste 100, estorno 80:
--    item.estornos=80, item.liquido=320, ajuste.aplicado=100,
--    repasse.liquido=220, repasse.status='pendente'.
-- B: produção 400, ajuste 350, estorno 100:
--    item.liquido=300, ajuste.aplicado=300, ajuste.status='parcialmente_aplicado',
--    repasse.liquido=0, repasse.status='ajustado', saldo do ajuste=50.
-- C: ajustes A=200 e B=150, estorno 100:
--    A.aplicado=200, B.aplicado=100, saldo de B=50, repasse.liquido=0.
-- D: novo repasse de 400:
--    saldo 50 é consumido automaticamente; repasse.liquido=350;
--    ajuste fica status='aplicado'.
-- E/F: repasse 'pago' ou 'ajustado': aplicações anteriores não mudam;
--      estorno cria novo ajustes_repasse negativo.
--
-- Concorrência: executar confirmação e efetivação do estorno em sessões
-- concorrentes. O lock do repasse deve fazer a primeira operação vencer;
-- nenhuma operação pode pagar valor antigo ou rebalancear repasse terminal.

-- Proteções estruturais a conferir no runner:
-- * UPDATE/DELETE direto por authenticated continua revogado.
-- * aplicação só reduz/remove em função privilegiada e repasse pendente.
-- * aplicação ligada a repasse pago/ajustado permanece imutável.
-- * auditoria contém rebalancear_ajuste_repasse, ids de repasse/profissional/
--   clínica/ajuste/estorno e valores anterior, novo e devolvido.

rollback;

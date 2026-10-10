-- PROCEDIMENTO PREPARADO, NÃO EXECUTADO. Exige autorização específica futura.
-- Remover somente objetos adicionados por 20261001120000 após inventário/snapshot.
-- Não desfaz correções legítimas, horários, recebimentos ou auditoria.
begin;
set local lock_timeout='5s';
drop trigger agenda_auditar_correcao_horario on public.agendamentos;
drop trigger zz_agenda_validar_correcao_horario on public.agendamentos;
drop function public.agenda_correcao_disponivel(uuid);
drop function public.agenda_corrigir_horario(uuid,uuid,timestamptz,text,date,time,date,time,text);
drop function public.agenda_auditar_correcao_horario();
drop function public.agenda_validar_correcao_horario();
commit;
-- Frontend volta a bloquear por ausência da capacidade. Revisar retorno de UPDATE
-- legado antes de executar; retirada da guarda é impacto de segurança a avaliar.

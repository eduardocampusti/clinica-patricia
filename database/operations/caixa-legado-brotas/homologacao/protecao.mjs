// Proposta mínima: proteção permanente do alvo exato contra DML antigo após fechamento.
// Somente EXECUTE do novo objeto é revogado; ACLs existentes preservadas.
// Nunca produz SQL habilitado para o principal.
import { ALVO } from '../candidato.mjs';
export function gerarProtecao(clinica=ALVO.clinica_id,sessao=ALVO.sessao_id){
  for(const v of [clinica,sessao])if(!/^[a-f0-9-]{36}$/.test(v))throw new Error('UUID inválido');
  return `-- PROPOSTA DE ADAPTAÇÃO MÍNIMA. NÃO APLICAR NO PRINCIPAL. APROVAÇÃO PENDENTE.
begin;
do $$ begin
 if not false then raise exception 'PROTECAO BLOQUEADA: aplicação no principal não autorizada'; end if;
end $$;
create function private.financeiro_proteger_entrada_legado_administrativo() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare v_status public.status_sessao_caixa; v_key text; v_alvo boolean;
begin
 v_alvo:=case when tg_op='INSERT' then new.sessao_caixa_id='${sessao}'::uuid
   when tg_op='DELETE' then old.sessao_caixa_id='${sessao}'::uuid
   else old.sessao_caixa_id='${sessao}'::uuid or new.sessao_caixa_id='${sessao}'::uuid end;
 if not v_alvo then return case when tg_op='DELETE' then old else new end; end if;
 select status,idempotency_key into v_status,v_key from public.sessoes_caixa
   where id='${sessao}'::uuid and clinica_id='${clinica}'::uuid for share;
 if not found or v_key is not null then raise exception 'Alvo legado/clínica inválido' using errcode='55000'; end if;
 if v_status<>'aberto' or exists(select 1 from public.eventos_auditoria_financeira
   where clinica_id='${clinica}'::uuid and entidade_id='${sessao}'::uuid
     and entidade='sessao_caixa' and acao='encerrar_caixa_legado_administrativamente') then
   raise exception 'Histórico legado encerrado administrativamente: gravação proibida' using errcode='55000';
 end if;
 if tg_op<>'DELETE' and (new.sessao_caixa_id<>'${sessao}'::uuid or new.clinica_id<>'${clinica}'::uuid) then
   raise exception 'Não mover entrada do alvo para outra sessão/clínica' using errcode='55000';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke execute on function private.financeiro_proteger_entrada_legado_administrativo()
from public,anon,authenticated,service_role;
create trigger entradas_caixa_legado_administrativo before insert or update or delete
on public.entradas_caixa for each row execute function private.financeiro_proteger_entrada_legado_administrativo();
-- Não cria eventos, não altera valores/registros nem permissões de objetos existentes.
-- EXECUTE direto do novo objeto privado revogado; execução pela trigger preservada.
rollback;
`;
}
export function protecaoIsolada(clinica,sessao,db){
 if(clinica===ALVO.clinica_id||sessao===ALVO.sessao_id)throw new Error('UUID principal proibido em homologação');
 let s=gerarProtecao(clinica,sessao);
 s=s.replace("if not false then raise exception 'PROTECAO BLOQUEADA: aplicação no principal não autorizada'; end if;",
 `if current_database() is distinct from '${db.database}' or current_setting('homologacao.caixa_legado',true) is distinct from '${db.run}' then raise exception 'Banco não isolado'; end if;`);
 return s.replace(/rollback;\s*$/,'commit;');
}

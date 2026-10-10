-- Correção determinística: conflito funcional retorna PT409, sem retry de serialização.
-- Preserva assinatura, proprietário, ACL, guards, locks e demais instruções.
do $fix$
declare d text; a text;
begin
select pg_get_functiondef('configuracoes_salvar_interno(text,uuid,integer,integer,text,jsonb,text,jsonb,integer,jsonb)'::regprocedure),proacl::text into d,a from pg_proc where oid='configuracoes_salvar_interno(text,uuid,integer,integer,text,jsonb,text,jsonb,integer,jsonb)'::regprocedure;
if md5(d)<>'281430da981e54b994cccf57a2522fec' then raise exception 'Definição divergiu; revisar antes de aplicar';end if;
if (length(d)-length(replace(d,'errcode=''40001''','')))/length('errcode=''40001''')<>5 then raise exception 'Quantidade de conflitos inesperada';end if;
execute replace(d,'errcode=''40001''','errcode=''PT409''');
if (select proacl::text from pg_proc where oid='configuracoes_salvar_interno(text,uuid,integer,integer,text,jsonb,text,jsonb,integer,jsonb)'::regprocedure) is distinct from a then raise exception 'ACL divergiu';end if;
end $fix$;

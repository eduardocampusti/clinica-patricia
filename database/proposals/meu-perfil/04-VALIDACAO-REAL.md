# Meu perfil — roteiro conectado obrigatório antes da publicação

## Resultado atual —08/10/2026,16:44-03

28 verificações conectadas aprovadas com sessões reais A/B no alvo oficial
xftnkusbyqzyvzrovroj. Ambas encerradas, três vínculos inativos e sessões/refresh
revogados; novos logins recusados. SQL já aplicado, não reaplicar. Canal CLI/API
oficial autorizado especificamente nesta execução. Relatório17 discrimina casos,
rodada inicial falha preservada, recarga/contexto pela API e testes de interface
sintéticos anteriores. Interface autenticada publicada não foi reconferida devido
à falha do navegador. Roteiro histórico abaixo não autoriza reativar as contas.

## Preparação histórica (executada; não repetir)

1. Confirmar projeto/ambiente e conferir preflight completo, definição do helper
   de vínculo, triggers de usuarios, auditoria e TODAS as policies de Storage.
   Comparar com a proposta. Não executar diante de objetos preexistentes sem
   conciliação. Guardar somente metadados e resultados sem segredos/dados reais.
2. Aplicar apenas02-proposta.sql no canal autorizado, conferir03-verificacao-objetos.sql
   e executar `supabase/tools/verificar-integridade.sql`. Reaplicar migrações antigas
   não faz parte deste roteiro. Conferência de catálogo não prova sessões/RLS.
3. Validar a função com Deno e publicar apenas `meu-perfil` com os segredos existentes.
   Confirmar configuração de JWT do gateway compatível com a chave vigente;
   `Auth.getUser` obrigatório no handler. Não mudar outras funções/ambiente.
4. Selecionar contas fictícias A e B autorizadas, ativas, com vínculos já existentes.
   Para trocar clínicas, A precisa de ambos os vínculos preexistentes. B deve ter
   foto pessoal fictícia atual própria para a prova de arquivo alheio. Se faltarem
   esses requisitos, informar o cenário pendente, sem substituir por conta real.
5. Confirmar serviço/consulta autorizada na aplicação local normal e só então
   habilitar a configuração em pacote local de validação. Não publicar essa
   configuração enquanto persistência e restrições não estiverem comprovadas.

## Persistência e interface — sessões fictícias reais

| Cenário | Prova exigida |
|---|---|
| Nome | A salva nome fictício, aguarda confirmação, reabre; leitura do servidor com revisão avançada, cabeçalho/rodapé/saudação atualizados |
| Foto | JPEG/PNG fictício validado, reencodado e privado; selecionar, salvar, reabrir/F5 mostra arquivo atual da própria conta |
| Substituição | Novo caminho, foto anterior não sobrescrita; depois do commit referência atual e acesso ao caminho antigo recusado |
| Remoção | Salvar remove referência; iniciais continuam após F5/relogin sem reutilizar foto profissional |
| Cancelar | Rascunho de nome/foto descartado; servidor/revisão/nome/caminho anteriores comparados e iguais |
| Falha de upload | Induzida somente na sessão fictícia local; commit não chamado, rascunho preservado, nova consulta compara valores anteriores |
| Resposta perdida | Sem sucesso/retry automático; reabrir consulta resultado real antes de tentar novamente |
| Concorrência | Revisão antiga recusada sem sobrescrever edição já confirmada |
| Clínica | Mesma identidade de A nas duas clínicas; papel correspondente ao vínculo, sem alteração de vínculo |
| Logout/relogin | Nova sessão A persiste; B não recebe nome/blob/rascunho de A; conta real nunca usada para escrever |
| Móvel/nome longo | Abertura pelos dois acessos, foco/scroll/ações sem overflow, menu correto e cancelamento |

## Restrições — sessões fictícias reais e provas SQL separadas

Usar JWTs apenas no canal de teste autorizado, nunca salvar tokens em relatório,
manifesto, screenshot ou código. Não enviar valores a serviços externos de IA.

- Consulta de A sem parâmetro de pessoa devolve apenas A. Payload extra
  `usuario_id`, `papel`, `email`, `clinicaId`, `ativo` recusado antes de escrever.
- A não executa a RPC interna. Sem login não consulta/salva nem lê arquivo.
- UPDATE direto dos campos novos recusado. Nenhuma alteração de papel/vínculo
  deve ser tentada como teste desta entrega.
- A não baixa/lista/atualiza/remove o arquivo atual de B; B não acessa o de A.
  SELECT de objeto alheio existente precisa ser recusado; testar um caminho
  inexistente sozinho não prova isolamento. Clientes não fazem upload direto.
- Arquivo antigo ou órfão deixa de ser legível pelos clientes; política não
  permite acesso público e não cria signed URL persistida.
- Arquivo inválido/grande e `fotoAcao` fora do contrato recusados; referência
  anterior comparada. Operação com conta sem vínculo ativo somente se existir
  identidade fictícia já autorizada nessa condição; não modificar vínculos.

SQL com `SET ROLE`/claims artificiais é prova conectada de política simulada,
**não** sessão real Auth. Registrar separadamente de chamadas com JWT real.
Não repetir homologação completa da dashboard sem mudança relevante. Reusar os
35 cenários válidos anteriores; executar apenas testes afetados e pacote exato.

## Liberação e publicação

Só liberar quando SQL, função, bucket, persistência real e isolamento passarem.
Atualizar notas coerentes e preparar commit seletivo sobre a versão publicada
atual, preservando demais módulos. Push na origem existente pode disparar os
dois auto-deploys; não fazer push antecipado. Conferir hash/estado de ambos os
deploys e bundle efetivo por domínio, depois sessão publicada por leitura.
Registrar limitações e nunca chamar build/simulação de persistência homologada.

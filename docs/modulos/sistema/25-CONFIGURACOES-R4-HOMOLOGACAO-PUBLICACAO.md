# Configurações R4 — homologação e publicação

## Autorização e preparação — 09/10/2026, 18:09 -03

Usuário autorizou exatamente duas novas contas e dois contextos fictícios, máximo acumulado de 16 contas e oito contextos, uso único, sem reativação/e-mails/dados reais. Habilitação e publicação continuam condicionadas à aprovação conectada.

Sessão legítima do criador confirmada automaticamente pela aplicação local em 21:04:35Z: guarda aceita e Proprietário(a) nas duas unidades. Servidores disponíveis; executor completo revisado e sintaxe/build aprovados antes da criação. Correção `image.encode()` confirmada na fonte remota; ImageScript1.3.0 real passou encode/decode/transparência e conferência da declaração de tipos. Fonte privada mantém hash c68efac28dd3cd071fa32ac657a104d6fdb527a8e3739ecaf27d8fbb83af9bbb, versão observada7; não reaplicada. Versões observadas nesta leitura prevalecem sobre números registrados anteriormente, sem presumir alteração de conteúdo.

Projeto confirmado pela URL do MCP, URL pública local e projeto ligado: xftnkusbyqzyvzrovroj. Aplicada apenas migration `configuracoes_homologacao_r4`, SQL `database/proposals/configuracoes/homologacao-r4/20261009210000_configuracoes_homologacao_r4.sql`. Função/CHECKs anteriores conferidos antes; novo catálogo confirma SECURITY DEFINER/search_path vazio, execução somente service_role e novos IDs restritos. Oito consultas do verificador de integridade aprovadas, sem consultar dados identificáveis de pacientes.

Somente Edge configuracoes-publicas atualizada de8 para9, verify_jwt=false preservado, fonte exata confirmada e hash401f74755ab8c082f6f2e6167117b640855bb19a291ae42ecf77ae3986fd1511. Fonte anterior conservada no canal administrativo para recuperação; CHECKs históricos não devem ser estreitados após consumo.

Executor usa duas contas de Proprietário(a) vinculadas somente aos novos contextos, sem administração global, e testa temporariamente Recepção somente no contexto B. Origem localhost separada da sessão legítima: nenhum token/copiação de sessão do titular. Senhas aleatórias das fixtures somente na memória do processo; não registradas/versionadas. Encerramento obrigatório por finally, incluindo falha.

Primeiras provas reais aprovadas em A: login, guarda normal, salvamento pelo formulário, leitura pelo serviço e persistência após F5. Demais testes em andamento; Configurações continua desligada no frontend normal. Acesso Direto0.4.0 e dashboard publicados preservados; nenhuma rehomologação desnecessária de Acesso Direto. GraphQL permanece ausente e não homologado funcionalmente; não instalado. TypeSafe consultada e avaliada: controles determinísticos, sem IA.


## R4 interrompida e encerrada — 09/10/2026, 18:20 -03

**16 verificações reais parciais aprovadas**, no contexto fictício A: login, guarda normal, salvamento institucional, leitura pelo serviço, F5, PNG privado/público e leitura posterior, cabeçalho/rodapé/marca-d’água persistidos, geração local de PDF com dados persistidos, projeção/login personalizado e novo login. As três primeiras verificações são pré-condições; não apresentar16 como conclusão da bateria.

Falha na preparação do executor, atribuída ao agente: depois de Sair na interface (signOut global padrão), ele utilizou a sessão auxiliar anterior. A consulta retornou401, mas seu resultado sem data foi acessado como se fosse válido, gerando erro secundário de revisao undefined. Logs oficiais agregados da janela21:07–21:09:10Z confirmam8POST200 e1POST401 no serviço privado; logout204 também observado. Código + SDK e [documentação oficial de saída](https://supabase.com/docs/reference/javascript/auth-signout) comprovam o alcance global padrão. Não enfraquecer a saída nem a guarda para fazer o teste passar.

Correção LOCAL do executor: renovar a sessão auxiliar com novo login da MESMA fixture após loginUI e verificar guarda; exigir envelope válido antes de ler revisao; encerrar a sessão de concorrência com scope local, sem revogar os demais clientes. Saída global da aplicação preservada. Cinco testes dirigidos passaram, incluindo uso do SDKREAL2.111 com transporte inteiramente SINTÉTICO que reproduz a recusa401 após saída global e verifica novo login/saída local. Não é prova conectada da correção. Tipos backend/encoder real e build das bancadasR4/R5 passaram; sem mudança nas dependências do aplicativo. R4 NÃO reexecutável; preflight recusa recursos consumidos.

| Requisito | Evidência | Resultado |
|---|---|---|
| Salvamento e F5 institucional A | UI normal + consulta real | Aprovado conectado |
| PNG, leitura privada/pública A | UI, Edge, Storage e download reais | Aprovado conectado |
| Timbrado/cabeçalho/rodapé A | Persistência, F5 e PDF local | Aprovado no escopo A |
| Login personalizado A | Projeção pública, imagem e novo login UI | Aprovado conectado |
| Concorrência/histórico/substituição | Sessão auxiliar antiga401 antes dessa etapa | Pendente |
| JPEG/rejeições/reconciliação | Não alcançados | Pendente |
| Contexto B, papéis e isolamento bilateral | Não alcançados | Pendente |
| Correção de sessões do executor |5 testes locais com transporte sintético | Aprovado LOCAL, não conectado |
| Encerramento | Finally + leitura MCP independente | Aprovado |

Finally encerrou AMBAS as contas e contextos em21:09:02Z: bantrue, loginrecusado,0sessões/refresh/vínculos/perfis ativos,clínicas/contextosinativos,projeçõesnull e logo antes público404. Leitura oficial independente confirmou total16contas fictícias/16banidas,8contextos/0ativos e0versões reaisBrotas/Ipupiara produzidas durante a execução. Nenhuma conta reativada/email enviado/marca real alterada. Histórico privado preservado.

Migration R4 aplicada uma vez, ledger20261009210549; catálogo/ACL e8consultas de integridade são as provas de conteúdo, não apenas o ledger. Fonte pública9/hash401f74755ab8c082f6f2e6167117b640855bb19a291ae42ecf77ae3986fd1511; fonte privada7/encode/hashc68efac28dd3cd071fa32ac657a104d6fdb527a8e3739ecaf27d8fbb83af9bbb não reaplicada.

**Configurações permanece false, não habilitada/publicada.** Nenhum novo commit/push/deploy nesta rodada. Ambos domínios continuam0.4.0/b56848ce, HTML/bundles e rotas200 conferidos21:18:18Z; prova anônima da versão, não nova prova autenticada. Acesso Direto/dashboard e conferências anteriores preservados; alterações paralelas do checkout primário não incorporadas.

Impedimento específico: limite autorizado16/8 consumido, recursos encerrados; faltam testes conectados listados acima. Proposta concreta R5 NÃO AUTORIZADA/NÃO EXECUTADA em database/proposals/configuracoes/homologacao-r5/README.md: somente2novascontas/2contextos, máximo18/10, migrationaditiva restrita e atualização só resolver público9. Executor corrigido, cinco testes e bancada compilada já preparados; trava de autorização e preflight antes de qualquer criação. Não reativar anteriores nem criar implicitamente. Publicação continua autorizada somente após aprovação funcional; não solicitar novamente essa autorização.

GraphQL permanece ausente/não homologado, sem instalação. TypeSafe lida e docs oficiais consultadas, sem IA nos controles determinísticos.


Preparação complementar LOCAL posterior:6/6 testes de sessões/SDK/gate de encerramento passaram; proposta R5 passou8/8 testes PostgreSQLLOCAL, semSupabase, banco descartável removido e servidor auxiliar desligado. BancadaR5 compilada, tipos backend aprovados. Não substituem homologação conectada. Executor corrigido também evita abandonar a tentativa de bloqueio Auth por erro de inventário e impede aprovação quando o encerramento estiver incompleto. R5continuaNÃO AUTORIZADA/NÃO EXECUTADA.

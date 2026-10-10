# Equipe & acessos — erros e consulta de compatibilidade

04/10/2026, 21:11 -03:00. Implementação local e verificações concluídas pelo agente,
autorizadas pelo pedido específico. Não representa aprovação expressa do usuário.

## Causas confirmadas

- No SDK instalado (`@supabase/supabase-js` e `functions-js` 2.111.0),
  `FunctionsHttpError.context` é `Response`. Seu `body` é um fluxo, não um objeto
  JSON. A biblioteca tentava acessar `context.body.codigo/erro`, perdendo o código
  e o status e mostrando indisponibilidade genérica.
- `equipe_listar` acionava `profissionais_clinicas` depois de qualquer erro. Assim,
  `42501`/403 podia gerar a lista antiga e o aviso de migração não aplicada.
- `mensagemErro` do cadastro também repassava texto bruto para `22023`. Esse
  repasse foi removido; o conflito agora é discreto, sem revelar cadastro de terceiros.
  Regras, campos, contrato e validações de CPF não foram alterados.
- A verificação visual adicional sem rolagem manual encontrou alerta fora da
  área visível no celular após envio: `toBeInViewport` retornou proporção zero.
  O painel agora leva seu aviso à área visível com rolagem interna do modal.

Referência oficial consultada: [tratamento de erros em Edge Functions](https://supabase.com/docs/guides/functions/error-handling).
Contratos conferidos somente por leitura em `supabase/functions/equipe-acessos/`
e migrations existentes. Nenhuma consulta SQL foi executada.

## Alterações locais

- `src/lib/equipeErros.ts`: tratamento central com código/status internos,
  categoria, texto fixo seguro e indicação de resultado incerto. JSON é lido
  assincronamente de uma cópia da resposta, preservando o corpo original.
  Corpo consumido, vazio, não JSON, primitivo, array, objeto inesperado e exceção
  de leitura não causam nova exceção. Texto remoto, detalhes, CPF, e-mail e tokens
  nunca são reproduzidos como erro da interface.
- `src/lib/equipeAcessos.ts`: consumidores continuam usando suas funções
  assíncronas; captura falhas de chamada/interpretação, reconhece as estruturas
  de sucesso atuais e recusa respostas inesperadas como confirmação. Sem repetir
  automaticamente convites, concessões, reenvios, alterações ou aceite.
- `src/pages/cadastros/Equipe.tsx`: compatibilidade só com `PGRST202` na chamada
  da listagem ou `42883` referindo exatamente `equipe_listar`; 404 genérico não
  basta. Falhas de sessão/permissão/rede/serviço não viram compatibilidade nem
  lista vazia. Listas/catálogos são limpos no início da leitura; resposta antiga é
  ignorada; erros de catálogos também não viram opções vazias silenciosamente.
  Falha do cadastro preserva formulário e libera carregamento em `finally`.
  O seletor mantém edição por clínica, referência confirmada e bloqueio sem
  mudança. Alteração de papel com resultado incerto bloqueia outra tentativa até
  reabrir a ficha, preservando a proteção do relatório24.
- `src/pages/cadastros/Cadastros.tsx`: nova instância de Equipe por pessoa da
  sessão, clínica e perfil, evitando dados da instância anterior nessas transições.
  Menu, rota e consultas operacionais de Profissionais preservados.
- `src/pages/ConviteEquipe.tsx`: consome os erros seguros, sinaliza incerteza e
  libera carregamento em `finally`, mantendo campos. Ordem senha/aceite, senha
  opcional, regras de validação e autorização não foram reformuladas.
- `src/config/notasEvolucao.json`: correção descrita em notas não lançadas.

## Categorias e mensagens

| Evidência interna | Mensagem segura / orientação |
| --- | --- |
| HTTP401; PGRST301/302/303 | “Sua sessão não permite concluir esta operação. Entre novamente no sistema.” |
| HTTP403; 42501; NAO_AUTORIZADO | Sem autorização nesta clínica; gestão restrita à Proprietária/Administradora. |
| EMAIL_NAO_CONFIRMADO | Confirmar o e-mail da própria sessão antes do acesso. |
| DADOS_INVALIDOS; 22023; HTTP400/422 | Revisar os campos e opções da solicitação. |
| DUPLICIDADE; 23505; 40001; HTTP409 | Conflito; reabrir e conferir dados atuais, sem declarar existência de outra pessoa. |
| HTTP429 | Limite de tentativas; aguardar antes de tentar novamente. |
| FunctionsFetchError; status0/408 | Comunicação falhou; conferir conexão e consultar novamente. |
| Relay; códigos de serviço; HTTP5xx | Serviço não conseguiu concluir agora; consultar novamente mais tarde. |
| Não reconhecido; conta não encontrada | Mensagem discreta sem inventar causa ou revelar existência de conta/pessoa/vínculo. |

O contrato atual reutiliza `DADOS_INVALIDOS`/422 para duas recusas de intervalo ou
envio em andamento. Há reconhecimento **exato** das duas mensagens conhecidas,
somente com esse código e status: “Aguarde um minuto antes de reenviar o convite.”
e “Aguarde o envio atual terminar.” Não há classificação por palavras soltas, nem
repasse do texto recebido. Conteúdo diferente mantém validação genérica segura.

Rede, relay, falha de serviço ou resposta inválida após uma escrita avisam que
**não foi possível confirmar o resultado** e orientam consultar o estado antes de
repetir. Não afirmam que nada foi salvo. Recusas 401/403/422/409/429 são distintas;
mensagens de serviço são conservadoras mesmo quando o erro pode ser parcial.

## Permissões e Recepção

O shell permite Cadastros para Recepção; a aba Profissionais tem finalidade
operacional e autorizações próprias. O serviço de gestão/listagem Equipe exige
Proprietária/Administradora no contexto autorizado. Não alterar grants, RLS,
menu ou retirar consultas operacionais para resolver a mensagem.

Recepção recebe a orientação de restrição quando o serviço recusa. Não passa a
ler a equipe pelo caminho antigo após 42501. A documentação não define uma nova
consulta completa de Equipe para Recepção: finalidade/escopo dessa eventual
funcionalidade continuam **pendentes de decisão**, sem ampliação de permissões.

## Verificações obtidas

- Node: **15 testes aprovados** (7 novos de erros/contratos, 8 regras existentes de
  Equipe). Cobrem SDK/Response real em memória, corpo consumido, formatos inválidos,
  redaction, status/código, recusas e incerteza, compatibilidade específica e
  reconhecimento de sucessos. Dados exclusivamente sintéticos.
- Interface isolada `127.0.0.1:4191`: **75 testes aprovados** nos tamanhos
  computador/tablet/celular, incluindo os **39 testes existentes do seletor**,
  24 regressões de ficha/cadastro e 12 novos testes de erros/listagem.
- Após reconhecimento das recusas reais de intervalo, **12 testes de erros**
  repetidos e aprovados. Após o ajuste de visibilidade, rodada de erros/seletor
  concluiu 50/51; um cenário teve timeout de abertura da página sem snapshot
  visual. Reconferência direcionada de leitura de ficha e desse cenário do seletor
  passou **6/6**, nos três tamanhos, sem alteração dos testes antigos. Todas as
  verificações finais previstas foram obtidas; não houve nova ampliação da bateria.
  Alertas de validação, serviço e rede ficaram visíveis **sem rolagem manual** em
  computador/tablet/celular, com uma chamada por clique e preenchimento preservado.
- Convite isolado `127.0.0.1:4182`: **3 testes aprovados**, duas regressões de
  continuidade Brotas/Ipupiara e um cenário de falhas do aceite. Campos mantidos,
  carregamento liberado, uma chamada por clique, sem chamada de senha quando vazia.
- TypeScript/build e lint finais aprovados após o último ajuste.
  Avisos preexistentes: exportações de `ThemeProvider.tsx:102`, importação
  estática/dinâmica de Supabase e pacotes maiores que 500kB. Não corrigidos aqui.
- Primeira rodada teve timeout de preparação do Vite, colisão do nome de um
  botão sintético com busca textual de pessoa e regressão da resposta inválida
  do seletor. Timeout ajustado no teste, botão sintético renomeado e bloqueio da
  resposta incerta preservado. As verificações pertinentes foram repetidas e
  passaram. Não houve mudança nos testes anteriores do seletor para fazê-los passar.
- A execução direta inicial do teste de convite não encerrou o processo auxiliar;
  foi interrompida e repetida pelo runner existente, que encerrou com sucesso.

Capturas sintéticas inspecionadas visualmente: `scratch/equipe-erros-entrega/`,
subpastas desktop/mobile do teste de falhas, arquivos `falha-validacao.png`,
`falha-servico.png` e `falha-rede.png`. São artefatos locais ignorados pelo Git.
Comandos principais (sem duplicar contagem de cenários repetidos):

```text
server\node_modules\.bin\tsx.cmd --test src/lib/equipeErros.test.ts src/lib/equipe.test.ts
npm run test:operacional -- equipe-erros.spec.ts equipe-papeis.spec.ts equipe-ficha.spec.ts equipe.spec.ts --output scratch/equipe-erros-verificado
npm run test:operacional -- equipe-erros.spec.ts equipe-papeis.spec.ts --timeout 60000 --output scratch/equipe-erros-entrega
npm run test:operacional -- equipe-papeis.spec.ts equipe-ficha.spec.ts --timeout 60000 --grep "profissional de saúde mantém Recepção|falha de leitura mostra" --output scratch/equipe-erros-reconferencia
npm run test:login -- --config tests/login/convite.config.ts --timeout 60000 --output scratch/equipe-erros-convite-verificado
npm run build
npm run lint
```

O runner de convite foi executado com `RECOVERY_TEST_EXTERNAL_SERVER=1` somente
no processo do teste, usando o servidor sintético do runner existente. Ambiente
local3000 não foi usado para escritas de teste. As 75 verificações de Equipe e
3 de convite somam **78 cenários de interface**, além dos 15 testes Node;
reexecuções acima não aumentam essa contagem.

Todos os testes de escrita interceptam solicitações e respondem em memória;
destinos externos não previstos são bloqueados. Lista vazia real (`[]`) difere de
erro; permissão/sessão/rede/desconhecido não disparam consulta antiga. Troca de
clínica/perfil descarta lista/ficha anteriores. Formulário mantém e-mail/papéis,
botões são liberados após falha e contadores comprovam uma chamada por clique.

## Conferência real somente por leitura — agente, 04/10/2026 20:53–20:56 -03:00

Aplicação local Vite `http://127.0.0.1:3000`, correção carregada por atualização da
página. Perfil **Proprietário(a)** observado no menu da sessão, sem registrar
identificação pessoal. Brotas e Ipupiara: listagem aberta, ficha administrativa
existente aberta com painel de acesso funcionando, texto/seletor Recepção nas
duas clínicas e Salvar papel bloqueado sem mudança. Nenhum alerta de falha.
Retorno a Brotas e fechamento das fichas ao terminar. Não editadas seleções reais.
Após o ajuste final, nova atualização em Brotas e reabertura da ficha confirmaram
novamente listagem/painel funcionando, sem erro e com Salvar bloqueado sem mudança.

Sessão real de Recepção não utilizada; sessão Proprietária preservada. Restrição
Recepção e todas as falhas foram demonstradas somente em ambiente sintético.
Leituras reais comprovam o funcionamento normal na amostra; não comprovam envio,
aceite ou recuperação após falha real, que não foram provocados. Sem captura
independente de JSON da rede no navegador interno. Não é aprovação do usuário.

## Arquivos e documentação

Código: `src/lib/equipeErros.ts`, `src/lib/equipeAcessos.ts`,
`src/pages/cadastros/Equipe.tsx`, `src/pages/cadastros/Cadastros.tsx`,
`src/pages/ConviteEquipe.tsx`, `src/config/notasEvolucao.json`.
Testes: `src/lib/equipeErros.test.ts`, `tests/operacional/equipe-erros.spec.ts`,
`tests/operacional/equipe-contexto.tsx`, `tests/operacional/equipe.spec.ts`,
`tests/login/convite.spec.ts`. Testes e relatório24 do seletor preservados.
Documentos: este relatório, README/mestre/checkpoint Equipe, nota de atualização
no relatório23, índice e checkpoints raiz/operacional.

## Limites, Git e continuação

Skill Supabase não disponível nesta sessão; documentação oficial e SDK local
consultados. Skill `typesafe-ai` consultada: regras determinísticas, sem IA, chamadas
TypeSafe ou chave. ReUI não acrescenta benefício a este ajuste dos componentes
existentes; nenhuma instalação, troca de layout ou dependências.

Branch `codex/resgate-local-2026-09-26`; HEAD
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`. Mudanças anteriores de outras tarefas
preservadas. Alterações desta entrega não commitadas. Nenhum commit, push, merge
ou deploy; GitHub não recebeu a correção, publicação não realizada nem revalidada
nesta etapa. Build não é prova de publicação. Diff revisado e `git diff --check`
sem problemas de whitespace nos arquivos envolvidos; avisos CRLF do Git são do
ambiente existente. Hashes do relatório24 e de `equipe-papeis.spec.ts` iguais aos
observados no início desta tarefa, comprovando sua preservação integral.

Nenhum SQL, banco, RLS, migration, Auth, SMTP, Edge Function, acesso real, convite,
suspensão ou reativação alterado. Ibitiara não utilizada. Pendências anteriores de
Equipe, senha/aceite real e Caixa preservadas. Etapa encerrada. Próxima ação,
se o titular quiser conferir: atualizar local3000, Cadastros → Equipe & acessos,
abrir uma ficha existente em Brotas/Ipupiara, conferir papel/Salvar bloqueado e
fechar sem salvar. Outras melhorias/publicação dependem de novo pedido.

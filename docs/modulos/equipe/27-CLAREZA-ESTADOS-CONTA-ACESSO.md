# Equipe — clareza dos estados de conta e acesso

Etapa concluída localmente pelo Codex em 05/10/2026, 06:39 -03:00.
Pedido de implementação autorizado pelo usuário; conferência feita pelo agente,
sem atribuir aprovação pessoal do resultado ao usuário. Relatórios24/25/26 e
trabalhos de outras sessões preservados.

## Investigação e causas comprovadas

Na demonstração da etapa26, os textos pertenciam ao mesmo registro **sintético**.
O serviço simulado de acesso retornava conta vinculada, enquanto a lista simulada
continuava fixamente com `acesso_status=sem_conta`. A captura comprova inconsistência
daquela fixture; não comprova contradição no banco ou na sessão real. A fixture
anterior foi preservada para regressão; os novos cenários usam fontes coerentes.

No código, ausência/valor desconhecido do estado da lista caía em “Sem conta
vinculada”, e a conversão booleana de `usuario_id` confundia campo ausente com
ausência confirmada. O resumo genérico da ficha também repetia informações
limitadas da lista ao lado da leitura detalhada de acesso.

A atualização incompleta foi reproduzida antes da correção: concessão simulada
confirmada atualizava o painel, mas não disparava nova leitura coletiva. O teste
diagnóstico falhou porque o contador de leituras da lista permaneceu em2; o
contexto capturado manteve “Sem acesso nesta clínica” após a concessão. Essa
evidência sintética confirma o fluxo do frontend, sem alterar acesso real.

## Significado e apresentação dos estados

| Informação disponível | Apresentação e limite |
| --- | --- |
| Registro da pessoa | “Pessoa cadastrada”; cadastro não comprova login. |
| Vínculo cadastral com clínica | Onde a pessoa atua; acesso ao sistema conferido separadamente. |
| `usuario_id` não vazio na leitura de acesso | “Conta de acesso vinculada”; confirmação de e-mail é informação separada. |
| `usuario_id=null` explícito | “Sem conta vinculada”; convite pendente não comprova conta criada. |
| Campo ausente/desconhecido ou leitura insuficiente | “Não foi possível confirmar a conta” ou “Conta e acesso não confirmados”; nenhuma nova concessão inferida. |
| Estado por clínica confirmado | Acesso ativo, suspenso, convite pendente, conta inativa ou “Sem acesso a esta clínica”. |
| Papel confirmado de acesso ativo | “Papel atual: Recepção”, por exemplo; seletor usa a mesma referência. |
| Solicitação existente | “Papel da solicitação”; reenvio conserva o papel original. |
| Novo acesso sem escolha | “Escolha o papel para o novo acesso em Clínica X.”; confirmação desabilitada. |
| Novo acesso com escolha | Pessoa · clínica · papel escolhido, separado do acesso atual. |

A ficha tem um único bloco de acesso, com conta global e situação por clínica.
Termos internos Auth/RPC foram retirados das mensagens comuns desse bloco. Uma
conta vinculada sem e-mail retornado continua vinculada; não se presume ausência
de conta pela falta de e-mail.

A lista começa com a informação da consulta coletiva existente, que não traz
todos os detalhes de convites/papéis. Depois de abrir a ficha, compartilha a leitura
confirmada daquele membro/contexto. Não faz consulta de conta para cada linha.
O cache é apenas local e descartado nas mudanças de clínica/perfil ou recarga
completa. Respostas de outra pessoa/contexto não substituem os dados atuais.

Operação confirmada dispara a releitura do painel e da lista coletiva, sem F5 e
sem limpar os filtros. Não há atualização otimista de papel/acesso. Falha na
atualização coletiva mostra consulta não concluída, em vez de anunciar lista atual.
Resultado incerto invalida a confirmação do resumo e identifica o painel como
última consulta; pede reabertura sem repetir escrita automaticamente. Falha
conhecida preserva os estados anteriores e o preenchimento.

## Arquivos desta etapa

- `src/pages/cadastros/Equipe.tsx`: estados, bloco único, resumo da lista, callbacks
  de leitura/atualização, orientação/resumo dos rascunhos e ajuste responsivo.
- `src/lib/equipe.ts` e `src/lib/equipeAcessos.ts`: rótulos de estados; contratos,
  validação, chamadas de serviço e wrappers de acesso preservados.
- `src/config/notasEvolucao.json`: nota de melhoria ainda não lançada.
- `tests/operacional/equipe-estados.spec.ts`: sete cenários novos, fontes coerentes.
- `tests/operacional/equipe-ficha.spec.ts` e `equipe-papeis.spec.ts`: expectativas
  dos novos textos; lógica dos cenários anteriores mantida.
- Este relatório, README/mestre/checkpoint de Equipe, índice/checkpoint operacional
  de IA e checkpoint raiz: decisão de apresentação, evidências e limitações.

Hashes comparados com a entrada da etapa confirmam preservação de `equipeErros.ts`,
testes de erros/escolha explícita e relatórios24/25/26. No serviço de acessos, trecho
de contratos/invocação/wrappers permanece idêntico. CPF, papéis/permissões,
vínculos profissionais e consulta operacional da Recepção não foram alterados.

## Verificações locais e simuladas

Serviços substituídos por respostas sintéticas nos testes, com bloqueio de rede
externa; nenhuma operação de teste atingiu contas ou acessos reais.

| Execução | Resultado |
| --- | --- |
| Diagnóstico anterior ao ajuste | 0/1; falha esperada confirmou ausência de atualização da lista. |
| Cinco arquivos UI dirigidos, três tamanhos | 98/102; três falhas de expectativa de texto antigo e um timeout antes de abrir ficha desktop. |
| Reconferência após ajustar textos/dependência do callback | 12/12; inclui os quatro cenários envolvidos nos três tamanhos. |
| Regras Node de Equipe/erros | 15/15 aprovados. |
| TypeScript e build finais (`npm run build`) | Aprovados. |
| Lint final | Aprovado; aviso preexistente de exportação em ThemeProvider. |
| Diff e preservação | `git diff --check` aprovado; arquivos anteriores comparados com baseline. |

Não registrar a rodada principal como102/102: falhas e reconferência são execuções
separadas. O timeout anterior não reproduziu divergência do seletor; o mesmo
cenário passou na reconferência. Avisos preexistentes de chunks/importação no
build continuam sem intervenção nesta etapa.

Os sete cenários cobrem cadastro sem conta confirmada; conta vinculada sem acesso;
ativo/suspenso/pendente/inativo; campo indisponível e falha de leitura; estados
diferentes por clínica; sucesso e atualização sem F5 mantendo filtros; falha
conhecida/incerta e erro da atualização coletiva; troca de pessoa/contexto;
resumos vazio/escolhido e teclado/foco. Regressões24/25/26 foram incluídas.

Capturas finais desktop1440 e celular360/390 foram examinadas: texto legível,
resumo visível após rolagem da ficha, escolha independente, foco no botão e sem
transbordamento horizontal dos blocos alterados. A lista mantém sua rolagem
horizontal existente. Evidências locais não versionadas em
`scratch/equipe-estados/diagnostico`, `resultados` e `reconferencia`; capturas do
cenário “resumo orienta” na reconferência contêm apenas dados fictícios.

## Sessão real — somente leitura

Aplicação local `http://127.0.0.1:3000`, código atualizado e recarga observada;
perfil **Proprietário(a)** confirmado pelo menu. Nenhuma identificação pessoal
necessária foi registrada ou imagem de dados reais anexada.

- **Brotas:** lista com acessos ativos; ficha de administrativo com conta vinculada,
  “Papel atual: Recepção” nas duas clínicas, seletores correspondentes e “Salvar
  papel” desabilitado. Ao fechar, resumo da lista refletiu a leitura detalhada.
- **Ipupiara:** após recarga, ficha sem conta mostrou “Sem conta vinculada” e
  “Convite pendente”, com papel original Recepção e novo envio bloqueado. Ao fechar,
  a lista exibiu os dois estados. Outra ficha mostrou conta vinculada e papel
  Recepção nas duas clínicas, seletores correspondentes e ambos os botões Salvar
  desabilitados; ao fechar, a lista exibiu conta/acesso/papel confirmados.
- Troca de pessoa/clínica e retorno final à lista de Brotas realizados sem seleção
  de papel ou qualquer ação de escrita. Não houve divergência na amostra lida.

Comparação feita com o resultado do serviço renderizado pela aplicação; não houve
captura independente de JSON de rede. A sessão Proprietária não comprova sessão
Recepção nem produção. Conta vinculada sem acesso, suspensões, informações ausentes,
novas escolhas, falhas e atualização após escrita foram **somente simulados** nesta
etapa; não foram criados registros para completar amostras ausentes.

## Ferramentas, limites e encerramento

Typesafe-ai consultada: regras determinísticas implementadas diretamente, sem IA
para inferir estados. A preferência universal de triagem Jev chegou como atualização
de instruções durante a continuação desta etapa; não se repetiu/retroagiu a triagem
para a mesma tarefa. Nenhuma API de IA, chave ou envio privado usado nesta etapa.
Skill Supabase não disponível no catálogo/instalação pesquisada; utilizada a
[documentação oficial de RPC](https://supabase.com/docs/reference/javascript/rpc)
e contratos locais. Impeccable aplicado ao acabamento localizado; ReUI avaliado,
com componentes/tokens existentes suficientes, sem instalação ou recurso pago.

Branch `codex/resgate-local-2026-09-26`, HEAD
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`; alterações locais não commitadas.
Nenhuma ação de GitHub, commit, push, merge ou deploy feita; situação remota não
reconsultada. A correção desta etapa continua local, sem publicação.

Nenhum dado, conta, convite, vínculo ou acesso real alterado. Sem SQL, banco,
migration, Auth, RLS, SMTP, Edge Function ou dependência modificada. Trabalho
preexistente e registros simultâneos preservados. Consulta completa da equipe
por Recepção continua pendente de decisão fora deste escopo.

Próxima ação opcional do titular: atualizar a aplicação local, abrir Cadastros →
Equipe & acessos, selecionar clínica e Ver cadastro. Comparar conta, estado da
clínica e Papel atual; fechar/reabrir e conferir a lista. Não é necessário salvar
nem enviar convite. Aprovação pessoal permanece pendente de confirmação expressa.
Nenhuma melhoria adicional foi iniciada.

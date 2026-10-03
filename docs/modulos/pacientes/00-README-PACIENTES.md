# PACIENTES — ÍNDICE DO MÓDULO

**Status:** EM VALIDAÇÃO

03/10/2026 — redesenho e acabamento local de lista, resumo e formulário, verificados em isolamento: [15-REDESENHO-LOCAL.md](15-REDESENHO-LOCAL.md).
Indicador não obrigatório de seis itens, estados desconhecidos e contagens autorizadas; sem mudança de banco.

## Ordem de leitura

1. `01-DOCUMENTO-FUNCIONAL-MESTRE.md` — decisões aprovadas, estado confirmado, propostas e critérios de aceite.
2. `07-PLANO-IMPLEMENTACAO.md` — unificação de cadastro e edição em iterações A→E; escopo, ordem e critérios.
3. `08-CHECKPOINT.md` — migrations aplicadas, validações executadas e pendências da versão local.
4. `../../padroes/PADRAO-PREENCHIMENTO-CADASTROS-BR.md` — regras transversais para nomes, CPF, telefone, CEP e endereço.
5. `09-REVISAO-ORDENACAO-FILTROS.md` — controles implementados, limite seguro da consulta atual e proposta separada de paginação global.
6. `10-EDICAO-ADMINISTRATIVA.md` — histórico do desenho e da revisão inicial da edição.
7. `11-EDICAO-APLICACAO-CONTROLADA.md` — instalação controlada, ensaios, homologação e recuperação.
8. `13-CONFIRMACOES-VISIVEIS-CADASTRO.md` — confirmações, erros, validação e proteção contra envio repetido no cadastro de pacientes.
9. `14-CPF-LEGADO-INVALIDO.md` — identificação segura do CPF legado inválido e caminho de correção auditada.

## Estado desta evolução

**Estado atual (29/09/2026):** a confirmação de criação e edição foi observada em gravações conectadas com fixture sintética; os caminhos de falha foram verificados por simulação, sem provocar indisponibilidade no Supabase. A leitura individual distingue CPF legado inválido confirmado (`PC422`) de falha técnica e falta de autorização. A correção auditada pela proprietária, sem exibir o número antigo, foi comprovada pela interface autenticada em fixture sintética, com confirmação visível, persistência após recarga, auditoria e limpeza por ID. O CPF real de Ipupiara não foi alterado e ainda exige conferência documental. As descrições datadas abaixo preservam o histórico e não substituem este estado.

Na primeira revisão de 27/09, a identificação na edição passou a distinguir CPF confirmado ausente, confirmado informado, consulta em andamento e consulta falha. A inclusão usa a RPC já aplicada e não participa do patch administrativo; o resumo oferece lembrete não bloqueante após ausência confirmada. Naquele momento, a correção do CPF preenchido estava indisponível na interface e a proposta SQL auditada ainda não havia sido aplicada ao Supabase conectado. Ver checkpoint.

Evolução local posterior: a ficha da proprietária usa uma RPC individual para ler o CPF completo em campo somente de leitura e oferece correção com motivo e confirmação, preservando alterações cadastrais abertas. A migration versionada `20260927100000_pacientes_cpf_leitura_correcao.sql` foi aplicada isoladamente ao Supabase vinculado após ensaio transacional com dependências reais; a homologação por sessão HTTP autenticada ainda está pendente. A migration anterior `20260925130000` continua não aplicada. A recepção não ganha leitura integral nem correção de CPF preenchido.

Refinamento local de 27/09: a gestão administrativa de foto oferece “Escolher foto”, “Usar câmera”, “Salvar foto” e descarte da seleção separado de remoção da foto salva. O resumo agora é sobreposto também no desktop (460 px), com diálogo e foco contido, sem reduzir a tabela. O cadastro inicial continua distinguindo confirmação local da foto de persistência ao salvar o paciente. Evidências e limites da rodada estão no checkpoint.

A versão local de Pacientes inclui cadastro responsivo inspirado nas referências do Google Stitch, busca exata e segura por CPF, lembrete de CPF ausente, proteção durante troca de clínica e integração “Novo paciente” com a Agenda. No formulário, o contato é apresentado como “Telefone / WhatsApp”, sem presumir verificação do canal ou autorização para mensagens; nomes e campos textuais apropriados do endereço são formatados durante a edição; e o avatar acompanha as iniciais do nome digitado, usando um símbolo neutro enquanto o nome estiver vazio.

Na conferência conectada de 29/09/2026, uma sessão autorizada comprovou criação, edição pela tabela, edição pelo resumo, confirmação visível sem duplicação e persistência após recarregar usando fixture sintética, posteriormente removida. Falhas de serviço e de atualização parcial continuam classificadas como testes sintéticos. Em Ipupiara, CPF legado com dígitos inválidos é apresentado como indisponível, nunca como ausente; o diagnóstico e a decisão futura estão no relatório 13 e no diagnóstico de integridade.

A página principal local agora alterna explicitamente busca por nome e CPF exato, apresenta pacientes ativos com foto privada ou iniciais e abre um resumo administrativo do cadastro selecionado (inclusive endereço textual literal e responsáveis consultados na clínica). No desktop e no celular, o resumo é sobreposto. “Ir para Agenda” apenas navega; a pré-seleção do paciente não foi implementada. Paginação e ficha administrativa completa continuam propostas, não recursos concluídos.

A edição administrativa local pode ser aberta diretamente pela ação “Editar” de cada linha da tabela ou por “Editar cadastro” no resumo; as duas entradas usam o mesmo formulário e a mesma RPC já aplicada. A ação só aparece na superfície administrativa acessível a proprietária e recepção. A homologação real específica do caminho direto da tabela na porta 3000 é registrada no checkpoint, separadamente dos testes sintéticos.

Em 28/09/2026, cadastro e edição passaram a compartilhar a navegação de etapas e a seção visual de Endereço e Contatos. Na edição, CEP, logradouro, número, complemento, bairro, cidade e UF permanecem visíveis para cadastros estruturados, históricos ou sem endereço. O texto histórico aparece somente como referência e nunca é decomposto por heurística; erro ou carregamento incompleto bloqueia o salvamento e oferece nova tentativa. A migration aditiva `20260928110000_pacientes_endereco_estruturado.sql` foi aplicada isoladamente ao projeto vinculado e registrada no histórico remoto. Ensaio conectado com `ROLLBACK` e homologação HTTP autenticada com fixtures sintéticas comprovaram criação, edição e releitura nas duas clínicas; todas as fixtures foram removidas. A migration independente `20260925130000` continua não aplicada.

O resultado da edição usa o Alert compartilhado no componente pai da página. Após confirmação do backend, o título “Alterações salvas” e a descrição “O cadastro do paciente foi atualizado com sucesso.” permanecem visíveis por aproximadamente seis segundos mesmo com o formulário fechado e com o resumo aberto. Falha mantém o formulário e o rascunho; falha apenas da releitura da lista informa que o cadastro foi salvo e oferece “Atualizar lista”, sem sugerir nova gravação.

Na revisão local inicial de 29/09/2026, a confirmação de edição passou a separar título e descrição (`Alterações salvas` / `O cadastro do paciente foi atualizado com sucesso.`), enquanto a criação mantém `Paciente cadastrado com sucesso.`. Validações customizadas direcionam o foco para o primeiro campo aplicável e o cadastro usa uma trava de envio além do botão desabilitado. Os testes daquela revisão foram sintéticos; a validação conectada posterior está em `13-CONFIRMACOES-VISIVEIS-CADASTRO.md`. A aplicação posterior de Equipe é documentada somente no checkpoint próprio desse módulo.

Na primeira revisão local de 27/09, a edição ganhou ações visíveis para abrir a gestão privada de foto e, quando o CPF está ausente, a inclusão pelo fluxo dedicado já existente. Essas ações são operações separadas da edição dos sete campos administrativos; alterações ainda não salvas exigem confirmação antes da transição. O primeiro responsável de menor sem vínculo pode ser incluído pela RPC administrativa existente; alteração de vínculo já cadastrado permanece pendente. A correção de CPF já preenchido foi implementada posteriormente, conforme o parágrafo acima. A continuação autenticada anterior na porta 3000 comprovou edição e foto com fixtures preexistentes em Brotas/Ipupiara e conflito de revisão em Brotas. Os valores das fixtures foram restaurados. Inclusão positiva de CPF, correção por sessão real, falha remota de upload e sessões de outros papéis permanecem separadamente pendentes; evidências e limites de limpeza estão no checkpoint. Resposta de CPF não booleana é indisponibilidade, não prova de presença/ausência.

Na árvore original, a idade é calculada para exibição a partir da data de nascimento; o cadastro mostra duas etapas disponíveis para adulto (Identificação; Endereço e Contatos) e acrescenta uma etapa própria de Responsável legal quando a idade indica menor. Foto e dados digitados permanecem ao avançar e voltar. As migrations estruturais de responsável (`20260925100000`) e foto privada (`20260925120000`) foram aplicadas ao Supabase em 25/09/2026; a trava de menor sem responsável continua preparada e não aplicada. O frontend não foi publicado. A decisão sobre data de nascimento ausente permanece pendente no Documento Funcional Mestre.

As migrations `20260924120000` e `20260924130000` já foram aplicadas no Supabase da Clínica Patrícia. O frontend correspondente ainda não foi publicado.

O design não transforma recursos ilustrados pelo Stitch em funcionalidades aprovadas. “Convênios — Em planejamento” aparece apenas como indicação inativa entre as etapas disponíveis; não há formulário, elegibilidade TISS, validação externa nem dados de convênio salvos. Consentimentos e demais campos não suportados continuam ausentes ou explicitamente indisponíveis. A interface local de foto opcional (arquivo/webcam, prévia, confirmação, troca e remoção) foi implementada; o fluxo real de proprietária em Ipupiara foi homologado com imagem sintética e limpeza comprovada. Recepção, médico e vínculo de clínica única ainda exigem sessões autenticadas próprias. A nova trava de menor sem responsável está preparada na migration local `20260925130000`, ainda não aplicada.

A listagem local tem seis ordenações e filtros de período de criação, idade e presença de nascimento. A consulta nominal aplica os filtros no servidor, solicita contagem exata e só ordena no cliente respostas comprovadamente completas, até 1000 registros. Se houver truncamento, pede refinar a consulta e não exibe uma ordenação parcial. A paginação global de conjuntos maiores está proposta separadamente em `supabase/review/pacientes_listagem_ordenacao_global.sql`, não aplicada. Esta evolução não foi incorporada às PRs de integração de 0.1.0.

## Base de integração

A branch local de preparação usa como base `codex/checkpoint-local-2026-08-14` no commit `d550211886ad93ad0c58d49f540aac8f81a19536`. A integração desse checkpoint com `main` será tratada separadamente.

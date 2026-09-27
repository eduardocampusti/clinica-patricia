# PACIENTES — ÍNDICE DO MÓDULO

**Status:** EM VALIDAÇÃO

## Ordem de leitura

1. `01-DOCUMENTO-FUNCIONAL-MESTRE.md` — decisões aprovadas, estado confirmado, propostas e critérios de aceite.
2. `07-PLANO-IMPLEMENTACAO.md` — unificação de cadastro e edição em iterações A→E; escopo, ordem e critérios.
3. `08-CHECKPOINT.md` — migrations aplicadas, validações executadas e pendências da versão local.
4. `../../padroes/PADRAO-PREENCHIMENTO-CADASTROS-BR.md` — regras transversais para nomes, CPF, telefone, CEP e endereço.
5. `09-REVISAO-ORDENACAO-FILTROS.md` — controles implementados, limite seguro da consulta atual e proposta separada de paginação global.
6. `10-EDICAO-ADMINISTRATIVA.md` — histórico do desenho e da revisão inicial da edição.
7. `11-EDICAO-APLICACAO-CONTROLADA.md` — instalação controlada, ensaios, homologação e recuperação.

## Estado desta evolução

A versão local de Pacientes inclui cadastro responsivo inspirado nas referências do Google Stitch, busca exata e segura por CPF, lembrete de CPF ausente, proteção durante troca de clínica e integração “Novo paciente” com a Agenda. No formulário, o contato é apresentado como “Telefone / WhatsApp”, sem presumir verificação do canal ou autorização para mensagens; nomes e campos textuais apropriados do endereço são formatados durante a edição; e o avatar acompanha as iniciais do nome digitado, usando um símbolo neutro enquanto o nome estiver vazio.

A página principal local agora alterna explicitamente busca por nome e CPF exato, apresenta pacientes ativos com foto privada ou iniciais e abre um resumo administrativo do cadastro selecionado (inclusive endereço textual literal e responsáveis consultados na clínica). No celular, o resumo é sobreposto. “Ir para Agenda” apenas navega; a pré-seleção do paciente não foi implementada. Paginação e ficha administrativa completa continuam propostas, não recursos concluídos.

A edição administrativa local pode ser aberta diretamente pela ação “Editar” de cada linha da tabela ou por “Editar cadastro” no resumo; as duas entradas usam o mesmo formulário e a mesma RPC já aplicada. A ação só aparece na superfície administrativa acessível a proprietária e recepção. A homologação real específica do caminho direto da tabela na porta 3000 é registrada no checkpoint, separadamente dos testes sintéticos.

Na árvore original, a idade é calculada para exibição a partir da data de nascimento; o cadastro mostra duas etapas disponíveis para adulto (Identificação; Endereço e Contatos) e acrescenta uma etapa própria de Responsável legal quando a idade indica menor. Foto e dados digitados permanecem ao avançar e voltar. As migrations estruturais de responsável (`20260925100000`) e foto privada (`20260925120000`) foram aplicadas ao Supabase em 25/09/2026; a trava de menor sem responsável continua preparada e não aplicada. O frontend não foi publicado. A decisão sobre data de nascimento ausente permanece pendente no Documento Funcional Mestre.

As migrations `20260924120000` e `20260924130000` já foram aplicadas no Supabase da Clínica Patrícia. O frontend correspondente ainda não foi publicado.

O design não transforma recursos ilustrados pelo Stitch em funcionalidades aprovadas. “Convênios — Em planejamento” aparece apenas como indicação inativa entre as etapas disponíveis; não há formulário, elegibilidade TISS, validação externa nem dados de convênio salvos. Consentimentos e demais campos não suportados continuam ausentes ou explicitamente indisponíveis. A interface local de foto opcional (arquivo/webcam, prévia, confirmação, troca e remoção) foi implementada; o fluxo real de proprietária em Ipupiara foi homologado com imagem sintética e limpeza comprovada. Recepção, médico e vínculo de clínica única ainda exigem sessões autenticadas próprias. A nova trava de menor sem responsável está preparada na migration local `20260925130000`, ainda não aplicada.

A listagem local tem seis ordenações e filtros de período de criação, idade e presença de nascimento. A consulta nominal aplica os filtros no servidor, solicita contagem exata e só ordena no cliente respostas comprovadamente completas, até 1000 registros. Se houver truncamento, pede refinar a consulta e não exibe uma ordenação parcial. A paginação global de conjuntos maiores está proposta separadamente em `supabase/review/pacientes_listagem_ordenacao_global.sql`, não aplicada. Esta evolução não foi incorporada às PRs de integração de 0.1.0.

## Base de integração

A branch local de preparação usa como base `codex/checkpoint-local-2026-08-14` no commit `d550211886ad93ad0c58d49f540aac8f81a19536`. A integração desse checkpoint com `main` será tratada separadamente.

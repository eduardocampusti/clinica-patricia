# PACIENTES — ÍNDICE DO MÓDULO

**Status:** EM VALIDAÇÃO

## Ordem de leitura

1. `01-DOCUMENTO-FUNCIONAL-MESTRE.md` — decisões aprovadas, estado confirmado, propostas e critérios de aceite.
2. `08-CHECKPOINT.md` — migrations aplicadas, validações executadas e pendências da versão local.
3. `../../padroes/PADRAO-PREENCHIMENTO-CADASTROS-BR.md` — regras transversais para nomes, CPF, telefone, CEP e endereço.

## Estado desta evolução

A versão local de Pacientes inclui cadastro responsivo inspirado nas referências do Google Stitch, busca exata e segura por CPF, lembrete de CPF ausente, proteção durante troca de clínica e integração “Novo paciente” com a Agenda. No formulário, o contato é apresentado como “Telefone / WhatsApp”, sem presumir verificação do canal ou autorização para mensagens, e o avatar acompanha as iniciais do nome digitado, usando um símbolo neutro enquanto o nome estiver vazio.

As migrations `20260924120000` e `20260924130000` já foram aplicadas no Supabase da Clínica Patrícia. O frontend correspondente ainda não foi publicado.

O design não transforma recursos ilustrados pelo Stitch em funcionalidades aprovadas. Convênio, validações externas, captura de foto, consentimentos e campos ainda não suportados continuam ausentes ou explicitamente indisponíveis.

## Base de integração

A branch local de preparação usa como base `codex/checkpoint-local-2026-08-14` no commit `d550211886ad93ad0c58d49f540aac8f81a19536`. A integração desse checkpoint com `main` será tratada separadamente.

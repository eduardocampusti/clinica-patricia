# CHECKPOINT — PACIENTES

## Estado em 24/09/2026

- Projeto Supabase confirmado: `Clinica Patrícia` (`xftnkusbyqzyvzrovroj`).
- Migration `20260924120000_pacientes_cpf_pendente_rpc.sql`: aplicada anteriormente.
- Migration `20260924130000_pacientes_busca_cpf_segura.sql`: aplicada de forma controlada com `supabase migration up --linked`.
- Histórico local e remoto alinhado até `20260924130000` após a aplicação.
- RPC `public.paciente_buscar_por_cpf(uuid, text)` confirmada como `SECURITY DEFINER`, `STABLE` e com `search_path=pg_catalog, public`.
- Execução da nova RPC permitida a `authenticated` e negada a `anon`.
- A resposta da RPC contém somente `id`, `nome_completo`, `data_nascimento`, `telefone`, `endereco` e `ativo`; não retorna CPF integral, ciphertext ou hash.
- `cpf_decrypt(bytea)` e seus privilégios anteriores foram preservados para compatibilidade: `authenticated` e `service_role` continuam permitidos; `anon` continua negado.
- Smoke transacional com dados sintéticos passou para proprietária, recepção, médico negado, CPF inválido, paciente inativo, duas clínicas com o mesmo CPF, clínica inativa e contexto divergente.
- O smoke terminou com `ROLLBACK`; verificação posterior confirmou ausência dos usuários, clínicas e pacientes sintéticos.

## Versão local Stitch e Agenda

- Branch local de revisão: `codex/pacientes-stitch-agenda`, baseada em `codex/checkpoint-local-2026-08-14` no commit `d550211886ad93ad0c58d49f540aac8f81a19536`.
- O cadastro local usa o desenho Stitch como referência visual, mas apresenta somente campos, estados e integrações realmente suportados.
- Etapas indisponíveis não são apresentadas como concluídas; convênio, validação na Receita, captura de foto, consentimento genérico e emissão automática de prontuário não são simulados como funcionalidades ativas.
- O contato do paciente é apresentado como “Telefone / WhatsApp”, sem indicar verificação do número ou ativar mensagens automáticas. O avatar ilustrativo acompanha as iniciais digitadas e usa uma silhueta neutra sem nome.
- O fluxo “Novo paciente” da Agenda preserva clínica, profissional, data, horário e observações. Cancelar retorna sem criar paciente; salvar retorna com o paciente da mesma clínica selecionado.
- A troca de clínica suspende superfícies sensíveis, associa respostas à clínica que originou a carga e limpa o formulário de paciente em transição.
- Capturas sintéticas de identificação e endereço foram geradas para desktop, tablet e celular e permanecem fora dos arquivos candidatos à PR.
- A suíte operacional passou em 27 cenários; os testes unitários de preenchimento passaram em 7 cenários; build e verificação de tipos passaram. O lint mantém somente advertências preexistentes fora do módulo.

## Pendente

- Publicar o frontend que utiliza a busca exata e deixa de descriptografar CPFs em massa na listagem.
- Homologar a chamada pelo frontend publicado em Brotas e Ipupiara com contas de teste autorizadas, sem alterar pacientes reais.
- Revogar futuramente a execução direta de `cpf_decrypt` para clientes autenticados somente depois de confirmar que nenhuma versão publicada ou consumidor autorizado ainda depende dela.
- Revisar a PR isolada antes de qualquer merge ou publicação.

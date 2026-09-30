# Equipe & acessos — conferência autenticada da consulta

**Estado:** CONFERÊNCIA AUTENTICADA PARCIALMENTE CONCLUÍDA — homologação Supabase pendente

**Data:** 29/09/2026  
**Projeto:** `D:\PROJETOS SAAS\CLINICA PATRICIA\`  
**Escopo:** verificar **Cadastros → Equipe & acessos → Ver cadastro** com sessão já autorizada, sem gravar dados.

## 1. Separação das evidências

Esta rodada não deve ser confundida com as anteriores:

- **Desenvolvimento local:** concluído no código atual e descrito em `15-FICHA-MEMBRO-CONSULTA.md`.
- **Testes locais:** concluídos com build, lint, testes determinísticos e harness sintético. As respostas do harness são fictícias e não representam o banco.
- **Conferência autenticada:** concluída para a sessão autorizada nas telas disponíveis de Brotas e Ipupiara, sem gravação. A ficha foi aberta em um registro existente de Brotas; Ipupiara apresentou estado vazio.
- **Homologação completa do Supabase:** não executada. Não foram validados Auth, PostgREST, RLS, Vault, Storage, auditoria ou persistência real.

Essa conferência confirma o comportamento observado nessa sessão e nesses registros; não declara a consulta autenticada universalmente aprovada nem substitui a homologação do Supabase.

## 2. Ajuste documental realizado

O relatório `15-FICHA-MEMBRO-CONSULTA.md` foi corrigido para:

- separar desenvolvimento/testes locais, conferência autenticada e homologação Supabase;
- orientar o uso apenas dos registros reais que a lista apresentar;
- registrar estado vazio se não houver membros, sem criar dados de teste na aplicação;
- não tratar automaticamente a ausência de recepção ou apoio no modo legado como defeito, pois a consulta legada lista apenas profissionais existentes nela.

## 3. Servidor e código conferidos

- Entrada local de Brotas: [http://127.0.0.1:5173/acesso/brotas](http://127.0.0.1:5173/acesso/brotas).
- Entrada local de Ipupiara: [http://127.0.0.1:5173/acesso/ipupiara](http://127.0.0.1:5173/acesso/ipupiara).
- Ambas responderam HTTP 200 durante esta rodada.
- A porta 5173 está em escuta por um processo Node (`PID 29152`). O comando de inicialização não pôde ser lido com `Win32_Process` por restrição de acesso do Windows.
- Como verificação funcional adicional, o Vite serviu `src/pages/cadastros/Equipe.tsx` contendo os marcadores atuais da ficha (`Ficha de` e `ficha-indisponivel`). Isso confirma que a interface acessível contém o código desta implementação; não prova, sozinho, o diretório de trabalho do processo.
- O servidor auxiliar usado pelos testes em outra porta foi encerrado; a porta 5173 permaneceu disponível.

Não foi feita alteração de configuração para obter essa confirmação.

## 4. Estado da sessão e observação por clínica

### Brotas

Após o login normal pela própria interface, a sessão foi confirmada como **Proprietário(a)**. Em **Cadastros → Equipe & acessos**, a tela carregou o aviso de compatibilidade e uma lista real com um profissional de saúde existente. O modo legado apresentou nome, cargo, profissão, conselho, registro e vínculo com Brotas; telefone, e-mail, UF, CPF e estado detalhado de acesso apareceram como ausentes ou indisponíveis, conforme o contrato legado.

A ficha abriu pelo comando acessível do registro selecionado e os dados exibidos correspondiam ao membro da linha. A mensagem de consulta legada ficou visível, o CPF foi apresentado como indisponível nesta consulta e o acesso como “Conta vinculada (estado não confirmado)”. A ficha foi fechada e reaberta sem trocar de membro.

Não havia recepção ou apoio na lista legada. Isso foi registrado como limitação da fonte antiga, não como defeito automático.

### Ipupiara

Com a mesma sessão e permissão, a clínica foi selecionada pelo controle real de contexto. A tela exibiu o aviso de compatibilidade, manteve o contexto **Clínica Ipupiara** e apresentou **Nenhum membro encontrado**. Não foi criado nenhum dado para preencher a lista.

Ao voltar para Brotas, o registro existente reapareceu e não permaneceu nenhum modal ou conteúdo de Ipupiara na tela. Essa troca confirmou, neste fluxo real, a limpeza do contexto anterior.

Não foram criados membros, profissionais, contas ou vínculos para preencher a conferência.

## 5. Problemas e correções

Nenhum defeito local concreto foi encontrado na consulta autenticada observada. O modo legado mostrou o aviso esperado, abriu a ficha do registro existente, diferenciou dados não cadastrados/indisponíveis e limpou o contexto ao alternar a clínica.

Correção documental realizada:

- `docs/modulos/equipe/15-FICHA-MEMBRO-CONSULTA.md` agora diferencia explicitamente as quatro situações de evidência e não exige que o modo legado apresente recepção/apoio.

Não houve correção de código, migration, banco, Auth, permissão ou configuração. Portanto, não foram necessários novos testes de build/lint; os resultados locais de `15-FICHA-MEMBRO-CONSULTA.md` permanecem a evidência do código e do harness, enquanto esta conferência acrescenta a observação autenticada real.

## 6. Verificações não executadas e motivo

- Consultar uma ficha detalhada via RPC `equipe_detalhar`: não executado porque a lista permaneceu em modo legado e a ausência das RPCs novas é esperada enquanto a migration estiver pendente.
- Testar um funcionário de recepção/apoio real: não havia registro desse tipo na fonte legada; não foi criado dado para preencher a lacuna.
- Testar permissões em perfis diferentes, Auth/RLS, persistência, auditoria e compatibilidade de banco: fora do escopo permitido nesta rodada e dependente de homologação Supabase.

Nenhum teste pendente foi substituído por dados fictícios ou por gravação no principal.

## 7. Roteiro manual curto para concluir a conferência

1. Abrir [Brotas](http://127.0.0.1:5173/acesso/brotas) e autenticar normalmente na própria interface. Não enviar senha ou token pelo chat.
2. Acessar **Cadastros → Equipe & acessos** e usar somente os membros já listados.
3. Se a lista estiver vazia, registrar “sem registros disponíveis”; não cadastrar nada.
4. Abrir **Ver cadastro**, conferir identificação, profissão/cargo, clínicas, acesso e estados de dado ausente/indisponível.
5. Fechar e reabrir a mesma ficha. Alternar para Ipupiara somente se a sessão oferecer a clínica e repetir com registros existentes.
6. Confirmar que **Novo membro** e **Editar** continuam bloqueados no modo de compatibilidade. Não salvar nem tentar contornar o bloqueio.
7. Registrar somente o resultado funcional, sem CPF integral, e-mail, senha, token ou captura com dados pessoais.

Para repetir a conferência, a autenticação deve ser feita nesta mesma porta. A ausência de recepção/apoio no modo legado deve ser registrada como limitação da fonte legada, não como defeito automático.

## 8. Estado das gravações e homologação

As gravações permanecem bloqueadas no Supabase principal `Clinica Patrícia` (`xftnkusbyqzyvzrovroj`). A migration `20260928153000_equipe_cadastro_edicao.sql` não foi aplicada ou modificada nesta rodada, e nenhuma chamada de mutação foi executada.

A conferência autenticada parcial não substitui a homologação completa. Ainda serão necessárias validações reais de autorização, persistência, auditoria e serviços Supabase em ambiente autorizado antes de qualquer liberação.

## 9. Arquivos documentais atualizados

- `docs/modulos/equipe/15-FICHA-MEMBRO-CONSULTA.md` — estados de evidência e roteiro corrigidos.
- `docs/modulos/equipe/16-CONFERENCIA-AUTENTICADA-CONSULTA.md` — este registro.
- `docs/modulos/equipe/00-README-EQUIPE.md` — índice atualizado.
- `docs/modulos/equipe/08-CHECKPOINT.md` — histórico da conferência autenticada.

TypeSafe foi avaliado novamente e continua sem pertinência: esta rodada trata de autenticação, leitura autorizada e estados determinísticos, sem classificação ou decisão probabilística. Nenhuma integração foi adicionada e nenhuma chave foi solicitada ou exposta.

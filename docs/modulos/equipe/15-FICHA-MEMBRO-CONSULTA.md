# Equipe & acessos — ficha de consulta do membro

**Estado:** CONCLUÍDO LOCALMENTE / EM VALIDAÇÃO DE HOMOLOGAÇÃO

**Data:** 29/09/2026  
**Projeto:** `D:\PROJETOS SAAS\CLINICA PATRICIA\`  
**Escopo:** consulta somente leitura de funcionários e profissionais pela ação **Ver cadastro**.

## 1. Resultado e limites

A ação **Ver cadastro** agora abre uma ficha organizada, responsiva e somente leitura. A ficha não cria cadastro, não envia convite, não altera Auth/RLS, não grava dados e não remove o bloqueio de cadastro/edição existente.

As evidências desta etapa ficam separadas assim:

- **Desenvolvimento local concluído:** a tela, os estados de leitura, a máscara de CPF, o modo legado e a proteção contra respostas antigas foram implementados nesta pasta.
- **Testes locais concluídos:** build, lint, testes determinísticos e harness Playwright sintético passaram; esses testes usam respostas fictícias interceptadas.
- **Conferência autenticada:** estava pendente na data desta implementação; a conferência parcial posterior, com sessão autorizada, está registrada em `16-CONFERENCIA-AUTENTICADA-CONSULTA.md`.
- **Homologação completa do Supabase:** ainda não executada; não houve validação real de Auth, PostgREST, RLS, Vault, Storage, auditoria ou persistência.

O Supabase principal da Clínica Patrícia (`xftnkusbyqzyvzrovroj`) não foi alterado. A migration `supabase/migrations/20260928153000_equipe_cadastro_edicao.sql` também não foi aplicada nem modificada nesta etapa. O Site Geovana, a VPS e os projetos remotos permanecem fora do escopo.

SHA-256 da migration conferido ao final: `F90E9278A46EC09DAE1A1F30B9B48AFC436B956AD42681946C358D7D503BB396`.

## 2. Preparação documental e decisão técnica

Antes da implementação foram lidos `AGENTS.md`, `docs/00-LEIA-ME-IA.md`, `docs/01-CONVENCOES-DOCUMENTACAO.md`, `docs/padroes/PADRAO-PREENCHIMENTO-CADASTROS-BR.md`, o README e o Documento Funcional Mestre de Equipe, os checkpoints 13 e 14 e o contexto mestre `D:\Downloads\CLINICA_PATRICIA_ADMINISTRACAO_EQUIPE_PROFISSIONAIS_CONTEXTO_MESTRE.md`.

A skill `typesafe-ai` foi consultada e considerada não pertinente para esta tela. A ficha apresenta dados retornados por serviços, aplica máscaras determinísticas e respeita autorização já existente; não há classificação, roteamento, extração probabilística ou decisão com IA. Nenhuma integração foi adicionada e nenhuma chave foi solicitada ou exposta.

## 3. Comportamento implementado

### 3.1 Fonte e autorização

- Para membros do fluxo novo, a ficha chama somente a RPC de leitura `equipe_detalhar`, já existente e também usada para reabrir a edição. O contexto enviado é a clínica ativa.
- O modo legado não faz uma segunda consulta para tentar completar campos. Ele apresenta apenas a projeção já retornada por `profissionais_clinicas` e informa a limitação.
- Não foi criada uma consulta separada para descriptografar CPF. Quando a RPC autorizada já retorna a situação, a interface usa o valor apenas para máscara visual.
- A ficha não oferece uma ação de edição própria. A ação **Editar** continua na lista e mantém as verificações de proprietária, compatibilidade e indisponibilidade já existentes.

### 3.2 Seções da ficha

1. **Identificação:** nome, cargo/função, tipo, situação “cadastro localizado no contexto consultado”, CPF mascarado, telefone e e-mail de contato.
2. **Dados profissionais:** profissão, conselho, registro, UF e especialidade para `profissional_saude`. Para recepção/administrativo/apoio, informa que os campos profissionais não se aplicam.
3. **Clínicas:** lista os vínculos devolvidos pela consulta. A clínica ativa aparece como “Contexto consultado”; nas demais, a ficha informa que o vínculo foi listado, mas a situação de acesso não foi confirmada por esta consulta.
4. **Acesso ao sistema:** mostra o status efetivamente devolvido pelo serviço e “Login — Não confirmado por esta consulta”. E-mail de contato nunca é tratado como prova de login.

Os textos distinguem cargo, profissão, cadastro localizado e acesso ao sistema. Ausência de contato ou de profissão é apresentada como “Não cadastrado” quando o serviço retornou `null`; uma limitação do serviço aparece como “Indisponível nesta consulta”. Nenhum valor é inventado.

### 3.3 Estados e privacidade

- Carregando: estado de progresso com `aria-busy`.
- Erro: mensagem operacional compreensível; códigos e mensagens técnicas da RPC não aparecem na ficha.
- Consulta detalhada indisponível: aviso de compatibilidade e resumo somente com os campos já confirmados.
- Legado: aviso explícito de que contatos, UF, CPF e estado detalhado de acesso não estão disponíveis na consulta antiga.
- CPF informado: máscara `529.***.***-25` (exemplo sintético); CPF ausente e indisponível são estados diferentes. O valor integral não é renderizado, incluído em URL ou escrito em log.
- O `ModalBase` compartilhado mantém foco no título, fechamento por botão/Escape e ciclo de Tab, inclusive em larguras móveis.

Ao abrir uma ficha é criado um identificador de requisição. Fechar a ficha, trocar o membro ou mudar a clínica invalida a requisição anterior. Assim, uma resposta atrasada não consegue substituir o contexto atual.

## 4. Arquivos alterados

- `src/pages/cadastros/Equipe.tsx` — estados de ficha, leitura autorizada, descarte de respostas antigas, seções, estados e apresentação responsiva.
- `src/lib/equipe.ts` — utilitário determinístico `mascararCpfEquipe`.
- `src/lib/equipe.test.ts` — casos de CPF informado, ausente, indisponível e formato inválido.
- `tests/operacional/equipe-ficha.spec.ts` — harness sintético da ficha.
- `tests/operacional/equipe.spec.ts` — adaptação do cenário existente para o novo título da ficha e retorno por membro.
- `src/config/notasEvolucao.json` — nota de comportamento implementado.
- `docs/modulos/equipe/00-README-EQUIPE.md` — inclusão deste relatório no índice.
- `docs/modulos/equipe/08-CHECKPOINT.md` — checkpoint desta execução.
- `docs/modulos/equipe/15-FICHA-MEMBRO-CONSULTA.md` — este relatório.

## 5. Verificações executadas

| Verificação | Resultado | Natureza |
| --- | --- | --- |
| `npm.cmd run build` | aprovado; TypeScript e Vite concluídos | código local |
| `npm.cmd run lint` | aprovado; permanece somente o aviso histórico de Fast Refresh em `src/theme/ThemeProvider.tsx` | código local |
| `server\\node_modules\\.bin\\tsx.cmd --test src/lib/equipe.test.ts` | **8/8** aprovados | regras determinísticas locais |
| Playwright `equipe.spec.ts` + `equipe-ficha.spec.ts` nos projetos desktop/tablet/mobile | **21/21** aprovados | harness sintético com dados fictícios |
| `curl` em `http://127.0.0.1:5173/acesso/brotas` e `/acesso/ipupiara` | HTTP 200 | servidor local |

O harness da ficha cobriu:

- profissional de saúde com conselho, UF, especialidade e dois vínculos;
- recepção e apoio sem dados profissionais;
- CPF ausente e CPF indisponível;
- acesso `conta_vinculada` explicitamente não confirmado;
- falha de leitura sem exposição de `PGRST000` ou mensagem técnica;
- resposta atrasada após troca de membro e de clínica;
- larguras desktop, tablet e celular.

Os testes Playwright interceptaram as chamadas para `operacional.synthetic.invalid`, usaram nomes, e-mails e CPF fictícios e não acessaram banco, Auth, PostgREST, Vault, Storage ou RLS reais. Portanto, os 21/21 são testes simulados, não homologação Supabase.

## 6. O que foi observado no navegador e o que não foi possível validar

O servidor Vite local permanece disponível. A entrada pública é:

- [Brotas — `http://127.0.0.1:5173/acesso/brotas`](http://127.0.0.1:5173/acesso/brotas)
- [Ipupiara — `http://127.0.0.1:5173/acesso/ipupiara`](http://127.0.0.1:5173/acesso/ipupiara)

Com uma sessão autorizada, o caminho é **Cadastros → Equipe & acessos → Ver cadastro**. A conferência real depende de uma sessão que tenha acesso à clínica e à RPC; não foi usado contorno, conta criada ou gravação para abrir esse fluxo. As URLs respondem pela interface local, mas não significam que o banco remoto esteja homologado.

Não foi validado contra banco real nesta etapa:

- existência da RPC `equipe_detalhar` no Supabase principal;
- autorização efetiva por perfil e clínica em PostgREST/RLS;
- persistência, auditoria, Vault/Storage/Auth ou compatibilidade real com Agenda e Financeiro;
- disponibilidade dos campos de contatos, acesso e CPF para cada registro existente.

## 7. Situação das gravações

As gravações continuam **bloqueadas** no principal. A mensagem de compatibilidade já existente continua informando que a migration segura de Equipe precisa ser aplicada e homologada antes de qualquer alteração ser salva. A ficha de consulta não enfraquece esse bloqueio e não usa persistência fictícia.

Para liberar cadastro/edição ainda será necessário um ambiente Supabase isolado e autorizado, com Auth/PostgREST/Vault/Storage, contas fictícias de perfis autorizados e não autorizados, testes positivos/negativos de RLS/RPC, persistência após recarregar, auditoria e compatibilidade com os módulos consumidores. Somente depois dessas evidências a mensagem de bloqueio poderá ser revista.

## 8. Próxima conferência segura

1. Abrir uma das URLs locais e autenticar com uma conta já autorizada, sem criar conta nesta rodada.
2. Acessar **Cadastros → Equipe & acessos**.
3. Usar somente os registros que a lista real já apresentar. Se a clínica estiver vazia, registrar o estado vazio; não criar dados para preencher o teste.
4. Selecionar **Ver cadastro** em um registro existente e conferir as quatro seções, a máscara do CPF e as mensagens de dado não cadastrado/indisponível.
5. Alternar Brotas/Ipupiara, quando a sessão oferecer as duas clínicas, e reabrir uma ficha existente; não salvar nem tentar remover o bloqueio.
6. A ausência de recepcionistas ou funcionários de apoio no modo legado não deve ser classificada automaticamente como defeito: esse modo só lista profissionais existentes na consulta antiga.

Esta entrega documenta a consulta local efetivamente implementada. Não declara cadastro/edição liberados no Supabase principal.

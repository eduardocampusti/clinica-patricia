# Equipe & acessos — relatório de continuidade local UX

**Data:** 29/09/2026  
**Projeto:** `D:\PROJETOS SAAS\CLINICA PATRICIA\`  
**Checkpoint de origem:** [`13-CHECKPOINT-E-CONTINUIDADE-LOCAL.md`](13-CHECKPOINT-E-CONTINUIDADE-LOCAL.md)

## Resultado

A rodada local foi concluída. A experiência de Equipe & acessos ficou mais clara e acessível sem alterar o banco principal, a migration, o Site Geovana, planos remotos ou a VPS. As gravações continuam bloqueadas no principal por decisão de segurança e por falta de homologação Supabase completa.

## Alterações realizadas

- Contexto da clínica ativa visível; troca de Brotas/Ipupiara limpa lista, filtros, modais e mensagens e descarta respostas antigas.
- Estados distintos para carregamento, clínica não selecionada, lista vazia, erro, serviço indisponível e migration pendente.
- Aviso operacional informa que a consulta legada é somente leitura e que nenhuma alteração será salva antes da homologação.
- Formulário compartilhado de criação/edição com grupos visíveis para função, profissão de saúde, conselho/registro/UF, especialidade, clínicas e acesso.
- Validação detalhada junto aos campos, `aria-invalid`/`aria-describedby`, foco no primeiro erro e preservação do preenchimento.
- CPF mantido opcional provisoriamente; o CPF de Pacientes não foi modificado.
- Proteção contra dupla submissão, confirmação de descarte e ações responsivas no rodapé.
- Nenhuma persistência fictícia em `localStorage` e nenhum sucesso visual sem retorno da RPC (nos testes, o retorno foi interceptado e explicitamente sintético).

## Arquivos

- `src/pages/cadastros/Equipe.tsx`
- `src/lib/equipe.ts`
- `src/lib/equipe.test.ts`
- `tests/operacional/equipe-contexto.tsx`
- `tests/operacional/equipe-contexto.html`
- `tests/operacional/equipe.spec.ts`
- `src/config/notasEvolucao.json`
- `docs/modulos/equipe/08-CHECKPOINT.md`
- `docs/modulos/equipe/00-README-EQUIPE.md`
- `docs/modulos/equipe/13-CHECKPOINT-E-CONTINUIDADE-LOCAL.md`

## Testes executados

| Teste | Resultado | Natureza |
| --- | --- | --- |
| `npm.cmd run build` | Aprovado | TypeScript/Vite local |
| `npm.cmd run lint` | Aprovado; aviso histórico em `ThemeProvider.tsx` | Lint local |
| `server\\node_modules\\.bin\\tsx.cmd --test src/lib/equipe.test.ts` | 7/7 | Regras determinísticas |
| `playwright ... equipe.spec.ts` | 9/9 em desktop, tablet e mobile | Harness sintético com dados fictícios |
| URLs 5173 Brotas e Ipupiara via `curl` | HTTP 200 | Disponibilidade da interface |

O Playwright cobriu validação no campo, foco, preservação, confirmação de descarte, troca de clínica sem vazamento, dupla submissão e mensagem de bloqueio. As respostas foram interceptadas em `operacional.synthetic.invalid`; isso não é teste de banco real.

## Conferência local

- Brotas: [http://127.0.0.1:5173/acesso/brotas](http://127.0.0.1:5173/acesso/brotas)
- Ipupiara: [http://127.0.0.1:5173/acesso/ipupiara](http://127.0.0.1:5173/acesso/ipupiara)
- Menu após autenticação: **Cadastros → Equipe & acessos**.

A sessão disponível não foi contornada para abrir o menu autenticado. O servidor Vite local da aplicação permaneceu na porta 5173. O usuário deve autenticar com uma conta já autorizada, sem usar esta rodada para criar contas ou salvar dados reais.

## Estado real das gravações

As gravações continuam bloqueadas no Supabase principal `Clinica Patrícia` (`xftnkusbyqzyvzrovroj`). A migration `20260928153000_equipe_cadastro_edicao.sql` não foi aplicada nesta rodada e manteve o SHA-256 `F90E9278A46EC09DAE1A1F30B9B48AFC436B956AD42681946C358D7D503BB396`. A tela normal não usa `localStorage` como substituto e não afirma que um registro foi salvo sem resposta do backend.

## O que ainda depende de homologação completa

Ambiente Supabase isolado autorizado, Auth/PostgREST/Vault/Storage, contas fictícias de perfis autorizados e não autorizados, RLS/RPC, persistência após recarregar, auditoria, CPF protegido e compatibilidade real com Agenda/Financeiro. Até essa etapa, não há liberação de cadastro/edição no principal.

## Avaliação de TypeSafe

A skill `typesafe-ai` foi consultada. Não há decisão probabilística, classificação, roteamento, extração ou verificação com IA neste escopo: regras de CPF, autorização, campos condicionais, idempotência e estados são determinísticos. Nenhuma integração foi adicionada e nenhuma chave foi solicitada ou exposta.

## Próxima ação

Retomar `12-HOMOLOGACAO-SUPABASE-REAL.md` somente quando existir ambiente isolado autorizado. Aplicar o SQL integral com o hash registrado, executar a matriz real e somente então avaliar a remoção do bloqueio da interface. Não contratar serviços, alterar projetos remotos ou tocar no principal antes dessa autorização.

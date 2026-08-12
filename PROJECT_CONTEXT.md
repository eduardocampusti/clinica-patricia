# PROJECT_CONTEXT.md — Clínica Patrícia

> ⚠️ **ANTES DE QUALQUER AÇÃO NO BANCO DE DADOS, leia primeiro
> `00-BANCO-DE-DADOS-OFICIAL.md`.** Eduardo tem múltiplos sistemas com projetos
> Supabase diferentes — confirme sempre o projeto certo antes de rodar SQL.

> Documento de entrada. Leia este primeiro para entender o projeto antes dos demais.
> Última atualização do estado: sessão em que a **tela de login** passou a funcionar
> (o módulo de **tema** é o próximo passo, ainda não implementado).

## O que é

**Clínica Patrícia** é um sistema médico **multiespecialidade** e **multi-clínica**,
para gestão de clínicas pertencentes à mesma proprietária. Cada clínica tem caixa,
especialidades e dados **totalmente independentes** entre si.

## Unidades de negócio da proprietária

A proprietária (Patrícia) possui **3 unidades de negócio**, cada uma com **CNPJ próprio**.
Apenas as **2 clínicas** são gerenciadas por este sistema. O laboratório é um negócio à
parte, com sistema próprio independente.

| Unidade | Cidade | Cor de marca | Subdomínio (planejado) | Neste sistema? |
|---|---|---|---|---|
| Clínica Brotas | Brotas de Macaúbas, BA | Azul (`#2563eb`) | `brotas.` | ✅ Sim |
| Clínica Ipupiara | Ipupiara, BA | Verde (`#16a34a`) | `ipupiara.` | ✅ Sim |
| Laboratório (nome a definir) | Ibitiara, BA | — | — | ❌ Sistema próprio |

O laboratório **NÃO é uma unidade dentro do Clínica Patrícia**. Quando o sistema do lab
estiver pronto, ele fornecerá uma API para a iniciativa futura **INT-LAB**.
Ver `DECISAO-IBITIARA-LABORATORIO.md`, `TODO.md` e a seção
"Integração com laboratório externo — INT-LAB" em `ARCHITECTURE.md`.

## Objetivos centrais

1. **Gestão multiespecialidade** — várias especialidades por clínica (Clínica Geral,
   Psicologia, Pediatria, Cardiologia, Dermatologia, etc.).
2. **Fluxo de caixa "na palma da mão"** — a proprietária ver rápido o saldo do dia de
   cada clínica. Módulo financeiro é prioridade de negócio.
3. **Segurança de dados médicos (LGPD)** — dado de saúde é sensível (LGPD Art. 5º, II):
   exige rigor máximo em autenticação, controle de acesso e auditoria.

## Perfis de usuário

- **Proprietária** — vê as 2 clínicas, único perfil com acesso multi-clínica e com
  o seletor de clínicas. Acesso pensado para um subdomínio de gestão (`gestao.`).
- **Médico / funcionário** — vinculado a uma ou mais clínicas, mas a cada acesso fica
  **travado na clínica do endereço** (subdomínio). Nunca vê dados de outra clínica e
  **não** tem seletor.
- **Recepção/secretária** — perfil a detalhar (permissões pendentes).

## Papéis no desenvolvimento

- **Eduardo (arquiteto)** — define regras de negócio, fluxo clínico e prioridades.
  Perfil de arquiteto; recebe prompts prontos para colar no Claude Code, não escreve
  código à mão. Nível: iniciante em desenvolvimento (~6 meses), sênior em IA/educação.
- **IA (engenheiro sênior)** — arquitetura técnica, stack, riscos e implementação.
  Sempre declara risco/impacto antes de mudanças. Filosofia: nunca quebrar o existente,
  preservar comportamento legado, manter tudo auditável.

## Método de trabalho

Desenvolvimento **modular**: um módulo por vez, no ciclo
**construir → testar (funcional + segurança + regressão) → documentar → avançar.**

## Estado atual (resumo)

**Pronto e testado:**
- Banco de dados completo no Supabase (tabelas, RLS, auditoria, criptografia de CPF).
- **Estado arquitetural aprovado:** 2 clínicas operacionais, Brotas e Ipupiara.
- **Estado documentado do banco:** Brotas, Ipupiara e a antiga Clínica Ibitiara
  continuam cadastradas; Ibitiara ainda não foi desativada. Nenhum banco foi
  consultado nesta formalização. O registro e seus dados serão preservados e a
  futura inativação depende de plano aprovado.
- Login da proprietária criado.
- Isolamento entre clínicas provado ao vivo (testes de fumaça no banco).
- Tabela de pacientes com "trava por clínica ativa".
- Projeto frontend criado (Vite + React + TS + Tailwind), conectado ao Supabase.
- Tela de **login** funcionando (autenticação real via Supabase Auth).

**Próximo passo imediato:** módulo de **tema** (cor por clínica + claro/escuro).

Ver `TODO.md` para a lista completa de pendências e `ARCHITECTURE.md` para a stack.

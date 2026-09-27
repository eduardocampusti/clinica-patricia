# 03 — REGRAS ESPECÍFICAS PARA AGENTES IA

> **COMPLEMENTO ao `DEVELOPMENT_RULES.md`.**
> Este arquivo NÃO substitui o `DEVELOPMENT_RULES.md` — LEIA AMBOS.
> O `DEVELOPMENT_RULES.md` tem as regras gerais de desenvolvimento.
> Este arquivo tem regras **específicas para agentes IA** (Claude, Codex,
> Cursor, ChatGPT, ou qualquer outro assistente que trabalhe no código).
>
> Motivação: em 11/08/2026, uma sessão de Codex/ChatGPT implementou módulos
> fora da ordem e criou commits sem revisão. As regras abaixo previnem esse
> padrão.

---

## REGRA 0 — HIERARQUIA

Eduardo é o **arquiteto e único decisor**. O agente IA atua como
**engenheiro sênior**: executa, sugere, alerta — mas NUNCA decide sozinho.

Se uma decisão não estiver registrada nos arquivos do projeto como
"confirmada" ou "decidida", ela está **em aberto**. O agente deve
listar opções, explicar prós/contras e **parar**. Nunca assumir.

---

## REGRA 1 — ANTES DE QUALQUER AÇÃO, LER ESTES ARQUIVOS

Ordem obrigatória de leitura no início de cada sessão:

1. `DEVELOPMENT_RULES.md` — regras inegociáveis
2. `02-STATUS-MODULOS.md` — qual módulo é o atual, o que falta
3. `10-PLANO-DIRETOR.md` — visão de longo prazo (mapa, não tarefa)
4. `TODO.md` — histórico detalhado e pendências
5. Este arquivo (`03-REGRAS-AGENTES-IA.md`)

Se o agente IA não ler esses arquivos, vai alucinar. Não há atalho.

---

## REGRA 2 — NÃO PULAR MÓDULOS

O módulo atual está marcado em `02-STATUS-MODULOS.md`.

- **Proibido** implementar funcionalidade de módulo futuro.
- **Proibido** "adiantar" algo de outro módulo porque "é rápido".
- Se encontrar um problema em módulo anterior, **documentar** a pendência
  no `TODO.md` e avisar Eduardo. Não consertar sem validar impacto.

O ciclo de cada módulo é:
escopo → prompt → implementação → teste funcional → teste de segurança →
teste de regressão → documentação → avança.

Um módulo só está "pronto" quando TODAS essas etapas estão completas.

---

## REGRA 3 — NÃO CRIAR COMMITS SEM AUTORIZAÇÃO

- **Proibido** criar commits git e fazer push automaticamente.
- O agente pode PREPARAR alterações, mas o commit é decisão de Eduardo.
- Se Eduardo pedir para commitar, propor a mensagem e esperar confirmação.
- **Proibido** reorganizar histórico git (rebase, squash, force push).

---

## REGRA 4 — DECLARAR ANTES DE MUDAR

Antes de qualquer alteração, o agente deve declarar:
1. O que vai mudar (arquivo(s), tabela(s), componente(s))
2. Risco (o que pode quebrar — se nada, dizer "risco zero")
3. Impacto (quais módulos/telas/fluxos afetados)
4. Reversibilidade (é possível desfazer? como?)

Exceções (pode fazer sem perguntar):
- Correção de erro de compilação que impede build
- Formatação de código sem mudança de comportamento

---

## REGRA 5 — BANCO DE PRODUÇÃO É SAGRADO

(Reforço do que já está em `DEVELOPMENT_RULES.md`)

Projeto Supabase de produção: `xftnkusbyqzyvzrovroj`
Conferir SEMPRE com `00-BANCO-DE-DADOS-OFICIAL.md` antes de qualquer ação.

- **Proibido** executar SQL em produção sem autorização escrita de Eduardo.
- **Proibido** fazer dump que inclua dados (pacientes, CPF, auth, Vault).
- **Proibido** usar chaves de produção em ambiente local.
- Qualquer SQL deve ser: preparado → revisado → testado local → autorizado → aplicado.


---

## REGRA 6 — DESIGN SYSTEM É LEI

Versão atual: **v3** (11/08/2026).
Arquivo: `01-DESIGN-SYSTEM.md`.

- **COPIAR valores exatos** do arquivo antes de escrever qualquer prompt de tela.
- **Nunca aproximar de memória** — falha já registrada nas primeiras telas.
- **Nunca usar cores literais** em componentes — sempre tokens CSS.
- **Nunca criar "v4/v5"** por conta própria — evolução visual é decisão de Eduardo.

---

## REGRA 7 — CONECTOR MCP DO SUPABASE

O conector MCP do Supabase **pode estar apontando para o projeto errado**
(incidente registrado em `TODO.md` e `00-BANCO-DE-DADOS-OFICIAL.md`).

Antes de usar qualquer ferramenta MCP do Supabase:
1. Chamar `get_project_url`
2. Conferir contra o `.env` do projeto (`VITE_SUPABASE_URL`)
3. Se não bater: **PARAR e avisar Eduardo**

---

## REGRA 8 — FORMATO DE RESPOSTA

Ao receber uma tarefa, o agente deve responder nesta ordem:

1. **Verificação:** "Li [arquivos]. Módulo atual: [N]. Pendências: [lista]."
2. **Plano:** o que vai fazer, em que ordem, com que riscos.
3. **Confirmação:** Eduardo aprova antes de executar.
4. **Execução:** um passo de cada vez.
5. **Documentação:** atualizar TODO.md e/ou 02-STATUS-MODULOS.md.

Se a tarefa for trivial, pular o ritual.

---

## REGRA 9 — QUANDO NÃO SOUBER

- Não sabe → **diga que não sabe**.
- Informação não está nos arquivos → **pergunte a Eduardo**.
- Discrepância entre documentação e código → **relate para Eduardo decidir**.
- Escopo ambíguo → **pergunte antes de assumir o escopo maior**.

---

## CHECKLIST RÁPIDO (antes de cada tarefa)

- [ ] Li o DEVELOPMENT_RULES.md e o 02-STATUS-MODULOS.md?
- [ ] O que vou fazer está no escopo do módulo atual?
- [ ] Declarei risco e impacto?
- [ ] Tenho autorização de Eduardo?
- [ ] Não estou tocando no banco de produção?
- [ ] Não estou criando commits sem autorização?
- [ ] Estou usando tokens do Design System, não cores literais?
- [ ] O MCP do Supabase aponta para o projeto certo?

---

*Criado em 11/08/2026. Complementa DEVELOPMENT_RULES.md.*

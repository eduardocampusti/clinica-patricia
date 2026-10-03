# 04 — ISOLAMENTO DE SISTEMAS (REGRA DE FUNDAÇÃO — LER ANTES DE TOCAR NO BANCO)

> **Por que este arquivo existe.** Já houve confusão real: conectores MCP apontando para
> OUTRO sistema (Brotar 2.1) dentro do contexto do Clínica Patrícia. Misturar sistemas é
> um incidente de segurança e de LGPD — pode vazar dado de um sistema para outro ou
> aplicar uma alteração destrutiva no banco errado. Esta regra é INEGOCIÁVEL e vale para
> qualquer agente de IA (Codex, Claude Code, Cursor, Chrome) e para qualquer humano.

---

## 1. Identidade canônica do Clínica Patrícia

- **Project ref (ÚNICO válido):** `xftnkusbyqzyvzrovroj`
- **URL do projeto:** https://xftnkusbyqzyvzrovroj.supabase.co
- **SQL Editor:** https://supabase.com/dashboard/project/xftnkusbyqzyvzrovroj/sql/new
- **Tenants operacionais:** somente **Brotas** e **Ipupiara**.
  (Ibitiara = laboratório externo, registro histórico preservado; NÃO é tenant.)

## 2. Canal de acesso ao banco — o único permitido

- Acesso ao banco real do Clínica Patrícia é **EXCLUSIVAMENTE via Chrome logado no
  Supabase, com a extensão do Claude Code ativa.**
- Toda operação passa pelo SQL Editor do projeto `xftnkusbyqzyvzrovroj`.

## 3. Lista negra — proibido neste contexto

- **Brotar 2.1** e QUALQUER outro sistema/projeto são PROIBIDOS neste contexto.
- **Conectores MCP que resolvam para outro project ref NÃO podem ser usados.** Se um MCP
  (ex.: `plugin:supabase`) apontar para ref diferente de `xftnkusbyqzyvzrovroj`, ou exigir
  OAuth de outro projeto: **PARAR e AVISAR Eduardo. Nunca prosseguir "no que estiver à mão".**

---

## 4. Checagem obrigatória ANTES de qualquer operação de banco

Antes de `pg_dump`, migration, execução de SQL, hardening, corte de PostgREST ou qualquer
comando que leia/escreva no banco, o agente DEVE confirmar e reportar:

1. **Project ref** = `xftnkusbyqzyvzrovroj`? Se não bater exatamente → PARAR.
2. **Canal** = Chrome + extensão Claude Code no Supabase logado? Se for MCP/outro → PARAR.
3. **Branch de git** esperada (ex.: `codex/checkpoint-local-...`)? Reportar antes de agir.
4. **Ambiente**: é produção ou local/staging? Operação destrutiva SÓ em local/staging.

Se qualquer uma dessas checagens não puder ser confirmada, o agente NÃO executa e pede
orientação a Eduardo. "Na dúvida, não toca."

## 5. Credenciais

- Connection string, service_role key, chaves de Vault e senhas: **NUNCA** em chat, NUNCA
  em arquivo versionado, NUNCA em log. São fornecidas por Eduardo direto no terminal, na
  hora do uso, e descartadas.
- `.env` e segredos não entram em commit (conferir `.gitignore`).

## 6. Como confirmar a identidade rapidamente

- No Chrome, a URL do Supabase deve conter `xftnkusbyqzyvzrovroj`.
- Em SQL, para registrar no relatório do agente:
  `select current_database(), inet_server_addr();` e confirmar que a sessão é a do projeto
  correto (o ref aparece no host de conexão do Supabase).

---

*Regra criada em 08/09/2026 após incidente de conectores MCP apontando para Brotar 2.1.
Precede qualquer trabalho de banco. Não remover sem decisão explícita de Eduardo.*

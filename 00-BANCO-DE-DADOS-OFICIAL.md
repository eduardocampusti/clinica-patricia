# ⚠️ 00-BANCO-DE-DADOS-OFICIAL.md — TRAVA DE SEGURANÇA

> **LEIA ISTO ANTES DE RODAR QUALQUER SQL, MIGRATION OU AÇÃO ADMINISTRATIVA NO BANCO.**
> Aplica-se a QUALQUER agente/IDE: Claude Code, Cursor, chat do Claude com MCP,
> Antigravity, ou qualquer ferramenta futura. Sem exceção.

## O projeto Supabase OFICIAL desta aplicação é:

```
Project ref: xftnkusbyqzyvzrovroj
URL:         https://xftnkusbyqzyvzrovroj.supabase.co
```

**Fonte da verdade:** o arquivo `.env` na raiz deste projeto (`VITE_SUPABASE_URL`).
Se qualquer informação (nesta doc, na memória de uma conversa, num resumo antigo)
divergir do `.env`, **o `.env` vence sempre**. Releia o `.env` antes de agir, não
confie em memória de sessões anteriores.

## Por que este arquivo existe (motivo real, não hipotético)

Eduardo possui **múltiplos sistemas**, cada um com seu próprio projeto Supabase
(contas/organizações diferentes). Exemplo confirmado:

| Sistema | Project ref | Pertence a |
|---|---|---|
| **Clínica Patrícia** (este projeto) | `xftnkusbyqzyvzrovroj` | Este sistema — o único que qualquer ação aqui deve tocar |
| Sistema Brotar (`Brotar 2.1`) | `indshiztdvjgvgnzigqd` | Outro sistema, **NADA a ver com este** |

**Evidência registrada em 01/08/2026:** numa sessão de chat separada, o conector
Supabase disponível estava logado numa conta **diferente** da usada pelo Claude
Code neste projeto — essa conta só enxergava o projeto "Brotar 2.1" e nem sabia
que "Clinica Patrícia" existia. Ou seja: **é tecnicamente possível uma ferramenta
estar plugada no banco errado sem nenhum aviso visível.** Este arquivo existe
para que isso nunca vire uma escrita real no lugar errado.

## Checklist obrigatório ANTES de qualquer ação no banco

1. **Leia o `.env`** deste projeto e confirme o `project ref` (`xftnkusbyqzyvzrovroj`).
2. Se for usar uma ferramenta MCP/Supabase, **confira o project ref retornado por
   ela** (ex.: `list_projects`, `get_project_url`) contra o do `.env`.
3. **Se o ref não bater — PARE.** Não prossiga assumindo que "deve ser esse
   mesmo". Avise o Eduardo explicitamente e aguarde confirmação.
4. **Nunca rode SQL/migration "de cabeça"** citando um ref de memória de uma
   conversa antiga. Releia o `.env` a cada sessão nova.

## Regra irmã (já registrada em DEVELOPMENT_RULES.md)

Além de confirmar o projeto certo, toda escrita em produção (INSERT/UPDATE/DELETE,
migration) exige **confirmação explícita do Eduardo antes de executar** —
independentemente do meio técnico disponível. As duas regras trabalham juntas:
projeto certo + confirmação humana = duas travas, não uma.

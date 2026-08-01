# DEVELOPMENT_RULES.md — Clínica Patrícia

> Regras inegociáveis. Todo módulo novo deve segui-las. Violá-las é a causa raiz de
> "módulo novo saiu do padrão" ou de brechas de segurança.

## Método de trabalho

- **Desenvolvimento modular:** um módulo por vez, no ciclo
  **construir → testar (funcional + segurança + regressão) → documentar → avançar.**
- **Declarar risco, impacto e o que pode quebrar ANTES** de qualquer mudança.
- **Nunca quebrar funcionalidade existente**; preservar comportamento legado.
- Um módulo só é "fechado" quando passa em **teste de fumaça de segurança no banco**
  (ex.: usuário da Clínica A tentando ler dado da Clínica B deve falhar **no banco**,
  não só na interface).

## Segurança e dados

- **Isolamento no banco (RLS), não só na UI.** Toda tabela sensível tem `clinica_id` e
  política de RLS. Defesa em profundidade.
- **Soft delete sempre.** Nunca `DELETE` físico de `clinicas`, `usuarios` ou `pacientes`;
  usar a coluna `ativo`.
- **Auditar tudo.** Escritas em dados sensíveis passam por trigger de auditoria. A
  auditoria é **imutável** (append-only).
- **CPF (e futuros dados clínicos) sempre criptografados**; nunca trafegar/logar em claro.
  Para busca/unicidade, usar o **hash HMAC**, nunca o valor cru.
- **Segredos só no Vault** (nunca hardcoded, nunca em `.env` versionado). O `.env` está no
  `.gitignore`.
- **Cálculos financeiros nunca no frontend** — quando o módulo existir, passam por backend
  próprio antes de tocar o banco.
- **Nenhuma escrita autônoma em banco de produção (INSERT/UPDATE/DELETE, migrations).**
  Sempre apresentar o SQL/comando ao Eduardo e aguardar confirmação explícita
  ("pode rodar") **antes** de executar — mesmo que exista meio técnico de executar
  sozinho (ex.: sessão de navegador já autenticada, automação de UI). Isso vale mesmo
  para dados aparentemente inofensivos (ex.: cor de clínica): a regra é sobre o
  **processo**, não sobre o risco percebido do dado.
  Motivo: registrado em `09-DIARIO-DE-SESSOES.md`, sessão de 01/08/2026 — uma
  correção de cor foi executada via automação de navegador sem confirmação no
  momento do ato. O resultado estava correto, mas o processo pulou uma etapa
  combinada. Não repetir.
- **Confirmar o projeto Supabase certo ANTES de qualquer ação no banco.** Ver
  `00-BANCO-DE-DADOS-OFICIAL.md` — Eduardo tem múltiplos sistemas com projetos
  Supabase diferentes; nunca assumir de memória qual é o projeto certo.

## Frontend / visual (regras fundamentais)

- **CONSULTAR SEMPRE `01-DESIGN-SYSTEM.md` antes de escrever qualquer prompt de
  tela.** Ele tem os valores EXATOS (tipografia Lora/Inter, raios 12px/16px,
  sombra `0px 1px 8px rgba(0,0,0,.1)`, neutros `#424242`/`#49454f`, regra de
  "nenhum box-shadow em botão"). Nunca aproximar de memória — copiar os valores.
  Falha registrada: nas primeiras telas (Login/Tema/Pacientes) esses valores
  não foram citados nos prompts e o resultado saiu genérico. Corrigido depois.
- **Nenhuma cor literal** (hex/rgb/nome) em componente. Cores **só via tokens**
  (`var(--cor-...)` / CSS custom properties). A cor de marca vem do banco, por clínica.
- **Modo claro/escuro** obrigatório: a cor da clínica é a mesma nos dois modos; só os
  **neutros** (fundos, textos, bordas) mudam, via tokens. Preferência **persistida**.
  Teste mental: "se o fundo fosse quase preto, todo texto ainda seria legível?".
- **Mobile-first / responsivo** desde o início (breakpoints nativos do Tailwind
  sm/md/lg/xl). Alvos: celular, tablet, desktop. Não deixar "responsivo pra depois".
- **Português do Brasil** em toda a interface.

## Regra do médico multi-clínica (isolamento)

- O **médico não escolhe** clínica. **O endereço (subdomínio) decide** a clínica ativa.
  Nada de seletor para médico/recepção — o seletor é privilégio da proprietária, no
  endereço de gestão. Isso evita erro de profissional desatento.

## Ambiente / ferramentas

- **Não** colocar o projeto em pasta sincronizada em nuvem (Google Drive/OneDrive) —
  conflita com `node_modules`. Usar pasta **local** + **GitHub** para backup/versão.
- O PC de dev tem `NODE_ENV=production`; o `.npmrc` (`include=dev`) na raiz garante que o
  `npm install` traga as ferramentas de desenvolvimento. Não remover esse `.npmrc`.

## Variáveis de ambiente

Frontend (`.env`, ver `.env.example`):
- `VITE_SUPABASE_URL` — URL do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY` — chave pública `anon` (segura no frontend; protegida por RLS).

Supabase (Vault):
- `cpf_key`, `cpf_pepper` — chaves de criptografia/HMAC do CPF (**provisórias**, trocar
  antes da produção).

## Ao gerar prompts de implementação (para Claude Code / outra IA)

- Sempre incluir: "use exclusivamente os design tokens; nunca cores literais".
- Sempre exigir: responsivo nos 3 tamanhos e funcionando nos modos claro e escuro.
- Sempre lembrar: NÃO recriar o que já existe (projeto, `.env`, `src/lib/supabase.ts`,
  tabelas/RLS do banco). Construir sobre o existente.
- Escopo de um módulo por vez; parar e perguntar antes de sair do escopo.

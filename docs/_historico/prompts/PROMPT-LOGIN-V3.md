# PROMPT — Login Visual v3 (Repaginação Split-Screen)

> [!NOTE]
> Documento histórico. A implementação foi concluída no commit `615a16b`.
> Não reexecutar este prompt sobre o estado atual. O texto "Clínica Brotas"
> permanece como placeholder até existir uma fonte pública segura para a
> clínica antes da autenticação.
>
> O escopo executado foi somente visual: recuperação de senha, exibição de
> senha e "lembrar acesso" continuam sem funcionalidade.

---

## CONTEXTO

Projeto "Clinica Patrícia" — sistema médico multiespecialidade (React 19 +
TypeScript + Vite + Tailwind CSS v4). Já rodando com `npm run dev`.

A tela de login atual (`src/pages/Login.tsx`) é um card centralizado
genérico. A autenticação (Supabase email+senha) já funciona e NÃO DEVE
ser alterada.

Arquivo que você VAI modificar (e SOMENTE este):
- `src/pages/Login.tsx`

NÃO modificar: `index.html`, `src/index.css`, hooks, lib, App.tsx,
componentes do shell, banco de dados.

Referência visual: tela "Login Clínica Brotas" do Google Stitch
(layout split-screen com lado esquerdo escuro e lado direito com
formulário).

Design System: `01-DESIGN-SYSTEM.md` v3, seção 12 (Tela de Login).

---

## O QUE CONSTRUIR

### Layout geral

**Desktop (lg: ≥1024px):** tela dividida em duas metades, `min-h-screen`.
- Metade esquerda: fundo com `var(--cor-menu)`, conteúdo de branding.
- Metade direita: fundo `var(--fundo-pagina)`, formulário centralizado.

**Mobile (<1024px):** tela de coluna única, sem o lado esquerdo.
- Fundo: gradiente sutil de `var(--cor-primaria-suave)` (topo) para
  `var(--fundo-pagina)` (baixo).
- Logo + nome do sistema no topo, formulário abaixo.

### Lado esquerdo (desktop only — hidden no mobile)

Estrutura vertical com `flex flex-col justify-between`, padding `32px`,
altura `100vh`, posição `fixed` ou `sticky` (para não scrollar).

**Topo:**
```tsx
<div className="flex items-center gap-3">
  <span className="text-lg font-semibold text-white">
    Clínica Patrícia
  </span>
  <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
    style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
    <span className="h-2 w-2 rounded-full bg-green-400" />
    Clínica Brotas
  </span>
</div>
```
Nota: "Clínica Brotas" é placeholder — quando a RPC de clínica pública
estiver ativa, virar dinâmico. Por enquanto, usar texto fixo.

**Centro (slogan + ilustrações):**
```tsx
<div className="flex-1 flex flex-col justify-center">
  <h2 className="text-4xl font-bold leading-tight text-white mb-4"
    style={{ letterSpacing: '-0.02em' }}>
    Cuidado conectado.<br />
    Gestão inteligente.
  </h2>
  <p className="text-base max-w-md" style={{ color: 'rgba(255,255,255,0.7)' }}>
    Uma experiência integrada para cuidar de pacientes,
    atendimentos e da gestão da clínica.
  </p>

  {/* Ilustrações decorativas — 3 cards abstratos flutuando */}
  <div className="relative mt-10 h-72">
    {/* Card 1 — topo direita, rotação leve */}
    <div className="absolute right-4 top-0 w-64 rounded-xl p-4"
      style={{
        backgroundColor: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.1)',
        transform: 'rotate(-3deg)',
        backdropFilter: 'blur(8px)',
      }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.7)" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 3v4M16 3v4" />
          </svg>
        </div>
        <div className="h-2 w-24 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="h-2 w-3/4 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
      </div>
    </div>

    {/* Card 2 — centro, sem rotação */}
    <div className="absolute left-8 top-24 w-56 rounded-xl p-4"
      style={{
        backgroundColor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
      }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.7)" strokeWidth="2">
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
        </div>
        <div className="h-2 w-20 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <div className="ml-auto h-5 w-5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="h-2 w-2/3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
      </div>
    </div>

    {/* Card 3 — embaixo direita, rotação oposta */}
    <div className="absolute bottom-0 right-12 w-60 rounded-xl p-4"
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        transform: 'rotate(2deg)',
        backdropFilter: 'blur(8px)',
      }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.7)" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v1.2M12 15.5v1.3" />
          </svg>
        </div>
        <div className="h-2 w-16 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
      </div>
      <div className="flex gap-2">
        <div className="h-16 w-1/3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <div className="h-16 w-1/3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <div className="h-16 w-1/3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  </div>
</div>
```

**Rodapé esquerdo:**
```tsx
<p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
  Gestão Clínica Inteligente © {new Date().getFullYear()}
</p>
```

### Lado direito (formulário — desktop e mobile)

Centralizado vertical e horizontalmente. Max-width `420px`.

```tsx
<div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:px-8">
  <div className="w-full max-w-[420px]">

    {/* Logo mobile only */}
    <div className="mb-10 flex items-center justify-center gap-2.5 lg:hidden">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: 'var(--cor-primaria)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      </div>
      <span className="text-xl font-semibold text-[var(--texto-principal)]">
        Clínica Patrícia
      </span>
    </div>

    {/* Título */}
    <div className="mb-8">
      <h1 className="text-3xl font-semibold text-[var(--texto-principal)]"
        style={{ letterSpacing: '-0.02em' }}>
        Bem-vindo
      </h1>
      <p className="mt-2 text-base text-[var(--texto-secundario)]">
        Entre na sua conta para acessar a Clínica Brotas.
      </p>
    </div>

    {/* Formulário — MANTER a mesma lógica de handleSubmit */}
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* E-mail */}
      <div>
        <label htmlFor="email"
          className="texto-label-tecnico mb-1.5 block text-[var(--texto-secundario)]">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="seuemail@exemplo.com"
          className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3.5 py-2.5 text-[var(--texto-principal)] outline-none transition placeholder:text-[var(--texto-terciario)] focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
        />
      </div>

      {/* Senha */}
      <div>
        <label htmlFor="password"
          className="texto-label-tecnico mb-1.5 block text-[var(--texto-secundario)]">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
          className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3.5 py-2.5 text-[var(--texto-principal)] outline-none transition placeholder:text-[var(--texto-terciario)] focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
        />
      </div>

      {/* Lembrar + Esqueci (visual only — sem lógica por enquanto) */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-[var(--texto-secundario)] cursor-pointer">
          <input type="checkbox" disabled
            className="h-4 w-4 rounded border-[var(--borda)] text-[var(--cor-primaria)] focus:ring-[var(--cor-primaria-suave)]" />
          Lembrar meu acesso
        </label>
        <button type="button" disabled
          className="text-sm font-medium opacity-60"
          style={{ color: 'var(--cor-primaria)' }}>
          Esqueci minha senha
        </button>
      </div>

      {/* Erro */}
      {error && (
        <p role="alert"
          className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]">
          {error}
        </p>
      )}

      {/* Botão Entrar */}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-70"
        style={{ backgroundColor: 'var(--cor-primaria)' }}
      >
        {loading ? 'Entrando...' : 'Entrar'}
        {!loading && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        )}
      </button>
    </form>

    {/* Rodapé do formulário */}
    <div className="mt-10 flex flex-col items-center gap-3 text-center">
      <div className="flex items-center gap-1.5 text-xs text-[var(--texto-terciario)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Ambiente seguro
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--texto-terciario)]">
        <span className="cursor-pointer hover:underline">Privacidade</span>
        <span>·</span>
        <span className="cursor-pointer hover:underline">Termos de Uso</span>
      </div>
      <p className="text-xs text-[var(--texto-terciario)]">
        Problemas para acessar? Falar com o administrador
      </p>
    </div>

  </div>
</div>
```

### Estrutura final do componente Login.tsx

O componente MANTÉM os mesmos imports e a mesma lógica de `handleSubmit`.
A única mudança é o JSX retornado. Estrutura:

```tsx
return (
  <div className="flex min-h-screen">
    {/* ===== LADO ESQUERDO — desktop only ===== */}
    <div
      className="hidden w-1/2 lg:flex lg:flex-col lg:justify-between"
      style={{ backgroundColor: 'var(--cor-menu)', padding: '32px' }}
    >
      {/* Topo: nome + badge (código acima) */}
      {/* Centro: slogan + ilustrações (código acima) */}
      {/* Rodapé: copyright (código acima) */}
    </div>

    {/* ===== LADO DIREITO — formulário ===== */}
    <div
      className="flex min-h-screen w-full flex-1 flex-col items-center justify-center lg:w-1/2"
      style={{
        background: window.innerWidth < 1024
          ? 'linear-gradient(to bottom, var(--cor-primaria-suave), var(--fundo-pagina))'
          : 'var(--fundo-pagina)',
      }}
    >
      {/* Formulário completo (código acima) */}
    </div>
  </div>
)
```

ATENÇÃO sobre o gradiente mobile: o `window.innerWidth` não é reativo.
Usar ao invés disso duas classes CSS separadas:
- No mobile: fundo via uma classe CSS custom com gradiente
- No desktop: fundo via `var(--fundo-pagina)`

Alternativa mais limpa (recomendada):
```tsx
<div className="flex min-h-screen w-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-[var(--cor-primaria-suave)] to-[var(--fundo-pagina)] lg:w-1/2 lg:bg-none lg:bg-[var(--fundo-pagina)]">
```

---

## REGRAS INEGOCIÁVEIS

1. **ZERO cor literal** em componente — só tokens CSS (`var(--...)`).
   As ÚNICAS exceções são:
   - `rgba(255,255,255,...)` no lado esquerdo (branco sobre fundo escuro
     dinâmico — não existe token para isso, e o valor é fixo).
   - `stroke="white"` nos SVG sobre fundo escuro.
   - `bg-green-400` no dot do badge (indicador de status da clínica).
2. **Modo claro/escuro:** o lado direito (formulário) funciona nos dois
   modos via tokens. O lado esquerdo usa `--cor-menu` que é a mesma em
   ambos os modos (é a cor da clínica, não muda).
3. **Mobile-first:** o lado esquerdo fica `hidden lg:flex`. No mobile,
   SÓ o formulário aparece, com gradiente sutil no fundo.
4. **NÃO mudar a lógica de autenticação** — mesmo `handleSubmit`, mesmos
   states `email`, `password`, `loading`, `error`, mesmo import de
   `supabase`.
5. **NÃO adicionar** funcionalidade nova: "Lembrar acesso" e "Esqueci
   minha senha" ficam visíveis mas desabilitados (`disabled` / `opacity-60`).
   Serão ativados num prompt posterior.
6. **NÃO criar** arquivo novo. Só editar `src/pages/Login.tsx`.
7. **Português do Brasil** em toda a interface.

---

## COMO VOU TESTAR

1. `npm run dev` roda sem erros.
2. **Desktop:** tela dividida em duas metades. Lado esquerdo escuro (cor
   do `--cor-menu`, que é o fallback `#2e1a47` ou a cor real da clínica).
   Lado direito claro com formulário.
3. **Mobile (≤1024px):** só o formulário aparece, com fundo gradiente
   sutil de lilás/azul claro para branco. Logo "Clínica Patrícia" no
   topo com ícone.
4. O slogan "Cuidado conectado. Gestão inteligente." aparece no lado
   esquerdo (desktop) com texto branco grande.
5. Os 3 cards abstratos flutuam com rotação sutil, fundo glassmorphism
   (blur + transparência).
6. Formulário tem: título "Bem-vindo", subtítulo com nome da clínica,
   campos E-mail e Senha, checkbox "Lembrar" (desabilitado), link
   "Esqueci minha senha" (desabilitado), botão "Entrar →" azul.
7. Rodapé: "Ambiente seguro" com cadeado, "Privacidade · Termos de Uso",
   "Problemas para acessar?".
8. Login funciona normalmente (email + senha → autenticação Supabase).
9. Erro de login aparece em badge vermelho suave.
10. Alternar claro/escuro no formulário continua coerente (se o toggle
    estiver acessível — no login atual não está, o que é ok).

---

*Prompt gerado em 11/08/2026. Referência: 01-DESIGN-SYSTEM.md v3 §12 +
telas do Google Stitch (login_cl_nica_brotas + login_mobile_cl_nica_brotas).
Escopo: SÓ visual. Funcionalidades novas (recuperação de senha, mostrar/
ocultar senha, lembrar acesso) ficam para prompt posterior.*

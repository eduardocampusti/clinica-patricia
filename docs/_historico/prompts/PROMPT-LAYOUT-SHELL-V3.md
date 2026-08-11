# PROMPT — Layout Shell v3 (Repaginação Visual)

> [!NOTE]
> Documento histórico. A base visual foi concluída no commit `57f1fb0` e a
> visibilidade do Prontuário por papel foi consolidada no commit `e7b0f36`.
> Não reexecutar este prompt sobre o estado atual.
>
> Diferenças entre o plano original e o estado final:
> - os 41 tokens de categoria e status da v2 foram mantidos temporariamente,
>   pois ainda são consumidos por telas não migradas;
> - `IconeGridApps` não foi implementado porque não possui uso atual;
> - o menu apresenta 10 itens para médicos e oculta o Prontuário para os
>   demais papéis;
> - busca, notificações, Ajuda e Perfil permanecem somente visuais.

---

## CONTEXTO

Projeto "Clinica Patrícia" — sistema médico multiespecialidade (React 19 +
TypeScript + Vite + Tailwind CSS v4). Já rodando com `npm run dev`.

Arquivos que você VAI modificar (e SOMENTE estes):
- `index.html` — trocar fontes Google Fonts
- `src/index.css` — atualizar tokens CSS (neutros, sombras, tipografia)
- `src/components/shell/AppShell.tsx` — novo layout de header
- `src/components/shell/Sidebar.tsx` — novos itens de menu + botão de ação
- `src/components/shell/types.ts` — novos tipos de tela
- `src/components/shell/icons.tsx` — novos ícones (Atendimentos, Equipe, Especialidades, Ajuda, Perfil, Sino, Lupa)
- `src/App.tsx` — registrar novas rotas placeholder

Arquivos que você NÃO PODE modificar:
- `src/lib/supabase.ts`, `.env`, banco de dados, hooks existentes

---

## TAREFA 1 — Fontes (index.html)

Trocar o link do Google Fonts de:
```
Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600
```
Para:
```
Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500
```

E no mesmo arquivo, trocar o `<title>` de `clinica-patricia` para
`Clínica Patrícia`.

---

## TAREFA 2 — Tokens CSS (src/index.css)

### 2a. Trocar font-family no `html`:
```css
html {
  font-family: 'Geist', ui-sans-serif, system-ui, sans-serif;
}
```

### 2b. Atualizar as classes de tipografia:
```css
/* Título de tela — Geist semibold (v3, substitui Fraunces) */
.texto-titulo-tela {
  font-family: 'Geist', ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
  font-size: 30px;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

/* Título de seção dentro de card (v3) */
.texto-titulo-secao {
  font-family: 'Geist', ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
  font-size: 20px;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

/* Label técnico / badge — JetBrains Mono (v3, novo) */
.texto-label-tecnico {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 500;
  font-size: 11px;
  line-height: 1.45;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* Números em lista/coluna — alinhamento tabular obrigatório (mantido) */
.numero-tabular {
  font-variant-numeric: tabular-nums;
}

/* Selo de clínica — agora em Geist (v3, era Fraunces) */
.fonte-selo {
  font-family: 'Geist', ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
}
```

### 2c. Atualizar tokens de neutros no `:root` (modo claro):

TROCAR estes valores (manter os nomes dos tokens):
```css
--fundo-pagina: #F8FAFC;       /* era #efebf5 (lilás) → agora slate limpo */
--fundo-card: #FFFFFF;          /* sem mudança */
--texto-principal: #131B2E;     /* era #221d2e → azul-marinho escuro */
--texto-secundario: #434655;    /* era #5b5468 */
--texto-terciario: #737686;     /* era #8b8594 */
--texto-titulo: #131B2E;        /* era #49454f → unificado com texto-principal */
--borda: #E2E8F0;               /* era #e4e0ec (lilás) → slate neutro */
```

ADICIONAR estes novos tokens (dentro do `:root`):
```css
/* Borda sutil — divisores internos de tabela */
--borda-sutil: #F1F5F9;

/* 3 níveis de sombra (v3 — substituem --sombra-neutra única) */
--sombra-baixa: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
--sombra-media: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.06);
--sombra-alta: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);

/* Cor informativa (separada da cor da clínica) */
--cor-info: #2563EB;
--cor-info-suave: color-mix(in srgb, var(--cor-info) 10%, transparent);
--cor-info-borda: color-mix(in srgb, var(--cor-info) 25%, transparent);
```

MANTER TEMPORARIAMENTE os tokens antigos de categoria (v2), pois ainda são
consumidos por componentes não migrados:
```
--categoria-financeiro-fundo/label/valor/sombra
--categoria-pessoas-fundo/label/valor/sombra
--categoria-agenda-fundo/label/valor/sombra
--categoria-repasse-fundo/label/valor/sombra
```

MANTER TEMPORARIAMENTE os tokens de status detalhados da v2 pelo mesmo
motivo. A derivação direta das cores semânticas fica para a migração das
telas consumidoras:
```
--status-concluido-fundo/borda/texto/badge-fundo/badge-texto
--status-confirmado-fundo/borda/texto/badge-fundo/badge-texto
--status-em-atendimento-fundo/borda/texto/badge-fundo/badge-texto
--status-aguardando-fundo/borda/texto/badge-fundo/badge-texto
--status-cancelado-fundo/borda/texto/badge-fundo/badge-texto
```

MANTER INTACTOS (não tocar):
- `--cor-primaria`, `--cor-secundaria`, `--cor-menu` (fallback)
- `--cor-primaria-hover`, `--cor-primaria-suave` (color-mix)
- `--dourado`, `--dourado-texto`, `--dourado-fundo`
- `--cor-erro`, `--cor-sucesso`, `--cor-alerta` e seus derivados suave/borda
- `--sobreposicao`
- `--menu-texto`, `--menu-texto-secundario`, `--menu-texto-terciario`,
  `--menu-hover-bg`, `--menu-ativo-bg`, `--menu-avatar-bg`, `--menu-borda`
- `--cor-categoria-1` a `--cor-categoria-5`
- `.agenda-fora-expediente`
- `.numero-tabular`

Manter o antigo `--sombra-neutra` como alias temporário apontando para
`--sombra-baixa` (para não quebrar componentes que ainda o usam):
```css
--sombra-neutra: var(--sombra-baixa);
```

### 2d. Atualizar tokens no `[data-theme="escuro"]`:

TROCAR:
```css
--fundo-pagina: #0F172A;        /* era #1c1a1f → slate-900 */
--fundo-card: #1E293B;          /* era #242229 → slate-800 */
--texto-principal: #F1F5F9;     /* era #e8e6ea */
--texto-secundario: #94A3B8;    /* era #b8b4bf */
--texto-terciario: #64748B;     /* era #8b8594 */
--texto-titulo: #F1F5F9;        /* unificado */
--borda: #334155;               /* era #3a3640 → slate-700 */
```

ADICIONAR:
```css
--borda-sutil: #1E293B;
--sombra-baixa: 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.3);
--sombra-media: 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.25);
--sombra-alta: 0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.3);
--cor-info: #60A5FA;
--cor-info-suave: color-mix(in srgb, var(--cor-info) 10%, transparent);
--cor-info-borda: color-mix(in srgb, var(--cor-info) 25%, transparent);
--sombra-neutra: var(--sombra-baixa);
```

MANTER no escuro os mesmos tokens de compatibilidade de categoria e status
detalhados listados acima no modo claro.

MANTER INTACTOS no escuro: mesma lista do modo claro.

---

## TAREFA 3 — Tipos de tela (src/components/shell/types.ts)

Substituir o conteúdo inteiro por:

```typescript
export type Tela =
  | 'dashboard'
  | 'agenda'
  | 'atendimentos'
  | 'pacientes'
  | 'prontuario'
  | 'financeiro'
  | 'relatorios'
  | 'equipe'
  | 'especialidades'
  | 'configuracoes'

export const TITULOS_TELA: Record<Tela, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda',
  atendimentos: 'Atendimentos',
  pacientes: 'Pacientes',
  prontuario: 'Prontuários',
  financeiro: 'Financeiro',
  relatorios: 'Relatórios',
  equipe: 'Equipe',
  especialidades: 'Especialidades',
  configuracoes: 'Configurações',
}
```

Nota: o tipo `'cadastros'` FOI REMOVIDO. As telas que estavam agrupadas
em "Cadastros" agora são itens separados: "Equipe" e "Especialidades".
Atualizar o App.tsx para redirecionar: onde era `tela === 'cadastros'`,
trocar para `tela === 'equipe'` (renderizando o mesmo componente Cadastros
por enquanto, até separar as telas depois).

---

## TAREFA 4 — Ícones novos (src/components/shell/icons.tsx)

Adicionar ao arquivo existente (NÃO remover os ícones que já existem):

```typescript
export function IconeAtendimentos(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  )
}

export function IconeEquipe(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M15 19a4.5 4.5 0 0 1 7 0" />
    </svg>
  )
}

export function IconeEspecialidades(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <path d="M19.5 12.572l-7.5 7.428-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572" />
      <path d="M12 6v4M10 10h4" />
    </svg>
  )
}

export function IconeSino(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function IconeLupa(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

export function IconeAjuda(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  )
}

export function IconePerfil(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5.5 20a7.5 7.5 0 0 1 13 0" />
    </svg>
  )
}

export function IconeMais(props: IconeProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
```

---

## TAREFA 5 — Sidebar atualizada (src/components/shell/Sidebar.tsx)

Manter TODA a lógica existente (selo, dropdown de clínica, visão
proprietária, filtro de prontuário por papel). Mudar apenas:

### 5a. Lista de itens do menu — substituir ITENS_MENU:

```typescript
const ITENS_MENU: { chave: Tela; Icone: typeof IconeGrid }[] = [
  { chave: 'dashboard', Icone: IconeGrid },
  { chave: 'agenda', Icone: IconeCalendario },
  { chave: 'atendimentos', Icone: IconeAtendimentos },
  { chave: 'pacientes', Icone: IconePessoas },
  { chave: 'prontuario', Icone: IconeArquivo },
  { chave: 'financeiro', Icone: IconeDinheiro },
  { chave: 'relatorios', Icone: IconeGrafico },
  { chave: 'equipe', Icone: IconeEquipe },
  { chave: 'especialidades', Icone: IconeEspecialidades },
  { chave: 'configuracoes', Icone: IconeEngrenagem },
]
```

Importar os novos ícones: `IconeAtendimentos`, `IconeEquipe`,
`IconeEspecialidades`, `IconeMais`, `IconeAjuda`, `IconePerfil`.

### 5b. Botão "+ Novo Agendamento" — adicionar ACIMA da nav:

Depois do bloco do seletor de clínica (após o `</div>` que fecha
`className="relative mb-2 ..."`), antes do `<nav>`, inserir:

```tsx
<button
  type="button"
  onClick={() => selecionarTela('agenda')}
  className="mx-1 mb-4 flex w-[calc(100%-8px)] items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:shadow-md"
  style={{ color: 'var(--cor-primaria)' }}
>
  <IconeMais className="h-4 w-4" />
  Novo Agendamento
</button>
```

### 5c. Rodapé da sidebar — substituir o bloco do avatar/email:

Substituir o `<div className="mt-auto ...">` existente por:

```tsx
<div className="mt-auto border-t border-[var(--menu-borda)] pt-3">
  <div className="flex flex-col gap-0.5">
    <button
      type="button"
      className="flex items-center gap-3 rounded-[10px] py-2 pl-3.5 pr-3 text-sm text-[var(--menu-texto-secundario)] transition hover:bg-[var(--menu-hover-bg)]"
    >
      <IconeAjuda className="h-[18px] w-[18px]" />
      <span>Ajuda</span>
    </button>
    <button
      type="button"
      className="flex items-center gap-3 rounded-[10px] py-2 pl-3.5 pr-3 text-sm text-[var(--menu-texto-secundario)] transition hover:bg-[var(--menu-hover-bg)]"
    >
      <IconePerfil className="h-[18px] w-[18px]" />
      <span>Perfil</span>
    </button>
    <button
      type="button"
      onClick={onSair}
      className="flex items-center gap-3 rounded-[10px] py-2 pl-3.5 pr-3 text-sm text-[var(--menu-texto-secundario)] transition hover:bg-[var(--menu-hover-bg)]"
    >
      <IconeFechar className="h-[18px] w-[18px]" />
      <span>Sair</span>
    </button>
  </div>
</div>
```

Nota: os botões "Ajuda" e "Perfil" por enquanto só ficam visíveis
(sem ação). A ação será implementada depois.

---

## TAREFA 6 — Header atualizado (src/components/shell/AppShell.tsx)

Substituir o header inteiro (o `<div>` que contém `border-b` e
`justify-between`) pelo novo design baseado no Stitch:

```tsx
<header className="flex h-16 flex-none items-center gap-4 border-b border-[var(--borda)] bg-[var(--fundo-card)] px-4 lg:px-6">
  {/* Botão hambúrguer — só mobile */}
  <button
    type="button"
    onClick={() => setDrawerAberto((v) => !v)}
    aria-label={drawerAberto ? 'Fechar menu' : 'Abrir menu'}
    className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] lg:hidden"
  >
    {drawerAberto ? <IconeFechar /> : <IconeMenuHamburguer />}
  </button>

  {/* Abas de clínica — só proprietária (desktop) */}
  {clinicasDoUsuario.length > 1 && (
    <nav className="hidden items-center gap-1 lg:flex">
      {clinicasDoUsuario.map((c) => {
        const ativa = c.id === clinicaAtiva?.id
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelecionarClinica(c.id)}
            className={`relative px-3 py-2 text-sm font-medium transition ${
              ativa
                ? 'text-[var(--cor-primaria)]'
                : 'text-[var(--texto-terciario)] hover:text-[var(--texto-principal)]'
            }`}
          >
            {c.nome.replace('Clínica ', '')}
            {ativa && (
              <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-[var(--cor-primaria)]" />
            )}
          </button>
        )
      })}
    </nav>
  )}

  {/* Nome da clínica — só funcionário (desktop) */}
  {clinicasDoUsuario.length <= 1 && clinicaAtiva && (
    <span className="hidden text-sm font-medium text-[var(--texto-secundario)] lg:block">
      {clinicaAtiva.nome}
    </span>
  )}

  {/* Espaçador */}
  <div className="flex-1" />

  {/* Busca (desktop) */}
  <div className="hidden items-center gap-2 rounded-lg border border-[var(--borda)] bg-[var(--fundo-pagina)] px-3 py-1.5 text-sm text-[var(--texto-terciario)] lg:flex">
    <IconeLupa className="h-4 w-4" />
    <span>Buscar paciente ou agenda...</span>
    <kbd className="ml-4 rounded border border-[var(--borda)] bg-[var(--fundo-card)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--texto-terciario)]">
      Ctrl+K
    </kbd>
  </div>

  {/* Ícones de ação */}
  <div className="flex items-center gap-2">
    {/* Sino de notificações */}
    <button
      type="button"
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--texto-secundario)] transition hover:bg-[var(--fundo-pagina)]"
    >
      <IconeSino className="h-5 w-5" />
      <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-[var(--cor-erro)]" />
    </button>

    {/* Toggle claro/escuro */}
    <ThemeToggle />

    {/* CTA — Novo Atendimento (desktop) */}
    <button
      type="button"
      onClick={() => onNavegar('atendimentos')}
      className="hidden items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 lg:flex"
      style={{ backgroundColor: 'var(--cor-primaria)' }}
    >
      Novo Atendimento
    </button>

    {/* Avatar do usuário */}
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--fundo-pagina)] text-xs font-bold text-[var(--texto-principal)]">
      {emailUsuario.slice(0, 2).toUpperCase()}
    </div>
  </div>
</header>
```

Importar no AppShell: `IconeLupa`, `IconeSino` (de `./icons`).
Adicionar as props necessárias: `clinicasDoUsuario`, `clinicaAtiva`,
`onSelecionarClinica` (já existem no AppShellProps, verificar).

Mover o botão "Sair" do header para a sidebar (já feito na Tarefa 5c).

---

## TAREFA 7 — App.tsx (registrar novas telas)

### 7a. Imports — adicionar ao topo:
Nenhum import novo de página necessário (usaremos PlaceholderScreen
para as telas novas por enquanto).

### 7b. Substituir o bloco de 'cadastros' pelo seguinte:

Onde hoje tem:
```tsx
{tela === 'cadastros' && (
  <Cadastros ... />
)}
```

Trocar por:
```tsx
{tela === 'equipe' && (
  <Cadastros
    clinicaAtivaId={clinicaAtivaId}
    carregandoClinica={carregandoClinica}
    usuarioId={session.user.id}
  />
)}
```

### 7c. Adicionar placeholders para as telas novas:

No bloco final que renderiza `PlaceholderScreen` para telas não
implementadas, adicionar 'atendimentos' e 'especialidades' à lista
de telas que caem no placeholder. O bloco condicional deve ficar:

```tsx
{tela !== 'dashboard' &&
  tela !== 'agenda' &&
  tela !== 'pacientes' &&
  tela !== 'equipe' &&
  tela !== 'prontuario' &&
  tela !== 'financeiro' && <PlaceholderScreen titulo={TITULOS_TELA[tela]} />}
```

### 7d. Remover o import de Cadastros caso o nome mude:
O componente `Cadastros` continua sendo usado, só muda a tela que o
invoca (de 'cadastros' para 'equipe'). NÃO renomear o componente agora.

---

## REGRAS INEGOCIÁVEIS (aplicar em TODAS as tarefas acima)

1. **ZERO cor literal** em componente — só tokens CSS (`var(--...)`).
   A ÚNICA exceção é `bg-white` no botão "+ Novo Agendamento" da sidebar
   (que é branco em qualquer tema por design).
2. **Modo claro/escuro** deve continuar funcionando. Testar mentalmente:
   "se o fundo fosse quase preto, todo texto e ícone seria visível?".
3. **Mobile-first / responsivo** — a sidebar já vira drawer no mobile
   (manter). O header deve esconder elementos secundários (busca, abas,
   CTA) no mobile e mostrar só o botão hambúrguer + sino + avatar.
4. **NÃO tocar** em nenhuma página (Dashboard.tsx, Financeiro.tsx, etc.).
   Este prompt é SOMENTE sobre o layout-shell.
5. **NÃO tocar** no banco de dados, hooks, lib, backend.
6. **NÃO criar** arquivos novos além dos listados. Só editar os existentes
   + adicionar ícones no icons.tsx.
7. **Português do Brasil** em toda a interface.

---

## COMO VOU TESTAR

1. `npm run dev` roda sem erros.
2. Login funciona normalmente.
3. Sidebar tem fundo na cor da clínica, com 10 itens para médicos e 9 para
   os demais papéis, que não visualizam o Prontuário.
4. Botão "+ Novo Agendamento" aparece no topo da sidebar, branco.
5. Header mostra abas "Brotas | Ipupiara | Ibitiara" (como proprietária).
6. Busca com ícone de lupa e badge "Ctrl+K" aparece no header (desktop).
7. Sino de notificações com badge vermelho aparece no header.
8. Botão "Novo Atendimento" azul aparece no header (desktop).
9. Toggle claro/escuro continua funcionando.
10. No mobile: sidebar vira drawer, header mostra só hambúrguer + sino +
    avatar. Busca e abas ficam escondidos.
11. Rodapé da sidebar mostra Ajuda, Perfil e Sair.
12. A fonte mudou de Fraunces/Inter para Geist em toda a interface.
13. O fundo da página está mais claro/limpo (#F8FAFC) e as bordas são
    slate neutro (#E2E8F0), sem tingimento roxo.

---

*Prompt gerado em 11/08/2026. Referência: 01-DESIGN-SYSTEM.md v3 +
telas do Google Stitch (especialmente dashboard_executivo e
fila_da_recep_o_padronizado).*

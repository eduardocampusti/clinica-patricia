# Login — Auditoria do estado atual

**Estado: APROVADO** — auditoria local concluída em 24/09/2026, sem acesso ou escrita no Supabase remoto.

## Estado encontrado antes da fundação multi-clínica

- `src/App.tsx` restaurava a sessão com `getSession`, acompanhava mudanças com `onAuthStateChange` e abria a aplicação diretamente quando já existia sessão.
- `src/pages/Login.tsx` usava `signInWithPassword`, consultava `usuarios_clinicas` ativos e depois os nomes em `clinicas`.
- O par clínica/papel escolhido era revalidado no `App` por `useClinicasDoUsuario`, `useClinicaAtiva` e `usePapelNaClinica` antes de liberar a interface.
- A clínica ativa era validada contra a lista limitada por RLS e opcionalmente persistida no `localStorage`.
- Não havia router dedicado: as telas internas eram controladas por estado em `App.tsx`.
- Não havia resolução de marca por hostname ou rota local.

## Problemas encontrados

1. A tela usava uma identidade genérica “Clínica Patrícia” e não distinguia Brotas de Ipupiara.
2. Uma sessão restaurada podia pular o fluxo explícito de confirmação de clínica e papel no login.
3. A consulta dos vínculos estava embutida no componente visual, dificultando reutilização e teste.
4. Não havia tratamento específico para negar uma conta autenticada no domínio de outra clínica.
5. A proprietária multi-clínica não tinha uma etapa deliberada que a liberasse do contexto inicial do domínio.
6. Os textos, cores e imagens estavam acoplados ao JSX/CSS do login.

## Assets inventariados

### Brotas

- `public/imagem_login_brotas.png` — 1024×1536, imagem hero aprovada e ativa para Brotas.
- `public/login-bg.png` — 1254×1254, banner anterior preservado, mas não utilizado no hero atual.
- Não foi encontrado arquivo separado de logo Brotas adequado ao cabeçalho.

### Ipupiara

- `public/imagem_login_ipupiara.png` — 1024×1536, imagem hero aprovada e ativa para Ipupiara.
- `public/login-clinica.jpg` — 512×279, fotografia institucional genérica anterior preservada, mas não utilizada no hero Ipupiara.

### Genéricos/não relacionados às clínicas

- `public/favicon.svg` não representa Brotas ou Ipupiara.
- `public/icons.svg` é um sprite de ícones genéricos.
- `src/assets/hero.png`, `react.svg` e `vite.svg` não são assets de marca das clínicas.

## Estado apó a implementação

A marca e a configuração de entrada foram centralizadas; a consulta de vínculos foi extraída; o login novo e a sessão restaurada passam pelo mesmo gate; e o endereço errado é negado para usuários sem vínculo. Após a correção de 25/09/2026, inclusive a proprietária com dois vínculos recebe somente a clínica correspondente ao link de entrada. A autorização final continua no banco/RLS e é revalidada no frontend antes da abertura da aplicação.

Em 24/09/2026, a experiência visual genérica remanescente foi eliminada. Localmente, `/login` redireciona para Brotas; em produção, o hostname decide a marca; hostname desconhecido recebe somente bloqueio seguro, sem campos de autenticação.

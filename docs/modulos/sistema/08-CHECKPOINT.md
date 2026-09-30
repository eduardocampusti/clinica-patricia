# Sistema — checkpoint de implementação local

Continuidade30/09/2026: relatório09-GITHUB-DOMINIOS-SMTP.md registra planos/dominios/SMTP e revisão de Git. Preparado deploy estático e retorno por unidade, Edgev6 aplicada, nenhum deploy Hostinger conforme decisão posterior do usuário. Sem SMTP das clínicas/remetente definido. Testes isolados e limites da suíte login registrados, sem afirmar publicação pública.

Código atual sincronizado na branch codex/resgate-local-2026-09-26, commit de código 063a2baf0f3c52db19d66f0f3df3f32571edcd3e e SHA remoto idêntico. Build aprovado desse commit com árvore limpa. Nenhum merge/release em main; nenhum deploy Hostinger. Relatório09 contém limitações e pendências de SMTP.

## Histórico — estado de 26/09/2026

**Estado naquele momento:** implementação local em revisão, em 26/09/2026. Sem commit, release ou publicação naquela etapa.

- O shell, o rodapé e o cabeçalho usam o rótulo centralizado `Proprietário(a)`; a visão lateral usa `Visão de proprietário(a)`. O identificador de autorização continua `proprietaria`.
- “Sobre o sistema” está na navegação secundária para perfis autenticados. A página acompanha a clínica ativa, mostra `0.1.0` como versão **em desenvolvimento**, apresenta os créditos aprovados da Vencer Digital e omite dados institucionais não confirmados. A marca vetorial está em asset local, sobre superfície clara nos temas claro e escuro. O histórico não contém lançamentos fictícios.
- O Vite incorpora a versão do pacote, o commit de origem (se disponível), a existência de alterações locais e a hora da compilação. Um SHA de árvore suja não representa todo o código. As notas em português entram no bundle. O build compara pacote e lockfile, distingue notas em desenvolvimento das versões lançadas e preserva o manifesto em `0.0.0` como referência inicial, não como release publicada.
- Release Please agora tem, **somente na árvore local**, gatilho proposto para `push` em `main` e execução manual, com PR de versão em rascunho, seções do changelog em português e `initial-version: 0.1.0`. A API pública confirmou `main` como padrão e ausência de tags/releases; `gh` tem credencial configurada inválida, mas `gh api` público funcionou, enquanto Git HTTPS falhou no provedor de credenciais do Windows. O código da ferramenta Release Please 17.11.2 calculou localmente primeiro `0.1.0` sem release anterior e os incrementos pré-1.0 previstos; o dry-run integral foi impedido por tentativa de `git fetch` na `.git` protegida. Nada está ativo no GitHub. A PR #1 continua em rascunho sobre o checkpoint. Inventário em `../../releases/0.1.0-CONSOLIDACAO-LOCAL.md`.
- Validação sintética da página Sobre: 6 testes operacionais aprovados em desktop, tablet e celular, incluindo contexto de clínica, créditos/links, logo, versão, histórico vazio, teclado e tema escuro. `npm run build` (inclui typecheck) e `npm run lint` concluídos; lint mantém aviso preexistente em `ThemeProvider.tsx`. `git diff --check` sem erros de espaço.

Pendências: revisão e integração modular do checkpoint e da árvore original em `main`; publicar e confirmar o workflow/PR automática no GitHub somente após aprovação; confirmar dados institucionais e política de suporte das clínicas. Esta página não altera autorização ou dados clínicos. O conteúdo sintético dos testes não comprova publicação em produção.

## Mensagens compartilhadas — 28/09/2026

Foi preparado localmente o padrão visual e acessível de mensagens e confirmações em `docs/padroes/PADRAO-MENSAGENS-SISTEMA.md`. Os componentes reutilizáveis são baseados em shadcn/ui `Alert` e `AlertDialog`, têm variantes explícitas de sucesso, atenção, erro e informação, suporte a tema escuro, movimento reduzido, anúncio assistivo e foco seguro. A configuração ainda não foi publicada.

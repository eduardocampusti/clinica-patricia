# Configurações — entrega local e pendências

Registro histórico da entrega às 18:12. Prévia/PDF e revisão de backend foram
complementados/substituídos no [relatório de continuação](10-REVISAO-PDF-EXPERIENCIA-BACKEND.md).
Leitor externo com falha relatada reabriu a investigação; a verificação inicial
não comprova ausência de diferenças naquele leitor. Estado atual no README/checkpoint.

Data: 08/10/2026, 18:12 -03:00, America/Bahia. Estado: IMPLEMENTAÇÃO LOCAL VERIFICADA;
backend somente preparado. Nenhuma alteração remota, conta, Docker, commit, push ou
publicação. Branch `codex/equipe-fase2-2026-10-07`, HEAD `ad49386105b3ea19b10b11a4e40c31983ae38d69`.
Base publicada 0.2.0/26909341 informada e registrada no checkpoint anterior;
checkout observado diferente com numerosos trabalhos locais pré-existentes.

## Comportamento implementado

- Menu Configurações abaixo de Equipe e antes de Sobre, engrenagem, rota própria
  por unidade e restrição de interface a Proprietário(a). Backend proposto exige
  usuário/vínculo/unidade ativos; padrão geral depende de grant próprio sem seed.
- Cinco seções: Dados da clínica, Identidade visual, Timbrados e documentos,
  Tela de login e Histórico de alterações. Preserva editores operacionais existentes.
- Dados estendem `clinicas`, sem segundo cadastro. Empresas usam `equipe_registros`
  canônico; nome/CNPJ vinculados somente leitura. Máscaras, validação alfanumérica
  de CNPJ e consulta CEP existente com alternativa manual.
- Herança distingue ausência de vazio/falso/lista vazia. Variações gerais de tipo
  ficam abaixo das personalizações da unidade. Voltar remove só a escolha própria.
- PNG/JPEG proporcionais; parser compartilhado e decodificação, limites de arquivo,
  dimensões, recodificação PNG no serviço, caminhos únicos e bucket privado.
  Seleção local quando backend ausente é explicitamente prévia, sem upload real.
- Timbrado estruturado com lista de variáveis institucionais, texto simples,
  margens, alinhamento, logo, cabeçalho/rodapé, páginas e marca-d’água discreta.
  Prévia mostra o mesmo PDF demonstrativo A4 baixável, com dados fictícios.
- Rascunho/aplicação/restauração distintos; restauração cria nova versão.
  Reconsulta após conflito/resposta incerta. Resposta 200 incompleta não confirma
  persistência. Respostas antigas não substituem o contexto; edição pendente tem
  salvar/descartar/continuar e aviso de fechamento/F5.
- Login público preparado por domínio autorizado, somente campos/arquivos aplicados.
  Imagem indisponível mantém formulário. Auth, recuperação e convites preservados.
  Atualização de identidade fixa usa ID/subdomain, independente do nome editável.
- Integração preparada com PDF financeiro por unidade, preservando cálculos,
  coleta, formatação e auditoria existentes. Ativa somente após homologar backend.
  PDF consolidado e XLSX mantêm mecanismos atuais.

## Arquivos preparados

| Grupo | Arquivos principais |
| --- | --- |
| Tela e demonstração | `src/pages/Configuracoes.tsx`, `configuracoes.css`, `scripts/preview-configuracoes.mjs`, `tests/configuracoes/preview.*` |
| Contrato/serviço | `supabase/functions/_shared/configuracoes.ts`, `src/lib/configuracoes.ts`, `src/hooks/useMarcaInstitucional.ts` |
| PDF | `src/lib/timbradoPdf.ts`; integração em `src/lib/financeiro/financeiro.relatorios.ts`, `src/lib/financeiroRelatorios.ts`, `src/pages/FinanceiroRelatorios.tsx` |
| Navegação/tema | `src/App.tsx`, componentes `src/components/shell`, `src/hooks/useClinicaAtiva.ts`, `useClinicasDoUsuario.ts`, `src/lib/clinicAccess.ts`, `src/config/clinicBrands.ts` |
| Login | `src/pages/Login.tsx`, `src/pages/login.css` |
| Backend proposto | `supabase/migrations/20261008213000_configuracoes_institucionais.sql`, Edge `configuracoes` e `configuracoes-publicas`, `supabase/config.toml` |
| Revisão futura | `supabase/tests/configuracoes_preflight.sql`, `configuracoes_pos_aplicacao.sql`; integridade oficial não executada porque nenhuma mudança foi aplicada |
| Verificações | `src/lib/configuracoes.test.ts`, `tests/configuracoes/configuracoes.spec.ts`, configs Playwright/Vite e `validar-pdfs.py` |
| Memória/notas | documentos deste módulo; referências em Sistema/Login/Financeiro, índices/checkpoints e `src/config/notasEvolucao.json` em não lançadas |

Arquivos pré-existentes preservados por comparação SHA-256 do inventário inicial;
787 arquivos pré-existentes permaneceram idênticos; 29 alterações intencionais e
24 arquivos novos identificados. Evidência local
não versionada: `scratch/configuracoes/preservacao-final.json`. Nenhuma exclusão.
Alterações anteriores de Meu perfil/Equipe e demais módulos não foram revertidas.

## Como abrir e experimentar

Na aplicação local, Proprietário(a) com sessão autorizada abre **Configurações** no
menu. Rotas: `/sistema/brotas/configuracoes` e `/sistema/ipupiara/configuracoes`.
Backend desligado em `src/lib/configuracoes.ts`: dados novos/empresas ainda não
consultáveis; salvar/aplicar/histórico persistente indisponíveis e aviso explícito.

Demonstração separada sem conta: abrir terminal na pasta do projeto, executar
`node scripts/preview-configuracoes.mjs` e abrir
`http://127.0.0.1:4193/tests/configuracoes/preview.html`.
Banner permanente indica dados fictícios/operações em memória. F5 apaga estado.
Fechar servidor com Ctrl+C. Essa demonstração não comprova persistência real.
No celular, **Ir à prévia** dá acesso direto sem atravessar todo o formulário.

## Evidências e limites

| Verificação | Resultado comprovado |
| --- | --- |
| `npm run build` | Tipos, notas e compilação 0.2.0 passaram; aviso de chunk acima de 500 kB permanece. PDF carregado sob demanda |
| `npm run lint -- <arquivos alterados>` | Oxlint oficial sem advertências no recorte final |
| `node --experimental-strip-types --test src/lib/configuracoes.test.ts` | 10 testes passaram: herança/vazio, tipo geral/local, scripts, CNPJ/contatos, contraste/medidas, cópia independente |
| Playwright `tests/configuracoes/playwright.config.ts` | Rodada completa de 20 passou: rotas/F5, recepção/médico, edições, rascunho/aplicação/restauração simulados, conflitos/503/200 incompleto, arquivos inválidos, PNG transparente, teclado, celular, login sem imagem, demonstração e PDF financeiro; 1 caso novo de empresa vinculada também passou, total 21 distintos |
| Playwright `tests/login/dashboard-identidade.config.ts` | 29 regressões passaram: nome/foto/isolamento, login/F5, recuperação e convites sintéticos |
| `npm run test:financeiro` | 15 regressões passaram: valores/datas, wrappers/allowlists, idempotência e relatório/paginação, sem banco real |
| Reexecução após acabamento | 9 cenários pertinentes e depois 2 de PDF passaram; não somar como casos independentes. Renderer evita dividir parágrafo curto e reserva início de conteúdo após título |
| PDF via Python/Poppler | 1 página com cabeçalho longo; 3 páginas com rodapé longo/marca-d’água; 7 páginas financeiras com todas as 180 linhas. A4, paginação e texto verificados; primeira/intermediária/última páginas renderizadas e inspecionadas |
| Visual | Capturas fictícias desktop, 360/390/430 px claro/escuro; sem transbordamento horizontal; tabs por teclado; logos 4:1 proporcionais |
| Backend | Código/proposta revisados localmente e analisados estaticamente. Sem PostgreSQL/Deno local, compilação SQL/Edge e execução real NÃO comprovadas |

Artefatos locais em `scratch/configuracoes`: `desktop-viewport.png`, capturas móveis,
`demonstracao.pdf`, `uma-pagina.pdf`, `financeiro-ficticio.pdf`, PNGs renderizados e
`pdf-verificacao.json`. Somente dados fictícios. Chrome nativo funcionou após usar
canal instalado; navegador padrão de testes estava ausente. Object PDF headless não
renderiza no screenshot, por isso o mesmo arquivo foi conferido com Poppler.
Poppler avisou ausência de fontes Symbol/ArialUnicode; texto latino foi renderizado
e conferido legível. Tentativa de ESLint não configurado falhou; validação correta
usou Oxlint do projeto, sem mudar package.json/lock nem instalar dependência do produto.

Mocks não provam persistência, RLS/ACL, serviço publicado, autorização real ou sessão
autenticada em produção. Nenhuma credencial, dado de paciente ou conta real foi usado
nos testes. Usuários técnicos encerrados permanecem fora do escopo. Ibitiara não ativa.

## Dependências para ativação

Migration, Storage privado, RPCs e duas Edge Functions precisam de revisão e
homologação no único Supabase permitido `xftnkusbyqzyvzrovroj`; não foram aplicados.
Homologar usuário ativo/vínculo, proprietário versus demais perfis, duas unidades,
anônimo, autorização global explícita, rascunho privado, ativos históricos,
conflitos e recuperação de falhas parciais. Inspecionar `information_schema`,
`pg_proc`, RLS/ACL e executar integridade oficial após aplicação autorizada.

Empresas atuais só têm nome/CNPJ. Endereço/contatos da empresa não serão fabricados
a partir da unidade; ampliar a fonte canônica depende de etapa futura própria.
Documento emitido deve guardar PDF/snapshot original; financeiro atual exporta
sob demanda e arquivos baixados não mudam. Não existe emissor clínico/laboratorial
para integrar: contrato preparado, sem prescrição, assinatura digital ou laudo.
Laboratório futuro entrega instituição própria, sem equiparação automática.

Próximo passo concreto: homologar a proposta seguindo
[gates da arquitetura](06-ARQUITETURA-TECNICA.md), provar persistência/segurança e
então habilitar o frontend. Preparar pacote seletivo e publicação somente com nova
autorização; esta entrega e documentação não autorizam backend/commit/deploy.

## Skills e consultas

Jev/OpenRouter: uma triagem sintética, sem projeto privado: `code_change`, confiança
0,81, complexidade 1,92/2 (confiança 0,88), informação essencial faltante 0,29.
908 tokens de entrada + 119 de saída, 1125,432 ms, custo US$ 0,000038136.
Codex tomou decisões técnicas/visuais após inspeção. TypeSafe completo consultado:
recurso determinístico, nenhuma IA/API incorporada ao produto, sem promessa de economia.
Impeccable, PDF, catálogo/API gratuitos ReUI e documentação oficial consultados;
componentes existentes e Base UI reaproveitados. Referências na arquitetura.

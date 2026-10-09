# Configurações — revisão do PDF, experiência e backend

Atualização posterior, 08/10/2026, 20:17 -03:00: titular confirmou conferência externa
do PDF revisado nas três páginas, sem reprodução do problema. Nenhuma nova rodada
estética. Estado conectado atual no [relatório12](12-HOMOLOGACAO-CONECTADA-PREFLIGHT.md):
canal oficial funcionou; aplicação interrompida por RPC obrigatória ausente, sem escrita.
As evidências locais abaixo conservam sua data/escopo, não são homologação remota.

08/10/2026, 19:58 -03:00, America/Bahia. Revisão local do pedido de continuação;
sem alteração remota, conta nova/reativada, commit, push ou deploy.
Branch `codex/equipe-fase2-2026-10-07`, HEAD `ad49386105b3ea19b10b11a4e40c31983ae38d69`.
Alterações não commitadas, preservadas as contribuições simultâneas de acesso direto.
Este registro substitui as conclusões anteriores sobre a prévia/PDF e amplia a
revisão da proposta de backend; não invalida testes anteriores sem risco novo.

## PDF efetivamente entregue: investigação

**Informado pelo usuário:** renderização externa apresentou espaçamentos irregulares
entre letras no cabeçalho “Clínica Exemplo”, corpo e rodapé. Leitor externo não identificado.

**Observado no arquivo:** `scratch/configuracoes/demonstracao.pdf`, preservado em
`scratch/configuracoes-revisao/demonstracao-original.pdf`, 6.787 bytes, jsPDF 4.2.1,
três páginas A4, SHA256
`c26f69613fd60c815d096b3ad9930e3eb2fdbf36157cd0faca22e5a9c4e4aec7`.

| Item | Evidência local |
| --- | --- |
| Fonte | Helvetica normal/negrito, Type1 padrão do PDF, não incorporada. Os 14 recursos padrão constavam no arquivo, mesmo os não utilizados. |
| Codificação | WinAnsi nas fontes latinas; extração pypdf e PDFium conserva Clínica, Demonstração, informação e acentos do rodapé. Ausência de ToUnicode em fonte padrão não prova corrupção. |
| Letras/palavras | Sem operadores Tc, Tw, Tz ou TJ nas três páginas: nenhum espaçamento extra definido no arquivo. Não há justificação por distribuição de espaços. |
| Quebra de linha | Gerador media o nome com estilo normal e o desenhava em negrito. Diferença real de medidas; não explica, por si, a falha relatada em todo o corpo. |
| Dois leitores | Poppler e PDFium renderizaram as três páginas com texto legível e sem reproduzir a irregularidade externa. Há diferenças normais de suavização. |
| Avisos Poppler | Symbol/ArialUnicode em recursos padrão sem uso: avisos não fatais. Não demonstram substituição incorreta da Helvetica usada no corpo. |

**Conclusão limitada:** o arquivo dependia das fontes padrão/substitutas do leitor.
Não se comprovou que a substituição causou o relato, nem que o leitor externo é defeituoso.
Não houve reprodução naquele leitor. A incorporação elimina essa dependência para as
fontes utilizadas e a correção das medidas remove uma inconsistência do gerador.

## Correção feita no gerador e nova demonstração

- Noto Sans Regular/Bold originais, incorporadas em todas as páginas; Type0/CIDFontType2,
  Identity-H, mapa ToUnicode e tabela explícita de larguras. Somente fontes usadas são incluídas.
- Fonte e peso definidos **antes** de medir nome/cabeçalho/rodapé/corpo/tabelas.
  Espaçamento entre caracteres zero; sem espaçamento extra entre palavras.
- Arquivos e licença SIL OFL 1.1 em `src/assets/pdf/`. Permissão de incorporação e
  redistribuição; fontes não modificadas. Origem e hashes registrados no README.
- Duas fontes somam cerca de 1,145 MB no pacote; carregamento local sob demanda,
  promessa compartilhada durante a sessão. O PDF incorpora apenas os glifos utilizados.
  Falha de carregamento recusa PDF, sem fonte substituta silenciosa.
- Nova entrega: `output/pdf/demonstracao-configuracoes-revisada.pdf`, três páginas,
  SHA256 `69da897e22adfefa6548f880ce5608531a06b8ac89f971486e0bdb641d01ac6d`.
  Logo fictícia transparente/proporcional 4:1, cabeçalho personalizado, CNPJ
  **de teste** 11.222.333/0001-81, endereço extenso, rodapé personalizado,
  marca-d'água, numeração e identificação “DEMONSTRAÇÃO · DADOS FICTÍCIOS · SEM VALIDADE CLÍNICA”.
- Páginas 1/2/3 renderizadas e inspecionadas em Poppler e PDFium. Acentos, conteúdo,
  endereço, CNPJ, repetição e margens conferidos por extração/medidas.
  Cabeçalho com nome longo em negrito também conferido em PDF separado de uma página.

Referências oficiais: [jsPDF — fontes TTF](https://github.com/parallax/jsPDF#use-of-unicode-characters--utf-8),
[licença Noto](https://github.com/notofonts/noto-fonts/blob/main/LICENSE).
Inspeções reproduzíveis: `tests/configuracoes/validar-revisao-pdfs.py`,
`scratch/configuracoes-revisao/inspecao-original.json` e `inspecao-revisada.json`.

## Experiência implementada

- Aviso permanente curto: edição/prévia local e indisponibilidade de salvar/aplicar/enviar.
  Clínica, alcance, alterações não salvas e restrições de ação continuam visíveis.
- “Ajuda e integrações” recolhe detalhes de backend, autorização global, fonte
  empresarial, histórico e emissores futuros. Componente Collapsible já existente.
  ReUI gratuito consultado (catálogo/API), sem instalar componente ou migrar dependência.
- Prévia A4 da **primeira página** atualiza 500 ms após a última alteração do modelo.
  Dependência serializada estável, cancelamento de busca obsoleta e descarte de resultados
  antigos. Fonte, medidas, quebras e geometria compartilhadas com o gerador.
- A prévia automática é SVG e não chama `doc.output`: nenhum PDF/exportação ocorre
  automaticamente. PDF completo/download continuam explícitos. Download anterior é
  invalidado por edição; mudança de tipo durante geração também impede resultado obsoleto.
- Amostra mantém os dados institucionais fictícios aprovados, independentemente de
  dados oficiais digitados. Seleção de campos, textos, medidas, logos e demais escolhas
  de apresentação refletem o editor; tela de login conserva sua prévia própria.
- Rascunhos, confirmação de saída/troca, F5 e responsividade mantidos; nenhuma
  escrita em Login/App/rotas nesta revisão. Novo aviso de conflito fica visível quando necessário.

## Revisão do backend preparado

**Revisão de código/proposta SQL**, não prova conectada nem aplicação de migração.

| Aspecto | Resultado e limite |
| --- | --- |
| Fonte oficial | Aplicar atualiza `clinicas` na transação de versão/auditoria. Nome/CNPJ de empresa são recompletados de `equipe_registros`, não gravados por Configurações. Rascunho não atualiza o cadastro oficial. |
| Clínica/global | Ator deriva de JWT confirmado. Unidade e vínculo ativos, papel Proprietário(a), Brotas/Ipupiara. Geral exige concessão explícita em tabela privada; nenhum seed automático. |
| Público/privado | Endpoint público só entrega nove campos da marca aplicada. Não publica instituição jurídica, versões, autor, rascunhos ou imagens sem referência pública aplicada. Bucket privado; GET de imagem exige referência aplicada. Cache de imagem até 300 s. |
| Tabela oficial/legado | Baseline local concede privilégios de tabela a anon, mas limita leitura a `clinicas_do_usuario`/auth.uid. Não é prova do estado remoto. Proposta passa a exigir RLS existente e acrescenta política RESTRICTIVE false para anon em `clinicas`, sem trocar políticas anteriores. Preflight verifica RLS/ACLs/colunas/RPCs legadas; homologação deve negar leitura/escrita direta não autorizada e revisar quaisquer outras views/RPCs que exponham dados novos. |
| Herança | Ausência herda; vazio, false e [] permanecem deliberados. Logo alternativa só quando não há escolha explícita. Variação da unidade tem prioridade sobre padrão geral por tipo. |
| Upload | Autorização de escopo antes da leitura/decodificação. Corpo limitado, assinatura/MIME, tamanho, dimensões e 8 MP; decodificação real e reencodificação PNG removem metadados. EXIF orientado exige reexportação. UUID/upsert false; sem update/delete direto. |
| Leitura de imagens | Corrigida proposta de leitura geral que dispensava conta/vínculo ativo. Helper com auth.uid e SECURITY DEFINER permite concessão global ativa ou vínculo ativo em clínica permitida. Evita consulta direta à tabela privada de concessões pela política. Membros ativos podem ler imagens institucionais privadas da unidade/gerais; não é acervo de documentos de pacientes. |
| Imagens antigas | Metadados e versões sem update/delete, caminhos únicos, nenhuma exclusão ao substituir/remover. Upload seguido de falha no registro pode deixar órfão privado; limpeza não autorizada nesta etapa. |
| Auditoria/restauração | Evento transacional para cada salvamento/aplicação/restauração; upload registrado separadamente. Restauração cria novo rascunho e versão, não apaga histórico. Aplicar ainda requer confirmação. |
| Concorrência | Locks geral→unidade, revisão local/geral, hash do cadastro oficial e revisão das unidades na aplicação geral. Nova conferência depois do lock da empresa cobre alteração entre consultas. |
| Rascunho anterior a mudança oficial | Falha encontrada e proposta corrigida: `rascunho_fonte_revisao` conserva a base do rascunho. Reconsulta informa `fonteConflitante`/`instituicaoAtual`; servidor recusa sobrescrita com dados antigos. Ação confirmada usa cadastro atual, preserva apresentação/imagens, salva novo rascunho e não aplica. Exige prova conectada específica. |
| Versões | Snapshot de emissão passa a carregar versão aplicada geral e revisão da fonte, além da unidade. Metadados do PDF registram essas referências. Projeção pública usa revisão geral aplicada; representação de aplicação geral conserva os novos campos gerais, não a versão substituída. |
| Financeiro | Integração efetiva no caminho de PDF por clínica, condicionada à flag false. Usa timbrado aplicado e mesmos coletores/formatadores/cálculos/auditoria. PDF sintético com 180 linhas, total 1.234,56 e 180 valores 12,34 conferido em sete páginas. Consolidado mantém exportador anterior; XLSX permanece igual. |
| Documentos antigos | PDFs baixados são autocontidos, com fontes/logo/texto incorporados; alterações futuras não os modificam. O financeiro atual não persiste PDF+snapshot no servidor. Reemitir dados atuais não equivale a recuperar original. Arquivo histórico/documentos clínicos/laboratório exigem contrato e implementação próprios. |

## Coordenação com acesso direto

Sessão simultânea “Planejar acesso para novo membro” acrescentou a guarda
`exigirAtivacaoServico` à Edge privada de Configurações; foi relida e preservada.
`ACESSO_DIRETO_HABILITADO` e `BACKEND_CONFIGURACOES_HABILITADO` continuam false.
Nenhum arquivo de Login/App/rotas, convite, senha temporária ou SQL de acesso direto
foi escrito por esta revisão. Notas/checkpoints foram relidos antes de atualizar.

**Dependência real:** Edge privada requer `acesso_direto_exigir_sessao()`.
Não remover a guarda para ativar Configurações antes do serviço seguro. As migrações
`20261008230000`/`20261008230100` são de outra etapa, separadas da `20261008213000`.
A proteção por inventário precisa incluir as novas tabelas e RPCs autenticadas de
Configurações. Se o inventário já tiver sido aplicado antes, exigir revisão/adendo
específico; nunca reaplicar pacote antigo cegamente. Ver roteiro de ativação.

## Verificações desta revisão

- Sete cenários Chrome novos: atualização automática sem PDF e rascunho/guarda;
  PDF com personalização/invalidar download; conflito de fonte/confirmar sem aplicar;
  falha de fonte sem substituição; medida fora dos limites sem PDF;
  celular 360 px escuro; financeiro 180 linhas.
  Três falhas iniciais eram seletores/dados de teste incorretos e foram corrigidas.
  Reexecutados somente cenários afetados pelos ajustes; não somar reexecuções.
- Inspeção dos PDFs reais: fontes utilizadas incorporadas, Identity-H/ToUnicode,
  Tc zero, margens, acentos, 3/7/1 páginas e conteúdo financeiro completo.
- Capturas desktop e celular; conferência visual do PDF novo nas três páginas de
  ambos os leitores e do nome longo. Nenhuma nova suíte completa de login/financeiro.
- `npm run build`: tipos e build 0.2.0 aprovados; aviso de pacote principal acima
  de 500 kB mantido, não indica implantação. Fontes são assets separados.
- Oxlint dirigido retornou zero; parsing TypeScript dos três arquivos do contrato/
  serviços de Configurações sem erro de sintaxe. Isso não compila Deno/imports remotos.
- SQL/RLS/Storage/Edge e concorrência transacional ainda **não executados/compilados
  em PostgreSQL/Deno nem homologados conectados**. Scripts de preflight/pós-aplicação apenas preparados.
- Skill TypeSafe completa e índice oficial consultados; tarefa determinística,
  nenhuma integração de IA acrescentada. Jev somente triagem sintética inicial:
  code_change confiança 0,52 (incerta; Codex assumiu decisão), complexidade 1,90/2,
  895 entrada +119 saída, 1.050,1133 ms, US$ 0,00003759. Nenhum arquivo privado enviado.

## Arquivos desta continuação

Implementação: `src/lib/timbradoPdf.ts`, `src/lib/timbradoFontes.ts`,
`src/assets/pdf/{NotoSans-Regular.ttf,NotoSans-Bold.ttf,OFL.txt,README.md}`,
`src/components/configuracoes/PreviaTimbrado.tsx`, `src/pages/Configuracoes.tsx`,
`src/pages/configuracoes.css`, `src/lib/configuracoes.ts`, `src/hooks/useMarcaInstitucional.ts`,
`supabase/functions/_shared/configuracoes.ts`,
`supabase/migrations/20261008213000_configuracoes_institucionais.sql`,
`supabase/tests/configuracoes_{preflight,pos_aplicacao}.sql`.

Verificação: `tests/configuracoes/revisao.{config,spec}.ts`,
`tests/configuracoes/validar-revisao-pdfs.py`, `tests/configuracoes/preview.tsx`
(conflito só sintético); seletor do botão atualizado em `configuracoes.spec.ts`.
Artefato entregue em `output/pdf/`; capturas/inspeções em scratch ignorado.

Memória/notas: funcional/arquitetura/README/checkpoint do módulo, relatórios 10/11,
nota de evolução, checkpoint operacional, índice e checkpoint raiz. Contribuições
de Equipe/acesso direto nesses arquivos compartilhados preservadas.
Próximo: [roteiro conectado e operações remotas exatas](11-ROTEIRO-HOMOLOGACAO-CONFIGURACOES.md),
sob autorização futura; nada neste relatório autoriza executá-las.

# Etapa 33 — fichas, contratos e documentos privados

Consolidação conectada em06/10/2026: [resultado31–33, versões, limites e roteiro34](34-CONSOLIDACAO-HOMOLOGACAO-REAL.md).
Principal autorizado:32/33 e corretiva aplicadas, Edges v3,28 testes reais aprovados;
UI normal Brotas/Ipupiara com foto salva, dados confirmados e F5. Domínios preservam
frontend anterior eff05f60; cinco contas técnicas encerradas, três fichas mantidas.
Limites de Auth, download UI e demais cenários estão no34. Histórico datado abaixo.


Registro de 05/10/2026, America/Bahia (-03:00). **Implementação local preparada;
validação real de banco/Storage/Edge pendente.** Integração no frontend normal,
além de demonstração explícita. Não é publicação nem aprovação pessoal do usuário.
Branch `codex/resgate-local-2026-09-26`, HEAD
`eff05f60e07c4042bbb931d1c14d19432612d01d`. Sem commit/push/merge/deploy33.
Principal `xftnkusbyqzyvzrovroj` preservado; Brotas/Ipupiara, sem ativar Ibitiara.

## A — recuperação e preservação31/32

Instruções, fontes funcionais, relatórios31/32, regras de desenvolvimento e padrões
brasileiros consultados. Código local confirma Data Grid31 e foto/recebimento32.
Migration32 preservada por SHA256. Sua não aplicação é o estado documentado na32;
não houve inventário remoto novo de migrations do principal.
Baseline115 arquivos anteriores registrada em `scratch/equipe-fichas-completas`.
Sem reset, limpeza destrutiva ou alteração de migration já aplicada.

Busca no schema/código local encontrou `clinicas.cnpj`, sem empregador separado;
não constitui auditoria viva do banco. Catálogo independente preparado **sem
empresa/CNPJ fictício no ambiente normal**, sem presumir empregador comum. Empresa
sintética somente no harness. Foto segue membro canônico; recebimento segue
profissional + clínica, com máscaras e operações32 próprias. Callback de situação
no painel32 alimenta pendências sem nova consulta financeira ou formulário duplicado.

## B — pessoal, contratos e jornada

Pessoa/cargo/profissão/contrato/empresa/unidade/Auth/papel continuam independentes,
ligados por IDs. Médico CLT mantém informações trabalhistas e profissionais. Tipo
fixo, CPF opcional protegido, nome civil e contatos atuais preservados; contato
não muda login. Novo pessoal: nome social/nascimento/identificação/endereço/
emergência/escolaridade. CPF não é duplicado. Filiação/nacionalidade dependem de
finalidade de admissão; dependentes exigem finalidade de benefício por item.
CEP é consulta explícita, com proteção contra resposta tardia sobrescrevendo edição.

Contrato: empresa, conjunto de unidades, CLT/PF/PJ/estágio/outro pertinente,
matrícula, admissão/início das atividades, prazo/término/experiência condicionais,
cargo/setor/supervisor declarado/atividades/CBO, carga/escala/jornada por dia/unidade/
intervalos, remuneração/periodicidade/benefícios, situação/data/vigência e revisão.
Valores são strings, sem cálculo financeiro/folha/ponto/eSocial. Salário não aparece
na lista; detalhe restrito começa recolhido. Horários sobrepostos e intervalos
incompatíveis são recusados; jornada noturna pode ser distribuída em dois dias.

Um contrato pode servir duas unidades; não nasce outro contrato por vínculo.
Contrato adicional por unidade é explícito. Escopo/referência existentes ficam
fixos nesta entrega para preservar origem/versões. Alterar lotação ou reorganizar
escopo canônico após novo vínculo precisa de fluxo futuro autorizado, sem migração
automática. Situação contratual nunca suspende/reativa login.

CTPS Digital referencia CPF protegido existente e conferência declarada; não
bloqueia cadastro geral antigo sem CPF. CTPS física/PIS só quando pertinentes;
sem credenciais gov.br. Checklist por contrato/função/vínculo: necessário,
complementar, não aplicável e **pendente de definição (padrão)**. Necessidade exige
finalidade/responsável. Checklist não certifica conformidade nem substitui definição
da contabilidade/responsável ocupacional.

## C — documentos privados

Pessoa, contrato opcional e unidades escolhidos explicitamente. Categoria, tipo/
tamanho, emissão/validade somente existentes, autor/data, revisão, versão anterior
e conferência separados. Fluxo preparado: JWT/ator → autorização de todo o escopo
→ validação real → reserva por ID/meta/hash → upload privado sem sobrescrita →
confirmação transacional do objeto e registro. Upload isolado não mostra sucesso.
Nome interno opaco, sem CPF/nome original; dados não entram em listagem/convite/log.

Substituir preserva arquivo/registro anterior, arquiva a antiga e inicia nova
conferência aguardando. Conferência exige revisão/versão exatas, resultado e fonte;
ator/data vêm do servidor. Arquivar não apaga arquivo/histórico. Sem retenção
automática, assinatura digital, OCR ou envio documental para IA.

PDF até10 MB/200 páginas passa por parser real pdf-lib1.17.1; verifica objetos
comprimidos/nomes escapados e recusa conteúdo ativo/arquivos embutidos/ações externas.
Preserva bytes originais, sem certificar assinatura ou ausência de malware.
JPEG/PNG usam codec32 e seus limites, orientação/metadados tratados e JPEG final.
Leitura/download autorizados por ID/pessoa/escopo a cada chamada, retornando binário
conferido por hash/tamanho. Sem caminho/hash/URL pública ou assinada no cliente;
Blob URLs locais revogadas na saída.

Incerteza preserva seleção e mesmo ID. Tentativa recente do próprio ator pode ser
retomada após reabrir. Reenvio precisa metadata/hash iguais; confirmado retorna o
mesmo registro, inclusive substituição. Reserva expira em15 minutos; limpeza
manual considera candidatas >30 minutos, não confirmadas e comprovadamente sem
referência, sob trava compartilhada com confirmação. Marca expirada antes de
remover; falha de limpeza permite repetição. Nada disso foi executado em Storage
real. Prazos operacionais não são prazos de retenção jurídica.

## D — formação e registros

Múltiplos cursos/instituições/conclusão/comprovantes, inscrições por conselho/
número/UF/situação informada, especialidades/áreas e RQE vinculado ao CRM/UF.
Profissão/conselho/especialidade principal existentes não foram convertidos ou
sobrescritos; certificado de curso não comprova especialidade registrada.
Conferência explícita da versão salva registra fonte/evidência/data/responsável
no servidor. Mudança dos dados centrais reinicia conferência; metadata do cliente
não forja resultado. Sem consulta automática a conselhos ou validade inventada;
próxima conferência informada não é prazo legal universal.

## E — interface, pendências e histórico

Ficha normal: Resumo/Pessoal/Contratos e jornada/Formação e registros/Recebimento/
Documentos/Acessos/Histórico. Formação/recebimento só para profissionais. Contrato
também para médico CLT. Botões acessíveis, duas colunas no computador/uma no celular
e uma superfície de rolagem da ficha. Navegação rola apenas o diálogo; a página de
fundo fica bloqueada e sua configuração de rolagem é restaurada ao fechar, observado
também pelo agente no navegador. Sem instalação de componentes externos ou novas
dependências frontend.

Cada seção confirma separadamente, preserva falha, bloqueia repetição incerta/
conflitante e pede descarte explícito. Metadados de documento sem arquivo também
são rascunho. Falha de leitura mostra indisponibilidade, sem cadastro vazio editável
nem fallback para simulação no app normal. Logout/troca invalidam respostas antigas.

Pendências somente dos dados consultados: documentos aguardando/correção, validade
vencida/próxima, término previsto, inscrição não conferida e recebimento ausente32.
Janela de próximos vencimentos30 dias expressa na UI; sem validade presumida ou
alteração automática de acesso/atuação/contrato. Recebimento com falha é “não consultado”.
Snapshots de versões são cifrados/imutáveis; eventos só nomes de campos/revisão/
ator/data/escopo. Histórico vem de releitura do serviço após confirmação, sem eventos
fabricados localmente nem perda de outros rascunhos. Falha dessa releitura não desfaz
sucesso nem inventa auditoria. Versão antiga também exige autorização. Auditoria
não guarda salário, CPF, documento, conta/PIX ou conteúdo clínico.

## Matriz preparada

| Operação | Proprietário(a)/Administradora | Recepção / Médico |
|---|---|---|
| Serviços anteriores31/32 | Mesmas regras/contexto | Nenhuma ampliação |
| Pessoal/formação canônicos | Administração de todos os vínculos ativos e escopo do registro | Negado33 |
| Empresa/contrato/checklist/versão | Todas as unidades do conjunto e referências autorizadas | Negado |
| Documento/ler/baixar/conferir | Pessoa/contexto e conjunto inteiro autorizados no servidor | Negado |
| Ocupacional administrativo | Mais autorização ocupacional específica ativa em cada unidade; sem concessão automática | Negado |
| Prontuário/diagnósticos/resultados | Fora do escopo, inclusive para proprietária | Fora do escopo |

Tabelas33 com RLS e privilégios de navegador revogados. RPCs de serviço exigem ator
e conjunto autorizado. Bucket privado sem policy para navegador, servido por Edge.
Autorização ocupacional preparada sem seed/endpoint de concessão; contrato conjunto
exige autorização específica nas duas unidades. **Matriz conferida em código e
simulação, não homologada contra RLS/Storage real.**

## Arquivos

- Integração: `src/pages/cadastros/Equipe.tsx`, `equipe.css` e
  `src/components/cadastros/EquipeRecebimentoPainel.tsx`.
- Novos componentes: `src/components/cadastros/EquipeFichaAmpliada.tsx`,
  `EquipeFichaCampos.tsx`, `EquipeDocumentosPainel.tsx`.
- Frontend: `src/lib/equipeFicha.ts`, `equipeFichaFormulario.ts`, validação de DTOs,
  serviço real e campos compartilhados. Não modifica busca/paginação/listagem31.
- Servidor: `supabase/functions/_shared/equipeFicha.ts`, `equipeDocumento.ts`,
  `equipePdf.ts`, `equipeFicha.test.ts`; `supabase/functions/equipe-fichas/index.ts`
  e `NOTICE.md`, bibliotecas servidor fixadas/JWT/origens/limites/versões/recuperação.
- Migration **não aplicada**: `20261005210000_equipe_fichas_documentos.sql`:
  registros/versões/autorizações/documentos/tentativas/eventos, índices únicos,
  RPCs/RLS/grants e bucket; depende32 e não edita objetos de outros módulos.
- Testes/demo: `tests/operacional/equipe-fichas-*`, `equipe-fichas.spec.ts`, Vite
  de testes, scripts `test-equipe-fichas.mjs`/`preview-equipe-fichas.mjs` e aliases
  no package. Mocks grid/listagem distinguem endpoints, mantendo asserts de escrita.
- Relatório33, README/master/índice/checkpoints e nota **não lançada** em
  `src/config/notasEvolucao.json`. Sem nova versão publicada.

## Verificações e limites

20 testes determinísticos33,13 regressões32 e5 de convites passaram. Parser PDF
e codec raster executaram bibliotecas reais em Node. Portas/negativas/SQL estático
não executam PostgreSQL/Vault/Deno/Storage. UI:61 cenários distintos (18 novos,
43 regressões), com repetição somente após falhas/mudanças pertinentes. Os18 novos
passaram na execução final após a releitura de histórico;9 casos pertinentes passaram
após o ajuste de rolagem, incluindo as cinco larguras, escuro e fluxos relacionados.

Cobertura sintética: CLT funcionário, prestadora e médico CLT; duas unidades sem
duplicação, contrato adicional exclusivo, recebimento32 separado, CTPS/PIS,
snapshots antigos de cargo/jornada/remuneração, múltiplos conselhos/RQE, documentos/
F5/download/substituição/conferência/falha parcial, ID/escopo direto, capacidade
ocupacional específica, conflito/logout/atraso/descarte, grid/filtros/papéis/convites.
Rede externa bloqueada; bibliotecas/componentes normais com respostas fictícias.
Larguras360/390/430/820/1440, modo escuro, botões alcançáveis e ausência de rolagem
horizontal da página ou dupla nas novas seções. Sem valores sensíveis nas capturas.

Tipos frontend/harness/Edge passaram com bibliotecas reais e declarações Deno
locais. Lint16 avisos preexistentes, sem erros; build passou, mantendo alertas de
bundle/importação dinâmica anteriores. Aplicação3000/demo4193 responderam HTTP200;
conferência visual do agente somente com pessoas fictícias.

**Impedimento:** Supabase/Storage isolado não disponível nas portas54321/22/23;
sem instalação/início de Docker/infra. Nenhum SQL executado em banco. Persistência
real, RLS/grants, Vault, auditoria real, Storage privado, concorrência transacional
e execução/limites Deno pendentes. Tipos não são execução Edge; IndexedDB não é
Supabase; build não é publicação. Não declarar módulo homologado/fechado em
produção, escrita ou e-mail homologados, nem aprovação pessoal do usuário.

## Roteiro gráfico com dados fictícios

[Aplicação normal3000](http://127.0.0.1:3000/sistema/ipupiara/equipe): componentes
integrados ao serviço real. Serviços32/33 ainda não aplicados podem aparecer
indisponíveis. Localhost pode estar conectado ao principal; não gravar testes reais.

[Demonstração4193](http://127.0.0.1:4193/tests/operacional/equipe-fichas-demo.html):
aviso explícito, **somente fictícios**. Fichas/documentos persistem em IndexedDB
simulado deste navegador entre reabertura/F5; foto/recebimento permanecem em memória.
Sem Supabase/criptografia/RLS/login/Storage reais. Reiniciar dados fictícios apaga
estado do teste. Para reabrir servidor: `npm run dev:equipe:fichas` no projeto.

1. Recepção Sintética → Ver cadastro: Pessoal/Contratos. Médico CLT Sintético:
   também Formação/Recebimento. Edite seção somente com informações fictícias;
   Salvar confirma, Cancelar/descartar preserva versão anterior.
2. Documentos: escolha escopo/categoria/contrato se pertinente; selecione
   `scratch/equipe-fichas-completas/documento-ficticio.pdf` gerado pelos testes.
   Arquivo selecionado ainda não é salvo. Clique Salvar documento.
3. Aguarde “Documento salvo: arquivo e registro confirmados”; lista mostra
   armazenamento disponível e conferência aguardando. Conferir versão → fonte
   fictícia → Salvar conferência; visualização/download somente de arquivo fictício.
4. Feche/reabra/F5: armazenamento da demo é IndexedDB. Substituição exige nova
   conferência; versão antiga permanece em Mostrar versões anteriores.
5. Histórico → Consultar versão: snapshot somente de leitura anterior ao cargo
   atual. Trocar clínica não copia contrato exclusivo/recebimento nem duplica pessoa.

## Ordem futura e recuperação

1. Confirmar destino isolado/dependências32/Equipe/profissionais/Vault/pgcrypto/
   auditoria via objetos vivos (`information_schema`/`pg_proc`), sem expor segredos.
2. Aplicar32 antes de33 **somente no destino isolado autorizado**. Verificar objetos,
   índices, grants/RLS/buckets e rodar `supabase/tools/verificar-integridade.sql`.
   Bucket preexistente provoca falha transacional, sem sobrescrita; investigar.
3. Servir duas Edges isoladas: JWT/atores/origens, Deno/PDF/imagem/limites. Verificar
   persistência/F5, Vault/auditoria/Storage/concorrência e chamadas diretas por IDs
   alheios com proprietário de cada conjunto, Recepção/Médico/sem sessão. Conferir
   ocupacional sem/com autorização específica. Negativa mockada não substitui isso.
4. Recuperação: mesmo ID para resultado incerto, confirmação da reserva válida;
   após expiração, limpar só candidata comprovada sem referência e iniciar outra
   tentativa explícita. Nunca apagar versão confirmada; conflito preserva rascunho
   e exige reconsulta/descarte. Não fazer downgrade destrutivo.
5. Só depois de evidência real e autorização futura, planejar aplicação/publicação.
   Não habilitar serviços/escrita antes das dependências; não deduzir empregador,
   conceder ocupacional, migrar pessoas ou transmitir eSocial automaticamente.

## Skills e preservação

TypeSafe integral/índice vivo consultados: [documentação](https://docs.typesafe.ai/llms.txt).
Operação determinística, sem IA/OCR/chave. ReUI scrollspy consultado genericamente,
controles existentes mantidos, sem recursos pagos/instalações. Impeccable aplicado.
Referências: [API PDF](https://pdf-lib.js.org/docs/api/classes/pdfdocument),
[buckets privados Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals).
Jev inicial só sintético: code_change/confiança0,91; complexidade1,32/confiança0,51
incerta, execução A–E decidida pelo Codex; falta essencial0,25.871/119 tokens,
1177,3302 ms, US$0,000036582. Sem dados privados/documentos ou repetição interna.

Conclusão local em2026-10-05 20:35:00 -03:00. Comparação SHA256 contra baseline115:
101 arquivos idênticos,14 alterações no escopo (incluindo registros consolidados),
nenhum ausente; migration32 idêntica. Branch/HEAD preservados, índice Git vazio,
trabalho não commitado. Nenhum cadastro, convite, acesso,
pagamento/repasse, documento real ou configuração remota alterado. Próxima ação:
validação real em Supabase isolado antes de propor aplicação no principal.

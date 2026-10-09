# Configurações — implementação e ativação

Atualização09/10/2026,06:15 -03: [correção GraphQL testada localmente e recusa pré-execução do ajuste global](17-CORRECAO-GRAPHQL-E-GATE-DE-APLICACAO.md).230000 já instalada, não reaplicar.230100 agora preserva a função gerenciada e propõe pre-request global REST/GraphQL,68 wrappers próprios (70 após adendo), mantendo69/71 entradas lógicas e51/57 políticas. Não aplicada após recusa da ferramenta; aprovação específica desse parâmetro pendente, demais autorizações vigentes. HTTP200 GraphQL contém errors de extensão já ausente; nenhuma homologação funcional/fixture. Registros abaixo conservam a fotografia histórica anterior.


Estado: IMPLEMENTAÇÃO LOCAL VERIFICADA. Proposta de backend não aplicada nem homologada no Supabase.
Alvo permitido exclusivamente `xftnkusbyqzyvzrovroj`.

## Fontes identificadas no código

| Necessidade | Fonte existente e uso |
| --- | --- |
| Unidade | `clinicas`; estender colunas existentes, não duplicar cadastro |
| Empresa | `equipe_registros`, tipo empresa; nome/CNPJ cifrados, `equipe_ficha_escopo` protege alcance compartilhado |
| Autorização | `usuarios`, `usuarios_clinicas`, unidade ativa/subdomain Brotas/Ipupiara; novo grant global separado |
| Tema/login | `ThemeProvider`, `clinicBrands`, `Login`; fallback atual preservado |
| Upload | Storage privado e parser `equipeFoto`; nova Edge reencoda PNG, independente de fotos pessoais |
| PDF existente | `financeiroRelatorios`/`FinanceiroRelatorios`; exportação financeira e auditoria existentes |
| Outros documentos | Equipe armazena arquivos administrativos versionados; não reescrever esses uploads |
| Conteúdo clínico | Prontuário existente, sem emissor de receita/atestado/declaração encontrado no levantamento |
| Auditoria | `auditoria`; eventos de rascunho, aplicação, restauração e registro de ativo, sem payload clínico |

## Arquivos e desenho

- `src/pages/Configuracoes.tsx` e CSS: editores, herança, estados e PDF A4.
- `supabase/functions/_shared/configuracoes.ts`: contrato, validação e cópia de snapshot.
- `src/lib/configuracoes.ts`: adapter real, flag de ativação inicialmente falsa;
  sem fallback que simule salvamento. Flag não protege o servidor: RPC/Edge o protegem.
- `src/lib/timbradoPdf.ts`: renderer compartilhado, área útil calculada, tabelas com
  paginação, cabeçalho/rodapé repetidos e PDF demonstrativo marcado. Noto Sans
  incorporada e medidas por estilo correto. Prévia SVG da primeira página compartilha
  fontes/medidas/quebras, com atualização em 500 ms, cancelamento de requisições
  obsoletas e sem emitir PDF. PDF completo/download explícitos; conferência do arquivo
  gerado recolhível e link disponível sem leitor nativo.
- `src/hooks/useMarcaInstitucional.ts`: resolver aplicado por vínculo real, assinatura
  de imagens privadas; cache invalidado após aplicação. Nomes usam identificação
  fixa `subdomain` em vez de depender do nome editável; IDs explícitos continuam prioritários.
- `supabase/migrations/20261008213000_configuracoes_institucionais.sql`:
  colunas oficiais, escopos/rascunhos, versões imutáveis, ativos imutáveis, grant global
  separado, projeção pública, RPCs fechadas e bucket privado. Sem seeds/ativação de Ibitiara.
- Edge `configuracoes`: JWT verificado, identidade obtida por `auth.getUser`, corpo
  limitado, origem permitida, autorização no banco, uploads únicos e validação compartilhada.
- Edge `configuracoes-publicas`: consulta limitada por domínio, saída de campos
  públicos aplicados; GET de ativo somente se referenciado na projeção pública.
  Nunca copia rascunhos para bucket público. Remover referência não apaga arquivo.

Rascunho guarda intenção; aplicação grava os dados oficiais da unidade e a versão
na mesma transação do banco. Locks em ordem geral→unidade; revisão própria, revisão
geral e hash da fonte oficial detectam concorrência. Aplicação geral também compara
as revisões das duas unidades usadas na projeção. Conflito recusa a transação.
Rascunho guarda `rascunho_fonte_revisao`; reconsulta retorna conflito/base oficial
atual quando essa fonte muda. Substituição confirmada dos dados institucionais no
rascunho mantém apresentação/imagens, cria versão sem aplicar. Hash é revalidado
após lock da empresa. Versão aplicada geral e hash da fonte acompanham o snapshot.
Leitura de ativo geral exige conta/vínculo ativo ou concessão global ativa por helper
SECURITY DEFINER com auth.uid. Política restritiva impede anon em `clinicas` e exige
RLS existente; inventário conectado de ACLs/políticas/views/RPCs legadas é obrigatório.
Uploads anteriores à confirmação são privados e podem ficar órfãos se houver falha;
não são publicados nem removidos automaticamente. Não repetir escrita incerta:
reconsultar versão/estado. Limpeza futura exige inventário e revisão próprios.

Variação por tipo resolve: padrão embutido → campos gerais → variação geral do
tipo → campos da unidade → variação da unidade. Dados jurídicos nunca entram
nessa herança. Logo principal serve como alternativa da impressão/login/compacta
somente quando não há escolha explícita nesses campos; vazio explícito suprime
essa alternativa. Respostas antigas de consulta/CEP não substituem o contexto novo.
Resposta HTTP 200 sem configuração válida e revisão esperada não confirma salvamento.

Empresa já vinculada pode ser mantida pelo proprietário da unidade para editar
apresentação, sem alterar o registro compartilhado. Selecionar outra empresa exige
o alcance completo da Equipe. Razão social/CNPJ vinculados são sempre somente leitura.

## Integração efetiva preparada

Relatório financeiro por unidade passa a consumir o timbrado aplicado **quando o
backend for habilitado**. Coleta, cálculos oficiais, formatação dos valores e auditoria
de exportação permanecem. Relatório consolidado conserva exportador existente:
não atribuir arbitrariamente CNPJ/endereço de uma unidade ao conjunto.
Isso é uma limitação explícita; uma composição geral para consolidado exige contrato
próprio, sem identidade jurídica copiada. XLSX não alterado.

Arquivos antigos da Equipe e PDFs financeiros já baixados não são regenerados.
O contrato `criarSnapshot` copia identidade/apresentação/ativos; um emissor futuro
deve persistir snapshot junto ao PDF efetivamente emitido e validar os campos
obrigatórios de emissor/autor antes de gerar. O financeiro atual é exportação sob
demanda; não existe repositório de documentos clínicos emitidos para integrar.
Laboratório pode entregar sua instituição própria ao mesmo renderer. Nenhum
cadastro laboratorial ou emissão clínica foi criado.

## Ativação futura — fora desta execução

Roteiro atual com operações exatas/impactos e contas necessárias:
[homologação conectada](11-ROTEIRO-HOMOLOGACAO-CONFIGURACOES.md).
Edge privada recebeu guarda de primeiro acesso da sessão simultânea de acesso direto.
Requer `acesso_direto_exigir_sessao` e cobertura de tabelas/RPCs novas pelo pacote
de proteções separado. Não misturar migrações ou remover a guarda para contornar
dependência pendente. Inventário de proteções deve ser posterior à criação dos
objetos de Configurações, ou receber adendo específico revisado se já aplicado.

1. Revisar dependências/objetos reais pelo canal autorizado e confirmar alvo.
   Preflight RO: `supabase/tests/configuracoes_preflight.sql`. Não aplicar a proposta
   só por constar deste documento; grant global exige decisão específica do titular.
2. Homologar migration e Edge em ambiente autorizado, sem Docker. Inspecionar RLS,
   ACLs e objetos em `information_schema`/`pg_proc`/`pg_policies`; executar
   `supabase/tools/verificar-integridade.sql` e `configuracoes_pos_aplicacao.sql`.
3. Provar com acessos legitimamente autorizados: proprietário A/B, recepção/médico,
   anônimo, sem vínculo, suspenso e grant global ausente/explicitamente concedido.
   Não reativar técnicas encerradas nem criar contas por este documento.
4. Provar persistência entre sessões, concorrência, rascunho privado inacessível
   anonimamente, aplicação/restauração, upload transparente e falhas parciais.
   Verificar empresa compartilhada e omissão de endereço sem fonte empresarial.
5. Somente após esses gates, habilitar flag no frontend, confirmar matriz de papéis,
   revisão de versão/notas e preparar pacote seletivo sem os trabalhos locais alheios.
   Commit/push/publicação precisam de autorização futura concreta.

## Referências consultadas

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
  e [Storage](https://supabase.com/docs/guides/storage/security/access-control).
- [Base UI Tabs](https://base-ui.com/react/components/tabs) e
  [shadcn Tabs](https://ui.shadcn.com/docs/components/base/tabs).
- ReUI: busca gratuita settings/tabs, exemplo c-tabs-6 e API tabs consultados.
  Base UI existente reaproveitado; nenhum componente/dependência instalado.
- [jsPDF](https://parallax.github.io/jsPDF/docs/jsPDF.html),
  [React effects](https://react.dev/reference/react/useEffect) e [ViaCEP](https://viacep.com.br/).
- TypeSafe skill completa e [índice oficial](https://docs.typesafe.ai/llms.txt)
  consultados; recurso determinístico sem IA no produto. Jev apenas triagem sintética.
- ReUI gratuito Collapsible consultado nesta revisão; reaproveitado componente existente.
  [Revisão de fontes/licença/evidências](10-REVISAO-PDF-EXPERIENCIA-BACKEND.md).


## Ordem e isolamento atualizados — 08/10/2026

As orientações anteriores de inventário posterior foram substituídas pelo catálogo
congelado Equipe40: acesso direto230000 → proteção230100 → Configurações213000
(revisada16 funções) → isolamento230050 → adendo explícito6 tabelas/2 RPCs.
[Plano único executável/impactos/recuperação](13-SEQUENCIA-CONJUNTA-E-ISOLAMENTO.md)
e [operações/manifestações](../../../database/proposals/configuracoes/README.md).
Quatro helpers internos únicos somente service_role; dois contextos exatos/TTL,
padrão fictício sem ativos gerais reais, SQL pública aplicada valida atividade/prazo.
Lista pública aceita apenas hostname fixo; mantém dois domínios reais e acrescenta
aliases .invalid sem DNS. Bancada real conectada preparada/compilada, ainda não
exercitada remotamente; não monta outros módulos. Não liberar frontend por build.
Nenhuma etapa SQL remota realizada. Nova implantação/contextos/direto exigem
aprovação adicional; Configurações base/duas Edges conservam autorização existente.

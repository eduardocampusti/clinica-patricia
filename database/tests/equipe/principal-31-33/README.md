# Execução específica no principal — Equipe31–33

Autorização do usuário em06/10/2026, somente xftnkusbyqzyvzrovroj, sem Docker,
outro projeto, reset, db push geral ou frontend deploy. Não é autorização permanente.
Kit LOCAL anterior permanece protegido e não foi reutilizado/destravado.

Execução equipe3133-20261006-2e373461 **ENCERRADA**.28 cenários reais aprovados;
três fichas fictícias mantidas; cinco identidades técnicas bloqueadas com autorização
expressa específica, vínculos/capacidades técnicos inativos e senhas locais descartadas.
Auth ban8760h; vínculos permanecem inativos após esse prazo. Não reativar/reexecutar
automaticamente. Um teste futuro exige nova revisão, autorização e execução própria.

## Controles e arquivos

- controle.mjs: compara URL .env/ref linked antes de cada CLI/SQL, API fixa,
  scratch ignorado, DO_NOT_TRACK; não imprime credenciais/saídas privadas em erros.
- inventario.sql: catálogo somente leitura, sem dados pessoais ou segredos Vault.
- aplicar.mjs: duas migrations32/33 selecionadas, transação/registro individual,
  catálogo/RLS/bucket e integridade oficial9 SELECTs antes/após. Originais preservadas.
- publicar.mjs: só duas funções novas nomeadas, bundler --use-api sem Docker;
  recusa substituição silenciosa e conserva equipe-acessos.
- atualizar-codec.mjs: fontes/configuração v1 recuperadas via API, hashes protegidos,
  deploy específico com autenticação própria. Versões finais das duas Edges:3.
- corrigir-conflitos.mjs: prepara/aplica migration20261006111000; compara MD5 de
  seis corpos SQL aplicados, preserva definições/ACL anteriores, muda só40001→PT409,
  verifica integridade; não atualiza migrations anteriores nem funções de outros módulos.
- identidades.mjs: cria apenas cinco Auth técnicos/UUIDs/contatos fictícios sem e-mails;
  journal em pasta Windows restrita fora da raiz Vite, service_role só em memória;
  RPC normal cria três pessoas com chave de idempotência. Execução encerrada bloqueada.
- real.ts: JWTs reais de cinco perfis, IDs de membros próprios, SELECT/escrita restrita
  aos atores da execução. EQUIPE_CENARIOS reexecuta só casos afetados e conserva resultados.
  Falha parcial prepara reserva/upload próprios pelo serviço; recuperação usa JWT de pessoa.
- encerrar-identidades.mjs: exige28 casos aprovados, prova IDs novos/endereços exatos,
  desativa só vínculos/capacidades próprias e bloqueia Auth técnico; verifica403/login
  negado antes de descartar senhas. Nenhuma exclusão de pessoa, conta, arquivo ou histórico.
- conferir-preservacao.mjs: hashes dos12 conjuntos anteriores, funções/políticas,
  baseline Git e bundles públicos dos dois domínios; retorna1 ao encontrar divergência,
  inclusive o Auth preexistente com mudança de hash documentada no relatório34.
- conferir-auth.mjs: só resumo agregado da divergência Auth, sem identificação/valores;
  não atribui a origem ou reconstrói campos que o snapshot não guardou.
- conferir-auditoria-final.mjs: só eventos próprios, verifica metadados e ausência
  de valores/segredos, imprime contagem/booleanos; não imprime auditoria bruta.

Artefatos em scratch/equipe-principal-3133, ignorados pelo Git, sem publicar no Vite.
Journal de credenciais fora do projeto; ACL restrita Windows, sem alegar uso de DPAPI.
Recuperação disponível: fonte/configuração v1 e definições SQL anteriores; v1 é
conhecidamente falha, não se recomenda rollback automático. Sem backup integral do banco.

## Resultado e limites

[Matriz, defeitos corrigidos, provas reais/UI e roteiro](../../../../docs/modulos/equipe/34-CONSOLIDACAO-HOMOLOGACAO-REAL.md).
Principal aplicado/validado; frontend normal3000 conectado. Domínios preservam
eff05f60. Sem commit/push/merge/frontend deploy, pagamento, convite, acesso real
alterado ou Ibitiara ativada. Não é aprovação pessoal nem homologação de e-mails.

Expiração natural de JWT/prazo de temporários, EXIF em Deno hospedado e logs integrais
permanecem não verificados. Download/hash autenticado confirmado no SDK; evento de
download UI não capturado. Hash de um Auth preexistente divergiu, updated_at avançou
sem novo login identificado; não há snapshot de campos para atribuir origem.

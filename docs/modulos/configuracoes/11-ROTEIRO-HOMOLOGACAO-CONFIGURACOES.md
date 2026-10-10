# Configurações — pacote para homologação e ativação futura

Atualização21:02 -03,08/10/2026: a ordem/fixtures deste roteiro histórico foram
substituídas pelo [plano único Configurações13](13-SEQUENCIA-CONJUNTA-E-ISOLAMENTO.md).
Guarda única no backend completo, proteção congelada ANTES de Configurações,
isolamento/adendo separados; duas fixtures fictícias sem alteração real. Não usar
as instruções antigas de Configurações antes do inventário230100 nem repor dados
oficiais por teste. Autorizações existentes preservadas; nada aplicado remotamente.

Atualização posterior, 08/10/2026, 20:17 -03:00: titular autorizou a execução seletiva
e mínimo de NOVAS contas fictícias sem e-mails/vínculos Brotas/Ipupiara, sem grant
global, reativar técnicas anteriores, aplicar acesso direto ou publicar frontend.
Essa autorização substitui as restrições anteriores deste roteiro no seu escopo.
Preflight conectado pela CLI oficial confirmou RPC de guarda ausente; interrompido
antes de qualquer escrita/conta. Contexto isolado de aplicação pública fictícia
também não existe. [Estado atual, mínimo de contas e operações/recuperação](12-HOMOLOGACAO-CONECTADA-PREFLIGHT.md).
O roteiro abaixo é histórico da preparação; não repetir pedido de autorização já válido.

08/10/2026, 19:58 -03:00. **Roteiro preparado; nenhuma operação abaixo executada.**
Alvo exclusivo `xftnkusbyqzyvzrovroj`. Não usar outro projeto, reaplicar migrations
anteriores, alterar pacientes, Site Geovana, SMTP/DNS/Hostinger, criar/reativar contas
ou ativar Ibitiara como efeito deste documento.

## Contas e dados fictícios necessários

Usar contas **já ativas e autorizadas para homologação**, sem reativar técnicas encerradas.
Os rótulos abaixo não são identidades reais nem contas existentes comprovadas.

| Rótulo | Situação necessária | Prova |
| --- | --- | --- |
| A | Proprietário(a) somente Brotas | Salvar/aplicar/restaurar na própria unidade; negar Ipupiara/geral |
| B | Proprietário(a) somente Ipupiara | Isolamento inverso e configuração própria |
| R | Recepção de uma unidade | Negar edição/upload/restauração mesmo com JWT válido |
| M | Médico de uma unidade | Negar Configurações; PDF financeiro só conforme permissões já existentes |
| S | Conta sem vínculo ativo ou suspensa, apenas para teste de rejeição | Negar RPC/Edge/leitura de imagem; nunca reativar para o teste |
| G, opcional | Proprietário(a) ativo com concessão global **explicitamente aprovada** | Editar geral/herança sem substituir dados jurídicos das unidades |
| Anônimo | Janela privada, sem conta | Somente marca/arquivos públicos aplicados do domínio autorizado |

Se não houver contas adequadas, a homologação correspondente fica pendente até
autorização **separada e específica** para preparar os acessos. Não escolher uma
proprietária com acesso às duas clínicas para tentar comprovar negação entre elas.
Senha temporária/primeiro acesso deve ser homologada pela etapa própria; Configurações
precisa provar que uma sessão pendente/obsoleta é recusada antes de consultar ou alterar dados.
Não provisionar contas por este roteiro.

Dados: duas identidades fictícias A/B distintas, logos PNG transparentes diferentes,
CNPJ de teste válido, endereço extenso, mensagem pública sem informação privada,
uma imagem inválida e arquivos fora dos limites. Empresa fictícia existente vinculada
a uma unidade; empresa compartilhada somente se já existir fixture autorizada.
Sem pacientes/CPF/prontuários. Salvar estado institucional atual para reposição
confirmada ao fim, mantendo auditoria/versões e imagens; não apagar evidência.

## Operações remotas exatas e impactos

Cada escrita exige autorização da próxima etapa. Leitura conectada também não foi
feita nesta execução. Não usar `db push` indiscriminado com as propostas locais de
outros módulos. As operações abaixo são a lista de Configurações, não autorização
para publicar toda a árvore compartilhada.

| Ordem | Operação futura | Impacto e condição |
| --- | --- | --- |
| 1 | Confirmar referência/URL oficial; executar somente `supabase/tests/configuracoes_preflight.sql` e inventário de dependências/permissões/guarda de primeiro acesso | Leitura. Conferir fonte oficial, objetos homônimos, bucket e aplicação real anterior por catálogos, não somente histórico de migrations. Divergência interrompe aplicação para revisão. |
| 2 | Aplicar **uma vez**, seletivamente, `supabase/migrations/20261008213000_configuracoes_institucionais.sql` revisada | Cria 14 colunas de `clinicas`, FK para empresa, cinco tabelas `configuracoes_*`, 11 funções, dois triggers de imutabilidade, três políticas e bucket privado `institucionais` (5 MB PNG/JPEG). Exige RLS existente e bloqueia anon na tabela oficial; revoga acesso direto nas tabelas novas, concede somente leituras/RPCs previstas. Não muda valores institucionais, contas ou cria grant global. DDL pode adquirir locks; planejar janela. |
| 3 | Garantir dependência separada de acesso direto: `acesso_direto_exigir_sessao`, políticas restritivas e proteção das RPCs autenticadas de Configurações | **Não está aplicada nesta revisão.** Se os dois pacotes forem novos e autorizados, Configurações deve existir antes do inventário da proposta separada `20261008230100`; o acesso direto usa sua própria `20261008230000`. Cada pacote preserva sua migração e autorização. Se as proteções já tiverem sido instaladas, preparar adendo específico para objetos novos; não reaplicar a etapa antiga. Sem cobertura comprovada, manter as duas flags false e não ativar Configurações. |
| 4 | Executar `supabase/tests/configuracoes_pos_aplicacao.sql` e `supabase/tools/verificar-integridade.sql`; conferir information_schema/pg_proc/pg_policies/ACLs/triggers/bucket e cobertura de guarda | Leitura. Confirmar os 14 campos, `rascunho_fonte_revisao`, cinco tabelas, 11 funções, ausência de autorização global automática, bucket privado e nenhuma escrita anônima/autenticada direta. Histórico de migrations não basta. Registrar resultados reais; investigação nova de integridade segue a documentação oficial. |
| 5 | Publicar somente Edge Functions `configuracoes` e `configuracoes-publicas` no projeto autorizado, após verificação Deno/imports e dependências | Privada com verify_jwt=true e getUser/guarda/autorizações; pública com verify_jwt=false, somente marca aplicada e imagem autorizada. Usa segredos Supabase do ambiente protegido existente; não copiar chaves para projeto/cliente. Não publicar funções de etapas antigas por consequência. |
| 6 | Homologar com contas/fixtures previamente autorizadas: salvar rascunho/aplicar/restaurar, uploads e eventual concessão global individual | Escritas de teste geram versões/auditoria/objetos e mudam os dados oficiais/apresentação **somente ao aplicar**. Geral afeta herdeiros. Concessão global é opcional e separadamente autorizada; não é necessária para configuração de unidade. Ao fim, repor apresentação oficial por nova versão confirmada, sem excluir histórico/ativos. |
| 7 | Após provas aprovadas, habilitar `BACKEND_CONFIGURACOES_HABILITADO`, conferir pacote seletivo/versão/notas e publicar frontend sob autorização específica | Passa a permitir persistência, usar marca aplicada no login e timbrado no PDF financeiro por unidade. Habilitação/local build não publica. Commit/push/deploy não foram autorizados nesta execução. A flag de acesso direto pertence à etapa própria e só muda após suas provas. |

Se a guarda privada estiver ausente, publicar Configurações privada não a torna
funcional: ela recusa operações. Não resolver retirando a guarda. Inventário amplo
de acesso direto não deve ser aplicado automaticamente como dependência implícita.
Exige revisão/autorizações da etapa responsável e prova conectada.

## Roteiro curto de homologação conectada

1. **Salvar e recarregar:** A salva rascunho com uma mensagem fictícia. Nova sessão
   e F5 devem recuperar mesma revisão/autor/campos. `clinicas` e login público
   permanecem na versão aplicada. Aplicar outra edição deve atualizar cadastro
   oficial, versão e auditoria na mesma transação; confirmar por leitura independente.
2. **Isolamento:** A tenta consultar/salvar/restaurar/enviar em B por requisição direta;
   B repete em A. Esperado 403 e nenhuma alteração/revisão/objeto novo. Repetir com
   R/M/S e anônimo, incluindo RPCs diretas, REST da tabela `clinicas`, views legadas
   e Storage; UI escondida não comprova proteção. Tentativa de escrita não autorizada
   em coluna nova ou acesso a fonte institucional de outra unidade deve ser negada.
3. **Herança/global:** sem grant, A recebe negação para geral. Se G for autorizado,
   aplicar uma escolha geral, personalizar um campo local, testar vazio deliberado,
   false/[] e voltar ao padrão. Identidade jurídica de A/B nunca muda por herança.
4. **Conflitos:** duas sessões com a mesma revisão: só uma salva; outra recebe 409
   e mantém edição. Repetir alteração geral durante edição local. Mudar cadastro
   oficial em fluxo legítimo enquanto existe rascunho, **depois recarregar**: exigir
   `fonteConflitante`, impedir aplicar, confirmar atualização dos dados oficiais no
   rascunho preservando apresentação/imagens; nenhuma aplicação automática.
5. **Uploads/versões:** PNG transparente válido funciona; assinatura falsa, excesso
   de bytes/dimensões e caminho de outra clínica são rejeitados. Imagem removida do
   login não pode ser consultada anonimamente após o cache de até 300 s; arquivo
   histórico privado continua existente. Restauração cria nova revisão, exige aplicar.
6. **Login público:** janela privada em cada domínio permitido mostra só marca
   aplicada correspondente. Rascunho/fotos pessoais/instituição privada não aparecem;
   domínio desconhecido e imagem sem referência aplicada são negados. Falha de
   imagem/serviço mantém login. Testar fluxo de senha/primeiro acesso já preparado,
   sem alterar credenciais de pessoas existentes.
7. **PDF financeiro/encerramento:** emitir relatório fictício por clínica, conferir
   fontes, logo, margens, valores e versões geral/local/fonte. Conferir consolidado
   legado/XLSX conforme escopo existente. Guardar hash do PDF baixado, alterar marca
   e comprovar que o arquivo original não mudou. Não prometer reemissão histórica
   pelo servidor, que ainda não arquiva PDF+snapshot. Repor estado oficial com nova
   versão; registrar ambiente/perfis/clínicas/resultados/limites no checkpoint.

Critério de aceite: evidência conectada desses cenários e objetos íntegros, incluindo
guarda de primeiro acesso. Build, mocks, arquivos SQL preparados ou PDF local não
substituem essas provas. [Revisão local e limites](10-REVISAO-PDF-EXPERIENCIA-BACKEND.md).

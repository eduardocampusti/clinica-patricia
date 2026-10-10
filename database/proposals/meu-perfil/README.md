# Meu perfil — proposta revisada, aplicada e validada

## Estado atual —08/10/2026,16:44-03

Alvo único xftnkusbyqzyvzrovroj. SQL aplicado anteriormente por canal autorizado,
objetos e integridade conferidos. Não reaplicar02-proposta.sql nem a migration
20261008120500, que registra a aplicação manual. Edge ativa em supabase/functions/
meu-perfil, v2/verify_jwt=true, atualização de cache pelo CLI oficial --use-api,
sem Docker.28 testes conectados aprovados com DUAS fictícias já encerradas; nome,
foto e isolamento próprios comprovados, sem escrita em contas reais. Frontend
habilitado localmente; publicação ainda depende do pacote exato e dos dois destinos.
Fonte/contrato abaixo é a proposta histórica preservada; relatório17 guarda
execução, autorização específica CLI/API e limites de interface autenticada.
Nenhum deploy frontend deve aplicar SQL automaticamente.

## Contrato preparado

Fonte única do nome: `public.usuarios.nome_completo`. Adicionar nessa mesma linha
`perfil_foto_path` nullable e `perfil_revisao`. Não copiar nome para Auth metadata
nem criar outra tabela de identidade. Não preencher automaticamente nomes/fotos.
Foto pessoal em bucket privado novo `contas-fotos`; não reutilizar/escrever os
objetos profissionais da Equipe. Depois de habilitar o serviço, foto pessoal nula
significa iniciais, inclusive após remover; não reaparece a foto profissional.

Frontend chama a Edge `meu-perfil`:

- Consulta: JSON `{acao: "consultar"}`, sem ID de pessoa/clínica.
- Salva: multipart `acao=salvar`, `nome`, `revisao`,
  `fotoAcao=manter|substituir|remover` e `foto` só para substituir.
- Resposta confirmada: `{versao:1,usuario_id,nome,foto_caminho,revisao}`.
- A configuração `src/config/perfilConta.ts` foi habilitada após o backend e
  os testes reais; a etapa histórica anterior a mantinha desabilitada. Não consulta uma Edge inexistente nem
  apresenta erro de rede artificial. Quando habilitada, 404 significa serviço
  ausente e mantém leitura anterior. Falhas 401/403/5xx ou
  contrato inválido são erro explícito, não ausência de foto. Salvar fica bloqueado.

Servidor valida JWT com `getUser`, usa exclusivamente seu ID, rejeita campos
extras/duplicados e verifica conta ativa e vínculo existente. Nome/foto não são
fonte de autorização; não toca login, senha, `usuarios_clinicas` nem permissões.
RPC pública de consulta não aceita ID. RPC de gravação é exclusiva service_role;
o frontend nunca recebe essa credencial. Trigger protege as colunas novas contra
UPDATE direto e avança revisão inclusive em edições antigas do nome. Mantém
policies/grants preexistentes; preflight deve avaliar a proteção da tabela inteira.
INSERT de referência/revisão não inicial também é protegido; revisão fica no
intervalo inteiro seguro do contrato JavaScript. Não altera registros existentes
além do valor padrão zero para a coluna nova quando a proposta for aplicada.

Imagem usa o processador já existente da Equipe: JPEG/PNG, 5 MB, 32–4096 px,
8 MP, assinatura, decodificação e reencodificação JPEG sem metadados. Nome do
objeto é `<uid>/<uuid>.jpg`, gerado no servidor, upload sem sobrescrita. Storage
permite ao cliente apenas SELECT da própria foto atual e com vínculo ativo.
Nenhuma policy pública ou permissão de upload/remoção é acrescentada ao cliente.

Nome, referência de foto, revisão e auditoria entram na mesma transação. Upload
falho não muda a referência anterior. Resposta perdida não dispara repetição nem
apaga objetos: reconsulta obrigatória para conferir resultado incerto. Objetos
anteriores/órfãos ficam privados e inacessíveis pela policy de foto atual;
**limpeza e prazo de retenção permanecem dependência operacional**. Nenhum job
de exclusão foi criado. Remover foto é retirar a referência, não apagar fisicamente.
Falhas conhecidas anteriores à gravação retornam `erro_tipo=sem_gravacao`;
exceção não classificada ou resposta de gateway sem esse marcador é incerta.
O frontend mantém o rascunho e só permite retry imediato para 422/503 com marcador;
nunca deduz preservação dos valores de servidor apenas pelo código HTTP.

## Roteiro para revisão e eventual aplicação

1. Autorização específica recebida em08/10/2026. Revisar os arquivos; confirmar `.env`,
   ref e canal conforme `00-BANCO-DE-DADOS-OFICIAL.md` e `04-ISOLAMENTO-DE-SISTEMAS.md`.
   Não usar outro projeto nem executar SQL pelo frontend/conector alternativo.
2. Executar `01-preflight.sql` por leitura no canal autorizado. Comparar objetos,
   RLS, grants, triggers, policies de Storage e auditoria com o estado real. Parar
   se houver bucket/colunas/funções existentes ou policy global permissiva. Não
   sobrescrever configuração existente. Conferir enum UPDATE e clínica nullable
   da auditoria (compatíveis com o baseline local; não prova do servidor atual).
3. Homologar `02-proposta.sql` em ambiente autorizado de teste e incluir testes
   SQL reais: A não consulta/edita B; anon não consulta; authenticated não executa
   RPC interna nem grava ponteiro diretamente; papel/e-mail extras recusados;
   `nome_completo` não muda `usuarios_clinicas`; revisão concorrente; sem vínculo
   ativo recusado; SELECT/upload/update/delete/list de objetos alheios recusados.
   Inspecionar `information_schema` e `pg_proc` e executar
   `supabase/tools/verificar-integridade.sql`. Testes com portas não provam RLS.
4. Conferir a Edge com Deno: copiar `index.ts` e `servico.ts` para futuro diretório
   `supabase/functions/meu-perfil/`. Nos imports que começam por
   `../../../supabase/functions/`, substituir por `../`. Reusar versões e origem
   allowlist existentes; não mudar outras Edge Functions. Manter verificação JWT
   do gateway e verificação de usuário no handler, conforme configuração vigente.
   Não instalar dependências no aplicativo nem alterar variáveis de ambiente.
5. Após revisão/preflight e validação no canal autorizado, aplicar somente esta alteração aditiva no alvo
   confirmado e publicar somente a função nova com os segredos de servidor já
   existentes. Não alterar Auth/configuração/vínculos/contas ou outros buckets.
6. Conferir objetos e guards reais, função inicializada, arquivo privado e as
   operações completas com **conta fictícia autorizada** antes de liberar para o
   titular. Só então alterar `SERVICO_PERFIL_HABILITADO` para true em
   `src/config/perfilConta.ts` e validar o pacote exato do frontend. A configuração
   é disponibilidade, não autorização. A configuração sintética dos testes troca
   esse módulo somente no servidor isolado; não entra no build normal.
   Sem disponibilidade completa da Edge + SQL + bucket, o frontend
   continua com Salvar desabilitado. Não tratar build como backend aplicado.
7. Retenção/limpeza: definir prazo e processo aprovado que nunca exclua foto
   referenciada, inclusive em resultado incerto. Caso de falha: manter serviço
   indisponível, reconsultar; sem rollback destrutivo nem apagar dados de contas.

## Evidências e fontes

`servico.test.ts`: portas sintéticas verificam whitelist, própria conta,
ordem validação/upload/commit, falha, remoção e concorrência. Não executa SQL/RLS.
`tests/login/meu-perfil.spec.ts`: fluxo de UI com backend simulado e dados fictícios.

Documentação oficial consultada em08/10/2026:
[autenticação das Edge Functions](https://supabase.com/docs/guides/functions/auth),
[controle de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control),
[privilégios por coluna](https://supabase.com/docs/guides/database/postgres/column-level-security),
[upload padrão](https://supabase.com/docs/guides/storage/uploads/standard-uploads).
RLS restringe linhas; privilégios de tabela podem prevalecer sobre revogação por
coluna. Por isso a proposta protege colunas novas com trigger e não presume que
o payload restrito do frontend seja autorização de servidor.
# Situação em 08/10/2026,12:20-03:00

A proposta SQL foi aplicada uma única vez no alvo autorizado e confirmada no
catálogo. A fonte ativa está em `supabase/migrations/20261008120500_meu_perfil.sql`;
**não executar novamente `02-proposta.sql` no projeto existente**. O serviço Edge
`meu-perfil` foi publicado pelo editor, com verificação JWT da plataforma ativa e
validação `auth.getUser` no código. As fontes estão em `supabase/functions/meu-perfil`.
Sessões reais das duas novas contas fictícias confirmadas; consultas sem vínculo
recusadas403 e anônimo401. Persistência e isolamento completo aguardam vínculos
temporários, cuja confirmação no momento do ato foi solicitada por exigência da
ferramenta: o papel mínimo disponível também concede acesso a cadastros clínicos.
Frontend normal segue desabilitado; commit/push/deploy Hostinger não iniciados.
O conteúdo abaixo registra a preparação anterior, não a situação viva do serviço.

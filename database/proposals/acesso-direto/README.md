# Pacote local — acesso direto da Equipe

## Aplicação real concluída; homologação parcial e fixtures encerradas — 09/10/2026, 07:16 -03 (America/Bahia)

Estado atual: SQL, sete serviços e hook aplicados; homologação parcial. Três contas e dois contextos encerrados, criação geral/frontend desligados. GraphQL funcional, fluxo direto e homologação privada permanecem pendentes. As fotografias anteriores abaixo são históricas, não autorização pendente do pre-request.
[Execução, falhas corrigidas, provas e operações pendentes](../../../docs/modulos/configuracoes/18-APLICACAO-GUARDA-E-SEQUENCIA-AUTORIZADA.md).


Atualização09/10/2026,06:15 -03: [correção GraphQL testada localmente e recusa pré-execução do ajuste global](../../../docs/modulos/configuracoes/17-CORRECAO-GRAPHQL-E-GATE-DE-APLICACAO.md).230000 já instalada, não reaplicar.230100 agora preserva a função gerenciada e propõe pre-request global REST/GraphQL,68 wrappers próprios (70 após adendo), mantendo69/71 entradas lógicas e51/57 políticas. Não aplicada após recusa da ferramenta; aprovação específica desse parâmetro pendente, demais autorizações vigentes. HTTP200 GraphQL contém errors de extensão já ausente; nenhuma homologação funcional/fixture. Registros abaixo conservam a fotografia histórica anterior.


**Preparado, não aplicado. Alvo exclusivo xftnkusbyqzyvzrovroj.**
[Plano único da sequência conjunta](../../../docs/modulos/configuracoes/13-SEQUENCIA-CONJUNTA-E-ISOLAMENTO.md), preservando a autorização própria de Configurações.
Base de Configurações final:16 funções/três triggers, incluindo proteção da escrita direta; hash do manifesto reconciliado em08/10/2026,21:11-03. Cobertura final57/71 inalterada.
Revisão completa, testes, indisponibilidade/recuperação e roteiro: [Equipe40](../../../docs/modulos/equipe/40-REVISAO-BACKEND-PACOTE-APLICACAO.md).

Arquivos conferíveis: [manifesto SHA-256](manifesto.json), [51 tabelas/69 funções nominais](inventario-revisado.json), [proposta de configuração do hook](auth-hook-proposto.json). O manifesto inclui o fechamento dos imports locais das cinco Edges, interface, API financeira e SQL. Não contém credenciais nem autoriza aplicação.

Operações futuras, nesta ordem, com criação geral/frontend desligados:

1. Ler configuração atual Auth/hook e schemas Data API pelo canal oficial; esses dois itens ainda não foram obtidos. Não sobrescrever hook existente nem ampliar schemas. Conferir fingerprints e cópia recuperável; sem DDL concorrente.
2. Aplicar seletivamente [230000](../../../supabase/migrations/20261008230000_equipe_acesso_direto.sql) → [230100](../../../supabase/migrations/20261008230100_equipe_acesso_direto_protecoes.sql), confirmar objetos e integridade após cada arquivo. A segunda proposta exige o catálogo revisado, preserva RLS/permissões e aborta divergência; não usar db push.
3. Configurações conserva sua autorização própria: base213000 → isolamento230050 → [adendo de proteção das seis tabelas/duas RPCs](../../../supabase/tools/acesso-direto-proteger-configuracoes.sql). As duas migrações desse módulo **não** são autorizadas por este pacote. Ordem diferente pode invalidar o fingerprint de230100. Guardas de Storage existentes cobrem bucket institucional futuro.
4. Publicar quatro serviços revisados (equipe-acessos JWT=true, equipe-recursos false, equipe-fichas false, meu-perfil true) e nova equipe-acesso-direto true, após SQL completo. Flags de criação geral continuam false. API financeira recebe o gate quando seu alvo de publicação estiver identificado/autorizado; sem deploy nesta entrega. Configurações e seu deploy separados.
5. Instalar hook gratuito revisado/composto. Executa para todas as emissões, preserva evento de contas sem operação; indisponibilidade pode afetar login global. Não mudar signup, confirmação global, MFA, força/reautenticação, TTL, SMTP ou signing keys.
6. Homologar somente lista privada dos cinco membros/e-mails de teste/ator aprovado, mantendo habilitado=false e frontend normal=false. Seis contas novas no roteiro completo (cinco diretas + uma de controle Auth normal), três papéis, duas clínicas, sete vínculos cadastrais/login. Sequência conjunta com Configurações soma duas contas/contextos isolados, total8; seus objetos/vínculos são da etapa própria. Zero e-mails na sequência atual: entrega/reenvio continuam não homologados; links de controle sem envio validam somente Auth/aceite/recuperação.
7. Encerrar as seis fixtures, vínculos/sessões, conservar auditoria e voltar flags de serviço/homologação a false. Aprovar evidências antes de autorizar habilitação normal/front-end/publicação.

A aprovação pretendida é dessa aplicação seletiva + homologação restrita, com os impactos globais de políticas/RPCs/hook explícitos. Não autoriza migrações indiscriminadas, alteração de Configurações fora da sua etapa, contas técnicas antigas, mudança de dados clínicos/identidade pública, commit, push ou deploy de frontend. Se leitura mostrar hook anterior/schema adicional não revisado, interromper antes da escrita e apresentar a diferença concreta; não aplicar um substituto presumido.

Resultado local:25/25 regras;8/8 UI dirigida;81/81 duas vezes conjuntamente; PostgreSQL17.11 sintético com nove grupos SQL, recusa integral de catálogo divergente e adendo6/2 idempotente; tipos/build/lint aprovados. Não é homologação Auth/Storage/RLS conectada. Instabilidade original do servidor Vite não teve causa específica comprovada; testes conjuntos aprovados em artefatos compilados por rodada, mesmos limites/sem retries.

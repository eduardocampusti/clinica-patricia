# Pacote conjunto preparado — Configurações

## Aplicação real concluída; homologação parcial e fixtures encerradas — 09/10/2026, 07:16 -03 (America/Bahia)

Estado atual: SQL, sete serviços e hook aplicados; homologação parcial. Três contas e dois contextos encerrados, criação geral/frontend desligados. GraphQL funcional, fluxo direto e homologação privada permanecem pendentes. As fotografias anteriores abaixo são históricas, não autorização pendente do pre-request.
[Execução, falhas corrigidas, provas e operações pendentes](../../../docs/modulos/configuracoes/18-APLICACAO-GUARDA-E-SEQUENCIA-AUTORIZADA.md).


Atualização09/10/2026,06:15 -03: [correção GraphQL testada localmente e recusa pré-execução do ajuste global](../../../docs/modulos/configuracoes/17-CORRECAO-GRAPHQL-E-GATE-DE-APLICACAO.md).230000 já instalada, não reaplicar.230100 agora preserva a função gerenciada e propõe pre-request global REST/GraphQL,68 wrappers próprios (70 após adendo), mantendo69/71 entradas lógicas e51/57 políticas. Não aplicada após recusa da ferramenta; aprovação específica desse parâmetro pendente, demais autorizações vigentes. HTTP200 GraphQL contém errors de extensão já ausente; nenhuma homologação funcional/fixture. Registros abaixo conservam a fotografia histórica anterior.


**Local, não aplicado. Alvo exclusivo xftnkusbyqzyvzrovroj.**

[Plano único, impactos, gates, recuperação e autorização adicional](../../../docs/modulos/configuracoes/13-SEQUENCIA-CONJUNTA-E-ISOLAMENTO.md). Preserva [revisão completa de acesso direto](../../../docs/modulos/equipe/40-REVISAO-BACKEND-PACOTE-APLICACAO.md) e seu manifesto; sem novas contas/contextos remotos nesta etapa.

Ordem seletiva: acesso direto230000 → proteção230100 → Configurações213000 → isolamento230050 → adendo `supabase/tools/acesso-direto-proteger-configuracoes.sql`. Não usar db push; conferir cada objeto/ACL e integridade. Configuração externa atual Auth/hooks/schemas ainda deve ser lida antes da escrita. Flags gerais false.

Propostas operacionais NÃO aplicadas:

- [Dois contextos exatos, prazo24h](20261008_contextos_homologacao.sql). Sem CNPJ/logo/endereço reais/domínios/menu/Ibitiara/contas.
- [Vínculos exclusivos de duas NOVAS contas](20261008_vinculos_homologacao.sql). Gerar UUIDs reais pelo helper local; confirma app_metadata/criação recente/sem ban/perfil ativo/sem vínculos. Não reativa conta encerrada.
- [Encerramento dos dois contextos](20261008_encerrar_contextos.sql). Conta/sessões/vínculos exigem antes os IDs retornados do Auth; preservar auditoria/imagens/versões.
- [Manifesto SHA-256](manifesto.json). SQL, dois serviços/imports, bancada e seleção frontend preparada. Não é release nem autorização; recompilar depois das provas conectadas e selecionar sobre a branch publicada, preservando demais trabalhos.

Bancada local preparada usa Login/Configurações reais, sem mocks/interceptação e sem montar módulos clínicos. Só foi compilada; persistência/Auth/Storage/publicação pública ainda não comprovados remotamente. Os aliases fixos .invalid são dados do mesmo contrato hostname público, não novos domínios nem seletores livres de escopo.

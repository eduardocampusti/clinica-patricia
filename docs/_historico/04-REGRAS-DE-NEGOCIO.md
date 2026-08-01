# 04 — REGRAS DE NEGÓCIO E DECISÕES

> Registro das decisões importantes tomadas durante o planejamento. Consultar antes de implementar qualquer módulo afetado.

## Isolamento entre clínicas (multi-tenant)

- Uma clínica **nunca** vê os dados de outra.
- Garantido no **RLS do banco**, não apenas na interface. A interface (ex: seletor) é só a camada visual; a segurança real está no banco.

## Seletor de clínicas — só para a proprietária

- O seletor que permite alternar entre Brotas / Ipupiara / Ibitiara é **exclusivo do perfil proprietária**.
- **Nunca** aparece para funcionário/médico comum. Para eles, não existe seletor: entram e já estão na sua clínica, ponto.
- **Estado atual (protótipo):** implementada a "Opção A" — seletor com rótulo "Visão proprietária" para deixar claro que é uma tela privilegiada.
- **Evolução futura (Opção B):** adicionar "Visão consolidada" — caixa somado das 3 clínicas juntas. A proprietária poderá ver o total geral ("quanto entrou hoje?") ou filtrar por clínica ("e só em Ipupiara?"). Fica para quando ela pedir.

## Nota fiscal — emissão MANUAL (fora do sistema, na fase inicial)

- A proprietária emite NF acessando o **site da prefeitura**, logando com o CNPJ dela. Processo manual, fora do sistema.
- Motivo de manter fora: cada prefeitura tem seu próprio sistema de NFS-e, sem API padrão nacional. Integração automática exigiria certificado digital, integração por prefeitura, homologação e manutenção constante — projeto à parte, normalmente terceirizado (NFe.io, Focus NFe, PlugNotas).
- **No sistema:** registra pagamento (valor, forma, data, status pago/pendente/atrasado) e um campo opcional "Nº da nota fiscal" (texto livre) para rastreabilidade após emissão manual.
- **Fluxo de caixa** funciona 100% dentro do sistema, sem depender da NF.
- **Fase 2 (futuro):** avaliar serviço terceirizado de emissão automática como diferencial competitivo, se o sistema crescer.

## Módulo financeiro — requisitos

Objetivo: proprietária com o fluxo de caixa "na palma da mão".

| Necessidade | Implicação |
|---|---|
| Ver saldo do dia rapidamente | Dashboard com card de destaque (entrada, saída, saldo), sem cliques |
| Saber quem pagou / quem deve | Vínculo agenda → atendimento → status de pagamento |
| Fechamento por especialidade/profissional | Saber quanto cada médico gerou, não só o total |
| Acesso rápido no celular | Design responsivo desde o início |
| Confiança no número | Auditoria: todo lançamento financeiro com rastro (quem lançou, quando, editou) |

## Filosofia de desenvolvimento (herdada dos outros sistemas do Eduardo)

- Nunca quebrar funcionalidade existente
- Preservar comportamento legado
- Manter tudo auditável
- Sempre avaliar risco e impacto antes de qualquer mudança
- Claude atua como engenheiro sênior: declara risco, impacto e se algo pode quebrar ANTES de sugerir

# Decisões transversais de continuidade

Estado: APROVADO NO ESCOPO DOCUMENTAL. Atualização: 01/10/2026.
Não havia registro geral equivalente identificado. Decisões funcionais existentes nos
mestres dos módulos e na decisão de Ibitiara continuam nessas fontes; não são reescritas aqui.

## MEM-001 — Entrada compartilhada, adaptadores mínimos

- Data: 01/10/2026. Estado: APROVADO pelo pedido de memória compartilhada; implementado localmente.
- Decisão: AGENTS contém regras comuns; CLAUDE importa-o; Antigravity usa AGENTS conforme
  suporte oficial atual, sujeito à confirmação na instalação efetiva.
- Motivo: evitar três cópias divergentes. Sem serviço de memória ou dependências.
- Referências: [regras](../../AGENTS.md), [compatibilidade](COMPATIBILIDADE-AGENTES.md).
- Substituição: nova organização de entrada; não substitui regras funcionais dos módulos.

## MEM-002 — Checkpoint curto e histórico referenciado

- Data: 01/10/2026. Estado: APROVADO pelo mesmo pedido; implementado localmente.
- Decisão: [checkpoint operacional](CHECKPOINT.md) resume retomada; [raiz](../../CHECKPOINT.md)
  mantém histórico; relatórios dos módulos guardam evidências detalhadas.
- Motivo: leitura dirigida sem copiar chat ou manter estados atuais concorrentes.
- Substituição: leitura inicial do checkpoint raiz inteiro deixa de ser obrigatória;
  histórico preservado. Onboarding antigo não é receita vigente nem autorização para Docker.

## MEM-003 — Evidência por escopo e autorização concreta

- Data: 01/10/2026. Estado: APROVADO pelo mesmo pedido; regras documentadas.
- Decisão: separar relato, código, teste local, conectado, publicado e pendente; falha
  relatada reabre cenário. Não ampliar autorização por documentação ou pedi-la novamente sem motivo.
- Motivo: evitar conclusão por build/mock ou transposição de papel/clínica/época.
- Referências: [regras](../../AGENTS.md), [F5 reaberto](../modulos/sistema/10-RESTAURACAO-SESSAO-E-ROTAS.md).
- Substituição: esclarece leitura ampla obrigatória, nova confirmação genérica e módulo
  escolhido por status antigo nas [regras históricas](../../03-REGRAS-AGENTES-IA.md).
  Segurança e decisões funcionais permanecem. Não constitui aprovação de deploy/banco.

## Decisões funcionais existentes — sem duplicação

- [Ibitiara/laboratório](../../DECISAO-IBITIARA-LABORATORIO.md).
- [Fontes por módulo](INDICE.md): mestres funcionais/matrizes aprovados; proposta e revisão
  técnica não são aprovação. Nova decisão deve ter data, motivo, estado e referência;
  se substituir outra, identificar qual e preservar histórico na fonte do módulo.

# 06 — BUGS E PENDÊNCIAS

> O que ficou para depois, decisões em aberto e melhorias planejadas.

## Decisões em aberto (a definir com a proprietária)

- **Perfis de usuário completos** — além de proprietária e médico, definir recepção/secretária e suas permissões.
- **Painel de configurações da clínica** — a proprietária poderá trocar logo/cor pelo próprio sistema, ou isso fica só com a equipe técnica no início? (Simples de construir; decidir se entra no MVP ou fase 2.)
- **Cor semântica extra por tipo de atendimento** — avaliar 1-2 cores para diferenciar consulta / retorno / exame, seguindo o princípio de baixa opacidade.

## Backlog visual (protótipo Claude Design)

- [ ] Variação vs. dia anterior no card de saldo (↑/↓ com %)
- [ ] Botão de ação rápida no topo ("+ Novo agendamento")
- [ ] Explorar mais telas do sistema de referência (Soma Psico) para capturar componentes de agenda/prontuário — só o dashboard foi prototipado até agora

## Evoluções futuras (fase 2)

- **Visão consolidada** (Opção B do seletor) — caixa somado das 3 clínicas.
- **Emissão automática de NF** — via serviço terceirizado (NFe.io/Focus NFe/PlugNotas), se o sistema crescer.

## Pendência de análise visual

- A extração inicial do Soma Psico capturou cores de cards, botões e tipografia, mas **não** trouxe o fundo roxo da sidebar (corrigido manualmente no protótipo depois). Se formos capturar mais telas, atentar para pegar cores de navegação também.

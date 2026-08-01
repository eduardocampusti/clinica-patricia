# 00 — LEIA PRIMEIRO

> Este é o arquivo de entrada do projeto. Leia este primeiro para entender o contexto geral antes dos demais arquivos numerados.

## O que é este projeto

**Clinica Patrícia** é um sistema médico profissional multiespecialidade, desenvolvido para gestão de clínicas. O sistema atende **múltiplas clínicas** pertencentes à mesma proprietária, com caixas, especialidades e dados totalmente independentes entre si.

## Clínicas atendidas (inicialmente 3)

| Clínica | Cidade | Observação |
|---|---|---|
| Clínica Brotas | Brotas de Macaúbas, BA | Unidade principal |
| Clínica Ipupiara | Ipupiara, BA | Mesma proprietária |
| Clínica Ibitiara | Ibitiara, BA | Mesma proprietária |

Cada clínica tem: caixa independente, especialidades independentes, e pode ter identidade visual própria (logo e cores). São administradas pela mesma proprietária.

## Objetivos centrais do sistema

1. **Gestão multiespecialidade** — diferente de um sistema de especialidade única (como o de psicologia que serviu de referência visual), este atende várias especialidades por clínica (Clínica Geral, Psicologia, Pediatria, Cardiologia, Dermatologia, etc.).
2. **Fluxo de caixa "na palma da mão"** — a proprietária precisa ver, rapidamente, o saldo do dia de cada clínica, sem cliques desnecessários. Módulo financeiro é prioridade de negócio.
3. **Segurança de dados médicos** — dado de saúde é classificado como sensível pela LGPD (Art. 5º, II), o que exige rigor máximo em autenticação, controle de acesso e auditoria.

## Perfis de usuário (a detalhar)

- **Proprietária** — vê todas as clínicas, pode alternar entre elas. Único perfil com acesso multi-clínica.
- **Funcionário / médico** — vinculado a UMA clínica só. Nunca vê dados de outra clínica.
- (Outros perfis como recepção/secretária a definir na fase de escopo.)

## Papéis no desenvolvimento

- **Eduardo (arquiteto)** — define regras de negócio, fluxo clínico, prioridades. Toma as decisões.
- **Claude (engenheiro sênior)** — cuida da arquitetura técnica, stack, riscos e implementação. Sempre aponta risco/impacto antes de sugerir mudanças que possam quebrar algo. Entrega prompts prontos para colar no Cursor/Claude Code.

## Método de trabalho

Desenvolvimento **modular**: um módulo por vez, no ciclo construir → testar (funcional + segurança + regressão) → documentar → avançar. Nada de construir tudo de uma vez.

## Origem da referência visual

O design visual foi inspirado no sistema **Soma Psico** (app.somapsico.com), um sistema de psicologia assinado por uma colega da proprietária. A análise foi feita ao vivo, extraindo o CSS computado real da interface (não estimativa). Detalhes no arquivo `01-DESIGN-SYSTEM.md`.

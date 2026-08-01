# 03 — MÓDULOS E ORDEM DE DESENVOLVIMENTO

## Método

Desenvolvimento modular. Cada módulo passa pelo ciclo:
1. Escopo (o que entra / o que fica pra depois)
2. Prompt estruturado (pronto para colar no Cursor/Claude Code)
3. Implementação assistida
4. Teste funcional (fluxo principal)
5. Teste de segurança (RLS/permissões isolam de verdade?)
6. Teste de regressão (não quebrou nada anterior?)
7. Documentação atualizada
8. Avança para o próximo

## Ordem dos módulos

A lógica: o que os outros módulos dependem vem primeiro.

| Ordem | Módulo | Por que nessa posição |
|---|---|---|
| 1 | **Fundação** — Auth, perfis, RBAC, estrutura de banco com RLS, tabela `clinicas` (multi-tenant) | Tudo depende disso. Erro aqui se propaga para todo o resto |
| 2 | **Cadastro de pacientes** (multiespecialidade) | Entidade central do sistema |
| 3 | **Agenda / atendimentos** | Depende de paciente + profissional existirem |
| 4 | **Financeiro / fluxo de caixa** | Prioridade de negócio da proprietária. Pode ser antecipado para logo após o módulo 3 (nasce simples, ganha robustez depois) |
| 5 | **Prontuário** (templates por especialidade) | Depende do atendimento existir para vincular o registro |
| 6 | **Relatórios e dashboards** | Consome dados de todos os anteriores — por último |

> Nota: a ordem original tinha Prontuário antes de Financeiro, mas como o financeiro é prioridade da proprietária, ele foi antecipado. Decisão registrada.

## Diferença crítica: multiespecialidade vs. especialidade única

O sistema de referência (Soma Psico) é de especialidade única (psicologia). Este é multiespecialidade, o que muda a estrutura funcional (não o visual):

| Elemento | Sistema de referência (psicologia) | Clinica Patrícia (multiespecialidade) |
|---|---|---|
| Prontuário | Template único | Templates dinâmicos por especialidade |
| Agenda | 1 tipo de consulta | Múltiplos tipos, durações por especialidade |
| Menu lateral | Enxuto | Precisa escalar sem virar bagunça visual |
| Permissões | Simples | Multiusuário: médico A não vê paciente do médico B |
| Prescrição/documentos | Padrão único | Varia por conselho de classe (CRM, CRP, CRO, etc.) |

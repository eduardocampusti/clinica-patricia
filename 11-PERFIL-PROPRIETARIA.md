# 11 — PERFIL DA PROPRIETÁRIA (mapa completo)

> Mapeamento funcional completo do que compete ao perfil Proprietária: menus,
> telas e regras. Complementa `10-PLANO-DIRETOR.md`. Este é o "mapa", a
> implementação segue o roadmap do arquivo 10, incremental.

## Menu completo (visão geral)

Dashboard · Agenda · Pacientes · Cadastros · **Financeiro** · Relatórios · Configurações

## 1. Fluxo de caixa (tela principal do Financeiro)

| Indicador | Significado |
|---|---|
| Saldo do dia | Entradas menos saídas |
| Entradas | Soma de todas as formas de pagamento recebidas |
| Saídas | Despesas + repasses pagos |
| A receber | Cobranças ainda não pagas |
| Caixa físico esperado | Dinheiro que deveria estar na gaveta |
| Caixa físico contado | Valor contado no fechamento |
| Diferença | Contado menos esperado |

Separar sempre "produção do dia" (serviços realizados) de "recebido do dia" (dinheiro
que efetivamente entrou) — são conceitos diferentes.

## 2. Entradas (formas de pagamento)

Dinheiro (único que compõe a contagem física do caixa), Pix, cartão de débito,
cartão de crédito, transferência bancária, convênio (fase futura/TISS), cortesia
(exige motivo e aprovação — nunca pagamento de R$0 sem registro). Um pagamento
pode ser **dividido** entre formas.

## 3. Saídas

**Despesas**, por categoria: aluguel, energia, água, internet, material de limpeza,
material clínico, manutenção, honorários, impostos, outras. Cada despesa registra
valor, categoria, forma de pagamento, data de vencimento e data de pagamento
(podem divergir).

**Repasses** — ver seção 5.

## 4. Abertura e fechamento de caixa

```
Abrir caixa (valor inicial em dinheiro)
  → Recebimentos ao longo do dia
  → Sangria (retirada) / Suprimento (reforço)
  → Fechamento: contagem física
  → Sistema calcula diferença (esperado vs. contado)
  → Justificativa se houver diferença
```

Caixa fechado é **imutável** — correção posterior é um ajuste vinculado, nunca edição
silenciosa.

## 5. Repasses profissionais

Como a operação é volante (mesmo profissional atende em mais de uma clínica), a
regra de repasse é por profissional, podendo variar por especialidade:

- Percentual sobre o valor do serviço
- Valor fixo por atendimento
- Percentual por especialidade
- Repasse só após o paciente efetivamente pagar

Ela vê, por profissional: quanto gerou, quanto já foi repassado, quanto ainda deve.

## 6. Limite de acesso (regra já formalizada em DEVELOPMENT_RULES.md)

Proprietária = acesso financeiro/administrativo. **NÃO** = acesso automático ao
conteúdo clínico (prontuário). Minimização por necessidade assistencial.

## 7. Configurações

Dados da clínica ativa (nome, CNPJ, logo, cor), convites e permissões de usuários,
especialidades ativas na clínica, regras de repasse por profissional.

## Pré-requisito de implementação

O módulo Financeiro depende da camada Node/Fastify mínima (decisão já registrada em
`10-PLANO-DIRETOR.md`, seção "Ritmo"). Cadastros, Configurações e leitura de dados
podem continuar no padrão direto Supabase+RLS já validado.

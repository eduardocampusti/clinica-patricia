# 10 — PLANO DIRETOR (NORTE DE LONGO PRAZO)

> **COMO USAR ESTE ARQUIVO:** Isto é um MAPA, não uma lista de tarefas.
> Descreve o sistema profissional completo que a Clínica Patrícia pode se tornar.
> **NÃO implementar tudo de uma vez** — o projeto é tocado por 1 pessoa (Eduardo,
> arquiteto, ~6 meses de experiência) com a IA como engenheiro. Tentar fazer tudo
> junto TRAVA o projeto. Consultar este arquivo para tomar decisões alinhadas com o
> longo prazo, mas implementar sempre de forma incremental, um módulo por vez,
> na ordem do roadmap (seção final).

## Origem

Documento de planejamento profissional trazido pelo Eduardo em 01/08/2026, revisado
e endossado pela IA (engenheiro) como direção técnica correta. As decisões marcadas
abaixo como "JÁ DECIDIDO" foram formalizadas nesta sessão.

## Decisões formalizadas nesta sessão (01/08/2026)

1. **CNPJs diferentes, mesma proprietária.** As 3 clínicas são pessoas jurídicas
   separadas. Implicações:
   - Financeiro/caixa/nota fiscal juridicamente independentes por clínica (reforça
     o isolamento por `clinica_id` que já existe).
   - **LGPD: são 3 controladores de dados diferentes.** Um paciente da Brotas NÃO é
     automaticamente o mesmo da Ipupiara. NÃO criar "paciente global" compartilhado
     entre clínicas sem decisão jurídica consciente. O isolamento atual protege isso.
   - A "visão consolidada" da proprietária é conveniência gerencial dela — cada CNPJ
     ainda fecha o seu separadamente.

2. **Ritmo: equilíbrio.** Nem financeiro frágil e rápido, nem fundação enterprise
   completa (que travaria o projeto). Caminho do meio: **camada Node/Fastify MÍNIMA**
   (só o esqueleto: validar identidade + clínica ativa + processar comandos
   financeiros como transações atômicas) ANTES do módulo financeiro — para o
   financeiro nascer certo e não precisar ser refeito, mas sem a robustez enterprise
   completa de uma vez.

3. **Consentimento LGPD — CORREÇÃO PENDENTE (ver arquivo 04 e TODO).** O bloqueio
   atual de "não cadastrar paciente sem consentimento" está juridicamente incorreto:
   atendimento de saúde apoia-se na base legal "tutela da saúde", que NÃO exige
   consentimento. Consentimento é só para finalidades específicas (marketing, uso de
   imagem). Corrigir quando revisitar o módulo Pacientes.

4. **Proprietária NÃO tem acesso clínico automático.** Por princípio de minimização
   (LGPD), ser dona dá acesso financeiro/administrativo, NÃO acesso ao conteúdo de
   prontuários. Acesso assistencial ≠ acesso administrativo.

5. **Modelo real de repasse confirmado com a proprietária (03/08/2026):**
   - Quem recebe o pagamento do paciente é a **recepcionista** (dinheiro — preferência
     —, Pix ou cartão débito/crédito), não o médico.
   - Cada consulta/procedimento tem um **valor cadastrado no perfil do profissional**
     (cadastro exclusivo da proprietária) — funciona como valor **sugerido**, editável
     pela recepção no momento do lançamento (pode haver desconto/variação).
   - Todo lançamento de entrada deve registrar **qual paciente** e **qual profissional**
     — sem isso não há como saber quem repassar depois.
   - **No fim do expediente, a clínica repassa 80% ao médico e fica com 20%** — cálculo
     automático a partir da soma das entradas do período por profissional. Taxa
     modelada como **configurável por profissional** (default 20%), mesmo a
     proprietária tendo dito que hoje é uniforme — é mais barato deixar preparado
     agora do que remodelar depois.
   - O pagamento também deve aparecer no **histórico da ficha do paciente**.
   - **Sequência de implementação decidida** (evita construir Agenda + ajuste
     financeiro ao mesmo tempo):
     1. Vincular paciente + profissional + valor no lançamento de entrada (pequeno,
        reaproveita Pacientes e Profissionais já existentes) — AGORA.
     2. Módulo Agenda completo (calendário, horários, disponibilidade) — módulo
        próprio, dedicado, com o mesmo rigor de teste dos demais — PRÓXIMO GRANDE.
     3. Integração Agenda → Financeiro (atendimento concluído gera a entrada
        automaticamente) — DEPOIS.
   - **Integridade histórica do repasse (complemento técnico, 04/08/2026):** o
     percentual aplicado no fechamento deve ser **gravado no momento do fechamento**
     do repasse — nunca recalculado depois com base no valor "atual" cadastrado no
     perfil do profissional. Se o percentual padrão mudar no futuro, repasses já
     fechados não podem mudar de valor retroativamente (quebra a trilha de auditoria
     já exigida no projeto).
   - **Transação atômica no fechamento (complemento técnico, 04/08/2026):** o cálculo
     do repasse do expediente (soma das entradas do período por profissional,
     aplicação do percentual, geração do valor a pagar) deve ocorrer numa única
     transação — evita expediente fechado sem repasse correspondente registrado.

## Princípios de arquitetura (do plano diretor)

- **Monólito modular** (não microserviços): um sistema, dividido internamente em
  módulos com tabelas e responsabilidades claras.
- **Frontend lê direto do Supabase (RLS)** para consultas simples; **comandos
  clínicos e financeiros críticos passam por API no servidor** (Fastify), com
  transações atômicas, validação e auditoria. Chaves privilegiadas nunca no navegador.
- **Um módulo não altera tabelas internas de outro** — comunicação por comandos e
  eventos de domínio (ex.: `outbox_events` na mesma transação).
- **Separação comando/consulta:** telas usam views rápidas; comandos são endpoints
  explícitos e restritos (nunca "salvar tudo" com objeto inteiro do cliente).
- **RBAC por capacidades** (não 3 perfis fixos): usuário recebe papéis, papéis reúnem
  capacidades (ex.: `cash.close`, `clinical_record.sign`). Validado também no banco.

## Contextos de negócio (organização lógica do banco)

`iam` (acesso), `core` (clínicas/serviços), `patients`, `scheduling` (agenda),
`clinical` (atendimento/prontuário), `billing` (financeiro), `communications`,
`audit`, `reporting`. Podem ser schemas físicos ou módulos lógicos.

## Financeiro — princípios (quando for construído)

- **Livro de movimentos imutável** (dupla entrada interna). Interface simples,
  motor rigoroso.
- Distinguir: cobrança, pagamento, caixa físico, conta bancária, cartão a receber,
  despesa, repasse, estorno.
- **Nunca UPDATE/DELETE em registro financeiro publicado** — correção por estorno.
- **Sessão de caixa** (abertura → recebimentos → sangrias → contagem → diferença →
  aprovação); valor esperado calculado só no servidor.
- **Idempotência** em comandos (evita pagamento duplicado por clique duplo).
- Valores em `numeric` ou centavos inteiros, nunca `float`.
- Nota fiscal manual na fase 1 (só registra número/status; não emite).
- Repasse profissional com regras versionadas (nunca recalcular período antigo com
  regra nova).

## Prontuário — princípios (quando for construído)

- Núcleo comum + extensões por especialidade (híbrido: campos estruturados +
  JSONB versionado por template).
- **Atendimento (`encounter`) ≠ documento clínico** — um atendimento gera vários
  documentos (evolução, receita, atestado).
- **Imutável após assinatura** — correção por adendo/retificação vinculada, nunca
  sobrescrita.
- Motor de templates versionado (a versão é fixada no documento ao iniciar o
  atendimento; mudar o template não altera prontuários antigos).
- **Psicologia é caso especial** — acesso mais restrito (recepção não vê evolução;
  outros profissionais não têm acesso automático). Validar com responsável técnico.

## Segurança / LGPD — princípios

- Bases legais registradas por finalidade (não um booleano só).
- "Direito ao esquecimento" ≠ apagar prontuário — prazo legal de guarda (referência:
  20 anos, Lei 13.787/2018). Workflow formal de descarte.
- Auditoria também de LEITURA de dado clínico, não só escrita.
- MFA para perfis sensíveis (proprietária, quem aprova estorno, fecha caixa).
- Backups com teste de restauração comprovado (não só ter backup).
- Ambientes separados (dev/homologação/produção); dev nunca com dados reais de paciente.

## Roadmap (ORDEM DE IMPLEMENTAÇÃO — seguir esta sequência)

| Ordem | Etapa | Critério de "pronto" |
|---|---|---|
| 1 | Fundação de domínio (API Fastify mínima, permissões, subdomínio, testes RLS) | Nenhum comando crítico executável só alterando payload no navegador |
| 2 | Cadastros estruturais (especialidades, profissionais, serviços, preços) | Serviço tem preço, duração, especialidade, regra financeira |
| 3 | Financeiro essencial (caixa, cobrança manual, pagamento, dashboard) | Proprietária vê entrou/saiu/esperado/divergência sem cálculo manual |
| 4 | Agenda e recepção | 2 usuários não ocupam o mesmo horário simultaneamente |
| 5 | Integração agenda-financeiro | Cobrança por serviço no atendimento |
| 6 | Atendimento clínico (prontuário geral + assinatura) | Registro assinado não muda silenciosamente; leitura auditada |
| 7 | Templates por especialidade (geral, psicologia, pediatria, cardio, dermato) | 1 template por vez, validado por profissional |
| 8 | Repasses e despesas | Repasse histórico não muda se a regra atual mudar |
| 9 | Relatórios e LGPD | Indicadores, exportações, solicitações de titulares |
| 10 | Documentos e integrações (assinatura, SNCR, TISS, FHIR, NF automática) | Evolução externa |

## Definição de "pronto" para CADA módulo (não pular)

Funcional · Autorização (acesso permitido E negado) · Isolamento multi-clínica ·
Concorrência (clique duplo) · Auditoria · Segurança (entrada inválida, acesso direto) ·
Responsividade (celular/tablet/desktop) · Acessibilidade · Recuperação de erro ·
Documentação atualizada · Regressão (o que funcionava continua funcionando).

## Decisões que faltam formalizar (com a proprietária / assessoria)

- Paciente pode ser vinculado entre clínicas? (hoje: NÃO, por serem controladores
  diferentes)
- Quando nasce a cobrança? (agenda, check-in ou conclusão)
- Cancelamento tardio gera cobrança?
- Quem pode dar desconto/cortesia? Quem aprova estorno/reabertura de caixa?
- Atendimento só particular, ou haverá convênio (TISS)?
- RPO/RTO aceitáveis (perda de dados / tempo de recuperação).
- Política de retenção por tipo de documento.

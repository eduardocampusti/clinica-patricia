# Padrão de mensagens e confirmações do sistema

**Estado:** comportamento implementado localmente em 28/09/2026, ainda sem publicação.

## Objetivo

Mensagens operacionais usam componentes compartilhados baseados nos componentes `Alert` e `AlertDialog` do shadcn/ui. O padrão não substitui validações junto ao campo e não altera regras de autorização, persistência ou isolamento por clínica.

## Alertas contextuais

- **Sucesso:** verde, exibido somente depois da confirmação da operação. Sucessos simples desaparecem após cerca de seis segundos, pausam enquanto há foco ou interação e podem ser fechados manualmente.
- **Atenção ou pendência:** laranja. Resultados parciais, integrações ainda pendentes e ações que exigem conferência usam este estado; permanecem visíveis quando requerem decisão.
- **Erro:** vermelho. Falhas não apresentam mensagem de sucesso e permanecem visíveis quando o usuário precisa corrigir ou tentar novamente.
- **Informação:** azul, para orientação neutra sem inferir conclusão.

Os alertas aceitam título, descrição, ação opcional e fechamento opcional. Sucessos são anunciados de forma educada; erros urgentes usam anúncio assertivo. Ícone e texto sempre comunicam o estado em conjunto.

## Confirmações

`AlertDialog` é reservado a ações com perda ou impacto relevante, incluindo descartar alterações não salvas, remover foto persistida, inativar registro e corrigir CPF já informado. O foco começa na alternativa segura, permanece contido no diálogo e volta ao controle de origem ao cancelar ou concluir. Salvamentos comuns não recebem confirmação adicional.

As confirmações devem nomear a consequência e usar rótulos específicos, como “Descartar alterações”, “Remover foto” ou “Confirmar correção”. O navegador continua responsável pelo aviso ao tentar sair da página com alterações pendentes quando esse fluxo já existir.

## CPF e contexto clínico

- Antes de incluir ou corrigir CPF, exibir “Confira o CPF com atenção” e o texto aprovado no Documento Funcional de Pacientes.
- Ausência confirmada de CPF continua não bloqueante. Estado carregando, mascarado ou falha de consulta não equivale a ausência.
- Mensagens e confirmações vinculadas a paciente ou clínica devem ser limpas quando o contexto mudar, evitando apresentar resultado da unidade anterior.
- Nenhum alerta deve expor CPF completo, hash, conteúdo criptografado ou dados clínicos desnecessários.

## Aparência e acessibilidade

Os tokens de sucesso, atenção e erro possuem equivalentes claros e escuros em `src/index.css`. Controles mantêm alvo confortável, foco visível, navegação por teclado e adaptação móvel. Animações são breves e desativadas quando `prefers-reduced-motion: reduce` estiver ativo.

## Componentes de referência

- `src/components/ui/alert.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/feedback/FeedbackAlert.tsx`
- `src/components/feedback/ConfirmacaoDialog.tsx`

Novos fluxos devem reutilizar esses componentes em vez de criar mensagens globais ou confirmações visuais próprias.

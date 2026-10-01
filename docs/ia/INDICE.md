# Memória compartilhada — mapa de leitura

Estado: IMPLEMENTADO LOCALMENTE. Entrada comum: [AGENTS.md](../../AGENTS.md).
Comece pelo [checkpoint operacional](CHECKPOINT.md); veja [compatibilidade e conferência](COMPATIBILIDADE-AGENTES.md).
Resultado da conferência por arquivos/Git: [validação de retomada](VALIDACAO-RETOMADA.md).
Esta memória usa arquivos do repositório, não histórico de chat, banco de memória ou serviço novo.

## Responsabilidade de cada fonte

| Assunto | Referência | Papel |
| --- | --- | --- |
| Retomada imediata | [Checkpoint curto](CHECKPOINT.md) | Resumo datado, pendências e próxima ação |
| Continuidade técnica geral | [Checkpoint raiz](../../CHECKPOINT.md) | Histórico técnico, não segundo resumo independente |
| Organização documental | [Leia-me](../00-LEIA-ME-IA.md), [convenções](../01-CONVENCOES-DOCUMENTACAO.md) | Precedência funcional e estrutura dos módulos |
| Decisões transversais | [Registro](DECISOES.md) | Decisão, motivo, estado, referências e substituição |
| Regras de desenvolvimento | [Regras](../../DEVELOPMENT_RULES.md) | Preservação, segurança e processo de integridade |
| Arquitetura | [Arquitetura geral](../../ARCHITECTURE.md), arquitetura no módulo | Geral contém fotografia histórica; conferir evolução no módulo |
| Produto e planejamento | [Produto](../../PRODUCT.md), [contexto](../../PROJECT_CONTEXT.md), [plano diretor](../../10-PLANO-DIRETOR.md) | Mestres aprovados dos módulos prevalecem sobre resumos antigos |
| Banco e isolamento | [Banco oficial](../../00-BANCO-DE-DADOS-OFICIAL.md), [isolamento](../../04-ISOLAMENTO-DE-SISTEMAS.md) | Identificar alvo antes de operação autorizada |
| Decisão Ibitiara | [Decisão canônica](../../DECISAO-IBITIARA-LABORATORIO.md) | Laboratório externo, não terceira clínica operacional |
| Visual/formulários | [Design system](../../01-DESIGN-SYSTEM.md), [cadastros](../padroes/PADRAO-PREENCHIMENTO-CADASTROS-BR.md), [mensagens](../padroes/PADRAO-MENSAGENS-SISTEMA.md) | Padrões pertinentes à tarefa |
| Testes | [Scripts npm](../../package.json), [testes](../../tests), relatórios do módulo | Escolher verificação proporcional; identificar mocks e sessões reais |
| Release/publicação | [Versionamento](../VERSIONAMENTO-E-RELEASES.md), [Hostinger](../../deploy/hostinger/README.md), [relatório 09](../modulos/sistema/09-GITHUB-DOMINIOS-SMTP.md) | Preparação não equivale a implantação |

## Módulos — carregar somente o necessário

- [Sistema](../modulos/sistema/00-README-SISTEMA.md): [checkpoint](../modulos/sistema/08-CHECKPOINT.md), [F5 e rotas](../modulos/sistema/10-RESTAURACAO-SESSAO-E-ROTAS.md).
- [Login](../modulos/login/00-README-LOGIN.md): [mestre](../modulos/login/01-DOCUMENTO-FUNCIONAL-MESTRE.md), [arquitetura](../modulos/login/06-ARQUITETURA-TECNICA.md), [checkpoint](../modulos/login/08-CHECKPOINT.md). Para recuperação/convite posteriores, consultar também Equipe 23 e Sistema 10.
- [Pacientes](../modulos/pacientes/00-README-PACIENTES.md): [checkpoint](../modulos/pacientes/08-CHECKPOINT.md), [confirmações](../modulos/pacientes/13-CONFIRMACOES-VISIVEIS-CADASTRO.md), [CPF legado](../modulos/pacientes/14-CPF-LEGADO-INVALIDO.md), [integridade](../modulos/pacientes/12-DIAGNOSTICO-INTEGRIDADE.md).
- [Equipe](../modulos/equipe/00-README-EQUIPE.md): [checkpoint](../modulos/equipe/08-CHECKPOINT.md), [gestão](../modulos/equipe/20-CORRECOES-GESTAO-DE-ACESSOS.md), [convites/suspensão](../modulos/equipe/21-AJUSTES-FINAIS-CONVITES-E-SUSPENSAO.md), [e-mails](../modulos/equipe/23-EMAILS-INSTITUCIONAIS.md).
- [Financeiro](../modulos/financeiro/00-README-FINANCEIRO.md): [mestre](../modulos/financeiro/01-DOCUMENTO-FUNCIONAL-MESTRE.md), [permissões](../modulos/financeiro/02-MATRIZ-PAPEIS-PERMISSOES.md), [checkpoint](../modulos/financeiro/08-CHECKPOINT.md), [migração frontend](../modulos/financeiro/11-MIGRACAO-FRONTEND.md).

Para módulos ainda sem índice próprio, localizar fontes existentes sem criar documentação vazia.

## Histórico e conflitos conhecidos

[Status de agosto](../../02-STATUS-MODULOS.md), [TODO antigo](../../TODO.md),
[onboarding antigo](../../12-PROMPTS-ONBOARDING-IA.md) e partes da arquitetura geral
contêm estados anteriores: Financeiro não aplicado, deploy planejado, edição ausente.
Não são o estado operacional atual. Preservar histórico; consultar checkpoints recentes e
confirmar Git/ambiente. A [regra antiga de agentes](../../03-REGRAS-AGENTES-IA.md)
recebeu esclarecimento de precedência/leitura dirigida, sem apagamento do histórico.
Conflito funcional ainda não resolvido exige investigação, não escolha silenciosa do código.

## Dois pedidos para usar em qualquer ferramenta

**Retomar o projeto:** leia AGENTS.md e docs/ia/CHECKPOINT.md, confira Git e fontes do
módulo indicado. Resuma estado, evidências, pendências e próxima ação dentro do pedido atual.
Não execute pendência antiga automaticamente sem escopo autorizado.

**Salvar checkpoint para trocar de sessão:** releia docs/ia/CHECKPOINT.md e mudanças
recentes, registre progresso comprovado, limites, branch/HEAD, arquivos pendentes e próxima
ação executável. Atualize fontes afetadas preservando histórico e outros trabalhos.
Não faça commit, publicação ou banco apenas para salvar a memória.

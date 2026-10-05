# Memória compartilhada — mapa de leitura

## Equipe — listagem principal local, 05/10/2026

Busca nome/cargo/profissão normalizada, filtros tipo/vínculo com limpeza, resumos por
id e cards móveis; consulta limitada à clínica ativa. Acesso por clínica sem inferências
ou chamadas por linha.10 cenários novos/8 regressões, build/lint/TypeScript e leitura
real local3000 em Brotas/Ipupiara passaram. Commit seletivo local em preparação,
sem publicação; fichas/formulários/dados reais e demais trabalhos preservados.
[Resultado, contrato, arquivos, testes e limites](../modulos/equipe/30-LISTAGEM-PRINCIPAL.md).

## Cadastros — navegação móvel corrigida localmente, 05/10/2026

Faixa de abas sem transbordamento global, seleção/foco revelados.6 testes direcionados
e TypeScript/lint/build aprovados; envio seletivo autorizado, em preparação.
[Registro e acompanhamento](../modulos/equipe/29-ACABAMENTO-VISUAL-FICHAS-FORMULARIOS.md).

## Equipe — pacote local24–29 consolidado, 05/10/2026

Entrada: [checkpoint de Equipe](../modulos/equipe/08-CHECKPOINT.md).
Revisão, arquivos, evidências e limites: [consolidação no relatório29](../modulos/equipe/29-ACABAMENTO-VISUAL-FICHAS-FORMULARIOS.md).
Preparação seletiva de um commit local; nenhum envio ao GitHub ou publicação autorizado.


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
- [Equipe](../modulos/equipe/00-README-EQUIPE.md): [checkpoint](../modulos/equipe/08-CHECKPOINT.md), [gestão](../modulos/equipe/20-CORRECOES-GESTAO-DE-ACESSOS.md), [convites/suspensão](../modulos/equipe/21-AJUSTES-FINAIS-CONVITES-E-SUSPENSAO.md), [e-mails](../modulos/equipe/23-EMAILS-INSTITUCIONAIS.md), [seletor](../modulos/equipe/24-CORRECAO-SELETOR-PAPEL.md), [erros e compatibilidade](../modulos/equipe/25-TRATAMENTO-ERROS-E-COMPATIBILIDADE.md), [escolha explícita do papel](../modulos/equipe/26-ESCOLHA-EXPLICITA-PAPEL.md), [clareza de conta/acesso](../modulos/equipe/27-CLAREZA-ESTADOS-CONTA-ACESSO.md), [edição e operações permitidas](../modulos/equipe/28-EDICAO-E-OPERACOES-PERMITIDAS.md), [acabamento visual de fichas/formulários](../modulos/equipe/29-ACABAMENTO-VISUAL-FICHAS-FORMULARIOS.md).
- [Financeiro](../modulos/financeiro/00-README-FINANCEIRO.md): [mestre](../modulos/financeiro/01-DOCUMENTO-FUNCIONAL-MESTRE.md), [permissões](../modulos/financeiro/02-MATRIZ-PAPEIS-PERMISSOES.md), [checkpoint](../modulos/financeiro/08-CHECKPOINT.md), [migração frontend](../modulos/financeiro/11-MIGRACAO-FRONTEND.md).

Para módulos ainda sem índice próprio, localizar fontes existentes sem criar documentação vazia.

Financeiro — [Caixa da Recepção: diagnóstico/prévia isolada](../modulos/financeiro/12-CAIXA-RECEPCAO-PREVIA.md)
concluídos em03/10/2026; mapa de contratos e galeria histórica. Pedido posterior de04/10
aprovou o visual e autorizou a [integração local](../modulos/financeiro/13-CAIXA-RECEPCAO-INTEGRACAO-LOCAL.md),
concluída com testes sintéticos e leitura conectada sem operações. Fontes/capturas/limites
no13. Revisão de04/10 concluiu prontidão para publicação controlada do recorte,
com manifesto seletivo e28 verificações dirigidas finais aprovadas; não publicada,
sem banco/permissões/commit/push/deploy.

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

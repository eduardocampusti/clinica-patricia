# Caixa — sincronização Git e matriz das telas

## Conferência de 04/10/2026, 19:15 -03:00 (America/Bahia)

Runtime local, remoto da branch de implantação e dois builds Hostinger correspondem a
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`. Não há alteração funcional local de
`src`, testes da interface ou migrations do Caixa posterior a esse commit.
O encerramento administrativo foi uma intervenção de banco previamente autorizada,
documentada no relatório14; não exigiu outra versão do aplicativo.

A implantação automática está habilitada nas duas clínicas para a branch
`codex/resgate-local-2026-09-26`. A sincronização documental usa exclusivamente
`codex/sincronizacao-caixa-legado-2026-10-04`, criada sobre o commit publicado.
Não mudar configuração Hostinger, fazer merge na branch de implantação ou acionar build
nesta tarefa. O workflow Release Please atende somente `main`; não se cria versão/tag
ou nota de evolução funcional nova para esta sincronização.

| Domínio | Build vigente, completed | Commit do build | Bundle servido, HTTP200 |
| --- | --- | --- | --- |
| clinicabrotas.com.br | 01a106e0-c036-7244-824a-7904af18355b | 2a6e88d09c0a8a51cd73649bf45530c2db6a6923 | /assets/index-Dz5uHHiv.js |
| clinicaipupiara.com.br | 01a106e0-c0af-726b-84bf-7603fa42905f | 2a6e88d09c0a8a51cd73649bf45530c2db6a6923 | /assets/index-RQWYX2d8.js |

Leitura pública nova às19:08 -03:00: selo commit2a6e88d0 e texto Caixa da recepção presentes.
SHA-256 Brotas `d9f325ae802f373200c5eab1a03d4d9a0af234d36c3629bf8b53b74d0e71d939`;
Ipupiara `506c97aef555b00faf4e04fdc14dad3c0eaa3b417b9b7fde15c7cae763436605`.
São os hashes da publicação documentada no relatório13. Não foi lido/exibido conteúdo de
configuração pública do bundle; somente hash e marcadores mínimos registrados.

## Matriz das propostas — desktop e celular

Classificação refere-se à disponibilidade do código da interface publicada, com permissões
e contratos existentes. Não significa que operações financeiras reais foram exercitadas.
Fonte: revisão do runtime no commit servido; 28 verificações sintéticas dirigidas e
evidências responsivas anteriores dos relatórios12/13 reaproveitadas sem repetição.
Celular significa CSS responsivo e testes em360/390/430px, não aparelho físico.

| Tela/fluxo | Desktop | Celular | Alcance e pendência concreta |
| --- | --- | --- | --- |
| Caixa fechado e abertura | Implementada e publicada | Implementada e publicada | Fundo informado manualmente, clínica/valor confirmados, serviço real; não transportar saldo anterior. |
| Caixa aberto | Implementada e publicada | Implementada e publicada | Identificação, ações permitidas, resumo oficial, composição e movimentações. Blocos de cobranças não entram sem fonte. |
| Recebimento | Implementada e publicada | Implementada e publicada | Pela Agenda, dinheiro/Pix/crédito, divisão, centavos, dinheiro entregue/troco separado, validações e resposta incerta. Débito não disponível no contrato atual. |
| Suprimento | Implementada e publicada | Implementada e publicada | Valor/motivo e serviço real; seleção estruturada de origem/projeção da imagem não implementada. |
| Sangria | Implementada e publicada | Implementada e publicada | Solicitação/revisão/efetivação conforme papel; seleção estruturada de destino/projeção da imagem não implementada. |
| Fechamento | Implementada e publicada | Implementada e publicada | Estado real retomável, contagem/divergência/envio/revisão conforme papel. Sem conciliação externa presumida, retirada ou nova abertura automáticas. |
| Histórico e detalhes | Implementada e publicada | Implementada e publicada | Leitura por clínica/sessão, paginação estável, busca limitada à página, legado preservado. Não existe ferramenta de encerramento administrativo na UI. |
| Estornos | Implementada e publicada | Implementada e publicada | Original preservado, saldo elegível, motivo, aprovação/efetivação e outra sessão conforme contrato; sem edição destrutiva. |
| Recibo/reimpressão operacional | Ainda não implementada | Ainda não implementada | Não há serviço de recibo, impressão ou reimpressão; recebimento não anuncia essa disponibilidade. |
| Fiscal | Parcial | Parcial | Solicitações internas/listagem/filtros e fluxo existente publicados; emissão externa, documento vinculado e integrações não configurados/implementados. |
| Recibo e falha de impressão demonstrativos | Implementada somente localmente | Implementada somente localmente | Prévia sintética isolada, fontes já versionadas no commit2a6; não é operação nem parte do pacote servido. |
| A receber hoje / Recebimentos a resolver | Implementada somente localmente | Implementada somente localmente | Demonstração identificada como proposta; integração operacional ainda não implementada por falta de fonte/contrato comprovado. |

As limitações dos seletores de origem/destino, débito, recibos e Fiscal tornam a reprodução
integral das imagens parcial; não mudam a classificação dos fluxos reais básicos disponíveis.
Conferência autenticada anterior: duas clínicas, perfil Recepção, somente leitura, relatório13.
Após A/B, Recepção Brotas viu Caixa fechado/Abrir caixa após F5 (relatório14 seção18).
Nenhuma autenticação nova nem operações nesta sincronização. Persistência financeira real,
aparelho físico, teclado virtual e zoom nativo125%/150% permanecem sem verificação.

## Seleção segura e rastreabilidade do legado

Versionar somente fontes offline do procedimento/laboratório, fixtures sintéticas,
catálogo e consultas genéricas de leitura, referência `10-protecao-escritor-legado.sql.disabled`,
exemplo bloqueado e `registro-aplicacao-seguro.json`. Essa representação identifica
exatamente os dois objetos instalados, sessão/clínica, três campos alterados e evento
administrativo; não é migration automática nem instrução para reaplicação.

Manter locais/ignorados: inventario-confirmado.json, manifesto-revisao.json,
09-RESULTADOS-PREPARO.json e SQL02/03/04/05/06/07/11 gerados com os snapshots privados.
Cópias DPAPI, exportações, dumps, credenciais, capturas/ZIP e builds ficam fora do Git
e da pasta pública. Os originais congelados não são regenerados nesta tarefa.
Documentos históricos podem referenciar esses arquivos privados; o clone não os contém.
Não converter o registro seguro em manifesto de execução.

Fontes locais ajustadas somente para reprodução segura: os dois arquivos de testes
offline e homologacao/executar.mjs usam manifesto-revisao.exemplo.json, sem inventário
real. Os geradores e o SQL da proteção não tiveram suas regras modificadas.
Três verificações históricas de arquivos congelados privados saíram da suíte portável;
preservação desses arquivos é conferida por hash local, não por inclusão no repositório.
Novas verificações:27 contratos offline aprovados; não são os28 testes da interface,
os12 cenários PostgreSQL nem os4 ensaios de recuperação históricos.

README/08/13/14/15 do Financeiro e pacote08 guardam o relato pertinente. Nos checkpoints
compartilhados/índice e diagnóstico de integridade, selecionar exclusivamente trechos
do Caixa/legado, mantendo outras alterações locais fora do commit. Não incluir AGENTS,
documentação de ReUI, Agenda, Equipe, Login, Sistema ou Pacientes não pertinente.

## Manifesto seletivo e verificações da seleção

33 arquivos selecionados no checkout isolado, sobre2a6e88d0:

- Operação: .gitignore,01-catalogo.sql,02-auditoria-historica.sql,08-HOMOLOGACAO-E-APROVACAO.md,
  10-protecao-escritor-legado.sql.disabled,12-canais-escrita-leitura.sql,README.md,
  candidato.mjs/candidato.test.mjs,preparar.mjs/preparo.test.mjs,homologacao-casos.json,
  manifesto-revisao.exemplo.json e registro-aplicacao-seguro.json.
- Subdiretório homologacao: ambiente.ps1,banco.mjs,complementos.mjs,executar.mjs,
  exportar-recorte.mjs,fixture.sql,preparar-banco.mjs,protecao.mjs,
  recuperacao-privada.ps1 e recuperar-recorte.mjs.
- Financeiro: README00,CHECKPOINT08,relatórios13,14,15.
- Somente trechos pertinentes: CHECKPOINT.md,docs/ia/CHECKPOINT.md,docs/ia/INDICE.md,
  docs/modulos/pacientes/12-DIAGNOSTICO-INTEGRIDADE.md (verificação pós-proteção).

Verificados na seleção efetiva:27/27 contratos offline, sintaxe de11 fontes Node e
2 fontes PowerShell,3 JSON válidos,29 referências/dependências disponíveis, referência10
igual ao gerador. git diff --cached --check aprovado. Nenhuma mudança em src/supabase/tests,
dependências, configuração ou pasta pública em relação à publicação. TypeScript/build e
as suítes de publicação não repetidos, pois o runtime servido está byte a byte inalterado.
Os ajustes de portabilidade não foram apresentados como nova homologação PostgreSQL.
62 arquivos preexistentes comparados por hash:51 idênticos;11 com acréscimos/alterações
pertinentes explicitamente revisados. Nenhum arquivo não selecionado modificado.
Hunks de outras tarefas nos quatro documentos compartilhados permanecem apenas no
checkout original; não foram arrastados para a branch. Capturas/ZIP/build/exportações,
manifestações reais e cópias privadas ausentes da seleção.

## Resultado da sincronização

Commit/push ainda em conclusão; registrar abaixo apenas após confirmação do GitHub e
releitura dos dois builds/bundles. Nenhum novo deploy está autorizado.

Links do aplicativo: [Brotas](https://clinicabrotas.com.br/sistema/brotas/financeiro) e
[Ipupiara](https://clinicaipupiara.com.br/sistema/ipupiara/financeiro).
TypeSafe avaliada pela descrição: tarefa determinística, sem necessidade de IA ou chave.

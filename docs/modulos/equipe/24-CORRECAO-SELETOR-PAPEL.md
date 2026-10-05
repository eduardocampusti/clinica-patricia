# Equipe — correção local do seletor de papéis existentes

**Estado:** implementado e testado localmente; conferência autenticada por leitura
concluída na amostra disponível em 04/10/2026, 20:28 -03:00; não publicado.
**Data:** 04/10/2026, 20:10 -03:00 (America/Bahia).
**Autorização:** pedido explícito para corrigir o seletor, testes e documentação;
sem alterações reais de acesso, banco, SQL, convites, commit, push ou deploy.

## Defeito e comportamento resultante

O estado `escopo`, usado para iniciar acesso, também alimentava o seletor de
acessos ativos. Sua inicialização por tipo de membro tinha prioridade sobre o
papel confirmado pelo servidor. Administrativo com `proprietaria` aparecia com
Recepção; profissional de saúde com `recepcao` aparecia com Médico.

A edição agora usa estado separado por clínica, referenciado no papel retornado
pelo serviço para a pessoa consultada. Abrir a ficha ou escolher um papel não
grava. Salvar permanece desabilitado sem alteração válida, inclusive ao retornar
ao original. Papel ausente/desconhecido mostra estado não confirmado e bloqueia
seletor e salvamento, sem pressupor Médico ou Recepção.

O manipulador verifica novamente clínica, acesso ativo, papel confirmado e
alteração válida; bloqueia repetição durante envio e releitura. Confirma também
clínica/status/papel na resposta da alteração; retorno vazio ou incompatível não
anuncia sucesso e bloqueia novas tentativas até reabrir. Após confirmação
da alteração, consulta novamente o serviço: somente essa leitura estabelece a
nova referência. Falha da gravação preserva o papel confirmado e não mostra
sucesso. Falha da releitura após confirmação informa o resultado parcial e
bloqueia novas alterações até reabrir a ficha.

Descarte da edição ao recarregar, validação do membro retornado e invalidação de
respostas antigas impedem reutilizar dados de ficha/contexto anterior. O contrato
de `equipe-acessos` e as regras servidor permanecem inalterados. Padrões e fluxo
de novos convites/concessões continuam separados e preservados.

## Arquivos desta entrega

- `src/pages/cadastros/Equipe.tsx`: edição, validação, bloqueios e releitura.
- `tests/operacional/equipe-papeis.spec.ts`: 13 cenários sintéticos direcionados.
- `src/config/notasEvolucao.json`: correção na categoria não lançada de 0.1.0.
- Este relatório, README, mestre e checkpoint de Equipe; checkpoints operacional
  e raiz. Acréscimos preservam os registros e modificações preexistentes.

## Verificações executadas nesta etapa

- `npm run lint`: saída 0; aviso preexistente de exportação em
  `src/theme/ThemeProvider.tsx`, sem relação com esta correção.
- `npm run build`: verificação das notas, `tsc -b` e Vite aprovados. Avisos de
  importação dinâmica/estática de Supabase e tamanho de chunks preservados;
  não motivaram refatoração fora do escopo.
- Testes Node existentes de Equipe, conviteAuth, emailContext e redirectUnidade:
  18 aprovados; sem chamada real ou escrita em serviços.
- `npm run test:operacional -- equipe-papeis.spec.ts equipe-ficha.spec.ts equipe.spec.ts --output scratch/equipe-papeis-final`:
  63 aprovados (39 novos + 24 de regressão), em desktop1440x1000, tablet820x1180,
  mobile390x844, com serviços sintéticos e bloqueio de destinos externos.
- Casos cobrem papéis diferentes do tipo cadastral, clínicas independentes,
  ausência de alteração, escolha/retorno, sucesso/releitura/F5, falha, falha da
  releitura, retorno sem confirmação, reabertura/troca, papel nulo/desconhecido, carregamento, respostas
  atrasadas e preservação dos estados sem acesso/convite pendente.
- Capturas sintéticas em `scratch/equipe-papeis-final/`; desktop e tablet
  inspecionados visualmente, com seletor e botão bloqueado coerentes. Não versionadas.
- Diff de implementação revisado; backend, migrations e dependências intactos.
- `git diff --check` aprovado. Comparação com baseline inicial confirmou que os
  cinco documentos atualizados conservam integralmente o histórico anterior e
  que nenhuma nota de evolução anterior foi alterada/removida.

Não equivalem a teste de persistência, envio de e-mail ou autorização no banco
real. Proteções da última administradora e autossuspensão não foram alteradas;
nenhuma conta real foi usada para ensaio de escrita.

## Conferência autenticada por leitura — 04/10/2026, 20:28 -03:00

Executada pelo agente no navegador interno, sem aprovação pessoal do usuário
atribuída a esta conferência. Ambiente: aplicação local Vite em
`http://127.0.0.1:3000/sistema/brotas/equipe` e `/sistema/ipupiara/equipe`;
perfil Proprietário(a) observado no menu nas duas clínicas. Nenhuma identificação
pessoal/CPF/credencial registrada. Configuração local confirmou exclusivamente
o project ref `xftnkusbyqzyvzrovroj`, sem exibir chaves.

Módulo servido por HTTP200 contém `papeisEditados`, referência `papelConfirmado`
e validação da confirmação; navegador carregou `/src/main.tsx` e cliente Vite,
sem harness de testes. Botões desabilitados observados na aplicação normal após
atualização da página confirmam o comportamento local carregado.

| Contexto e amostra, sem identificação pessoal | Papel exibido na ficha e valor do seletor | Salvar papel | Conferências realizadas |
|---|---|---|---|
| Brotas: administrativo com conta e acesso nas duas clínicas | Brotas Recepção / `recepcao`; Ipupiara Recepção / `recepcao` | Desabilitado nas duas | Abertura, fechamento/reabertura e atualização completa da página |
| Brotas: outra pessoa, profissional de saúde com acesso Brotas | Médico / `medico` | Desabilitado | Troca da ficha administrativa para profissional; valor anterior Recepção não reaproveitado |
| Ipupiara: mesmo administrativo com acesso nas duas clínicas | Brotas Recepção / `recepcao`; Ipupiara Recepção / `recepcao` | Desabilitado nas duas | Troca de contexto, abertura/reabertura após outra pessoa e atualização completa da página |
| Ipupiara: outro administrativo sem conta vinculada | Sem conta; nenhum seletor de edição de acesso existente | Não apresentado | Abertura e retorno à ficha com acesso, preservando separação dos estados |

Comparação feita entre o dado de acesso que o serviço alimenta na interface
(`clinica.papel`, conforme rastreio do código), texto Papel e valor do seletor
lidos do DOM. Não houve captura independente do corpo JSON de rede: essa leitura
não estava disponível pela API de navegador exposta. Não usar esta conferência
como auditoria independente do banco. Nenhum SQL ou chamada manual ao serviço.

**Resultado:** nenhuma divergência do seletor encontrada na amostra. Não foi
necessária verificação adicional nem repetição da bateria já aprovada. A sessão
permaneceu autorizada após recarga e mudança de clínica. Encerrada a ficha e
retornado o navegador à lista de Equipe em Brotas, sem encerrar a sessão.

**Continuam apenas sintéticos:** administrativo com papel Administradora;
profissional de saúde com papel Recepção; mesma pessoa com papéis distintos por
clínica; papel nulo/desconhecido em acesso ativo; alterações/retorno ao original,
salvamento, repetição, falhas, releitura e respostas atrasadas. Não foram criadas
fichas nem alterados seletores ou acessos reais para preencher esses cenários.
Conferência atual não homologou escrita real nem substituiu os 63 testes UI/18
de regras registrados anteriormente.

Somente este relatório, README e checkpoints de Equipe/operacional/raiz atualizados.
Código e testes preservados. Git: mesma branch e HEAD registrados abaixo, alterações
não commitadas. Nenhum push/merge/deploy, correção continua local; publicações não
reinspecionadas nesta rodada. TypeSafe consultada: validação determinística, sem
IA/API/segredos. Próxima ação depende de pedido próprio; nenhuma outra correção
iniciada. Aprovação expressa do usuário sobre o resultado permanece não registrada.

## Interface e limites — histórico da implementação local

Aplicação local carregada em `http://127.0.0.1:3000/acesso/brotas`; observada tela
de entrada, sem sessão de Administradora disponível. Conferência autenticada real
pendente, sem uso de senha ou transporte de sessão pelo agente. Roteiro: entrar
pessoalmente como Proprietário(a), abrir Cadastros → Equipe & acessos → Ver
cadastro; comparar Papel e seletor por clínica, verificar Salvar papel desabilitado,
fechar/reabrir e usar F5. Não salvar nem alterar acesso real nesta conferência.

Skill typesafe-ai consultada: correção determinística, sem IA/API/chave. ReUI
avaliado sem necessidade de catálogo/instalação adicional nesta entrega; preservados
componentes e layout. Skill Supabase indisponível no catálogo desta sessão;
contrato existente suficiente, sem alteração ou nova integração Supabase.

## Git e continuidade

Branch `codex/resgate-local-2026-09-26`, HEAD
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`; correção não commitada. No início,
31 arquivos modificados e quatro entradas não versionadas, todos preservados.
Nenhum commit/push/merge/deploy: correção não enviada ao GitHub nem publicada.
Não foi feita nova inspeção das publicações nesta implementação; auditoria anterior
identificou os dois domínios no commit2a6e88d0.

Conferência local autenticada por leitura concluída na amostra acima; publicação
exige pedido próprio. Mensagens genéricas, CPF, edição de vínculos e demais pendências
da auditoria permanecem fora desta correção.

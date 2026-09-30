# CPF legado inválido — distinção segura e correção auditada

**Data:** 29/09/2026  
**Projeto Supabase autorizado:** `xftnkusbyqzyvzrovroj` — Clínica Patrícia  
**Estado atual:** implementação e migration aplicadas; correção e persistência pela interface autenticada comprovadas em fixture sintética removida. As negativas de outros perfis permanecem classificadas conforme a evidência SQL simulada da rodada anterior.

## Resultado e causa

O diagnóstico anterior do cadastro real de Ipupiara confirmou, sem revelar o documento, que a descriptografia funciona e o hash corresponde ao valor armazenado, mas os dígitos verificadores do CPF não são válidos. A leitura antiga devolvia o mesmo erro genérico de uma falha técnica; por isso a edição oferecia apenas “Tentar novamente”. Não se inferiu, recalculou ou alterou o CPF real.

Agora `paciente_ler_cpf(uuid,uuid)` confere autorização, clínica, presença do dado e integridade do hash antes de devolver o código específico `PC422` quando **somente** os dígitos do CPF legado são inválidos. O código não devolve o CPF, hash ou ciphertext. A interface permite à proprietária abrir a correção auditada existente sem leitura do número antigo e orienta a conferir o documento. Não são criadas consultas de descriptografia adicionais.

| Situação | Contrato e apresentação |
|---|---|
| CPF não informado | `NULL` confirmado; complemento opcional pelo fluxo próprio |
| CPF informado e válido | leitura individual autorizada na ficha da proprietária |
| Legado inválido confirmado | `PC422`; aviso de revisão e ação “Corrigir CPF”, sem valor antigo |
| Falha de integridade ou técnica | erro distinto; informação indisponível, sem diagnóstico de CPF inválido |
| Acesso não autorizado | `42501`; nenhuma leitura nem correção liberada |

O fluxo de correção continua exigindo novo CPF válido, motivo de 10–500 caracteres, confirmação explícita, unicidade por clínica e revisão atual. A RPC retorna apenas a nova revisão. A ficha preserva os outros campos ainda não salvos; o CPF não entra no salvamento administrativo comum. A regra de CPF **opcional** dos pacientes não mudou.

## Alterações efetivas

- `supabase/migrations/20260929210000_pacientes_cpf_legado_invalido.sql`: substitui somente a função de leitura individual, preservando assinatura, autorização, `SECURITY DEFINER`, `search_path=pg_catalog` e grants restritos. A migration foi aplicada isoladamente e registrada no histórico do projeto autorizado; não foi usado `db push` geral. A RPC `paciente_corrigir_cpf` não foi reescrita.
- `src/lib/pacienteCpfEstado.ts` e `src/components/pacientes/EditarPaciente.tsx`: classificam apenas o código exato `PC422` como legado inválido e oferecem a correção para a proprietária. Erro de rede, descriptografia, hash ou permissão não recebe esse tratamento.
- `src/components/pacientes/CorrigirCpfPaciente.tsx`: aceita a falta do CPF antigo somente nesse caminho e explica a necessidade de conferência documental; os controles anteriores de envio e confirmação permanecem.
- `src/lib/pacienteEdicao.test.ts` e `tests/operacional/pacientes-edicao.spec.ts`: regressão dos estados e do fluxo com respostas interceptadas.
- Documentação de Pacientes, checkpoint mestre e nota de evolução: atualizados sem alterar o estado de Equipe.

## Verificações realmente executadas

1. **Catálogo remoto, somente leitura após aplicação:** função presente com owner `postgres`, `SECURITY DEFINER`, `search_path=pg_catalog`, código `PC422`, `EXECUTE` para `authenticated` e não para `anon`; RPC de correção preservada. O registro no histórico foi conferido, mas não usado como única prova de instalação. `supabase/tools/verificar-integridade.sql` passou após a migration e novamente depois da limpeza.
2. **Validação normal de gravação:** uma tentativa inicial de inserir CPF sintético inválido recebeu `22023` do trigger. Não houve linha parcial. Para reproduzir o estado *legado*, foram criadas duas fixtures identificadas em uma transação curta, com o trigger de validação suspenso apenas dentro dessa transação e reativado antes do `COMMIT`; RLS e auditoria não foram desativadas. O preflight posterior confirmou o trigger ativo.
3. **Leitura pela aplicação com sessão real de proprietária:** em Brotas, a fixture inválida apareceu na lista e na edição. A ficha mostrou “CPF cadastrado precisa de revisão”, não exibiu o número anterior e permitiu abrir “Corrigir CPF”. O diálogo explicou que o CPF anterior não pode ser exibido. Isso comprova leitura e apresentação conectadas, **não** gravação pela interface.
4. **RPC conectada em transação `ROLLBACK`, com papel `authenticated` e identidade SQL simulada:** `PC422` na leitura inválida; `22023` para CPF novo inválido; `23505` para duplicidade; `PT409` para revisão antiga; `42501` para identidade sem vínculo. As negativas não alteraram o cadastro. A correção positiva sintética avançou a revisão, permitiu reler o valor válido, preservou nome e telefone e produziu evento de auditoria com motivo; em seguida a transação foi revertida. **Isso não equivale a uma sessão HTTP real de outro perfil nem comprova persistência após recarga.**
5. **Harness isolado:** `npm.cmd run test:pacientes` passou 25/25. O Playwright dirigido passou 9/9 em desktop, tablet e celular para legado inválido, falha técnica e leitura regular. As respostas desse harness são interceptadas; não representam gravação no Supabase.
6. **Build e lint finais:** `npm.cmd run build`, `npm.cmd run lint` e `git diff --check` terminaram com código 0 após a documentação. Permaneceram somente os avisos preexistentes de chunks/importação mista, Fast Refresh em `ThemeProvider.tsx` e conversão LF/CRLF do Git.

## Limpeza e preservação

As duas fixtures desta execução tinham IDs exatos `72704716-3834-44e1-a0c5-292926616001` e `72704716-3834-44e1-a0c5-292926616002`, ambas em Brotas, com nomes prefixados por `QA CPF`. O catálogo apontou as seis relações com FK para pacientes; o preflight encontrou **zero** referências em Agenda, Atendimentos, entradas de caixa, lista de espera, responsáveis e recebimentos, além de zero fotos no Storage. O trigger de validação estava ativo. A exclusão transacional exigiu os IDs, clínica, nomes, ausência de foto e contagem exata de duas linhas. Verificação posterior: **zero pacientes restantes desses IDs, quatro eventos de auditoria preservados**. O verificador de integridade terminou sem erro e a contagem agregada voltou a três pacientes preexistentes. Nenhum registro real foi editado nem excluído.

## Limite da rodada anterior, preservado como histórico

A ação final “Confirmar correção” **não foi acionada pela interface autenticada** nesta rodada; a confirmação específica para essa gravação por automação da interface não chegou antes da limpeza preventiva das fixtures. Portanto, o fluxo integrado de **gravar pela interface e persistir após recarregar** ainda não está comprovado, apesar da leitura real, do teste SQL conectado e do harness. Para essa conferência futura, criar nova fixture exclusivamente sintética, repetir a correção na sessão autorizada e removê-la por ID exato preservando auditoria. Não usar o paciente real como fixture.

O CPF real de Ipupiara permanece aguardando a conferência do documento pela administradora. A aplicação local atualizada responde em `http://127.0.0.1:3000/acesso/brotas` e `http://127.0.0.1:5173/acesso/brotas`; a sessão autorizada usada na leitura estava na porta 5173. Caminho: **Pacientes → Editar → CPF (opcional) → Corrigir CPF** quando o servidor confirmar o legado inválido. Não se deve corrigir sem o documento do paciente.

## Continuação autorizada — gravação pela interface (29/09/2026)

O responsável autorizou explicitamente completar a lacuna acima no projeto `xftnkusbyqzyvzrovroj`, usando somente uma ficha sintética. A skill `typesafe-ai` e seu índice de documentação foram consultados; Jev não foi chamado porque validade, autorização, persistência e auditoria são verificações determinísticas. Nenhuma migration, código, chave ou cadastro preexistente foi alterado nesta continuação.

1. **Fixture única:** foi criado em Brotas o paciente `QA CPF Legado Interface 20260929`, ID `72704716-3834-44e1-a0c5-292926616003`. O preflight conferiu ID livre, CPF sintético inválido para reproduzir o legado, novo CPF sintético válido e ausência de conflito na clínica. O mesmo procedimento transacional já revisado suspendeu apenas o trigger de validação para a inserção e o reativou **antes do `COMMIT`**. Verificação posterior: uma fixture e trigger ativo (`O`). RLS e auditoria não foram desativadas.
2. **Sessão autenticada real:** em `http://127.0.0.1:5173/acesso/brotas`, a sessão de proprietária abriu **Pacientes → Editar** na ficha `QA`. A interface exibiu “CPF cadastrado precisa de revisão”, não mostrou o número antigo e abriu “Corrigir CPF”. Foram informados somente CPF sintético válido e motivo de teste; a confirmação explícita foi acionada. O retorno retirou o estado de legado inválido e apresentou o campo de CPF atual.
3. **Persistência após recarga:** a ficha foi fechada, a aplicação recarregada e a mesma ficha reaberta. A comparação interna do valor normalizado com o CPF sintético esperado retornou `true`, sem imprimir o número; o aviso de legado inválido permaneceu ausente. A primeira confirmação transitória expirou antes da observação textual, por isso a correção da **mesma fixture** foi repetida com outro CPF sintético válido e livre, sem criar outro paciente. Nessa segunda correção, a interface exibiu o título de sucesso **“CPF atualizado”**; a mensagem tem duração aproximada de seis segundos. O banco confirmou a persistência do valor final, sem expor CPF ou hash no resultado.
4. **Integridade e auditoria:** consulta somente de leitura retornou uma fixture, valor final persistido, demais campos íntegros, **duas** atualizações auditadas pela proprietária com motivo, zero CPF em claro na auditoria e trigger de validação ativo. A checagem incluiu nome, nascimento, telefone, observações, foto e situação ativa. Nenhuma captura com CPF foi produzida.
5. **Limpeza exata:** preflight apontou zero agendamentos, atendimentos, entradas de caixa, lista de espera, responsáveis, recebimentos e fotos para o ID. A exclusão transacional exigiu ID, clínica, nome, hash final e ausência de foto. Depois: **zero** pacientes com esse ID, **quatro** eventos de auditoria preservados (inclusão, duas correções e exclusão) e **três** pacientes totais preexistentes. `supabase/tools/verificar-integridade.sql` terminou sem erro; a lista autenticada de Brotas voltou a exibir dois pacientes e nenhuma linha `QA`.

**Conclusão desta continuação:** a correção de CPF legado inválido pela proprietária está comprovada com gravação real pela aplicação, confirmação visível e persistência após recarga. Os testes locais, build/lint e negativas SQL já aprovados não foram repetidos, pois não houve mudança de código. Essa prova não transforma as identidades SQL simuladas da rodada anterior em sessões HTTP de recepção/médico. O CPF real de Ipupiara segue intocado e só poderá ser corrigido pela administradora após conferência do documento verdadeiro.

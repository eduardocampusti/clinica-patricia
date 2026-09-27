# Edição administrativa — árvore original

Data: 26/09/2026. Implementação local em validação; não publicada.

## Contratos examinados e limite de entrega

- `20260924120000_pacientes_cpf_pendente_rpc.sql` altera `pacientes_update`, restringindo a proprietária/recepção, clínica ativa e contexto quando definido; concede UPDATE apenas em colunas administrativas. CPF e clínica não são editáveis diretamente. Sua aplicação anterior está registrada no checkpoint, não reconferida remotamente nesta tarefa.
- Baseline tem `updated_at`, mas não foi encontrado trigger que assegure sua evolução a cada UPDATE de paciente. Usar apenas o timestamp atual com UPDATE direto permitiria perda de alterações de consumidores que não o atualizam.
- `20260925100000` oferece criação de menor com responsável e consulta do vínculo, não edição atômica de um paciente existente. A tabela de responsáveis não permite INSERT/UPDATE direto por `authenticated`.
- Por esses motivos, a nova edição **não faz UPDATE direto nem usa INSERT/RPC de criação como alternativa**. Chama exclusivamente `paciente_editar_administrativo`. Ausência do contrato, conflito, acesso negado, retorno vazio ou identidade/revisão incompatível não mostram sucesso.
- Não houve consulta ao Supabase, SQL, migration ou mutação de paciente real. A existência remota da nova RPC não foi testada; ela não consta das migrations examinadas. O fluxo não está liberado como edição persistente homologada.

## Interface implementada

Botão visível com lápis no resumo; modal de duas etapas, preenchimento por consulta individual com clínica e ID, somente colunas administrativas. Consulta do responsável deve funcionar antes de habilitar edição. Dados não carregados nunca viram campos vazios gravados. Foto privada continua pelo componente existente; não há upload no editor. CPF não é carregado/descriptografado. Inclusão de CPF e gestão de foto continuam no resumo.

O patch contém somente diferenças na whitelist de sete campos. Endereço e observações são literais: não há parser nem consulta ViaCEP na edição do texto composto. Telefone usa máscara existente, nomes usam normalização portuguesa existente e opção explícita de grafia excepcional; composição e seleção são preservadas. Nascimento ausente permanece desconhecido. Validações se aplicam aos campos alterados, sem exigir correção de dado legado não relacionado.

O primeiro responsável é exigido quando a data indica menor e não há vínculo consultado. Dados digitados nessa seção não são apagados ao alternar nascimento; só são enviados quando necessários. Vínculo existente é somente leitura. O backend proposto não aceita alterar/remover vínculo existente ou incluir segundo responsável. Nenhum contato concede prontuário ou mensagens. Retirar nascimento de menor conhecido é recusado para não contornar a regra.

Cancelar/fechar pede descarte quando há mudanças; erros mantêm dados. A troca de clínica/papel desmonta imediatamente o editor, aborta solicitações quando possível e ignora respostas posteriores. Abort não garante desfazer uma operação já recebida pelo servidor: seu destino permanece o ID/clínica original validado no backend, nunca a nova unidade.

Resposta confirmada substitui a projeção do mesmo ID na lista e busca CPF e recarrega o resumo. Reaplica os filtros/ordenação existentes; se sair dos critérios, encerra seleção e informa isso. Não altera agendamentos nem o fluxo Novo paciente → Agenda.

## Dependência concreta preparada, não aplicada

`supabase/review/pacientes_edicao_administrativa.sql`:

1. Trigger de revisão automática de `updated_at`, monotônico por linha, inclusive em atualizações diretas e RPCs existentes. Nenhum backfill.
2. RPC com UUID do paciente, clínica explícita, revisão esperada, patch JSON restrito e primeiro responsável opcional.
3. Valida sessão, vínculo/papel, clínica ativa, contexto quando existente; bloqueia a linha antes de comparar revisão. Paciente fora da clínica retorna erro genérico.
4. Valida campos alterados e dados do primeiro responsável; insere somente o vínculo, atualiza o mesmo paciente e retorna projeção sem CPF/hash/ciphertext. Toda falha reverte ambos.
5. Mantém grants/policies anteriores; execute da RPC apenas `authenticated`. Não revoga CPF/foto nem instala a trava de menores.

O script é proposta revisável, **não migration pronta para aplicação**: não foi executado nem ensaiado em PostgreSQL. Antes de atribuir versão posterior ao histórico, revisar compatibilidade de triggers, APIs existentes e privilégios no remoto. A seleção visual não define `clinica_ativa()`; quando nula, a autorização continua pelo vínculo na clínica informada. Usuário com duas clínicas tem autorização em ambas, sem misturar IDs.

## Validação de banco ainda necessária

Validação local: 23 testes unitários, 21 testes operacionais dirigidos em três janelas e typecheck/lint aprovados com saída 0. Na suíte ampla, 86/87 passaram (saída 1); o cenário preexistente de Endereço excedeu o prazo após navegação da página. A repetição isolada passou 1/1 com saída 0 sem alteração do teste. Não equivale a execução integral aprovada. Todos os sucessos de UPDATE e negativas de RPC destes testes são respostas simuladas, não comprovação de execução SQL/autorização remota.

Em tarefa autorizada, ensaiar transacionalmente com ROLLBACK: proprietária e recepção aceitas; médico, anon, clínica inativa e vínculo único cruzado negados; contexto divergente negado; campos fora da whitelist rejeitados; mesmo CPF entre clínicas preservado; adulto, nascimento ausente, aniversário de 18 anos, menor com vínculo, primeiro vínculo atômico e rollback de falha; retorno exato sem CPF; CPF/foto/vínculos/imutáveis intactos. Em duas conexões, comprovar serialização e conflito, inclusive UPDATE de consumidor antigo. Separadamente, homologar sessões autenticadas sintéticas próprias — respostas de rede simuladas não comprovam RLS nem Storage.

Ordem segura futura: revisão/ensaio da proposta → conferir histórico e consumidores → instalar apenas contrato revisado, com autorização específica → homologar sem dados reais → disponibilizar frontend compatível. A trava `20260925130000` permanece inalterada, não aplicada e fora desta aprovação. Avaliar sua implantação em etapa própria; não acoplá-la à edição. Frontend antigo permanece compatível com o trigger proposto, sujeito a ensaio. Não confundir build local com release.

## Prévia e arquivos

URL única recomendada: `http://127.0.0.1:4197/acesso/brotas`. Processo Node PID 2852 serve Vite da árvore original com `--port 4197 --strictPort`. A porta 4196 é Node PID 35928; linha de comando indisponível, mas o módulo HTTP servido contém a origem da mesma árvore e a nova importação de edição. Nenhum servidor foi encerrado ou iniciado.

Código: `src/pages/Pacientes.tsx`, `src/components/pacientes/EditarPaciente.tsx`, `editar-paciente.css`, `src/lib/pacienteEdicao.ts`. Testes: `src/lib/pacienteEdicao.test.ts`, `tests/operacional/pacientes-edicao.spec.ts`, inclusão no comando `test:pacientes` de `package.json`. Documentação: este arquivo, README, Documento Funcional, checkpoint e notas não lançadas. Capturas sintéticas em `scratch/pacientes-edicao-20260926/`, não candidatas a commit. Nenhuma PR/branch/worktree de integração foi alterada.

Build final e `git diff --check` passaram com saída 0. Permanecem avisos existentes de Fast Refresh, chunks grandes/importação mista e LF/CRLF; não houve publicação de artefato ou release.

# Clínica Patrícia — instruções compartilhadas para agentes

Responda em português claro. Execute o pedido autorizado, sem ampliar seu escopo.
Preserve instruções globais/locais aplicáveis; não contorne controles da ferramenta.
Compatibilidade entre ferramentas: [guia](docs/ia/COMPATIBILIDADE-AGENTES.md).

## Iniciar ou retomar

1. Leia as instruções aplicáveis, inclusive overrides do diretório de trabalho.
2. Leia [checkpoint operacional](docs/ia/CHECKPOINT.md) e [índice](docs/ia/INDICE.md).
3. Siga a leitura obrigatória por módulo abaixo. Antes de implementar, leia também
   [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md); use o índice para referências pertinentes,
   sem exigir toda a documentação em cada tarefa.
4. Confira `git status --short`, branch, HEAD, diff e arquivos envolvidos. Preserve
   alterações existentes; releia mudanças de outra sessão antes de editar.
5. Compare pedido mais recente, decisões aprovadas e pendências. Informe entendimento,
   próxima ação, risco, impacto e reversibilidade antes de mudar.

Checkpoint é registro datado, não prova viva do ambiente. Investigue divergências entre
documentação, código e comportamento; não altere regra de negócio para coincidir com código.
Pedido posterior explícito pode substituir instrução histórica dentro de seu escopo.
Não peça novamente autorização já válida nem a transforme em autorização permanente.

## Memória, evidência e encerramento

- [Checkpoint operacional](docs/ia/CHECKPOINT.md) é a entrada curta; [checkpoint raiz](CHECKPOINT.md)
  conserva histórico técnico; relatórios dos módulos guardam detalhes. Atualize os registros
  afetados juntos, sem fontes independentes conflitantes. [Decisões](docs/ia/DECISOES.md)
  registra organização transversal, não duplica regras funcionais dos módulos.
- Distinga **informado pelo usuário**, **observado no código**, **teste local**,
  **verificação conectada**, **publicado** e **pendente de confirmação**. Registre data,
  ambiente, escopo, resultado, limitações e, quando pertinente, papel e clínica.
- Build não comprova produção; mocks não comprovam persistência; migration preparada
  não significa aplicada; commit não significa implantado. Proprietária não comprova
  Recepção; uma clínica não comprova outra.
- Falha relatada após correção reabre cenário até evidência pertinente. Reprodução
  sintética diferente do relato não confirma causa do evento real.
- Atualize checkpoint após etapa relevante, decisão/bloqueio, antes de troca planejada
  de sessão e ao encerrar. Releia-o e confira mudanças recentes para preservar outros trabalhos.
  Registre próxima ação executável e autorização específica necessária. Não prometa
  autosave em interrupção abrupta; registre progresso também durante tarefas longas.
- Não registrar senhas, tokens, chaves, CPF, prontuários ou dados identificáveis de pacientes
  na memória. Referências internas devem ser relativas. Preserve auditoria e outros sistemas,
  incluindo Site Geovana. Não instalar serviços de memória/dependências para continuidade.
- Avalie typesafe-ai pela descrição; leia integralmente se relevante ou explicitamente
  solicitada. Não force IA para tarefas determinísticas; nunca solicite/exponha
  TYPESAFE_API_KEY nem a inclua em frontend/arquivos versionados.
- Antes de banco, confirme alvo/ambiente conforme [isolamento](04-ISOLAMENTO-DE-SISTEMAS.md)
  e [banco oficial](00-BANCO-DE-DADOS-OFICIAL.md), dentro de autorização concreta.

## Regras permanentes preservadas

## Documentação obrigatória por módulo

Sempre que um módulo da Clínica Patrícia for discutido, revisado ou evoluído:

1. Antes de implementar, localizar e ler:
   - `docs\00-LEIA-ME-IA.md`
   - `docs\01-CONVENCOES-DOCUMENTACAO.md`
   - `docs\modulos\<modulo>\00-README-<MODULO>.md`, se existir.
   - `docs\padroes\PADRAO-PREENCHIMENTO-CADASTROS-BR.md`, quando a tarefa envolver qualquer cadastro ou formulário de pessoa/entidade.
2. Toda decisão funcional aprovada deve ser documentada em:
   `docs\modulos\<modulo>\`
3. Usar, quando aplicável, esta estrutura:
   - `00-README-<MODULO>.md`
   - `01-DOCUMENTO-FUNCIONAL-MESTRE.md`
   - `02-MATRIZ-PAPEIS-PERMISSOES.md`
   - `03-AUDITORIA-ESTADO-ATUAL.md`
   - `04-FLUXOS-OPERACIONAIS.md`
   - `05-MODELO-DOMINIO.md`
   - `06-ARQUITETURA-TECNICA.md`
   - `07-PLANO-IMPLEMENTACAO.md`
   - `08-CHECKPOINT.md`
   - `09-*.md` a `11-*.md` — documentos específicos do módulo (auditorias
     evolutivas, revisões, checkpoints controlados).
   - `12-DIAGNOSTICO-INTEGRIDADE.md` — histórico de investigações de
     integridade (aplicável ao módulo Pacientes; replicar em outros
     módulos conforme necessidade).
4. Não criar documentos vazios ou inventar conteúdo para etapas ainda não aprovadas.
5. Diferenciar sempre:
   - comportamento desejado/aprovado;
   - estado técnico atual;
   - pendências;
   - histórico.
6. O Documento Funcional Mestre e as decisões aprovadas são fonte de verdade para o comportamento futuro.
7. Auditorias técnicas descrevem o estado atual e não substituem requisitos aprovados.
8. Sempre que uma nova decisão alterar um módulo:
   - atualizar o documento funcional correspondente;
   - atualizar o README do módulo;
   - atualizar o CHECKPOINT quando houver execução real;
   - preservar histórico relevante.
9. Nenhuma documentação, sozinha, autoriza:
   - migration;
   - alteração de banco;
   - alteração de frontend;
   - alteração de backend;
   - mudança de arquitetura;
   - commit de implementação.
10. Antes de qualquer implementação relevante, verificar se a documentação do módulo está sincronizada.
11. Ao terminar uma tarefa em um módulo, informar se a documentação foi atualizada e quais arquivos foram alterados.
12. Migrations e alterações de esquema exigem, além dos itens acima:
    - Confirmar objetos criados via `information_schema` / `pg_proc` — não usar
      `supabase_migrations.schema_migrations` como prova de aplicação completa.
    - Rodar `supabase\tools\verificar-integridade.sql` após cada mudança.
    - Registrar toda investigação nova de integridade em
      `docs\modulos\pacientes\12-DIAGNOSTICO-INTEGRIDADE.md` (histórico contínuo).
    - Ver processo completo em `DEVELOPMENT_RULES.md` (seção "Integridade do banco").

## Notas de evolução

Toda alteração relevante para quem usa o sistema deve acompanhar um resumo curto, em português e baseado no comportamento implementado, em `src/config/notasEvolucao.json`. Antes de uma release, vincular as notas à versão efetiva e conferir o processo em `docs/VERSIONAMENTO-E-RELEASES.md`. Não apresentar trabalho planejado como entregue.

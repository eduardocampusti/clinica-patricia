# Etapa32 — fotos da equipe e dados para recebimento

Consolidação conectada em06/10/2026: [resultado31–33, versões, limites e roteiro34](34-CONSOLIDACAO-HOMOLOGACAO-REAL.md).
Principal autorizado:32/33 e corretiva aplicadas, Edges v3,28 testes reais aprovados;
UI normal Brotas/Ipupiara com foto salva, dados confirmados e F5. Domínios preservam
frontend anterior eff05f60; cinco contas técnicas encerradas, três fichas mantidas.
Limites de Auth, download UI e demais cenários estão no34. Histórico datado abaixo.


Registro local de 05/10/2026, America/Bahia (-03:00). Preparação autorizada pelo
pedido desta etapa; **nenhuma aplicação no Supabase principal e nenhuma publicação**.
Referência Git: `codex/resgate-local-2026-09-26`, HEAD
`eff05f60e07c4042bbb931d1c14d19432612d01d`. Etapa31 e outros trabalhos continuam locais.

## Resultado e ambientes

Frontend, serviços, Edge e migration aditiva implementados localmente. Foto e
recebimento possuem salvamentos próprios; não salvam contatos, vínculos ou acessos.
Não alteram valores, percentuais, pagamentos ou históricos de repasses.

| Ambiente / evidência | Situação |
| --- | --- |
| Windows, TypeScript frontend, lint e build | Verificações locais aprovadas; avisos preexistentes de ReUI/refresh e tamanho/importações do build |
| Edge `equipe-recursos` | Código preparado e tipos verificados com TypeScript e declarações locais; não executada em Deno/Supabase |
| Codec ImageScript1.3.0 real, no Node local | JPEG/PNG, dimensões, regravação e oito orientações EXIF verificadas, inclusive os quatro cantos da imagem |
| Browser sintético4191 / Chrome desktop | Fluxos e regressões aprovados; respostas e persistência em memória simuladas |
| Demonstração4192 / navegador do Codex | Ficha fictícia, seleção/prévia/Salvar foto, avatar e PIX fictício/Salvar/reabertura mascarada observados pelo agente |
| Supabase/Storage isolado | Indisponível: portas locais54321/54322/54323 sem serviço; Docker sem daemon acessível; nenhum destino isolado confirmado |
| Principal `xftnkusbyqzyvzrovroj` | Nenhum SQL, bucket, função ou dado alterado; novos contratos não aplicados |
| Domínios publicados | Não alterados nem usados como prova da etapa32 |

**Persistência real, execução da Edge, criptografia/Vault, auditoria e RLS/Storage
em execução permanecem NÃO VERIFICADAS.** Os contratos preparados e as negativas
sintéticas não constituem homologação de segurança do banco. Não há aprovação
pessoal do usuário atribuída, homologação de e-mails ou escrita em dados reais.

## Identidades e fonte dos dados

- Foto: `equipe_membros.id`, identidade canônica do membro, com um único objeto
  confirmado em `equipe_fotos`. Não depende de `usuarios`/Auth nem duplica pessoa por
  clínica. Referência confirmada/revisão separadas da revisão cadastral.
- Recebimento: chave composta `profissional_id + clinica_id` em
  `profissionais_recebimento`. A Edge localiza o profissional pelo membro; só aceita
  tipo `profissional_saude`, profissional ativo e vínculo ativo na clínica.
- A investigação de Financeiro/repasses encontrou meio de pagamento e referências
  de operações, sem cadastro equivalente de chave/conta/favorecido. A configuração
  nova não substitui esses registros e não modifica snapshots/históricos.
- Futura leitura de pagamento deve resolver profissional/clínica em serviço
  autorizado e preservar o snapshot do pagamento. Não há integração de pagamento
  ou nova permissão implementada nesta etapa.

## Foto e arquivos temporários

Ficha existente: Adicionar/Substituir → prévia → Salvar foto ou Cancelar foto;
remoção exige confirmação. Novo membro orienta salvar o cadastro antes de adicionar
foto na ficha. Ausência/erro usa iniciais, sem importar imagem fictícia em registro real.

JPEG/PNG raster, até5MiB, dimensões de32 a4096px e até8MP. SVG, APNG, assinatura falsa,
MIME incompatível e conteúdo não decodificável são recusados. O servidor decodifica,
corrige EXIF por mapeamento exato dos pixels, limita o maior lado a1024px preservando
proporção e regrava JPEG85. Imagens cuja redução deixa lado menor que32px são
recusadas. A imagem nova não conserva EXIF/GPS/metadados da entrada.

Bucket preparado `equipe-fotos` privado e separado de pacientes. Cliente não recebe
permissão de upload/remoção direta. A Edge autentica o JWT com `getUser`, autoriza o
membro/clínica no servidor, gera caminho único e só então usa o cliente de serviço.
Um limite de corpo também protege requisições sem Content-Length.

O arquivo anterior continua confirmado até a transação de troca. Após confirmação,
o anterior só é removido com prova de não referência e prefixo do membro correto.
Recusa transacional conhecida permite limpar a candidata; timeout/resultado incerto
conserva a candidata, pois uma confirmação ainda pode estar em trânsito.

Candidatas só podem ser confirmadas até15min da criação. Na próxima operação de
foto autorizada, limpeza limitada a50 temporárias não referenciadas com mais de30min;
a prova usa o mesmo bloqueio do membro que a confirmação. Assim, uma confirmação
tardia não pode adotar um objeto expirado após a prova de limpeza. Falha de limpeza
informa pendência sem declarar a foto falhada nem repetir a gravação. Sem operação
posterior, temporárias podem permanecer privadas; não há cron/tarefa instalada.
Este comportamento está preparado e precisa de validação concorrente no Storage real isolado.

Leitura coletiva `equipe_fotos_listar`: uma consulta de metadados por contexto, sem
consulta administrativa por linha. Imagens confirmadas são baixadas por leitura
autenticada com `x-clinica-id`, sem URL pública ou URL assinada reutilizável. Blobs
locais são revogados na troca/saída. Avatar só recebe URL que corresponde ao membro
e à clínica; tabela/cards/ficha atualizam após confirmação, sem reiniciar paginação,
filtros ou seleção visual.

## Recebimento e privacidade

Seção independente, opcional, somente em ficha de profissional de saúde. Grupos:
Clínica, Preferência, PIX, Conta e Favorecido; campos condicionais, uma coluna no
celular e estados distintos de ausência, carga e indisponibilidade.

PIX somente, conta somente ou ambos. Preferência exige o meio correspondente.
Instituição e número da conta são necessários ao cadastrar conta; código, agência
e dígitos são opcionais, mantidos como strings com zeros e formatos variáveis.
Conta corrente/poupança/pagamento; favorecido PF/PJ, nome/razão social, documento
necessário para transferência e indicação explícita de favorecido diferente.
Não copia CPF/telefone da pessoa nem altera seu CPF cadastral.

Tipos PIX CPF/CNPJ/e-mail/telefone/aleatória. CPF e CNPJ têm verificação de dígitos;
CNPJ aceita numérico e alfanumérico conforme [documentação técnica da Receita](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj).
Telefone exige formato internacional; chave aleatória exige UUIDv4; e-mail tem
limite77 e formato básico, conforme o [contrato DICT do Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html).
Validar formato não confirma existência, registro da chave ou titularidade.

JSON financeiro cifrado com pgcrypto/AES256 e o mecanismo Vault já existente no
projeto, sem usar `cpf_encrypt` sobre JSON (essa função remove caracteres). Chaves
nunca vão para o navegador. `equipe_recebimento_obter` e a confirmação de salvamento
retornam chave PIX, agência, número/dígitos e documento mascarados; a Edge reaplica
a máscara antes da resposta como proteção adicional. Leitura integral
só interna, após autorização, para composição/validação no servidor.

Ao editar, campos protegidos ficam vazios com indicação mascarada. A lista explícita
de preservação só aceita campos previstos; mudar tipo de PIX, PF/PJ, instituição,
código ou tipo de conta exige reinformar os campos protegidos correspondentes.
Máscaras não são enviadas como valores. Nenhum dado financeiro é colocado na consulta
geral `equipe_listar`, busca, cache de acessos, convites, notas ou localStorage.

Erros preservam edição. Conflito e resultado incerto bloqueiam novo envio até
reconsulta explícita, com confirmação do descarte da edição. Não há retries de escrita.
Troca de clínica remonta o editor e ignora resposta antiga; durante edição, o seletor
da configuração fica bloqueado até concluir/cancelar. Logout limpa preenchimento,
prévia e confirmado; respostas atrasadas não repovoam a ficha. Fechar ficha com
alteração não salva pede descarte; durante salvamento o fechamento fica bloqueado.

Auditoria específica registra ator, instante, profissional/membro e clínica nos
campos próprios, revisão e **nomes de campos alterados**. Não registra valores,
documentos, imagens ou ciphertext em auditoria genérica. Não há logs de payload.
Revisão esperada e bloqueio por profissional/clínica impedem sobrescrita silenciosa.

## Matriz preparada de permissões

Papéis já existentes: Proprietário(a)/Administradora corresponde a `proprietaria`;
nenhum papel Financeiro é criado. Clínica só Brotas/Ipupiara ativa; Ibitiara não ativada.

| Operação | Proprietário(a)/Administradora autorizada | Recepção / Médico | Sem sessão / sem vínculo / outra clínica não autorizada |
| --- | --- | --- | --- |
| Metadados/foto confirmada | Membro ativo com vínculo autorizado na clínica consultada | Nenhuma permissão nova | Negado |
| Adicionar/substituir/remover foto global | Exige administração de todos os vínculos ativos do membro, conforme regra de identidade compartilhada | Negado | Negado |
| Ler recebimento mascarado | Profissional de saúde e vínculo ativo, na clínica autorizada | Negado | Negado |
| Salvar recebimento | Mesmo escopo, pela Edge e revisão esperada | Negado | Negado |
| Ler tabelas protegidas diretamente / escrever Storage diretamente pelo cliente | Grants revogados; usar contratos autorizados | Negado | Negado |
| RPC interna com ator / valores integrais / limpeza | Apenas serviço confiável; wrappers internos revalidam contexto | Negado | Negado |

RLS habilitada, grants explícitos, objetos privados e políticas limitadas ao arquivo
confirmado. IDs enviados pelo cliente não definem ator nem ignoram vínculos. O papel
e o vínculo são verificados no servidor, independentemente da apresentação da UI.
**Matriz observada no código e em simulação; execução real ainda pendente.**

## Arquivos preparados

- `supabase/migrations/20261005170000_equipe_fotos_recebimento.sql`: tabelas, bucket,
  políticas, contratos de leitura/mutação, revisão, proteção e auditoria. **Não aplicada**.
- `supabase/functions/equipe-recursos/index.ts` e `NOTICE.md`: nova Edge independente
  de `equipe-acessos`; ImageScript1.3.0 com opção de licença MIT. **Não publicada**.
- `_shared/equipeFoto.ts`, `equipeRecebimento.ts`, `equipeRecursosServico.ts` e teste:
  validação determinística, codec e orquestração com portas sintéticas.
- `src/lib/equipeRecursos.ts`, `EquipeFotoPainel`, `EquipeRecebimentoPainel`,
  `useEquipeFotos`: contratos e estados separados, sem persistência sensível no browser.
- Integrações pontuais em `Equipe.tsx`, `EquipeAvatar.tsx` e `equipe.css`. A fonte da
  listagem e os controles ReUI31 foram preservados.
- `tests/operacional/equipe-recursos.spec.ts`, demo HTML/TSX e extensão pontual no
  Vite de testes. `scripts/test-equipe-recursos.mjs` e `preview-equipe-recursos.mjs`;
  scripts adicionados ao package, sem nova dependência no frontend/lockfile.
- Documento funcional, README, índice, notas não lançadas e checkpoints atualizados.

## Verificações e limites

13 testes determinísticos aprovados: PIX/conta/ambos, opcionais/zeros, documentos e
formatos inválidos, máscaras/preservação, autorização por portas simuladas, ID/clínica
recusados, revisão, upload/falhas/limpeza/resultado incerto, contrato SQL estático,
codec real e orientação dos pixels. Não há banco/PostgreSQL nesses testes.

25 cenários distintos de UI/regressão cobertos:15 de grid/listagem e10 novos de
recursos. Rodada conjunta24 aprovada; após cuidado adicional de logout,5 execuções
focadas aprovadas (novo caso de resposta tardia e4 reconferências); mais2 reconferências
finais de foto e logout com resposta tardia passaram, totalizando31 execuções
finais pertinentes. As larguras
360/390/430 passaram: campos e botões alcançáveis, rolagem vertical, sem overflow
horizontal global. Contextos de Brotas/Ipupiara simulados, sem dados reais.
Falhas intermediárias do roteiro foram resolvidas: um alvo estava fora da primeira
página porque a busca também considera cargo; outro teste foi interrompido por HMR.
As rodadas estáveis finais pertinentes passaram; essas falhas não provam defeito de produção.

Regressões pertinentes: filtros, contagens, paginação/ordem/seleção, foco da ficha,
contexto, papel atual e atualização simulada de acesso. Convites permanecem no serviço
original;5 testes existentes de convite determinístico reconferidos separadamente.
Não há entrega de e-mail nem operação real de acesso homologada nesta etapa.

Evidências locais ignoradas pelo Git em `scratch/equipe-fotos-recebimento/`:
`foto-confirmada-sintetica.png`, `recebimento-confirmado-mascarado.png`,
`demo-recebimento-mascarado.jpg`, `ficha-mobile-360/390/430.png`, `baseline.json`
e `verificacao-final.json`. Capturas só de pessoas fictícias,
resumos mascarados ou formulários sem dados sensíveis preenchidos.

## Como conferir pela interface isolada

Na janela disponibilizada pelo Codex, abra a [demonstração local](http://127.0.0.1:4192/tests/operacional/equipe-recursos-demo.html).
Ela mostra aviso de dados fictícios em memória e bloqueia rede fora do destino
sintético. Recarregar apaga alterações simuladas. Não use dados reais nessa demonstração.
Para reabrir o servidor: script `npm run dev:equipe:recursos`, somente no Windows local.

1. Em Médica Sintética, clique Ver cadastro, role até Foto da equipe e selecione
   um arquivo sintético. Prévia → Salvar foto → Fechar: avatar atualizado na lista;
   reabra para substituir/remover, ou use Cancelar foto antes de salvar.
2. Em Dados para recebimento, confira a clínica, clique Cadastrar, escolha o meio e
   preencha somente dados fictícios. Salvar recebimento → Fechar → reabrir: resumo
   mascarado. Alterar a clínica consulta outra configuração, sem copiar a anterior.
3. Editar recebimento mostra dados protegidos preserváveis; Cancelar e Descarta edição
   conserva o confirmado. Nenhuma operação de acesso está autorizada na demonstração.

A demo usa frontend real e respostas falsas em memória; **não é Supabase isolado** e
não demonstra criptografia, RLS, autenticação real, Storage ou persistência durável.

## Ordem futura de aplicação e publicação

1. Disponibilizar e confirmar explicitamente Supabase/Storage isolado, sem usar o
   principal. Conferir dependências da Equipe, profissionais, Vault/pgcrypto,
   auditoria e ausência de conflito com bucket `equipe-fotos` existente.
2. Aplicar a migration somente nesse destino autorizado; verificar objetos via
   `information_schema`/`pg_proc`, grants/RLS/bucket privado e executar
   `supabase/tools/verificar-integridade.sql`. Não usar histórico de migrations como
   prova suficiente e nunca imprimir o segredo Vault.
3. Disponibilizar a Edge nova nesse ambiente e comprovar execução do codec no Deno,
   limites de memória/tempo, validação de JWT e política de origens. Segredo de
   serviço permanece apenas no servidor, nunca no frontend.
4. Com membros/Auth/arquivos sintéticos, verificar persistência/reabertura, máscaras,
   auditoria sem valores, concorrência, troca/remoção, timeout/expiração/limpeza e
   isolamento. Testar JWT de Proprietário(a), Recepção, Médico e sem sessão; IDs
   não vinculados e clínica não autorizada; consultas diretas de tabelas/Storage e
   ausência de dados financeiros no JSON geral. Uma negativa mockada não substitui isso.
5. Somente após esses resultados e autorização específica, revisar pacote31+32 e
   preparar eventual commit/publicação no principal: migration e bucket privado,
   conferir integridade, Edge, frontend/notas vinculadas à release e validação por
   clínica. Se houver bucket preexistente, a migration falha sem sobrescrevê-lo;
   investigar antes de prosseguir. Nenhuma dessas ações foi realizada aqui.

## Skills e preservação

TypeSafe consultada: operação determinística, sem IA/reconhecimento facial e sem
acesso à TYPESAFE_API_KEY. ReUI file-upload gratuito consultado; controles existentes
e avatar/ReUI31 preservados, sem instalar componentes ou dependências de interface.

Uma triagem Jev inicial, somente conteúdo sintético: code_change/confiança0,81;
complexidade1,44/confiança0,34 incerta, decidida pelo Codex com investigação local.
897 tokens entrada/119 saída,958,5268ms,US$0,000037674. Sem conteúdo privado enviado.

Baseline96 arquivos anteriores registrado:86 permanecem idênticos por SHA256;
10 receberam apenas mudanças autorizadas em arquivos relacionados. Arquivos antes
limpos e novos desta etapa conferidos separadamente. Mudanças aditivas/pontuais,
sem undo/reset de trabalho anterior. Encerramento registrado em05/10/2026 às19:06:58
-03:00 nos checkpoints; evidências finais no JSON local ignorado.
Sem commit, push, merge, deploy, bucket remoto, pagamento, acesso ou cadastro real
alterado; sem ativação de Ibitiara. Próxima ação: validação real em ambiente isolado
antes de qualquer proposta de aplicação no principal.

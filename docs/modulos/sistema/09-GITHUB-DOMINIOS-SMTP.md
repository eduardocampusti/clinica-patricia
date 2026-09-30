# GitHub, domínios e SMTP — execução de 30/09/2026

## Decisões e limites

Anexo de decisões e prompt lidos integralmente. Supabase mantido em xftnkusbyqzyvzrovroj. Domínios autorizados: clinicabrotas.com.br e clinicaipupiara.com.br; não usar/comprar versão .com. TypeSafe/índice oficial consultados, sem Jev: Git/DNS/Auth/SMTP determinísticos.

Após o login manual no painel, o usuário determinou: **não fazer deploy na Hostinger sem nova autorização**. Nenhum upload, site novo, DNS, SMTP, assinatura ou contratação feito na Hostinger. Site Geovana intacto. Ensaio do relatório22 não recriado.

## Git e revisão

Remote: https://github.com/eduardocampusti/clinica-patricia. Branch efetiva: `codex/resgate-local-2026-09-26`, não a branch antiga citada em checkpoints históricos. Fetch remoto realizado. Antes desta execução: HEAD `016a029`, alinhado com origin dessa branch (0/0); main remoto `5fb56137e88af6a6144f6a7ce8c64592034c2855`, 60 commits atrás da branch atual, sem commits exclusivos de main. Não mesclado automaticamente nem acionado release de main.

Árvore tinha 52 arquivos modificados e dezenas de arquivos novos de implementações anteriores. Foram preservados e incluídos na sincronização autorizada: código, migrations, Edge, testes, modelos/assets e documentação. Varredura dirigida em 474 candidatos não encontrou padrões de credenciais privadas; não é garantia absoluta. .gitignore reforçado para ambientes e backups. Capturas novas limitadas às quatro prévias/bloqueio sem dados clínicos ou credenciais. Scratch, backups, .env, node_modules e resultados clínicos não enviados. Não feito force push ou alteração de visibilidade.

Workflow definido no repositório: Release Please em main/manual, não deploy da branch atual. Nenhum pipeline Hostinger das clínicas configurado nesta execução. Hooks/integrações externas não são comprovados apenas pelo arquivo de workflow.

Sincronização efetivamente concluída por push normal em `codex/resgate-local-2026-09-26`: commit de código `063a2baf0f3c52db19d66f0f3df3f32571edcd3e`. `git ls-remote` retornou exatamente o mesmo SHA do HEAD local. Commit reúne 149 arquivos alterados/criados. Build repetido e aprovado com árvore limpa desse SHA; não é release nem merge em main. Este registro documental posterior não altera o código compilado.

## Hostinger consultada somente por leitura

Painel autenticado mostrou planos existentes **Business** (expiração 06/03/2030) e **Unlimited** (20/07/2030). Listagem não contém sites identificados pelos dois domínios das clínicas. Isso confirma recursos existentes, não a reserva de slots/site/docroot ou suporte Node de um plano específico. Não foram reaproveitados sites temporários ou sites de terceiros.

Área E-mails não mostra plano/caixa nos dois domínios das clínicas. Há serviços de outros domínios, que não foram reaproveitados. Oferta de resgate grátis não foi ativada: não comprova caixa existente nem custo futuro/autorização do remetente. Falta endereço institucional escolhido e caixa/serviço autorizado com credencial segura. Nenhum segredo solicitado pelo chat.

Consulta DNS: ambos os A retornaram `2.57.91.91`; consulta MX retornou somente autoridade SOA, sem resposta MX. Não alterados DNS ou registros de e-mail. Não afirmar domínio de e-mail verificado a partir disso.

## Preparação e Supabase efetivamente aplicado

- Marca por hostname tem defaults dos dois domínios confirmados; www normalizado; hostname desconhecido continua rejeitado. Domínio não concede permissão.
- CORS da equipe inclui somente HTTPS dos dois domínios/www, preservando quatro origens locais. Autenticação e autorização permanecem obrigatórias.
- Retorno do convite obtém unidade do convite persistido já autorizado, não do Origin. Convite Ipupiara não reutiliza caminho Brotas. Bases públicas opcionais específicas validadas contra o domínio exato; caminhos oficiais/UUID preservados. Secrets públicos novos NÃO ativados enquanto sites públicos não existem. Base local anterior mantida, ajustando somente caminho da unidade efetiva.
- Fonte remota anterior preservada em scratch/publicacao-edge-pre (fora do Git); SHA-256 do index.ts `44026E7919D19212738480333989E13C237D13DB2584DE401532E906DA1F805F`. Cobertura somente fonte, não backup de banco/Auth ou restauração validada.
- Edge equipe-acessos publicada: **versão6 ACTIVE, verify_jwt=true**. Nenhuma migration aplicada. Configuração de URLs Auth existentes e secret-base local preservados; não ativados retornos públicos antes de HTTPS/rota pronta.
- deploy/hostinger contém orientação e .htaccess condicional Apache/LiteSpeed com HTTPS/canonical/fallback. Não instalado no remoto; deve preservar arquivo anterior e certificar HTTPS antes de usar.
- App usa FinanceiroModulo e RPCs. Fastify/server e lib/api são caminho legado; endpoints localhost:3333/antigos ausentes do build atual. Não é dependência comprovada de publicação da SPA atual; não remover legado nem modificar financeiro.

## Verificações e limitações

Build aprovado e lint com aviso histórico Fast Refresh. Testes unitários: 25 Pacientes, 15 Financeiro, 10 convite/redirect, 2 domínio (fonte real compilada em ambiente vazio), todos aprovados. São testes isolados, não publicação pública.

Preflight remoto por leitura: OPTIONS HTTP200 retornou origem permitida exata para HTTPS Brotas, HTTPS Ipupiara e local127.0.0.1:3000; origem externa desconhecida não recebeu permissão CORS. Não é comprovação de ação autenticada pelo navegador público. Uma primeira tentativa PowerShell restrita falhou na conexão TLS; repetição autorizada fora dessa restrição retornou os resultados acima. Checagem de espaços do índice aponta somente quebras Markdown/espaços finais de relatórios históricos preservados, não erro de compilação.

Suíte sintética login: 21 passaram, 22 pulados, 2 falharam (timeout inicial de navegação App e igualdade de cores por perfil). Reexecução App ainda atingiu timeout; não apresentar aprovação. Teste dirigido de hostnames, usando harness de Login e assertivas dos dois domínios/www/host desconhecido, passou. Nenhum comportamento funcional foi enfraquecido para esconder falhas; checagem de paleta fica identificada para investigação, sem redesign fora de escopo. Uma tentativa paralela colidiu na porta4182; o ensaio dirigido foi executado novamente sem essa colisão.

Não executados: deploy/HTTPS/login público/recarga interna/chamada de navegador dos domínios públicos; sem deploy permitido. SMTP/envio institucional/recebimento não executados, sem caixa/remetente. Nenhuma fixture criada, nada a limpar nesta rodada.

## Recuperação e próxima etapa

Código protegido por commits normais, sem reescrever histórico. Deploy preparado a partir do SHA sincronizado com variáveis somente públicas; pacote não deve incluir fonte/server/.env/previews. .htaccess anterior e pacote anterior precisam ser preservados no destino específico antes de upload. DNS/Auth/SMTP devem ter seus valores anteriores registrados antes de mudança; nesta rodada não foram mudados.

Para prosseguir: autorização nova de deploy na Hostinger, destino exclusivo/slot de cada clínica confirmado e remetente/serviço institucional definido. Preparação não equivale a publicação. SMTP próprio permite personalização no Free, segundo https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier. Templates do relatório23 permanecem locais até essa dependência existir. Não há necessidade comprovada de upgrade/VPS.

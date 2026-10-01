# Sistema — documento funcional mestre

**Estado:** RASCUNHO — comportamento solicitado em 25/09/2026; implementação local, não publicada.

## Comportamento solicitado

### Restauração autorizada após recarga — 01/10/2026

Refinamento aprovado após relato de Recepção: a URL interna válida é a fonte única da página ativa e prevalece sobre destinos capturados antes das consultas. Dashboard somente sem destino interno válido; rota fora do perfil recebe aviso explícito, sem descarte silencioso. Carregamento de vínculo/papel não equivale a negativa de permissão. Histórico, menu e conteúdo devem permanecer sincronizados.

Com sessão válida e vínculo ativo confirmado pelos serviços existentes, entrar automaticamente na área interna; restaurar página e clínica por rota validada após F5. Não usar preferência local como autorização nem persistir formulários/dados pessoais para isso. Convite e recuperação têm prioridade. Sem sessão mostrar login; falta de vínculo e indisponibilidade técnica são estados distintos, com nova tentativa/troca de conta. Logout impede restauração indevida. Referência de implementação/evidências: `10-RESTAURACAO-SESSAO-E-ROTAS.md`.

### Remetente institucional aprovado — 30/09/2026

Recuperação aprovada nesta continuação: solicitar link sem divulgar existência do e-mail; retornar à clínica de origem em caminho autorizado; permitir nova senha somente com sessão de recuperação validada pelo Auth; exibir confirmação/erros e exigir novo login. Recuperação não cria vínculos nem altera papéis. Templates compartilhados e remetente fixo; entrega validada somente após recebimento confirmado.

Usar administracao@clinicabrotas.com.br como remetente e usuário SMTP compartilhado, nome Clínicas Brotas e Ipupiara, smtp.hostinger.com:465/SSL-TLS. Preservar administracao@clinicaipupiara.com.br para administração da unidade. Não alternar SMTP global por mensagem. Titular insere senha pessoalmente no Supabase; nenhuma senha no código/chat. Retornos públicos por unidade e templates não concedem permissões. Entrega só validada mediante recebimento confirmado pelo destinatário autorizado.

### Decisão de publicação — 30/09/2026

Decisão vigente posterior: verificar todas as assinaturas e publicar Ipupiara em **outro plano existente com vaga**, sem custo adicional e sem nova autorização genérica. Escolhido pedido1008900896/Business/vencimento06/03/2030, quatro aplicações Node.js antes da implantação. Manter mesma branch/commit aprovado, configuração Vite/npm/dist/Node22 e duas variáveis públicas, com ajustes somente de DNS Ipupiara necessários. Publicação e rotas comprovadas no relatório09; nenhum upgrade/exclusão/outro site/SMTP permitido. A restrição ao pedido1009721871 no parágrafo histórico abaixo foi superada por essa decisão explícita.

Decisão posterior específica de Ipupiara: publicar `clinicaipupiara.com.br` no pedido existente1009721871, mesma branch atual/GitHub, Vite/Node22/dist e somente variáveis públicas Supabase; preservar Brotas, permissões, Site Geovana e SMTP. Contratação/upgrade e descarte/reaproveitamento de outros sites não estão autorizados. Execução atual bloqueada pelo limite5/5 apps Node.js, conforme relatório09. Modalidade estática alternativa ou liberação de aplicação existente depende de decisão adicional; preparação não equivale a publicação.

Decisão posterior: após primeiro deploy de Brotas na branch atual/f177207, usuário autoriza corrigir e publicar fallback para acesso direto/recarregamento das rotas na mesma integração GitHub. Preservar arquivos estáticos, caminho/parâmetros de autenticação e permissões; nenhum DNS/SMTP/Supabase/outro site no escopo. A restrição anterior abaixo descreve a etapa precedente.

Sincronizar o repositório existente sem force push, mudança de visibilidade ou perda do trabalho. Brotas usa clinicabrotas.com.br e Ipupiara clinicaipupiara.com.br, mesma base/Supabase, hostname apenas visual e permissões no servidor. Não comprar clinicaipupiara.com, planos ou VPS. Preserve Site Geovana, MX/SPF/DKIM/DMARC e configurações existentes. Remetente institucional depende de escolha/autorização e serviço real; destinatário de teste não é remetente. Decisão posterior do usuário nesta execução: **não fazer deploy na Hostinger sem nova autorização**. Preparar/consultar é permitido; não publicar, criar site ou alterar DNS ali.

- Mostrar o papel visual “Proprietário(a)” e “Visão de proprietário(a)” sem mudar o identificador interno `proprietaria` nem autorização.
- Dar acesso a “Sobre o sistema” pela navegação secundária. Mostrar clínica ativa, versão do build e ambiente sem confundir compilação com lançamento. A versão inicial desta fase é `0.1.0`, identificada como “Em desenvolvimento” até lançamento efetivo.
- Exibir dados institucionais por clínica e créditos gerais somente quando confirmados. Usuário autenticado não identifica proprietária, autoria ou suporte. Foram aprovados Vencer Digital como empresa de desenvolvimento, Eduardo Campos como desenvolvedor, WhatsApp `(77) 99129-0375` e Instagram `@vencerdigital.ia`; os respectivos links são contatos abertos apenas pelo usuário, sem envio automático de dados.
- Apresentar a marca original da Vencer Digital no cartão “Desenvolvimento e contato”, sobre superfície clara inclusive no tema escuro. Crédito de desenvolvimento não implica propriedade das clínicas.
- Listar notas úteis da versão efetivamente instalada, separando mudanças não lançadas de lançamentos com versão e data comprovadas. Sem inventar versões anteriores.
- Permitir consultar detalhes técnicos em área recolhível, com navegação por teclado, modo escuro e layout responsivo.

## Estado local e pendências

O pacote local está em `0.1.0`, ainda não lançado. O manifesto de Release Please permanece em `0.0.0` como referência inicial da automação, **não como release publicada** nem como versão do código em desenvolvimento. Não há tags locais de lançamento; o histórico remoto não pôde ser confirmado nesta revisão. A configuração de Release Please está preparada, mas seu gatilho automático aguarda a confirmação da branch oficial. Nome da proprietária, contato institucional das clínicas, autoria formal, manutenção e suporte oficial não foram confirmados e permanecem omitidos. Nenhum dado de pacientes ou autorização é alterado por esta página.

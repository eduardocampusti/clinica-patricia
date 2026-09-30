# Sistema — documento funcional mestre

**Estado:** RASCUNHO — comportamento solicitado em 25/09/2026; implementação local, não publicada.

## Comportamento solicitado

### Decisão de publicação — 30/09/2026

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

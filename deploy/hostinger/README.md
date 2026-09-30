# Publicação preparada, não executada

## Atualização — correção autorizada de rotas após primeiro deploy

Usuário confirmou o deploy GitHub de Brotas na branch codex/resgate-local-2026-09-26/f177207, preset Vite, dist, raiz ./, Node22. Agora autoriza publicar correção do404 na mesma branch. A configuração efetiva de fallback é `public/.htaccess`, copiada pelo Vite para `dist/.htaccess` em Windows e Linux. Reescrita interna para index.html somente quando arquivo/diretório não existe; mantém query string e URL, sem regras de HTTPS/canonical adicionais. O exemplo nesta pasta abaixo é histórico/opcional, não a fonte da configuração publicada. Não copiar esse exemplo por cima do arquivo gerado.

Mesma SPA React/Vite nos dois domínios: clinicabrotas.com.br e clinicaipupiara.com.br. Backend Supabase xftnkusbyqzyvzrovroj. O servidor Fastify em server/ pertence ao caminho financeiro legado: App usa FinanceiroModulo/RPCs Supabase e o build atual não contém localhost:3333 nem os endpoints antigos. Não enviar código/chaves de server/ para public_html; não é dependência comprovada do frontend atual.

Em 30/09/2026 o usuário determinou não fazer deploy na Hostinger sem nova autorização. Esta pasta não publica automaticamente nem dispara DNS/SMTP. Confirmar plano, destinos exclusivos das clínicas e preservar arquivos/.htaccess anteriores antes de qualquer upload.

## Preparação

1. Código sincronizado no GitHub, SHA confirmado; checkout limpo desse SHA.
2. Build com VITE_SUPABASE_URL correto e somente chave pública publishable/anon. VITE_CLINICA_BROTAS_HOSTNAME=clinicabrotas.com.br e VITE_CLINICA_IPUPIARA_HOSTNAME=clinicaipupiara.com.br (defaults também definidos no código). IDs atuais conforme configuração autorizada. Não copiar .env para hospedagem.
3. Não publicar endpoints localhost. VITE_API_URL só se aplica se um caminho legado consumidor for reativado; o build atual usa RPCs. Caso isso mude, verificar backend HTTPS próprio sem modificar regras financeiras.
4. npm ci; npm run build; publicar apenas dist, excluindo previas-emails. Migrations/Edge/server/docs/node_modules ficam fora da pasta pública.
5. .htaccess aqui é exemplo para Apache/LiteSpeed confirmado: canonical sem www, HTTPS e fallback SPA. Não sobrescrever o arquivo existente sem revisar/guardar cópia. Outros hosts exigem regras equivalentes próprias. HTTPS deve existir antes de forçar redirect.

## Auth e convite (ativação futura)

Preservar redirects locais. Autorizar https://clinicabrotas.com.br/acesso/brotas e https://clinicaipupiara.com.br/acesso/ipupiara com os parâmetros de convite aceitos pelo padrão oficial, sem wildcard de domínios. Conferir recebimento do UUID no App antes de salvar a configuração.

EQUIPE_INVITE_REDIRECT_BROTAS_URL e EQUIPE_INVITE_REDIRECT_IPUPIARA_URL são bases públicas específicas opcionais do servidor; não ativá-las antes de domínio/HTTPS/aceite estarem acessíveis. Na ausência delas, a base local existente mantém a porta e passa a usar o caminho da unidade efetiva do convite persistido. CORS preserva origens locais e lista somente as origens HTTPS destes dois domínios e www. Nenhum contexto visual concede autorização.

## Recuperação

Restaurar pacote anterior e .htaccess preservados; restaurar somente registros DNS/configurações alterados e registrados. Nunca apagar MX/SPF/DKIM/DMARC existentes para publicação. Para Edge, guardar fonte/versão anterior antes de publicar e republicar essa fonte se necessário. Backups de dados e segredos ficam fora do Git. Não há ação automática de recuperação ou reset de banco.

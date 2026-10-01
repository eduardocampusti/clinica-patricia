# Restauração da sessão e navegação após F5

Data: 01/10/2026. Estado: EM VALIDAÇÃO — publicação e conferência pública registradas ao final conforme execução.

## Causa comprovada

`App.tsx` inicializava `acessoValidado=false` e `tela=dashboard`. O botão Continuar validava vínculos e liberava o shell apenas em memória. Menu e botão trocavam componentes, sem mudar o caminho `/acesso/brotas` (ou Ipupiara). Por isso F5 restaurava a sessão Supabase, mas exigia Continuar novamente e esquecia a página. A correção anterior do convite fez uma navegação efetiva, expondo essa etapa intermediária preexistente; não é perda de senha ou sessão.

## Decisão aprovada e implementação

- Sessão restaurada não equivale a autorização: `carregarAcessosClinicas` consulta vínculos ativos e clínicas pelo cliente comum/RLS. App verifica novamente a lista e o papel da clínica ativa antes de montar a área interna. Identidade validada deve corresponder ao usuário atual.
- Inicialização centralizada no App; Login não duplica a preparação de vínculos quando usado nesse fluxo. Carregamento discreto substitui o formulário enquanto há sessão em verificação. Sem sessão apresenta login; ausência confirmada de vínculo e erro técnico têm mensagens distintas. Falha de consulta não provoca logout automático nem comprova ausência.
- Rotas internas limitadas a `/sistema/brotas/<pagina>` e `/sistema/ipupiara/<pagina>`, com páginas da enumeração existente. Agenda e Pacientes são recuperadas pela URL, sem persistir dados pessoais, formulários ou filtros não salvos. Entrada autorizada substitui a rota de acesso no histórico; menu atualiza a URL; Voltar/Avançar lê a rota e seleciona apenas clínica presente na lista autorizada.
- A URL só guarda localização, não concede permissões. Destinos seguem os papéis já oferecidos pelo menu; Sobre continua disponível a todos os perfis. Clínica diferente exige vínculo ativo próprio; domínio não concede acesso.
- Convite válido e recuperação têm prioridade sobre a restauração comum. Link e evento PASSWORD_RECOVERY continuam necessários; senha é definida pelo titular. Após aceite, navegação refaz consultas sem repetir aceite. Recuperação não concede vínculo. Nenhum convite, recuperação ou senha real enviados/alterados nesta tarefa.
- Logout limpa a etapa validada e volta ao acesso; sessão ausente impede restauração por F5/Voltar. Entrar com outra conta permanece disponível em erro e login; Sair permanece no menu. Lembrar meu acesso continua guardando somente a unidade; restauração não apaga nem recria essa preferência. Eventos de foco/renovação do mesmo usuário não reiniciam navegação.

## Arquivos e preservação

App, Login, hooks de clínica/vínculos/papel, `clinicAccess`, `appRoute`, `clinicBrands`, tipos/Sidebar e notas de evolução. Nenhuma migration, RLS, Auth remoto, SMTP, senha, regra financeira ou cadastro alterado. Fallback `.htaccess` já publicado é reutilizado para as rotas internas. Site Geovana e os ensaios anteriores permanecem preservados.

## Verificações executadas

Testes interceptados em `tests/login/navigation.config.ts`: 15 cenários dirigidos (navegação, convite e recuperação), aprovados. Brotas e Ipupiara em contextos separados: entrada automática; F5 repetido em Agenda/Pacientes; acesso direto; logout/F5/acesso protegido sem sessão; falta de vínculo; erro técnico; login normal; sessão expirada recusada pelo Auth; destino fora do perfil; convite pós-aceite desktop/móvel; recuperação neutra, erro e retorno validado. Somente dados sintéticos e respostas interceptadas, sem gravar no Supabase. Uma execução inicial falhou porque o harness usava a chave de storage do principal em vez do endpoint sintético; corrigido o teste, não as credenciais do aplicativo.

Build e lint aprovados. Avisos preexistentes: Fast Refresh ThemeProvider e tamanho/importação de bundle. `git diff --check` conferido. TypeSafe skill e índice vivo consultados: autenticação/roteamento determinísticos, sem Jev/API/chave. Referência oficial Supabase: https://supabase.com/docs/reference/javascript/auth-onauthstatechange — evento SIGNED_IN pode reaparecer ao focar a aba; consultas permanecem fora do callback Auth.

## Conferência simples

1. Abrir o acesso público da unidade com sua própria sessão autorizada; deve abrir a área interna sem Continuar.
2. Abrir Agenda e pressionar F5; repetir em Pacientes. URL deve indicar página/unidade.
3. Sair; F5 não pode abrir área interna. Login/convite/recuperação são conferências distintas, sem enviar novas mensagens só para testar aparência.

Local preservado: http://127.0.0.1:3000/acesso/brotas e http://127.0.0.1:3000/acesso/ipupiara. Público: https://clinicabrotas.com.br/acesso/brotas e https://clinicaipupiara.com.br/acesso/ipupiara.

Publicação e evidências conectadas: pendentes até os registros finais abaixo. Não apresentar testes interceptados como validação integral de produção.

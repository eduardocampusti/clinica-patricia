# Decisão pontual para substituir fixtures encerradas — 09/10/2026

## Evidência posterior de09/10/2026

O titular confirmou manualmente a sessão LOCAL de Proprietário(a), F5, Meu perfil e Novo membro sem salvar em Brotas/Ipupiara. Após publicação da dashboard, também confirmou NOVO LOGIN e navegação/troca/F5 nos dois sites. Estes itens por leitura foram aprovados manualmente. Isso não disponibiliza ao agente a sessão para executar a operação normal de criação nem comprova gravações privadas. Bancada SDK conectada5189 preparada, mensagem de conferência ainda pendente; nenhuma R2 consumida/aplicada. As afirmações de ausência de prova de navegação abaixo são históricas. Restrição para não consumir as duas novas contas/contextos antes de preparar e viabilizar execução completa preservada. [Estado atual](../../../docs/modulos/sistema/20-PUBLICACAO-PARCIAL-E-HOMOLOGACAO-PENDENTE.md).


**APROVADA pelo titular nesta retomada em 09/10/2026; NÃO APLICADA.** Aprovação uma única vez, máximo acumulado dez contas/quatro contextos, exclusivamente `xftnkusbyqzyvzrovroj`. Condição explícita adicional: antes de criar recursos, resolver e comprovar a sessão legítima do criador. Esta condição não foi satisfeita: o kernel do navegador continua falhando. Nenhuma conta/contexto R2 criado. Não é renovação ilimitada dos oito recursos originais.

[Arquivos concretos e sequência condicionada](r2/README.md). Migration adicional, seeds, template de vínculos, encerramento, recuperação anterior ao consumo, resolver público adicional e bancada R2 foram preparados localmente. Dez contratos SQL sintéticos e seis testes de hosts passaram; bancada compilou. Nenhuma dessas provas locais substitui sessão Auth/homologação conectada.

## Diferença de escopo

As três contas H6/C-A/C-B e os dois contextos originais estão encerrados; não serão reativados. Os cinco recursos restantes H1–H5 conservam seus papéis/unidades de Acesso Direto. Para terminar Configurações, a alternativa proposta acrescenta **somente duas contas novas e dois contextos novos, uma única vez**. O limite acumulado passaria de oito para **dez contas** e de dois para **quatro contextos**; isso inclui os recursos encerrados. Nenhuma terceira substituta está coberta.

| Nova fixture proposta | Identificação fixa | Papel e alcance |
| --- | --- | --- |
| C-A2 | `cfg-a.20261009.r2@configuracoes.example.invalid`; marcador `homologacao_configuracoes=20261009-r2-a` | Proprietária somente no contexto A2 |
| C-B2 | `cfg-b.20261009.r2@configuracoes.example.invalid`; marcador `homologacao_configuracoes=20261009-r2-b` | Proprietária somente no contexto B2; rebaixamento temporário a Recepção e retorno apenas nessa fixture, conforme roteiro original |
| Contexto A2 | UUID `ed60a2c6-59c8-45bc-80b7-e53aa005da01`; slug `homologacao-configuracoes-r2-a`; alias `configuracoes-homologacao-r2-a.invalid` | Unidade exclusivamente fictícia, autorização 24h, limite estrutural 48h |
| Contexto B2 | UUID `ed60a2c6-59c8-45bc-80b7-e53aa005da02`; slug `homologacao-configuracoes-r2-b`; alias `configuracoes-homologacao-r2-b.invalid` | Unidade exclusivamente fictícia, autorização 24h, limite estrutural 48h |

UUIDs de contas seriam obtidos da criação oficial Auth, sem gravar diretamente em auth.users. Senhas aleatórias individuais só em memória, nenhuma chamada de envio de e-mail. As contas não receberiam vínculo Brotas/Ipupiara nem autorização geral. H1–H5 não receberiam vínculos A2/B2.

## Alterações concretas necessárias

O catálogo remoto foi consultado por leitura nesta retomada. As restrições atuais aceitam exclusivamente os dois contextos antigos; as substitutas acima não funcionam sem uma mudança adicional:

1. **Uma migration adicional seletiva**, não reaplicação da `20261008230050`: acrescentar exclusivamente os dois pares UUID/slug acima à restrição `public.configuracoes_homologacao_contextos.configuracoes_homologacao_contextos_check`; preservar pares históricos e limite de expiração. Acrescentar exclusivamente os dois slugs à `public.configuracoes_publicas.configuracoes_publicas_slug_check`. Incluir os dois UUIDs no caminho de padrão **sintético** de `public.configuracoes_padrao_consultar(text)`, preservando ACL, search_path, guardas e demais funções. Os helpers `configuracoes_unidade_permitida`/`configuracoes_slug_permitido` já consultam o contexto ativo e não exigem novos caminhos genéricos.
2. **Uma publicação seletiva somente da Edge configuracoes-publicas**: acrescentar exatamente os dois aliases fixos em `supabase/functions/_shared/configuracoesPublicas.ts`, conservando os quatro atuais, validação de seletor e JWT previsto. Nenhum outro serviço/hook/Auth/GraphQL/frontend precisaria ser reaplicado por essa substituição.
3. Preflight das novas seeds/vínculos por transação com ROLLBACK antes de criar contas; recusar colisão de UUID/slug/e-mail, fixture já existente ou encerrada. Depois criar exatamente dois contextos e duas contas; dois perfis/vínculos privados correspondentes; executar as operações do roteiro13 de Configurações, sem publicar marca ou dados nas unidades reais. Não criar empresas, pacientes ou dados financeiros.
4. Testar A2/B2 com sessões Auth reais: leitura, rascunho, nova sessão/persistência, upload válido/substituição/leitura assinada, aplicação e restauração, conflito de revisão, negação entre contextos/Brotas/Ipupiara/geral e Recepção. Login público só nos dois aliases fictícios. Preservar baseline pública das unidades reais.
5. Encerrar no finally: sair/revogar sessões antes do ban, inativar somente novos perfis/vínculos/contextos/clínicas; conferir zero sessões/refresh/vínculos e projeções acessíveis. Preservar versões/auditoria e imagens referenciadas; não reabrir originais.

## Recuperação e limites

Antes de qualquer escrita, guardar definições vigentes dos dois CHECKs, função e Edge pública; abortar se divergirem do pacote revisado. Fazer conferência estrutural após SQL. Em regressão, encerrar apenas as novas fixtures e recuperar a Edge anterior pelo canal administrativo independente. Os pares novos nas restrições podem permanecer inertes e sem contexto ativo: não remover restrição com DROP CASCADE nem apagar histórico para forçar rollback. Recuperação estrutural exata exige confirmar ausência de linhas dependentes; não presumir que a simples inativação permite estreitar um CHECK novamente.

Sem alteração de contas reais, administração global, envio de e-mails, instalação GraphQL, habilitação geral, commit, push ou publicação do frontend. A proposta não resolve a falha de inicialização do navegador: `cua.getState` ainda precisa funcionar para obter a sessão legítima existente sem solicitar ou extrair credenciais. Não substitui essa sessão por emulação SQL ou criação administrativa de sessão de conta real.

Se o limite permanecer oito contas/dois contextos, **Configurações privada permanece sem homologação completa nesta sequência**, pois C-A/C-B e ambos os contextos já foram consumidos e encerrados. Não converter H1–H5 em substitutas silenciosamente.

# Configurações — documento funcional mestre

## Configurações R5 homologada;0.5.0 preparada — 2026-10-09T23:01:31.694Z

Provas reais completas após correções:75requisitos finais aprovados (82registros/80pass/2falhas históricas retestadas). PNG/JPEG, persistência/F5, histórico, concorrência409, login público, permissões/isolamento bilateral aprovados.18contas/10contextos encerrados; novas2banidas,0sessões/refresh/vínculos,10ctxinativos,públiconull,0versões reais. CFGtrue/versão0.5.0 preparadas após encerramento. Dashboard/AD0.4.0 preservados no checkoutisolado, primário mantém trabalhos paralelos. Migração corretivaPT409 aplicada ledger20261009225111/privada8; R5ledger20261009224204/pública10. GraphQL ausente/não homologado, sem dependência deREST/RPC/Storage/Edges emescopo. Relatório26/provasR5. Ainda semnovo commit/push/deploy; próximo publicação autorizada e leitura autenticada nos dois domínios.


## Estado atual R3 / release0.4.0 preparada — 09/10/2026, 17:36:42 -03

Acesso Direto homologado conectado, inclusive RPC bilateral I1/I2; preparado para publicação autorizada. Configurações permanece desligada: upload503 identificado/corrigido (encode oficial), teste PNG local aprovado, rehomologação conectada ainda necessária. Todos14contas/6contextos encerrados; limite não renova após encerramento. Dashboard0.3.0/manual preservada. GraphQL ausente e não homologado funcionalmente. Detalhes atuais: relatório24-HOMOLOGACAO-R3-E-PUBLICACAO-FINAL.md; report23 conserva falha histórica. Tipos/notas/build/lint dirigido e4/4 separação sintética juntos aprovados. Sem afirmar publicação nesta preparação.


## Disponibilidade na publicação parcial de09/10/2026

Autorização posterior permite publicar recursos independentes comprovados e manter pendentes desligados. A versão0.3.0/de15bd14 publica a dashboard; enquanto BACKEND_CONFIGURACOES_HABILITADO=false, a produção omite Configurações do menu e a rota direta apresenta aviso sem editor. A prévia em desenvolvimento permanece disponível. A apresentação não substitui as guardas/ACL/RLS do servidor. Liberar edição somente após homologação conectada de persistência, upload, permissões e isolamento; não contar provas simuladas como aplicação real. Resultado e limites no relatório20 de Sistema.


Estado: APROVADO pelo pedido de implementação local de 08/10/2026. A aprovação
do pedido não equivale a homologação do backend ou publicação.

Configurações contém Dados da clínica, Identidade visual, Timbrados e documentos,
Tela de login e Histórico de alterações. Somente Proprietário(a) com vínculo ativo
na unidade edita; operações são protegidas no servidor, além da rota/menu.
Autorização para apresentação geral exige concessão global explícita separada,
sem inferência a partir da propriedade de uma unidade e sem concessão automática.

Apresentação geral é herdada campo a campo pelas unidades Brotas e Ipupiara.
Ausência significa herança; vazio, lista vazia e falso são escolhas explícitas.
Voltar ao padrão remove apenas a personalização. Dados jurídicos, contatos e
endereço permanecem locais, nunca são herdados globalmente.

`clinicas` continua fonte da unidade; empresas existentes continuam canônicas em
`equipe_registros`, tipo empresa. Não duplicar cadastro empresarial. Vínculo com
empresa emissora é explícito; razão social/CNPJ consultados do registro oficial.
Sua edição compartilhada permanece na Equipe e exige autorização das unidades
do registro. O cadastro empresarial atual só fornece nome e CNPJ: endereço e
contatos da unidade não são automaticamente endereço/contato jurídico da empresa.
O contrato de emissão omite essas informações quando sua fonte correta não existe.
Emissores com obrigatoriedade devem bloquear a emissão até completar a fonte oficial.

Nome/cidade seguem obrigatórios no cadastro atual; demais dados incompletos não
serão fabricados. CNPJ informado é validado, inclusive formato alfanumérico já
suportado no utilitário existente. CEP/telefone usam máscaras e o ViaCEP existente,
com preenchimento manual e preservação de edição em resposta tardia.

Imagens institucionais são independentes de Meu perfil. PNG/JPEG são validados
por assinatura, decodificação, dimensões e tamanho; servidor reencoda PNG,
preservando transparência e descartando metadados. Versões usam caminhos únicos;
substituir/remover referência não exclui arquivos históricos.

Timbrado é apresentação estruturada: logo proporcional, posição, nome institucional,
campos e texto simples em até três linhas por cabeçalho/rodapé, alinhamento,
espaçamento, margens, numeração e marca-d’água discreta. Sem scripts/HTML ou variáveis
livres. Variações por tipo respeitam campos/variação gerais e depois campos/variação
da unidade, que têm prioridade. Vazio explícito de logo não ativa alternativa
silenciosa. Emissores clínicos futuros
não são apresentados como existentes. Texto clínico e assinatura não integram a configuração.

Salvar rascunho e aplicar são operações distintas. Aplicar atualiza dados oficiais e
apresentação em uso. Restaurar cria novo registro/rascunho, que exige conferência e
aplicação posterior. Edição concorrente ou resposta incerta exige reconsulta antes
de repetir. Troca de clínica/rota/saída com edição pendente oferece salvar,
descartar ou continuar; F5/fechamento usa aviso nativo de alterações pendentes.

Domínios públicos continuam resolvidos pela lista autorizada. Identidade visual
não concede acesso; login/recuperação/convites/vínculos permanecem independentes.
Somente projeção aplicada dos campos necessários fica pública. Fotos pessoais,
rascunhos e documentos privados não são expostos. Arquivos do login são servidos
por endpoint que confirma referência aplicada em cada consulta; bucket privado.
Falhas usam alternativa visual, preservando formulário. Depois da implantação
inicial, aplicar nova personalização atualiza o login sem novo deploy de código.

Laboratório futuro recebe sua própria identidade oficial pelo contrato de snapshot;
não criar tenant, menu, laudo ou equiparar automaticamente clínica/empresa/laboratório.
Documentos emitidos devem guardar PDF e snapshot com identidade, versão e ativos
originais. Dados atuais nunca reconstruirão silenciosamente um documento antigo.

## Refinamento aprovado no pedido de continuação — 08/10/2026

Avisos permanentes devem conter clínica, alcance e limitações de ação; detalhes
técnicos/integrações futuras ficam em ajuda recolhível. Prévia da primeira página
A4 atualiza automaticamente, com pausa controlada, fonte e medidas compartilhadas
com o gerador. Amostra mantém dados institucionais fictícios; escolhas de apresentação
refletem o editor. Geração do PDF completo e download permanecem ações explícitas.
Fonte livre normal/negrito incorporada, medidas por peso correto, acentos preservados;
sem substituição silenciosa diante de falha ao carregar fonte.

Rascunho conserva sua base oficial. Mudança externa anterior à reconsulta deve
ser identificada e impedir sobrescrita/aplicação silenciosa. Usuário confirma
usar os dados oficiais atuais no rascunho, mantendo apresentação/imagens;
essa atualização salva nova versão de rascunho e não aplica automaticamente.
Snapshot e metadados de emissão identificam versões aplicadas local/geral e fonte.
Arquivo histórico de PDF+snapshot no servidor financeiro continua não implementado.

Proteção de senha temporária/primeiro acesso pertence à etapa de acesso direto;
Configurações deve respeitá-la antes da ativação. Migrações separadas, sem ativar
flags ou remover guardas quando a dependência não estiver homologada. Login público
não recebe dados privados de `clinicas`; somente projeção aplicada autorizada.


## Homologação isolada preparada no pedido conjunto — 08/10/2026

Para testar publicação pública sem alterar identidade real, preparar dois contextos
institucionais de demonstração na infraestrutura existente, acessíveis exclusivamente
a duas contas fictícias próprias. Identificações/aliases públicos fixos e prazo;
sem expor rascunhos/escolher UUID livre, conceder acesso real/global, ativar Ibitiara
ou mudar mapeamento dos domínios. Mesma publicação/leitura aplicada de produção,
padrão sintético somente das fixtures, sem herdar ativos/identidade geral reais.
Criar/ativar esses contextos remotamente ainda exige autorização adicional concreta.
Guarda única preservada no backend completo de acesso direto, controles false;
nenhuma regra permissiva compartilhada. [Plano atual e gates](13-SEQUENCIA-CONJUNTA-E-ISOLAMENTO.md).

# Login — documentação do módulo

**Estado: FUNDAÇÃO MULTI-CLÍNICA E REFINAMENTO RESPONSIVO APROVADOS** — arquitetura de acesso por domínio e apresentação responsiva validadas em 24/09/2026.

Fonte funcional: `01-DOCUMENTO-FUNCIONAL-MESTRE.md`. Execução e validação: `08-CHECKPOINT.md`.

Ordem de leitura:

1. `01-DOCUMENTO-FUNCIONAL-MESTRE.md` — comportamento aprovado.
2. `03-AUDITORIA-ESTADO-ATUAL.md` — estado encontrado e problemas auditados.
3. `06-ARQUITETURA-TECNICA.md` — resolução de marca, acesso e limites de segurança.
4. `08-CHECKPOINT.md` — implementação e validações executadas.

O formulário compartilhado permanece em `src/pages/Login.tsx` e `src/pages/login.css`. A configuração de Brotas e Ipupiara foi centralizada em `src/config/clinicBrands.ts`; a consulta de vínculos ativos ficou em `src/lib/clinicAccess.ts`. `src/App.tsx` exige revalidação do par clínica/papel também para sessões restauradas. A autenticação continua no mesmo Supabase Auth e a autorização continua baseada nos vínculos reais e na RLS.

Não existe mais uma terceira experiência visual genérica: em ambiente local, os endereços canônicos são `/acesso/brotas` e `/acesso/ipupiara`; aliases legados são redirecionados. Hostnames futuros são fornecidos por configuração de ambiente e hostname de produção desconhecido exibe bloqueio seguro sem formulário.

Cada página de entrada fica restrita à clínica de sua identidade visual, inclusive para proprietária vinculada às duas unidades. Sessão válida é apresentada por um estado explícito “Sessão ativa”, sem campo de senha bloqueado, com ações para continuar na clínica do link ou entrar com outra conta.

As imagens hero aprovadas são `public/imagem_login_brotas.png` e `public/imagem_login_ipupiara.png`, configuradas por clínica sem duplicar o Login. Laboratório, CRM, certificado digital, recuperação automática e visão administrativa consolidada de módulos continuam fora desta entrega.

O refinamento responsivo mantém as duas clínicas no mesmo componente e preserva textos, imagens, campos e ordem. Em desktop, as duas colunas ocupam a altura útil sem scrollbar vertical nos viewports validados; em tablet e celular, o hero permanece visível em uma faixa compacta acima do formulário, com fluxo vertical natural, controles de toque e ausência de overflow horizontal. Os cards do hero receberam profundidade discreta e hover restrito a dispositivos compatíveis.

Nas clínicas Brotas e Ipupiara, a preferência visual de perfil possui quatro acentos semânticos compartilhados: Médico / Clínico em azul, Recepção em turquesa, Gestão & ADM em violeta e Laboratório em verde. A cor selecionada aparece de forma restrita no seletor, foco dos campos, detalhe do formulário e botão principal, sempre acompanhada por borda, peso e marcador visual. Cada clínica continua fornecendo seu tema-base, logomarca, imagem e textos por `ClinicBrandConfig`. Essa escolha continua sendo apenas preferência de interface: vínculos, papel real e RLS permanecem responsáveis pela autorização após autenticar.

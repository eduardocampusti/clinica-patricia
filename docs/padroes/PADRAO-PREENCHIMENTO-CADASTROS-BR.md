# Clínica Patrícia — Padrão de preenchimento para cadastros brasileiros

**Versão:** 1.0
**Data:** 24/09/2026
**Abrangência:** formulários atuais e futuros de pacientes, responsáveis, funcionários, médicos e outras pessoas ou entidades do sistema.
**Natureza:** diretriz transversal de produto e qualidade. Este arquivo não afirma que todas as regras já estão implementadas e não autoriza, sozinho, alterações no banco ou implantação.

## 1. Para que serve

Antes de criar ou modificar um cadastro, qualquer desenvolvedor ou IA deve ler este arquivo **e** o documento funcional específico do módulo. O objetivo é oferecer preenchimento consistente em português do Brasil, reduzir erros de digitação e manter os dados pesquisáveis.

As regras de apresentação e auxílio ao preenchimento são reaproveitáveis. Obrigatoriedade, permissões, compartilhamento entre clínicas, retenção e armazenamento de dados continuam sendo decisões **de cada módulo**. Por exemplo, o CPF é opcional para pacientes conforme a decisão funcional desse módulo; este arquivo não torna o CPF opcional para funcionários ou médicos.

**Estado confirmado em 24/09/2026:** o cadastro local de Pacientes implementa normalização assistida de nome, logradouro, bairro e cidade; máscaras de CPF, telefone e CEP; CPF opcional; consulta pontual ao ViaCEP; proteção contra resposta atrasada; preservação de correções manuais; composição do endereço na coluna textual existente; e visualização literal desse texto na listagem administrativa autorizada. A listagem local não solicita ciphertext, hash ou CPF integral; a busca exata usa uma RPC que compara o hash no banco e devolve somente a identificação administrativa da clínica informada. A migration `20260924130000` dessa RPC está aplicada no Supabase da Clínica Patrícia, mas o frontend correspondente ainda não foi publicado. A tela ainda não possui ficha/edição que reabra o endereço em campos estruturados. O cadastro mantém Brotas e Ipupiara separados por `clinica_id`; esse isolamento permanece obrigatório em consultas e gravações e não foi alterado por essas melhorias.

## 2. Regra geral: comportamento por tipo de campo

| Tipo de dado | Experiência esperada | Cuidados |
|---|---|---|
| Nome de pessoa, nome social e nome de responsável | Sugerir grafia com iniciais adequadas; tratar `de`, `da`, `do`, `dos`, `das` e `e` conforme a posição. | Preservar acentos, hífens, apóstrofos e a correção manual de nomes excepcionais. Não substituir a grafia declarada pela pessoa de forma irreversível. |
| Logradouro, bairro e cidade digitados manualmente | Padronizar espaços e grafia quando houver alta confiança; permitir correção. | Preservar siglas, números, algarismos romanos e nomes próprios, como `Rua XV de Novembro`. Cidade retornada do CEP não precisa passar por uma transformação genérica de nomes. |
| Número e complemento do endereço | Preservar o valor informado; remover somente espaços supérfluos. | `Bloco A`, `Apto 101` e siglas podem ter maiúsculas intencionais. |
| UF | Mostrar e validar as duas letras maiúsculas. | Não aplicar capitalização de palavras. |
| E-mail | Validar formato e remover espaços acidentais nas bordas. | Não aplicar capitalização de nomes nem alterar automaticamente o conteúdo integral do endereço. |
| CPF | Máscara visual `000.000.000-00`; aceitar digitação e colagem com ou sem pontuação; validar dígitos quando informado. | Obrigatoriedade e persistência dependem do módulo. CPF de paciente segue a proteção criptográfica e a unicidade por clínica já definidas no projeto. |
| Telefone brasileiro | Máscara `(DD) NNNN-NNNN` ou `(DD) NNNNN-NNNN` conforme o número; aceitar colagem. | Distinguir, quando necessário, o titular do número, o canal disponível e a preferência de comunicação. Um número com WhatsApp não autoriza por si só automações. |
| CEP | Máscara `00000-000`; consultar endereço apenas após oito dígitos válidos. | Não inventar cidade quando a consulta falhar; permitir preenchimento manual. |
| Texto livre, observações e conteúdo clínico | Preservar redação e pontuação do autor. | **Nunca** aplicar capitalização de nome a frases, diagnósticos, siglas clínicas ou observações. |
| Registros profissionais, códigos, documentos diversos e senhas | Usar regras próprias do campo. | Nunca aplicar uma máscara de CPF ou uma transformação genérica apenas porque o valor contém letras ou números. |

### 2.1. Capitalização com segurança

- Exemplos esperados: `MARIA DA CONCEIÇÃO` → `Maria da Conceição`; `joão dos santos` → `João dos Santos`.
- A correção automática deve ocorrer em momento estável, preferencialmente ao sair do campo e novamente na validação antes de salvar. Não deslocar o cursor durante a digitação ou a composição de texto.
- Regras simples não conseguem inferir toda grafia de nomes próprios, siglas, sobrenomes estrangeiros ou abreviações. O usuário deve conseguir manter ou corrigir a grafia excepcional; a aplicação não deve reverter essa correção no salvamento seguinte.
- Preservar Unicode, acentos e espaços significativos. Evitar conversão com expressões regulares que funcionem somente para letras ASCII.
- A busca pode usar representação normalizada para comparação, mas o dado apresentado deve respeitar a grafia corrigida e aprovada pelo usuário.

## 3. Máscaras, validação e persistência

1. Máscara é auxílio visual, não prova de validade. CPF requer validação dos dígitos quando preenchido; telefone e CEP requerem validação compatível com seus formatos.
2. Aceitar colagem, Backspace/Delete, seleção de parte do texto e navegação por teclado sem duplicar pontuação ou perder o cursor. Em celular, usar teclado apropriado para números.
3. Preservar o que foi digitado quando a gravação falhar. Mensagens de erro devem identificar o campo e indicar a correção possível.
4. A representação usada no formulário não determina sozinha a representação armazenada. Consultar o contrato do módulo antes de mudar a persistência. **Nunca** colocar CPF em texto puro numa coluna, URL, log ou arquivo apenas para facilitar a máscara.
5. Um CPF não informado deve continuar ausente; não usar números fictícios. A possibilidade de deixar o campo vazio é definida pelo documento funcional de cada cadastro.
6. Validar no servidor/banco toda regra cuja violação afete integridade ou autorização; máscaras e validação no navegador são complementares.

## 4. CEP e preenchimento de endereço

Ao completar oito dígitos do CEP, fazer uma consulta pontual a um provedor de CEP. O ViaCEP documenta a rota `https://viacep.com.br/ws/{CEP}/json/` e retorna, entre outros dados, `localidade` (cidade), `uf`, `logradouro` e `bairro`. Um CEP com oito dígitos que não existe pode retornar `erro: true`; tratar também erro HTTP e indisponibilidade. Fonte: https://viacep.com.br/ — consultada em 24/09/2026.

**Comportamento esperado:**

- Formatar `12345678` como `12345-678` sem exigir que o usuário digite o hífen.
- Preencher **cidade e UF** quando o serviço devolver esses dados. Se houver campos próprios e valores úteis, também sugerir logradouro e bairro. Número e complemento continuam manuais.
- Informar que os dados vieram da consulta e permitir corrigir qualquer informação. Não tratar o CEP como confirmação infalível do endereço efetivo.
- Quando o CEP for genérico, incompleto, inexistente ou o serviço falhar, permitir preencher ou corrigir o endereço manualmente. Não apagar valores que a pessoa já digitou.
- Consultar somente o CEP; não enviar nome, CPF, telefone, endereço completo ou dados clínicos ao serviço.
- Evitar consultas a cada tecla, consultas duplicadas e validações em massa. Cancelar ou ignorar respostas antigas se o CEP mudar e não sobrescrever uma edição manual feita após o início da consulta.
- O sistema deve continuar utilizável se o provedor estiver indisponível. Uma troca futura de provedor não deve obrigar a reescrever todos os formulários.

O módulo Pacientes continua possuindo apenas `endereco` como coluna textual. A criação atual apresenta CEP, logradouro, número, complemento, bairro, cidade e UF em campos separados e grava uma composição legível, por exemplo: `logradouro, número, complemento, bairro, cidade - UF, CEP 00000-000`. A listagem administrativa autorizada seleciona e permite expandir o texto integral de `endereco`, sem tentar separá-lo em componentes. Ainda não existe ficha/edição que reabra a composição em campos estruturados.

Ao ler diretamente a coluna, é possível recuperar e exibir a **string completa** exatamente como foi salva. Não é possível recuperar de forma determinística cada componente para futura edição estruturada: vírgulas podem existir nos valores livres, partes podem estar ausentes, número/complemento não têm marcadores inequívocos e a string não registra quais valores vieram do ViaCEP ou foram corrigidos manualmente. Não implementar um parser heurístico como se fosse reversível. Uma futura edição estruturada exigirá contrato próprio de persistência/migração ou deverá manter edição do texto completo; qualquer mudança de esquema depende de projeto e validação específicos.

## 5. Reutilização em novos cadastros

Ao iniciar cadastro de funcionários, médicos, responsáveis ou outro módulo:

1. Verificar o estado do Git, as instruções do projeto, o código do formulário, seus testes, o documento funcional do módulo e as permissões de acesso.
2. Identificar os campos que realmente existem. Criar ou reutilizar utilitários/componentes de formatação por **tipo de dado**; evitar cópias divergentes das mesmas máscaras.
3. Montar uma matriz de obrigatoriedade **específica** para o módulo. Não copiar automaticamente as regras de pacientes para médico ou funcionário.
4. Aplicar as regras de texto, máscaras e CEP somente aos campos pertinentes. Manter correção manual, acessibilidade e comportamento responsivo.
5. Verificar integração com a persistência e outras telas. Testar que a apresentação não corrompe dados já existentes.
6. Validar com dados sintéticos, atualizar a documentação com o que foi implementado de fato e registrar o que ficou pendente.

### Exemplos de limites entre módulos

- **Pacientes:** CPF opcional e, quando presente, unicidade dentro da clínica. A implementação local apresenta à recepção um lembrete não bloqueante ao selecionar o paciente para novo agendamento ou registrar sua chegada, sem repetir o aviso na mesma interação. As migrations `20260924120000` e `20260924130000` estão aplicadas no Supabase da Clínica Patrícia; o frontend correspondente ainda aguarda publicação. Não compartilhar pacientes entre Brotas e Ipupiara.
- **Responsável legal:** o cadastro regular exige nome, vínculo e um campo `Telefone / WhatsApp`; CPF e e-mail são opcionais conforme decisão já registrada. A automação de WhatsApp é um projeto futuro.
- **Funcionários e médicos:** máscaras e CEP podem ser reaproveitados, mas obrigatoriedade de CPF, registro profissional, contratação, clínicas de vínculo e permissões devem vir dos documentos desses módulos. Nunca inferir essas regras a partir deste padrão.

## 6. Critérios mínimos de aceite

- Nome em minúsculas ou maiúsculas recebe sugestão consistente sem destruir acentos, partículas, siglas e correção manual.
- Campo de texto livre não sofre capitalização de nome; e-mail e identificadores permanecem íntegros.
- CPF, telefone fixo, celular e CEP funcionam com digitação, colagem, correção parcial e teclado de celular.
- CPF vazio funciona somente nos módulos que o permitem; CPF informado é validado conforme o contrato do módulo.
- CEP encontrado preenche cidade/UF; rua e bairro são sugeridos quando disponíveis; usuário pode corrigir qualquer campo.
- CEP inexistente ou falha de rede não inventa cidade, não perde dados e permite conclusão manual quando a regra do módulo permitir.
- Mudar o CEP antes da resposta não preenche a cidade do CEP antigo.
- Dados continuam corretos após salvar e reabrir o cadastro; registros anteriores continuam legíveis.
- A mesma experiência aparece nas telas que usam o mesmo tipo de campo, com variações de obrigatoriedade explicitadas.
- Nenhum cadastro, busca ou chamada de CEP quebra a autorização por clínica e papel.

## 7. Prompt reutilizável para qualquer IA de desenvolvimento

Copie o texto abaixo ao iniciar um novo cadastro. Substitua os marcadores entre colchetes:

```text
PROJETO CLÍNICA PATRÍCIA — APLICAR PADRÃO BRASILEIRO DE PREENCHIMENTO

Módulo: [PACIENTES / FUNCIONÁRIOS / MÉDICOS / OUTRO]
Tela ou fluxo: [IDENTIFICAR]

Leia integralmente PADRAO-PREENCHIMENTO-CADASTROS-BR.md, o documento funcional do módulo, as instruções do repositório e o código atual antes de alterar qualquer arquivo. Comece informando o estado do Git e preserve alterações preexistentes.

Inspecione os campos reais e implemente apenas onde forem pertinentes: formatação cuidadosa de nomes e endereços em português do Brasil, máscaras de CPF/telefone/CEP e consulta de CEP para cidade/UF. Reutilize componentes existentes. Não transforme e-mail, texto livre, siglas, códigos ou conteúdo clínico como se fossem nomes. Preserve digitação, colagem, correção manual, acessibilidade e dados em caso de erro.

Distinga regras transversais de regras específicas deste módulo: quais campos são obrigatórios, quais papéis podem acessá-los, como são armazenados e se a clínica ativa se aplica. Não copie a regra de CPF opcional de Pacientes para outros módulos sem aprovação.

Antes de mudar persistência ou criar migrations, identifique o schema real e explique a necessidade. Não aplique alterações ao Supabase remoto só por causa deste padrão. Faça testes úteis de formatação, máscaras, CEP encontrado/inexistente, rede indisponível, resposta antiga, salvamento e leitura posterior. Rode as validações existentes. Atualize a documentação apenas para registrar o comportamento efetivamente implementado.

Ao final, informe arquivos alterados, testes e resultados, limitações e quaisquer decisões de produto ainda necessárias. Não faça commit nem push sem instrução específica.
```

---

**Como usar:** mantenha este arquivo no repositório do projeto, preferencialmente em `docs/padroes/PADRAO-PREENCHIMENTO-CADASTROS-BR.md`, e acrescente uma referência a ele nas instruções de entrada para IAs do projeto. Isso o tornará fácil de encontrar mesmo ao trocar de Codex para Claude ou outra ferramenta.

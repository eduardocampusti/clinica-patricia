# 10 — Contrato de relatórios financeiros — FASE 9

**Status:** APROVADO. Migration aplicada e camada de dados homologada; sem interface final.
**Migration:** `20260922034925_financeiro_fase9_relatorios.sql`, criada pelo Supabase CLI.
**SHA-256:** `80559457C4C00CA66F5C91EBB269D13FE5994ED45B4C73D333E73F2DF10B056C`. O SHA anterior `CD1C04A7671FAE8BA8C4081736397A73DA969BAC2334F3925AE7DB21C148D8E4` não é válido para aplicação.
**Base:** FASES 1–9 homologadas, especialmente `09-CONTRATO-DASHBOARDS.md`.

## 1. Arquitetura

O banco continua sendo a fonte dos números. Resumos usam as RPCs homologadas da FASE 8; detalhes completos usam RPCs paginadas da FASE 9. O cliente autenticado reúne todas as páginas, valida a reconciliação e gera o arquivo localmente.

Fluxo futuro: React autenticado → RPC segura → páginas JSON → validação de completude → gerador PDF/XLSX → download local.

Não usa service role no navegador, Fastify financeiro paralelo, banco paralelo, Edge Function obrigatória, storage público ou recálculo financeiro em JavaScript.

## 2. Bibliotecas

- `jspdf@4.2.1` + `jspdf-autotable@5.0.8`: PDF paginado, tabelas, cabeçalho e rodapé.
- `write-excel-file@4.1.1`: XLSX no navegador com múltiplas abas, estilos, datas e valores numéricos.

Não havia biblioteca de PDF/XLSX instalada no produto. `exceljs` foi avaliada e removida antes da implementação porque sua versão atual introduzia `uuid@8.3.2` com aviso de segurança. A cadeia final da FASE 9 não adicionou vulnerabilidade conhecida. O `npm audit` registra cinco entradas de pacote com severidade alta (`nanoid`, `postcss`, `vite`, `@vitejs/plugin-react` e `@tailwindcss/vite`), todas derivadas do único advisory de `nanoid@3.3.16` na cadeia preexistente Vite/PostCSS e sem correção disponível na árvore atual.

## 3. Públicos e datasets

### Proprietária

- resumo executivo consolidado ou por clínica;
- recebimentos detalhados;
- repasses por evento de geração ou pagamento;
- situação fiscal da coorte de recebimentos;
- comparativos e seções gerenciais montados a partir dos mesmos resumos homologados.

### Médico

- resumo do próprio financeiro;
- próprios recebimentos;
- próprios repasses.

O médico não recebe fiscal, caixa, auditoria administrativa nem dados de outro profissional. A identidade profissional é resolvida internamente por `auth.uid()` e exige um único profissional ativo.

## 4. RPCs novas

- `financeiro_relatorio_recebimentos_proprietaria(...)`;
- `financeiro_relatorio_recebimentos_profissional(...)`;
- `financeiro_relatorio_repasses_proprietaria(...)`;
- `financeiro_relatorio_repasses_profissional(...)`;
- `financeiro_relatorio_fiscal_proprietaria(...)`;
- `financeiro_registrar_solicitacao_exportacao(...)`.

Todas as públicas são `SECURITY DEFINER`, `search_path=pg_catalog`, autorizam internamente e concedem `EXECUTE` somente a `authenticated`. `PUBLIC` e `anon` ficam sem `EXECUTE`. Helpers privados não têm `EXECUTE` para papéis clientes.

## 5. Período e filtros

Período `[p_inicio,p_fim)`, máximo de 366 dias, instantes `timestamptz` e timezone explícita validada pela FASE 8. Filtros administrativos: clínica, profissional, paciente, forma, status de recebimento, status de repasse e status fiscal conforme o domínio do dataset.

Filtro por forma usa `EXISTS`: um pagamento R$ 200 dinheiro + R$ 300 PIX continua um recebimento bruto de R$ 500. Snapshots de clínica/profissional permanecem integrais; componentes são expostos separadamente.

## 6. Semântica financeira

Recebimentos incluem bruto e snapshots originais, estornos efetivados relacionados e líquido atual. Não recalculam percentual histórico.

Repasses têm três modos explícitos e não ambíguos:

- `gerados_periodo`: evento filtrado por `gerado_em`;
- `pagos_periodo`: evento filtrado por `confirmado_em`, inclusive repasse gerado antes do período;
- `pendentes_atuais`: posição atual, sem restringir a `gerado_em` ao período. Esse modo também existe no relatório do médico.

Fiscal segue a coorte de recebimentos por `registrado_em` e devolve os sete estados aprovados. Mensagem interna de erro, metadata/provider payload, URL e dados técnicos não entram no relatório.

## 7. Paginação e volume

Paginação keyset determinística por `data DESC, id DESC`, página de 1 a 500 registros. O UUID aparece apenas no cursor opaco entre chamadas, nunca como coluna visível. Cada cursor contém `data`, `id` e `contexto`; o contexto é recalculado pelo banco a partir da RPC, usuário autenticado, período, clínicas autorizadas, identidade profissional, filtros e timezone. Cursor de outro contexto falha com erro controlado.

Cada página informa `tem_mais`, `proximo_cursor`, `contexto`, totais integrais e um `marcador` determinístico dos campos relevantes da população filtrada. Toda chamada reexecuta autorização por `auth.uid()`. O cliente exige o mesmo contexto, marcador e totais em todas as páginas, faz uma consulta final de revalidação e cancela com mensagem amigável se o conjunto mudar. Também rejeita cursor ausente/repetido e truncamento silencioso. O limite de segurança configurável é 50.000 registros.

## 8. Reconciliação

Os totais são calculados sobre toda a população filtrada, independentemente da página. Antes de gerar arquivo, o cliente soma novamente as linhas detalhadas e reconcilia quantidade e totais monetários aditivos de recebimentos, repasses e fiscal. Contagens fiscais por estado também são reconciliadas. Divergência cancela a geração; indicadores não aditivos, como pacientes distintos, permanecem oficiais do banco.

Valores PostgreSQL `numeric` chegam como decimais e são convertidos em centavos inteiros com `BigInt` somente após validação estrita, evitando aritmética financeira binária. No XLSX, moeda, percentual, contagem e data são células tipadas, não textos formatados.

## 9. Privacidade

Permitido: nome de clínica, profissional e paciente quando necessário ao relatório operacional aprovado; valores, estados e datas.

Proibido: CPF, CPF criptografado/hash, prontuário, diagnóstico, observação clínica, token, segredo, payload fiscal sensível e UUID como conteúdo visível. Os geradores rejeitam títulos de coluna com UUID, CPF ou ID técnico.

## 10. PDF

Formato A4 paisagem, identidade visual roxa, título, período, clínicas, filtros, métricas, tabelas paginadas, cabeçalhos repetidos, rodapé e numeração `Página X de Y`. Estado vazio é explícito. O gerador aceita logo opcional em `data URL`; ausência não bloqueia o relatório.

## 11. XLSX

Abas: `Resumo` e uma aba por dataset solicitado. Cabeçalho congelado, filtros representados no resumo, títulos legíveis, larguras definidas e linhas alternadas. Valores monetários são números com formato `R$ #,##0.00`; datas são valores Date. Todo texto é gravado explicitamente como `String`, inclusive conteúdo iniciado por `=`, `+`, `-` ou `@`; nenhuma fórmula é criada.

Nomes de arquivo usam apenas prefixos técnicos do tipo de relatório e timestamp. O sanitizador remove acentos, aspas, barras, travessia de diretório, HTML e demais caracteres fora de `[A-Z0-9_-]`, limita o prefixo e nunca usa paciente, CPF ou outro dado pessoal.

## 12. Auditoria da exportação

`financeiro_registrar_solicitacao_exportacao` registra uma linha por clínica autorizada com o mesmo `solicitacao_id`: usuário, papel, clínica, público, dataset, formato, período e filtros sanitizados.

A auditoria registra somente a **solicitação**. Como a geração ocorre no cliente, o banco não afirma sucesso do arquivo. Nome de paciente, UUID filtrado e conteúdo exportado não são gravados na auditoria; flags indicam se houve filtro por entidade. Chaves, tipos e valores de filtros são allowlists fechadas; não existe campo livre capaz de registrar conteúdo pessoal ou fórmula hostil.

## 13. Testes e exemplos

- `database/tests/financeiro/20260922_fase9_relatorios.sql`: roteiro transacional executado com sucesso e `ROLLBACK`, cobrindo banco vazio, timezone inválida, paginação contextual, split payment, multi-clínica, médico, grants, três modos de repasse, fiscal, auditoria allowlist e rejeição de cursor adulterado.
- `scripts/financeiro-fase9-synthetic.ts`: gera exemplos exclusivamente sintéticos.
- `scripts/verificar-financeiro-fase9.py`: inspeciona os contêineres e bloqueia fórmula, JavaScript, formulário, link/anotação ativa, UUID e CPF visível.
- `RELATORIO_FINANCEIRO_EXEMPLO_SINTETICO.pdf`: 4 páginas; assinatura, texto, ausência de recursos executáveis e renderização verificadas.
- `RELATORIO_FINANCEIRO_EXEMPLO_SINTETICO.xlsx`: 4 abas; estrutura, tipos numéricos, zero fórmulas e renderização verificadas.
- Fixtures sintéticas hostis cobrem `=1+1`, `+CMD`, `@SUM`, HTML/script, aspas e travessia de caminho; permanecem texto literal.

Nenhum dado real do Supabase foi usado nos arquivos.

## 14. Limites desta entrega

Migration aplicada sem seed, roles ou repair. Permanecem fora desta entrega: frontend final, botão de exportação, storage, PDF/Excel com dados reais, commit e FASE 10. A integração visual futura deverá carregar os geradores sob demanda e chamar a auditoria imediatamente antes da coleta.

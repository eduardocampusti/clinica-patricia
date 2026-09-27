# Login — Arquitetura técnica multi-clínica

**Estado: APROVADO** — fundação frontend implementada em 24/09/2026.

## Componentes

- `src/config/clinicBrands.ts`: fonte central de hostname, slug, textos, cores, assets e correspondência da clínica.
- `src/lib/clinicAccess.ts`: consulta os vínculos ativos e os nomes das clínicas usando a sessão Supabase do usuário.
- `src/pages/Login.tsx`: apresenta uma única tela reutilizável, autentica e orquestra a escolha inicial.
- `src/App.tsx`: revalida a clínica contra a lista permitida e o papel real antes de liberar o shell.
- `useClinicasDoUsuario`, `useClinicaAtiva` e `usePapelNaClinica`: mantêm a clínica ativa, a preferência local e a confirmação do papel.

## Resolução de contexto

```text
hostname de produção ou rota local de preview
  -> resolveClinicBrand
  -> ClinicBrandConfig de Brotas ou Ipupiara
  -> mesma tela Login e mesmo Supabase Auth
  -> consulta de vínculos ativos sob RLS
  -> correspondência da clínica do domínio
  -> revalidação do par clínica/papel no App
  -> aplicação
```

`www.` é normalizado. A rota `/acesso/:slug` só substitui o hostname em `localhost`, `127.0.0.1` ou `::1`; em produção, uma rota não pode falsificar a marca do hostname. Em host local, `/` e `/login` redirecionam para `/acesso/brotas`; `/login/:slug` é somente alias legado para `/acesso/:slug`. Fora dos hosts locais, hostname não configurado produz `dominio-invalido` e o Login renderiza somente uma negação segura, sem formulário ou marca genérica.

Os hostnames de produção são opcionais em `VITE_CLINICA_BROTAS_HOSTNAME` e `VITE_CLINICA_IPUPIARA_HOSTNAME`. Sem essas variáveis, nenhum domínio público é presumido.

Depois da autenticação, o Login reduz os vínculos retornados ao único vínculo correspondente ao `ClinicBrandConfig` da página. Mesmo uma proprietária vinculada às duas clínicas não recebe seletor cruzado. Uma sessão restaurada exibe estado ativo e só chama o gate do `App` após “Continuar na Clínica [nome]”; “Entrar com outra conta” encerra a sessão e restaura os campos editáveis.

## Correspondência com a clínica real

Os IDs podem ser informados uma vez por ambiente por `VITE_CLINICA_BROTAS_ID` e `VITE_CLINICA_IPUPIARA_ID`. Na ausência deles, a fundação reconhece nomes normalizados somente dentro da lista de clínicas que o próprio usuário já pode ler sob RLS. Não há UUID espalhado em componentes.

## Segurança

- Domínio e rota de preview nunca criam vínculo nem papel.
- Uma credencial válida sem vínculo com a clínica do domínio é desconectada e recebe negação genérica.
- A escolha da proprietária é limitada aos vínculos ativos retornados pelo banco.
- O `App` repete a confirmação do par clínica/papel; esconder controles não é tratado como autorização.
- RLS e os vínculos reais continuam sendo a barreira de segurança definitiva.
- Nenhuma chave privilegiada, migration, schema ou dado remoto foi alterado nesta etapa.

## Limites atuais

- A visão consolidada ainda não existe; a proprietária escolhe uma clínica autorizada por vez.
- As imagens hero são definidas exclusivamente no `ClinicBrandConfig`: `/imagem_login_brotas.png` para Brotas e `/imagem_login_ipupiara.png` para Ipupiara.
- Não existe fallback visual neutro. Novos hostnames de homologação precisam ser explicitamente configurados ou permanecem bloqueados.

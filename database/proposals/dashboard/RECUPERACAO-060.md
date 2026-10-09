# Recuperação da integração 0.6.0

Preparação autorizada; não executada. Base: `f4b6891e49922ef199096e7b91274cfe6ee0f3da` (0.5.0).

Usar checkout isolado e árvore limpa da branch `codex/resgate-local-2026-09-26`. Conferir o remoto e os hashes registrados no relatório Sistema27. O intervalo abaixo deve conter somente os dois commits desta integração; se houver commits posteriores, selecionar explicitamente apenas os hashes do pacote, na ordem mais novo → mais antigo.

```powershell
git fetch origin
git log --oneline f4b6891e49922ef199096e7b91274cfe6ee0f3da..HEAD
git revert --no-commit f4b6891e49922ef199096e7b91274cfe6ee0f3da..HEAD
git diff --cached --stat
git commit -m "fix: recuperar a versão 0.5.0 após integração das dashboards"
git push origin HEAD:refs/heads/codex/resgate-local-2026-09-26
```

Sem force push, reset, limpeza ou exclusão de trabalho local. Resolver conflitos por revisão, sem substituir arquivos completos. Conferir ambos os domínios após o deploy. Nenhuma migration, serviço ou Auth mudou nesta entrega: não executar rollback remoto. Configurações e Acesso Direto devem permanecer habilitados com suas proteções da base 0.5.0. Reversão do frontend não reativa recursos fictícios encerrados.

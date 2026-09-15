# Ponto de retomada — 15/09/2026

## Estado recuperado após o reinício

O histórico da sessão anterior e os arquivos locais confirmam que as três
melhorias autorizadas foram implementadas. As alterações estão salvas no
diretório de trabalho e ainda não foram registradas em commit.

- **Estagiários:** identificação no cadastro de colaboradores, jornada de 6h/dia
  e aplicação do percentual de alocação em projetos.
- **Previsão automática:** ao iniciar uma atividade, usa início, esforço,
  responsável, jornada, percentual, demandas paralelas, dias úteis e férias.
  Alterações de capacidade e alocação recalculam as previsões afetadas.
- **Conclusão:** coluna no backlog e data automática na transição para Concluído,
  usando o calendário de São Paulo. Reabrir a atividade limpa essa data.

As regras detalhadas estão em [README — Capacidade, previsão e conclusão](../README.md#capacidade-previsão-e-conclusão).

## Validação repetida após o reinício

- `npm test -- --runInBand`: 6 suítes, 75 testes aprovados.
- `npx prisma generate` e `npx prisma validate`: concluídos.
- `npx tsc --noEmit`: aprovado.
- ESLint nos arquivos TypeScript alterados e novos: aprovado.
- `git diff --check`: aprovado.
- `npx next build`: concluído; aviso sobre múltiplos arquivos de lock no ambiente.

## Publicação autorizada — 15/09/2026

`npx prisma migrate status` confirmou que a migration
`20260915120000_capacity_forecast_completion` ainda não foi aplicada ao banco
configurado. Esse era o estado na retomada. Na sequência, o usuário autorizou
o commit, o envio ao repositório remoto e a publicação em produção.

Destino confirmado: branch `main` de `rodrigovieiraraiz/calculadora-esforco` e
projeto Vercel `transformacao-raiz-backlog`, com endereço
`https://transformacao-raiz-backlog.vercel.app`. A publicação está em execução;
o resultado será registrado neste documento após a verificação.

O script `npm run build` executa migrations com as variáveis do ambiente de
destino; para validar apenas a compilação, usar `npx next build`.

O inventário completo está em [ALTERACOES-2026-09-15.md](ALTERACOES-2026-09-15.md).

Após a atualização, identificar os estagiários existentes no cadastro.
Conclusões antigas permanecem vazias, pois não é possível inferir suas datas.

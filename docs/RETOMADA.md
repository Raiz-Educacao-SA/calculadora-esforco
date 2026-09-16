# Ponto de retomada — 15/09/2026

## Estado recuperado após o reinício

O histórico da sessão anterior e os arquivos locais confirmam que as três
melhorias autorizadas foram implementadas. Naquele momento, as alterações estavam
salvas no diretório de trabalho e ainda não haviam sido registradas em commit.
O commit e a publicação foram concluídos posteriormente, conforme o registro abaixo.

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

Destino confirmado: branch `main` de `Raiz-Educacao-SA/calculadora-esforco` e
projeto Vercel `transformacao-raiz-backlog`, com endereço
`https://transformacao-raiz-backlog.vercel.app`.

O script `npm run build` executa migrations com as variáveis do ambiente de
destino; para validar apenas a compilação, usar `npx next build`.

O inventário completo está em [ALTERACOES-2026-09-15.md](ALTERACOES-2026-09-15.md).

## Resultado da publicação

**Concluída em 15/09/2026.** Código enviado ao GitHub, migration aplicada, build
de produção concluído e endereço principal apontando para a nova versão.

| Registro | Resultado |
|---|---|
| Commit da implementação e documentação | [`d869640984728f04de12a3a9bc14dfefe1cde4f1`](https://github.com/Raiz-Educacao-SA/calculadora-esforco/commit/d869640984728f04de12a3a9bc14dfefe1cde4f1) |
| Branch remota | `origin/main` |
| Repositório canônico | [Raiz-Educacao-SA/calculadora-esforco](https://github.com/Raiz-Educacao-SA/calculadora-esforco) |
| Projeto Vercel | `transformacao-raiz-backlog` / `prj_WDs3of4w2BwoLv4G0yEzHDtTgyTZ` |
| Deployment | `dpl_2jYm6WkEfbHKchq1aSvYks2eBE7g` — Production / Ready |
| URL desta versão | [transformacao-raiz-backlog-r4yw98ik8.vercel.app](https://transformacao-raiz-backlog-r4yw98ik8.vercel.app) |
| URL principal | [transformacao-raiz-backlog.vercel.app](https://transformacao-raiz-backlog.vercel.app) |
| Migration | `20260915120000_capacity_forecast_completion`, concluída em `2026-09-15T17:34:52.587Z` (14:34:52 em São Paulo) |
| Estado do banco | 16 migrations aplicadas; `prisma migrate status` informa schema atualizado. |

O GitHub redirecionou o primeiro push do endereço antigo
`rodrigovieiraraiz/calculadora-esforco` para a organização `Raiz-Educacao-SA`.
Após confirmar o mesmo commit no destino, o remoto local `origin` e a documentação
foram atualizados para o endereço canônico.

O comando `vercel --prod --yes --logs` executou o build e a migration. A promoção
automática manteve o endereço principal na versão anterior; foi executado
`vercel alias set` para direcioná-lo à nova versão. A inspeção posterior pelo
endereço principal confirmou o ID do deployment acima.

### Conferência dos dados após a migration

Consultas somente de leitura, antes e depois da publicação, confirmaram:

| Verificação | Resultado |
|---|---|
| Itens de backlog | 59 antes e depois |
| Colaboradores | 8 antes e depois |
| Alocações | 43 antes e depois |
| Responsáveis migrados | 43; nenhuma divergência em relação à primeira alocação existente |
| Conclusões históricas preenchidas | 0, conforme a regra de não inferir datas antigas |
| Estagiários identificados | 0; cadastro operacional ainda precisa ser classificado |

### Verificação HTTP de produção

- `/login` e um arquivo JavaScript da página retornaram HTTP 200.
- `/backlog`, `/api/backlog`, `/api/funcionarios` e
  `/api/parametrizacao/alocacao-config`, sem sessão, redirecionaram para `/login`
  com HTTP 307.
- Uma tentativa controlada de login com endereço fictício retornou HTTP 401 e
  a mensagem de credenciais inválidas, exercitando a consulta ao banco pela aplicação.

Essas verificações complementam os 75 testes e a compilação já aprovados. Não
foram feitas alterações de atividades reais nem uma nova sessão de teste visual
autenticado em produção. Este resultado pós-publicação é registrado em um commit
de documentação posterior ao commit da aplicação indicado acima.

## Orientação operacional

Identificar os estagiários existentes no cadastro e conferir o percentual de
alocação antes de planejar novas atividades. Essa classificação depende de quais
colaboradores são estagiários e não foi inferida automaticamente.
Conclusões antigas permanecem vazias, pois não é possível inferir suas datas.

## Atualização de 16/09/2026 — Manual e atividades em andamento

O manual do sistema foi ampliado com os fluxos operacionais atuais. Alysson Alves
e João Xavier foram identificados como estagiários com base no cargo já cadastrado,
e as duas atividades em andamento foram recalculadas com a regra vigente.

- João: **Ajustes para publicação da v1 de 26/27**, 40h de esforço;
  previsão alterada de **16/09/2026 para 18/09/2026**.
- Sara: **Automatização da alteração de data de vencimento de boletos no TOTVS**,
  60h de esforço; previsão mantida em **21/09/2026**.
- Alysson: **Alteração dos SLAs de Serviços de Manutenção no Processo de Compras**
  permaneceu Concluído, com seu histórico preservado, conforme confirmação do usuário.
- Dois cadastros e uma alteração de previsão registrados em auditoria em
  **16/09/2026, entre 14:15:01 e 14:15:04 UTC** (11:15 em São Paulo).

O [registro detalhado](ALTERACOES-2026-09-16.md) contém as alterações do manual,
as regras do comando de manutenção, os resultados e as validações.

### Publicação

| Registro | Resultado |
|---|---|
| Commit da aplicação | [`be68b3e`](https://github.com/Raiz-Educacao-SA/calculadora-esforco/commit/be68b3e) |
| Deployment | `dpl_GE3siWcZSn4c6pvSifxxEAgiWS8A` — Production / Ready |
| URL da versão | [transformacao-raiz-backlog-f72scpdr6.vercel.app](https://transformacao-raiz-backlog-f72scpdr6.vercel.app) |
| Manual publicado | [Manual do Usuário](https://transformacao-raiz-backlog.vercel.app/manual) |
| Banco no build | 16 migrations existentes; nenhuma migration pendente. |

O build de produção terminou em **16/09/2026 às 14:22:28 UTC** (11:22 em São
Paulo). O alias principal foi direcionado ao novo deployment e a inspeção pela
URL principal confirmou o status Ready. `/login` retornou HTTP 200 e `/manual`,
sem sessão, retornou HTTP 307 para o login.

Os 75 testes, TypeScript, ESLint e build local passaram. A conferência visual
usou a página estática do build em Edge local, com larguras de 1365px e 390px:
sem rolagem horizontal, cinco atalhos válidos, títulos sem sobreposição pelo menu
e controles de impressão ocultos no modo de impressão. A sessão autenticada de
produção não foi usada nessa conferência visual.

Uma nova prévia após o recálculo retornou as mesmas previsões, sem diferenças
pendentes. Os registros de auditoria e as alocações foram confirmados no banco.

## Atualização de 16/09/2026 — Ícones de ações das listas

Com apoio de três agentes de UX/UI, foram padronizados 97 controles em 18 páginas:
lápis para editar, lixeira para excluir e ícones específicos para as demais ações.
Inclui suporte a teclado/leitores de tela, dicas por hover/foco, temas claro/escuro,
alvos maiores no celular e uma legenda no Manual do Usuário.

- Commit publicado: [`1d25cf2`](https://github.com/Raiz-Educacao-SA/calculadora-esforco/commit/1d25cf2).
- Deployment: `dpl_CfyeJBdxozBrZPCWP9R9wV8WRFHx`, Production / Ready.
- Publicação concluída às **11:41 de 16/09/2026**, horário de São Paulo.
- Endereço principal confirmado: https://transformacao-raiz-backlog.vercel.app.
- ESLint, TypeScript, 75 testes e build aprovados; fluxos representativos conferidos
  em Edge com APIs simuladas, desktop/celular e temas claro/escuro.
- Login HTTP 200; áreas/manual sem sessão redirecionam para login com HTTP 307.
- Sem alterações de API, schema ou dados de negócio; nenhuma migration pendente.

Escopo completo, componentes e evidências no
[registro das ações por ícones](ALTERACOES-2026-09-16-ACOES.md).

## Atualização de 16/09/2026 — Backlog com encerradas recolhíveis

A seção Concluídas / Canceladas fica recolhida por padrão e mostra a quantidade
de registros filtrados. Expande por clique/teclado e ao filtrar especificamente
por Concluído/Cancelado. Seleção e exclusão em lote consideram somente itens
visíveis; recolher limpa a seleção da seção. Manual atualizado.

- Commit publicado: `4f99155`.
- Deployment: `dpl_4k94TGtYwzADygKkA1buKeUQq7U1`, Production / Ready.
- Endereço principal confirmado: https://transformacao-raiz-backlog.vercel.app.
- ESLint, TypeScript, build local/produção e cenários interativos aprovados.
- Sem migrations pendentes ou alterações de dados reais nos testes.

Escopo, cenários de validação e publicação no
[registro do backlog recolhível](ALTERACOES-2026-09-16-BACKLOG.md).

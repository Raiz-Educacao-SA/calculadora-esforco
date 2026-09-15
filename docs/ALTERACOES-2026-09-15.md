# Alterações de 15/09/2026 — Capacidade, previsão e conclusão

## Objetivo

Considerar a jornada de estagiários no planejamento, calcular automaticamente a
previsão de atividades em andamento e registrar a data em que uma atividade é
concluída. A implementação abrange cadastro, parametrização, backlog, alocações,
férias, recálculo de esforço, banco de dados, testes e documentação.

## 1. Jornada e capacidade para projetos

- O cadastro de colaboradores passa a ter a opção **Estagiário** e a indicação de
  jornada na lista e nos cartões.
- Estagiários usam jornada fixa de **6h/dia**. Os demais usam a jornada padrão da
  Parametrização, inicialmente **8h/dia**.
- A capacidade diária é `jornada × percentual de alocação / 100`.
- Com 80%, a capacidade é de **4,8h/dia** para estagiários e **6,4h/dia** para uma
  jornada de 8h. Colaboradores inativos têm capacidade zero.
- Parametrização → Alocação em Projetos mostra as duas jornadas, os resultados do
  cálculo e um link para identificar os estagiários no cadastro.
- O percentual deve ser finito, maior que zero e até 100. A jornada padrão deve
  ser finita, maior que zero e até 24h. O backend valida o campo `estagiario` como
  booleano.

## 2. Previsão automática

O responsável pode ser salvo antes de iniciar a atividade. Para salvar o status
**Em Andamento**, são necessários data de início válida, responsável ativo e
esforço total positivo na solicitação. O backend calcula a previsão; uma previsão
manual enviada pelo cliente não substitui esse cálculo.

### Distribuição do esforço

1. Calcular a capacidade individual para projetos.
2. Percorrer o calendário a partir do início informado, incluindo esse dia quando
   útil. Considerar segunda a sexta e excluir as férias cadastradas, incluindo
   suas datas inicial e final.
3. Descontar as reservas fixas do dia: alocações avulsas e de atividades ainda não
   iniciadas. Sem horas informadas, a reserva consome toda a capacidade.
4. Dividir igualmente a capacidade restante entre as atividades em andamento que
   já começaram. Horas diárias informadas na alocação vinculada funcionam como teto.
5. Redistribuir as horas que sobram quando uma atividade atinge seu teto ou termina,
   inclusive dentro do mesmo dia.
6. Registrar como previsão o dia em que todo o esforço da atividade foi distribuído.

Exemplo: com 50% de alocação, um estagiário dispõe de 3h/dia. Uma atividade de 12h
iniciada na segunda-feira, sem reservas ou férias, termina na quinta-feira. Duas
atividades de 12h iniciadas juntas dividem a capacidade e levam oito dias úteis.

O cálculo trata precisão decimal para evitar acrescentar um dia indevido e limita
a busca a 36.600 dias, retornando erro se não conseguir projetar a conclusão.

### Eventos que recalculam previsões

| Alteração | Efeito |
|---|---|
| Início, status ou responsável no backlog | Recalcula as atividades dos responsáveis anterior e atual e sincroniza alocações. |
| Criação, edição ou exclusão de alocação | Recalcula a capacidade afetada. |
| Criação, edição ou exclusão de férias | Recalcula as atividades do colaborador. |
| Identificação de estagiário ou ativação/inativação | Recalcula as atividades do colaborador. |
| Jornada padrão ou percentual de projetos | Recalcula as atividades de todos os colaboradores. |
| Análise por IA ou recálculo do esforço | Atualiza esforço, score e previsões usando a mesma transação para a gravação. |
| Exclusão em lote do backlog | Remove as alocações vinculadas e recalcula o planejamento. |

## 3. Data de conclusão

- A coluna **CONCLUSÃO** aparece no backlog para desktop e celular; a informação
  também aparece no detalhe da atividade.
- A transição para **Concluído** preenche `dataConclusao` com a data civil de
  `America/Sao_Paulo`.
- Salvar novamente um item já concluído preserva a data. Reabrir limpa a data;
  concluir novamente registra a nova conclusão.
- A conclusão não pode ser anterior ao início informado.
- A alocação existente do responsável tem seu fim ajustado à conclusão. Atividades
  concluídas com início e conclusão registrados participam da ocupação histórica,
  sem consumir capacidade após a conclusão.

## 4. Alocações, datas e consistência

- O formulário de alocação mostra jornada, capacidade e disponibilidade do
  colaborador. O backend é a referência final para a previsão em atividades em
  andamento.
- Horas de uma alocação devem ser positivas e não superar a capacidade individual.
  Reservas fixas não podem exceder a capacidade acumulada do dia nem coincidir com
  férias em dias úteis.
- O salvamento reutiliza a alocação vinculada ao backlog e mantém um responsável
  por atividade, evitando duplicação.
- Para excluir ou desvincular uma alocação de atividade em andamento, é necessário
  alterar primeiro o responsável ou status pelo backlog.
- As listagens de alocações incluem todos os intervalos que cruzam o período
  consultado, inclusive reservas que começam antes e terminam depois dele.
- As datas civis são normalizadas em UTC. Férias legadas armazenadas ao meio-dia
  continuam sendo comparadas por dia, sem deslocamento de calendário.
- As operações de planejamento usam transações serializáveis, com até duas novas
  tentativas para conflitos Prisma `P2034`, espera de até 10s e timeout de 30s.
  Falhas na transação revertem suas gravações. A atualização do backlog registra
  auditoria dentro da mesma transação.

## 5. Migration e compatibilidade

Arquivo: [`20260915120000_capacity_forecast_completion/migration.sql`](../prisma/migrations/20260915120000_capacity_forecast_completion/migration.sql).

| Entidade | Campo/relação | Tratamento dos dados existentes |
|---|---|---|
| `Funcionario` | `estagiario Boolean @default(false)` | Todos começam com jornada padrão; a identificação de estagiário deve ser feita no cadastro. |
| `BacklogItem` | `responsavelId String?` e relação com `Funcionario` | Preserva o colaborador da primeira alocação, ordenada por `createdAt` e `id`. Sem alocação, permanece vazio. |
| `BacklogItem` | `dataConclusao DateTime?` | Conclusões antigas ficam vazias, sem inferência a partir de `updatedAt`. |
| `Funcionario` | Relação inversa `atividades` | Permite consultar as atividades pelas quais o colaborador é responsável. |

A chave estrangeira de responsável usa `ON DELETE SET NULL` e `ON UPDATE CASCADE`.
A migration acrescenta campos e preenche responsáveis; não remove tabelas nem
recalcula automaticamente todas as previsões antigas. Os recálculos acontecem nos
eventos descritos acima. Atividades em andamento com dados incompletos perdem a
previsão quando processadas; é preciso informar os dados de planejamento.

## 6. Inventário dos arquivos alterados

Os caminhos abaixo são relativos à raiz do repositório.

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` | Novos campos e relações de jornada, responsável e conclusão. |
| `prisma/migrations/20260915120000_capacity_forecast_completion/migration.sql` | DDL, preenchimento de responsáveis e chave estrangeira. |
| `src/lib/services/capacity.ts` | Funções de datas civis, capacidade individual, conclusão e distribuição diária do esforço. |
| `src/lib/services/scheduling.ts` | Transações de planejamento, recálculo e sincronização de alocações. |
| `src/lib/services/allocation.ts` | Validação e salvamento centralizado das alocações. |
| `src/lib/services/prioritization.ts` | Integra recálculo de esforço/score à transação e às previsões. |
| `src/app/api/backlog/route.ts` | Retorna responsável persistente; exclusão em lote remove reservas e recalcula. |
| `src/app/api/backlog/[id]/route.ts` | Valida transições, persiste responsável, calcula previsão e conclusão, sincroniza e audita. |
| `src/app/api/alocacoes/route.ts` | Corrige filtro de interseção de datas e usa salvamento centralizado. |
| `src/app/api/alocacoes/[id]/route.ts` | Atualização centralizada, proteção de exclusão e recálculo. |
| `src/app/api/funcionarios/route.ts` | Aceita e valida identificação de estagiário na criação. |
| `src/app/api/funcionarios/[id]/route.ts` | Atualiza jornada/atividade, recalcula e limpa previsão ao excluir responsável de item em andamento. |
| `src/app/api/ferias/route.ts` | Valida datas civis e recalcula após criação. |
| `src/app/api/ferias/[id]/route.ts` | Valida o intervalo completo na edição parcial e recalcula após edição/exclusão. |
| `src/app/api/parametrizacao/alocacao-config/route.ts` | Retorna jornada de estagiário, valida parâmetros e recalcula em transação. |
| `src/app/api/solicitacoes/[id]/analisar/route.ts` | Integra resultado da IA ao recálculo transacional do backlog. |
| `src/app/api/solicitacoes/[id]/recalcular/route.ts` | Atualiza critérios, esforço, score e previsão em transação. |
| `src/app/alocacao/funcionarios/page.tsx` | Opção Estagiário no formulário e jornada na listagem. |
| `src/app/alocacao/page.tsx` | Capacidade individual, férias e reservas na disponibilidade; previsão automática para atividades em andamento. |
| `src/app/backlog/page.tsx` | Previsão sem edição manual, conclusão no desktop/celular e identificação do responsável. |
| `src/app/backlog/[id]/page.tsx` | Edição de início/responsável e exibição de previsão/conclusão. |
| `src/app/parametrizacao/page.tsx` | Jornadas, exemplos de capacidade e link para cadastro de estagiários. |
| `src/app/manual/page.tsx` | Instruções atualizadas e correção de aspas no JSX. |
| `src/__tests__/capacity.test.ts` | Testes puros de calendário, capacidade, reservas, paralelismo e conclusão. |
| `src/__tests__/backlog-scheduling.test.ts` | Testes da API e serviços com adaptador de banco em memória, rollback e concorrência. |
| `.gitignore` | Exclui cópias locais antigas da configuração Vercel (`.vercel.*`). |
| `README.md` | Regras funcionais, orientação de migration e índice de documentação. |
| `docs/SISTEMA.md` | Atualiza modelo, regras e procedimento de publicação. |
| `docs/ALTERACOES-2026-09-15.md` | Este inventário funcional e técnico. |
| `docs/RETOMADA.md` | Estado recuperado, validações e registro da publicação. |

## 7. Validação e limites

Em 15/09/2026, foram aprovados **75 testes em 6 suítes**, incluindo **37 testes
novos** de capacidade e planejamento. Também passaram Prisma generate/validate,
TypeScript sem emissão, ESLint dos arquivos alterados, `git diff --check` e build
de produção local. A conferência visual anterior usou dados simulados. Os testes
de integração usam adaptador em memória; não representam testes de escrita em
produção. O resultado da publicação é registrado em [RETOMADA.md](RETOMADA.md).

Limites conhecidos:

- Feriados não são descontados, pois não há cadastro de feriados.
- O cálculo parte do esforço total e do início informado; não há apontamento de
  horas realizadas nem cálculo de esforço restante a partir da execução real.
- As demandas em andamento compartilham capacidade igualmente, respeitando os
  tetos informados; a posição de priorização não determina essa divisão.
- Datas históricas de conclusão não são preenchidas automaticamente.
- O build local emitiu um aviso de múltiplos arquivos de lock no ambiente Windows,
  sem impedir a compilação.

## 8. Operação após a publicação

1. Identificar os estagiários existentes em Alocação → Colaboradores.
2. Conferir jornada padrão e percentual em Parametrização → Alocação em Projetos.
3. Ao iniciar uma atividade, informar início e responsável e conferir a previsão
   retornada pelo sistema.
4. Ao concluir, conferir a data na coluna CONCLUSÃO.

A migration é aditiva. Se for necessário reverter a aplicação, restaurar a versão
anterior na Vercel e manter os campos adicionados; apagar as colunas eliminaria
os novos dados. Depois da publicação, qualquer reversão deve considerar as
alterações operacionais que já tenham sido feitas pelos usuários.

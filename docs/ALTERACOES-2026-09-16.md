# Manual operacional e recálculo de capacidade — 16/09/2026

## Solicitação e escopo

Atualizar o Manual do Usuário disponível no sistema com os fluxos atuais e aplicar
a regra de capacidade às atividades que já estavam em andamento. O usuário
confirmou que a atividade concluída do Alysson deve preservar seu histórico.

## Manual do Usuário

Arquivo: `src/app/manual/page.tsx`; acesso pelo menu **Manual do Usuário** (`/manual`).

- Índice com atalhos e data de atualização em 16/09/2026.
- Ordem manual do backlog, relação entre posição e score, cinco primeiras posições
  e repriorização por arraste com solicitante, justificativa e responsável.
- Diferença entre Esforço, Início, Previsão e CONCLUSÃO.
- Passos para salvar responsável antes do início, iniciar, acompanhar, concluir,
  cancelar e reabrir uma demanda; requisitos para a previsão automática.
- Revisão de critérios, Recalcular esforço, Reestimar com IA e edição de ganho/premissa.
- Parametrização de jornada e percentual, com exemplos de 6,4h/dia e 4,8h/dia.
- Cadastro de estagiários: a opção deve ser marcada, independentemente do texto
  do campo Cargo; salvar a opção recalcula as atividades em andamento.
- Reservas fixas, limites de horas, divisão da capacidade, troca de responsável,
  férias e sincronização de alocações.
- Conclusão automática, reabertura e preservação dos registros antigos.
- Fórmulas de capacidade e conversão do ganho de horas pelo valor hora.
- Fluxo recomendado atualizado, permissões operacionais e dúvidas de recálculo.
- Ajustes de disposição no celular e de navegação por âncoras para evitar que o
  botão do menu cubra o título da seção. A impressão permanece disponível.

O manual distingue o recálculo de **previsão** da reestimativa de **esforço**:
alterar a jornada não muda as horas estimadas da demanda. Também explica que
feriados e horas já realizadas não são deduzidos automaticamente.

## Diagnóstico e correção no banco

A parametrização encontrada foi **8h/dia e 80% para projetos**. Alysson Alves e
João Xavier já possuíam o cargo **Estagiário**, mas tinham `estagiario = false`,
o valor inicial dos cadastros anteriores à migration. Ambos foram identificados
como estagiários, com capacidade de **6h × 80% = 4,8h/dia**.

Foram recalculadas as duas atividades em andamento presentes no banco:

| Atividade | Responsável | Esforço preservado | Previsão anterior | Previsão após recálculo |
|---|---|---|---|---|
| Ajustes para publicação da v1 de 26/27 | João Xavier | 40h | 16/09/2026 | **18/09/2026** |
| Automatização da alteração de data de vencimento de boletos no TOTVS | Sara Batista | 60h | 21/09/2026 | **21/09/2026** |

As datas finais das alocações vinculadas foram conferidas e correspondem às
previsões. As datas de início, responsáveis, status e esforço foram preservados.

A atividade **Alteração dos SLAs de Serviços de Manutenção no Processo de Compras**,
do Alysson, já estava **Concluída**. Conforme a confirmação do usuário, manteve:

- Início em 08/09/2026, previsão histórica em 14/09/2026 e esforço de 20h.
- Conclusão histórica vazia, sem inferência de uma data.
- O registro da atividade sem alteração; `updatedAt` continua em 10/09/2026.

O recálculo não reabriu atividades concluídas. A correção da jornada do Alysson
será considerada em suas próximas atividades.

## Execução e auditoria

Foi incluído `scripts/reproject-active-backlog.ts`, que reutiliza o serviço de
planejamento da aplicação. O comando opera sobre as atividades **Em Andamento**
existentes no momento da transação.

- O modo padrão é prévia: simula as alterações dentro de uma transação e reverte
  todas as gravações ao final.
- `--intern-id ID` permite indicar explicitamente um colaborador já cadastrado
  com cargo de estagiário. O comando exige cadastro ativo e valida o cargo antes
  de marcar a opção; não classifica automaticamente outros cargos.
- `--apply` grava as alterações e exige `--actor` e `--reason` para auditoria.
- Dados incompletos em uma atividade em andamento interrompem e revertem o lote.
- A operação usa transação serializável e repete conflitos `P2034` até duas vezes.
- O comando verifica a preservação de status, início, conclusão, esforço e
  responsável, sincronizando previsão e alocações pelo serviço existente.
- A auditoria dos itens alterados registra as previsões e alocações anteriores e
  posteriores. Apenas diferenças são incluídas nesses registros.

Exemplo de prévia de recálculo com os cadastros atuais:

```powershell
npx tsx scripts/reproject-active-backlog.ts
```

Para incluir uma identificação de estagiário confirmada, acrescentar
`--intern-id <id-do-colaborador>`. A gravação usa:

```powershell
npx tsx scripts/reproject-active-backlog.ts --apply --actor <email-do-responsavel> --reason "Motivo do recálculo"
```

O comando usa `DIRECT_URL`, quando disponível, ou `DATABASE_URL` do ambiente.
Não executa migrations nem altera os parâmetros globais de jornada/percentual.

A aplicação em produção ocorreu em **16/09/2026**, com registros de auditoria
entre **17:15:01 e 17:15:04 UTC** (14:15 em São Paulo): dois registros de
`Funcionario` e um de `BacklogItem`, todos com origem `reproject-active-backlog`.

## Validação

- Prévia executada e ausência de persistência confirmada antes da aplicação.
- Gravação transacional concluída; dois cadastros de estagiário e três registros
  de auditoria confirmados em leitura posterior.
- Previsões e datas finais das duas alocações conferidas após a gravação.
- Atividade concluída do Alysson e alocações históricas preservadas.
- TypeScript, ESLint dos arquivos alterados e 75 testes em seis suítes aprovados.
- Build Next.js aprovado; manual conferido em renderização local para desktop
  e celular. O navegador integrado não conectou, então foi usado Edge local com
  perfil temporário e a página gerada pelo build.

Não há nova migration nesta atualização. O registro de publicação é mantido em
[RETOMADA.md](RETOMADA.md).

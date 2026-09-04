ALTER TABLE "backlog_items" ADD COLUMN "posicaoManual" INTEGER;

CREATE INDEX "backlog_items_posicaoManual_idx" ON "backlog_items"("posicaoManual");

CREATE TABLE "backlog_reprioritizacoes" (
    "id" TEXT NOT NULL,
    "backlogItemId" TEXT NOT NULL,
    "posicaoAnterior" INTEGER,
    "posicaoNova" INTEGER NOT NULL,
    "solicitantePriorizacao" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "responsavelRepriorizacao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backlog_reprioritizacoes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "backlog_reprioritizacoes"
ADD CONSTRAINT "backlog_reprioritizacoes_backlogItemId_fkey"
FOREIGN KEY ("backlogItemId") REFERENCES "backlog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (ORDER BY "scorePriorizacao" DESC, "createdAt" ASC) AS position
    FROM "backlog_items"
    WHERE "status" NOT IN ('CONCLUIDO', 'CANCELADO')
)
UPDATE "backlog_items"
SET "posicaoManual" = ranked.position
FROM ranked
WHERE "backlog_items"."id" = ranked."id";

ALTER TABLE "funcionarios" ADD COLUMN "estagiario" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "backlog_items" ADD COLUMN "dataConclusao" TIMESTAMP(3), ADD COLUMN "responsavelId" TEXT;

-- Preserve the collaborator already associated with each existing activity.
UPDATE "backlog_items" b
SET "responsavelId" = (
  SELECT a."funcionarioId" FROM "alocacoes" a
  WHERE a."backlogItemId" = b."id"
  ORDER BY a."createdAt", a."id" LIMIT 1
);

ALTER TABLE "backlog_items" ADD CONSTRAINT "backlog_items_responsavelId_fkey"
FOREIGN KEY ("responsavelId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Historic completion dates cannot be inferred reliably from updatedAt.
-- They remain empty until an actual transition to CONCLUIDO is recorded.

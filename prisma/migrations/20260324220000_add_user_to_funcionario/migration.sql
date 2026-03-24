ALTER TABLE "funcionarios" ADD COLUMN "userId" TEXT;
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "funcionarios_userId_key" ON "funcionarios"("userId");

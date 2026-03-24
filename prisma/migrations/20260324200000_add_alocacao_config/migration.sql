CREATE TABLE "alocacao_config" (
    "id" TEXT NOT NULL,
    "percentualAlocacao" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "horasDiarias" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "alocacao_config_pkey" PRIMARY KEY ("id")
);

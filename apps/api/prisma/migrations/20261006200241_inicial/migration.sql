-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nome" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resposta" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "questao_id" INTEGER NOT NULL,
    "resposta" TEXT NOT NULL,
    "tipo_item" TEXT NOT NULL,
    "gabarito_status" TEXT NOT NULL,
    "resposta_correta" TEXT,
    "gabarito_versao" TEXT,
    "pontuavel" BOOLEAN NOT NULL,
    "correta" BOOLEAN,
    "respondida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resposta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "resposta_usuario_id_respondida_em_idx" ON "resposta"("usuario_id", "respondida_em");

-- CreateIndex
CREATE INDEX "resposta_usuario_id_questao_id_idx" ON "resposta"("usuario_id", "questao_id");

-- AddForeignKey
ALTER TABLE "resposta" ADD CONSTRAINT "resposta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

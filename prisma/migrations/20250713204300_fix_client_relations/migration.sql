-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,
    "domain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "permissoes" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipe" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "vitorias" INTEGER NOT NULL DEFAULT 0,
    "empates" INTEGER NOT NULL DEFAULT 0,
    "derrotas" INTEGER NOT NULL DEFAULT 0,
    "golsMarcados" INTEGER NOT NULL DEFAULT 0,
    "golsSofridos" INTEGER NOT NULL DEFAULT 0,
    "escudoUrl" TEXT,
    "public_id" TEXT,
    "grupoId" INTEGER,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "Equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jogos" (
    "id" SERIAL NOT NULL,
    "equipeAId" INTEGER NOT NULL,
    "equipeBId" INTEGER NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "rodada" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "placarA" INTEGER,
    "placarB" INTEGER,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jogos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jogadores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "posicao" TEXT NOT NULL,
    "idade" INTEGER,
    "altura" DOUBLE PRECISION,
    "peso" DOUBLE PRECISION,
    "fotoUrl" TEXT,
    "public_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "equipeId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jogadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_jogo" (
    "id" SERIAL NOT NULL,
    "jogoId" INTEGER NOT NULL,
    "jogadorId" INTEGER NOT NULL,
    "equipeId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "minuto" INTEGER NOT NULL,
    "detalhes" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_jogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Client_domain_key" ON "Client"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_nome_clientId_key" ON "Grupo"("nome", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipe_nome_clientId_key" ON "Equipe"("nome", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "jogadores_equipeId_numero_clientId_key" ON "jogadores"("equipeId", "numero", "clientId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipe" ADD CONSTRAINT "Equipe_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipe" ADD CONSTRAINT "Equipe_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jogos" ADD CONSTRAINT "jogos_equipeAId_fkey" FOREIGN KEY ("equipeAId") REFERENCES "Equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jogos" ADD CONSTRAINT "jogos_equipeBId_fkey" FOREIGN KEY ("equipeBId") REFERENCES "Equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jogos" ADD CONSTRAINT "jogos_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jogos" ADD CONSTRAINT "jogos_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jogadores" ADD CONSTRAINT "jogadores_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jogadores" ADD CONSTRAINT "jogadores_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_jogo" ADD CONSTRAINT "eventos_jogo_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "jogos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_jogo" ADD CONSTRAINT "eventos_jogo_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "jogadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_jogo" ADD CONSTRAINT "eventos_jogo_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_jogo" ADD CONSTRAINT "eventos_jogo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

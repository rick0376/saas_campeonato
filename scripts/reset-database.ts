//npx ts-node scripts/reset-database.ts

import { prisma } from "../lib/prisma";

async function main() {
  console.log("🚨 RESETANDO BANCO DE DADOS...");

  try {
    // Deletar tudo em ordem (devido às foreign keys)
    console.log("🗑️ Removendo jogos...");
    await prisma.jogo.deleteMany({});

    console.log("🗑️ Removendo equipes...");
    await prisma.equipe.deleteMany({});

    console.log("🗑️ Removendo grupos...");
    await prisma.grupo.deleteMany({});

    console.log("🗑️ Removendo usuários...");
    await prisma.user.deleteMany({});

    console.log("🗑️ Removendo clientes...");
    await prisma.client.deleteMany({});

    console.log("✅ Banco resetado completamente!");
    console.log("📝 Todas as tabelas estão vazias agora.");
  } catch (error) {
    console.error("❌ Erro durante o reset:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("🎯 Reset concluído com sucesso!");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Erro ao resetar banco:", e);
    process.exit(1);
  });

import { prisma } from "../lib/prisma";

async function main() {
  console.log("🚀 Criando clientes de teste...");

  // Limpar clientes existentes (opcional)
  await prisma.client.deleteMany({});

  // Criar clientes de exemplo
  const clientes = [
    {
      name: "Campeonato Municipal",
      slug: "municipal",
      description: "Campeonato de futebol da cidade",
      // ✅ CORRIGIDO: Remover status ou usar enum correto
      // status: "ACTIVE",  // ❌ Remover esta linha
      logo: null,
    },
    {
      name: "Liga Empresarial",
      slug: "empresarial",
      description: "Torneio entre empresas locais",
      // status: "ACTIVE",  // ❌ Remover esta linha
      logo: null,
    },
    {
      name: "Copa Universitária",
      slug: "universitaria",
      description: "Competição entre universidades",
      // status: "ACTIVE",  // ❌ Remover esta linha
      logo: null,
    },
  ];

  for (const cliente of clientes) {
    const clienteCriado = await prisma.client.create({
      data: cliente,
    });

    console.log(
      `✅ Cliente criado: ${clienteCriado.name} (ID: ${clienteCriado.id})`
    );
  }

  console.log("🎉 Clientes de teste criados com sucesso!");
  console.log("");
  console.log("📋 Próximos passos:");
  console.log("1. Acesse http://localhost:3000");
  console.log("2. Clique em um dos cards de cliente");
  console.log("3. Faça login com: admin@lhp.com / admin123");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erro ao criar clientes:", e);
    process.exit(1);
  });

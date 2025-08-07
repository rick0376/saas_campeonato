const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Buscar um cliente existente
  const cliente = await prisma.client.findFirst();

  if (!cliente) {
    console.log("❌ Nenhum cliente encontrado. Crie um cliente primeiro.");
    return;
  }

  console.log("✅ Cliente encontrado:", cliente.name);

  // Criar senha hash
  const hashedPassword = await bcrypt.hash("123456", 10);

  // Criar usuários de teste
  const usersToCreate = [
    {
      name: "João Silva",
      email: "joao@test.com",
      password: hashedPassword,
      role: "user",
      clientId: cliente.id,
      permissoes: null,
    },
    {
      name: "Maria Santos",
      email: "maria@test.com",
      password: hashedPassword,
      role: "user",
      clientId: cliente.id,
      permissoes: null,
    },
    {
      name: "Pedro Admin",
      email: "pedro@test.com",
      password: hashedPassword,
      role: "admin",
      clientId: cliente.id,
      permissoes: null,
    },
    {
      name: "Ana Moderadora",
      email: "ana@test.com",
      password: hashedPassword,
      role: "user",
      clientId: cliente.id,
      permissoes: JSON.stringify({
        equipes: {
          visualizar: true,
          criar: true,
          editar: true,
          excluir: false,
          exportar: true,
        },
        jogadores: {
          visualizar: true,
          criar: true,
          editar: false,
          excluir: false,
          exportar: false,
        },
      }),
    },
  ];

  for (const userData of usersToCreate) {
    try {
      // Verificar se usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⚠️ Usuário já existe: ${userData.email}`);
        continue;
      }

      const user = await prisma.user.create({
        data: userData,
      });

      console.log(`✅ Usuário criado: ${user.name} (${user.email})`);
    } catch (error) {
      console.error(
        `❌ Erro ao criar usuário ${userData.email}:`,
        error.message
      );
    }
  }

  console.log("\n🎉 Usuários de teste criados com sucesso!");
  console.log("📝 Credenciais para teste:");
  console.log(
    "   Email: joao@test.com | maria@test.com | pedro@test.com | ana@test.com"
  );
  console.log("   Senha: 123456");
}

main()
  .catch((e) => {
    console.error("❌ Erro geral:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

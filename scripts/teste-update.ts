import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const id = "cmdyp4b7h000b0go880e9a0j7"; // coloque aqui o ID do usuário que deseja atualizar

  const updated = await prisma.user.update({
    where: { id },
    data: { role: "admin" }, // atualiza para admin
  });

  console.log("Usuário atualizado:", updated);
}

main()
  .catch((e) => {
    console.error("Erro no update:", e);
  })
  .finally(() => prisma.$disconnect());

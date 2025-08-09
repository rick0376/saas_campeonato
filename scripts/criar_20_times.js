const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 👇 troque para o clientId real existente no seu banco
const CLIENT_ID = "cme1szt1y0000l804tg566lk6";
// opcional: se quiser vincular a um grupo específico, coloque o ID aqui
const GRUPO_ID = null;

async function main() {
  const times = Array.from({ length: 20 }, (_, i) => ({
    nome: `Time ${i + 1}`,
    pontos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsMarcados: 0,
    golsSofridos: 0,
    escudoUrl: null,
    public_id: null,
    clientId: CLIENT_ID,
    grupoId: GRUPO_ID,
  }));

  const result = await prisma.equipe.createMany({
    data: times,
    skipDuplicates: true, // evita erro se nome já existe para o mesmo clientId
  });

  console.log(`✅ ${result.count} times cadastrados com sucesso!`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao criar times:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

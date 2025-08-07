import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = await getToken({ req });

  if (!token || token.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }

  if (req.method === "POST") {
    try {
      const equipes = await prisma.equipe.findMany();

      for (const equipe of equipes) {
        const jogos = await prisma.jogo.findMany({
          where: {
            OR: [{ equipeAId: equipe.id }, { equipeBId: equipe.id }],
            AND: [{ placarA: { not: null } }, { placarB: { not: null } }],
          },
        });

        let vitorias = 0;
        let empates = 0;
        let derrotas = 0;
        let golsMarcados = 0;
        let golsSofridos = 0;

        jogos.forEach((jogo) => {
          const isEquipeA = jogo.equipeAId === equipe.id;
          const golsPro = isEquipeA ? jogo.placarA! : jogo.placarB!;
          const golsContra = isEquipeA ? jogo.placarB! : jogo.placarA!;

          golsMarcados += golsPro;
          golsSofridos += golsContra;

          if (golsPro > golsContra) {
            vitorias++;
          } else if (golsPro === golsContra) {
            empates++;
          } else {
            derrotas++;
          }
        });

        const pontos = vitorias * 3 + empates * 1;

        await prisma.equipe.update({
          where: { id: equipe.id },
          data: {
            pontos,
            vitorias,
            empates,
            derrotas,
            golsMarcados,
            golsSofridos,
          },
        });
      }

      return res
        .status(200)
        .json({ message: "Estatísticas recalculadas com sucesso" });
    } catch (error) {
      console.error("Erro ao recalcular estatísticas:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    } finally {
      await prisma.$disconnect();
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}

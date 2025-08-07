import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { prisma } from "../../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const equipes = await prisma.equipe.findMany({
        where: { grupoId: Number(id) },
        orderBy: [
          { pontos: "desc" },
          { vitorias: "desc" },
          { golsMarcados: "desc" },
          { nome: "asc" },
        ],
        select: {
          id: true,
          nome: true,
          pontos: true,
          vitorias: true,
          empates: true,
          derrotas: true,
          golsMarcados: true,
          golsSofridos: true,
          escudoUrl: true,
        },
      });

      return res.status(200).json(equipes);
    } catch (error) {
      console.error("Erro ao buscar equipes:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}

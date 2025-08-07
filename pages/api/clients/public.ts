import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const clients = await prisma.client.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        description: true,
        _count: {
          select: {
            grupos: true,
            users: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json(clients);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}

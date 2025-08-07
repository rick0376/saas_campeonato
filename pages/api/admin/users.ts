import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const userSession = session.user as any;

  if (userSession.role !== "admin") {
    return res.status(401).json({ message: "Acesso negado" });
  }

  if (req.method === "GET") {
    try {
      let users;

      // Verificar se é Super Admin
      const clientId = userSession.clientId;
      const isSuperAdmin =
        clientId === null || clientId === undefined || clientId === "undefined";

      if (isSuperAdmin) {
        // Super Admin vê todos os usuários
        users = await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            clientId: true,
            permissoes: true,
            client: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        });
      } else {
        // Admin de cliente vê apenas usuários do seu cliente
        users = await prisma.user.findMany({
          where: {
            clientId: clientId,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            clientId: true,
            permissoes: true,
            client: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        });
      }

      res.status(200).json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  } else {
    res.status(405).json({ message: "Método não permitido" });
  }
}

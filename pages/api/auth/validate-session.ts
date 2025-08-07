import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./[...nextauth]";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const user = session.user as any;

    // Verificar se o usuário ainda existe
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        clientId: true,
        permissoes: true,
        updatedAt: true,
      },
    });

    if (!currentUser) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    // ✅ NOVO: Verificar se as permissões foram atualizadas
    const sessionTime = new Date(user.iat * 1000); // Timestamp da sessão
    const userUpdatedTime = new Date(currentUser.updatedAt);

    if (userUpdatedTime > sessionTime) {
      console.log(
        `🔄 Permissões atualizadas para ${currentUser.email} - invalidando sessão`
      );
      return res.status(401).json({
        message: "Sessão expirada devido à atualização de permissões",
        reason: "permissions-updated",
      });
    }

    res.status(200).json({
      valid: true,
      user: currentUser,
    });
  } catch (error) {
    console.error("Erro ao validar sessão:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}

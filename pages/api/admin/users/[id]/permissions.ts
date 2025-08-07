import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]";
import { prisma } from "../../../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const userSession = session.user as any;
  const { id } = req.query;

  if (userSession.role !== "admin") {
    return res.status(401).json({ message: "Acesso negado" });
  }

  if (req.method === "GET") {
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: id as string },
        select: {
          id: true,
          clientId: true,
          name: true,
          email: true,
          permissoes: true,
        },
      });

      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const clientId = userSession.clientId;
      const isSuperAdmin =
        clientId === null || clientId === undefined || clientId === "undefined";

      if (!isSuperAdmin && targetUser.clientId !== userSession.clientId) {
        return res
          .status(403)
          .json({ message: "Sem permissão para acessar este usuário" });
      }

      res.status(200).json(targetUser);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  } else if (req.method === "PUT") {
    try {
      const { permissoes } = req.body;

      const targetUser = await prisma.user.findUnique({
        where: { id: id as string },
        select: { id: true, clientId: true, email: true, name: true },
      });

      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const clientId = userSession.clientId;
      const isSuperAdmin =
        clientId === null || clientId === undefined || clientId === "undefined";

      if (!isSuperAdmin && targetUser.clientId !== userSession.clientId) {
        return res
          .status(403)
          .json({ message: "Sem permissão para editar este usuário" });
      }

      // ✅ NOVO: Atualizar permissões e timestamp para invalidar sessões
      const updatedUser = await prisma.user.update({
        where: { id: id as string },
        data: {
          permissoes: permissoes,
          updatedAt: new Date(), // ← Força novo timestamp
        },
        select: {
          id: true,
          name: true,
          email: true,
          permissoes: true,
        },
      });

      // ✅ NOVO: Invalidar sessões existentes do usuário (se tabela existir)
      try {
        await prisma.session.deleteMany({
          where: {
            userId: id as string,
          },
        });
        console.log(`🔄 Sessões invalidadas para usuário: ${targetUser.email}`);
      } catch (sessionError) {
        console.log(
          "⚠️ Aviso: Tabela Session não encontrada (NextAuth em JWT mode)"
        );
      }

      console.log(`✅ Permissões atualizadas para: ${targetUser.email}`);

      res.status(200).json({
        ...updatedUser,
        message:
          "Permissões atualizadas com sucesso. Usuário será desconectado automaticamente.",
      });
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  } else {
    res.status(405).json({ message: "Método não permitido" });
  }
}

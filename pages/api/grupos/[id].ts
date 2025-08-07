import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Use getToken em vez de getSession
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return res.status(401).json({ error: "Token não encontrado" });
    }

    // ✅ CORREÇÃO: Permitir admin e user
    if (!token.role || (token.role !== "admin" && token.role !== "user")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { id } = req.query;

    if (req.method === "GET") {
      // ✅ CORREÇÃO: Filtrar por clientId para multi-tenant
      const grupo = await prisma.grupo.findFirst({
        where: {
          id: Number(id),
          // Filtro multi-tenant
          ...(token.clientId &&
          token.clientId !== "undefined" &&
          token.clientId !== "null"
            ? { clientId: token.clientId as string }
            : {}),
        },
        include: {
          _count: {
            select: { equipes: true },
          },
        },
      });

      if (!grupo) {
        return res.status(404).json({ error: "Grupo não encontrado" });
      }

      return res.status(200).json(grupo);
    }

    if (req.method === "PATCH") {
      const { nome } = req.body;

      if (!nome || !nome.trim()) {
        return res.status(400).json({ error: "Nome do grupo é obrigatório" });
      }

      // ✅ CORREÇÃO: Verificar se o grupo existe e pertence ao cliente
      const grupoExistente = await prisma.grupo.findFirst({
        where: {
          id: Number(id),
          // Filtro multi-tenant
          ...(token.clientId &&
          token.clientId !== "undefined" &&
          token.clientId !== "null"
            ? { clientId: token.clientId as string }
            : {}),
        },
      });

      if (!grupoExistente) {
        return res.status(404).json({ error: "Grupo não encontrado" });
      }

      const grupo = await prisma.grupo.update({
        where: { id: Number(id) },
        data: {
          nome: nome.trim().toUpperCase(),
        },
        include: {
          _count: {
            select: { equipes: true },
          },
        },
      });

      return res.status(200).json(grupo);
    }

    if (req.method === "DELETE") {
      // ✅ CORREÇÃO: Verificar se o grupo existe e pertence ao cliente
      const grupo = await prisma.grupo.findFirst({
        where: {
          id: Number(id),
          // Filtro multi-tenant
          ...(token.clientId &&
          token.clientId !== "undefined" &&
          token.clientId !== "null"
            ? { clientId: token.clientId as string }
            : {}),
        },
        include: { _count: { select: { equipes: true } } },
      });

      if (!grupo) {
        return res.status(404).json({ error: "Grupo não encontrado" });
      }

      // Remove as equipes do grupo (define grupoId como null)
      if (grupo._count.equipes > 0) {
        await prisma.equipe.updateMany({
          where: { grupoId: Number(id) },
          data: { grupoId: null },
        });
      }

      // Exclui o grupo
      await prisma.grupo.delete({
        where: { id: Number(id) },
      });

      return res.status(200).json({ message: "Grupo excluído com sucesso" });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error("Erro na API:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

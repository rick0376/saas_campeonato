import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // ✅ CORREÇÃO: Usar getToken para consistência
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

    // ✅ CORREÇÃO: Adicionar método GET para carregar grupos
    if (req.method === "GET") {
      try {
        // Obter clientId da query (frontend pode enviar clientId no query)
        const clientIdRaw = req.query.clientId;
        const clientId =
          typeof clientIdRaw === "string" && clientIdRaw.trim() !== ""
            ? clientIdRaw
            : token.clientId;

        const grupos = await prisma.grupo.findMany({
          where: {
            ...(clientId && clientId !== "undefined" && clientId !== "null"
              ? { clientId }
              : {}),
          },
          orderBy: { nome: "asc" },
          include: {
            _count: {
              select: { equipes: true },
            },
          },
        });

        return res.status(200).json(grupos);
      } catch (error) {
        console.error("Erro ao buscar grupos:", error);
        return res.status(500).json({ error: "Erro ao buscar grupos" });
      }
    }
    // ✅ CORREÇÃO: Método POST corrigido
    if (req.method === "POST") {
      const { nome } = req.body;

      if (!nome) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      try {
        // ✅ CORREÇÃO: Verificar se é Super Admin
        const isSuperAdmin =
          token.role === "admin" &&
          (token.clientId === null ||
            token.clientId === undefined ||
            token.clientId === "undefined" ||
            token.clientId === "null");

        if (isSuperAdmin) {
          // ✅ CORREÇÃO: Super Admin não pode criar grupos
          return res.status(403).json({
            error:
              "Super Admin não pode criar grupos. Faça login como cliente.",
          });
        }

        // ✅ CORREÇÃO: Verificar se já existe grupo com este nome no cliente
        const grupoExistente = await prisma.grupo.findFirst({
          where: {
            nome: {
              equals: nome.trim().toUpperCase(),
              mode: "insensitive",
            },
            clientId: token.clientId as string,
          },
        });

        if (grupoExistente) {
          return res.status(409).json({
            error: "Já existe um grupo com este nome",
          });
        }

        // ✅ CORREÇÃO: Criar grupo com clientId
        const grupo = await prisma.grupo.create({
          data: {
            nome: nome.trim().toUpperCase(),
            clientId: token.clientId as string,
          },
          include: {
            _count: {
              select: { equipes: true },
            },
          },
        });

        return res.status(201).json(grupo);
      } catch (error) {
        console.error("Erro ao criar grupo:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
      }
    }

    // ✅ CORREÇÃO: Métodos permitidos
    res.setHeader("Allow", ["GET", "POST"]);
    return res
      .status(405)
      .json({ error: `Método ${req.method} não permitido` });
  } catch (error) {
    console.error("Erro na API:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

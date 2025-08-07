import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const token = await getToken({ req });

  if (!token) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  // Verificar se usuário tem clientId válido
  const hasClientId =
    token.clientId &&
    token.clientId !== "undefined" &&
    token.clientId !== "null";

  // Verificar se é Super Admin
  const isSuperAdmin =
    token.role === "admin" &&
    (!token.clientId ||
      token.clientId === "undefined" ||
      token.clientId === "null");

  if (!hasClientId && !isSuperAdmin) {
    return res.status(403).json({ error: "Cliente não identificado" });
  }

  try {
    let cliente;

    if (isSuperAdmin) {
      // Super Admin pode buscar qualquer cliente
      const clientId = req.query.clientId as string;
      if (clientId) {
        cliente = await prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, slug: true },
        });
      }
    } else {
      // Usuário normal busca apenas seu próprio cliente
      cliente = await prisma.client.findUnique({
        where: { id: token.clientId as string },
        select: { id: true, name: true, slug: true },
      });
    }

    return res.status(200).json(cliente);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

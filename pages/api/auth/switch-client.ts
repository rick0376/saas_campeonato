import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./[...nextauth]";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    console.log("🔍 Sessão do usuário:", {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      clientId: session.user.clientId,
    });

    // ✅ CORREÇÃO: Verificar se é admin (independente de clientId)
    if (session.user.role !== "admin") {
      console.log("❌ Usuário não é admin:", session.user.role);
      return res.status(403).json({
        error: "Apenas administradores podem trocar de cliente",
      });
    }

    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: "ID do cliente é obrigatório" });
    }

    // Verificar se o cliente existe e está ativo
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    if (client.status !== "ACTIVE") {
      return res.status(403).json({ error: "Cliente inativo" });
    }

    if (client.expiresAt && new Date() > client.expiresAt) {
      return res.status(403).json({ error: "Cliente expirado" });
    }

    console.log("✅ Validação de cliente bem-sucedida:", client.name);

    return res.status(200).json({
      message: "Validação realizada com sucesso",
      client: {
        id: client.id,
        name: client.name,
        slug: client.slug,
      },
      clientId: clientId,
    });
  } catch (error) {
    console.error("💥 Erro ao validar troca de cliente:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const token = await getToken({ req });

    if (!token) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // Verificação de Super Admin
    const isSuperAdmin =
      token.role === "admin" &&
      (token.clientId === null ||
        token.clientId === undefined ||
        token.clientId === "null" ||
        token.clientId === "undefined" ||
        !token.clientId);

    if (!isSuperAdmin) {
      return res.status(403).json({
        message:
          "Acesso negado. Apenas Super Administradores podem gerenciar clientes.",
      });
    }

    switch (req.method) {
      case "GET":
        return await getClients(req, res);
      case "POST":
        return await createClientWithAdmin(req, res);
      default:
        return res.status(405).json({ message: "Método não permitido" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}

async function getClients(req: NextApiRequest, res: NextApiResponse) {
  try {
    const clients = await prisma.client.findMany({
      include: {
        _count: {
          select: {
            users: true,
            grupos: true,
            equipes: true,
            jogos: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(clients);
  } catch (error) {
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}

async function createClientWithAdmin(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const {
      name,
      slug,
      logo,
      logoPublicId,
      description,
      domain,
      validDays,
      maxUsers,
      maxTeams,
      status = "ACTIVE",
      adminEmail,
      adminName,
      adminPassword,
    } = req.body;

    // Validações obrigatórias
    if (!name || !slug) {
      return res.status(400).json({
        message: "Nome e slug são obrigatórios",
      });
    }

    if (!adminEmail || !adminName || !adminPassword) {
      return res.status(400).json({
        message:
          "Credenciais do administrador são obrigatórias (email, nome e senha)",
      });
    }

    // Verificar duplicações
    const existingSlug = await prisma.client.findUnique({
      where: { slug: slug.trim().toLowerCase() },
    });

    if (existingSlug) {
      return res.status(400).json({
        message: "Este slug já está em uso.",
      });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase().trim() },
    });

    if (existingEmail) {
      return res.status(400).json({
        message: "Este email já está em uso.",
      });
    }

    // Calcular data de expiração
    let expiresAt = null;
    if (validDays && validDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(validDays));
    }

    // Transação para criar cliente + admin
    const result = await prisma.$transaction(async (tx) => {
      // Criar cliente
      const client = await tx.client.create({
        data: {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          logo: logo || null,
          logoPublicId: logoPublicId || null,
          description: description?.trim() || null,
          domain: domain?.trim().toLowerCase() || null,
          status: status,
          expiresAt,
          validDays: validDays ? parseInt(validDays) : null,
          maxUsers: maxUsers ? parseInt(maxUsers) : 10,
          maxTeams: maxTeams ? parseInt(maxTeams) : 20,
        },
      });

      // Criar administrador
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      const admin = await tx.user.create({
        data: {
          name: adminName.trim(),
          email: adminEmail.toLowerCase().trim(),
          password: hashedPassword,
          role: "admin",
          clientId: client.id,
          permissoes: JSON.stringify({
            usuarios: {
              visualizar: true,
              criar: true,
              editar: true,
              excluir: true,
            },
            equipes: {
              visualizar: true,
              criar: true,
              editar: true,
              excluir: true,
            },
            grupos: {
              visualizar: true,
              criar: true,
              editar: true,
              excluir: true,
            },
            jogos: {
              visualizar: true,
              criar: true,
              editar: true,
              excluir: true,
            },
            jogadores: {
              visualizar: true,
              criar: true,
              editar: true,
              excluir: true,
            },
            backup: { visualizar: true, criar: true },
          }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          clientId: true,
          createdAt: true,
        },
      });

      return { client, admin };
    });

    return res.status(201).json({
      client: result.client,
      admin: result.admin,
      message: "Cliente e administrador criados com sucesso",
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({
        message: "Já existe um registro com estes dados únicos.",
      });
    }

    return res.status(500).json({
      message: "Erro interno do servidor",
    });
  }
}

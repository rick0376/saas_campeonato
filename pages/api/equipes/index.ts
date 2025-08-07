import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const token = await getToken({ req });

    if (!token) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    if (req.method === "GET") {
      return await getEquipes(req, res, token);
    } else if (req.method === "POST") {
      return await createEquipe(req, res, token);
    } else {
      return res.status(405).json({ error: "Método não permitido" });
    }
  } catch (error) {
    console.error("Erro geral na API de equipes:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

async function createEquipe(
  req: NextApiRequest,
  res: NextApiResponse,
  token: any
) {
  try {
    const { nome, grupoId, escudoUrl, public_id } = req.body;

    // Validação básica
    if (!nome || nome.trim().length < 2) {
      return res.status(400).json({
        error: "Nome da equipe é obrigatório",
      });
    }

    // ✅ CORREÇÃO: Super Admin não pode criar equipes sem cliente
    const isSuperAdmin =
      token.role === "admin" &&
      (!token.clientId ||
        token.clientId === "undefined" ||
        token.clientId === "null");

    if (isSuperAdmin) {
      console.log("❌ Super Admin tentou criar equipe sem cliente");
      return res.status(403).json({
        error:
          "Super Administradores devem acessar um cliente específico para criar equipes. Vá para 'Gerenciar Clientes' e entre em um cliente.",
      });
    }

    // ✅ Usuário normal: validar cliente
    if (
      !token.clientId ||
      token.clientId === "undefined" ||
      token.clientId === "null"
    ) {
      return res.status(400).json({
        error: "Sessão inválida. Faça login novamente.",
      });
    }

    // Verificar se cliente existe
    const clienteExiste = await prisma.client.findUnique({
      where: { id: token.clientId },
      select: { id: true, name: true },
    });

    if (!clienteExiste) {
      return res.status(400).json({
        error: "Cliente não encontrado. Entre em contato com o suporte.",
      });
    }

    console.log("✅ Criando equipe para cliente:", clienteExiste.name);

    // Criar a equipe
    const novaEquipe = await prisma.equipe.create({
      data: {
        nome: nome.trim(),
        pontos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        golsMarcados: 0,
        golsSofridos: 0,
        escudoUrl: escudoUrl || null,
        public_id: public_id || null,
        grupoId: grupoId || null,
        clientId: token.clientId, // ✅ SEMPRE terá um clientId válido
      },
      include: {
        grupo: true,
        client: true,
      },
    });

    console.log("✅ Equipe criada com sucesso:", novaEquipe.id);
    return res.status(201).json(novaEquipe);
  } catch (error: any) {
    console.error("❌ Erro ao criar equipe:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Já existe uma equipe com este nome para este cliente.",
      });
    }

    return res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
}

async function getEquipes(
  req: NextApiRequest,
  res: NextApiResponse,
  token: any
) {
  try {
    const equipes = await prisma.equipe.findMany({
      where: {
        // ✅ Super Admin vê todas as equipes, usuário normal vê só as suas
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId }
          : {}),
      },
      include: {
        grupo: true,
        client: true,
      },
      orderBy: { nome: "asc" },
    });

    return res.status(200).json(equipes);
  } catch (error) {
    console.error("Erro ao buscar equipes:", error);
    return res.status(500).json({ error: "Erro ao buscar equipes" });
  }
}

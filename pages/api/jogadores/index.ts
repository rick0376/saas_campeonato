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
      return await getJogadores(req, res, token);
    } else if (req.method === "POST") {
      return await createJogador(req, res, token);
    } else {
      return res.status(405).json({ error: "Método não permitido" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

async function createJogador(
  req: NextApiRequest,
  res: NextApiResponse,
  token: any
) {
  try {
    const {
      nome,
      posicao,
      numeroCamisa,
      idade,
      altura,
      peso,
      equipeId,
      fotoUrl,
      public_id,
    } = req.body;

    if (!nome || nome.trim().length < 2) {
      return res.status(400).json({
        error: "Nome do jogador é obrigatório",
      });
    }

    const isSuperAdmin =
      token.role === "admin" &&
      (!token.clientId ||
        token.clientId === "undefined" ||
        token.clientId === "null");

    if (isSuperAdmin) {
      return res.status(403).json({
        error:
          "Super Administradores devem acessar um cliente específico para criar jogadores.",
      });
    }

    if (
      !token.clientId ||
      token.clientId === "undefined" ||
      token.clientId === "null"
    ) {
      return res.status(400).json({
        error: "Sessão inválida. Faça login novamente.",
      });
    }

    const clienteExiste = await prisma.client.findUnique({
      where: { id: token.clientId },
      select: { id: true, name: true },
    });

    if (!clienteExiste) {
      return res.status(400).json({
        error: "Cliente não encontrado.",
      });
    }

    // Verificar se equipe existe e pertence ao cliente
    if (equipeId) {
      const equipeExiste = await prisma.equipe.findFirst({
        where: {
          id: Number(equipeId),
          clientId: token.clientId,
        },
      });

      if (!equipeExiste) {
        return res.status(400).json({
          error: "Equipe não encontrada.",
        });
      }

      // Verificar se número já está em uso na equipe
      if (numeroCamisa) {
        const numeroExistente = await prisma.jogador.findFirst({
          where: {
            numero: Number(numeroCamisa),
            equipeId: Number(equipeId),
            clientId: token.clientId,
          },
        });

        if (numeroExistente) {
          return res.status(400).json({
            error: `O número ${numeroCamisa} já está sendo usado nesta equipe.`,
          });
        }
      }
    }

    const novoJogador = await prisma.jogador.create({
      data: {
        nome: nome.trim(),
        posicao: posicao?.trim() || null,
        numero: numeroCamisa ? Number(numeroCamisa) : null,
        idade: idade ? Number(idade) : null,
        altura: altura ? Number(altura) : null,
        peso: peso ? Number(peso) : null,
        fotoUrl: fotoUrl || null,
        public_id: public_id || null,
        equipeId: equipeId ? Number(equipeId) : null,
        clientId: token.clientId,
      },
      include: {
        equipe: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
        client: true,
      },
    });

    return res.status(201).json(novoJogador);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Já existe um jogador com este número nesta equipe.",
      });
    }

    return res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
}

async function getJogadores(
  req: NextApiRequest,
  res: NextApiResponse,
  token: any
) {
  try {
    const jogadores = await prisma.jogador.findMany({
      where: {
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId }
          : {}),
      },
      include: {
        equipe: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
        client: true,
      },
      orderBy: { nome: "asc" },
    });

    return res.status(200).json(jogadores);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar jogadores" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // ✅ Autenticação obrigatória
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return res.status(401).json({ error: "Token não encontrado" });
    }

    // ✅ Verificação de role flexível
    if (!token.role || (token.role !== "admin" && token.role !== "user")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    switch (req.method) {
      case "GET":
        return await getJogos(req, res, token);
      case "POST":
        return await createJogo(req, res, token);
      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ error: "Método não permitido" });
    }
  } catch (error) {
    console.error("Erro na API de jogos:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET - Buscar jogos com filtro multi-tenant
async function getJogos(req: NextApiRequest, res: NextApiResponse, token: any) {
  try {
    // ✅ CORREÇÃO: Filtro multi-tenant direto por clientId
    const jogos = await prisma.jogo.findMany({
      where: {
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
      include: {
        equipeA: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
        equipeB: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
        grupo: {
          select: {
            id: true,
            nome: true,
          },
        },
        eventos: {
          include: {
            jogador: {
              include: {
                equipe: {
                  select: { id: true, nome: true },
                },
              },
            },
          },
          orderBy: { minuto: "asc" },
        },
      },
      orderBy: [{ grupo: { nome: "asc" } }, { rodada: "asc" }, { data: "asc" }],
    });

    return res.status(200).json(jogos);
  } catch (error) {
    console.error("Erro ao buscar jogos:", error);
    return res.status(500).json({ error: "Erro ao buscar jogos" });
  }
}

// POST - Criar novo jogo com validações multi-tenant
async function createJogo(
  req: NextApiRequest,
  res: NextApiResponse,
  token: any
) {
  try {
    const { equipeAId, equipeBId, grupoId, rodada, data } = req.body;

    // ✅ Validações básicas
    if (!equipeAId || !equipeBId || !grupoId || !rodada || !data) {
      return res.status(400).json({
        error:
          "Dados obrigatórios: equipeAId, equipeBId, grupoId, rodada, data",
      });
    }

    // ✅ Verificar se as equipes são diferentes
    if (Number(equipeAId) === Number(equipeBId)) {
      return res.status(400).json({
        error: "As equipes devem ser diferentes",
      });
    }

    // ✅ Verificar se as equipes existem e pertencem ao cliente
    const equipeA = await prisma.equipe.findFirst({
      where: {
        id: Number(equipeAId),
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
    });

    const equipeB = await prisma.equipe.findFirst({
      where: {
        id: Number(equipeBId),
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
    });

    if (!equipeA) {
      return res.status(404).json({ error: "Equipe A não encontrada" });
    }

    if (!equipeB) {
      return res.status(404).json({ error: "Equipe B não encontrada" });
    }

    // ✅ Verificar se o grupo existe e pertence ao cliente
    const grupo = await prisma.grupo.findFirst({
      where: {
        id: Number(grupoId),
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
    });

    if (!grupo) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    // ✅ Verificar se as equipes pertencem ao grupo
    if (equipeA.grupoId !== Number(grupoId)) {
      return res.status(400).json({
        error: `Equipe ${equipeA.nome} não pertence ao grupo selecionado`,
      });
    }

    if (equipeB.grupoId !== Number(grupoId)) {
      return res.status(400).json({
        error: `Equipe ${equipeB.nome} não pertence ao grupo selecionado`,
      });
    }

    // ✅ Verificar se já existe jogo entre essas equipes na mesma rodada
    const jogoExistente = await prisma.jogo.findFirst({
      where: {
        grupoId: Number(grupoId),
        rodada: Number(rodada),
        OR: [
          {
            equipeAId: Number(equipeAId),
            equipeBId: Number(equipeBId),
          },
          {
            equipeAId: Number(equipeBId),
            equipeBId: Number(equipeAId),
          },
        ],
      },
    });

    if (jogoExistente) {
      return res.status(409).json({
        error: "Já existe um jogo entre essas equipes nesta rodada",
      });
    }

    // ✅ Validar data
    const gameDate = new Date(data);
    if (isNaN(gameDate.getTime())) {
      return res.status(400).json({ error: "Data inválida" });
    }

    // ✅ CORREÇÃO: Preparar dados para criação com clientId
    const jogoData: any = {
      equipeAId: Number(equipeAId),
      equipeBId: Number(equipeBId),
      grupoId: Number(grupoId),
      rodada: Number(rodada),
      data: gameDate,
    };

    // ✅ CORREÇÃO: Adicionar clientId apenas se existe
    if (
      token.clientId &&
      token.clientId !== "undefined" &&
      token.clientId !== "null"
    ) {
      jogoData.clientId = token.clientId as string;
    }

    // ✅ CORREÇÃO: Criar jogo com dados tipados
    const jogo = await prisma.jogo.create({
      data: jogoData,
      include: {
        equipeA: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
        equipeB: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
        grupo: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return res.status(201).json(jogo);
  } catch (error: any) {
    console.error("Erro ao criar jogo:", error);

    // ✅ Tratamento específico para erros do Prisma
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Já existe um jogo com essas características",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Referência inválida a equipe ou grupo",
      });
    }

    return res.status(500).json({
      error: "Erro ao criar jogo",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

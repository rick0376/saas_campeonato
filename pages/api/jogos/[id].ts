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

    const { id } = req.query;
    const jogoId = parseInt(id as string);

    if (isNaN(jogoId)) {
      return res.status(400).json({ error: "ID do jogo inválido" });
    }

    switch (req.method) {
      case "GET":
        return await getJogo(req, res, jogoId, token);
      case "PATCH":
        return await updateJogo(req, res, jogoId, token);
      case "PUT":
        return await updatePlacar(req, res, jogoId, token);
      case "DELETE":
        return await deleteJogo(req, res, jogoId, token);
      default:
        res.setHeader("Allow", ["GET", "PATCH", "PUT", "DELETE"]);
        return res.status(405).json({ error: "Método não permitido" });
    }
  } catch (error) {
    console.error("Erro na API de jogos:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET - Buscar jogo específico com filtro multi-tenant
async function getJogo(
  req: NextApiRequest,
  res: NextApiResponse,
  jogoId: number,
  token: any
) {
  try {
    // ✅ Filtro multi-tenant direto por clientId
    const jogo = await prisma.jogo.findFirst({
      where: {
        id: jogoId,
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
      include: {
        grupo: {
          select: {
            id: true,
            nome: true,
          },
        },
        equipeA: {
          include: {
            jogadores: {
              where: { ativo: true },
              orderBy: { numero: "asc" },
              select: {
                id: true,
                nome: true,
                numero: true,
                posicao: true,
                ativo: true,
              },
            },
          },
        },
        equipeB: {
          include: {
            jogadores: {
              where: { ativo: true },
              orderBy: { numero: "asc" },
              select: {
                id: true,
                nome: true,
                numero: true,
                posicao: true,
                ativo: true,
              },
            },
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
    });

    if (!jogo) {
      return res.status(404).json({ error: "Jogo não encontrado" });
    }

    return res.status(200).json(jogo);
  } catch (error) {
    console.error("Erro ao buscar jogo:", error);
    return res.status(500).json({ error: "Erro ao buscar jogo" });
  }
}

// PATCH - Editar informações do jogo com validações multi-tenant
async function updateJogo(
  req: NextApiRequest,
  res: NextApiResponse,
  jogoId: number,
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

    if (Number(equipeAId) === Number(equipeBId)) {
      return res.status(400).json({
        error: "As equipes devem ser diferentes",
      });
    }

    // ✅ Verificar se o jogo existe e pertence ao cliente
    const jogoExistente = await prisma.jogo.findFirst({
      where: {
        id: jogoId,
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
    });

    if (!jogoExistente) {
      return res.status(404).json({ error: "Jogo não encontrado" });
    }

    // ✅ Verificar se as novas equipes existem e pertencem ao cliente
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

    // ✅ Verificar conflito de jogos (exceto o atual)
    const jogoConflito = await prisma.jogo.findFirst({
      where: {
        id: { not: jogoId },
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

    if (jogoConflito) {
      return res.status(409).json({
        error: "Já existe um jogo entre essas equipes nesta rodada",
      });
    }

    // ✅ Validar data
    const gameDate = new Date(data);
    if (isNaN(gameDate.getTime())) {
      return res.status(400).json({ error: "Data inválida" });
    }

    // ✅ Atualizar o jogo
    const jogoAtualizado = await prisma.jogo.update({
      where: { id: jogoId },
      data: {
        equipeAId: Number(equipeAId),
        equipeBId: Number(equipeBId),
        grupoId: Number(grupoId),
        rodada: Number(rodada),
        data: gameDate,
      },
      include: {
        equipeA: {
          select: { id: true, nome: true, escudoUrl: true },
        },
        equipeB: {
          select: { id: true, nome: true, escudoUrl: true },
        },
        grupo: {
          select: { id: true, nome: true },
        },
      },
    });

    return res.status(200).json(jogoAtualizado);
  } catch (error: any) {
    console.error("Erro ao atualizar jogo:", error);

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
      error: "Erro ao atualizar jogo",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// PUT - Atualizar placar com recálculo de estatísticas
async function updatePlacar(
  req: NextApiRequest,
  res: NextApiResponse,
  jogoId: number,
  token: any
) {
  try {
    const { placarA, placarB, recalcularEstatisticas } = req.body;

    // ✅ Verificar se o jogo existe e pertence ao cliente
    const jogoExistente = await prisma.jogo.findFirst({
      where: {
        id: jogoId,
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
      include: {
        equipeA: { select: { id: true, nome: true } },
        equipeB: { select: { id: true, nome: true } },
      },
    });

    if (!jogoExistente) {
      return res.status(404).json({ error: "Jogo não encontrado" });
    }

    // ✅ Validar placares
    if (placarA !== null && (isNaN(Number(placarA)) || Number(placarA) < 0)) {
      return res.status(400).json({ error: "Placar A inválido" });
    }

    if (placarB !== null && (isNaN(Number(placarB)) || Number(placarB) < 0)) {
      return res.status(400).json({ error: "Placar B inválido" });
    }

    // ✅ Atualizar o jogo
    const jogoAtualizado = await prisma.jogo.update({
      where: { id: jogoId },
      data: {
        placarA: placarA !== null ? Number(placarA) : null,
        placarB: placarB !== null ? Number(placarB) : null,
      },
      include: {
        equipeA: { select: { id: true, nome: true, escudoUrl: true } },
        equipeB: { select: { id: true, nome: true, escudoUrl: true } },
        grupo: { select: { id: true, nome: true } },
      },
    });

    // ✅ Recalcular estatísticas se solicitado
    if (recalcularEstatisticas) {
      await recalcularEstatisticasEquipes(token);
    }

    return res.status(200).json(jogoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar placar:", error);
    return res.status(500).json({ error: "Erro ao atualizar placar" });
  }
}

// DELETE - Excluir jogo com validações multi-tenant
async function deleteJogo(
  req: NextApiRequest,
  res: NextApiResponse,
  jogoId: number,
  token: any
) {
  try {
    // ✅ Verificar se o jogo existe e pertence ao cliente
    const jogoExistente = await prisma.jogo.findFirst({
      where: {
        id: jogoId,
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
      include: {
        equipeA: { select: { id: true, nome: true } },
        equipeB: { select: { id: true, nome: true } },
        grupo: { select: { id: true, nome: true } },
      },
    });

    if (!jogoExistente) {
      return res.status(404).json({ error: "Jogo não encontrado" });
    }

    // ✅ Excluir eventos do jogo primeiro usando EventoJogo
    const eventosExcluidos = await prisma.eventoJogo.deleteMany({
      where: { jogoId: jogoId },
    });

    // ✅ Excluir o jogo
    await prisma.jogo.delete({
      where: { id: jogoId },
    });

    // ✅ Recalcular estatísticas após exclusão
    await recalcularEstatisticasEquipes(token);

    return res.status(200).json({
      message: "Jogo excluído com sucesso",
      eventosRemovidos: eventosExcluidos.count,
    });
  } catch (error: any) {
    console.error("Erro ao excluir jogo:", error);

    // ✅ Tratamento específico para erros do Prisma
    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Não é possível excluir o jogo pois existem dados relacionados",
      });
    }

    return res.status(500).json({ error: "Erro ao excluir jogo" });
  }
}

// ✅ Função para recalcular estatísticas com filtro multi-tenant
async function recalcularEstatisticasEquipes(token: any) {
  try {
    console.log("🔄 Iniciando recálculo de estatísticas...");

    // ✅ Buscar apenas equipes do cliente
    const equipes = await prisma.equipe.findMany({
      where: {
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
    });

    let equipesAtualizadas = 0;

    for (const equipe of equipes) {
      // Buscar todos os jogos da equipe (finalizados)
      const jogos = await prisma.jogo.findMany({
        where: {
          OR: [{ equipeAId: equipe.id }, { equipeBId: equipe.id }],
          AND: [{ placarA: { not: null } }, { placarB: { not: null } }],
        },
      });

      let vitorias = 0;
      let empates = 0;
      let derrotas = 0;
      let golsMarcados = 0;
      let golsSofridos = 0;

      jogos.forEach((jogo) => {
        const isEquipeA = jogo.equipeAId === equipe.id;
        const golsPro = isEquipeA ? jogo.placarA! : jogo.placarB!;
        const golsContra = isEquipeA ? jogo.placarB! : jogo.placarA!;

        golsMarcados += golsPro;
        golsSofridos += golsContra;

        if (golsPro > golsContra) {
          vitorias++;
        } else if (golsPro === golsContra) {
          empates++;
        } else {
          derrotas++;
        }
      });

      const pontos = vitorias * 3 + empates * 1;

      // Atualizar estatísticas da equipe
      await prisma.equipe.update({
        where: { id: equipe.id },
        data: {
          pontos,
          vitorias,
          empates,
          derrotas,
          golsMarcados,
          golsSofridos,
        },
      });

      equipesAtualizadas++;
    }

    console.log(
      `✅ Estatísticas recalculadas: ${equipesAtualizadas} equipes atualizadas.`
    );
  } catch (error) {
    console.error("❌ Erro ao recalcular estatísticas:", error);
    throw error;
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../../lib/prisma";

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
        return await getEventos(req, res, jogoId, token);
      case "POST":
        return await createEvento(req, res, jogoId, token);
      case "DELETE":
        return await deleteEvento(req, res, jogoId, token);
      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        return res.status(405).json({ error: "Método não permitido" });
    }
  } catch (error) {
    console.error("Erro na API de eventos:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET - Buscar eventos do jogo com filtro multi-tenant
async function getEventos(
  req: NextApiRequest,
  res: NextApiResponse,
  jogoId: number,
  token: any
) {
  try {
    // ✅ CORREÇÃO: Buscar eventos com filtro multi-tenant direto
    const eventos = await prisma.eventoJogo.findMany({
      where: {
        jogoId,
        // ✅ Filtro multi-tenant direto
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
      include: {
        jogador: {
          select: {
            id: true,
            nome: true,
            numero: true,
            equipe: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
      orderBy: { minuto: "desc" },
    });

    const eventosFormatados = eventos.map((evento) => ({
      id: evento.id,
      tipo: evento.tipo,
      minuto: evento.minuto,
      detalhes: evento.detalhes,
      jogador: {
        id: evento.jogador.id,
        nome: evento.jogador.nome,
        numero: evento.jogador.numero,
      },
      equipe: {
        id: evento.jogador.equipe.id,
        nome: evento.jogador.equipe.nome,
      },
    }));

    return res.status(200).json(eventosFormatados);
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return res.status(500).json({ error: "Erro ao buscar eventos" });
  }
}

// POST - Criar novo evento com validações multi-tenant
async function createEvento(
  req: NextApiRequest,
  res: NextApiResponse,
  jogoId: number,
  token: any
) {
  try {
    const { tipo, jogadorId, minuto, detalhes } = req.body;

    // ✅ Validações básicas
    if (!tipo || !jogadorId || minuto === undefined) {
      return res.status(400).json({
        error: "Campos obrigatórios: tipo, jogadorId, minuto",
      });
    }

    // ✅ Validar tipos de evento permitidos
    const tiposPermitidos = [
      "gol",
      "cartao_amarelo",
      "cartao_vermelho",
      "assistencia",
    ];
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({
        error: `Tipo de evento inválido. Permitidos: ${tiposPermitidos.join(
          ", "
        )}`,
      });
    }

    // ✅ Validar minuto
    if (isNaN(Number(minuto)) || Number(minuto) < 0 || Number(minuto) > 120) {
      return res.status(400).json({
        error: "Minuto deve ser um número entre 0 e 120",
      });
    }

    // ✅ Verificar se o jogo existe e pertence ao cliente
    const jogo = await prisma.jogo.findFirst({
      where: {
        id: jogoId,
        OR: [
          {
            equipeA: {
              ...(token.clientId &&
              token.clientId !== "undefined" &&
              token.clientId !== "null"
                ? { clientId: token.clientId as string }
                : {}),
            },
          },
          {
            equipeB: {
              ...(token.clientId &&
              token.clientId !== "undefined" &&
              token.clientId !== "null"
                ? { clientId: token.clientId as string }
                : {}),
            },
          },
        ],
      },
    });

    if (!jogo) {
      return res.status(404).json({ error: "Jogo não encontrado" });
    }

    // ✅ Verificar se o jogador existe e pertence ao cliente
    const jogador = await prisma.jogador.findFirst({
      where: {
        id: Number(jogadorId),
        equipe: {
          ...(token.clientId &&
          token.clientId !== "undefined" &&
          token.clientId !== "null"
            ? { clientId: token.clientId as string }
            : {}),
        },
      },
      include: { equipe: true },
    });

    if (!jogador) {
      return res.status(404).json({ error: "Jogador não encontrado" });
    }

    // ✅ Verificar se o jogador pertence a uma das equipes do jogo
    if (
      jogador.equipeId !== jogo.equipeAId &&
      jogador.equipeId !== jogo.equipeBId
    ) {
      return res.status(400).json({
        error: "Jogador não pertence a nenhuma das equipes deste jogo",
      });
    }

    // ✅ Validações específicas por tipo de evento
    if (tipo === "cartao_vermelho") {
      // Verificar se jogador já tem cartão vermelho neste jogo
      const cartaoVermelhoExistente = await prisma.eventoJogo.findFirst({
        where: {
          jogoId,
          jogadorId: Number(jogadorId),
          tipo: "cartao_vermelho",
          ...(token.clientId &&
          token.clientId !== "undefined" &&
          token.clientId !== "null"
            ? { clientId: token.clientId as string }
            : {}),
        },
      });

      if (cartaoVermelhoExistente) {
        return res.status(400).json({
          error: "Jogador já possui cartão vermelho neste jogo",
        });
      }
    }

    // ✅ CORREÇÃO: Preparar dados para criação
    const eventoData: any = {
      jogoId: jogoId,
      jogadorId: Number(jogadorId),
      equipeId: jogador.equipeId,
      tipo: tipo,
      minuto: Number(minuto),
      detalhes: detalhes || null,
    };

    // ✅ CORREÇÃO: Adicionar clientId apenas se existe
    if (
      token.clientId &&
      token.clientId !== "undefined" &&
      token.clientId !== "null"
    ) {
      eventoData.clientId = token.clientId as string;
    }

    // ✅ CORREÇÃO: Criar evento com dados tipados
    const evento = await prisma.eventoJogo.create({
      data: eventoData,
      include: {
        jogador: {
          select: {
            id: true,
            nome: true,
            numero: true,
            equipe: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    // ✅ Atualizar placar se for gol
    if (tipo === "gol") {
      await atualizarPlacar(jogoId, token);
    }

    // ✅ CORREÇÃO: Verificar se jogador existe no include
    if (!evento.jogador) {
      return res
        .status(500)
        .json({ error: "Erro ao carregar dados do jogador" });
    }

    const eventoFormatado = {
      id: evento.id,
      tipo: evento.tipo,
      minuto: evento.minuto,
      detalhes: evento.detalhes,
      jogador: {
        id: evento.jogador.id,
        nome: evento.jogador.nome,
        numero: evento.jogador.numero,
      },
      equipe: {
        id: evento.jogador.equipe.id,
        nome: evento.jogador.equipe.nome,
      },
    };

    return res.status(201).json(eventoFormatado);
  } catch (error: any) {
    console.error("Erro ao criar evento:", error);

    // ✅ Tratamento específico para erros do Prisma
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Já existe um evento idêntico",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Referência inválida a jogo ou jogador",
      });
    }

    return res.status(500).json({
      error: "Erro ao criar evento",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// DELETE - Excluir evento com validações multi-tenant
async function deleteEvento(
  req: NextApiRequest,
  res: NextApiResponse,
  jogoId: number,
  token: any
) {
  try {
    const { eventoId } = req.body;

    if (!eventoId) {
      return res.status(400).json({ error: "ID do evento é obrigatório" });
    }

    // ✅ CORREÇÃO: Verificar se o evento existe e pertence ao cliente
    const eventoParaExcluir = await prisma.eventoJogo.findFirst({
      where: {
        id: Number(eventoId),
        jogoId: jogoId,
        // ✅ Filtro multi-tenant direto
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
    });

    if (!eventoParaExcluir) {
      return res.status(404).json({
        error: "Evento não encontrado ou não pertence ao seu cliente",
      });
    }

    // ✅ CORREÇÃO: Excluir o evento
    await prisma.eventoJogo.delete({
      where: { id: Number(eventoId) },
    });

    // ✅ Atualizar placar se era um gol
    if (eventoParaExcluir.tipo === "gol") {
      await atualizarPlacar(jogoId, token);
    }

    return res.status(200).json({ message: "Evento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    return res.status(500).json({ error: "Erro ao excluir evento" });
  }
}

// ✅ CORREÇÃO: Função para atualizar placar baseado nos eventos de gol
async function atualizarPlacar(jogoId: number, token: any) {
  try {
    const jogo = await prisma.jogo.findUnique({
      where: { id: jogoId },
    });

    if (!jogo) {
      console.error(`Jogo ${jogoId} não encontrado para atualizar placar`);
      return;
    }

    // ✅ CORREÇÃO: Contar gols por equipe usando EventoJogo
    const golsEquipeA = await prisma.eventoJogo.count({
      where: {
        jogoId,
        tipo: "gol",
        equipeId: jogo.equipeAId,
        // ✅ Filtro multi-tenant
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
    });

    const golsEquipeB = await prisma.eventoJogo.count({
      where: {
        jogoId,
        tipo: "gol",
        equipeId: jogo.equipeBId,
        // ✅ Filtro multi-tenant
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
    });

    // ✅ Atualizar placar no jogo
    await prisma.jogo.update({
      where: { id: jogoId },
      data: {
        placarA: golsEquipeA,
        placarB: golsEquipeB,
      },
    });

    console.log(
      `✅ Placar atualizado - Jogo ${jogoId}: ${golsEquipeA} x ${golsEquipeB}`
    );
  } catch (error) {
    console.error("Erro ao atualizar placar:", error);
  }
}

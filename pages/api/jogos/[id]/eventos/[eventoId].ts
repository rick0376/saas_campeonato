import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../../../lib/prisma";

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

    if (req.method !== "DELETE") {
      res.setHeader("Allow", ["DELETE"]);
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { id: jogoId, eventoId } = req.query;

    // ✅ Validar IDs
    if (!jogoId || !eventoId) {
      return res.status(400).json({
        error: "ID do jogo e do evento são obrigatórios",
      });
    }

    const jogoIdNum = parseInt(jogoId as string);
    const eventoIdNum = parseInt(eventoId as string);

    if (isNaN(jogoIdNum) || isNaN(eventoIdNum)) {
      return res.status(400).json({
        error: "IDs devem ser números válidos",
      });
    }

    // ✅ CORREÇÃO: Buscar evento com filtro multi-tenant direto
    const evento = await prisma.eventoJogo.findFirst({
      where: {
        id: eventoIdNum,
        jogoId: jogoIdNum,
        // ✅ NOVO: Filtro multi-tenant direto
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
              select: { id: true, nome: true },
            },
          },
        },
        jogo: {
          select: {
            id: true,
            equipeAId: true,
            equipeBId: true,
          },
        },
      },
    });

    if (!evento) {
      return res.status(404).json({
        error: "Evento não encontrado ou não pertence ao seu cliente",
      });
    }

    // ✅ CORREÇÃO: Usar transação com EventoJogo
    const resultado = await prisma.$transaction(async (prismaTransaction) => {
      // 1. Excluir o evento principal
      await prismaTransaction.eventoJogo.delete({
        where: { id: eventoIdNum },
      });

      // 2. Se era um gol, recalcular placar automaticamente
      if (evento.tipo === "gol") {
        // Contar gols restantes por equipe
        const golsEquipeA = await prismaTransaction.eventoJogo.count({
          where: {
            jogoId: jogoIdNum,
            tipo: "gol",
            equipeId: evento.jogo.equipeAId,
            // ✅ Filtro multi-tenant
            ...(token.clientId &&
            token.clientId !== "undefined" &&
            token.clientId !== "null"
              ? { clientId: token.clientId as string }
              : {}),
          },
        });

        const golsEquipeB = await prismaTransaction.eventoJogo.count({
          where: {
            jogoId: jogoIdNum,
            tipo: "gol",
            equipeId: evento.jogo.equipeBId,
            // ✅ Filtro multi-tenant
            ...(token.clientId &&
            token.clientId !== "undefined" &&
            token.clientId !== "null"
              ? { clientId: token.clientId as string }
              : {}),
          },
        });

        // Atualizar placar do jogo
        await prismaTransaction.jogo.update({
          where: { id: jogoIdNum },
          data: {
            placarA: golsEquipeA,
            placarB: golsEquipeB,
          },
        });

        return {
          placarAtualizado: true,
          novoPlacarA: golsEquipeA,
          novoPlacarB: golsEquipeB,
        };
      }

      return {
        placarAtualizado: false,
      };
    });

    // ✅ Log detalhado da operação
    console.log(`✅ Evento ${eventoIdNum} excluído do jogo ${jogoIdNum}:`);
    console.log(`   Tipo: ${evento.tipo}`);
    console.log(
      `   Jogador: ${evento.jogador?.nome} #${evento.jogador?.numero}`
    );
    console.log(`   Equipe: ${evento.jogador?.equipe.nome}`);
    console.log(`   Minuto: ${evento.minuto}`);
    console.log(`   Cliente: ${evento.clientId}`);

    if (resultado.placarAtualizado) {
      console.log(
        `   Placar atualizado: ${resultado.novoPlacarA} x ${resultado.novoPlacarB}`
      );
    }

    // ✅ Resposta detalhada
    return res.status(200).json({
      message: "Evento excluído com sucesso",
      evento: {
        id: eventoIdNum,
        tipo: evento.tipo,
        minuto: evento.minuto,
        detalhes: evento.detalhes,
        jogador: evento.jogador
          ? {
              nome: evento.jogador.nome,
              numero: evento.jogador.numero,
              equipe: evento.jogador.equipe.nome,
            }
          : null,
      },
      placar: resultado.placarAtualizado
        ? {
            atualizado: true,
            placarA: resultado.novoPlacarA,
            placarB: resultado.novoPlacarB,
          }
        : {
            atualizado: false,
          },
    });
  } catch (error: any) {
    console.error("Erro ao excluir evento:", error);

    // ✅ Tratamento específico para erros do Prisma
    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Evento não encontrado ou já foi excluído",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        error: "Não é possível excluir evento devido a dependências",
      });
    }

    return res.status(500).json({
      error: "Erro ao excluir evento",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

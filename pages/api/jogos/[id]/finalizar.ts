import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // ✅ CORREÇÃO: Autenticação obrigatória
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return res.status(401).json({ error: "Token não encontrado" });
    }

    // ✅ CORREÇÃO: Verificação de role flexível
    if (!token.role || (token.role !== "admin" && token.role !== "user")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (req.method !== "PUT") {
      res.setHeader("Allow", ["PUT"]);
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { id } = req.query;
    const { placarA, placarB } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID do jogo é obrigatório" });
    }

    const jogoId = parseInt(id as string);
    if (isNaN(jogoId)) {
      return res.status(400).json({ error: "ID do jogo inválido" });
    }

    // ✅ CORREÇÃO: Validar placares
    if (placarA === undefined || placarB === undefined) {
      return res.status(400).json({
        error: "Placares são obrigatórios",
      });
    }

    if (isNaN(Number(placarA)) || isNaN(Number(placarB))) {
      return res.status(400).json({
        error: "Placares devem ser números válidos",
      });
    }

    if (Number(placarA) < 0 || Number(placarB) < 0) {
      return res.status(400).json({
        error: "Placares não podem ser negativos",
      });
    }

    // ✅ CORREÇÃO: Verificar se o jogo existe e pertence ao cliente
    const jogoExistente = await prisma.jogo.findFirst({
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
      include: {
        equipeA: {
          select: {
            id: true,
            nome: true,
            pontos: true,
            vitorias: true,
            empates: true,
            derrotas: true,
            golsMarcados: true,
            golsSofridos: true,
          },
        },
        equipeB: {
          select: {
            id: true,
            nome: true,
            pontos: true,
            vitorias: true,
            empates: true,
            derrotas: true,
            golsMarcados: true,
            golsSofridos: true,
          },
        },
      },
    });

    if (!jogoExistente) {
      return res.status(404).json({ error: "Jogo não encontrado" });
    }

    // ✅ CORREÇÃO: Verificar se o jogo já foi finalizado
    if (jogoExistente.placarA !== null && jogoExistente.placarB !== null) {
      return res.status(400).json({
        error: "Jogo já foi finalizado anteriormente",
      });
    }

    const placarAFinal = Number(placarA);
    const placarBFinal = Number(placarB);

    // ✅ CORREÇÃO: Usar transação para garantir consistência
    const resultado = await prisma.$transaction(async (prismaTransaction) => {
      // 1. Atualizar placar do jogo
      const jogoAtualizado = await prismaTransaction.jogo.update({
        where: { id: jogoId },
        data: {
          placarA: placarAFinal,
          placarB: placarBFinal,
        },
        include: {
          equipeA: { select: { id: true, nome: true } },
          equipeB: { select: { id: true, nome: true } },
        },
      });

      // 2. Calcular pontos e estatísticas
      let pontosA = 0,
        pontosB = 0;
      let vitoriasA = 0,
        empatesA = 0,
        derrotasA = 0;
      let vitoriasB = 0,
        empatesB = 0,
        derrotasB = 0;

      if (placarAFinal > placarBFinal) {
        // Vitória da equipe A
        pontosA = 3;
        vitoriasA = 1;
        derrotasB = 1;
      } else if (placarBFinal > placarAFinal) {
        // Vitória da equipe B
        pontosB = 3;
        vitoriasB = 1;
        derrotasA = 1;
      } else {
        // Empate
        pontosA = 1;
        pontosB = 1;
        empatesA = 1;
        empatesB = 1;
      }

      // 3. Atualizar estatísticas da equipe A
      const equipeAAtualizada = await prismaTransaction.equipe.update({
        where: { id: jogoExistente.equipeAId },
        data: {
          pontos: { increment: pontosA },
          vitorias: { increment: vitoriasA },
          empates: { increment: empatesA },
          derrotas: { increment: derrotasA },
          golsMarcados: { increment: placarAFinal },
          golsSofridos: { increment: placarBFinal },
        },
      });

      // 4. Atualizar estatísticas da equipe B
      const equipeBAtualizada = await prismaTransaction.equipe.update({
        where: { id: jogoExistente.equipeBId },
        data: {
          pontos: { increment: pontosB },
          vitorias: { increment: vitoriasB },
          empates: { increment: empatesB },
          derrotas: { increment: derrotasB },
          golsMarcados: { increment: placarBFinal },
          golsSofridos: { increment: placarAFinal },
        },
      });

      return {
        jogo: jogoAtualizado,
        equipeA: equipeAAtualizada,
        equipeB: equipeBAtualizada,
        resultado: {
          placarA: placarAFinal,
          placarB: placarBFinal,
          pontosA,
          pontosB,
          vencedor:
            placarAFinal > placarBFinal
              ? jogoAtualizado.equipeA.nome
              : placarBFinal > placarAFinal
              ? jogoAtualizado.equipeB.nome
              : "Empate",
        },
      };
    });

    // ✅ CORREÇÃO: Log detalhado do resultado
    console.log(`✅ Jogo ${jogoId} finalizado:`);
    console.log(
      `   ${resultado.jogo.equipeA.nome} ${placarAFinal} x ${placarBFinal} ${resultado.jogo.equipeB.nome}`
    );
    console.log(`   Resultado: ${resultado.resultado.vencedor}`);
    console.log(
      `   Pontos: ${resultado.jogo.equipeA.nome} +${resultado.resultado.pontosA}, ${resultado.jogo.equipeB.nome} +${resultado.resultado.pontosB}`
    );

    return res.status(200).json({
      message: "Jogo finalizado com sucesso",
      jogo: {
        id: jogoId,
        placarA: placarAFinal,
        placarB: placarBFinal,
        equipeA: resultado.jogo.equipeA.nome,
        equipeB: resultado.jogo.equipeB.nome,
        vencedor: resultado.resultado.vencedor,
        pontosDistribuidos: {
          [resultado.jogo.equipeA.nome]: resultado.resultado.pontosA,
          [resultado.jogo.equipeB.nome]: resultado.resultado.pontosB,
        },
      },
      estatisticas: {
        equipeA: {
          nome: resultado.jogo.equipeA.nome,
          pontosAdicionados: resultado.resultado.pontosA,
          golsMarcados: placarAFinal,
          golsSofridos: placarBFinal,
        },
        equipeB: {
          nome: resultado.jogo.equipeB.nome,
          pontosAdicionados: resultado.resultado.pontosB,
          golsMarcados: placarBFinal,
          golsSofridos: placarAFinal,
        },
      },
    });
  } catch (error: any) {
    console.error("Erro ao finalizar jogo:", error);

    // ✅ CORREÇÃO: Tratamento específico para erros do Prisma
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Conflito ao atualizar dados do jogo",
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Jogo ou equipe não encontrada",
      });
    }

    return res.status(500).json({
      error: "Erro ao finalizar jogo",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

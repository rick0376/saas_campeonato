import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = await getToken({ req });

  if (!token) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  if (token.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }

  if (req.method === "GET") {
    try {
      const clientIdRaw = req.query.clientId;
      const clientId =
        typeof clientIdRaw === "string" && clientIdRaw !== ""
          ? clientIdRaw
          : undefined;
      const baseFilter: any = {};
      if (clientId) baseFilter.clientId = clientId;

      const [
        totalJogos,
        jogosFinalizados,
        jogosAgendados,
        totalEquipes,
        totalJogadores,
        totalEventos,
        jogos,
      ] = await Promise.all([
        prisma.jogo.count({ where: baseFilter }),
        prisma.jogo.count({
          where: {
            ...baseFilter,
            placarA: { not: null },
            placarB: { not: null },
          },
        }),
        prisma.jogo.count({
          where: { ...baseFilter, placarA: null, placarB: null },
        }),
        prisma.equipe.count({ where: baseFilter }),
        prisma.jogador.count({ where: { ...baseFilter, ativo: true } }),
        prisma.eventoJogo.count({ where: baseFilter }),
        prisma.jogo.findMany({
          where: {
            ...baseFilter,
            placarA: { not: null },
            placarB: { not: null },
          },
          select: {
            placarA: true,
            placarB: true,
          },
        }),
      ]);

      const totalGols = jogos.reduce((acc, jogo) => {
        return acc + (jogo.placarA || 0) + (jogo.placarB || 0);
      }, 0);

      const eventos = await prisma.eventoJogo.groupBy({
        by: ["tipo"],
        where: baseFilter,
        _count: {
          tipo: true,
        },
      });

      const eventosPorTipo = eventos.reduce((acc, evento) => {
        acc[evento.tipo] = evento._count.tipo;
        return acc;
      }, {} as Record<string, number>);

      const progressoCampeonato =
        totalJogos > 0 ? Math.round((jogosFinalizados / totalJogos) * 100) : 0;

      const stats = {
        totalJogos,
        jogosFinalizados,
        jogosAgendados,
        jogosEmAndamento: totalJogos - jogosFinalizados - jogosAgendados,
        totalEquipes,
        totalJogadores,
        totalGols,
        totalEventos,
        progresso: progressoCampeonato,
        eventos: {
          gols: eventosPorTipo.gol || 0,
          cartoesAmarelos: eventosPorTipo.cartao_amarelo || 0,
          cartoesVermelhos: eventosPorTipo.cartao_vermelho || 0,
          assistencias: eventosPorTipo.assistencia || 0,
        },
      };

      return res.status(200).json(stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    } finally {
      await prisma.$disconnect();
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}

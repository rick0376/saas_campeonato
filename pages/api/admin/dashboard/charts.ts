import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = await getToken({ req });
  if (!token) return res.status(401).json({ error: "Não autorizado" });

  let permissoes: Record<string, any> = {};
  try {
    permissoes =
      typeof token.permissoes === "string"
        ? JSON.parse(token.permissoes)
        : token.permissoes || {};
  } catch {
    permissoes = {};
  }

  if (!(token.role === "admin" || permissoes.dashboard?.visualizar === true)) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  if (req.method !== "GET")
    return res.status(405).json({ error: "Método não permitido" });

  try {
    const clientIdRaw = req.query.clientId;
    const clientId =
      typeof clientIdRaw === "string" && clientIdRaw !== ""
        ? clientIdRaw
        : undefined;
    const baseFilter: any = {};
    if (clientId) baseFilter.clientId = clientId;

    const golsPorRodada = await prisma.jogo.groupBy({
      by: ["rodada"],
      where: { ...baseFilter, placarA: { not: null }, placarB: { not: null } },
      _sum: { placarA: true, placarB: true },
      orderBy: { rodada: "asc" },
    });

    const chartGolsRodada = golsPorRodada.map((item) => ({
      rodada: item.rodada,
      gols: (item._sum.placarA ?? 0) + (item._sum.placarB ?? 0),
    }));

    const cartoes = await prisma.eventoJogo.groupBy({
      by: ["tipo"],
      where: {
        ...baseFilter,
        tipo: { in: ["cartao_amarelo", "cartao_vermelho"] },
      },
      _count: { tipo: true },
    });

    const chartCartoes = {
      amarelos:
        cartoes.find((c) => c.tipo === "cartao_amarelo")?._count.tipo || 0,
      vermelhos:
        cartoes.find((c) => c.tipo === "cartao_vermelho")?._count.tipo || 0,
    };

    const artilheiros = await prisma.eventoJogo.groupBy({
      by: ["jogadorId"],
      where: { ...baseFilter, tipo: "gol" },
      _count: { jogadorId: true },
      orderBy: { _count: { jogadorId: "desc" } },
      take: 5,
    });

    const jogadoresIds = artilheiros.map((a) => a.jogadorId);
    const jogadoresInfo = await prisma.jogador.findMany({
      where: { id: { in: jogadoresIds } },
      select: {
        id: true,
        nome: true,
        numero: true,
        equipe: { select: { nome: true } },
      },
    });

    const chartArtilheiros = artilheiros.map((art) => {
      const jogador = jogadoresInfo.find((j) => j.id === art.jogadorId);
      return {
        nome: jogador?.nome ?? "Desconhecido",
        numero: jogador?.numero ?? 0,
        equipe: jogador?.equipe?.nome ?? "Sem equipe",
        gols: art._count.jogadorId,
      };
    });

    const golsPorEquipe = await prisma.jogo.findMany({
      where: { ...baseFilter, placarA: { not: null }, placarB: { not: null } },
      select: {
        placarA: true,
        placarB: true,
        equipeA: { select: { id: true, nome: true } },
        equipeB: { select: { id: true, nome: true } },
      },
    });

    const golsPorEquipeMap = new Map<number, { nome: string; gols: number }>();
    golsPorEquipe.forEach((jogo) => {
      const equipeA = golsPorEquipeMap.get(jogo.equipeA.id) || {
        nome: jogo.equipeA.nome,
        gols: 0,
      };
      equipeA.gols += jogo.placarA || 0;
      golsPorEquipeMap.set(jogo.equipeA.id, equipeA);

      const equipeB = golsPorEquipeMap.get(jogo.equipeB.id) || {
        nome: jogo.equipeB.nome,
        gols: 0,
      };
      equipeB.gols += jogo.placarB || 0;
      golsPorEquipeMap.set(jogo.equipeB.id, equipeB);
    });

    const chartEquipesGols = Array.from(golsPorEquipeMap.values())
      .sort((a, b) => b.gols - a.gols)
      .slice(0, 5);

    const [totalJogos, jogosFinalizados, jogosAgendados] = await Promise.all([
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
    ]);

    const chartStatusJogos = {
      finalizados: jogosFinalizados,
      agendamento: jogosAgendados,
      emAndamento: totalJogos - jogosFinalizados - jogosAgendados,
    };

    return res.status(200).json({
      golsPorRodada: chartGolsRodada,
      distribuicaoCartoes: chartCartoes,
      topArtilheiros: chartArtilheiros,
      topEquipes: chartEquipesGols,
      status: chartStatusJogos,
    });
  } catch (error) {
    console.error("Erro ao buscar dados dos gráficos:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  } finally {
    await prisma.$disconnect();
  }
}

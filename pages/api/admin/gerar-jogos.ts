import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

interface JogoData {
  equipeAId: number;
  equipeBId: number;
  grupoId: number;
  rodada: number;
  data: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // ✅ CORREÇÃO: Usar getServerSession em vez de getSession
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user?.role !== "admin") {
      console.log(
        "❌ Acesso negado - sessão:",
        !!session,
        "role:",
        session?.user?.role
      );
      return res.status(403).json({ error: "Acesso negado" });
    }

    console.log("✅ Usuário autenticado:", session.user?.email);

    const { jogos }: { jogos: JogoData[] } = req.body;

    if (!jogos || !Array.isArray(jogos) || jogos.length === 0) {
      return res.status(400).json({ error: "Lista de jogos é obrigatória" });
    }

    // Validar dados dos jogos
    for (const jogo of jogos) {
      if (
        !jogo.equipeAId ||
        !jogo.equipeBId ||
        !jogo.grupoId ||
        !jogo.rodada ||
        !jogo.data
      ) {
        return res.status(400).json({ error: "Dados incompletos nos jogos" });
      }

      if (jogo.equipeAId === jogo.equipeBId) {
        return res
          .status(400)
          .json({ error: "Uma equipe não pode jogar contra si mesma" });
      }

      // Verificar se as equipes existem
      const [equipeA, equipeB] = await Promise.all([
        prisma.equipe.findUnique({ where: { id: jogo.equipeAId } }),
        prisma.equipe.findUnique({ where: { id: jogo.equipeBId } }),
      ]);

      if (!equipeA || !equipeB) {
        return res
          .status(400)
          .json({ error: "Uma ou mais equipes não foram encontradas" });
      }

      // Verificar se o grupo existe
      const grupo = await prisma.grupo.findUnique({
        where: { id: jogo.grupoId },
      });
      if (!grupo) {
        return res.status(400).json({ error: "Grupo não encontrado" });
      }
    }

    // Verificar se já existem jogos duplicados
    const jogosExistentes = await prisma.jogo.findMany({
      where: {
        OR: jogos.map((jogo) => ({
          AND: [
            {
              OR: [
                { equipeAId: jogo.equipeAId, equipeBId: jogo.equipeBId },
                { equipeAId: jogo.equipeBId, equipeBId: jogo.equipeAId },
              ],
            },
            { grupoId: jogo.grupoId },
          ],
        })),
      },
    });

    if (jogosExistentes.length > 0) {
      return res.status(400).json({
        error: "Alguns jogos já existem no sistema",
        jogosExistentes: jogosExistentes.length,
      });
    }

    // Criar todos os jogos em uma transação
    const jogosCreated = await prisma.$transaction(
      jogos.map((jogo) =>
        prisma.jogo.create({
          data: {
            equipeAId: jogo.equipeAId,
            equipeBId: jogo.equipeBId,
            grupoId: jogo.grupoId,
            rodada: jogo.rodada,
            data: new Date(jogo.data),
          },
          include: {
            equipeA: true,
            equipeB: true,
            grupo: true,
          },
        })
      )
    );

    console.log(`✅ ${jogosCreated.length} jogos criados com sucesso`);

    return res.status(201).json({
      message: `${jogosCreated.length} jogos criados com sucesso`,
      jogos: jogosCreated,
      totalJogos: jogosCreated.length,
    });
  } catch (error) {
    console.error("❌ Erro ao criar jogos:", error);
    return res.status(500).json({
      error: "Erro interno do servidor ao criar jogos",
    });
  }
}

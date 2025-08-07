import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../lib/prisma";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

/* -------------------------------------------------------------------------- */
/*  CONFIGURAÇÃO CLOUDINARY                                                   */
/* -------------------------------------------------------------------------- */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ ÚNICA ADIÇÃO: Função para deletar pasta vazia (igual ao de clientes)
async function deleteCloudinaryImageAndFolder(publicId: string) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Variáveis de ambiente do Cloudinary não configuradas");
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const stringToSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(stringToSign)
    .digest("hex");

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
  const params = new URLSearchParams({
    public_id: publicId,
    signature: signature,
    api_key: apiKey,
    timestamp: timestamp.toString(),
    invalidate: "true",
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const result = await response.json();
    console.log("Resultado da exclusão da imagem:", result);

    // ✅ ÚNICA ADIÇÃO: Tentar deletar pasta vazia após deletar imagem
    if (result.result === "ok" || result.result === "not found") {
      const folderPath = publicId.split("/").slice(0, -1).join("/");

      if (folderPath) {
        try {
          await cloudinary.api.delete_folder(folderPath);
          console.log(`✅ Pasta removida: ${folderPath}`);
        } catch (folderError) {
          console.log(`⚠️ Pasta não removida: ${folderPath}`);
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Erro ao excluir imagem do Cloudinary:", error);
    throw error;
  }
}

// Função para recalcular estatísticas de uma equipe
async function recalcularEstatisticasEquipe(equipeId: number, tx: any) {
  // Buscar todos os jogos válidos (com placar) da equipe
  const jogos = await tx.jogo.findMany({
    where: {
      AND: [
        {
          OR: [{ equipeAId: equipeId }, { equipeBId: equipeId }],
        },
        {
          placarA: { not: null },
        },
        {
          placarB: { not: null },
        },
      ],
    },
    select: {
      equipeAId: true,
      equipeBId: true,
      placarA: true,
      placarB: true,
    },
  });

  let pontos = 0;
  let vitorias = 0;
  let empates = 0;
  let derrotas = 0;
  let golsMarcados = 0;
  let golsSofridos = 0;

  // Calcular estatísticas baseadas nos jogos restantes
  jogos.forEach((jogo) => {
    const isEquipeA = jogo.equipeAId === equipeId;
    const meusPlacar = isEquipeA ? jogo.placarA! : jogo.placarB!;
    const adversarioPlacar = isEquipeA ? jogo.placarB! : jogo.placarA!;

    golsMarcados += meusPlacar;
    golsSofridos += adversarioPlacar;

    if (meusPlacar > adversarioPlacar) {
      // Vitória
      vitorias++;
      pontos += 3;
    } else if (meusPlacar === adversarioPlacar) {
      // Empate
      empates++;
      pontos += 1;
    } else {
      // Derrota
      derrotas++;
    }
  });

  // Atualizar as estatísticas da equipe
  await tx.equipe.update({
    where: { id: equipeId },
    data: {
      pontos,
      vitorias,
      empates,
      derrotas,
      golsMarcados,
      golsSofridos,
    },
  });

  console.log(`Estatísticas recalculadas para equipe ${equipeId}:`, {
    pontos,
    vitorias,
    empates,
    derrotas,
    golsMarcados,
    golsSofridos,
  });
}

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

    const { id } = req.query;
    const equipeId = Number(id);

    // GET - Buscar equipe
    if (req.method === "GET") {
      try {
        // ✅ CORREÇÃO: Filtrar por clientId para multi-tenant
        const equipe = await prisma.equipe.findFirst({
          where: {
            id: equipeId,
            // Filtro multi-tenant
            ...(token.clientId &&
            token.clientId !== "undefined" &&
            token.clientId !== "null"
              ? { clientId: token.clientId as string }
              : {}),
          },
        });

        if (!equipe) {
          return res.status(404).json({ error: "Equipe não encontrada" });
        }

        return res.status(200).json(equipe);
      } catch (error) {
        console.error("Erro ao buscar equipe:", error);
        return res.status(500).json({ error: "Erro ao buscar a equipe" });
      }
    }

    // PATCH - Atualizar equipe
    if (req.method === "PATCH") {
      try {
        const { nome, grupoId, escudoUrl, public_id, oldPublicId } = req.body;

        // ✅ CORREÇÃO: Verificar se a equipe existe e pertence ao cliente
        const equipeExistente = await prisma.equipe.findFirst({
          where: {
            id: equipeId,
            // Filtro multi-tenant
            ...(token.clientId &&
            token.clientId !== "undefined" &&
            token.clientId !== "null"
              ? { clientId: token.clientId as string }
              : {}),
          },
        });

        if (!equipeExistente) {
          return res.status(404).json({ error: "Equipe não encontrada" });
        }

        // ✅ CORREÇÃO: Verificar se o grupo existe e pertence ao cliente (se fornecido)
        if (grupoId && grupoId !== null) {
          const grupoExiste = await prisma.grupo.findFirst({
            where: {
              id: Number(grupoId),
              // Filtro multi-tenant
              ...(token.clientId &&
              token.clientId !== "undefined" &&
              token.clientId !== "null"
                ? { clientId: token.clientId as string }
                : {}),
            },
          });

          if (!grupoExiste) {
            return res.status(400).json({ error: "Grupo não encontrado" });
          }
        }

        // Se há uma nova imagem e existe uma imagem antiga, delete a antiga
        if (public_id && oldPublicId && public_id !== oldPublicId) {
          try {
            await deleteCloudinaryImageAndFolder(oldPublicId); // ✅ USANDO FUNÇÃO COM PASTA
          } catch (error) {
            console.error("Erro ao deletar imagem antiga:", error);
          }
        }

        const updatedEquipe = await prisma.equipe.update({
          where: { id: equipeId },
          data: {
            nome,
            grupoId: grupoId ? Number(grupoId) : null,
            escudoUrl: escudoUrl || null,
            public_id: public_id || null,
          },
        });

        return res.status(200).json(updatedEquipe);
      } catch (error) {
        console.error("Erro ao atualizar equipe:", error);
        return res.status(500).json({
          error: "Erro ao atualizar a equipe",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    // DELETE - Excluir equipe
    if (req.method === "DELETE") {
      try {
        // ✅ CORREÇÃO: Verificar se a equipe existe e pertence ao cliente
        const equipe = await prisma.equipe.findFirst({
          where: {
            id: equipeId,
            // Filtro multi-tenant
            ...(token.clientId &&
            token.clientId !== "undefined" &&
            token.clientId !== "null"
              ? { clientId: token.clientId as string }
              : {}),
          },
          select: {
            id: true,
            nome: true,
            public_id: true,
          },
        });

        if (!equipe) {
          return res.status(404).json({ error: "Equipe não encontrada" });
        }

        console.log(`Iniciando exclusão da equipe: ${equipe.nome}`);

        // Buscar todos os jogos válidos (com placar) onde a equipe participa
        // para identificar os times adversários que precisam ter suas estatísticas recalculadas
        const jogosParaExcluir = await prisma.jogo.findMany({
          where: {
            AND: [
              {
                OR: [{ equipeAId: equipeId }, { equipeBId: equipeId }],
              },
              {
                placarA: { not: null },
              },
              {
                placarB: { not: null },
              },
            ],
          },
          select: {
            id: true,
            equipeAId: true,
            equipeBId: true,
            placarA: true,
            placarB: true,
          },
        });

        // ✅ CORREÇÃO: Usar Set e converter para Array para evitar erro TypeScript
        const timesAdversariosSet = new Set<number>();
        jogosParaExcluir.forEach((jogo) => {
          if (jogo.equipeAId === equipeId) {
            timesAdversariosSet.add(jogo.equipeBId);
          } else {
            timesAdversariosSet.add(jogo.equipeAId);
          }
        });

        // Converter Set para Array
        const timesAdversarios = Array.from(timesAdversariosSet);

        console.log(
          `Jogos válidos a serem excluídos: ${jogosParaExcluir.length}`
        );
        console.log(
          `Times adversários a serem recalculados: ${timesAdversarios}`
        );

        // Usar transação para garantir consistência
        await prisma.$transaction(async (tx) => {
          // 1. Excluir todos os jogos onde a equipe participa
          const jogosExcluidos = await tx.jogo.deleteMany({
            where: {
              OR: [{ equipeAId: equipeId }, { equipeBId: equipeId }],
            },
          });

          console.log(`${jogosExcluidos.count} jogos excluídos`);

          // 2. Recalcular estatísticas dos times adversários
          for (const timeAdversarioId of timesAdversarios) {
            await recalcularEstatisticasEquipe(timeAdversarioId, tx);
          }

          // 3. Excluir a equipe
          await tx.equipe.delete({
            where: { id: equipeId },
          });
        });

        // 4. Excluir a imagem do Cloudinary (fora da transação)
        if (equipe.public_id) {
          try {
            await deleteCloudinaryImageAndFolder(equipe.public_id); // ✅ USANDO FUNÇÃO COM PASTA
            console.log(`Imagem ${equipe.public_id} excluída do Cloudinary`);
          } catch (error) {
            console.error("Erro ao excluir imagem do Cloudinary:", error);
          }
        }

        console.log(`Equipe ${equipe.nome} excluída com sucesso`);
        console.log(
          `${timesAdversarios.length} times adversários tiveram suas estatísticas recalculadas`
        );

        return res.status(200).json({
          message: "Equipe excluída com sucesso",
          jogosExcluidos: jogosParaExcluir.length,
          timesRecalculados: timesAdversarios.length,
          timesAdversarios: timesAdversarios,
        });
      } catch (error) {
        console.error("Erro ao excluir equipe:", error);
        return res.status(500).json({
          error: "Erro ao excluir a equipe",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error("Erro na API:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { prisma } from "../../../../lib/prisma";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Verificar autenticação e permissões
    const session = await getSession({ req });
    if (!session || session.user?.role !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    console.log("🔄 Iniciando restauração de backup...");

    // Parse do arquivo enviado
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const backupFile = Array.isArray(files.backup)
      ? files.backup[0]
      : files.backup;

    if (!backupFile) {
      return res
        .status(400)
        .json({ error: "Arquivo de backup não encontrado" });
    }

    // Ler e validar o arquivo JSON
    const fileContent = fs.readFileSync(backupFile.filepath, "utf8");
    let backupData;

    try {
      backupData = JSON.parse(fileContent);
    } catch (parseError) {
      return res
        .status(400)
        .json({ error: "Arquivo de backup inválido (JSON malformado)" });
    }

    // Validar estrutura do backup
    if (!backupData.metadata || !backupData.data || !backupData.statistics) {
      return res.status(400).json({ error: "Estrutura de backup inválida" });
    }

    console.log(
      `📊 Backup válido encontrado: ${backupData.statistics.totalRecords} registros`
    );

    // ATENÇÃO: Esta operação irá LIMPAR todos os dados existentes
    console.log("⚠️ LIMPANDO dados existentes...");

    // Limpar dados em ordem correta (respeitando foreign keys)
    await prisma.eventoJogo.deleteMany();
    await prisma.jogador.deleteMany();
    await prisma.jogo.deleteMany();
    await prisma.equipe.deleteMany();
    await prisma.grupo.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();

    console.log("🔄 Restaurando dados...");

    let recordsRestored = 0;

    // Restaurar dados na ordem correta
    if (backupData.data.users?.length > 0) {
      for (const user of backupData.data.users) {
        await prisma.user.create({
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified
              ? new Date(user.emailVerified)
              : null,
            image: user.image,
            password: user.password === "[ENCRYPTED]" ? null : user.password,
            role: user.role,
            permissoes: user.permissoes,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
        });
        recordsRestored++;
      }
    }

    if (backupData.data.accounts?.length > 0) {
      await prisma.account.createMany({
        data: backupData.data.accounts.map((account: any) => ({
          ...account,
          expires_at: account.expires_at,
        })),
      });
      recordsRestored += backupData.data.accounts.length;
    }

    if (backupData.data.sessions?.length > 0) {
      await prisma.session.createMany({
        data: backupData.data.sessions.map((session: any) => ({
          ...session,
          expires: new Date(session.expires),
        })),
      });
      recordsRestored += backupData.data.sessions.length;
    }

    if (backupData.data.verificationTokens?.length > 0) {
      await prisma.verificationToken.createMany({
        data: backupData.data.verificationTokens.map((token: any) => ({
          ...token,
          expires: new Date(token.expires),
        })),
      });
      recordsRestored += backupData.data.verificationTokens.length;
    }

    if (backupData.data.grupos?.length > 0) {
      await prisma.grupo.createMany({
        data: backupData.data.grupos,
      });
      recordsRestored += backupData.data.grupos.length;
    }

    if (backupData.data.equipes?.length > 0) {
      await prisma.equipe.createMany({
        data: backupData.data.equipes,
      });
      recordsRestored += backupData.data.equipes.length;
    }

    if (backupData.data.jogos?.length > 0) {
      await prisma.jogo.createMany({
        data: backupData.data.jogos.map((jogo: any) => ({
          ...jogo,
          data: new Date(jogo.data),
          createdAt: new Date(jogo.createdAt),
          updatedAt: new Date(jogo.updatedAt),
        })),
      });
      recordsRestored += backupData.data.jogos.length;
    }

    if (backupData.data.jogadores?.length > 0) {
      await prisma.jogador.createMany({
        data: backupData.data.jogadores.map((jogador: any) => ({
          ...jogador,
          createdAt: new Date(jogador.createdAt),
          updatedAt: new Date(jogador.updatedAt),
        })),
      });
      recordsRestored += backupData.data.jogadores.length;
    }

    if (backupData.data.eventosJogo?.length > 0) {
      await prisma.eventoJogo.createMany({
        data: backupData.data.eventosJogo.map((evento: any) => ({
          ...evento,
          createdAt: new Date(evento.createdAt),
          updatedAt: new Date(evento.updatedAt),
        })),
      });
      recordsRestored += backupData.data.eventosJogo.length;
    }

    console.log(
      `✅ Backup restaurado com sucesso: ${recordsRestored} registros`
    );

    // Limpar arquivo temporário
    fs.unlinkSync(backupFile.filepath);

    return res.status(200).json({
      message: "Backup restaurado com sucesso",
      recordsRestored,
      backupInfo: backupData.metadata,
    });
  } catch (error) {
    console.error("❌ Erro ao restaurar backup:", error);
    return res.status(500).json({
      error: "Erro interno do servidor ao restaurar backup",
    });
  }
}

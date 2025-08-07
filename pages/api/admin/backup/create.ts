import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { prisma } from "../../../../lib/prisma";
import fs from "fs/promises";
import path from "path";

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

    console.log("🔄 Iniciando criação de backup manual...");

    // Buscar todos os dados do banco
    const [
      users,
      accounts,
      sessions,
      verificationTokens,
      grupos,
      equipes,
      jogos,
      jogadores,
      eventosJogo,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissoes: true,
          createdAt: true,
          updatedAt: true,
          password: true,
        },
      }),
      prisma.account.findMany(),
      prisma.session.findMany(),
      prisma.verificationToken.findMany(),
      prisma.grupo.findMany(),
      prisma.equipe.findMany(),
      prisma.jogo.findMany(),
      prisma.jogador.findMany(),
      prisma.eventoJogo.findMany(),
    ]);

    // Criar estrutura do backup
    const backupData = {
      metadata: {
        version: "1.0",
        createdAt: new Date().toISOString(),
        createdBy: session.user?.email,
        system: "LHPSYSTEMS-2025",
        type: "manual", // ✅ Marcar como manual
        description: "Backup manual criado via interface",
      },
      data: {
        users: users.map((user) => ({
          ...user,
          // Remover senha do backup por segurança
          password: user.password ? "[ENCRYPTED]" : null,
        })),
        accounts,
        sessions,
        verificationTokens,
        grupos,
        equipes,
        jogos,
        jogadores,
        eventosJogo,
      },
      statistics: {
        totalTables: 9,
        totalRecords:
          users.length +
          accounts.length +
          sessions.length +
          verificationTokens.length +
          grupos.length +
          equipes.length +
          jogos.length +
          jogadores.length +
          eventosJogo.length,
        tablesCounts: {
          users: users.length,
          accounts: accounts.length,
          sessions: sessions.length,
          verificationTokens: verificationTokens.length,
          grupos: grupos.length,
          equipes: equipes.length,
          jogos: jogos.length,
          jogadores: jogadores.length,
          eventosJogo: eventosJogo.length,
        },
      },
    };

    // ✅ SALVAR BACKUP NO SERVIDOR (para aparecer na lista)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-manual-${timestamp}.json`;
    const backupsDir = path.join(process.cwd(), "backups");
    const backupPath = path.join(backupsDir, filename);

    // Criar diretório se não existir
    try {
      await fs.access(backupsDir);
    } catch {
      await fs.mkdir(backupsDir, { recursive: true });
      console.log("📁 Diretório de backups criado");
    }

    // Salvar arquivo no servidor
    const jsonData = JSON.stringify(backupData, null, 2);
    await fs.writeFile(backupPath, jsonData);

    console.log(`✅ Backup manual salvo no servidor: ${filename}`);
    console.log(`📊 Total de registros: ${backupData.statistics.totalRecords}`);

    // Converter para buffer e enviar para download
    const buffer = Buffer.from(jsonData, "utf8");

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    return res.status(200).send(buffer);
  } catch (error) {
    console.error("❌ Erro ao criar backup:", error);
    return res.status(500).json({
      error: "Erro interno do servidor ao criar backup",
    });
  }
}

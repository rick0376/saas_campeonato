import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import fs from "fs/promises";
import path from "path";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const session = await getSession({ req });

    if (!session || session.user?.role !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const backupsDir = path.join(process.cwd(), "backups");

    try {
      await fs.access(backupsDir);
    } catch {
      // Se a pasta não existir, retornar lista vazia
      return res.status(200).json({ backups: [] });
    }

    const files = await fs.readdir(backupsDir);
    const backupFiles = files.filter(
      (file) =>
        (file.startsWith("backup-") && file.endsWith(".json")) ||
        (file.startsWith("lhpsystems-backup-") && file.endsWith(".json"))
    );

    const backupsWithInfo = await Promise.all(
      backupFiles.map(async (filename) => {
        try {
          const filepath = path.join(backupsDir, filename);
          const stats = await fs.stat(filepath);
          const content = await fs.readFile(filepath, "utf-8");
          const backupData = JSON.parse(content);

          // ✅ CORREÇÃO: Detectar tipo corretamente
          let type = "manual";
          if (
            filename.includes("auto") ||
            backupData.metadata?.type === "automatic"
          ) {
            type = "automatic";
          } else if (
            filename.includes("manual") ||
            backupData.metadata?.type === "manual"
          ) {
            type = "manual";
          }

          return {
            filename,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            type,
            metadata: {
              totalRecords:
                backupData.metadata?.totalRecords ||
                backupData.statistics?.totalRecords ||
                0,
              system: backupData.metadata?.system || "LHPSYSTEMS-2025",
              version: backupData.metadata?.version || "1.0",
              createdBy: backupData.metadata?.createdBy || "Sistema",
            },
          };
        } catch (error) {
          console.error(`Erro ao processar backup ${filename}:`, error);
          return null;
        }
      })
    );

    // Filtrar backups válidos e ordenar por data (mais recentes primeiro)
    const validBackups = backupsWithInfo
      .filter((backup) => backup !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    console.log(`📋 Retornando ${validBackups.length} backups encontrados`);

    return res.status(200).json({
      backups: validBackups,
      total: validBackups.length,
    });
  } catch (error) {
    console.error("Erro ao listar backups:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

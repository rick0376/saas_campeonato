import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import fs from "fs/promises";
import path from "path";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const session = await getSession({ req });

    if (!session || session.user?.role !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { filename } = req.query;

    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ error: "Nome do arquivo inválido" });
    }

    // Validar nome do arquivo por segurança
    if (!filename.startsWith("backup-") || !filename.endsWith(".json")) {
      return res.status(400).json({ error: "Arquivo inválido" });
    }

    const backupPath = path.join(process.cwd(), "backups", filename);

    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }

    await fs.unlink(backupPath);

    console.log(`🗑️ Backup excluído: ${filename}`);

    return res.status(200).json({
      message: "Backup excluído com sucesso",
      filename,
    });
  } catch (error) {
    console.error("Erro ao excluir backup:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

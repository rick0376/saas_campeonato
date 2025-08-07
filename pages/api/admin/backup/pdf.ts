import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import fs from "fs/promises";
import path from "path";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
      return res.status(404).json({ error: "Nenhum backup encontrado" });
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

          let type = "Manual";
          if (
            filename.includes("auto") ||
            backupData.metadata?.type === "automatic"
          ) {
            type = "Automático";
          }

          return {
            filename,
            size: formatFileSize(stats.size),
            createdAt:
              stats.birthtime.toLocaleDateString("pt-BR") +
              " " +
              stats.birthtime.toLocaleTimeString("pt-BR"),
            type,
            records:
              backupData.metadata?.totalRecords ||
              backupData.statistics?.totalRecords ||
              0,
            system: backupData.metadata?.system || "LHPSYSTEMS-2025",
          };
        } catch (error) {
          return null;
        }
      })
    );

    const validBackups = backupsWithInfo
      .filter((backup) => backup !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    // Criar PDF
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("LHPSYSTEMS-2025", 20, 20);

    doc.setFontSize(16);
    doc.text("Relatório de Backups Realizados", 20, 35);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Gerado em: ${new Date().toLocaleDateString(
        "pt-BR"
      )} às ${new Date().toLocaleTimeString("pt-BR")}`,
      20,
      45
    );
    doc.text(`Por: ${session.user?.name || session.user?.email}`, 20, 52);

    // Estatísticas
    const totalBackups = validBackups.length;
    const manuais = validBackups.filter((b) => b.type === "Manual").length;
    const automaticos = validBackups.filter(
      (b) => b.type === "Automático"
    ).length;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo:", 20, 70);

    doc.setFont("helvetica", "normal");
    doc.text(`Total de Backups: ${totalBackups}`, 20, 80);
    doc.text(`Backups Manuais: ${manuais}`, 20, 87);
    doc.text(`Backups Automáticos: ${automaticos}`, 20, 94);

    // Tabela de backups
    const tableData = validBackups.map((backup, index) => [
      (index + 1).toString(),
      backup.type,
      backup.createdAt,
      backup.records.toString(),
      backup.size,
      backup.filename.substring(0, 30) +
        (backup.filename.length > 30 ? "..." : ""),
    ]);

    // ✅ CORREÇÃO: Usar autoTable corretamente
    autoTable(doc, {
      head: [["#", "Tipo", "Data/Hora", "Registros", "Tamanho", "Arquivo"]],
      body: tableData,
      startY: 110,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        1: { halign: "center", cellWidth: 25 },
        2: { halign: "center", cellWidth: 35 },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "center", cellWidth: 20 },
        5: { halign: "left", cellWidth: 75 },
      },
    });

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        "LHPSYSTEMS-2025 - Sistema de Gerenciamento de Campeonato",
        20,
        doc.internal.pageSize.height - 10
      );
    }

    // Gerar PDF como buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Configurar headers para download
    const filename = `relatorio-backups-${
      new Date().toISOString().split("T")[0]
    }.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

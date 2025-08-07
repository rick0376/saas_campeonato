import React, { useState } from "react";
import { getSession } from "next-auth/react";
import type { GetServerSideProps } from "next";
import Layout from "../../../components/Layout";
import { RouteGuard } from "../../../components/RouteGuard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, RefreshCw, Calendar, FileText } from "lucide-react";
import styles from "./styles.module.scss";

interface Jogo {
  id: number;
  data: string;
  rodada: number;
  equipeA: string;
  equipeB: string;
  placarA: number | null;
  placarB: number | null;
  status: "Pendente" | "Finalizado" | "Cancelado";
}

interface RelatorioJogosProps {
  jogos: Jogo[];
  clienteNome: string;
}

export const getServerSideProps: GetServerSideProps<
  RelatorioJogosProps
> = async (ctx) => {
  const session = await getSession(ctx);
  if (!session)
    return { redirect: { destination: "/auth/login", permanent: false } };

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const clientId =
      typeof ctx.query.clientId === "string" && ctx.query.clientId.trim() !== ""
        ? ctx.query.clientId.trim()
        : (session.user as any).clientId;

    const cliente = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });
    const clienteNome = cliente?.name ?? "Cliente";

    const jogosRaw = await prisma.jogo.findMany({
      where: { clientId },
      orderBy: [{ data: "desc" }, { rodada: "asc" }],
      select: {
        id: true,
        data: true,
        rodada: true,
        placarA: true,
        placarB: true,
        equipeA: { select: { nome: true } },
        equipeB: { select: { nome: true } },
      },
    });

    const jogos: Jogo[] = jogosRaw.map((j) => ({
      id: j.id,
      data: j.data.toISOString(),
      rodada: j.rodada,
      equipeA: j.equipeA.nome,
      equipeB: j.equipeB.nome,
      placarA: j.placarA,
      placarB: j.placarB,
      status:
        j.placarA !== null && j.placarB !== null ? "Finalizado" : "Pendente",
    }));

    await prisma.$disconnect();

    return {
      props: {
        jogos,
        clienteNome,
      },
    };
  } catch (error) {
    await prisma.$disconnect();
    return {
      props: {
        jogos: [],
        clienteNome: "Cliente",
      },
    };
  }
};

function formatDateBR(isoDate: string) {
  const date = new Date(isoDate);
  return (
    date.toLocaleDateString("pt-BR") +
    " " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function RelatorioJogos({
  jogos,
  clienteNome,
}: RelatorioJogosProps) {
  const [exportingPDF, setExportingPDF] = useState(false);

  async function getImageBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject("Erro leitura base64");
      reader.onerror = () => reject("Erro leitura arquivo");
      reader.readAsDataURL(blob);
    });
  }

  const exportarPDF = async () => {
    try {
      setExportingPDF(true);
      const logoBase64 = await getImageBase64("/imagens/logo.png");

      const doc = new jsPDF({
        format: "a4",
        unit: "mm",
        orientation: "portrait",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Cabeçalho
      doc.setFillColor(25, 35, 55);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setFillColor(218, 165, 32);
      doc.rect(0, 35, pageWidth, 5, "F");

      if (logoBase64) doc.addImage(logoBase64, "PNG", 16, 7, 16, 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(180, 190, 210);
      doc.text("LHP CUP MANAGER", 8, 25);
      doc.setFontSize(7);
      doc.text("Football Systems Platform", 8, 28);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("RELATÓRIO DE JOGOS", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(218, 165, 32);
      doc.text(clienteNome.toUpperCase(), pageWidth / 2, 28, {
        align: "center",
      });

      const agora = new Date();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(180, 190, 210);
      doc.text(
        `Relatório gerado em ${agora.toLocaleDateString(
          "pt-BR"
        )} ${agora.toLocaleTimeString("pt-BR")}`,
        pageWidth - margin,
        28,
        { align: "right" }
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(25, 35, 55);
      let startY = 45;
      doc.text("Jogos Detalhados", margin, startY);

      const tableBody = jogos.map((j) => [
        formatDateBR(j.data),
        j.rodada.toString(),
        j.equipeA,
        // Coluna única de placar com "x" no meio
        (j.placarA !== null ? j.placarA.toString() : "-") +
          " x " +
          (j.placarB !== null ? j.placarB.toString() : "-"),
        j.equipeB,
        j.status,
      ]);

      autoTable(doc, {
        startY: startY + 8,
        margin: { left: margin, right: margin },
        head: [
          ["Data e Hora", "Rodada", "Equipe A", "Placar", "Equipe B", "Status"],
        ],
        body: tableBody,
        headStyles: {
          fillColor: [25, 35, 55],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 9,
          halign: "center",
          cellPadding: 4,
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },

        didDrawPage: (data) => {
          doc.setDrawColor(218, 165, 32);
          doc.setLineWidth(1);
          let lineY =
            data.pageNumber === 1
              ? data.settings.startY + 11
              : data.settings.margin.top + 11;
          doc.line(15, lineY, pageWidth - 15, lineY);
        },
        showHead: "everyPage",
      });

      for (let i = 1; i <= doc.getNumberOfPages(); i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${doc.getNumberOfPages()}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: "right" }
        );
      }

      doc.save(`relatorio-jogos-${agora.toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      alert("Erro ao gerar relatório.");
      console.error(e);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleRefresh = () => window.location.reload();

  return (
    <RouteGuard module="relatorios" action="visualizar">
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            <header className={styles.header}>
              <div className={styles.headerIcon}>
                <Calendar size={32} />
              </div>
              <div className={styles.headerContent}>
                <h1 className={styles.title}>Relatório de Jogos</h1>
                <p className={styles.subtitle}>
                  Todos os jogos agendados e realizados
                </p>
              </div>
              <div className={styles.headerActions}>
                <button
                  onClick={exportarPDF}
                  disabled={exportingPDF}
                  className={styles.actionButton}
                >
                  <Download size={16} />{" "}
                  {exportingPDF ? "Gerando..." : "Exportar PDF"}
                </button>
                <button
                  onClick={handleRefresh}
                  className={styles.refreshButton}
                >
                  <RefreshCw size={16} /> Atualizar
                </button>
              </div>
            </header>

            <section className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data e Hora</th>
                    <th>Rodada</th>
                    <th>Equipe A</th>
                    <th>Resultado</th> {/* Apenas uma coluna de placar */}
                    <th>Equipe B</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jogos.map((j) => (
                    <tr key={j.id}>
                      <td>{formatDateBR(j.data)}</td>
                      <td>{j.rodada}</td>
                      <td>{j.equipeA}</td>
                      <td style={{ textAlign: "center" }}>
                        {j.placarA !== null ? j.placarA : "-"} x{" "}
                        {j.placarB !== null ? j.placarB : "-"}
                      </td>
                      <td>{j.equipeB}</td>
                      <td>{j.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </Layout>
    </RouteGuard>
  );
}

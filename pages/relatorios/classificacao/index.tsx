import { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import type { GetServerSideProps } from "next";
import Layout from "../../../components/Layout";
import { RouteGuard } from "../../../components/RouteGuard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Trophy,
  ArrowLeft,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Medal,
  Target,
  Users,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/router";
import styles from "./styles.module.scss";

type Equipe = {
  id: number;
  nome: string;
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
  saldoGols: number;
  jogos: number;
  aproveitamento: number;
  escudoUrl?: string;
  grupo?: {
    id: number;
    nome: string;
  };
};

type EstatisticasGerais = {
  totalEquipes: number;
  totalJogos: number;
  totalJogosFinalizados: number;
  totalGols: number;
  totalGrupos: number;
  classificados: number;
  mediaGolsPorJogo: number;
  proximosJogos: number;
  equipes: Equipe[];
  grupos: Array<{ id: number; nome: string }>;
};

type ClassificacaoProps = {
  estatisticas: EstatisticasGerais;
  session: any;
  clienteNome: string;
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);

  if (!session) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  // Extrai clientId da query ou da sessão como fallback
  const queryClientId =
    typeof ctx.query.clientId === "string" && ctx.query.clientId.trim() !== ""
      ? ctx.query.clientId.trim()
      : null;

  const clientId = queryClientId || session.user.clientId;

  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    // Buscar o nome do cliente (substitua 'cliente' e 'nome' conforme seu schema Prisma)
    const cliente = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });

    const clienteNome = cliente?.name ?? clientId;

    const [
      totalEquipes,
      totalJogos,
      totalJogosFinalizados,
      totalGrupos,
      jogosComPlacar,
      equipesData,
      gruposData,
      proximosJogos,
    ] = await Promise.all([
      prisma.equipe.count({ where: { clientId } }),
      prisma.jogo.count({ where: { clientId } }),
      prisma.jogo.count({
        where: {
          clientId,
          AND: [{ placarA: { not: null } }, { placarB: { not: null } }],
        },
      }),
      prisma.grupo.count({ where: { clientId } }),
      prisma.jogo.findMany({
        where: {
          clientId,
          AND: [{ placarA: { not: null } }, { placarB: { not: null } }],
        },
        select: {
          placarA: true,
          placarB: true,
        },
      }),
      prisma.equipe.findMany({
        where: { clientId },
        select: {
          id: true,
          nome: true,
          pontos: true,
          vitorias: true,
          empates: true,
          derrotas: true,
          golsMarcados: true,
          golsSofridos: true,
          escudoUrl: true,
          grupo: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
        orderBy: [{ pontos: "desc" }, { golsMarcados: "desc" }],
      }),
      prisma.grupo.findMany({
        where: { clientId },
        select: {
          id: true,
          nome: true,
        },
      }),
      prisma.jogo.count({
        where: {
          clientId,
          AND: [{ placarA: null }, { placarB: null }],
        },
      }),
    ]);

    const totalGols = jogosComPlacar.reduce((acc, jogo) => {
      return acc + (jogo.placarA || 0) + (jogo.placarB || 0);
    }, 0);

    const mediaGolsPorJogo =
      totalJogosFinalizados > 0
        ? Number((totalGols / totalJogosFinalizados).toFixed(2))
        : 0;

    const equipesComCalculos = equipesData.map((equipe) => ({
      ...equipe,
      saldoGols: equipe.golsMarcados - equipe.golsSofridos,
      jogos: equipe.vitorias + equipe.empates + equipe.derrotas,
      aproveitamento:
        equipe.vitorias + equipe.empates + equipe.derrotas > 0
          ? Number(
              (
                (equipe.pontos /
                  ((equipe.vitorias + equipe.empates + equipe.derrotas) * 3)) *
                100
              ).toFixed(1)
            )
          : 0,
    }));

    equipesComCalculos.sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
      return b.golsMarcados - a.golsMarcados;
    });

    const classificados =
      equipesComCalculos.length >= 4 ? 4 : equipesComCalculos.length;

    const estatisticas: EstatisticasGerais = {
      totalEquipes,
      totalJogos,
      totalJogosFinalizados,
      totalGols,
      totalGrupos,
      classificados,
      mediaGolsPorJogo,
      proximosJogos,
      equipes: equipesComCalculos,
      grupos: gruposData,
    };

    await prisma.$disconnect();

    return {
      props: {
        estatisticas,
        session: {
          ...session,
          user: {
            ...session.user,
            image: session.user?.image || null,
          },
        },
        clienteNome,
      },
    };
  } catch (error) {
    console.error("Erro ao carregar dados:", error);

    // Fallback: valores vazios + nome cliente fallback
    //const clienteNomeFallback = clientId;

    const estatisticasVazias: EstatisticasGerais = {
      totalEquipes: 0,
      totalJogos: 0,
      totalJogosFinalizados: 0,
      totalGols: 0,
      totalGrupos: 0,
      classificados: 0,
      mediaGolsPorJogo: 0,
      proximosJogos: 0,
      equipes: [],
      grupos: [],
    };

    //const clienteNome = clientId || "Cliente Desconhecido"; // defina um valor

    return {
      props: {
        estatisticas: estatisticasVazias,
        session: {
          ...session,
          user: {
            ...session.user,
            image: session.user?.image || null,
          },
        },
        clienteNome: clientId,
      },
    };
  }
};

export default function RelatorioClassificacao({
  estatisticas,
  session,
  clienteNome,
}: ClassificacaoProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [filtroGrupo, setFiltroGrupo] = useState<string>("todos");

  const equipesFiltradas =
    filtroGrupo === "todos"
      ? estatisticas.equipes
      : estatisticas.equipes.filter(
          (equipe) => equipe.grupo?.id === Number(filtroGrupo)
        );

  // Fora do componente!
  type ResumoBox = {
    label: string;
    valor: number;
    cor: [number, number, number]; // tuple, ex: [255,255,255]
  };

  async function getImageBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Falha ao carregar imagem");
    const blob = await response.blob();

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Falha na conversão para base64"));
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsDataURL(blob);
    });
  }

  const exportarPDF = async () => {
    try {
      setExportingPDF(true);

      const logoBase64 = await getImageBase64("/imagens/logo.png");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // === FUNÇÃO PARA ADICIONAR RODAPÉ EM TODAS AS PÁGINAS ===
      const addFooter = () => {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          const footerY = pageHeight - 20;

          doc.setDrawColor(220, 225, 235);
          doc.setLineWidth(0.5);
          doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(25, 35, 55);
          doc.text("LHPSYSTEMS © 2025", 15, footerY);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(
            "LHP Cup Manager - Football Systems Platform",
            15,
            footerY + 4
          );

          doc.setTextColor(100, 116, 139);
          doc.text(
            `Página ${i} de ${totalPages}`,
            pageWidth - 15,
            footerY + 4,
            {
              align: "right",
            }
          );
        }
      };

      // === HEADER EXECUTIVO ===
      doc.setFillColor(25, 35, 55);
      doc.rect(0, 0, pageWidth, 40, "F");

      doc.setFillColor(218, 165, 32);
      doc.rect(0, 35, pageWidth, 5, "F");

      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 16, 7, 16, 16);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(180, 190, 210);
      doc.text("LHP CUP MANAGER", 8, 25);

      doc.setFontSize(7);
      doc.text("Football Systems Platform", 9, 28);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("CLASSIFICAÇÃO OFICIAL", pageWidth / 2, 18, { align: "center" });

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
        )} - ${agora.toLocaleTimeString("pt-BR")}`,
        pageWidth - 5,
        28,
        { align: "right" }
      );

      let currentY = 55;

      // === CAIXA DE INFORMAÇÕES ===
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.5);
      doc.rect(15, currentY, pageWidth - 30, 20, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 85);
      doc.text("INFORMAÇÕES DO RELATÓRIO", 20, currentY + 6);

      const grupoSelecionado =
        filtroGrupo === "todos"
          ? "Todos os Grupos"
          : `Grupo ${
              estatisticas.grupos.find((g) => g.id === Number(filtroGrupo))
                ?.nome || filtroGrupo
            }`;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Escopo: ${grupoSelecionado}`, 20, currentY + 12);
      doc.text(
        `Equipes analisadas: ${estatisticas.totalEquipes}`,
        20,
        currentY + 16
      );

      currentY += 35;

      // === CARDS ESTATÍSTICOS PROFISSIONAIS ===
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(25, 35, 55);
      doc.text("INDICADORES PRINCIPAIS", 15, currentY);

      const cardData = [
        {
          label: "EQUIPES",
          valor: estatisticas.totalEquipes,
          cor: [37, 99, 235],
        },
        { label: "JOGOS", valor: estatisticas.totalJogos, cor: [16, 185, 129] },
        { label: "GOLS", valor: estatisticas.totalGols, cor: [245, 101, 101] },
        {
          label: "GRUPOS",
          valor: estatisticas.totalGrupos,
          cor: [139, 92, 246],
        },
      ];

      const cardWidth = 40;
      const cardHeight = 22;
      const cardSpacing = 8;
      const totalWidth =
        cardWidth * cardData.length + cardSpacing * (cardData.length - 1);
      const startX = (pageWidth - totalWidth) / 2;

      cardData.forEach((card, index) => {
        const x = startX + index * (cardWidth + cardSpacing);
        const y = currentY + 5;

        doc.setFillColor(0, 0, 0, 0.1);
        doc.rect(x + 1, y + 1, cardWidth, cardHeight, "F");

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.5);
        doc.rect(x, y, cardWidth, cardHeight, "FD");

        doc.setFillColor(card.cor[0], card.cor[1], card.cor[2]);
        doc.rect(x, y, cardWidth, 3, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(25, 35, 55);
        doc.text(card.valor.toString(), x + cardWidth / 2, y + 12, {
          align: "center",
        });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(card.label, x + cardWidth / 2, y + 18, { align: "center" });
      });

      currentY += 40;

      // === TÍTULO DA TABELA ===
      // Calcular espaço para título + 1 linha da tabela + margem rodapé
      const alturaTitulo = 8;
      const alturaLinhaTabela = 12;
      const margemRodape = 30;
      const alturaNecessaria = alturaTitulo + alturaLinhaTabela + 8;

      if (currentY + alturaNecessaria + margemRodape > pageHeight) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(25, 35, 55);
      doc.text("TABELA DE CLASSIFICAÇÃO", 15, currentY);

      // === TABELA PRINCIPAL PROFISSIONAL ===
      const colunas = [
        "POS",
        "EQUIPE",
        "GRUPO",
        "PTS",
        "J",
        "V",
        "E",
        "D",
        "GP",
        "GC",
        "SG",
        "%",
      ];

      const linhas = equipesFiltradas.map((equipe, index) => [
        (index + 1).toString(),
        equipe.nome,
        equipe.grupo?.nome || "-",
        equipe.pontos.toString(),
        equipe.jogos.toString(),
        equipe.vitorias.toString(),
        equipe.empates.toString(),
        equipe.derrotas.toString(),
        equipe.golsMarcados.toString(),
        equipe.golsSofridos.toString(),
        equipe.saldoGols >= 0
          ? `+${equipe.saldoGols}`
          : equipe.saldoGols.toString(),
        `${equipe.aproveitamento}%`,
      ]);

      autoTable(doc, {
        startY: currentY + 8,
        head: [colunas],
        body: linhas,
        theme: "plain",
        margin: { left: 15, right: 15, bottom: 30 },
        styles: {
          fontSize: 8,
          cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
          lineColor: [230, 235, 245],
          lineWidth: 0.3,
          halign: "center",
          valign: "middle",
          textColor: [55, 65, 85],
        },
        headStyles: {
          fillColor: [25, 35, 55],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
          cellPadding: { top: 6, bottom: 6, left: 3, right: 3 },
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { halign: "center", fontStyle: "bold", cellWidth: 12 },
          1: { halign: "left", fontStyle: "bold", cellWidth: 50 },
          2: { halign: "center", cellWidth: 16 },
          3: {
            halign: "center",
            fontStyle: "bold",
            textColor: [16, 185, 129],
            cellWidth: 12,
          },
          4: { halign: "center", cellWidth: 10 },
          5: { halign: "center", textColor: [16, 185, 129], cellWidth: 10 },
          6: { halign: "center", textColor: [245, 158, 11], cellWidth: 10 },
          7: { halign: "center", textColor: [245, 101, 101], cellWidth: 10 },
          8: { halign: "center", cellWidth: 12 },
          9: { halign: "center", cellWidth: 12 },
          10: { halign: "center", fontStyle: "bold", cellWidth: 12 },
          11: { halign: "center", cellWidth: 15 },
        },
        didDrawPage: (data) => {
          doc.setDrawColor(218, 165, 32);
          doc.setLineWidth(1);
          let lineY =
            data.pageNumber === 1
              ? data.settings.startY + 15
              : data.settings.margin.top + 15;
          doc.line(14, lineY, pageWidth - 15, lineY);
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            const rowIndex = data.row.index;

            // Líder
            if (rowIndex === 0) {
              data.cell.styles.fillColor = [255, 248, 220];
              data.cell.styles.fontStyle = "bold";
            }
            // Zona de classificação (posições 2-4)
            else if (rowIndex >= 1 && rowIndex <= 3) {
              data.cell.styles.fillColor = [236, 253, 245];
            }
            // Zona de rebaixamento (últimas 4)
            else if (rowIndex >= equipesFiltradas.length - 4) {
              data.cell.styles.fillColor = [254, 242, 242];
            }

            // Colorir saldo de gols
            if (data.column.index === 10) {
              const valor = data.cell.text[0];
              if (valor.startsWith("+")) {
                data.cell.styles.textColor = [16, 185, 129];
              } else if (valor.startsWith("-")) {
                data.cell.styles.textColor = [245, 101, 101];
              }
            }
          }
        },
      });

      // Verificar se cabe legenda na página atual, senão add nova página
      let currentYAfterTable = (doc as any).lastAutoTable.finalY + 15;
      if (currentYAfterTable + 40 + 30 > pageHeight) {
        doc.addPage();
        currentYAfterTable = 20;
      }

      // === LEGENDA PROFISSIONAL ===
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(25, 35, 55);
      doc.text("LEGENDA", 15, currentYAfterTable);

      const legendItems = [
        { cor: [255, 248, 220], label: "Líder", desc: "1º Colocado" },
        {
          cor: [236, 253, 245],
          label: "Classificados",
          desc: "Posições 2º ao 4º",
        },
        {
          cor: [254, 242, 242],
          label: "Rebaixamento",
          desc: "4 últimas posições",
        },
      ];

      legendItems.forEach((item, index) => {
        const y = currentYAfterTable + 5 + index * 10;

        doc.setFillColor(item.cor[0], item.cor[1], item.cor[2]);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(15, y, 8, 5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 85);
        doc.text(item.label, 28, y + 2.5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`- ${item.desc}`, 28, y + 6);
      });

      // Rodapé em todas as páginas
      addFooter();

      const timestamp = agora.toISOString().slice(0, 10);
      const nomeArquivo = `relatorio-campeonato-${timestamp}.pdf`;

      doc.save(nomeArquivo);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar relatório. Verifique os dados e tente novamente.");
    } finally {
      setExportingPDF(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      window.location.reload();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTendencia = (posicao: number) => {
    if (posicao <= 4) return "up";
    if (posicao > equipesFiltradas.length - 4) return "down";
    return "stable";
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case "up":
        return <TrendingUp size={16} className={styles.trendingUp} />;
      case "down":
        return <TrendingDown size={16} className={styles.trendingDown} />;
      default:
        return <Minus size={16} className={styles.trendingStable} />;
    }
  };

  return (
    <RouteGuard module="relatorios" action="visualizar">
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <Trophy size={32} />
              </div>
              <div className={styles.headerContent}>
                <h1 className={styles.title}>Classificação Geral</h1>
                <p className={styles.subtitle}>
                  Tabela e estatísticas do {clienteNome}
                </p>
              </div>
              <div className={styles.headerActions}>
                <button
                  className={styles.actionButton}
                  onClick={exportarPDF}
                  disabled={exportingPDF}
                >
                  <Download size={16} />
                  {exportingPDF ? "Gerando..." : "Exportar PDF"}
                </button>
                <button
                  className={styles.actionButton}
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw
                    size={16}
                    className={loading ? styles.spinning : ""}
                  />
                  Atualizar
                </button>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Users size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>
                    {estatisticas.totalEquipes}
                  </span>
                  <span className={styles.statLabel}>Equipes</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Calendar size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>
                    {estatisticas.totalJogos}
                  </span>
                  <span className={styles.statLabel}>Total de Jogos</span>
                  <span className={styles.statDetail}>
                    {estatisticas.totalJogosFinalizados} finalizados
                  </span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Target size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>
                    {estatisticas.totalGols}
                  </span>
                  <span className={styles.statLabel}>Gols Marcados</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Medal size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>
                    {estatisticas.classificados}
                  </span>
                  <span className={styles.statLabel}>Classificados</span>
                </div>
              </div>
            </div>

            <div className={styles.filtersSection}>
              <div className={styles.filterGroup}>
                <Filter size={16} />
                <span className={styles.filterLabel}>Filtrar por grupo:</span>
                <select
                  value={filtroGrupo}
                  onChange={(e) => setFiltroGrupo(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="todos">Todos os Grupos</option>
                  {estatisticas.grupos.map((grupo) => (
                    <option key={grupo.id} value={grupo.id}>
                      Grupo {grupo.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableWrapper}>
                <table className={styles.classificacaoTable}>
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Tend</th>
                      <th>Equipe</th>
                      <th>Grupo</th>
                      <th>Pts</th>
                      <th>J</th>
                      <th>V</th>
                      <th>E</th>
                      <th>D</th>
                      <th>GP</th>
                      <th>GC</th>
                      <th>SG</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={13} className={styles.loadingCell}>
                          <div className={styles.loadingContent}>
                            <RefreshCw size={20} className={styles.spinning} />
                            Carregando classificação...
                          </div>
                        </td>
                      </tr>
                    ) : equipesFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={13} className={styles.loadingCell}>
                          Nenhuma equipe encontrada para o filtro selecionado.
                        </td>
                      </tr>
                    ) : (
                      equipesFiltradas.map((equipe, index) => (
                        <tr
                          key={equipe.id}
                          className={`${styles.tableRow} ${
                            index < 4
                              ? styles.classificado
                              : index >= equipesFiltradas.length - 4
                              ? styles.rebaixamento
                              : ""
                          }`}
                        >
                          <td className={styles.posicaoCell}>
                            <span className={styles.posicao}>{index + 1}</span>
                          </td>
                          <td className={styles.tendenciaCell}>
                            {getTendenciaIcon(getTendencia(index + 1))}
                          </td>
                          <td className={styles.equipeCell}>
                            <div className={styles.equipeInfo}>
                              <img
                                src={equipe.escudoUrl || "/imagens/escudo.png"}
                                alt={`Escudo ${equipe.nome}`}
                                className={styles.escudo}
                                onError={(e) => {
                                  e.currentTarget.src = "/imagens/escudo.png";
                                }}
                              />
                              <span className={styles.nomeEquipe}>
                                {equipe.nome}
                              </span>
                            </div>
                          </td>
                          <td className={styles.grupoCell}>
                            {equipe.grupo ? (
                              <span className={styles.grupoTag}>
                                {equipe.grupo.nome}
                              </span>
                            ) : (
                              <span className={styles.semGrupo}>-</span>
                            )}
                          </td>
                          <td className={styles.pontosCell}>
                            <span className={styles.pontos}>
                              {equipe.pontos}
                            </span>
                          </td>
                          <td className={styles.jogosCell}>{equipe.jogos}</td>
                          <td className={styles.vitoriasCell}>
                            {equipe.vitorias}
                          </td>
                          <td className={styles.empatesCell}>
                            {equipe.empates}
                          </td>
                          <td className={styles.derrotasCell}>
                            {equipe.derrotas}
                          </td>
                          <td className={styles.golsCell}>
                            {equipe.golsMarcados}
                          </td>
                          <td className={styles.golsCell}>
                            {equipe.golsSofridos}
                          </td>
                          <td
                            className={`${styles.saldoCell} ${
                              equipe.saldoGols > 0
                                ? styles.positivo
                                : equipe.saldoGols < 0
                                ? styles.negativo
                                : ""
                            }`}
                          >
                            {equipe.saldoGols > 0 ? "+" : ""}
                            {equipe.saldoGols}
                          </td>
                          <td className={styles.aproveitamentoCell}>
                            {equipe.aproveitamento}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.legenda}>
              <div className={styles.legendaItem}>
                <div
                  className={`${styles.legendaCor} ${styles.classificado}`}
                ></div>
                <span>Classificação para próxima fase (Top 4)</span>
              </div>
              <div className={styles.legendaItem}>
                <div
                  className={`${styles.legendaCor} ${styles.rebaixamento}`}
                ></div>
                <span>Zona de rebaixamento (Bottom 4)</span>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </RouteGuard>
  );
}

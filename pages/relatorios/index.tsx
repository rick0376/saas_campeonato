import { useState } from "react";
import { getSession } from "next-auth/react";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { usePermissions } from "../../hooks/usePermissions";
import { CanView } from "../../components/ProtectedComponent";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  BarChart3,
  Trophy,
  Calendar,
  Users,
  User,
  Activity,
  Lock,
  RefreshCw,
  Download,
  FileText,
  ArrowRight,
  Award,
  TrendingUp,
  Target,
  Zap,
  Clock,
} from "lucide-react";

import styles from "./styles.module.scss";

type EstatisticasGerais = {
  totalEquipes: number;
  totalJogos: number;
  totalJogosFinalizados: number;
  totalGols: number;
  totalGrupos: number;
  totalJogadores: number;
  totalEventos: number;
  mediaGolsPorJogo: number;
  equipeMaisGols: { nome: string; gols: number } | null;
  artilheiro: { nome: string; gols: number; equipe: string } | null;
  jogoMaisGols: { equipeA: string; equipeB: string; gols: number } | null;
  proximosJogos: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  assistencias: number;
};

type RelatoriosProps = {
  estatisticas: EstatisticasGerais;
  session: any;
  clienteNome: string;
};

export const getServerSideProps: GetServerSideProps<RelatoriosProps> = async (
  ctx
) => {
  const session = await getSession(ctx);

  if (!session) {
    return {
      redirect: { destination: "/auth/login", permanent: false },
    };
  }

  const queryClientId =
    typeof ctx.query.clientId === "string" && ctx.query.clientId !== ""
      ? ctx.query.clientId
      : null;

  const clientId = queryClientId || session.user.clientId;
  let clienteNome = "Cliente Padrão";

  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    // Buscar o nome do cliente
    const cliente = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });

    clienteNome = cliente?.name ?? clientId;

    const [
      totalEquipes,
      totalJogos,
      totalJogosFinalizados,
      totalGrupos,
      totalJogadores,
      totalEventos,
      jogosComPlacar,
      eventos,
      topEquipeGols,
      topArtilheiro,
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
      prisma.jogador.count({ where: { clientId, ativo: true } }),
      prisma.eventoJogo.count({ where: { clientId } }),
      prisma.jogo.findMany({
        where: {
          clientId,
          AND: [{ placarA: { not: null } }, { placarB: { not: null } }],
        },
        select: {
          placarA: true,
          placarB: true,
          equipeA: { select: { nome: true } },
          equipeB: { select: { nome: true } },
        },
      }),
      prisma.eventoJogo.groupBy({
        by: ["tipo"],
        where: { clientId },
        _count: { tipo: true },
      }),
      prisma.jogo.findMany({
        where: {
          clientId,
          AND: [{ placarA: { not: null } }, { placarB: { not: null } }],
        },
        select: {
          placarA: true,
          placarB: true,
          equipeA: { select: { id: true, nome: true } },
          equipeB: { select: { id: true, nome: true } },
        },
      }),
      prisma.eventoJogo.groupBy({
        by: ["jogadorId"],
        where: { clientId, tipo: "gol" },
        _count: { jogadorId: true },
        orderBy: { _count: { jogadorId: "desc" } },
        take: 1,
      }),
      prisma.jogo.count({
        where: {
          clientId,
          AND: [{ placarA: null }, { placarB: null }],
        },
      }),
    ]);

    const totalGols = jogosComPlacar.reduce(
      (acc, jogo) => acc + (jogo.placarA || 0) + (jogo.placarB || 0),
      0
    );

    const mediaGolsPorJogo =
      totalJogosFinalizados > 0
        ? Number((totalGols / totalJogosFinalizados).toFixed(2))
        : 0;

    const eventosPorTipo = eventos.reduce((acc: any, evento: any) => {
      acc[evento.tipo] = evento._count.tipo;
      return acc;
    }, {});

    const golsPorEquipe = new Map<string, { nome: string; gols: number }>();

    topEquipeGols.forEach((jogo: any) => {
      const equipeA = golsPorEquipe.get(jogo.equipeA.id) || {
        nome: jogo.equipeA.nome,
        gols: 0,
      };
      equipeA.gols += jogo.placarA || 0;
      golsPorEquipe.set(jogo.equipeA.id, equipeA);

      const equipeB = golsPorEquipe.get(jogo.equipeB.id) || {
        nome: jogo.equipeB.nome,
        gols: 0,
      };
      equipeB.gols += jogo.placarB || 0;
      golsPorEquipe.set(jogo.equipeB.id, equipeB);
    });

    const equipeMaisGols =
      Array.from(golsPorEquipe.values()).sort((a, b) => b.gols - a.gols)[0] ||
      null;

    let artilheiro = null;
    if (topArtilheiro.length > 0) {
      const jogadorInfo = await prisma.jogador.findUnique({
        where: { id: topArtilheiro[0].jogadorId },
        select: {
          nome: true,
          equipe: { select: { nome: true } },
        },
      });

      if (jogadorInfo) {
        artilheiro = {
          nome: jogadorInfo.nome,
          gols: topArtilheiro[0]._count.jogadorId,
          equipe: jogadorInfo.equipe?.nome || "",
        };
      }
    }

    const jogoMaisGols =
      jogosComPlacar
        .map((jogo) => ({
          equipeA: jogo.equipeA.nome,
          equipeB: jogo.equipeB.nome,
          gols: (jogo.placarA || 0) + (jogo.placarB || 0),
        }))
        .sort((a, b) => b.gols - a.gols)[0] || null;

    const estatisticas: EstatisticasGerais = {
      totalEquipes,
      totalJogos,
      totalJogosFinalizados,
      totalGols,
      totalGrupos,
      totalJogadores,
      totalEventos,
      mediaGolsPorJogo,
      equipeMaisGols,
      artilheiro,
      jogoMaisGols,
      proximosJogos,
      cartoesAmarelos: eventosPorTipo.cartao_amarelo || 0,
      cartoesVermelhos: eventosPorTipo.cartao_vermelho || 0,
      assistencias: eventosPorTipo.assistencia || 0,
    };

    await prisma.$disconnect();

    return {
      props: {
        estatisticas,
        clienteNome,
        session: {
          ...session,
          user: {
            ...session.user,
            image: session.user?.image || null,
          },
        },
      },
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);

    const estatisticasVazias: EstatisticasGerais = {
      totalEquipes: 0,
      totalJogos: 0,
      totalJogosFinalizados: 0,
      totalGols: 0,
      totalGrupos: 0,
      totalJogadores: 0,
      totalEventos: 0,
      mediaGolsPorJogo: 0,
      equipeMaisGols: null,
      artilheiro: null,
      jogoMaisGols: null,
      proximosJogos: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      assistencias: 0,
    };

    return {
      props: {
        estatisticas: estatisticasVazias,
        clienteNome,
        session: {
          ...session,
          user: {
            ...session.user,
            image: session.user?.image || null,
          },
        },
      },
    };
  }
};

// Função auxiliar para carregar imagem base64
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

export default function Relatorios({
  estatisticas,
  session,
  clienteNome,
}: RelatoriosProps) {
  const router = useRouter();
  const { canView } = usePermissions();
  const [loading, setLoading] = useState(false);

  const clientIdFromQuery =
    typeof router.query.clientId === "string" &&
    router.query.clientId.trim() !== ""
      ? router.query.clientId.trim()
      : null;

  const clientId = clientIdFromQuery || session?.user?.clientId || "";

  if (!canView("relatorios")) {
    return (
      <Layout>
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedIcon}>
            <Lock size={48} />
          </div>
          <h2 className={styles.accessDeniedTitle}>Acesso Negado</h2>
          <p className={styles.accessDeniedDescription}>
            Você não tem permissão para visualizar relatórios.
          </p>
          <Link href="/" className={styles.backToHomeButton}>
            Voltar ao Início
          </Link>
        </div>
      </Layout>
    );
  }

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

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const logoBase64 = await getImageBase64("/imagens/logo.png");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // === HEADER EXECUTIVO PADRÃO ===
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
      doc.text("RELATÓRIO DO CAMPEONATO", pageWidth / 2, 18, {
        align: "center",
      });

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
      doc.text("ANÁLISE COMPLETA DO CAMPEONATO", 20, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Estatísticas gerais e destaques do torneio", 20, currentY + 12);
      doc.text(
        "Dados compilados de todas as partidas disputadas",
        20,
        currentY + 16
      );

      currentY += 35;

      // === CARDS ESTATÍSTICOS ===
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
          label: "JOGADORES",
          valor: estatisticas.totalJogadores,
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

      // === TABELA DE ESTATÍSTICAS ===
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(25, 35, 55);
      doc.text("ESTATÍSTICAS DETALHADAS", 15, currentY);

      const statsHead = ["MÉTRICA", "VALOR"];
      const statsBody = [
        ["Total de Equipes", estatisticas.totalEquipes.toString()],
        ["Total de Jogos", estatisticas.totalJogos.toString()],
        ["Total de Gols", estatisticas.totalGols.toString()],
        ["Média de Gols/Jogo", estatisticas.mediaGolsPorJogo.toString()],
        ["Total de Jogadores", estatisticas.totalJogadores.toString()],
      ];

      autoTable(doc, {
        startY: currentY + 8,
        head: [statsHead],
        body: statsBody,
        theme: "plain",
        showHead: "everyPage",
        styles: {
          fontSize: 9,
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
          fontSize: 9,
          halign: "center",
          cellPadding: { top: 6, bottom: 6, left: 3, right: 3 },
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold", cellWidth: 80 },
          1: {
            halign: "center",
            fontStyle: "bold",
            textColor: [16, 185, 129],
            cellWidth: 40,
          },
        },
        didDrawPage: (data: any) => {
          doc.setDrawColor(218, 165, 32);
          doc.setLineWidth(1);

          let lineY;
          if (data.pageNumber === 1) {
            lineY = data.settings.startY + 15;
          } else {
            lineY = data.settings.margin.top + 15;
          }

          doc.line(15, lineY, pageWidth - 75, lineY);
        },
        margin: { left: 15, right: 15 },
      });

      // === FORÇAR NOVA PÁGINA ===
      doc.addPage();
      currentY = 20;

      // === TABELA DE DESTAQUES ===
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(25, 35, 55);
      doc.text("DESTAQUES DO CAMPEONATO", 15, currentY);

      const destaquesHead = ["CATEGORIA", "DESTAQUE"];
      const destaquesBody = [
        [
          "Artilheiro",
          `${estatisticas.artilheiro?.nome || "N/A"} (${
            estatisticas.artilheiro?.gols || 0
          } gols)`,
        ],
        [
          "Equipe + Gols",
          `${estatisticas.equipeMaisGols?.nome || "N/A"} (${
            estatisticas.equipeMaisGols?.gols || 0
          } gols)`,
        ],
        [
          "Jogo + Gols",
          `${estatisticas.jogoMaisGols?.equipeA || "N/A"} vs ${
            estatisticas.jogoMaisGols?.equipeB || "N/A"
          } (${estatisticas.jogoMaisGols?.gols || 0} gols)`,
        ],
      ];

      autoTable(doc, {
        startY: currentY + 8,
        head: [destaquesHead],
        body: destaquesBody,
        theme: "plain",
        showHead: "everyPage",
        styles: {
          fontSize: 9,
          cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
          lineColor: [230, 235, 245],
          lineWidth: 0.3,
          halign: "left",
          valign: "middle",
          textColor: [55, 65, 85],
        },
        headStyles: {
          fillColor: [25, 35, 55],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
          halign: "center",
          cellPadding: { top: 6, bottom: 6, left: 3, right: 3 },
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold", cellWidth: 40 },
          1: { halign: "left", cellWidth: 80 },
        },

        didDrawPage: (data: any) => {
          doc.setDrawColor(218, 165, 32);
          doc.setLineWidth(1);

          let lineY;
          if (data.pageNumber === 1) {
            lineY = data.settings.startY + 15;
          } else {
            lineY = data.settings.margin.top + 15;
          }

          doc.line(15, lineY, pageWidth - 75, lineY);
        },

        margin: { left: 15, right: 15 },
      });

      // === RODAPÉ EM TODAS AS PÁGINAS ===
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
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 15, footerY + 4, {
          align: "right",
        });
      }

      const timestamp = agora.toISOString().slice(0, 10);
      const nomeArquivo = `relatorio-campeonato-${timestamp}.pdf`;

      doc.save(nomeArquivo);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar relatório. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const relatoriosDisponiveis = [
    {
      id: "classificacao",
      titulo: "Classificação Geral",
      descricao: "Tabela completa com pontuação e estatísticas por equipe",
      icon: <Trophy size={24} />,
      cor: "#eab308",
      link: "/relatorios/classificacao",
      module: "classificacao",
    },
    {
      id: "equipes",
      titulo: "Relatório de Equipes",
      descricao: "Análise completa das equipes participantes",
      icon: <Users size={24} />,
      cor: "#10b981",
      link: "/relatorios/equipes",
      module: "equipes",
    },
    {
      id: "jogos",
      titulo: "Relatório de Jogos",
      descricao: "Histórico completo de partidas e resultados",
      icon: <Calendar size={24} />,
      cor: "#3b82f6",
      link: "/relatorios/jogos",
      module: "jogos",
    },
    {
      id: "jogadores",
      titulo: "Relatório de Jogadores",
      descricao: "Estatísticas individuais dos jogadores",
      icon: <User size={24} />,
      cor: "#ef4444",
      link: "/relatorios/jogadores",
      module: "jogadores",
    },
    {
      id: "estatisticas",
      titulo: "Estatísticas Detalhadas",
      descricao: "Análise completa de gols, cartões e assistências",
      icon: <BarChart3 size={24} />,
      cor: "#8b5cf6",
      link: "/relatorios/estatisticas",
      module: "estatisticas",
    },
  ].filter((relatorio) => canView(relatorio.module));

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <FileText size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Relatórios e Estatísticas</h1>
              <p className={styles.subtitle}>
                Análise completa do {clienteNome}
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.actionButton}
                onClick={handleExportPDF}
                disabled={loading}
              >
                <Download size={16} />
                {loading ? "Gerando..." : "Exportar PDF"}
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

          {/* Estatísticas Principais */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Users size={24} />
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
                <Calendar size={24} />
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
                <Target size={24} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>
                  {estatisticas.totalGols}
                </span>
                <span className={styles.statLabel}>Gols Marcados</span>
                <span className={styles.statDetail}>
                  {estatisticas.mediaGolsPorJogo} por jogo
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <User size={24} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>
                  {estatisticas.totalJogadores}
                </span>
                <span className={styles.statLabel}>Jogadores</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Activity size={24} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>
                  {estatisticas.totalEventos}
                </span>
                <span className={styles.statLabel}>Eventos</span>
                <span className={styles.statDetail}>
                  {estatisticas.cartoesAmarelos + estatisticas.cartoesVermelhos}{" "}
                  cartões
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Clock size={24} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>
                  {estatisticas.proximosJogos}
                </span>
                <span className={styles.statLabel}>Próximos Jogos</span>
              </div>
            </div>
          </div>

          {/* Destaques do Campeonato */}
          <div className={styles.highlightsSection}>
            <h2 className={styles.sectionTitle}>Destaques do Campeonato</h2>
            <div className={styles.highlightsGrid}>
              {estatisticas.artilheiro && (
                <div className={styles.highlightCard}>
                  <div className={styles.highlightIcon}>
                    <Award size={24} />
                  </div>
                  <div className={styles.highlightContent}>
                    <h3>Artilheiro</h3>
                    <p className={styles.highlightName}>
                      {estatisticas.artilheiro.nome}
                    </p>
                    <p className={styles.highlightDetail}>
                      {estatisticas.artilheiro.gols} gols •{" "}
                      {estatisticas.artilheiro.equipe}
                    </p>
                  </div>
                </div>
              )}

              {estatisticas.equipeMaisGols && (
                <div className={styles.highlightCard}>
                  <div className={styles.highlightIcon}>
                    <TrendingUp size={24} />
                  </div>
                  <div className={styles.highlightContent}>
                    <h3>Ataque Mais Eficaz</h3>
                    <p className={styles.highlightName}>
                      {estatisticas.equipeMaisGols.nome}
                    </p>
                    <p className={styles.highlightDetail}>
                      {estatisticas.equipeMaisGols.gols} gols marcados
                    </p>
                  </div>
                </div>
              )}

              {estatisticas.jogoMaisGols && (
                <div className={styles.highlightCard}>
                  <div className={styles.highlightIcon}>
                    <Zap size={24} />
                  </div>
                  <div className={styles.highlightContent}>
                    <h3>Jogo com Mais Gols</h3>
                    <p className={styles.highlightName}>
                      {estatisticas.jogoMaisGols.equipeA} vs{" "}
                      {estatisticas.jogoMaisGols.equipeB}
                    </p>
                    <p className={styles.highlightDetail}>
                      {estatisticas.jogoMaisGols.gols} gols na partida
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Relatórios Disponíveis */}
          <div className={styles.reportsSection}>
            <h2 className={styles.sectionTitle}>Relatórios Disponíveis</h2>
            {relatoriosDisponiveis.length > 0 ? (
              <div className={styles.reportsGrid}>
                {relatoriosDisponiveis.map((relatorio) => (
                  <Link
                    key={relatorio.id}
                    href={{
                      pathname: relatorio.link,
                      query: clientId ? { clientId } : {},
                    }}
                    className={styles.reportCard}
                  >
                    <div
                      className={styles.reportIcon}
                      style={{ backgroundColor: relatorio.cor }}
                    >
                      {relatorio.icon}
                    </div>
                    <div className={styles.reportContent}>
                      <h3 className={styles.reportTitle}>{relatorio.titulo}</h3>
                      <p className={styles.reportDescription}>
                        {relatorio.descricao}
                      </p>
                    </div>
                    <div className={styles.reportArrow}>
                      <ArrowRight size={16} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.noReports}>
                <div className={styles.noReportsIcon}>
                  <FileText size={48} />
                </div>
                <h3>Nenhum relatório disponível</h3>
                <p>
                  Você não tem permissão para acessar os relatórios disponíveis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

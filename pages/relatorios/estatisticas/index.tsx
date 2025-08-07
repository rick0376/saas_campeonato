import { useState } from "react";
import { getSession } from "next-auth/react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { RouteGuard } from "../../../components/RouteGuard";
import { CanView } from "../../../components/ProtectedComponent";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Trophy,
  Calendar,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Target,
  Award,
  Zap,
  Shield,
  ArrowLeft,
  Activity,
  Medal,
  Minus,
  ArrowRight,
} from "lucide-react";
import styles from "./styles.module.scss";

// ======= TIPOS =======
type EquipeEstatistica = {
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
  escudoUrl?: string | null;
  grupo?: {
    id: number;
    nome: string;
  } | null;
};

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
  equipes: EquipeEstatistica[];
};

type EstatisticasProps = {
  estatisticas: EstatisticasGerais;
  session: any;
  clienteNome: string;
};

// ======= getServerSideProps com filtro clientId aplicado =======
export const getServerSideProps: GetServerSideProps<EstatisticasProps> = async (
  ctx
) => {
  const session = await getSession(ctx);
  if (!session) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  // Pega clientId da query string, se tiver e for válido, senão da sessão
  const queryClientId =
    typeof ctx.query.clientId === "string" && ctx.query.clientId.trim() !== ""
      ? ctx.query.clientId.trim()
      : null;

  const clientId = queryClientId || session.user.clientId;

  let clienteNome = "Cliente Padrão";

  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    // Buscar o nome do cliente (substitua 'cliente' e 'nome' conforme seu schema Prisma)
    const cliente = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });

    const clienteNome = cliente?.name ?? clientId;

    // Fazer todas as consultas filtrando pelo clientId
    const [
      totalEquipes,
      totalJogos,
      totalJogosFinalizados,
      totalGrupos,
      totalJogadores,
      totalEventos,
      jogosComPlacar,
      eventos,
      equipesData,
      topArtilheiro,
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
            select: { id: true, nome: true },
          },
        },
        orderBy: [{ pontos: "desc" }, { golsMarcados: "desc" }],
      }),
      prisma.eventoJogo.groupBy({
        by: ["jogadorId"],
        where: { clientId, tipo: "gol" },
        _count: { jogadorId: true },
        orderBy: { _count: { jogadorId: "desc" } },
        take: 1,
      }),
    ]);

    // Processar dados
    const totalGols = jogosComPlacar.reduce((acc, jogo) => {
      return acc + (jogo.placarA || 0) + (jogo.placarB || 0);
    }, 0);

    const mediaGolsPorJogo =
      totalJogosFinalizados > 0
        ? Number((totalGols / totalJogosFinalizados).toFixed(2))
        : 0;

    const eventosPorTipo = eventos.reduce((acc: any, evento: any) => {
      acc[evento.tipo] = evento._count.tipo;
      return acc;
    }, {});

    // Processar equipes com cálculos
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

    const equipeMaisGols =
      equipesComCalculos.length > 0
        ? equipesComCalculos.reduce((prev, current) =>
            current.golsMarcados > prev.golsMarcados ? current : prev
          )
        : null;

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
      jogosComPlacar.length > 0
        ? jogosComPlacar
            .map((jogo) => ({
              equipeA: jogo.equipeA.nome,
              equipeB: jogo.equipeB.nome,
              gols: (jogo.placarA || 0) + (jogo.placarB || 0),
            }))
            .sort((a, b) => b.gols - a.gols)[0]
        : null;

    const proximosJogos = await prisma.jogo.count({
      where: {
        clientId,
        AND: [{ placarA: null }, { placarB: null }],
      },
    });

    const estatisticas: EstatisticasGerais = {
      totalEquipes,
      totalJogos,
      totalJogosFinalizados,
      totalGols,
      totalGrupos,
      totalJogadores,
      totalEventos,
      mediaGolsPorJogo,
      equipeMaisGols: equipeMaisGols
        ? {
            nome: equipeMaisGols.nome,
            gols: equipeMaisGols.golsMarcados,
          }
        : null,
      artilheiro,
      jogoMaisGols,
      proximosJogos,
      cartoesAmarelos: eventosPorTipo.cartao_amarelo || 0,
      cartoesVermelhos: eventosPorTipo.cartao_vermelho || 0,
      assistencias: eventosPorTipo.assistencia || 0,
      equipes: equipesComCalculos,
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
    console.error("Erro ao carregar estatísticas:", error);

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
      equipes: [],
    };

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
        clienteNome,
      },
    };
  }
};

// ======= COMPONENTE PRINCIPAL =======
export default function EstatisticasDetalhadas({
  estatisticas,
  session,
  clienteNome,
}: EstatisticasProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [filtroTempo, setFiltroTempo] = useState("geral");

  // Definição consistente de clientId local para eventuais usos futuros
  const clientId =
    typeof router.query.clientId === "string" &&
    router.query.clientId.trim() !== ""
      ? router.query.clientId.trim()
      : session.user.clientId;

  const equipesFiltradasPorGrupo =
    filtroGrupo === "todos"
      ? estatisticas.equipes
      : estatisticas.equipes.filter(
          (equipe) => equipe.grupo?.id === Number(filtroGrupo)
        );

  const getTendencia = (posicao: number) => {
    if (posicao <= 4) return "up";
    if (posicao > equipesFiltradasPorGrupo.length - 4) return "down";
    return "stable";
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case "up":
        return <TrendingUp size={14} className={styles.trendingUp} />;
      case "down":
        return <TrendingDown size={14} className={styles.trendingDown} />;
      default:
        return <Minus size={14} className={styles.trendingStable} />;
    }
  };

  const grupos = Array.from(
    new Set(estatisticas.equipes.map((e) => e.grupo).filter(Boolean))
  );

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
  const handleExport = async () => {
    try {
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
            { align: "right" }
          );
        }
      };

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
      doc.text("Football Systems Platform", 8, 28);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("ESTATÍSTICAS DETALHADAS", pageWidth / 2, 18, {
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
      doc.text(
        "Relatório detalhado com métricas e performance das equipes",
        20,
        currentY + 12
      );
      doc.text(
        "Dados consolidados de todas as partidas e estatísticas",
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
        const [r, g, b] = card.cor;
        doc.setFillColor(r, g, b);
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

      // === TABELA DE RESUMO GERAL ===
      {
        // Checar se cabe o título + ao menos 1 linha da tabela
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
        doc.text("RESUMO GERAL DO CAMPEONATO", 15, currentY);

        const resumoHead = ["MÉTRICA", "VALOR"];
        const resumoBody = [
          ["Total de Equipes", estatisticas.totalEquipes.toString()],
          ["Total de Jogos", estatisticas.totalJogos.toString()],
          ["Jogos Finalizados", estatisticas.totalJogosFinalizados.toString()],
          ["Total de Gols", estatisticas.totalGols.toString()],
          ["Média de Gols/Jogo", estatisticas.mediaGolsPorJogo.toString()],
          ["Total de Jogadores", estatisticas.totalJogadores.toString()],
          ["Cartões Amarelos", estatisticas.cartoesAmarelos.toString()],
          ["Cartões Vermelhos", estatisticas.cartoesVermelhos.toString()],
          ["Assistências", estatisticas.assistencias.toString()],
        ];

        autoTable(doc, {
          startY: currentY + 8,
          head: [resumoHead],
          body: resumoBody,
          theme: "plain",
          margin: { left: 15, right: 15, bottom: 30 },
          headStyles: {
            fillColor: [25, 35, 55],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
          },
          styles: {
            fontSize: 9,
            cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
            lineColor: [230, 235, 245],
            lineWidth: 0.3,
            textColor: [55, 65, 85],
          },
          columnStyles: {
            0: { halign: "left", fontStyle: "bold", cellWidth: 80 },
            1: { halign: "center", fontStyle: "bold", cellWidth: 40 },
          },
          didDrawPage: (data) => {
            doc.setDrawColor(218, 165, 32);
            doc.setLineWidth(1);
            let lineY =
              data.pageNumber === 1
                ? data.settings.startY + 11
                : data.settings.margin.top + 11;
            doc.line(15, lineY, pageWidth - 75, lineY);
          },
          alternateRowStyles: { fillColor: [249, 250, 251] },
        });

        const autoTablePlugin = doc as any;
        currentY = autoTablePlugin.lastAutoTable.finalY + 15;
      }

      // === TABELA DE DESTAQUES ===
      {
        const alturaTitulo = 8;
        const alturaLinhaTabela = 12;
        const alturaNecessaria = alturaTitulo + alturaLinhaTabela + 8;
        if (currentY + alturaNecessaria + 30 > pageHeight) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(25, 35, 55);
        doc.text("DESTAQUES DO CAMPEONATO", 15, currentY);

        const destaquesData = [["CATEGORIA", "DESTAQUE", "VALOR"]];
        if (estatisticas.artilheiro) {
          destaquesData.push([
            "Artilheiro",
            `${estatisticas.artilheiro.nome} (${estatisticas.artilheiro.equipe})`,
            `${estatisticas.artilheiro.gols} gols`,
          ]);
        }
        if (estatisticas.equipeMaisGols) {
          destaquesData.push([
            "Melhor Ataque",
            estatisticas.equipeMaisGols.nome,
            `${estatisticas.equipeMaisGols.gols} gols`,
          ]);
        }
        if (estatisticas.jogoMaisGols) {
          destaquesData.push([
            "Jogo + Gols",
            `${estatisticas.jogoMaisGols.equipeA} vs ${estatisticas.jogoMaisGols.equipeB}`,
            `${estatisticas.jogoMaisGols.gols} gols`,
          ]);
        }
        destaquesData.push([
          "Próximos Jogos",
          `${estatisticas.proximosJogos} partidas`,
          "Agendadas",
        ]);

        autoTable(doc, {
          startY: currentY + 8,
          head: [destaquesData[0]],
          body: destaquesData.slice(1),
          theme: "plain",
          margin: { left: 15, right: 15, bottom: 30 },
          headStyles: {
            fillColor: [25, 35, 55],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
            cellPadding: { top: 6, bottom: 6, left: 3, right: 3 },
          },
          styles: {
            fontSize: 9,
            cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
            lineColor: [230, 235, 245],
            lineWidth: 0.3,
            halign: "left",
            valign: "middle",
            textColor: [55, 65, 85],
          },
          columnStyles: {
            0: { halign: "left", fontStyle: "bold", cellWidth: 35 },
            1: { halign: "left", cellWidth: 60 },
            2: {
              halign: "center",
              fontStyle: "bold",
              textColor: [16, 185, 129],
              cellWidth: 25,
            },
          },
          didDrawPage: (data) => {
            doc.setDrawColor(218, 165, 32);
            doc.setLineWidth(1);
            let lineY =
              data.pageNumber === 1
                ? data.settings.startY + 15
                : data.settings.margin.top + 15;
            doc.line(15, lineY, pageWidth - 75, lineY);
          },
          alternateRowStyles: { fillColor: [249, 250, 251] },
        });

        const autoTablePlugin = doc as any;
        currentY = autoTablePlugin.lastAutoTable.finalY + 15;
      }

      // === TABELA DE ESTATÍSTICAS DAS EQUIPES ===
      {
        const alturaTitulo = 8;
        const alturaLinhaTabela = 12;
        const alturaNecessaria = alturaTitulo + alturaLinhaTabela + 8;
        if (currentY + alturaNecessaria + 30 > pageHeight) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(25, 35, 55);
        doc.text("ESTATÍSTICAS DETALHADAS POR EQUIPE", 15, currentY);

        const colunas = [
          "EQUIPE",
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
        const linhas = estatisticas.equipes.map((equipe) => [
          equipe.nome,
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
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
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
            cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
          },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          columnStyles: {
            0: { halign: "left", fontStyle: "bold", cellWidth: 40 },
            1: {
              halign: "center",
              fontStyle: "bold",
              textColor: [16, 185, 129],
              cellWidth: 15,
            },
            2: { halign: "center", cellWidth: 12 },
            3: { halign: "center", textColor: [16, 185, 129], cellWidth: 12 },
            4: { halign: "center", textColor: [245, 158, 11], cellWidth: 12 },
            5: { halign: "center", textColor: [245, 101, 101], cellWidth: 12 },
            6: { halign: "center", cellWidth: 15 },
            7: { halign: "center", cellWidth: 15 },
            8: { halign: "center", fontStyle: "bold", cellWidth: 15 },
            9: { halign: "center", cellWidth: 15 },
          },
          didDrawPage: (data) => {
            doc.setDrawColor(218, 165, 32);
            doc.setLineWidth(1);
            let lineY =
              data.pageNumber === 1
                ? data.settings.startY + 11
                : data.settings.margin.top + 11;
            doc.line(15, lineY, pageWidth - 32, lineY);
          },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 8) {
              const valor = data.cell.text.toString();
              if (valor.startsWith("+")) {
                data.cell.styles.textColor = [16, 185, 129];
              } else if (valor.startsWith("-")) {
                data.cell.styles.textColor = [245, 101, 101];
              }
            }
          },
        });
      }

      // Rodapé
      addFooter();

      // Salva PDF
      const timestamp = agora.toISOString().slice(0, 10);
      const nomeArquivo = `estatisticas-detalhadas-${timestamp}.pdf`;
      doc.save(nomeArquivo);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar relatório. Verifique os dados e tente novamente.");
    }
  };

  return (
    <RouteGuard module="relatorios" action="visualizar">
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <BarChart3 size={32} />
              </div>
              <div className={styles.headerContent}>
                <h1 className={styles.title}>Estatísticas Detalhadas</h1>
                <p className={styles.subtitle}>
                  Análise completa de desempenho das equipes e jogadores
                </p>
              </div>
              <div className={styles.headerActions}>
                <CanView module="relatorios" action="exportar" fallback={null}>
                  <button
                    className={styles.actionButton}
                    onClick={handleExport}
                    disabled={false}
                  >
                    <Download size={16} />
                    Exportar
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
                </CanView>
              </div>
            </div>

            {/* Estatísticas Resumidas */}
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
                  <span className={styles.statLabel}>Jogos</span>
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
                  <span className={styles.statLabel}>Gols</span>
                  <span className={styles.statDetail}>
                    {estatisticas.mediaGolsPorJogo} por jogo
                  </span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Activity size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>
                    {estatisticas.totalEventos}
                  </span>
                  <span className={styles.statLabel}>Eventos</span>
                  <span className={styles.statDetail}>
                    {estatisticas.cartoesAmarelos +
                      estatisticas.cartoesVermelhos}{" "}
                    cartões
                  </span>
                </div>
              </div>
            </div>

            {/* Destaques */}
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
                      <h3>Melhor Ataque</h3>
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

            {/* Filtros */}
            <div className={styles.filtersSection}>
              <div className={styles.filterGroup}>
                <Filter size={16} />
                <span className={styles.filterLabel}>Filtrar por:</span>
                <select
                  value={filtroGrupo}
                  onChange={(e) => setFiltroGrupo(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="todos">Todos os Grupos</option>
                  {grupos.map((grupo) => (
                    <option key={grupo?.id} value={grupo?.id}>
                      Grupo {grupo?.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabela de Estatísticas */}
            <div className={styles.tableContainer}>
              <div className={styles.tableWrapper}>
                <table className={styles.estatisticasTable}>
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Tend</th>
                      <th>Equipe</th>
                      <th>Pts</th>
                      <th>J</th>
                      <th>V</th>
                      <th>E</th>
                      <th>D</th>
                      <th>GM</th>
                      <th>GS</th>
                      <th>SG</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={12} className={styles.loadingCell}>
                          <div className={styles.loadingContent}>
                            <RefreshCw size={20} className={styles.spinning} />
                            Carregando estatísticas...
                          </div>
                        </td>
                      </tr>
                    ) : equipesFiltradasPorGrupo.length === 0 ? (
                      <tr>
                        <td colSpan={12} className={styles.loadingCell}>
                          Nenhuma equipe encontrada.
                        </td>
                      </tr>
                    ) : (
                      equipesFiltradasPorGrupo.map((equipe, index) => (
                        <tr key={equipe.id} className={styles.tableRow}>
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
                              <div className={styles.equipeDetails}>
                                <span className={styles.nomeEquipe}>
                                  {equipe.nome}
                                </span>
                                {equipe.grupo && (
                                  <span className={styles.grupoTag}>
                                    Grupo {equipe.grupo.nome}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className={styles.pontosCell}>
                            <span className={styles.pontos}>
                              {equipe.pontos}
                            </span>
                          </td>
                          <td>{equipe.jogos}</td>
                          <td>{equipe.vitorias}</td>
                          <td>{equipe.empates}</td>
                          <td>{equipe.derrotas}</td>
                          <td>{equipe.golsMarcados}</td>
                          <td>{equipe.golsSofridos}</td>
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
                            <div className={styles.aproveitamentoBar}>
                              <div
                                className={styles.aproveitamentoFill}
                                style={{ width: `${equipe.aproveitamento}%` }}
                              ></div>
                              <span className={styles.aproveitamentoText}>
                                {equipe.aproveitamento}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </RouteGuard>
  );
}

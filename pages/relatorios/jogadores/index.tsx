import { useState } from "react";
import { getSession } from "next-auth/react";
import type { GetServerSideProps } from "next";
import Layout from "../../../components/Layout";
import { RouteGuard } from "../../../components/RouteGuard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  Download,
  Filter,
  RefreshCw,
  Target,
  Award,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import styles from "./styles.module.scss";

type Jogador = {
  id: number;
  nome: string;
  posicao: string;
  numero: number;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  jogos: number;
  mediaGols: number;
  equipe: {
    id: number;
    nome: string;
    escudoUrl?: string;
  };
};

type EstatisticasJogadores = {
  totalGols: number;
  totalAssistencias: number;
  totalJogadores: number;
  totalJogos: number;
  artilheiro: Jogador | null;
  assistente: Jogador | null;
  jogadores: Jogador[];
  equipes: Array<{ id: number; nome: string }>;
};

type JogadoresProps = {
  estatisticas: EstatisticasJogadores;
  session: any;
  clienteNome: string;
};

export const getServerSideProps: GetServerSideProps<JogadoresProps> = async (
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

  // Captura clientId da query, senão usa session
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

    // Consultas filtradas por clientId
    const [
      totalJogadores,
      totalJogos,
      equipesData,
      jogadoresData,
      eventosGols,
      eventosAssistencias,
      eventosCartoes,
    ] = await Promise.all([
      prisma.jogador.count({ where: { clientId, ativo: true } }),
      prisma.jogo.count({
        where: {
          clientId,
          AND: [{ placarA: { not: null } }, { placarB: { not: null } }],
        },
      }),

      prisma.equipe.findMany({
        where: { clientId },
        select: {
          id: true,
          nome: true,
          escudoUrl: true,
        },
      }),
      prisma.jogador.findMany({
        where: { clientId, ativo: true }, // filtro clientId e ativo
        select: {
          id: true,
          nome: true,
          posicao: true,
          numero: true,
          equipe: {
            select: {
              id: true,
              nome: true,
              escudoUrl: true,
            },
          },
        },
      }),
      prisma.eventoJogo.groupBy({
        where: { clientId, tipo: "gol" },
        by: ["jogadorId"],
        _count: { jogadorId: true },
      }),
      prisma.eventoJogo.groupBy({
        where: { clientId, tipo: "assistencia" },
        by: ["jogadorId"],
        _count: { jogadorId: true },
      }),
      prisma.eventoJogo.groupBy({
        where: {
          clientId,
          tipo: { in: ["cartao_amarelo", "cartao_vermelho"] },
        },
        by: ["jogadorId", "tipo"],
        _count: { jogadorId: true },
      }),
    ]);

    // Processar jogadores adicionando estatísticas
    const jogadoresComEstatisticas = jogadoresData.map((jogador) => {
      const golEvento = eventosGols.find((e) => e.jogadorId === jogador.id);
      const assistEvento = eventosAssistencias.find(
        (e) => e.jogadorId === jogador.id
      );

      const gols = golEvento ? golEvento._count.jogadorId : 0;
      const assistencias = assistEvento ? assistEvento._count.jogadorId : 0;

      const cartoesAmarelos = eventosCartoes
        .filter(
          (e) => e.jogadorId === jogador.id && e.tipo === "cartao_amarelo"
        )
        .reduce((acc, e) => acc + e._count.jogadorId, 0);

      const cartoesVermelhos = eventosCartoes
        .filter(
          (e) => e.jogadorId === jogador.id && e.tipo === "cartao_vermelho"
        )
        .reduce((acc, e) => acc + e._count.jogadorId, 0);

      // Aproximar jogos participados; pode ajustar a lógica conforme necessidade
      const jogos = Math.max(
        Math.ceil(gols * 1.5),
        Math.ceil(assistencias * 2),
        1
      );

      return {
        ...jogador,
        gols,
        assistencias,
        cartoesAmarelos,
        cartoesVermelhos,
        jogos,
        mediaGols: jogos ? +(gols / jogos).toFixed(2) : 0,
      };
    });

    // Computar totais
    const totalGols = jogadoresComEstatisticas.reduce(
      (acc, j) => acc + j.gols,
      0
    );
    const totalAssistencias = jogadoresComEstatisticas.reduce(
      (acc, j) => acc + j.assistencias,
      0
    );

    // Identificar artilheiro e assistente
    const artilheiro = jogadoresComEstatisticas.length
      ? jogadoresComEstatisticas.reduce((p, c) => (p.gols > c.gols ? p : c))
      : null;

    const assistente = jogadoresComEstatisticas.length
      ? jogadoresComEstatisticas.reduce((p, c) =>
          p.assistencias > c.assistencias ? p : c
        )
      : null;

    const estatisticas: EstatisticasJogadores = {
      totalGols,
      totalAssistencias,
      totalJogadores,
      totalJogos,
      artilheiro,
      assistente,
      jogadores: jogadoresComEstatisticas,
      equipes: equipesData,
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

    // Fallback vazio
    return {
      props: {
        estatisticas: {
          totalGols: 0,
          totalAssistencias: 0,
          totalJogadores: 0,
          totalJogos: 0,
          artilheiro: null,
          assistente: null,
          jogadores: [],
          equipes: [],
        },
        session,
        clienteNome,
      },
    };
  }
};

export default function Jogadores({
  estatisticas,
  session,
  clienteNome,
}: JogadoresProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("artilheiros");
  const [filtroEquipe, setFiltroEquipe] = useState("todas");

  // Client id para garantir consistência
  const clientId = (() => {
    const qClientId = router.query.clientId;
    if (typeof qClientId === "string" && qClientId.trim() !== "")
      return qClientId.trim();
    return session.user.clientId;
  })();

  // Ordenar e filtrar jogadores conforme filtros de categoria e equipe
  const jogadoresOrdenados = estatisticas.jogadores
    .filter(
      (j) => filtroEquipe === "todas" || j.equipe.id === Number(filtroEquipe)
    )
    .sort((a, b) => {
      switch (filtroCategoria) {
        case "artilheiros":
          return b.gols - a.gols;
        case "assistencias":
          return b.assistencias - a.assistencias;
        case "disciplina":
          return (
            a.cartoesAmarelos +
            a.cartoesVermelhos * 2 -
            (b.cartoesAmarelos + b.cartoesVermelhos * 2)
          );
        case "media":
          return b.mediaGols - a.mediaGols;
        default:
          return b.gols - a.gols;
      }
    });

  async function handleRefresh() {
    setLoading(true);
    try {
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

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

  async function handleExportPDF() {
    try {
      setExporting(true);

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
      doc.text("RANKING DE JOGADORES", pageWidth / 2, 18, { align: "center" });

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
      doc.text("CLASSIFICAÇÃO INDIVIDUAL DE DESEMPENHO", 20, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Ranking completo baseado em gols, assistências e estatísticas",
        20,
        currentY + 12
      );
      doc.text(
        `Total de ${jogadoresOrdenados.length} jogadores analisados`,
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
          label: "JOGADORES",
          valor: jogadoresOrdenados.length,
          cor: [37, 99, 235],
        },
        {
          label: "ARTILHEIRO",
          valor: jogadoresOrdenados[0]?.gols || 0,
          cor: [16, 185, 129],
        },
        {
          label: "ASSISTÊNCIAS",
          valor: jogadoresOrdenados.reduce((acc, j) => acc + j.assistencias, 0),
          cor: [245, 101, 101],
        },
        {
          label: "CARTÕES",
          valor: jogadoresOrdenados.reduce(
            (acc, j) => acc + j.cartoesAmarelos + j.cartoesVermelhos,
            0
          ),
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

      // === TÍTULO DA TABELA ===
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
      doc.text("RANKING OFICIAL DOS JOGADORES", 15, currentY);

      // === TABELA PRINCIPAL ===
      const colunas = [
        "POS",
        "JOGADOR",
        "EQUIPE",
        "POSIÇÃO",
        "Nº",
        "GOLS",
        "ASS.",
        "JG",
        "MÉDIA",
        "CA",
        "CV",
      ];

      const linhas = jogadoresOrdenados.map((jogador, index) => [
        (index + 1).toString(),
        jogador.nome,
        jogador.equipe.nome,
        jogador.posicao,
        jogador.numero.toString(),
        jogador.gols.toString(),
        jogador.assistencias.toString(),
        jogador.jogos.toString(),
        jogador.mediaGols.toFixed(2),
        jogador.cartoesAmarelos.toString(),
        jogador.cartoesVermelhos.toString(),
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
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { halign: "center", fontStyle: "bold", cellWidth: 12 },
          1: { halign: "left", fontStyle: "bold", cellWidth: 35 },
          2: { halign: "left", cellWidth: 30 },
          3: { halign: "center", cellWidth: 18 },
          4: { halign: "center", cellWidth: 10 },
          5: {
            halign: "center",
            fontStyle: "bold",
            textColor: [16, 185, 129],
            cellWidth: 12,
          },
          6: { halign: "center", textColor: [245, 158, 11], cellWidth: 12 },
          7: { halign: "center", cellWidth: 12 },
          8: { halign: "center", fontStyle: "bold", cellWidth: 15 },
          9: { halign: "center", textColor: [245, 158, 11], cellWidth: 10 },
          10: { halign: "center", textColor: [245, 101, 101], cellWidth: 10 },
        },
        didDrawPage: (data) => {
          doc.setDrawColor(218, 165, 32);
          doc.setLineWidth(1);

          let lineY =
            data.pageNumber === 1
              ? data.settings.startY + 11
              : data.settings.margin.top + 11;
          doc.line(15, lineY, pageWidth - 19, lineY);
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            const rowIndex = data.row.index;

            // Destaques coloridos no top 3
            if (rowIndex === 0) {
              data.cell.styles.fillColor = [255, 248, 220]; // Ouro
              data.cell.styles.fontStyle = "bold";
            } else if (rowIndex === 1) {
              data.cell.styles.fillColor = [248, 250, 252]; // Prata
            } else if (rowIndex === 2) {
              data.cell.styles.fillColor = [254, 242, 242]; // Bronze
            }
          }
        },
      });

      // Verificar espaço para legenda e criar nova página se necessário
      let currentYAfterTable = (doc as any).lastAutoTable.finalY + 15;
      if (currentYAfterTable + 30 > pageHeight - 30) {
        doc.addPage();
        currentYAfterTable = 20;
      }

      // === LEGENDA ===
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(25, 35, 55);
      doc.text("LEGENDA", 15, currentYAfterTable);

      const legendItems = [
        {
          cor: [255, 248, 220],
          label: "1º Lugar",
          desc: "Artilheiro do campeonato",
        },
        { cor: [248, 250, 252], label: "2º Lugar", desc: "Vice-artilheiro" },
        { cor: [254, 242, 242], label: "3º Lugar", desc: "Terceiro colocado" },
      ];

      legendItems.forEach((item, index) => {
        const y = currentYAfterTable + 5 + index * 8;

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
      const nomeArquivo = `ranking-jogadores-${timestamp}.pdf`;

      doc.save(nomeArquivo);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar relatório. Verifique os dados e tente novamente.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <RouteGuard module="relatorios" action="visualizar">
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <Users size={24} />
              </div>
              <div className={styles.headerContent}>
                <h1 className={styles.title}>Ranking de Jogadores</h1>
                <p className={styles.subtitle}>
                  Estatísticas individuais e rankings
                </p>
              </div>
              <div className={styles.headerActions}>
                <button
                  disabled={exporting}
                  onClick={handleExportPDF}
                  className={styles.actionButton}
                >
                  <Download size={16} />
                  {exporting ? "Gerando..." : "Exportar PDF"}
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

            {/* Estatísticas gerais */}
            <div className={styles.statsOverview}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Target size={20} />
                </div>
                <div className={styles.statValue}>
                  <span>{estatisticas.totalGols}</span>
                  <span className={styles.statLabel}>Gols</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <TrendingUp size={20} />
                </div>
                <div className={styles.statValue}>
                  <span>{estatisticas.totalAssistencias}</span>
                  <span className={styles.statLabel}>Assistências</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Award size={20} />
                </div>
                <div className={styles.statValue}>
                  <span>{estatisticas.artilheiro?.nome || "N/A"}</span>
                  <span className={styles.statLabel}>Artilheiro</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <AlertCircle size={20} />
                </div>
                <div className={styles.statValue}>
                  <span>{estatisticas.assistente?.nome || "N/A"}</span>
                  <span className={styles.statLabel}>Assistente</span>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className={styles.filtersSection}>
              <div className={styles.filterGroup}>
                <Filter size={16} />
                <select
                  className={styles.select}
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                >
                  <option value="artilheiros">Artilheiros</option>
                  <option value="assistencias">Assistências</option>
                  <option value="disciplina">Disciplina</option>
                  <option value="media">Média Gols</option>
                </select>
                <select
                  className={styles.select}
                  value={filtroEquipe}
                  onChange={(e) => setFiltroEquipe(e.target.value)}
                >
                  <option value="todas">Todas as equipes</option>
                  {estatisticas.equipes.map((equipe) => (
                    <option value={String(equipe.id)} key={equipe.id}>
                      {equipe.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabela de jogadores ordenados e filtrados */}
            <table className={styles.jogadoresTable}>
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Jogador</th>
                  <th>Equipe</th>
                  <th>Posição</th>
                  <th>Nº</th>
                  <th>Gols</th>
                  <th>Assist.</th>
                  <th>Jogos</th>
                  <th>Média Gols</th>
                  <th>Cartões A</th>
                  <th>Cartões V</th>
                </tr>
              </thead>
              <tbody>
                {jogadoresOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={11}>Nenhum jogador encontrado.</td>
                  </tr>
                ) : (
                  jogadoresOrdenados.map((jogador, i) => (
                    <tr key={jogador.id} className={styles.jogadorRow}>
                      <td>{i + 1}</td>
                      <td>{jogador.nome}</td>
                      <td>{jogador.equipe.nome}</td>
                      <td>{jogador.posicao}</td>
                      <td>{jogador.numero}</td>
                      <td>{jogador.gols}</td>
                      <td>{jogador.assistencias}</td>
                      <td>{jogador.jogos}</td>
                      <td>{jogador.mediaGols.toFixed(2)}</td>
                      <td>{jogador.cartoesAmarelos}</td>
                      <td>{jogador.cartoesVermelhos}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Layout>
    </RouteGuard>
  );
}

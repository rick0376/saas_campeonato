import { useState } from "react";
import { getSession } from "next-auth/react";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { RouteGuard } from "../../../components/RouteGuard";
import { usePermissions } from "../../../hooks/usePermissions";
import { CanView } from "../../../components/ProtectedComponent";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Trophy,
  Users,
  Calendar,
  UserCheck,
  Target,
  RefreshCw,
  Download,
} from "lucide-react";
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
  escudoUrl?: string | null;
  grupo?: { id: number; nome: string } | null;
  _count: {
    jogosCasa: number;
    jogosFora: number;
    jogadores: number;
  };
};

type EstatisticasGerais = {
  totalEquipes: number;
  totalJogos: number;
  totalJogadores: number;
  totalGols: number;
};

type EquipesProps = {
  equipes: Equipe[];
  estatisticas: EstatisticasGerais;
  session: any;
  clienteNome: string;
};

export const getServerSideProps: GetServerSideProps<EquipesProps> = async (
  ctx
) => {
  const session = await getSession(ctx);
  if (!session) {
    return {
      redirect: { destination: "/auth/login", permanent: false },
    };
  }

  const user = session.user as any;

  const queryClientId =
    typeof ctx.query.clientId === "string" && ctx.query.clientId.trim() !== ""
      ? ctx.query.clientId.trim()
      : null;

  const clientId = queryClientId || user.clientId;

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    // Buscar o nome do cliente (substitua 'cliente' e 'nome' conforme seu schema Prisma)
    const cliente = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });

    const clienteNome = cliente?.name ?? clientId;

    // Buscar equipes do clientId
    const equipes = await prisma.equipe.findMany({
      where: { clientId },
      orderBy: [{ grupo: { nome: "asc" } }, { nome: "asc" }],
      include: {
        grupo: { select: { id: true, nome: true } },
        _count: {
          select: { jogosCasa: true, jogosFora: true, jogadores: true },
        },
      },
    });

    const totalEquipes = equipes.length;
    const totalJogos =
      equipes.reduce(
        (acc, eq) => acc + eq._count.jogosCasa + eq._count.jogosFora,
        0
      ) / 2;
    const totalJogadores = equipes.reduce(
      (acc, eq) => acc + eq._count.jogadores,
      0
    );
    const totalGols = equipes.reduce((acc, eq) => acc + eq.golsMarcados, 0);

    await prisma.$disconnect();

    return {
      props: {
        equipes,
        estatisticas: { totalEquipes, totalJogos, totalJogadores, totalGols },
        session,
        clienteNome,
      },
    };
  } catch (error) {
    console.error("Erro ao carregar equipes:", error);
    return {
      props: {
        equipes: [],
        estatisticas: {
          totalEquipes: 0,
          totalJogos: 0,
          totalJogadores: 0,
          totalGols: 0,
        },
        session,
        clienteNome: clientId,
      },
    };
  }
};

export default function RelatorioEquipes({
  equipes,
  estatisticas,
  session,
  clienteNome,
}: EquipesProps) {
  const router = useRouter();
  const { canView } = usePermissions();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await router.replace(router.asPath);
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para carregar imagem base64 do public, coloque fora do componente
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

  const exportPDF = async () => {
    setExporting(true);

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
      // Fundo principal
      doc.setFillColor(25, 35, 55);
      doc.rect(0, 0, pageWidth, 40, "F");

      // Faixa dourada
      doc.setFillColor(218, 165, 32);
      doc.rect(0, 35, pageWidth, 5, "F");

      // Logo
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 16, 7, 16, 16);
      }

      // Sistema e versão
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(180, 190, 210);
      doc.text("LHP CUP MANAGER", 8, 25);
      doc.setFontSize(7);
      doc.text("Football Systems Platform", 8, 28);

      // Título principal
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("RELATÓRIO DE EQUIPES", pageWidth / 2, 18, { align: "center" });

      // Cliente
      doc.setFontSize(12);
      doc.setTextColor(218, 165, 32);
      doc.text(clienteNome.toUpperCase(), pageWidth / 2, 28, {
        align: "center",
      });

      // Data
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
      doc.text("RESUMO GERAL DO CAMPEONATO", 20, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Total de grupos: ${
          new Map(equipes.map((e) => [e.grupo?.nome || "Sem Grupo", true])).size
        }`,
        20,
        currentY + 12
      );
      doc.text(`Análise detalhada por equipe e grupo`, 20, currentY + 16);

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
        {
          label: "JOGADORES",
          valor: estatisticas.totalJogadores,
          cor: [245, 101, 101],
        },
        { label: "GOLS", valor: estatisticas.totalGols, cor: [139, 92, 246] },
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

        // Sombra
        doc.setFillColor(0, 0, 0, 0.1);
        doc.rect(x + 1, y + 1, cardWidth, cardHeight, "F");

        // Card principal
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.5);
        doc.rect(x, y, cardWidth, cardHeight, "FD");

        // Barra colorida no topo
        doc.setFillColor(card.cor[0], card.cor[1], card.cor[2]);
        doc.rect(x, y, cardWidth, 3, "F");

        // Valor
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(25, 35, 55);
        doc.text(card.valor.toString(), x + cardWidth / 2, y + 12, {
          align: "center",
        });

        // Label
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(card.label, x + cardWidth / 2, y + 18, { align: "center" });
      });

      currentY += 40;

      // === AGRUPA EQUIPES POR GRUPO ===
      const gruposMap = new Map<string, any[]>();
      equipes.forEach((equipe) => {
        const grupoNome = equipe.grupo?.nome || "Sem Grupo";
        if (!gruposMap.has(grupoNome)) gruposMap.set(grupoNome, []);
        gruposMap.get(grupoNome)!.push(equipe);
      });

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
        "JOGADORES",
      ];

      // === TABELAS POR GRUPO ===
      gruposMap.forEach((equipesDoGrupo, grupoNome) => {
        // Verifica se precisa de nova página
        if (currentY + 50 > pageHeight - 30) {
          doc.addPage();
          currentY = 20;

          // Repete header em páginas adicionais (simplificado)
          doc.setFillColor(25, 35, 55);
          doc.rect(0, 0, pageWidth, 15, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(255, 255, 255);
          doc.text("RELATÓRIO DE EQUIPES", pageWidth / 2, 10, {
            align: "center",
          });
          currentY = 25;
        }

        // Título do grupo
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(25, 35, 55);
        doc.text(
          `DETALHES DAS EQUIPES - Grupo:  ${grupoNome.toUpperCase()}`,
          15,
          currentY
        );

        const linhas = equipesDoGrupo.map((equipe) => [
          equipe.nome,
          equipe.pontos.toString(),
          (equipe._count.jogosCasa + equipe._count.jogosFora).toString(),
          equipe.vitorias.toString(),
          equipe.empates.toString(),
          equipe.derrotas.toString(),
          equipe.golsMarcados.toString(),
          equipe.golsSofridos.toString(),
          equipe.golsMarcados - equipe.golsSofridos >= 0
            ? `+${equipe.golsMarcados - equipe.golsSofridos}`
            : (equipe.golsMarcados - equipe.golsSofridos).toString(),
          equipe._count.jogadores.toString(),
        ]);

        autoTable(doc, {
          startY: currentY + 8,
          head: [colunas],
          body: linhas,
          theme: "plain",
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
            0: { halign: "left", fontStyle: "bold", cellWidth: 45 }, // EQUIPE
            1: {
              halign: "center",
              fontStyle: "bold",
              textColor: [16, 185, 129],
              cellWidth: 15,
            }, // PTS
            2: { halign: "center", cellWidth: 12 }, // J
            3: { halign: "center", textColor: [16, 185, 129], cellWidth: 12 }, // V
            4: { halign: "center", textColor: [245, 158, 11], cellWidth: 12 }, // E
            5: { halign: "center", textColor: [245, 101, 101], cellWidth: 12 }, // D
            6: { halign: "center", cellWidth: 15 }, // GP
            7: { halign: "center", cellWidth: 15 }, // GC
            8: { halign: "center", fontStyle: "bold", cellWidth: 15 }, // SG
            9: { halign: "center", cellWidth: 28 }, // JOGADORES
          },
          didDrawPage: (data: any) => {
            doc.setDrawColor(218, 165, 32);
            doc.setLineWidth(1);

            let lineY;
            if (data.pageNumber === 1) {
              lineY = data.settings.startY + 11;
            } else {
              lineY = data.settings.margin.top + 11;
            }

            doc.line(14, lineY, pageWidth - 15, lineY);
          },

          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 8) {
              // Colorir saldo de gols
              const valor = data.cell.text[0];
              if (valor.startsWith("+")) {
                data.cell.styles.textColor = [16, 185, 129];
              } else if (valor.startsWith("-")) {
                data.cell.styles.textColor = [245, 101, 101];
              }
            }
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 20;
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
      setExporting(false);
    }
  };

  if (!canView("equipes")) {
    return (
      <Layout>
        <div className={styles.accessDenied}>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar este relatório.</p>
          <Link href="/">Voltar ao início</Link>
        </div>
      </Layout>
    );
  }

  const equipesSemGrupo = equipes.filter((e) => e.grupo === null);
  const equipesComGrupo = equipes.filter((e) => e.grupo !== null);

  const gruposMap: Record<string, Equipe[]> = {};
  equipesComGrupo.forEach((equipe) => {
    if (equipe.grupo) {
      if (!gruposMap[equipe.grupo.nome]) gruposMap[equipe.grupo.nome] = [];
      gruposMap[equipe.grupo.nome].push(equipe);
    }
  });

  const nomesGrupos = Object.keys(gruposMap).sort();

  return (
    <RouteGuard module="relatorios" action="visualizar">
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <Trophy />
              </div>
              <div className={styles.headerContent}>
                <h1>Relatório: {clienteNome}</h1>
                <p>Estatísticas e detalhes das equipes participantes</p>
              </div>
              <div className={styles.headerActions}>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className={styles.refreshButton}
                  title="Atualizar"
                >
                  <RefreshCw className={loading ? styles.spinning : ""} />
                  Atualizar
                </button>
                <button
                  onClick={exportPDF}
                  className={styles.exportButton}
                  title="Exportar PDF"
                  disabled={exporting}
                >
                  <Download />
                  Exportar PDF
                </button>
              </div>
            </div>

            {/* Estatísticas principais */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <Users className={styles.statIcon} />
                <div>
                  <strong>{estatisticas.totalEquipes}</strong>
                  <p>Total de Equipes</p>
                </div>
              </div>
              <div className={styles.statCard}>
                <Calendar className={styles.statIcon} />
                <div>
                  <strong>{estatisticas.totalJogos}</strong>
                  <p>Total de Jogos</p>
                </div>
              </div>
              <div className={styles.statCard}>
                <UserCheck className={styles.statIcon} />
                <div>
                  <strong>{estatisticas.totalJogadores}</strong>
                  <p>Total de Jogadores</p>
                </div>
              </div>
              <div className={styles.statCard}>
                <Target className={styles.statIcon} />
                <div>
                  <strong>{estatisticas.totalGols}</strong>
                  <p>Total de Gols</p>
                </div>
              </div>
            </div>

            {/* Equipes agrupadas */}
            <div className={styles.equipesList}>
              {nomesGrupos.length ? (
                nomesGrupos.map((grupoNome) => (
                  <section key={grupoNome} className={styles.groupSection}>
                    <h2 className={styles.groupTitle}>Grupo {grupoNome}</h2>
                    <div className={styles.groupTeams}>
                      {gruposMap[grupoNome].map((equipe) => (
                        <div key={equipe.id} className={styles.teamCard}>
                          <div className={styles.teamHeader}>
                            <img
                              src={equipe.escudoUrl ?? "/imagens/escudo.png"}
                              alt={`Escudo ${equipe.nome}`}
                              className={styles.teamLogo}
                              onError={(e) =>
                                (e.currentTarget.src = "/imagens/escudo.png")
                              }
                            />
                            <div className={styles.teamInfo}>
                              <h3>{equipe.nome}</h3>
                              <p>Grupo {grupoNome}</p>
                            </div>
                          </div>
                          <div className={styles.teamStats}>
                            <div>
                              <strong>Pontos:</strong> {equipe.pontos}
                            </div>
                            <div>
                              <strong>Vitórias:</strong> {equipe.vitorias}
                            </div>
                            <div>
                              <strong>Empates:</strong> {equipe.empates}
                            </div>
                            <div>
                              <strong>Derrotas:</strong> {equipe.derrotas}
                            </div>
                            <div>
                              <strong>Gols Marcados:</strong>{" "}
                              {equipe.golsMarcados}
                            </div>
                            <div>
                              <strong>Gols Sofridos:</strong>{" "}
                              {equipe.golsSofridos}
                            </div>
                            <div>
                              <strong>Jogos:</strong>{" "}
                              {equipe._count.jogosCasa +
                                equipe._count.jogosFora}
                            </div>
                            <div>
                              <strong>Jogadores:</strong>{" "}
                              {equipe._count.jogadores}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              ) : equipesSemGrupo.length ? (
                <section>
                  <h2 className={styles.groupTitle}>Sem Grupo</h2>
                  <div className={styles.groupTeams}>
                    {equipesSemGrupo.map((equipe) => (
                      <div key={equipe.id} className={styles.teamCard}>
                        <div className={styles.teamHeader}>
                          <img
                            src={equipe.escudoUrl ?? "/imagens/escudo.png"}
                            alt={`Escudo ${equipe.nome}`}
                            className={styles.teamLogo}
                            onError={(e) =>
                              (e.currentTarget.src = "/imagens/escudo.png")
                            }
                          />
                          <div className={styles.teamInfo}>
                            <h3>{equipe.nome}</h3>
                            <p>Sem Grupo</p>
                          </div>
                        </div>
                        <div className={styles.teamStats}>
                          <div>
                            <strong>Pontos:</strong> {equipe.pontos}
                          </div>
                          <div>
                            <strong>Vitórias:</strong> {equipe.vitorias}
                          </div>
                          <div>
                            <strong>Empates:</strong> {equipe.empates}
                          </div>
                          <div>
                            <strong>Derrotas:</strong> {equipe.derrotas}
                          </div>
                          <div>
                            <strong>Gols Marcados:</strong>{" "}
                            {equipe.golsMarcados}
                          </div>
                          <div>
                            <strong>Gols Sofridos:</strong>{" "}
                            {equipe.golsSofridos}
                          </div>
                          <div>
                            <strong>Jogos:</strong>{" "}
                            {equipe._count.jogosCasa + equipe._count.jogosFora}
                          </div>
                          <div>
                            <strong>Jogadores:</strong>{" "}
                            {equipe._count.jogadores}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <p>Nenhuma equipe cadastrada.</p>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </RouteGuard>
  );
}

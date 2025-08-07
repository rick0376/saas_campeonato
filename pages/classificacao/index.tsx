import type { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import Layout from "../../components/Layout";
import { prisma } from "../../lib/prisma";
import { usePermissions } from "../../hooks/usePermissions";
import Link from "next/link";
import styles from "./styles.module.scss";
import {
  Trophy,
  TrendingUp,
  Target,
  Award,
  Medal,
  Crown,
  Zap,
  Lock,
} from "lucide-react";

type Equipe = {
  id: number;
  nome: string;
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
  jogosDisputados: number;
  escudoUrl?: string | null;
};

type GrupoWithEquipes = {
  id: number;
  nome: string;
  equipes: Equipe[];
};

type ClassificacaoProps = {
  grupos: GrupoWithEquipes[];
  session: any;
};

export const getServerSideProps: GetServerSideProps<
  ClassificacaoProps
> = async (ctx) => {
  const session = await getSession(ctx);
  if (!session) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  // Obtém clientId da query string, priorizando esta
  const queryClientId =
    typeof ctx.query.clientId === "string" && ctx.query.clientId.trim() !== ""
      ? ctx.query.clientId.trim()
      : null;

  const clientId =
    queryClientId && queryClientId !== "null" && queryClientId !== "undefined"
      ? queryClientId
      : session.user.clientId;

  try {
    // Buscar grupos e equipes filtrando por clientId dinâmico
    const gruposRaw = await prisma.grupo.findMany({
      where: { clientId },
      orderBy: { nome: "asc" },
      include: {
        equipes: {
          where: { clientId },
          orderBy: [
            { pontos: "desc" },
            { golsMarcados: "desc" },
            { nome: "asc" },
          ],
        },
      },
    });

    const jogosValidos = await prisma.jogo.findMany({
      where: {
        clientId,
        AND: [{ placarA: { not: null } }, { placarB: { not: null } }],
      },
      select: { equipeAId: true, equipeBId: true },
    });

    const jogosCountMap: Record<number, number> = {};
    jogosValidos.forEach(({ equipeAId, equipeBId }) => {
      jogosCountMap[equipeAId] = (jogosCountMap[equipeAId] || 0) + 1;
      jogosCountMap[equipeBId] = (jogosCountMap[equipeBId] || 0) + 1;
    });

    const grupos = gruposRaw.map((grupo) => {
      const equipes = grupo.equipes
        .map((e) => ({
          ...e,
          jogosDisputados: jogosCountMap[e.id] || 0,
        }))
        .sort((a, b) => {
          if (b.pontos !== a.pontos) return b.pontos - a.pontos;
          const saldoA = a.golsMarcados - a.golsSofridos;
          const saldoB = b.golsMarcados - b.golsSofridos;
          if (saldoB !== saldoA) return saldoB - saldoA;
          if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
          if (b.golsMarcados !== a.golsMarcados)
            return b.golsMarcados - a.golsMarcados;
          return a.nome.localeCompare(b.nome);
        });

      return { id: grupo.id, nome: grupo.nome, equipes };
    });

    return {
      props: {
        grupos,
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
    console.error("Erro ao buscar dados de classificação:", error);
    return {
      props: {
        grupos: [],
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

export default function Classificacao({ grupos, session }: ClassificacaoProps) {
  const { canView } = usePermissions();

  // Proteção por permissão
  if (!canView("classificacao")) {
    return (
      <Layout>
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedIcon}>
            <Lock size={48} />
          </div>
          <h2 className={styles.accessDeniedTitle}>Acesso Negado</h2>
          <p className={styles.accessDeniedDescription}>
            Você não tem permissão para visualizar a classificação.
          </p>
          <Link href="/" className={styles.backToHomeButton}>
            Voltar ao Início
          </Link>
        </div>
      </Layout>
    );
  }

  // Cálculos estatísticas gerais
  const totalEquipes = grupos.reduce(
    (acc, grupo) => acc + grupo.equipes.length,
    0
  );
  const totalJogos =
    grupos.reduce(
      (acc, grupo) =>
        acc +
        grupo.equipes.reduce((sum, equipe) => sum + equipe.jogosDisputados, 0),
      0
    ) / 2;
  const totalGols = grupos.reduce(
    (acc, grupo) =>
      acc + grupo.equipes.reduce((sum, equipe) => sum + equipe.golsMarcados, 0),
    0
  );

  // Encontra o líder geral (maior pontuação entre todos os grupos)
  const liderGeral = grupos.reduce((lider, grupo) => {
    const liderGrupo = grupo.equipes[0];
    if (!lider || (liderGrupo && liderGrupo.pontos > lider.pontos)) {
      return liderGrupo;
    }
    return lider;
  }, null as Equipe | null);

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Trophy size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Classificação Geral</h1>
              <p className={styles.subtitle}>
                Acompanhe a classificação de todas as equipes do campeonato
              </p>
            </div>
          </div>

          {/* Estatísticas gerais */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Trophy size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalEquipes}</span>
                <span className={styles.statLabel}>Equipes</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Target size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalJogos}</span>
                <span className={styles.statLabel}>Jogos</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Zap size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalGols}</span>
                <span className={styles.statLabel}>Gols</span>
              </div>
            </div>
            {liderGeral && (
              <div className={`${styles.statCard} ${styles.leaderCard}`}>
                <div className={styles.statIcon}>
                  <Crown size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{liderGeral.pontos}</span>
                  <span className={styles.statLabel}>
                    Líder: {liderGeral.nome}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Grupos */}
          <div className={styles.groupsContainer}>
            {grupos.map((grupo) => (
              <section key={grupo.id} className={styles.groupSection}>
                <div className={styles.groupHeader}>
                  <h2 className={styles.groupTitle}>
                    <Award size={24} />
                    Grupo {grupo.nome}
                  </h2>
                  <div className={styles.groupStats}>
                    <span className={styles.groupStat}>
                      {grupo.equipes.length} equipes
                    </span>
                  </div>
                </div>

                <div className={styles.tableContainer}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.positionHeader}>Pos</th>
                          <th className={styles.teamHeader}>Equipe</th>
                          <th className={styles.pointsHeader}>Pts</th>
                          <th>J</th>
                          <th>V</th>
                          <th>E</th>
                          <th>D</th>
                          <th>GM</th>
                          <th>GS</th>
                          <th>SG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.equipes.map((equipe, idx) => {
                          const saldoGols =
                            equipe.golsMarcados - equipe.golsSofridos;
                          const isLeader = idx === 0;
                          const isQualified = idx < 2; // Primeiros 2 se classificam

                          return (
                            <tr
                              key={equipe.id}
                              className={`
                              ${styles.tableRow}
                              ${isLeader ? styles.leaderRow : ""}
                              ${isQualified ? styles.qualifiedRow : ""}
                            `}
                            >
                              <td className={styles.positionCell}>
                                <div className={styles.positionBadge}>
                                  {isLeader && <Crown size={14} />}
                                  {idx + 1}
                                </div>
                              </td>
                              <td className={styles.teamCell}>
                                <div className={styles.teamInfo}>
                                  <div className={styles.teamLogo}>
                                    <img
                                      src={
                                        equipe.escudoUrl ||
                                        "/imagens/escudo.png"
                                      }
                                      alt={`Escudo ${equipe.nome}`}
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "/imagens/escudo.png";
                                      }}
                                    />
                                  </div>
                                  <div className={styles.teamDetails}>
                                    <span className={styles.teamName}>
                                      {equipe.nome}
                                    </span>
                                    {isLeader && (
                                      <span className={styles.leaderBadge}>
                                        <Medal size={12} />
                                        Líder
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className={styles.pointsCell}>
                                <span className={styles.points}>
                                  {equipe.pontos}
                                </span>
                              </td>
                              <td className={styles.numberCell}>
                                {equipe.jogosDisputados}
                              </td>
                              <td className={styles.numberCell}>
                                <span className={styles.victories}>
                                  {equipe.vitorias}
                                </span>
                              </td>
                              <td className={styles.numberCell}>
                                <span className={styles.draws}>
                                  {equipe.empates}
                                </span>
                              </td>
                              <td className={styles.numberCell}>
                                <span className={styles.defeats}>
                                  {equipe.derrotas}
                                </span>
                              </td>
                              <td className={styles.numberCell}>
                                <span className={styles.goalsFor}>
                                  {equipe.golsMarcados}
                                </span>
                              </td>
                              <td className={styles.numberCell}>
                                <span className={styles.goalsAgainst}>
                                  {equipe.golsSofridos}
                                </span>
                              </td>
                              <td className={styles.numberCell}>
                                <span
                                  className={`${styles.goalDiff} ${
                                    saldoGols >= 0
                                      ? styles.positive
                                      : styles.negative
                                  }`}
                                >
                                  {saldoGols > 0 ? "+" : ""}
                                  {saldoGols}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Estado vazio quando não há grupos */}
          {grupos.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Trophy size={48} />
              </div>
              <h3 className={styles.emptyTitle}>
                Nenhuma classificação disponível
              </h3>
              <p className={styles.emptyDescription}>
                Ainda não há grupos ou equipes cadastradas no sistema para
                exibir a classificação.
              </p>
              <div className={styles.emptyActions}>
                <Link href="/grupos" className={styles.emptyAction}>
                  Ver Grupos
                </Link>
                <Link href="/equipes" className={styles.emptyActionSecondary}>
                  Ver Equipes
                </Link>
              </div>
            </div>
          )}

          {/* Legenda */}
          <div className={styles.legend}>
            <h3 className={styles.legendTitle}>Legenda</h3>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <div
                  className={`${styles.legendColor} ${styles.leaderColor}`}
                ></div>
                <span>Líder do grupo</span>
              </div>
              <div className={styles.legendItem}>
                <div
                  className={`${styles.legendColor} ${styles.qualifiedColor}`}
                ></div>
                <span>Zona de classificação</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendAbbr}>
                  Pts: Pontos | J: Jogos | V: Vitórias | E: Empates | D:
                  Derrotas
                </span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendAbbr}>
                  GM: Gols Marcados | GS: Gols Sofridos | SG: Saldo de Gols
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

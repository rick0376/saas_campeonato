import type { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useState } from "react";
import Layout from "../../../components/Layout";
import { prisma } from "../../../lib/prisma";
import styles from "./styles.module.scss";
import { Calendar, Clock, Trophy, Eye, Target, Users } from "lucide-react";

type EquipeComEscudo = {
  id: number;
  nome: string;
  escudoUrl?: string | null;
};

type Evento = {
  id: number;
  tipo: string;
  minuto: number;
  jogador: {
    id: number;
    nome: string;
    numero: number;
    equipe: {
      id: number;
      nome: string;
    };
  } | null;
  detalhes?: string;
};

type Jogo = {
  id: number;
  rodada: number;
  data: string;
  placarA: number | null;
  placarB: number | null;
  equipeA: EquipeComEscudo;
  equipeB: EquipeComEscudo;
  grupo: { nome: string };
  eventos?: Evento[];
};

type VisualizarJogosProps = {
  jogos: Jogo[];
  session: any;
};

export const getServerSideProps: GetServerSideProps<
  VisualizarJogosProps
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

  try {
    const jogos = await prisma.jogo.findMany({
      include: {
        grupo: {
          select: { nome: true },
        },
        equipeA: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
        equipeB: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
        eventos: {
          include: {
            jogador: {
              include: {
                equipe: {
                  select: { id: true, nome: true },
                },
              },
            },
          },
          orderBy: { minuto: "asc" },
        },
      },
      orderBy: [{ grupo: { nome: "asc" } }, { rodada: "asc" }, { data: "asc" }],
    });

    const serialized = jogos.map((j) => ({
      id: j.id,
      rodada: j.rodada,
      data: j.data.toISOString(),
      placarA: j.placarA,
      placarB: j.placarB,
      equipeA: {
        id: j.equipeA.id,
        nome: j.equipeA.nome,
        escudoUrl: j.equipeA.escudoUrl,
      },
      equipeB: {
        id: j.equipeB.id,
        nome: j.equipeB.nome,
        escudoUrl: j.equipeB.escudoUrl,
      },
      grupo: { nome: j.grupo.nome },
      eventos: j.eventos.map((evento) => ({
        id: evento.id,
        tipo: evento.tipo,
        minuto: evento.minuto,
        jogador: evento.jogador
          ? {
              id: evento.jogador.id,
              nome: evento.jogador.nome,
              numero: evento.jogador.numero,
              equipe: {
                id: evento.jogador.equipe.id,
                nome: evento.jogador.equipe.nome,
              },
            }
          : null,
        detalhes: evento.detalhes,
      })),
    }));

    return {
      props: {
        jogos: serialized,
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
    console.error("Erro ao buscar jogos:", error);
    return {
      props: {
        jogos: [],
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

export default function VisualizarJogos({
  jogos,
  session,
}: VisualizarJogosProps) {
  // Organiza jogos por grupo
  const gruposMap: Record<string, Jogo[]> = {};
  jogos.forEach((j) => {
    const g = j.grupo.nome;
    if (!gruposMap[g]) gruposMap[g] = [];
    gruposMap[g].push(j);
  });

  // Ordena nomes dos grupos
  const nomesGrupos = Object.keys(gruposMap).sort((a, b) => {
    if (a.length === 1 && b.length === 1) {
      return a.localeCompare(b);
    }
    return a.localeCompare(b, undefined, { numeric: true });
  });

  // Estatísticas gerais
  const totalGols = jogos.reduce((acc, jogo) => {
    if (jogo.placarA !== null && jogo.placarB !== null) {
      return acc + jogo.placarA + jogo.placarB;
    }
    return acc + (jogo.eventos?.filter((e) => e.tipo === "gol").length || 0);
  }, 0);

  const jogosFinalizados = jogos.filter(
    (j) => j.placarA !== null && j.placarB !== null
  ).length;

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
              <h1 className={styles.title}>Campeonato LHPSYSTEMS-2025</h1>
              <p className={styles.subtitle}>
                <Eye size={16} />
                Visualização dos Jogos e Resultados
              </p>
            </div>
          </div>

          {/* Estatísticas Resumidas */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Calendar size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{jogos.length}</span>
                <span className={styles.statLabel}>Total de Jogos</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Target size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalGols}</span>
                <span className={styles.statLabel}>Gols Marcados</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Clock size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{jogosFinalizados}</span>
                <span className={styles.statLabel}>Jogos Finalizados</span>
              </div>
            </div>
          </div>

          {/* Grupos */}
          <div className={styles.groupsContainer}>
            {nomesGrupos.map((grupo) => {
              const jogosDoGrupo = gruposMap[grupo];

              // Organiza jogos por rodada
              const rodadasMap: Record<number, Jogo[]> = {};
              jogosDoGrupo.forEach((j) => {
                if (!rodadasMap[j.rodada]) rodadasMap[j.rodada] = [];
                rodadasMap[j.rodada].push(j);
              });

              const rodadas = Object.keys(rodadasMap)
                .map(Number)
                .sort((a, b) => a - b);

              const totalRodadas = rodadas.length;

              return (
                <section key={grupo} className={styles.group}>
                  <div className={styles.groupHeader}>
                    <h2 className={styles.groupTitle}>Grupo {grupo}</h2>
                    <div className={styles.groupStats}>
                      <span className={styles.groupStat}>
                        {jogosDoGrupo.length} jogos
                      </span>
                      <span className={styles.groupStat}>
                        {totalRodadas} rodadas
                      </span>
                    </div>
                  </div>

                  {rodadas.map((r) => {
                    const jogosOrdenados = rodadasMap[r].sort(
                      (a, b) =>
                        new Date(a.data).getTime() - new Date(b.data).getTime()
                    );

                    return (
                      <div key={r} className={styles.round}>
                        <div className={styles.roundHeader}>
                          <h3 className={styles.roundTitle}>
                            Rodada {r} de {totalRodadas}
                          </h3>
                          <span className={styles.roundGames}>
                            {jogosOrdenados.length} jogos
                          </span>
                        </div>

                        <div className={styles.gamesGrid}>
                          {jogosOrdenados.map((jogo) => (
                            <GameCard key={jogo.id} jogo={jogo} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function GameCard({ jogo }: { jogo: Jogo }) {
  const gameDate = new Date(jogo.data);
  const isFinished = jogo.placarA !== null && jogo.placarB !== null;
  const isUpcoming = gameDate > new Date();
  const eventos = jogo.eventos || [];

  // ALTERAÇÃO 1: Gols usando placar oficial quando disponível
  const golsCount =
    isFinished && jogo.placarA !== null && jogo.placarB !== null
      ? jogo.placarA + jogo.placarB
      : eventos.filter((e) => e.tipo === "gol").length;

  // ALTERAÇÃO 2: Separação de cartões amarelos e vermelhos
  const cartoesAmarelos = eventos.filter(
    (e) => e.tipo === "cartao_amarelo"
  ).length;
  const cartoesVermelhos = eventos.filter(
    (e) => e.tipo === "cartao_vermelho"
  ).length;

  return (
    <div
      className={`${styles.gameCard} ${isFinished ? styles.finished : ""} ${
        isUpcoming ? styles.upcoming : ""
      }`}
    >
      {/* Header do card */}
      <div className={styles.gameHeader}>
        <div className={styles.gameDate}>
          <Calendar size={14} />
          {gameDate.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </div>
        <div className={styles.gameTime}>
          <Clock size={14} />
          {gameDate.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Confronto */}
      <div className={styles.matchContainer}>
        {/* Equipe A */}
        <div className={styles.team}>
          <div className={styles.teamLogo}>
            <img
              src={jogo.equipeA.escudoUrl || "/imagens/escudo.png"}
              alt={jogo.equipeA.nome}
              onError={(e) => {
                e.currentTarget.src = "/imagens/escudo.png";
              }}
            />
          </div>
          <span className={styles.teamName}>{jogo.equipeA.nome}</span>
        </div>

        {/* Placar */}
        <div className={styles.scoreContainer}>
          <div className={styles.displayScore}>
            <span className={styles.score}>{jogo.placarA ?? "-"}</span>
            <span className={styles.vs}>×</span>
            <span className={styles.score}>{jogo.placarB ?? "-"}</span>
          </div>
        </div>

        {/* Equipe B */}
        <div className={styles.team}>
          <div className={styles.teamLogo}>
            <img
              src={jogo.equipeB.escudoUrl || "/imagens/escudo.png"}
              alt={jogo.equipeB.nome}
              onError={(e) => {
                e.currentTarget.src = "/imagens/escudo.png";
              }}
            />
          </div>
          <span className={styles.teamName}>{jogo.equipeB.nome}</span>
        </div>
      </div>

      {/* Informações básicas dos eventos */}
      {eventos.length > 0 && (
        <div className={styles.eventosInfo}>
          <div className={styles.eventosSummary}>
            {golsCount > 0 && (
              <span className={styles.eventoItem}>
                ⚽ {golsCount} gol{golsCount !== 1 ? "s" : ""}
              </span>
            )}
            {/* ALTERAÇÃO 2: Cartões separados */}
            {cartoesAmarelos > 0 && (
              <span className={styles.eventoItem}>
                🟨 {cartoesAmarelos} amarelo{cartoesAmarelos !== 1 ? "s" : ""}
              </span>
            )}
            {cartoesVermelhos > 0 && (
              <span className={styles.eventoItem}>
                🟥 {cartoesVermelhos} vermelho
                {cartoesVermelhos !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status do jogo */}
      <div className={styles.gameStatus}>
        {isFinished ? (
          <span className={styles.statusFinished}>Finalizado</span>
        ) : isUpcoming ? (
          <span className={styles.statusUpcoming}>Agendado</span>
        ) : (
          <span className={styles.statusLive}>Em andamento</span>
        )}
      </div>
    </div>
  );
}

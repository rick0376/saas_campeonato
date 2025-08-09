import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import {
  Calendar,
  Clock,
  Trophy,
  Users,
  Target,
  Eye,
  Home,
  Award,
  Filter,
  BarChart3,
} from "lucide-react";
import styles from "./styles.module.scss";

// Types
type Equipe = {
  id: number;
  nome: string;
  escudoUrl?: string | null;
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
};

type Jogo = {
  id: number;
  rodada: number;
  data: string;
  placarA: number | null;
  placarB: number | null;
  equipeA: Equipe;
  equipeB: Equipe;
  grupo: { nome: string };
};

type JogosPublicosProps = {
  jogos: Jogo[];
  equipes: Equipe[];
  nomeCliente: string;
};

export const getServerSideProps: GetServerSideProps<
  JogosPublicosProps
> = async (context) => {
  try {
    // Pegar clientId da query string
    const { clientId } = context.query;

    if (!clientId || typeof clientId !== "string") {
      return {
        notFound: true,
      };
    }

    // Buscar dados do cliente
    const cliente = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });

    if (!cliente) {
      return {
        notFound: true,
      };
    }

    // Buscar jogos do cliente
    const jogos = await prisma.jogo.findMany({
      where: {
        OR: [
          { equipeA: { clientId: clientId } },
          { equipeB: { clientId: clientId } },
        ],
      },
      include: {
        grupo: {
          select: { nome: true },
        },
        equipeA: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
            pontos: true,
            vitorias: true,
            empates: true,
            derrotas: true,
            golsMarcados: true,
            golsSofridos: true,
          },
        },
        equipeB: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
            pontos: true,
            vitorias: true,
            empates: true,
            derrotas: true,
            golsMarcados: true,
            golsSofridos: true,
          },
        },
      },
      orderBy: [{ grupo: { nome: "asc" } }, { rodada: "asc" }, { data: "asc" }],
    });

    // Buscar todas as equipes do cliente
    const equipes = await prisma.equipe.findMany({
      where: { clientId: clientId },
      select: {
        id: true,
        nome: true,
        escudoUrl: true,
        pontos: true,
        vitorias: true,
        empates: true,
        derrotas: true,
        golsMarcados: true,
        golsSofridos: true,
      },
      orderBy: [
        { pontos: "desc" },
        { vitorias: "desc" },
        { golsMarcados: "desc" },
      ],
    });

    // Serializar dados
    const jogosSerializados = jogos.map((j) => ({
      id: j.id,
      rodada: j.rodada,
      data: j.data.toISOString(),
      placarA: j.placarA,
      placarB: j.placarB,
      equipeA: j.equipeA,
      equipeB: j.equipeB,
      grupo: { nome: j.grupo.nome },
    }));

    return {
      props: {
        jogos: jogosSerializados,
        equipes: equipes,
        nomeCliente: cliente.name,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar dados públicos:", error);
    return {
      props: {
        jogos: [],
        equipes: [],
        nomeCliente: "Campeonato",
      },
    };
  }
};

export default function JogosPublicos({
  jogos,
  equipes,
  nomeCliente,
}: JogosPublicosProps) {
  const router = useRouter();
  const { clientId } = router.query; // ✅ ADICIONAR esta linha
  const [abaAtiva, setAbaAtiva] = useState<"resultados" | "classificacao">(
    "resultados"
  );
  const [filtroGrupo, setFiltroGrupo] = useState<string>("");

  // Organizar jogos por grupo
  const gruposMap: Record<string, Jogo[]> = {};
  jogos.forEach((j) => {
    const g = j.grupo.nome;
    if (!gruposMap[g]) gruposMap[g] = [];
    gruposMap[g].push(j);
  });

  const nomesGrupos = Object.keys(gruposMap).sort();
  const gruposFiltrados = filtroGrupo
    ? nomesGrupos.filter((g) =>
        g.toLowerCase().includes(filtroGrupo.toLowerCase())
      )
    : nomesGrupos;

  // Estatísticas
  const totalGols = jogos.reduce((acc, jogo) => {
    if (jogo.placarA !== null && jogo.placarB !== null) {
      return acc + jogo.placarA + jogo.placarB;
    }
    return acc;
  }, 0);

  const jogosFinalizados = jogos.filter(
    (j) => j.placarA !== null && j.placarB !== null
  ).length;

  return (
    <>
      <Head>
        <title>{nomeCliente} - Campeonato</title>
        <meta
          name="description"
          content={`Acompanhe todos os jogos e classificação do campeonato ${nomeCliente}`}
        />
      </Head>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header Público */}
          <div className={styles.publicHeader}>
            <div className={styles.headerIcon}>
              <Trophy size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>🏆 {nomeCliente}</h1>
              <p className={styles.subtitle}>
                <Eye size={16} />
                Campeonato {new Date().getFullYear()} - Acompanhe resultados e
                classificação
              </p>
            </div>
            <Link
              href={`/auth/login?clientId=${clientId}`}
              className={styles.loginButton}
            >
              <Users size={16} />
              Área Restrita
            </Link>
          </div>

          {/* Estatísticas */}

          {/* Navegação entre abas */}
          <div className={styles.tabsContainer}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${
                  abaAtiva === "resultados" ? styles.tabActive : ""
                }`}
                onClick={() => setAbaAtiva("resultados")}
              >
                <Calendar size={16} />
                Resultados
              </button>
              <button
                className={`${styles.tab} ${
                  abaAtiva === "classificacao" ? styles.tabActive : ""
                }`}
                onClick={() => setAbaAtiva("classificacao")}
              >
                <BarChart3 size={16} />
                Classificação
              </button>
            </div>
          </div>

          {/* Conteúdo das abas */}
          {abaAtiva === "resultados" ? (
            <div className={styles.resultadosContent}>
              {/* Filtro por Grupo */}
              <div className={styles.filtroSection}>
                <div className={styles.filtroContainer}>
                  <Filter size={16} />
                  <input
                    type="text"
                    placeholder="Filtrar por grupo..."
                    value={filtroGrupo}
                    onChange={(e) => setFiltroGrupo(e.target.value)}
                    className={styles.filtroInput}
                  />
                </div>
              </div>

              {/* Lista de Grupos e Jogos */}
              <div className={styles.gruposContainer}>
                {gruposFiltrados.map((grupo) => {
                  const jogosDoGrupo = gruposMap[grupo];

                  // Organizar por rodada
                  const rodadasMap: Record<number, Jogo[]> = {};
                  jogosDoGrupo.forEach((j) => {
                    if (!rodadasMap[j.rodada]) rodadasMap[j.rodada] = [];
                    rodadasMap[j.rodada].push(j);
                  });

                  const rodadas = Object.keys(rodadasMap).map(Number).sort();

                  return (
                    <section key={grupo} className={styles.grupo}>
                      <div className={styles.grupoHeader}>
                        <h2 className={styles.grupoTitle}>Grupo {grupo}</h2>
                        <div className={styles.grupoStats}>
                          <span>{jogosDoGrupo.length} jogos</span>
                          <span>{rodadas.length} rodadas</span>
                        </div>
                      </div>

                      {rodadas.map((rodada) => {
                        const jogosOrdenados = rodadasMap[rodada].sort(
                          (a, b) =>
                            new Date(a.data).getTime() -
                            new Date(b.data).getTime()
                        );

                        return (
                          <div key={rodada} className={styles.rodada}>
                            <h3 className={styles.rodadaTitle}>
                              Rodada {rodada}
                            </h3>

                            <div className={styles.jogosGrid}>
                              {jogosOrdenados.map((jogo) => (
                                <GameCardPublico key={jogo.id} jogo={jogo} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  );
                })}
              </div>

              {/* Estado vazio */}
              {jogos.length === 0 && (
                <div className={styles.emptyState}>
                  <Trophy size={48} />
                  <h3>Nenhum jogo encontrado</h3>
                  <p>Ainda não há jogos cadastrados neste campeonato.</p>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.classificacaoContent}>
              <ClassificacaoTabela equipes={equipes} />
            </div>
          )}

          {/* Footer */}
          <div className={styles.footer}>
            <p>
              <Home size={16} />
              {nomeCliente} - Visualização pública do campeonato
            </p>
            <Link href={`/auth/login?clientId=${clientId}`}>
              Fazer login para gerenciar
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// Componente do Card do Jogo (Público)
function GameCardPublico({ jogo }: { jogo: Jogo }) {
  const gameDate = new Date(jogo.data);
  const isFinished = jogo.placarA !== null && jogo.placarB !== null;
  const isUpcoming = gameDate > new Date();

  return (
    <div
      className={`${styles.jogoCard} ${isFinished ? styles.finalizado : ""}`}
    >
      {/* Header do card */}
      <div className={styles.jogoHeader}>
        <div className={styles.jogoData}>
          <Calendar size={14} />
          {gameDate.toLocaleDateString("pt-BR")}
        </div>
        <div className={styles.jogoHora}>
          <Clock size={14} />
          {gameDate.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Confronto */}
      <div className={styles.confronto}>
        {/* Equipe A */}
        <div className={styles.equipe}>
          <img
            src={jogo.equipeA.escudoUrl || "/imagens/escudo.png"}
            alt={jogo.equipeA.nome}
            className={styles.escudo}
            onError={(e) => {
              e.currentTarget.src = "/imagens/escudo.png";
            }}
          />
          <span className={styles.nomeEquipe}>{jogo.equipeA.nome}</span>
        </div>

        {/* Placar */}
        <div className={styles.placar}>
          <span className={styles.score}>{jogo.placarA ?? "-"}</span>
          <span className={styles.vs}>×</span>
          <span className={styles.score}>{jogo.placarB ?? "-"}</span>
        </div>

        {/* Equipe B */}
        <div className={styles.equipe}>
          <img
            src={jogo.equipeB.escudoUrl || "/imagens/escudo.png"}
            alt={jogo.equipeB.nome}
            className={styles.escudo}
            onError={(e) => {
              e.currentTarget.src = "/imagens/escudo.png";
            }}
          />
          <span className={styles.nomeEquipe}>{jogo.equipeB.nome}</span>
        </div>
      </div>

      {/* Status */}
      <div className={styles.status}>
        {isFinished ? (
          <span className={styles.finalizado}>✅ Finalizado</span>
        ) : isUpcoming ? (
          <span className={styles.agendado}>📅 Agendado</span>
        ) : (
          <span className={styles.emAndamento}>🔴 Em andamento</span>
        )}
      </div>
    </div>
  );
}

// Componente da Tabela de Classificação
function ClassificacaoTabela({ equipes }: { equipes: Equipe[] }) {
  return (
    <div className={styles.tabelaContainer}>
      <div className={styles.tabelaHeader}>
        <h2>
          <Award size={20} />
          Classificação Geral
        </h2>
        <p>Ordenada por pontos, vitórias e saldo de gols</p>
      </div>

      <div className={styles.tabela}>
        <div className={styles.tabelaHeaderRow}>
          <div className={styles.posicao}>Pos</div>
          <div className={styles.equipeCol}>Equipe</div>
          <div className={styles.pontos}>Pts</div>
          <div className={styles.jogos}>J</div>
          <div className={styles.vitorias}>V</div>
          <div className={styles.empates}>E</div>
          <div className={styles.derrotas}>D</div>
          <div className={styles.gols}>GP</div>
          <div className={styles.gols}>GC</div>
          <div className={styles.saldo}>SG</div>
        </div>

        {equipes.map((equipe, index) => {
          const jogos = equipe.vitorias + equipe.empates + equipe.derrotas;
          const saldoGols = equipe.golsMarcados - equipe.golsSofridos;

          return (
            <div
              key={equipe.id}
              className={`${styles.tabelaRow} ${
                index < 4
                  ? styles.classificado
                  : index >= equipes.length - 4
                  ? styles.rebaixamento
                  : ""
              }`}
            >
              <div className={styles.posicao}>
                <span className={styles.posicaoNumero}>{index + 1}º</span>
              </div>
              <div className={styles.equipeCol}>
                <img
                  src={equipe.escudoUrl || "/imagens/escudo.png"}
                  alt={equipe.nome}
                  className={styles.escudoTabela}
                  onError={(e) => {
                    e.currentTarget.src = "/imagens/escudo.png";
                  }}
                />
                <span className={styles.nomeEquipeTabela}>{equipe.nome}</span>
              </div>
              <div className={styles.pontos}>
                <strong>{equipe.pontos}</strong>
              </div>
              <div className={styles.jogos}>{jogos}</div>
              <div className={styles.vitorias}>{equipe.vitorias}</div>
              <div className={styles.empates}>{equipe.empates}</div>
              <div className={styles.derrotas}>{equipe.derrotas}</div>
              <div className={styles.gols}>{equipe.golsMarcados}</div>
              <div className={styles.gols}>{equipe.golsSofridos}</div>
              <div
                className={`${styles.saldo} ${
                  saldoGols > 0
                    ? styles.positivo
                    : saldoGols < 0
                    ? styles.negativo
                    : ""
                }`}
              >
                {saldoGols > 0 ? "+" : ""}
                {saldoGols}
              </div>
            </div>
          );
        })}
      </div>

      {equipes.length === 0 && (
        <div className={styles.emptyClassificacao}>
          <Award size={48} />
          <h3>Nenhuma equipe encontrada</h3>
          <p>Ainda não há equipes cadastradas neste campeonato.</p>
        </div>
      )}

      <div className={styles.legenda}>
        <div className={styles.legendaItem}>
          <div className={`${styles.legendaCor} ${styles.classificado}`}></div>
          <span>Classificação para próxima fase</span>
        </div>
        <div className={styles.legendaItem}>
          <div className={`${styles.legendaCor} ${styles.rebaixamento}`}></div>
          <span>Zona de rebaixamento</span>
        </div>
      </div>
    </div>
  );
}

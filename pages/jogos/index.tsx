import type { GetServerSideProps } from "next";
import { getSession, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import Layout from "../../components/Layout";
import { prisma } from "../../lib/prisma";
import {
  CanView,
  CanCreate,
  CanEdit,
  CanDelete,
} from "../../components/ProtectedComponent";
import { usePermissions } from "../../hooks/usePermissions";
import axios from "axios";
import styles from "./styles.module.scss";
import {
  Edit3,
  Calendar,
  Clock,
  Trophy,
  AlertTriangle,
  Save,
  Trash2,
  Eye,
  RefreshCw,
  Users,
  Target,
  Square,
  Plus,
  UserCheck,
  Award,
  Zap,
  ChevronDown,
  ChevronUp,
  Timer,
  User,
  X,
  Lock,
  // Novos ícones para a modal
  Wand2,
  Edit,
  ArrowRight,
  Clock3,
  Building2,
} from "lucide-react";

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

type ExibirProps = {
  jogos: Jogo[];
  session: any;
};

export const getServerSideProps: GetServerSideProps<ExibirProps> = async (
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

  try {
    const user = session.user as any;

    const jogos = await prisma.jogo.findMany({
      where: {
        OR: [
          {
            equipeA: {
              ...(user.clientId &&
              user.clientId !== "undefined" &&
              user.clientId !== "null"
                ? { clientId: user.clientId }
                : {}),
            },
          },
          {
            equipeB: {
              ...(user.clientId &&
              user.clientId !== "undefined" &&
              user.clientId !== "null"
                ? { clientId: user.clientId }
                : {}),
            },
          },
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

export default function ExibirJogos({
  jogos: initialJogos,
  session,
}: ExibirProps) {
  const { canView, canCreate, canEdit, canDelete } = usePermissions();
  const [jogos, setJogos] = useState(initialJogos);

  // ✅ NOVO: Estado para controlar a modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ✅ Proteção da página inteira
  if (!canView("jogos")) {
    return (
      <Layout>
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedIcon}>
            <Lock size={48} />
          </div>
          <h2 className={styles.accessDeniedTitle}>Acesso Negado</h2>
          <p className={styles.accessDeniedDescription}>
            Você não tem permissão para visualizar jogos.
          </p>
          <Link href="/" className={styles.backToHomeButton}>
            Voltar ao Início
          </Link>
        </div>
      </Layout>
    );
  }

  // Função para atualizar um jogo específico
  const updateJogo = (
    jogoId: number,
    newPlacarA: number | null,
    newPlacarB: number | null
  ) => {
    setJogos((prevJogos) =>
      prevJogos.map((jogo) =>
        jogo.id === jogoId
          ? { ...jogo, placarA: newPlacarA, placarB: newPlacarB }
          : jogo
      )
    );
  };

  // Função para remover um jogo da lista
  const removeJogo = (jogoId: number) => {
    setJogos((prevJogos) => prevJogos.filter((jogo) => jogo.id !== jogoId));
  };

  // Função para atualizar eventos de um jogo
  const updateJogoEventos = (jogoId: number, eventos: Evento[]) => {
    setJogos((prevJogos) =>
      prevJogos.map((jogo) =>
        jogo.id === jogoId ? { ...jogo, eventos } : jogo
      )
    );
  };

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

  // Estatísticas dos eventos
  const totalEventos = jogos.reduce(
    (acc, jogo) => acc + (jogo.eventos?.length || 0),
    0
  );

  // Cálculo corrigido de gols
  const totalGols = jogos.reduce((acc, jogo) => {
    if (jogo.placarA !== null && jogo.placarB !== null) {
      return acc + jogo.placarA + jogo.placarB;
    }
    return acc + (jogo.eventos?.filter((e) => e.tipo === "gol").length || 0);
  }, 0);

  // Separação de cartões amarelos e vermelhos
  const totalCartoesAmarelos = jogos.reduce(
    (acc, jogo) =>
      acc +
      (jogo.eventos?.filter((e) => e.tipo === "cartao_amarelo").length || 0),
    0
  );
  const totalCartoesVermelhos = jogos.reduce(
    (acc, jogo) =>
      acc +
      (jogo.eventos?.filter((e) => e.tipo === "cartao_vermelho").length || 0),
    0
  );
  const totalCartoes = totalCartoesAmarelos + totalCartoesVermelhos;

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
              <h1 className={styles.title}>
                Campeonato {new Date().getFullYear()}
              </h1>
              <p className={styles.subtitle}>
                {canEdit("jogos") ? (
                  <>
                    <Edit3 size={16} />
                    Modo Administrador - Gerencie jogos e eventos
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    Visualização dos jogos e resultados
                  </>
                )}
              </p>
            </div>
            {/* ✅ NOVO: Botão que abre modal em vez de ir direto para cadastro */}
            <CanCreate module="jogos">
              <button
                onClick={() => setShowCreateModal(true)}
                className={styles.addButton}
              >
                <Plus size={16} />
                Novo Jogo
              </button>
            </CanCreate>
          </div>

          {/* Estatísticas atualizadas */}
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
                <Square size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalCartoes}</span>
                <span className={styles.statLabel}>
                  Cartões ({totalCartoesAmarelos} amarelos,{" "}
                  {totalCartoesVermelhos} vermelhos)
                </span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Clock size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>
                  {
                    jogos.filter(
                      (j) => j.placarA !== null && j.placarB !== null
                    ).length
                  }
                </span>
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
                            <GameCard
                              key={jogo.id}
                              jogo={jogo}
                              onUpdate={updateJogo}
                              onRemove={removeJogo}
                              onUpdateEventos={updateJogoEventos}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>

          {/* Estado vazio com botão protegido */}
          {jogos.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Calendar size={48} />
              </div>
              <h3 className={styles.emptyTitle}>Nenhum jogo encontrado</h3>
              <p className={styles.emptyDescription}>
                Ainda não há jogos cadastrados no sistema.
              </p>
              <CanCreate module="jogos">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className={styles.emptyAction}
                >
                  <Plus size={16} />
                  Cadastrar Primeiro Jogo
                </button>
              </CanCreate>
            </div>
          )}

          {/* ✅ NOVA: Modal de seleção de tipo de criação */}
          {showCreateModal && (
            <div
              className={styles.modalOverlay}
              onClick={() => setShowCreateModal(false)}
            >
              <div
                className={styles.createModal}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.createModalHeader}>
                  <h3 className={styles.createModalTitle}>
                    <Plus size={24} />
                    Como você deseja criar os jogos?
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className={styles.createModalClose}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className={styles.createModalContent}>
                  <p className={styles.createModalDescription}>
                    Escolha a forma mais adequada para criar seus jogos:
                  </p>

                  <div className={styles.createOptions}>
                    {/* Opção: Criação Automática */}
                    <div className={styles.createOption}>
                      <div className={styles.createOptionIcon}>
                        <Wand2 size={32} />
                      </div>
                      <div className={styles.createOptionContent}>
                        <h4 className={styles.createOptionTitle}>
                          Criação Automática
                        </h4>
                        <p className={styles.createOptionDescription}>
                          Gere automaticamente todos os jogos de um campeonato
                          com turno e returno distribuídos em rodadas.
                        </p>
                        <ul className={styles.createOptionFeatures}>
                          <li>
                            <Clock3 size={14} />
                            Mais rápido e eficiente
                          </li>
                          <li>
                            <Zap size={14} />
                            Distribuição automática em rodadas
                          </li>
                          <li>
                            <Target size={14} />
                            Ideal para campeonatos completos
                          </li>
                        </ul>
                      </div>
                      <Link
                        href="/cadastrar/jogos/gerar-jogos"
                        className={styles.createOptionButton}
                        onClick={() => setShowCreateModal(false)}
                      >
                        Gerar Automaticamente
                        <ArrowRight size={16} />
                      </Link>
                    </div>

                    {/* Opção: Criação Manual */}
                    <div className={styles.createOption}>
                      <div className={styles.createOptionIcon}>
                        <Edit size={32} />
                      </div>
                      <div className={styles.createOptionContent}>
                        <h4 className={styles.createOptionTitle}>
                          Criação Manual
                        </h4>
                        <p className={styles.createOptionDescription}>
                          Crie jogos individualmente com controle total sobre
                          equipes, datas e configurações específicas.
                        </p>
                        <ul className={styles.createOptionFeatures}>
                          <li>
                            <UserCheck size={14} />
                            Controle total sobre cada jogo
                          </li>
                          <li>
                            <Calendar size={14} />
                            Datas e horários personalizados
                          </li>
                          <li>
                            <Users size={14} />
                            Ideal para jogos pontuais
                          </li>
                        </ul>
                      </div>
                      <Link
                        href="/cadastrar/jogos"
                        className={styles.createOptionButton}
                        onClick={() => setShowCreateModal(false)}
                      >
                        Criar Manualmente
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>

                  <div className={styles.createModalFooter}>
                    <div className={styles.createModalTip}>
                      <AlertTriangle size={16} />
                      <span>
                        <strong>Dica:</strong> Use a criação automática para
                        campeonatos completos e a manual para jogos específicos
                        ou amistosos.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ✅ Componente GameCard com permissões e eventos detalhados
function GameCard({
  jogo,
  onUpdate,
  onRemove,
  onUpdateEventos,
}: {
  jogo: Jogo;
  onUpdate: (
    jogoId: number,
    placarA: number | null,
    placarB: number | null
  ) => void;
  onRemove: (jogoId: number) => void;
  onUpdateEventos: (jogoId: number, eventos: Evento[]) => void;
}) {
  const { canEdit, canDelete } = usePermissions();
  const [placarA, setPlacarA] = useState<string>(
    jogo.placarA?.toString() ?? ""
  );
  const [placarB, setPlacarB] = useState<string>(
    jogo.placarB?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showEventos, setShowEventos] = useState(false);
  const [showEventosDetalhados, setShowEventosDetalhados] = useState(false);

  // Estados para modal de exclusão de jogo
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const originalPlacarA = jogo.placarA?.toString() ?? "";
  const originalPlacarB = jogo.placarB?.toString() ?? "";

  useEffect(() => {
    setHasChanges(placarA !== originalPlacarA || placarB !== originalPlacarB);
  }, [placarA, placarB, originalPlacarA, originalPlacarB]);

  useEffect(() => {
    setPlacarA(jogo.placarA?.toString() ?? "");
    setPlacarB(jogo.placarB?.toString() ?? "");
  }, [jogo.placarA, jogo.placarB]);

  const save = async () => {
    setSaving(true);
    try {
      const newPlacarA = placarA === "" ? null : Number(placarA);
      const newPlacarB = placarB === "" ? null : Number(placarB);

      await axios.put(`/api/jogos/${jogo.id}`, {
        placarA: newPlacarA,
        placarB: newPlacarB,
        recalcularEstatisticas: true,
      });

      onUpdate(jogo.id, newPlacarA, newPlacarB);
      setHasChanges(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar resultado");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/jogos/${jogo.id}`, {
        placarA: null,
        placarB: null,
        recalcularEstatisticas: true,
      });

      onUpdate(jogo.id, null, null);
      setPlacarA("");
      setPlacarB("");
      setHasChanges(false);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir resultado");
    } finally {
      setSaving(false);
      setShowConfirmModal(false);
    }
  };

  // Função para excluir jogo completamente
  const deleteGame = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/jogos/${jogo.id}`);
      onRemove(jogo.id);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao excluir jogo:", error);
      alert("Erro ao excluir jogo. Tente novamente.");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleSave = () => {
    if (placarA === "" || placarB === "") {
      setShowConfirmModal(true);
    } else {
      save();
    }
  };

  const gameDate = new Date(jogo.data);
  const isFinished = jogo.placarA !== null && jogo.placarB !== null;
  const isUpcoming = gameDate > new Date();
  const eventos = jogo.eventos || [];

  // Estatísticas dos eventos
  const golsEquipeA = eventos.filter(
    (e) => e.tipo === "gol" && e.jogador?.equipe.id === jogo.equipeA.id
  ).length;
  const golsEquipeB = eventos.filter(
    (e) => e.tipo === "gol" && e.jogador?.equipe.id === jogo.equipeB.id
  ).length;
  const cartoesAmarelos = eventos.filter(
    (e) => e.tipo === "cartao_amarelo"
  ).length;
  const cartoesVermelhos = eventos.filter(
    (e) => e.tipo === "cartao_vermelho"
  ).length;
  const assistencias = eventos.filter((e) => e.tipo === "assistencia").length;

  // Separar eventos por tipo
  const gols = eventos
    .filter((e) => e.tipo === "gol")
    .sort((a, b) => a.minuto - b.minuto);
  const cartoes = eventos
    .filter((e) => e.tipo.includes("cartao"))
    .sort((a, b) => a.minuto - b.minuto);
  const assists = eventos
    .filter((e) => e.tipo === "assistencia")
    .sort((a, b) => a.minuto - b.minuto);

  return (
    <>
      <div
        className={`${styles.gameCard} ${isFinished ? styles.finished : ""} ${
          isUpcoming ? styles.upcoming : ""
        }`}
      >
        {/* Feedback de sucesso */}
        {showSuccess && (
          <div className={styles.successFeedback}>
            <RefreshCw size={16} />
            Operação realizada com sucesso!
          </div>
        )}

        {/* Header do card */}
        <div className={styles.gameHeader}>
          <div className={styles.gameDate}>
            <Calendar size={14} />
            {gameDate.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })}
          </div>
          <div className={styles.gameTime}>
            <Clock size={14} />
            {gameDate.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {/* ✅ Ações protegidas por permissão */}
          <div className={styles.adminActions}>
            <CanEdit module="jogos">
              <Link
                href={`/jogos/${jogo.id}/eventos`}
                className={styles.eventsButton}
                title="Gerenciar eventos"
              >
                <Zap size={14} />
              </Link>
            </CanEdit>
            <CanEdit module="jogos">
              <Link
                href={`/update/jogos/${jogo.id}/editar`}
                className={styles.editButton}
                title="Editar jogo"
              >
                <Edit3 size={14} />
              </Link>
            </CanEdit>
            <CanDelete module="jogos">
              <button
                onClick={() => setShowDeleteModal(true)}
                className={styles.deleteButton}
                title="Excluir jogo"
                disabled={deleting}
              >
                <Trash2 size={14} />
              </button>
            </CanDelete>
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
            {/* ✅ Placar editável apenas com permissão */}
            {canEdit("jogos") ? (
              <div className={styles.editableScore}>
                <input
                  type="number"
                  value={placarA}
                  onChange={(e) => setPlacarA(e.target.value)}
                  placeholder="-"
                  className={styles.scoreInput}
                  disabled={saving}
                  min="0"
                />
                <span className={styles.vs}>×</span>
                <input
                  type="number"
                  value={placarB}
                  onChange={(e) => setPlacarB(e.target.value)}
                  placeholder="-"
                  className={styles.scoreInput}
                  disabled={saving}
                  min="0"
                />
              </div>
            ) : (
              <div className={styles.displayScore}>
                <span className={styles.score}>{jogo.placarA ?? "-"}</span>
                <span className={styles.vs}>×</span>
                <span className={styles.score}>{jogo.placarB ?? "-"}</span>
              </div>
            )}
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

        {/* Status do jogo */}
        <div className={styles.gameStatusBottom}>
          {isFinished ? (
            <span className={styles.statusFinished}>Finalizado</span>
          ) : isUpcoming ? (
            <span className={styles.statusUpcoming}>Agendado</span>
          ) : (
            <span className={styles.statusLive}>Em andamento</span>
          )}
        </div>

        {/* SEÇÃO DE EVENTOS EXPANDIDA */}
        {eventos.length > 0 && (
          <div className={styles.eventosContainer}>
            {/* Toggle básico de eventos */}
            <button
              onClick={() => setShowEventos(!showEventos)}
              className={styles.eventosToggle}
            >
              <Zap size={14} />
              {eventos.length} evento{eventos.length !== 1 ? "s" : ""}
              {showEventos ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>

            {showEventos && (
              <div className={styles.eventosExpandidos}>
                {/* RESUMO DOS EVENTOS */}
                <div className={styles.eventosResumo}>
                  {golsEquipeA > 0 && (
                    <span className={styles.eventoResumoItem}>
                      <Target size={12} />
                      {golsEquipeA} gol{golsEquipeA !== 1 ? "s" : ""} -{" "}
                      {jogo.equipeA.nome}
                    </span>
                  )}
                  {golsEquipeB > 0 && (
                    <span className={styles.eventoResumoItem}>
                      <Target size={12} />
                      {golsEquipeB} gol{golsEquipeB !== 1 ? "s" : ""} -{" "}
                      {jogo.equipeB.nome}
                    </span>
                  )}
                  {cartoesAmarelos > 0 && (
                    <span className={styles.eventoResumoItem}>
                      <Square size={12} className={styles.amarelo} />
                      {cartoesAmarelos} amarelo
                      {cartoesAmarelos !== 1 ? "s" : ""}
                    </span>
                  )}
                  {cartoesVermelhos > 0 && (
                    <span className={styles.eventoResumoItem}>
                      <Square size={12} className={styles.vermelho} />
                      {cartoesVermelhos} vermelho
                      {cartoesVermelhos !== 1 ? "s" : ""}
                    </span>
                  )}
                  {assistencias > 0 && (
                    <span className={styles.eventoResumoItem}>
                      <Award size={12} />
                      {assistencias} assistência{assistencias !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Toggle para detalhes completos */}
                <button
                  onClick={() =>
                    setShowEventosDetalhados(!showEventosDetalhados)
                  }
                  className={styles.detalhesToggle}
                >
                  <User size={14} />
                  Ver detalhes completos
                  {showEventosDetalhados ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>

                {/* DETALHES COMPLETOS DOS EVENTOS */}
                {showEventosDetalhados && (
                  <div className={styles.eventosDetalhados}>
                    {/* TIMELINE CRONOLÓGICA DE TODOS OS EVENTOS */}
                    <div className={styles.timelineContainer}>
                      <h4 className={styles.eventosSecaoTitulo}>
                        <Clock size={16} />
                        Timeline da Partida
                      </h4>
                      <div className={styles.timelineList}>
                        {eventos
                          .sort((a, b) => a.minuto - b.minuto)
                          .map((evento) => (
                            <div
                              key={evento.id}
                              className={styles.timelineItem}
                            >
                              <div className={styles.timelineMinuto}>
                                {evento.minuto}'
                              </div>
                              <div className={styles.timelineIcone}>
                                {evento.tipo === "gol" && <Target size={14} />}
                                {evento.tipo === "cartao_amarelo" && (
                                  <Square
                                    size={14}
                                    className={styles.amarelo}
                                  />
                                )}
                                {evento.tipo === "cartao_vermelho" && (
                                  <Square
                                    size={14}
                                    className={styles.vermelho}
                                  />
                                )}
                                {evento.tipo === "assistencia" && (
                                  <Award size={14} />
                                )}
                              </div>
                              <div className={styles.timelineInfo}>
                                <div className={styles.timelineJogador}>
                                  <strong>{evento.jogador?.nome}</strong> #
                                  {evento.jogador?.numero}
                                </div>
                                <div className={styles.timelineEquipe}>
                                  {evento.jogador?.equipe.nome}
                                </div>
                                <div className={styles.timelineTipo}>
                                  {evento.tipo === "gol" && "⚽ Gol"}
                                  {evento.tipo === "cartao_amarelo" &&
                                    "🟨 Cartão Amarelo"}
                                  {evento.tipo === "cartao_vermelho" &&
                                    "🟥 Cartão Vermelho"}
                                  {evento.tipo === "assistencia" &&
                                    "🎯 Assistência"}
                                </div>
                                {evento.detalhes && (
                                  <div className={styles.timelineDetalhes}>
                                    {evento.detalhes}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ✅ Ações do admin protegidas por permissão */}
        {canEdit("jogos") && hasChanges && (
          <div className={styles.gameActions}>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`${styles.actionButton} ${styles.saveButton}`}
            >
              <Save size={14} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </div>

      {/* Modal de confirmação de limpar placar */}
      {showConfirmModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowConfirmModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={24} className={styles.modalIcon} />
              <h3 className={styles.modalTitle}>Confirmar ação</h3>
            </div>
            <div className={styles.modalContent}>
              <p className={styles.modalText}>
                Deseja realmente excluir o resultado deste jogo? Isso irá
                recalcular todas as estatísticas das equipes.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className={styles.modalCancelButton}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={remove}
                disabled={saving}
                className={styles.modalConfirmButton}
              >
                <Trash2 size={16} />
                {saving ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exclusão de jogo */}
      {showDeleteModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDeleteModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={24} className={styles.modalIconDanger} />
              <h3 className={styles.modalTitle}>
                Excluir Jogo Permanentemente
              </h3>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.gameInfoModal}>
                <div className={styles.teamsModal}>
                  <span>{jogo.equipeA.nome}</span>
                  <span className={styles.vsModal}>VS</span>
                  <span>{jogo.equipeB.nome}</span>
                </div>
                <div className={styles.gameDetailsModal}>
                  <span>
                    Rodada {jogo.rodada} - Grupo {jogo.grupo.nome}
                  </span>
                  <span>{new Date(jogo.data).toLocaleString("pt-BR")}</span>
                </div>
              </div>
              <div className={styles.warningBox}>
                <AlertTriangle size={20} />
                <div>
                  <strong>⚠️ ATENÇÃO: Esta ação é irreversível!</strong>
                  <p>Ao excluir este jogo, você perderá permanentemente:</p>
                  <ul>
                    <li>
                      Todos os eventos do jogo (gols, cartões, assistências)
                    </li>
                    <li>Resultados e placares</li>
                    <li>Estatísticas relacionadas</li>
                  </ul>
                  <p>
                    <strong>
                      As estatísticas das equipes serão recalculadas
                      automaticamente.
                    </strong>
                  </p>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowDeleteModal(false)}
                className={styles.modalCancelButton}
                disabled={deleting}
              >
                <X size={16} />
                Cancelar
              </button>
              <button
                onClick={deleteGame}
                disabled={deleting}
                className={styles.modalDeleteButton}
              >
                <Trash2 size={16} />
                {deleting ? "Excluindo..." : "Excluir Permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

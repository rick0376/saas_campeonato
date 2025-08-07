import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import api from "../../lib/axios";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { prisma } from "../../lib/prisma";
import {
  CanCreate,
  CanEdit,
  CanDelete,
} from "../../components/ProtectedComponent";
import { usePermissions } from "../../hooks/usePermissions";
import {
  Award,
  Plus,
  Users,
  Edit3,
  Trash2,
  Shield,
  Trophy,
  AlertTriangle,
  Loader2,
  X,
  Eye,
  RefreshCw,
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
};

type Grupo = {
  id: number;
  nome: string;
  createdAt: string; // ✅ CORRIGIDO: Agora é string, não Date
  _count: {
    equipes: number;
  };
  equipes?: Equipe[];
};

type GruposProps = {
  grupos: Grupo[];
  session: any;
};

export const getServerSideProps: GetServerSideProps<GruposProps> = async (
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

    // Buscar grupos filtrados por cliente
    const grupos = await prisma.grupo.findMany({
      where: {
        // Filtrar por clientId se não for Super Admin
        ...(user.clientId &&
        user.clientId !== "undefined" &&
        user.clientId !== "null"
          ? { clientId: user.clientId }
          : {}),
      },
      orderBy: { nome: "asc" },
      include: { _count: { select: { equipes: true } } },
    });

    // ✅ CORREÇÃO: Serializar todas as datas para strings
    const gruposSerializados = grupos.map((grupo) => ({
      ...grupo,
      createdAt: grupo.createdAt.toISOString(), // Converter Date para string ISO
      updatedAt: grupo.updatedAt?.toISOString() || null, // Se existir updatedAt
    }));

    return {
      props: {
        grupos: gruposSerializados, // ✅ Agora pode ser serializado
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
    console.error("Erro ao buscar grupos:", error);
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

export default function Grupos({ grupos, session }: GruposProps) {
  const router = useRouter();
  const { canCreate } = usePermissions();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [grupoToDelete, setGrupoToDelete] = useState<Grupo | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string>("");

  // Estatísticas
  const totalGrupos = grupos.length;
  const totalEquipes = grupos.reduce(
    (acc, grupo) => acc + grupo._count.equipes,
    0
  );
  const grupoComMaisEquipes =
    grupos.length > 0
      ? grupos.reduce(
          (prev, current) =>
            prev._count.equipes > current._count.equipes ? prev : current,
          grupos[0]
        )
      : null;
  const mediaEquipesPorGrupo =
    totalGrupos > 0 ? Math.round(totalEquipes / totalGrupos) : 0;

  const handleDeleteClick = (grupo: Grupo) => {
    setGrupoToDelete(grupo);
    setShowDeleteModal(true);
    setError("");
  };

  const handleViewTeams = async (grupo: Grupo) => {
    setSelectedGrupo(grupo);
    setShowTeamsModal(true);
    setLoadingTeams(true);
    setError("");

    try {
      const response = await api.get(`/api/grupos/${grupo.id}/equipes`);
      setSelectedGrupo((prev) =>
        prev ? { ...prev, equipes: response.data } : null
      );
    } catch (error: any) {
      setError("Erro ao carregar equipes do grupo");
      setSelectedGrupo((prev) => (prev ? { ...prev, equipes: [] } : null));
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!grupoToDelete) return;

    setDeleting(true);
    setError("");

    try {
      await api.delete(`/api/grupos/${grupoToDelete.id}`);

      setShowSuccess(true);
      setShowDeleteModal(false);
      setGrupoToDelete(null);

      setTimeout(() => {
        router.reload();
      }, 1500);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Erro ao excluir grupo";
      setError(errorMessage);
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setGrupoToDelete(null);
    setError("");
  };

  const handleCloseTeamsModal = () => {
    setShowTeamsModal(false);
    setSelectedGrupo(null);
    setError("");
  };

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Award size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Gerenciamento de Grupos</h1>
              <p className={styles.subtitle}>
                Organize as equipes em grupos para o campeonato
              </p>
            </div>
            <CanCreate module="grupos">
              <Link href="/cadastrar/grupos" className={styles.addButton}>
                <Plus size={16} />
                Novo Grupo
              </Link>
            </CanCreate>
          </div>

          {/* Mensagem de sucesso */}
          {showSuccess && (
            <div className={styles.successMessage}>
              <RefreshCw size={20} />
              <span>Grupo excluído com sucesso! Recarregando página...</span>
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className={styles.errorMessage}>
              <AlertTriangle size={20} />
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                className={styles.closeErrorButton}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Estatísticas */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Award size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalGrupos}</span>
                <span className={styles.statLabel}>Total de Grupos</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Users size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalEquipes}</span>
                <span className={styles.statLabel}>Equipes nos Grupos</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Trophy size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>
                  {grupoComMaisEquipes?._count.equipes || 0}
                </span>
                <span className={styles.statLabel}>Maior Grupo</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Shield size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>
                  {mediaEquipesPorGrupo}
                </span>
                <span className={styles.statLabel}>Média por Grupo</span>
              </div>
            </div>
          </div>

          {/* Lista de Grupos */}
          <div className={styles.groupsContainer}>
            {grupos.length > 0 ? (
              <div className={styles.groupsGrid}>
                {grupos.map((grupo) => (
                  <GroupCard
                    key={grupo.id}
                    grupo={grupo}
                    onDelete={handleDeleteClick}
                    onViewTeams={handleViewTeams}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Award size={48} />
                </div>
                <h3 className={styles.emptyTitle}>Nenhum grupo encontrado</h3>
                <p className={styles.emptyDescription}>
                  Ainda não há grupos cadastrados no sistema. Crie o primeiro
                  grupo para organizar as equipes.
                </p>
                <CanCreate module="grupos">
                  <Link href="/cadastrar/grupos" className={styles.emptyAction}>
                    <Plus size={16} />
                    Criar Primeiro Grupo
                  </Link>
                </CanCreate>
              </div>
            )}
          </div>

          {/* Modal de Equipes do Grupo */}
          {showTeamsModal && selectedGrupo && (
            <div className={styles.modalOverlay}>
              <div className={styles.teamsModal}>
                <div className={styles.teamsModalHeader}>
                  <div className={styles.teamsModalTitle}>
                    <Shield size={24} />
                    <div>
                      <h3>Equipes do Grupo {selectedGrupo.nome}</h3>
                      <p>
                        {selectedGrupo._count.equipes} equipe
                        {selectedGrupo._count.equipes !== 1 ? "s" : ""}{" "}
                        cadastrada
                        {selectedGrupo._count.equipes !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseTeamsModal}
                    className={styles.closeButton}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className={styles.teamsModalContent}>
                  {loadingTeams ? (
                    <div className={styles.teamsLoading}>
                      <Loader2 size={32} className={styles.spinner} />
                      <p>Carregando equipes...</p>
                    </div>
                  ) : selectedGrupo.equipes &&
                    selectedGrupo.equipes.length > 0 ? (
                    <div className={styles.teamsGrid}>
                      {selectedGrupo.equipes.map((equipe) => (
                        <div key={equipe.id} className={styles.teamCard}>
                          <div className={styles.teamHeader}>
                            <div className={styles.teamLogo}>
                              <img
                                src={equipe.escudoUrl || "/imagens/escudo.png"}
                                alt={`Escudo ${equipe.nome}`}
                                onError={(e) => {
                                  e.currentTarget.src = "/imagens/escudo.png";
                                }}
                              />
                            </div>
                            <div className={styles.teamInfo}>
                              <h4 className={styles.teamName}>{equipe.nome}</h4>
                              <span className={styles.teamPoints}>
                                {equipe.pontos} pontos
                              </span>
                            </div>
                          </div>

                          <div className={styles.teamStats}>
                            <div className={styles.teamRecord}>
                              <span className={styles.recordItem}>
                                <strong>{equipe.vitorias}</strong> V
                              </span>
                              <span className={styles.recordItem}>
                                <strong>{equipe.empates}</strong> E
                              </span>
                              <span className={styles.recordItem}>
                                <strong>{equipe.derrotas}</strong> D
                              </span>
                            </div>

                            <div className={styles.teamGoals}>
                              <span className={styles.goalsFor}>
                                {equipe.golsMarcados} gols pró
                              </span>
                              <span className={styles.goalsAgainst}>
                                {equipe.golsSofridos} gols contra
                              </span>
                            </div>
                          </div>

                          <CanEdit module="equipes">
                            <div className={styles.teamActions}>
                              <Link
                                href={`/update/equipes/${equipe.id}/editar`}
                                className={styles.editTeamButton}
                              >
                                <Edit3 size={14} />
                                Editar
                              </Link>
                            </div>
                          </CanEdit>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyTeams}>
                      <Users size={48} />
                      <h4>Nenhuma equipe neste grupo</h4>
                      <p>Este grupo ainda não possui equipes cadastradas.</p>
                      <CanCreate module="equipes">
                        <Link
                          href="/cadastrar/equipes"
                          className={styles.addTeamButton}
                        >
                          <Plus size={16} />
                          Adicionar Equipe
                        </Link>
                      </CanCreate>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal de Confirmação de Exclusão */}
          {showDeleteModal && grupoToDelete && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <AlertTriangle size={24} className={styles.modalIcon} />
                  <h3 className={styles.modalTitle}>Confirmar Exclusão</h3>
                </div>
                <div className={styles.modalContent}>
                  <p>
                    Tem certeza que deseja excluir o grupo{" "}
                    <strong>{grupoToDelete.nome}</strong>?
                  </p>
                  {grupoToDelete._count.equipes > 0 && (
                    <div className={styles.warningBox}>
                      <p>
                        <strong>⚠️ Atenção:</strong>
                      </p>
                      <p>
                        Este grupo possui{" "}
                        <strong>
                          {grupoToDelete._count.equipes} equipe(s)
                        </strong>
                        . As equipes ficarão sem grupo após a exclusão.
                      </p>
                    </div>
                  )}
                  {error && (
                    <div className={styles.modalError}>
                      <AlertTriangle size={16} />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={handleDeleteCancel}
                    disabled={deleting}
                    className={`${styles.modalButton} ${styles.cancelButton}`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className={`${styles.modalButton} ${styles.confirmButton}`}
                  >
                    {deleting ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Sim, excluir
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function GroupCard({
  grupo,
  onDelete,
  onViewTeams,
}: {
  grupo: Grupo;
  onDelete: (grupo: Grupo) => void;
  onViewTeams: (grupo: Grupo) => void;
}) {
  const { canEdit, canDelete } = usePermissions();

  return (
    <div className={styles.groupCard}>
      <div className={styles.groupHeader}>
        <div className={styles.groupIcon}>
          <Shield size={24} />
        </div>
        <div className={styles.groupInfo}>
          <h3 className={styles.groupName}>Grupo {grupo.nome}</h3>
          <span className={styles.groupCount}>
            {grupo._count.equipes} equipe{grupo._count.equipes !== 1 ? "s" : ""}
          </span>
        </div>
        <div className={styles.groupActions}>
          <CanEdit module="grupos">
            <Link
              href={`/update/grupos/${grupo.id}/editar`}
              className={styles.editButton}
              title="Editar grupo"
            >
              <Edit3 size={16} />
            </Link>
          </CanEdit>
          <CanDelete module="grupos">
            <button
              onClick={() => onDelete(grupo)}
              className={styles.deleteButton}
              title="Excluir grupo"
            >
              <Trash2 size={16} />
            </button>
          </CanDelete>
        </div>
      </div>

      <div className={styles.groupStats}>
        <div className={styles.statItem}>
          <Users size={16} />
          <span>{grupo._count.equipes} Equipes</span>
        </div>
        <div className={styles.statItem}>
          <Trophy size={16} />
          <span>Ativo</span>
        </div>
      </div>

      <div className={styles.groupFooter}>
        <button
          onClick={() => onViewTeams(grupo)}
          className={styles.viewTeamsButton}
          disabled={grupo._count.equipes === 0}
        >
          <Eye size={14} />
          Ver Equipes ({grupo._count.equipes})
        </button>
      </div>
    </div>
  );
}

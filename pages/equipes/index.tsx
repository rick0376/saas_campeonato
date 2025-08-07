import type { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import {
  CanCreate,
  CanEdit,
  CanDelete,
  CanView,
} from "../../components/ProtectedComponent";
import { usePermissions } from "../../hooks/usePermissions";
import { prisma } from "../../lib/prisma";
import {
  Edit3,
  Trash2,
  Users,
  Plus,
  Trophy,
  Target,
  AlertTriangle,
  Shield,
  Calendar,
  Award,
  UserCheck,
  Eye,
  CheckCircle,
  X,
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
  public_id?: string | null;
  grupo?: {
    id: number;
    nome: string;
  } | null;
  _count: {
    jogosCasa: number;
    jogosFora: number;
    jogadores: number;
  };
};

type EquipesProps = {
  equipes: Equipe[];
  session: any;
};

export const getServerSideProps: GetServerSideProps<EquipesProps> = async (
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

  const user = session.user as any; // ajuste conforme sua tipagem

  const queryClientId =
    typeof ctx.query.clientId === "string" && ctx.query.clientId !== ""
      ? ctx.query.clientId
      : null;

  const clientIdToFilter =
    queryClientId && queryClientId !== "undefined" && queryClientId !== "null"
      ? queryClientId
      : user.clientId;

  const equipes = await prisma.equipe.findMany({
    where: {
      ...(clientIdToFilter ? { clientId: clientIdToFilter } : {}),
    },
    orderBy: [{ grupo: { nome: "asc" } }, { nome: "asc" }],
    include: {
      grupo: {
        select: { id: true, nome: true },
      },
      _count: {
        select: {
          jogosCasa: true,
          jogosFora: true,
          jogadores: true,
        },
      },
    },
  });

  return {
    props: {
      equipes,
      session,
    },
  };
};

export default function Equipes({ equipes, session }: EquipesProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [equipeToDelete, setEquipeToDelete] = useState<Equipe | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "groups">("groups");
  const router = useRouter();
  const { canCreate } = usePermissions();

  // Estados para modal de erro
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Estados para modal de sucesso
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Separa equipes com e sem grupo
  const equipesComGrupo = equipes.filter((e) => e.grupo !== null);
  const equipesSemGrupo = equipes.filter((e) => e.grupo === null);

  // Organiza equipes por grupo
  const gruposMap: Record<string, Equipe[]> = {};
  equipesComGrupo.forEach((equipe) => {
    if (equipe.grupo) {
      const grupoNome = equipe.grupo.nome;
      if (!gruposMap[grupoNome]) gruposMap[grupoNome] = [];
      gruposMap[grupoNome].push(equipe);
    }
  });

  const nomesGrupos = Object.keys(gruposMap).sort();

  // Estatísticas gerais
  const totalEquipes = equipes.length;
  const totalJogos = equipes.reduce((acc, e) => acc + getTotalJogos(e), 0) / 2;
  const totalGols = equipes.reduce((acc, e) => acc + e.golsMarcados, 0);
  const totalJogadores = equipes.reduce(
    (acc, e) => acc + e._count.jogadores,
    0
  );

  function getTotalJogos(equipe: Equipe) {
    return equipe._count.jogosCasa + equipe._count.jogosFora;
  }

  const handleDeleteClick = (equipe: Equipe) => {
    setEquipeToDelete(equipe);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!equipeToDelete) return;

    setDeleting(true);
    try {
      await axios.delete(`/api/equipes/${equipeToDelete.id}`);

      setSuccessMessage(
        `Equipe "${equipeToDelete.nome}" excluída com sucesso!`
      );
      setShowSuccessModal(true);
      setShowDeleteModal(false);
      setEquipeToDelete(null);

      // Recarregar após mostrar sucesso
      setTimeout(() => {
        router.reload();
      }, 2000);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        "Erro ao excluir equipe. Tente novamente.";
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setShowDeleteModal(false);
      setEquipeToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setEquipeToDelete(null);
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage("");
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage("");
  };

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Users size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Gerenciamento de Equipes</h1>
              <p className={styles.subtitle}>
                Gerencie todas as equipes do campeonato
              </p>
            </div>

            <CanCreate module="equipes">
              <Link href="/cadastrar/equipes" className={styles.addButton}>
                <Plus size={16} />
                Nova Equipe
              </Link>
            </CanCreate>
          </div>

          {/* Estatísticas */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Users size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalEquipes}</span>
                <span className={styles.statLabel}>Total de Equipes</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <UserCheck size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalJogadores}</span>
                <span className={styles.statLabel}>Jogadores</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Calendar size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{totalJogos}</span>
                <span className={styles.statLabel}>Jogos Disputados</span>
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
          </div>

          {/* Filtros de visualização */}
          <div className={styles.viewControls}>
            <button
              onClick={() => setViewMode("groups")}
              className={`${styles.viewButton} ${
                viewMode === "groups" ? styles.active : ""
              }`}
            >
              <Award size={16} />
              Por Grupos ({nomesGrupos.length})
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`${styles.viewButton} ${
                viewMode === "all" ? styles.active : ""
              }`}
            >
              <Users size={16} />
              Todas as Equipes ({totalEquipes})
            </button>
          </div>

          {/* Conteúdo */}
          {viewMode === "groups" ? (
            <div className={styles.groupsContainer}>
              {nomesGrupos.length > 0 ? (
                nomesGrupos.map((grupoNome) => (
                  <section key={grupoNome} className={styles.groupSection}>
                    <div className={styles.groupHeader}>
                      <h2 className={styles.groupTitle}>
                        <Trophy size={20} />
                        Grupo {grupoNome}
                      </h2>
                      <span className={styles.groupCount}>
                        {gruposMap[grupoNome].length} equipes
                      </span>
                    </div>
                    <div className={styles.teamsGrid}>
                      {gruposMap[grupoNome].map((equipe) => (
                        <TeamCard
                          key={equipe.id}
                          equipe={equipe}
                          onDelete={handleDeleteClick}
                          getTotalJogos={getTotalJogos}
                        />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <Award size={48} />
                  </div>
                  <h3 className={styles.emptyTitle}>Nenhum grupo encontrado</h3>
                  <p className={styles.emptyDescription}>
                    As equipes ainda não foram organizadas em grupos.
                  </p>
                  <CanCreate module="grupos">
                    <Link
                      href="/cadastrar/grupos"
                      className={styles.emptyAction}
                    >
                      <Plus size={16} />
                      Criar Primeiro Grupo
                    </Link>
                  </CanCreate>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.allTeamsContainer}>
              {equipesComGrupo.length > 0 && (
                <div className={styles.sectionWithTitle}>
                  <h3 className={styles.sectionTitle}>
                    <Trophy size={20} />
                    Equipes com Grupos
                  </h3>
                  <div className={styles.teamsGrid}>
                    {equipesComGrupo.map((equipe) => (
                      <TeamCard
                        key={equipe.id}
                        equipe={equipe}
                        onDelete={handleDeleteClick}
                        getTotalJogos={getTotalJogos}
                      />
                    ))}
                  </div>
                </div>
              )}

              {equipesSemGrupo.length > 0 && (
                <div className={styles.sectionWithTitle}>
                  <h3 className={styles.sectionTitle}>
                    <Shield size={20} />
                    Equipes sem Grupo
                  </h3>
                  <div className={styles.teamsGrid}>
                    {equipesSemGrupo.map((equipe) => (
                      <TeamCard
                        key={equipe.id}
                        equipe={equipe}
                        onDelete={handleDeleteClick}
                        getTotalJogos={getTotalJogos}
                      />
                    ))}
                  </div>
                </div>
              )}

              {equipes.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <Users size={48} />
                  </div>
                  <h3 className={styles.emptyTitle}>
                    Nenhuma equipe encontrada
                  </h3>
                  <p className={styles.emptyDescription}>
                    Ainda não há equipes cadastradas no sistema.
                  </p>
                  <CanCreate module="equipes">
                    <Link
                      href="/cadastrar/equipes"
                      className={styles.emptyAction}
                    >
                      <Plus size={16} />
                      Cadastrar Primeira Equipe
                    </Link>
                  </CanCreate>
                </div>
              )}
            </div>
          )}

          {/* Modal de Confirmação de Exclusão */}
          {showDeleteModal && equipeToDelete && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <AlertTriangle size={24} className={styles.modalIcon} />
                  <h3 className={styles.modalTitle}>Confirmar Exclusão</h3>
                </div>
                <div className={styles.modalContent}>
                  <p>
                    Tem certeza que deseja excluir a equipe{" "}
                    <strong>{equipeToDelete.nome}</strong>?
                  </p>
                  <div className={styles.warningBox}>
                    <p>
                      <strong>⚠️ Esta ação irá:</strong>
                    </p>
                    <ul>
                      <li>
                        Excluir todos os jogadores da equipe (
                        {equipeToDelete._count.jogadores} jogadores)
                      </li>
                      <li>
                        Excluir todos os jogos da equipe (
                        {getTotalJogos(equipeToDelete)} jogos)
                      </li>
                      <li>Remover a imagem do escudo do Cloudinary</li>
                      <li>Atualizar automaticamente a classificação</li>
                      <li>
                        <strong>Esta ação não pode ser desfeita!</strong>
                      </li>
                    </ul>
                  </div>
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
                    <Trash2 size={16} />
                    {deleting ? "Excluindo..." : "Sim, excluir"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Erro */}
          {showErrorModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <AlertTriangle size={24} className={styles.modalIconError} />
                  <h3 className={styles.modalTitle}>Erro na Operação</h3>
                </div>
                <div className={styles.modalContent}>
                  <div className={styles.errorBox}>
                    <p>{errorMessage}</p>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={closeErrorModal}
                    className={`${styles.modalButton} ${styles.primaryButton}`}
                  >
                    <CheckCircle size={16} />
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Sucesso */}
          {showSuccessModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <CheckCircle size={24} className={styles.modalIconSuccess} />
                  <h3 className={styles.modalTitle}>Operação Realizada</h3>
                </div>
                <div className={styles.modalContent}>
                  <div className={styles.successBox}>
                    <p>{successMessage}</p>
                    <div className={styles.successDetails}>
                      <div className={styles.successItem}>
                        ✅ Equipe removida do sistema
                      </div>
                      <div className={styles.successItem}>
                        ✅ Escudo excluído do Cloudinary
                      </div>
                      <div className={styles.successItem}>
                        ✅ Pasta de arquivos removida
                      </div>
                      <div className={styles.successItem}>
                        ✅ Dados relacionados atualizados
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={closeSuccessModal}
                    className={`${styles.modalButton} ${styles.primaryButton}`}
                  >
                    <CheckCircle size={16} />
                    Perfeito!
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

function TeamCard({
  equipe,
  onDelete,
  getTotalJogos,
}: {
  equipe: Equipe;
  onDelete: (equipe: Equipe) => void;
  getTotalJogos: (equipe: Equipe) => number;
}) {
  const saldoGols = equipe.golsMarcados - equipe.golsSofridos;
  const totalJogos = getTotalJogos(equipe);
  const { canView } = usePermissions();

  return (
    <div className={styles.teamCard}>
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
        <div className={styles.teamBasicInfo}>
          <h3 className={styles.teamName}>{equipe.nome}</h3>
          {equipe.grupo ? (
            <span className={styles.teamGroup}>Grupo {equipe.grupo.nome}</span>
          ) : (
            <span className={styles.teamNoGroup}>Sem grupo</span>
          )}
        </div>

        <div className={styles.teamActions}>
          <CanEdit module="equipes">
            <Link
              href={`/update/equipes/${equipe.id}/editar`}
              className={styles.editButton}
              title="Editar equipe"
            >
              <Edit3 size={16} />
            </Link>
          </CanEdit>

          <CanDelete module="equipes">
            <button
              onClick={() => onDelete(equipe)}
              className={styles.deleteButton}
              title="Excluir equipe"
            >
              <Trash2 size={16} />
            </button>
          </CanDelete>
        </div>
      </div>

      <div className={styles.teamMainStats}>
        <div className={styles.pointsDisplay}>
          <span className={styles.pointsNumber}>{equipe.pontos}</span>
          <span className={styles.pointsLabel}>Pontos</span>
        </div>
        <div className={styles.recordDisplay}>
          <div className={styles.recordItem}>
            <span className={styles.recordNumber}>{equipe.vitorias}</span>
            <span className={styles.recordLabel}>V</span>
          </div>
          <div className={styles.recordItem}>
            <span className={styles.recordNumber}>{equipe.empates}</span>
            <span className={styles.recordLabel}>E</span>
          </div>
          <div className={styles.recordItem}>
            <span className={styles.recordNumber}>{equipe.derrotas}</span>
            <span className={styles.recordLabel}>D</span>
          </div>
        </div>
      </div>

      <div className={styles.teamDetailedStats}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Jogos:</span>
          <span className={styles.statValue}>{totalJogos}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Jogadores:</span>
          <span className={`${styles.statValue} ${styles.highlight}`}>
            {equipe._count.jogadores}
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Gols Marcados:</span>
          <span className={`${styles.statValue} ${styles.positive}`}>
            {equipe.golsMarcados}
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Gols Sofridos:</span>
          <span className={`${styles.statValue} ${styles.negative}`}>
            {equipe.golsSofridos}
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Saldo de Gols:</span>
          <span
            className={`${styles.statValue} ${
              saldoGols >= 0 ? styles.positive : styles.negative
            }`}
          >
            {saldoGols > 0 ? "+" : ""}
            {saldoGols}
          </span>
        </div>
      </div>

      <div className={styles.teamFooter}>
        <div className={styles.teamFooterActions}>
          <CanView module="jogadores">
            <Link
              href={`/jogadores?filtroEquipe=${equipe.nome}`}
              className={styles.playersButton}
              title="Ver jogadores da equipe"
            >
              <UserCheck size={14} />
              <span>Ver Jogadores ({equipe._count.jogadores})</span>
            </Link>
          </CanView>

          {!canView("jogadores") && (
            <div className={styles.playersButtonDisabled}>
              <UserCheck size={14} />
              <span>Jogadores ({equipe._count.jogadores})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
} from "../../components/ProtectedComponent";
import { usePermissions } from "../../hooks/usePermissions";
import { prisma } from "../../lib/prisma";
import {
  Edit3,
  Trash2,
  Users,
  Plus,
  User,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react";
import styles from "./styles.module.scss";

type Jogador = {
  id: number;
  nome: string;
  numero: number | null;
  posicao: string | null;
  idade: number | null;
  fotoUrl: string | null;
  public_id: string | null;
  ativo: boolean;
  equipe?: {
    id: number;
    nome: string;
    escudoUrl?: string | null;
  } | null;
};

type JogadoresProps = {
  jogadores: Jogador[];
  session: any;
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

  try {
    const user = session.user as any;

    // Pega clientId da query (URL), se existir e for válido
    const queryClientId =
      typeof ctx.query.clientId === "string" && ctx.query.clientId !== ""
        ? ctx.query.clientId
        : null;

    // Prioriza clientId da query, senão usa clientId do usuário
    const clientIdToFilter =
      queryClientId && queryClientId !== "undefined" && queryClientId !== "null"
        ? queryClientId
        : user.clientId;

    const jogadores = await prisma.jogador.findMany({
      where: {
        ...(clientIdToFilter ? { clientId: clientIdToFilter } : {}),
      },
      orderBy: { nome: "asc" },
      include: {
        equipe: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
      },
    });

    // Serializar dados para evitar erro de Date no Next.js
    const jogadoresSerializados = JSON.parse(JSON.stringify(jogadores));

    return {
      props: {
        jogadores: jogadoresSerializados,
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
    console.error("Erro ao buscar jogadores:", error);
    return {
      props: {
        jogadores: [],
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

export default function Jogadores({ jogadores, session }: JogadoresProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jogadorToDelete, setJogadorToDelete] = useState<Jogador | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // Estados para modais
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { canCreate } = usePermissions();

  const handleDeleteClick = (jogador: Jogador) => {
    setJogadorToDelete(jogador);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jogadorToDelete) return;

    setDeleting(true);
    try {
      await axios.delete(`/api/jogadores/${jogadorToDelete.id}`);

      setSuccessMessage(
        `Jogador "${jogadorToDelete.nome}" excluído com sucesso!`
      );
      setShowSuccessModal(true);
      setShowDeleteModal(false);
      setJogadorToDelete(null);

      setTimeout(() => {
        router.reload();
      }, 2000);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        "Erro ao excluir jogador. Tente novamente.";
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setShowDeleteModal(false);
      setJogadorToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const closeAllModals = () => {
    setShowDeleteModal(false);
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setJogadorToDelete(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <User size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Gerenciamento de Jogadores</h1>
              <p className={styles.subtitle}>
                Gerencie os jogadores do campeonanto
              </p>
            </div>

            <CanCreate module="jogadores">
              <Link href="/cadastrar/jogadores" className={styles.addButton}>
                <Plus size={16} />
                Novo Jogador
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
                <span className={styles.statNumber}>{jogadores.length}</span>
                <span className={styles.statLabel}>Total de Jogadores</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <CheckCircle size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>
                  {jogadores.filter((j) => j.ativo).length}
                </span>
                <span className={styles.statLabel}>Jogadores Ativos</span>
              </div>
            </div>
          </div>

          {/* Grid de Jogadores */}
          <div className={styles.grid}>
            {jogadores.map((jogador) => (
              <div key={jogador.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.playerInfo}>
                    <div className={styles.playerImage}>
                      {jogador.fotoUrl ? (
                        <img
                          src={jogador.fotoUrl}
                          alt={jogador.nome}
                          className={styles.playerPhoto}
                          onError={(e) => {
                            e.currentTarget.src =
                              "/imagens/jogador-default.png";
                          }}
                        />
                      ) : (
                        <User size={30} />
                      )}
                    </div>
                    <div className={styles.playerDetails}>
                      <h3 className={styles.playerName}>{jogador.nome}</h3>
                      <p className={styles.position}>
                        {jogador.posicao || "Posição não definida"}
                      </p>
                      {jogador.idade && (
                        <p className={styles.age}>{jogador.idade} anos</p>
                      )}
                    </div>
                  </div>
                  {jogador.numero && (
                    <div className={styles.playerNumber}>#{jogador.numero}</div>
                  )}
                </div>

                {jogador.equipe && (
                  <div className={styles.teamInfo}>
                    <div className={styles.teamLogo}>
                      {jogador.equipe.escudoUrl ? (
                        <img
                          src={jogador.equipe.escudoUrl}
                          alt={jogador.equipe.nome}
                          className={styles.teamImage}
                          onError={(e) => {
                            e.currentTarget.src = "/imagens/escudo.png";
                          }}
                        />
                      ) : (
                        <Users size={20} />
                      )}
                    </div>
                    <span className={styles.teamName}>
                      {jogador.equipe.nome}
                    </span>
                  </div>
                )}

                {!jogador.ativo && (
                  <div className={styles.inactiveLabel}>
                    <AlertTriangle size={14} />
                    Inativo
                  </div>
                )}

                <div className={styles.cardActions}>
                  <CanEdit module="jogadores">
                    <Link
                      href={`/update/jogadores/${jogador.id}/editar`}
                      className={styles.editButton}
                    >
                      <Edit3 size={16} />
                      Editar
                    </Link>
                  </CanEdit>

                  <CanDelete module="jogadores">
                    <button
                      onClick={() => handleDeleteClick(jogador)}
                      className={styles.deleteButton}
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </CanDelete>
                </div>
              </div>
            ))}
          </div>

          {jogadores.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <User size={48} />
              </div>
              <h3 className={styles.emptyTitle}>Nenhum jogador encontrado</h3>
              <p className={styles.emptyDescription}>
                Ainda não há jogadores cadastrados no sistema.
              </p>
              <CanCreate module="jogadores">
                <Link
                  href="/cadastrar/jogadores"
                  className={styles.emptyAction}
                >
                  <Plus size={16} />
                  Cadastrar Primeiro Jogador
                </Link>
              </CanCreate>
            </div>
          )}

          {/* Modal de Confirmação de Exclusão */}
          {showDeleteModal && jogadorToDelete && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <AlertTriangle size={24} className={styles.modalIcon} />
                  <h3 className={styles.modalTitle}>Confirmar Exclusão</h3>
                </div>
                <div className={styles.modalContent}>
                  <p>
                    Tem certeza que deseja excluir o jogador{" "}
                    <strong>{jogadorToDelete.nome}</strong>?
                  </p>
                  <div className={styles.warningBox}>
                    <p>
                      <strong>⚠️ Esta ação irá:</strong>
                    </p>
                    <ul>
                      <li>Excluir permanentemente o jogador</li>
                      <li>Remover a foto do Cloudinary</li>
                      <li>Remover a pasta vazia automaticamente</li>
                      <li>Excluir todos os eventos relacionados</li>
                      <li>
                        <strong>Esta ação não pode ser desfeita!</strong>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={closeAllModals}
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
                        ✅ Jogador removido do sistema
                      </div>
                      <div className={styles.successItem}>
                        ✅ Foto excluída do Cloudinary
                      </div>
                      <div className={styles.successItem}>
                        ✅ Pasta de arquivos removida
                      </div>
                      <div className={styles.successItem}>
                        ✅ Eventos relacionados excluídos
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={closeAllModals}
                    className={`${styles.modalButton} ${styles.primaryButton}`}
                  >
                    <CheckCircle size={16} />
                    Perfeito!
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
                    onClick={closeAllModals}
                    className={`${styles.modalButton} ${styles.primaryButton}`}
                  >
                    <CheckCircle size={16} />
                    Entendi
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

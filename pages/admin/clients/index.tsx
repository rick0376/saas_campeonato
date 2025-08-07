import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Mail,
  Info,
  LogIn,
  X,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { ProtectedComponent } from "../../../components/ProtectedComponent";
import Link from "next/link";
import styles from "./styles.module.scss";

interface Client {
  id: string;
  name?: string;
  slug: string;
  logo?: string;
  logoPublicId?: string;
  description?: string;
  domain?: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
  validDays?: number;
  maxUsers?: number;
  maxTeams?: number;
  isExpired?: boolean;
  daysUntilExpiration?: number;
  _count: {
    users: number;
    grupos: number;
    equipes: number;
    jogos: number;
  };
}

export default function AdminClients() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  // Estados para modais
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirmForceModal, setShowConfirmForceModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [relatedData, setRelatedData] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Estados para mensagem de aviso
  const [showTeamCreationMessage, setShowTeamCreationMessage] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session) {
      router.replace("/auth/login?admin=true");
      return;
    }

    fetchClients();

    // Verificar se veio redirecionado da criação de equipes
    const { message } = router.query;
    if (message === "select-client-to-create-teams") {
      setShowTeamCreationMessage(true);
    }
  }, [session, status, router.query]);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data || []);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar clientes:", error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = (clients || []).filter((client) => {
    const nomeCliente = (client?.name || "").toLowerCase();
    const termoBusca = (filtroNome || "").toLowerCase();
    const matchNome = nomeCliente.includes(termoBusca);
    const matchStatus = !filtroStatus || client.status === filtroStatus;
    return matchNome && matchStatus;
  });

  // Função para entrar em um cliente
  const handleEnterClient = async (clientId: string) => {
    try {
      const response = await fetch("/api/auth/switch-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Erro ao entrar no cliente.");
        setShowErrorModal(true);
        return;
      }

      // Atualiza a sessão via signIn com redirect false
      await signIn("credentials", {
        redirect: false,
        clientId, // passe o clientId para a função authorize
      });

      // Recarregar página para refletir sessão atualizada
      //window.location.href = "/admin/dashboard";
      window.location.href = "/home";
    } catch (error) {
      console.error("Erro ao entrar no cliente:", error);
      setErrorMessage("Erro ao entrar no cliente. Tente novamente.");
      setShowErrorModal(true);
    }
  };

  // Função para abrir modal de exclusão
  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  // ✅ FUNÇÃO CORRIGIDA: Primeira tentativa de exclusão
  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        setSuccessMessage(
          `Cliente "${getClientName(clientToDelete)}" excluído com sucesso!`
        );
        setShowSuccessModal(true);
        setShowDeleteModal(false);
        fetchClients();
      } else {
        const errorData = await response.json();

        // ✅ CORREÇÃO: Se tem dados relacionados, mostrar modal de confirmação
        if (errorData.requiresConfirmation) {
          setRelatedData(errorData.data);
          setShowDeleteModal(false);
          setShowConfirmForceModal(true);
        } else {
          setErrorMessage(errorData.message || "Erro ao excluir cliente");
          setShowErrorModal(true);
          setShowDeleteModal(false);
        }
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      setErrorMessage("Erro de conexão ao excluir cliente");
      setShowErrorModal(true);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  // ✅ FUNÇÃO CORRIGIDA: Exclusão forçada
  const handleForceDelete = async () => {
    if (!clientToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceDelete: true }), // ✅ CORREÇÃO PRINCIPAL
      });

      if (response.ok) {
        setSuccessMessage(
          `Cliente "${getClientName(
            clientToDelete
          )}" e todos os dados relacionados foram excluídos com sucesso!`
        );
        setShowSuccessModal(true);
        setShowConfirmForceModal(false);
        fetchClients();
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || "Erro ao excluir cliente");
        setShowErrorModal(true);
        setShowConfirmForceModal(false);
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      setErrorMessage("Erro de conexão ao excluir cliente");
      setShowErrorModal(true);
      setShowConfirmForceModal(false);
    } finally {
      setDeleting(false);
    }
  };

  // Funções para fechar modais
  const closeAllModals = () => {
    setShowDeleteModal(false);
    setShowConfirmForceModal(false);
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setClientToDelete(null);
    setRelatedData(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const getStatusIcon = (client: Client) => {
    if (client.isExpired) return <XCircle className={styles.expired} />;
    if (client.status === "ACTIVE")
      return <CheckCircle className={styles.active} />;
    if (client.status === "INACTIVE")
      return <XCircle className={styles.inactive} />;
    return <AlertTriangle className={styles.warning} />;
  };

  const getStatusText = (client: Client) => {
    if (client.isExpired) return "Expirado";
    return client.status === "ACTIVE" ? "Ativo" : "Inativo";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getClientName = (client: Client) => {
    return client.name || "Cliente sem nome";
  };

  return (
    <Layout>
      <ProtectedComponent module="clientes" action="visualizar">
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Building2 size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Gerenciamento de Clientes</h1>
              <p className={styles.subtitle}>
                Gerencie todos os clientes do Championship Platform
              </p>
            </div>
            <div className={styles.headerActions}>
              <Link href="/cadastrar/clients" className={styles.addButton}>
                <Plus size={20} />
                Novo Cliente
              </Link>
            </div>
          </div>

          {/* Mensagem de aviso para criação de equipes */}
          {showTeamCreationMessage && (
            <div className={styles.infoMessage}>
              <div className={styles.infoIcon}>
                <Info size={20} />
              </div>
              <div className={styles.infoContent}>
                <h3>Para criar equipes, entre em um cliente específico</h3>
                <p>
                  Como Super Administrador, você precisa entrar em um cliente
                  para criar equipes, jogadores ou outros dados. Clique em
                  "Entrar" em um dos clientes abaixo.
                </p>
              </div>
              <button
                className={styles.infoClose}
                onClick={() => setShowTeamCreationMessage(false)}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className={styles.filters}>
            <div className={styles.searchContainer}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value || "")}
                className={styles.searchInput}
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
              <option value="SUSPENDED">Suspensos</option>
              <option value="EXPIRED">Expirados</option>
            </select>
          </div>

          <div className={styles.stats}>
            <div className={styles.statCard}>
              <Building2 size={24} />
              <div>
                <span className={styles.statNumber}>
                  {clientesFiltrados.length}
                </span>
                <span className={styles.statLabel}>Total de Clientes</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <CheckCircle size={24} />
              <div>
                <span className={styles.statNumber}>
                  {
                    clientesFiltrados.filter(
                      (c) => c.status === "ACTIVE" && !c.isExpired
                    ).length
                  }
                </span>
                <span className={styles.statLabel}>Clientes Ativos</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <XCircle size={24} />
              <div>
                <span className={styles.statNumber}>
                  {clientesFiltrados.filter((c) => c.isExpired).length}
                </span>
                <span className={styles.statLabel}>Clientes Expirados</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <Users size={24} />
              <div>
                <span className={styles.statNumber}>
                  {clientesFiltrados.reduce(
                    (acc, c) => acc + (c._count?.users || 0),
                    0
                  )}
                </span>
                <span className={styles.statLabel}>Total de Usuários</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.loadingSpinner}>⏳</div>
              <p>Carregando clientes...</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {clientesFiltrados.map((client) => (
                <div key={client.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>
                        {client.logo ? (
                          <img
                            src={client.logo}
                            alt={getClientName(client)}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Building2 size={24} />
                        )}
                      </div>
                      <div className={styles.userDetails}>
                        <h3 className={styles.userName}>
                          {getClientName(client)}
                        </h3>
                        <span
                          className={`${styles.userRole} ${
                            styles[client.status?.toLowerCase() || "inactive"]
                          }`}
                        >
                          {getStatusIcon(client)} {getStatusText(client)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.userMeta}>
                      <div className={styles.metaItem}>
                        <Mail size={16} />
                        <span>@{client.slug || "sem-slug"}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <Calendar size={16} />
                        <span>
                          Criado em{" "}
                          {client.createdAt
                            ? new Date(client.createdAt).toLocaleDateString(
                                "pt-BR"
                              )
                            : "Data não disponível"}
                        </span>
                      </div>
                      {client.expiresAt && (
                        <div className={styles.metaItem}>
                          <Clock size={16} />
                          <span>
                            {client.isExpired
                              ? `Expirou em ${formatDate(client.expiresAt)}`
                              : `Expira em ${
                                  client.daysUntilExpiration || 0
                                } dias`}
                          </span>
                        </div>
                      )}
                      <div className={styles.metaItem}>
                        <Users size={16} />
                        <span>
                          {client._count?.users || 0} usuários •{" "}
                          {client._count?.equipes || 0} equipes •{" "}
                          {client._count?.jogos || 0} jogos
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      onClick={() => handleEnterClient(client.id)}
                      className={styles.enterButton}
                      title="Entrar neste cliente para gerenciar dados"
                    >
                      <LogIn size={16} />
                      Entrar
                    </button>

                    <Link
                      href={`/admin/clients/${client.id}`}
                      className={styles.editButton}
                    >
                      <Edit size={16} />
                      Editar
                    </Link>

                    <button
                      onClick={() => handleDeleteClick(client)}
                      className={styles.deleteButton}
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {clientesFiltrados.length === 0 && !loading && (
            <div className={styles.empty}>
              <Building2 size={48} />
              <h3 className={styles.emptyTitle}>Nenhum cliente encontrado</h3>
              <p className={styles.emptyDescription}>
                {filtroNome || filtroStatus
                  ? "Tente ajustar os filtros de busca"
                  : "Cadastre o primeiro cliente para começar"}
              </p>
              {!filtroNome && !filtroStatus && (
                <Link href="/cadastrar/clients" className={styles.emptyAction}>
                  <Plus size={20} />
                  Cadastrar Primeiro Cliente
                </Link>
              )}
            </div>
          )}

          {/* ✅ Modal 1: Confirmação Inicial de Exclusão */}
          {showDeleteModal && clientToDelete && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <AlertTriangle size={24} className={styles.modalIcon} />
                  <h3 className={styles.modalTitle}>Confirmar Exclusão</h3>
                </div>
                <div className={styles.modalContent}>
                  <p>
                    Tem certeza que deseja excluir o cliente{" "}
                    <strong>{getClientName(clientToDelete)}</strong>?
                  </p>
                  <div className={styles.warningBox}>
                    <p>
                      <strong>⚠️ Esta ação é irreversível!</strong>
                    </p>
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
                    {deleting ? "Verificando..." : "Sim, excluir"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Modal 2: Confirmação Forçada (Dados Relacionados) */}
          {showConfirmForceModal && clientToDelete && relatedData && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <AlertTriangle size={24} className={styles.modalIconDanger} />
                  <h3 className={styles.modalTitle}>
                    Cliente Possui Dados Relacionados
                  </h3>
                </div>
                <div className={styles.modalContent}>
                  <p>
                    O cliente <strong>{getClientName(clientToDelete)}</strong>{" "}
                    possui:
                  </p>
                  <div className={styles.dangerBox}>
                    <ul>
                      {relatedData.users > 0 && (
                        <li>{relatedData.users} usuário(s)</li>
                      )}
                      {relatedData.grupos > 0 && (
                        <li>{relatedData.grupos} grupo(s)</li>
                      )}
                      {relatedData.equipes > 0 && (
                        <li>{relatedData.equipes} equipe(s)</li>
                      )}
                      {relatedData.jogos > 0 && (
                        <li>{relatedData.jogos} jogo(s)</li>
                      )}
                      {relatedData.jogadores > 0 && (
                        <li>{relatedData.jogadores} jogador(es)</li>
                      )}
                    </ul>
                    <p>
                      <strong>
                        🚨 Todos esses dados serão PERMANENTEMENTE excluídos!
                      </strong>
                    </p>
                    <p>
                      <strong>Esta ação NÃO pode ser desfeita!</strong>
                    </p>
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
                    onClick={handleForceDelete}
                    disabled={deleting}
                    className={`${styles.modalButton} ${styles.dangerButton}`}
                  >
                    <Trash2 size={16} />
                    {deleting ? "Excluindo..." : "Sim, excluir TUDO"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Modal 3: Sucesso */}
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
                        ✅ Cliente removido do sistema
                      </div>
                      <div className={styles.successItem}>
                        ✅ Logo excluída do Cloudinary
                      </div>
                      <div className={styles.successItem}>
                        ✅ Pasta de arquivos removida
                      </div>
                      <div className={styles.successItem}>
                        ✅ Dados relacionados excluídos
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

          {/* ✅ Modal 4: Erro */}
          {showErrorModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <XCircle size={24} className={styles.modalIconError} />
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
      </ProtectedComponent>
    </Layout>
  );
}

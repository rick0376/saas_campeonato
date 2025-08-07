import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import Layout from "../../components/Layout";
import { ProtectedComponent } from "../../components/ProtectedComponent";
import {
  Users,
  UserPlus,
  Edit3,
  Trash2,
  Shield,
  User,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Crown,
  Calendar,
  Mail,
} from "lucide-react";
import Link from "next/link";
import styles from "./styles.module.scss";

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  permissoes?: any;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);

  // ✅ CORRIGIDO: Permitir SUPER_ADMIN e usuários com clientId
  if (!session) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  // ✅ Verificar se é Super Admin OU tem clientId
  const isSuperAdmin = session.user?.role === "admin";
  const hasClientId =
    session.user?.clientId && session.user?.clientId !== "null";

  if (!isSuperAdmin && !hasClientId) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
};

export default function Usuarios({ session }: { session: any }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroRole, setFiltroRole] = useState("");

  // Estados para modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ✅ NOVO: Verificar se é Super Admin
  const isSuperAdmin = session.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      // ✅ CORRIGIDO: API com filtro por cliente
      let url = "/api/usuarios";
      if (!isSuperAdmin) {
        // Se não é super admin, filtrar por cliente
        url = `/api/usuarios?clientId=${session.user?.clientId}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const matchNome = usuario.name
      .toLowerCase()
      .includes(filtroNome.toLowerCase());
    const matchRole = !filtroRole || usuario.role === filtroRole;
    return matchNome && matchRole;
  });

  const handleDeleteClick = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!usuarioToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/usuarios/${usuarioToDelete.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        loadUsuarios();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Erro ao excluir usuário");
      }
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      alert("Erro ao excluir usuário");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setUsuarioToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setUsuarioToDelete(null);
  };

  return (
    <Layout>
      <ProtectedComponent module="usuarios" action="visualizar">
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <Users size={32} />
              </div>
              <div className={styles.headerContent}>
                <h1 className={styles.title}>
                  {isSuperAdmin ? "Todos os Usuários" : "Meus Usuários"}
                </h1>
                <p className={styles.subtitle}>
                  {isSuperAdmin
                    ? "Gerencie todos os usuários do sistema"
                    : "Gerencie os usuários do seu cliente"}
                </p>
              </div>
              <div className={styles.headerActions}>
                <Link href="/cadastrar/usuarios" className={styles.addButton}>
                  <Plus size={20} />
                  Cadastrar Usuário
                </Link>
              </div>
            </div>

            <div className={styles.filters}>
              <div className={styles.searchContainer}>
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <select
                value={filtroRole}
                onChange={(e) => setFiltroRole(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Todos os tipos</option>
                {isSuperAdmin && (
                  <option value="SUPER_ADMIN">Super Admin</option>
                )}
                <option value="admin">Administradores</option>
                <option value="user">Usuários</option>
              </select>
            </div>

            <div className={styles.stats}>
              <div className={styles.statCard}>
                <Users size={24} />
                <div>
                  <span className={styles.statNumber}>
                    {usuariosFiltrados.length}
                  </span>
                  <span className={styles.statLabel}>Total de Usuários</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <Crown size={24} />
                <div>
                  <span className={styles.statNumber}>
                    {
                      usuariosFiltrados.filter(
                        (u) => u.role === "admin" || u.role === "SUPER_ADMIN"
                      ).length
                    }
                  </span>
                  <span className={styles.statLabel}>Administradores</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <User size={24} />
                <div>
                  <span className={styles.statNumber}>
                    {usuariosFiltrados.filter((u) => u.role === "user").length}
                  </span>
                  <span className={styles.statLabel}>Usuários Comuns</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.loading}>Carregando usuários...</div>
            ) : (
              <div className={styles.grid}>
                {usuariosFiltrados.map((usuario) => (
                  <div key={usuario.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          {usuario.role === "SUPER_ADMIN" ? (
                            <Shield size={24} />
                          ) : usuario.role === "admin" ? (
                            <Crown size={24} />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div className={styles.userDetails}>
                          <h3 className={styles.userName}>{usuario.name}</h3>
                          <span
                            className={`${styles.userRole} ${
                              styles[usuario.role]
                            }`}
                          >
                            {usuario.role === "SUPER_ADMIN"
                              ? "🛡️ Super Admin"
                              : usuario.role === "admin"
                              ? "👑 Administrador"
                              : "👤 Usuário"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.cardContent}>
                      <div className={styles.userMeta}>
                        <div className={styles.metaItem}>
                          <Mail size={16} />
                          <span>{usuario.email}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <Calendar size={16} />
                          <span>
                            Cadastrado em{" "}
                            {new Date(usuario.createdAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      <Link
                        href={`/update/usuarios/${usuario.id}/editar`}
                        className={styles.editButton}
                      >
                        <Edit3 size={16} />
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(usuario)}
                        className={styles.deleteButton}
                        disabled={
                          usuario.id === session.user?.id ||
                          usuario.role === "SUPER_ADMIN"
                        }
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {usuariosFiltrados.length === 0 && !loading && (
              <div className={styles.empty}>
                <Users size={48} />
                <h3>Nenhum usuário encontrado</h3>
                <p>Tente ajustar os filtros ou cadastre um novo usuário</p>
              </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {showDeleteModal && usuarioToDelete && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <div className={styles.modalHeader}>
                    <AlertTriangle size={24} className={styles.modalIcon} />
                    <h3 className={styles.modalTitle}>Confirmar Exclusão</h3>
                  </div>
                  <div className={styles.modalContent}>
                    <p>
                      Tem certeza que deseja excluir o usuário{" "}
                      <strong>{usuarioToDelete.name}</strong>?
                    </p>
                    <div className={styles.warningBox}>
                      <p>
                        <strong>⚠️ Esta ação irá:</strong>
                      </p>
                      <ul>
                        <li>Remover permanentemente o usuário do sistema</li>
                        <li>Revogar todas as permissões atribuídas</li>
                        <li>Invalidar todas as sessões ativas do usuário</li>
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
          </div>
        </div>
      </ProtectedComponent>
    </Layout>
  );
}

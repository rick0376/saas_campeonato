import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../components/ProtectedRoute";
import {
  usePermissions,
  PermissionModule,
  PermissionAction,
} from "../../../hooks/usePermissions";
import {
  Users,
  Shield,
  Save,
  Search,
  Edit,
  Eye,
  Plus,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle,
  X,
  Target,
  SettingsIcon,
  Trophy,
  UserCheck,
  BarChart3,
  Download,
  Database,
} from "lucide-react";
import styles from "./styles.module.scss";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  clientId: string | null;
  permissoes: string | null;
  client?: {
    name: string;
  };
}

interface Modal {
  isOpen: boolean;
  type: "success" | "error";
  title: string;
  message: string;
}

// ✅ CORREÇÃO: Adicionado "gerar-jogos" nos módulos
const MODULES: { key: PermissionModule; label: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "equipes", label: "Equipes", icon: Users },
  { key: "jogadores", label: "Jogadores", icon: UserCheck },
  { key: "grupos", label: "Grupos", icon: Shield },
  { key: "jogos", label: "Jogos", icon: Trophy },
  { key: "gerar-jogos", label: "Gerar Jogos", icon: Target }, // ✅ NOVO
  { key: "classificacao", label: "Classificação", icon: Trophy },
  { key: "relatorios", label: "Relatórios", icon: BarChart3 },
  { key: "backup", label: "Backup", icon: Database },
  { key: "configuracoes", label: "Configurações", icon: SettingsIcon },
];

const ACTIONS: { key: PermissionAction; label: string; icon: any }[] = [
  { key: "visualizar", label: "Visualizar", icon: Eye },
  { key: "criar", label: "Criar", icon: Plus },
  { key: "editar", label: "Editar", icon: Edit },
  { key: "excluir", label: "Excluir", icon: Trash2 },
  { key: "exportar", label: "Exportar", icon: Download },
];

export default function PermissoesAdmin() {
  const router = useRouter();
  const { isSuperAdmin, isClientAdmin } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<Modal>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    try {
      const userPermissions = user.permissoes
        ? JSON.parse(user.permissoes)
        : {};
      setPermissions(userPermissions);
    } catch (error) {
      console.error("Erro ao parsear permissões:", error);
      setPermissions({});
    }
  };

  const handlePermissionChange = (
    module: PermissionModule,
    action: PermissionAction,
    value: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: value,
      },
    }));
  };

  // ✅ NOVO: Função para selecionar todas as permissões de um módulo
  const handleSelectAllModule = (module: PermissionModule, value: boolean) => {
    const modulePermissions: Record<string, boolean> = {};
    ACTIONS.forEach((action) => {
      modulePermissions[action.key] = value;
    });

    setPermissions((prev) => ({
      ...prev,
      [module]: modulePermissions,
    }));
  };

  // ✅ NOVO: Função para selecionar todas as permissões de uma ação
  const handleSelectAllAction = (action: PermissionAction, value: boolean) => {
    const newPermissions = { ...permissions };
    MODULES.forEach((module) => {
      if (!newPermissions[module.key]) {
        newPermissions[module.key] = {};
      }
      newPermissions[module.key][action] = value;
    });
    setPermissions(newPermissions);
  };

  const showModal = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/users/${selectedUser.id}/permissions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            permissoes: JSON.stringify(permissions),
          }),
        }
      );

      if (response.ok) {
        showModal(
          "success",
          "Permissões Salvas!",
          `As permissões de ${selectedUser.name} foram atualizadas com sucesso.`
        );
        fetchUsers();
      } else {
        showModal(
          "error",
          "Erro ao Salvar",
          "Não foi possível salvar as permissões. Tente novamente."
        );
      }
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      showModal(
        "error",
        "Erro de Conexão",
        "Erro de conexão com o servidor. Verifique sua internet e tente novamente."
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ NOVO: Verificar se uma ação está totalmente selecionada
  const isActionFullySelected = (action: PermissionAction) => {
    return MODULES.every(
      (module) => permissions[module.key]?.[action] === true
    );
  };

  // ✅ NOVO: Verificar se um módulo está totalmente selecionado
  const isModuleFullySelected = (module: PermissionModule) => {
    return ACTIONS.every(
      (action) => permissions[module]?.[action.key] === true
    );
  };

  return (
    <ProtectedRoute
      requireSuperAdmin={isSuperAdmin}
      requireClientAdmin={!isSuperAdmin}
    >
      <Layout>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Shield size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Gerenciamento de Permissões</h1>
              <p className={styles.subtitle}>
                Configure as permissões de acesso dos usuários
              </p>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.usersList}>
              <div className={styles.searchContainer}>
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.usersGrid}>
                {loading ? (
                  <div className={styles.loading}>Carregando usuários...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className={styles.noUsers}>
                    <Users size={48} />
                    <h3>Nenhum usuário encontrado</h3>
                    <p>Tente ajustar os filtros de busca</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`${styles.userCard} ${
                        selectedUser?.id === user.id ? styles.selected : ""
                      }`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          <Users size={24} />
                        </div>
                        <div className={styles.userDetails}>
                          <h3>{user.name}</h3>
                          <p>{user.email}</p>
                          <span
                            className={`${styles.userRole} ${
                              styles[user.role]
                            }`}
                          >
                            {user.role === "admin"
                              ? "Administrador"
                              : user.role === "superadmin"
                              ? "Super Admin"
                              : "Usuário"}
                          </span>
                          {user.client && (
                            <span className={styles.clientName}>
                              {user.client.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.permissionsPanel}>
              {selectedUser ? (
                <>
                  <div className={styles.panelHeader}>
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>
                        <Users size={24} />
                      </div>
                      <div>
                        <h2>Permissões de {selectedUser.name}</h2>
                        <span className={styles.userEmail}>
                          {selectedUser.email}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className={styles.saveButton}
                    >
                      <Save size={16} />
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                  </div>

                  {/* ✅ NOVO: Seção de informações */}
                  <div className={styles.infoSection}>
                    <div className={styles.infoCard}>
                      <Target size={20} />
                      <div>
                        <h4>Gerar Jogos Automaticamente</h4>
                        <p>
                          Nova funcionalidade para criar todas as rodadas de um
                          campeonato automaticamente
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.permissionsGrid}>
                    <div className={styles.permissionsHeader}>
                      <div className={styles.moduleHeader}>
                        <span>Módulo</span>
                      </div>
                      {ACTIONS.map((action) => (
                        <div
                          key={action.key}
                          className={styles.actionHeader}
                          onClick={() =>
                            handleSelectAllAction(
                              action.key,
                              !isActionFullySelected(action.key)
                            )
                          }
                        >
                          <action.icon size={16} />
                          <span>{action.label}</span>
                          <input
                            type="checkbox"
                            checked={isActionFullySelected(action.key)}
                            onChange={(e) =>
                              handleSelectAllAction(
                                action.key,
                                e.target.checked
                              )
                            }
                            className={styles.selectAllCheckbox}
                            title="Selecionar todos"
                          />
                        </div>
                      ))}
                    </div>

                    {MODULES.map((module) => (
                      <div key={module.key} className={styles.moduleRow}>
                        <div
                          className={styles.moduleLabel}
                          onClick={() =>
                            handleSelectAllModule(
                              module.key,
                              !isModuleFullySelected(module.key)
                            )
                          }
                        >
                          <module.icon size={18} />
                          <span>{module.label}</span>
                          <input
                            type="checkbox"
                            checked={isModuleFullySelected(module.key)}
                            onChange={(e) =>
                              handleSelectAllModule(
                                module.key,
                                e.target.checked
                              )
                            }
                            className={styles.selectAllCheckbox}
                            title="Selecionar todas as ações"
                          />
                        </div>
                        {ACTIONS.map((action) => (
                          <div
                            key={action.key}
                            className={styles.permissionCell}
                          >
                            <input
                              type="checkbox"
                              checked={
                                permissions[module.key]?.[action.key] || false
                              }
                              onChange={(e) =>
                                handlePermissionChange(
                                  module.key,
                                  action.key,
                                  e.target.checked
                                )
                              }
                              className={styles.permissionCheckbox}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* ✅ NOVO: Resumo das permissões */}
                  <div className={styles.permissionsSummary}>
                    <h4>Resumo das Permissões</h4>
                    <div className={styles.summaryGrid}>
                      {MODULES.map((module) => {
                        const activeActions = ACTIONS.filter(
                          (action) => permissions[module.key]?.[action.key]
                        );
                        return (
                          <div key={module.key} className={styles.summaryItem}>
                            <module.icon size={16} />
                            <span className={styles.summaryModule}>
                              {module.label}:
                            </span>
                            <span className={styles.summaryActions}>
                              {activeActions.length > 0
                                ? activeActions
                                    .map((action) => action.label)
                                    .join(", ")
                                : "Nenhuma permissão"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.noSelection}>
                  <Shield size={48} />
                  <h3>Selecione um usuário</h3>
                  <p>
                    Escolha um usuário na lista para configurar suas permissões
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Modal de Feedback */}
          {modal.isOpen && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={`${styles.modalHeader} ${styles[modal.type]}`}>
                  {modal.type === "success" ? (
                    <CheckCircle size={24} />
                  ) : (
                    <AlertTriangle size={24} />
                  )}
                  <h3>{modal.title}</h3>
                  <button onClick={closeModal} className={styles.closeButton}>
                    <X size={20} />
                  </button>
                </div>
                <div className={styles.modalContent}>
                  <p>{modal.message}</p>
                </div>
                <div className={styles.modalActions}>
                  <button onClick={closeModal} className={styles.okButton}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

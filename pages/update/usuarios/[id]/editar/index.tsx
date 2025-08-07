import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { getSession } from "next-auth/react";
import type { GetServerSideProps } from "next";
import api from "../../../../../lib/axios";
import Layout from "../../../../../components/Layout";
import { MODULOS } from "../../../../../utils/permissions";
import {
  Edit3,
  Save,
  ArrowLeft,
  User,
  Mail,
  Lock,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Eye,
  EyeOff,
  X,
  Crown,
  Calendar,
  Settings,
} from "lucide-react";
import styles from "./styles.module.scss";

type Usuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  permissoes?: any;
};

type EditarUsuarioProps = {
  session: any;
};

export const getServerSideProps: GetServerSideProps<
  EditarUsuarioProps
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

  if (session.user?.role !== "admin") {
    return {
      redirect: {
        destination: "/usuarios",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session: {
        ...session,
        user: {
          ...session.user,
          image: session.user?.image || null,
        },
      },
    },
  };
};

export default function EditarUsuario({ session }: EditarUsuarioProps) {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [originalUsuario, setOriginalUsuario] = useState<Usuario | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estado para permissões
  const [permissoes, setPermissoes] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
    changePassword: false,
  });

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const response = await api.get(`/api/usuarios/${id}`);
        const usuario = response.data;

        setOriginalUsuario(usuario);
        setFormData({
          name: usuario.name,
          email: usuario.email,
          role: usuario.role,
          password: "",
          confirmPassword: "",
          changePassword: false,
        });

        // Carrega permissões existentes ou define padrões
        if (usuario.role === "user" && usuario.permissoes) {
          setPermissoes(usuario.permissoes);
        } else if (usuario.role === "user") {
          // Permissões padrão para usuários
          const permissoesPadrao: Record<string, Record<string, boolean>> = {};
          MODULOS.forEach((modulo) => {
            permissoesPadrao[modulo.id] = {};
            modulo.acoes.forEach((acao) => {
              permissoesPadrao[modulo.id][acao] = acao === "visualizar";
            });
          });
          setPermissoes(permissoesPadrao);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setErrors({ general: "Erro ao carregar dados do usuário" });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres";
    }

    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }

    if (!formData.role) {
      newErrors.role = "Selecione um tipo de usuário";
    }

    // Validações de senha apenas se estiver alterando
    if (formData.changePassword) {
      if (!formData.password) {
        newErrors.password = "Nova senha é obrigatória";
      } else if (formData.password.length < 6) {
        newErrors.password = "Senha deve ter pelo menos 6 caracteres";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirmação de senha é obrigatória";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Senhas não coincidem";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const updateData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
      };

      // Adiciona senha apenas se estiver alterando
      if (formData.changePassword) {
        updateData.password = formData.password;
      }

      // Adiciona permissões apenas para usuários comuns
      if (formData.role === "user") {
        updateData.permissoes = permissoes;
      } else {
        updateData.permissoes = null; // Admins não precisam de permissões
      }

      await api.patch(`/api/usuarios/${id}`, updateData);

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/usuarios");
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      setErrors({
        general:
          error.response?.data?.error ||
          "Erro ao atualizar usuário. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpa senha quando desabilita alteração
    if (field === "changePassword" && !value) {
      setFormData((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
        changePassword: false,
      }));
    }

    // Quando muda de admin para user, define permissões padrão
    if (
      field === "role" &&
      value === "user" &&
      Object.keys(permissoes).length === 0
    ) {
      const permissoesPadrao: Record<string, Record<string, boolean>> = {};
      MODULOS.forEach((modulo) => {
        permissoesPadrao[modulo.id] = {};
        modulo.acoes.forEach((acao) => {
          permissoesPadrao[modulo.id][acao] = acao === "visualizar";
        });
      });
      setPermissoes(permissoesPadrao);
    }

    // Remove erro do campo quando usuário começa a digitar
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const clearError = (errorKey: string) => {
    const newErrors = { ...errors };
    delete newErrors[errorKey];
    setErrors(newErrors);
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "" };
    if (password.length < 6)
      return { strength: 1, label: "Fraca", color: "#ef4444" };
    if (password.length < 8)
      return { strength: 2, label: "Média", color: "#f59e0b" };
    if (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    ) {
      return { strength: 3, label: "Forte", color: "#10b981" };
    }
    return { strength: 2, label: "Média", color: "#f59e0b" };
  };

  // Funções para gerenciar permissões
  const getPermissao = (modulo: string, acao: string): boolean => {
    return permissoes[modulo]?.[acao] || false;
  };

  const handlePermissaoChange = (
    modulo: string,
    acao: string,
    permitido: boolean
  ) => {
    setPermissoes((prev) => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        [acao]: permitido,
      },
    }));
  };

  const aplicarPreset = (tipo: "completo" | "visualizacao" | "nenhum") => {
    const novasPermissoes: Record<string, Record<string, boolean>> = {};

    MODULOS.forEach((modulo) => {
      novasPermissoes[modulo.id] = {};
      modulo.acoes.forEach((acao) => {
        if (tipo === "completo") {
          novasPermissoes[modulo.id][acao] = true;
        } else if (tipo === "visualizacao") {
          novasPermissoes[modulo.id][acao] = acao === "visualizar";
        } else {
          novasPermissoes[modulo.id][acao] = false;
        }
      });
    });

    setPermissoes(novasPermissoes);
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const isCurrentUser = originalUsuario?.id === session.user?.id;

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
            <p>Carregando dados do usuário...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <button
              onClick={() => router.back()}
              className={styles.backButton}
              disabled={submitting}
            >
              <ArrowLeft size={20} />
            </button>
            <div className={styles.headerContent}>
              <div className={styles.headerIcon}>
                <Edit3 size={24} />
              </div>
              <div>
                <h1 className={styles.title}>Editar Usuário</h1>
                <p className={styles.subtitle}>
                  Atualize as informações de {originalUsuario?.name}
                  {isCurrentUser && " (Sua conta)"}
                </p>
              </div>
            </div>
          </div>

          {/* Mensagem de sucesso */}
          {showSuccess && (
            <div className={styles.successMessage}>
              <Check size={20} />
              <span>Usuário atualizado com sucesso! Redirecionando...</span>
            </div>
          )}

          {/* Erro geral */}
          {errors.general && (
            <div className={styles.errorMessage}>
              <AlertTriangle size={20} />
              <span>{errors.general}</span>
              <button
                onClick={() => clearError("general")}
                className={styles.closeErrorButton}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formContent}>
              {/* Informações Atuais */}
              {originalUsuario && (
                <div className={styles.currentInfoSection}>
                  <div className={styles.sectionHeader}>
                    <User size={20} />
                    <h3>Informações Atuais</h3>
                  </div>

                  <div className={styles.currentUserInfo}>
                    <div className={styles.userAvatar}>
                      {originalUsuario.role === "admin" ? (
                        <Crown size={32} />
                      ) : (
                        <User size={32} />
                      )}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userMainInfo}>
                        <h4 className={styles.currentName}>
                          {originalUsuario.name}
                          {isCurrentUser && (
                            <span className={styles.youBadge}>(Você)</span>
                          )}
                        </h4>
                        <span
                          className={`${styles.currentRole} ${
                            styles[originalUsuario.role]
                          }`}
                        >
                          {originalUsuario.role === "admin"
                            ? "👑 Administrador"
                            : "👤 Usuário"}
                        </span>
                      </div>
                      <div className={styles.userMetadata}>
                        <div className={styles.metaItem}>
                          <Mail size={14} />
                          <span>{originalUsuario.email}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <Calendar size={14} />
                          <span>
                            Cadastrado em{" "}
                            {new Date(
                              originalUsuario.createdAt
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seção de Edição */}
              <div className={styles.editSection}>
                <div className={styles.sectionHeader}>
                  <Edit3 size={20} />
                  <h3>Editar Informações</h3>
                </div>

                <div className={styles.formGrid}>
                  {/* Nome */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <User size={16} />
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className={`${styles.input} ${
                        errors.name ? styles.inputError : ""
                      }`}
                      placeholder="Digite o nome completo"
                      disabled={submitting}
                    />
                    {errors.name && (
                      <span className={styles.fieldError}>{errors.name}</span>
                    )}
                  </div>

                  {/* E-mail */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <Mail size={16} />
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className={`${styles.input} ${
                        errors.email ? styles.inputError : ""
                      }`}
                      placeholder="Digite o e-mail"
                      disabled={submitting}
                    />
                    {errors.email && (
                      <span className={styles.fieldError}>{errors.email}</span>
                    )}
                  </div>
                </div>

                {/* Tipo de Usuário */}
                <div className={styles.roleSection}>
                  <div className={styles.sectionHeader}>
                    <Shield size={20} />
                    <h3>Tipo de Usuário</h3>
                  </div>

                  <div className={styles.roleSelection}>
                    <div className={styles.roleOption}>
                      <input
                        type="radio"
                        id="user"
                        name="role"
                        value="user"
                        checked={formData.role === "user"}
                        onChange={(e) =>
                          handleInputChange("role", e.target.value)
                        }
                        className={styles.roleRadio}
                        disabled={submitting}
                      />
                      <label htmlFor="user" className={styles.roleLabel}>
                        <div className={styles.roleIcon}>
                          <User size={20} />
                        </div>
                        <div className={styles.roleInfo}>
                          <span className={styles.roleName}>Usuário</span>
                          <span className={styles.roleDescription}>
                            Pode visualizar jogos, equipes e classificações
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className={styles.roleOption}>
                      <input
                        type="radio"
                        id="admin"
                        name="role"
                        value="admin"
                        checked={formData.role === "admin"}
                        onChange={(e) =>
                          handleInputChange("role", e.target.value)
                        }
                        className={styles.roleRadio}
                        disabled={submitting}
                      />
                      <label htmlFor="admin" className={styles.roleLabel}>
                        <div className={styles.roleIcon}>
                          <Shield size={20} />
                        </div>
                        <div className={styles.roleInfo}>
                          <span className={styles.roleName}>Administrador</span>
                          <span className={styles.roleDescription}>
                            Acesso completo: criar, editar e excluir dados
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {errors.role && (
                    <span className={styles.fieldError}>{errors.role}</span>
                  )}
                </div>

                {/* Seção de Permissões - só aparece para usuários comuns */}
                {formData.role === "user" && (
                  <div className={styles.permissionsSection}>
                    <div className={styles.sectionHeader}>
                      <Settings size={20} />
                      <h3>Controle de Permissões</h3>
                    </div>

                    <div className={styles.permissionsGrid}>
                      {MODULOS.map((modulo) => (
                        <div key={modulo.id} className={styles.moduloCard}>
                          <div className={styles.moduloHeader}>
                            <div className={styles.moduloIcon}>
                              <modulo.icon size={20} />
                            </div>
                            <div className={styles.moduloInfo}>
                              <h4 className={styles.moduloNome}>
                                {modulo.nome}
                              </h4>
                              <p className={styles.moduloDescricao}>
                                {modulo.descricao}
                              </p>
                            </div>
                          </div>

                          <div className={styles.acoesGrid}>
                            {modulo.acoes.map((acao) => (
                              <label key={acao} className={styles.acaoLabel}>
                                <input
                                  type="checkbox"
                                  checked={getPermissao(modulo.id, acao)}
                                  onChange={(e) =>
                                    handlePermissaoChange(
                                      modulo.id,
                                      acao,
                                      e.target.checked
                                    )
                                  }
                                  className={styles.acaoCheckbox}
                                  disabled={submitting}
                                />
                                <span className={styles.acaoTexto}>
                                  {acao.charAt(0).toUpperCase() + acao.slice(1)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botões de Preset */}
                    <div className={styles.presetsSection}>
                      <h4 className={styles.presetsTitle}>Presets Rápidos:</h4>
                      <div className={styles.presetsButtons}>
                        <button
                          type="button"
                          onClick={() => aplicarPreset("completo")}
                          className={styles.presetButton}
                          disabled={submitting}
                        >
                          <Check size={16} />
                          Acesso Completo
                        </button>
                        <button
                          type="button"
                          onClick={() => aplicarPreset("visualizacao")}
                          className={styles.presetButton}
                          disabled={submitting}
                        >
                          <Eye size={16} />
                          Apenas Visualização
                        </button>
                        <button
                          type="button"
                          onClick={() => aplicarPreset("nenhum")}
                          className={styles.presetButton}
                          disabled={submitting}
                        >
                          <X size={16} />
                          Nenhum Acesso
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alteração de Senha */}
                <div className={styles.passwordSection}>
                  <div className={styles.sectionHeader}>
                    <Lock size={20} />
                    <h3>Segurança</h3>
                  </div>

                  <div className={styles.passwordToggle}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.changePassword}
                        onChange={(e) =>
                          handleInputChange("changePassword", e.target.checked)
                        }
                        className={styles.checkbox}
                        disabled={submitting}
                      />
                      <span className={styles.checkboxText}>Alterar senha</span>
                    </label>
                  </div>

                  {formData.changePassword && (
                    <div className={styles.passwordFields}>
                      <div className={styles.formGrid}>
                        {/* Nova Senha */}
                        <div className={styles.fieldGroup}>
                          <label className={styles.label}>
                            <Lock size={16} />
                            Nova Senha
                          </label>
                          <div className={styles.passwordWrapper}>
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) =>
                                handleInputChange("password", e.target.value)
                              }
                              className={`${styles.input} ${
                                errors.password ? styles.inputError : ""
                              }`}
                              placeholder="Digite a nova senha"
                              disabled={submitting}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className={styles.passwordToggleBtn}
                              disabled={submitting}
                            >
                              {showPassword ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                          {formData.password && (
                            <div className={styles.passwordStrength}>
                              <div className={styles.strengthBar}>
                                <div
                                  className={styles.strengthFill}
                                  style={{
                                    width: `${
                                      (passwordStrength.strength / 3) * 100
                                    }%`,
                                    backgroundColor: passwordStrength.color,
                                  }}
                                />
                              </div>
                              <span
                                className={styles.strengthLabel}
                                style={{ color: passwordStrength.color }}
                              >
                                {passwordStrength.label}
                              </span>
                            </div>
                          )}
                          {errors.password && (
                            <span className={styles.fieldError}>
                              {errors.password}
                            </span>
                          )}
                        </div>

                        {/* Confirmar Nova Senha */}
                        <div className={styles.fieldGroup}>
                          <label className={styles.label}>
                            <Lock size={16} />
                            Confirmar Nova Senha
                          </label>
                          <div className={styles.passwordWrapper}>
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={formData.confirmPassword}
                              onChange={(e) =>
                                handleInputChange(
                                  "confirmPassword",
                                  e.target.value
                                )
                              }
                              className={`${styles.input} ${
                                errors.confirmPassword ? styles.inputError : ""
                              }`}
                              placeholder="Confirme a nova senha"
                              disabled={submitting}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className={styles.passwordToggleBtn}
                              disabled={submitting}
                            >
                              {showConfirmPassword ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                          {errors.confirmPassword && (
                            <span className={styles.fieldError}>
                              {errors.confirmPassword}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview das Alterações */}
                {(formData.name !== originalUsuario?.name ||
                  formData.email !== originalUsuario?.email ||
                  formData.role !== originalUsuario?.role ||
                  formData.changePassword) && (
                  <div className={styles.previewSection}>
                    <div className={styles.sectionHeader}>
                      <Check size={20} />
                      <h3>Preview das Alterações</h3>
                    </div>
                    <div className={styles.changesPreview}>
                      {formData.name !== originalUsuario?.name && (
                        <div className={styles.changeItem}>
                          <span className={styles.changeLabel}>Nome:</span>
                          <span className={styles.changeValue}>
                            {originalUsuario?.name} → {formData.name}
                          </span>
                        </div>
                      )}
                      {formData.email !== originalUsuario?.email && (
                        <div className={styles.changeItem}>
                          <span className={styles.changeLabel}>E-mail:</span>
                          <span className={styles.changeValue}>
                            {originalUsuario?.email} → {formData.email}
                          </span>
                        </div>
                      )}
                      {formData.role !== originalUsuario?.role && (
                        <div className={styles.changeItem}>
                          <span className={styles.changeLabel}>Tipo:</span>
                          <span className={styles.changeValue}>
                            {originalUsuario?.role === "admin"
                              ? "Administrador"
                              : "Usuário"}{" "}
                            →
                            {formData.role === "admin"
                              ? "Administrador"
                              : "Usuário"}
                          </span>
                        </div>
                      )}
                      {formData.changePassword && (
                        <div className={styles.changeItem}>
                          <span className={styles.changeLabel}>Senha:</span>
                          <span className={styles.changeValue}>
                            Será alterada
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => router.back()}
                className={styles.cancelButton}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || !formData.name || !formData.email}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

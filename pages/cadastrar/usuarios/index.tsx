import { useState, FormEvent, useEffect } from "react";
import { getSession } from "next-auth/react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import api from "../../../lib/axios";
import Layout from "../../../components/Layout";
import {
  UserPlus,
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
} from "lucide-react";
import styles from "./styles.module.scss";

type Cliente = {
  id: string;
  name: string;
  slug: string;
};

type CadastrarUsuarioProps = {
  session: any;
};

export const getServerSideProps: GetServerSideProps<
  CadastrarUsuarioProps
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

  // ✅ CORRIGIDO: Permitir SUPER_ADMIN e usuários com clientId
  const isSuperAdmin =
    session.user?.role === "admin" &&
    (!session.user?.clientId ||
      session.user?.clientId === "undefined" ||
      session.user?.clientId === "null");
  const hasClientId =
    session.user?.clientId &&
    session.user?.clientId !== "null" &&
    session.user?.clientId !== "undefined";

  if (!isSuperAdmin && !hasClientId) {
    return {
      redirect: {
        destination: "/",
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

export default function CadastrarUsuario({ session }: CadastrarUsuarioProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // ✅ NOVO: Verificar se é Super Admin
  const isSuperAdmin =
    session.user?.role === "admin" &&
    (!session.user?.clientId ||
      session.user?.clientId === "undefined" ||
      session.user?.clientId === "null");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    clientId: isSuperAdmin ? "" : session.user?.clientId || "", // ✅ NOVO
  });

  // ✅ NOVO: Carregar lista de clientes ao montar o componente (apenas para Super Admin)
  useEffect(() => {
    if (isSuperAdmin) {
      carregarClientes();
    }
  }, [isSuperAdmin]);

  const carregarClientes = async () => {
    setLoadingClientes(true);
    try {
      const response = await api.get("/api/clients");
      setClientes(
        response.data.map((cliente: any) => ({
          id: cliente.id,
          name: cliente.name,
          slug: cliente.slug,
        }))
      );
    } catch (error: any) {
      console.error("Erro ao carregar clientes:", error);
      setErrors({
        general: "Erro ao carregar lista de clientes",
      });
    } finally {
      setLoadingClientes(false);
    }
  };

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

    if (!formData.password) {
      newErrors.password = "Senha é obrigatória";
    } else if (formData.password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem";
    }

    if (!formData.role) {
      newErrors.role = "Selecione um tipo de usuário";
    }

    // ✅ NOVO: Validar clientId para Super Admin
    if (isSuperAdmin && !formData.clientId) {
      newErrors.clientId = "Selecione um cliente";
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
      // ✅ CORRIGIDO: Usar API correta
      await api.post("/api/usuarios", {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        clientId: isSuperAdmin ? formData.clientId : session.user?.clientId, // ✅ NOVO
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/usuarios");
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao cadastrar usuário:", error);
      setErrors({
        general:
          error.response?.data?.error ||
          "Erro ao cadastrar usuário. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Remove erro do campo quando usuário começa a digitar
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }

    // Remove erro geral também
    if (errors.general) {
      const newErrors = { ...errors };
      delete newErrors.general;
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

  const passwordStrength = getPasswordStrength(formData.password);

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
                <UserPlus size={24} />
              </div>
              <div>
                <h1 className={styles.title}>Cadastrar Novo Usuário</h1>
                <p className={styles.subtitle}>
                  {isSuperAdmin
                    ? "Crie uma conta e escolha o cliente"
                    : "Crie uma conta para seu cliente"}
                </p>
              </div>
            </div>
          </div>

          {/* Mensagem de sucesso */}
          {showSuccess && (
            <div className={styles.successMessage}>
              <Check size={20} />
              <span>Usuário cadastrado com sucesso! Redirecionando...</span>
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
              {/* ✅ ATUALIZADO: Seleção de Cliente com dados dinâmicos */}
              {isSuperAdmin && (
                <div className={styles.clientSection}>
                  <div className={styles.sectionHeader}>
                    <Shield size={20} />
                    <h3>Cliente</h3>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <User size={16} />
                      Selecionar Cliente
                    </label>
                    <select
                      value={formData.clientId}
                      onChange={(e) =>
                        handleInputChange("clientId", e.target.value)
                      }
                      className={`${styles.input} ${
                        errors.clientId ? styles.inputError : ""
                      }`}
                      disabled={submitting || loadingClientes}
                    >
                      <option value="">
                        {loadingClientes
                          ? "Carregando clientes..."
                          : "Selecione um cliente..."}
                      </option>
                      {/* ✅ NOVO: Lista dinâmica de clientes do banco */}
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.name}
                        </option>
                      ))}
                    </select>
                    {errors.clientId && (
                      <span className={styles.fieldError}>
                        {errors.clientId}
                      </span>
                    )}
                    {loadingClientes && (
                      <div className={styles.loadingClientes}>
                        <Loader2 size={16} className={styles.spinner} />
                        <span>Carregando clientes...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informações Pessoais */}
              <div className={styles.personalSection}>
                <div className={styles.sectionHeader}>
                  <User size={20} />
                  <h3>Informações Pessoais</h3>
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
                      autoComplete="name"
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
                      autoComplete="email"
                    />
                    {errors.email && (
                      <span className={styles.fieldError}>{errors.email}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Segurança */}
              <div className={styles.securitySection}>
                <div className={styles.sectionHeader}>
                  <Lock size={20} />
                  <h3>Segurança</h3>
                </div>

                <div className={styles.formGrid}>
                  {/* Senha */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <Lock size={16} />
                      Senha
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
                        placeholder="Digite a senha"
                        disabled={submitting}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.passwordToggle}
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

                  {/* Confirmar Senha */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <Lock size={16} />
                      Confirmar Senha
                    </label>
                    <div className={styles.passwordWrapper}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.confirmPassword ? styles.inputError : ""
                        }`}
                        placeholder="Confirme a senha"
                        disabled={submitting}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className={styles.passwordToggle}
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

              {/* Permissões */}
              <div className={styles.permissionsSection}>
                <div className={styles.sectionHeader}>
                  <Shield size={20} />
                  <h3>Permissões</h3>
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

              {/* Preview do Usuário */}
              {formData.name && formData.email && (
                <div className={styles.previewSection}>
                  <div className={styles.sectionHeader}>
                    <UserPlus size={20} />
                    <h3>Preview do Usuário</h3>
                  </div>
                  <div className={styles.userPreview}>
                    <div className={styles.previewAvatar}>
                      <User size={32} />
                    </div>
                    <div className={styles.previewInfo}>
                      <span className={styles.previewName}>
                        {formData.name}
                      </span>
                      <span className={styles.previewEmail}>
                        {formData.email}
                      </span>
                      <span className={styles.previewRole}>
                        {formData.role === "admin"
                          ? "👑 Administrador"
                          : "👤 Usuário"}
                      </span>
                      {/* ✅ ATUALIZADO: Mostrar nome do cliente selecionado */}
                      {isSuperAdmin && formData.clientId && (
                        <span className={styles.previewClient}>
                          🏢 Cliente:{" "}
                          {clientes.find((c) => c.id === formData.clientId)
                            ?.name || "Selecionado"}
                        </span>
                      )}
                      {!isSuperAdmin && (
                        <span className={styles.previewClient}>
                          🏢 Cliente: {session.user?.clientName || "Atual"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                disabled={
                  submitting ||
                  loadingClientes ||
                  !formData.name ||
                  !formData.email ||
                  !formData.password ||
                  (isSuperAdmin && !formData.clientId)
                }
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Cadastrar Usuário
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

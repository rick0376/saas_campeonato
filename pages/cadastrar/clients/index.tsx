import { useState, useEffect, FormEvent } from "react";
import { getSession } from "next-auth/react";
import type { GetServerSideProps } from "next";
import axios from "axios";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { ProtectedComponent } from "../../../components/ProtectedComponent";
import { uploadClienteLogo } from "../../../utils/cloudinary-upload";
import {
  Building2,
  Plus,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Globe,
  AlertTriangle,
  Check,
  Loader2,
  Save,
  Calendar,
  Users,
  Settings,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import styles from "./styles.module.scss";

type CadastrarClienteProps = {
  session: any;
};

export const getServerSideProps: GetServerSideProps<
  CadastrarClienteProps
> = async (ctx) => {
  const session = await getSession(ctx);
  if (!session) {
    return {
      redirect: {
        destination: "/auth/login?admin=true",
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

export default function CadastrarCliente({ session }: CadastrarClienteProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    domain: "",
    validDays: "",
    maxUsers: "10",
    maxTeams: "20",
    status: "ACTIVE",
    logo: null as File | null,
    previewUrl: "",
    adminEmail: "",
    adminName: "",
    adminPassword: "",
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome do cliente é obrigatório";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres";
    }

    if (!formData.slug.trim()) {
      newErrors.slug = "Slug é obrigatório";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug =
        "Slug deve conter apenas letras minúsculas, números e hífens";
    }

    if (
      formData.domain &&
      !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.domain)
    ) {
      newErrors.domain = "Formato de domínio inválido";
    }

    if (
      formData.validDays &&
      (isNaN(Number(formData.validDays)) || Number(formData.validDays) < 1)
    ) {
      newErrors.validDays = "Dias de validade deve ser um número maior que 0";
    }

    if (isNaN(Number(formData.maxUsers)) || Number(formData.maxUsers) < 1) {
      newErrors.maxUsers = "Limite de usuários deve ser um número maior que 0";
    }

    if (isNaN(Number(formData.maxTeams)) || Number(formData.maxTeams) < 1) {
      newErrors.maxTeams = "Limite de equipes deve ser um número maior que 0";
    }

    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = "Email do administrador é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = "Email inválido";
    }

    if (!formData.adminName.trim()) {
      newErrors.adminName = "Nome do administrador é obrigatório";
    } else if (formData.adminName.trim().length < 2) {
      newErrors.adminName = "Nome deve ter pelo menos 2 caracteres";
    }

    if (!formData.adminPassword.trim()) {
      newErrors.adminPassword = "Senha é obrigatória";
    } else if (formData.adminPassword.length < 6) {
      newErrors.adminPassword = "Senha deve ter pelo menos 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validação inicial do formulário
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      let logoUrl: string | null = null;
      let logoPublicId: string | null = null;

      // Upload da imagem do cliente, se houver
      if (formData.logo) {
        setUploadingImage(true);
        try {
          const uploadResult = await uploadClienteLogo(
            formData.logo,
            formData.slug
          );
          logoUrl = uploadResult.url;
          logoPublicId = uploadResult.publicId;
        } catch (uploadError) {
          setErrors({ general: "Falha ao enviar o logo. Tente novamente." });
          setUploadingImage(false);
          setSubmitting(false);
          return;
        }
        setUploadingImage(false);
      }

      // Criação do cliente e admin
      const response = await axios.post("/api/clients", {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        domain: formData.domain.trim() || null,
        validDays: formData.validDays ? Number(formData.validDays) : null,
        maxUsers: Number(formData.maxUsers),
        maxTeams: Number(formData.maxTeams),
        status: formData.status,
        logo: logoUrl,
        logoPublicId: logoPublicId,
        adminEmail: formData.adminEmail.trim(),
        adminName: formData.adminName.trim(),
        adminPassword: formData.adminPassword,
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/admin/clients");
      }, 1500);
    } catch (error: any) {
      let errorMessage = "Erro ao cadastrar cliente. Tente novamente.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      // Apenas seta o estado - não lança erro!
      setErrors({ general: errorMessage });
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, logo: "Arquivo muito grande. Máximo 10MB." });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors({
        ...errors,
        logo: "Por favor, selecione apenas arquivos de imagem.",
      });
      return;
    }

    const newErrors = { ...errors };
    delete newErrors.logo;
    setErrors(newErrors);

    setFormData((prev) => ({
      ...prev,
      logo: file,
      previewUrl: URL.createObjectURL(file),
    }));
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      logo: null,
      previewUrl: "",
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "name") {
      const newSlug = generateSlug(value);
      setFormData((prev) => ({ ...prev, slug: newSlug }));
    }

    if (field === "slug" || field === "name") {
      const currentSlug = field === "slug" ? value : generateSlug(value);
      if (currentSlug && !formData.adminEmail) {
        const autoEmail = `admin@${currentSlug.replace(/[^a-z0-9]/g, "")}.com`;
        setFormData((prev) => ({ ...prev, adminEmail: autoEmail }));
      }
    }

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

  const calculateExpirationDate = () => {
    if (!formData.validDays) return null;
    const days = Number(formData.validDays);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <ProtectedComponent module="clientes" action="criar">
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
                  <Plus size={24} />
                </div>
                <div>
                  <h1 className={styles.title}>Cadastrar Novo Cliente</h1>
                  <p className={styles.subtitle}>
                    Adicione um novo cliente e crie o administrador inicial
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ Indicador de Organização */}
            {formData.slug && (
              <div className={styles.organizationInfo}>
                <div className={styles.folderIndicator}>
                  <ImageIcon size={16} />
                  <span>
                    📁 Logo será salvo em:{" "}
                    <code>lhpsystems/clientes/{formData.slug}/logo</code>
                  </span>
                </div>
              </div>
            )}

            {/* Mensagem de sucesso */}
            {showSuccess && (
              <div className={styles.successMessage}>
                <Check size={20} />
                <span>
                  Cliente e administrador criados com sucesso! Redirecionando...
                </span>
              </div>
            )}

            {/* Erro geral */}
            {errors.general && (
              <div
                className={styles.errorModalOverlay}
                onClick={() => clearError("general")}
                role="dialog"
                aria-modal="true"
                aria-labelledby="error-modal-title"
              >
                <div
                  className={styles.errorModal}
                  onClick={(e) => e.stopPropagation()}
                  tabIndex={-1}
                >
                  <div className={styles.errorModalHeader}>
                    <AlertTriangle size={24} aria-hidden="true" />
                    <h3 id="error-modal-title">Erro</h3>
                    <button
                      className={styles.errorModalClose}
                      aria-label="Fechar modal"
                      onClick={() => clearError("general")}
                      type="button"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className={styles.errorModalContent}>
                    <p>{errors.general}</p>
                  </div>
                  <div className={styles.errorModalActions}>
                    <button
                      onClick={() => clearError("general")}
                      className={styles.errorModalButton}
                      type="button"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Formulário - mantendo toda a estrutura original */}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formContent}>
                {/* Seção de Informações Básicas */}
                <div className={styles.basicInfoSection}>
                  <div className={styles.sectionHeader}>
                    <Building2 size={20} />
                    <h3>Informações Básicas</h3>
                  </div>

                  <div className={styles.formGrid}>
                    {/* Nome do Cliente */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Building2 size={16} />
                        Nome do Cliente
                      </label>
                      <div className={styles.nameWithPreview}>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          className={`${styles.input} ${
                            errors.name ? styles.inputError : ""
                          }`}
                          placeholder="Digite o nome do cliente"
                          disabled={submitting}
                          autoComplete="off"
                        />
                        <div className={styles.miniPreview}>
                          <img
                            src={formData.previewUrl || "/imagens/logo.png"}
                            alt="Preview do logo"
                            className={styles.miniPreviewImage}
                          />
                        </div>
                      </div>
                      {errors.name && (
                        <span className={styles.fieldError}>{errors.name}</span>
                      )}
                    </div>

                    {/* Slug */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Globe size={16} />
                        Slug (Identificador único)
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) =>
                          handleInputChange("slug", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.slug ? styles.inputError : ""
                        }`}
                        placeholder="cliente-exemplo"
                        disabled={submitting}
                        autoComplete="off"
                      />
                      {errors.slug && (
                        <span className={styles.fieldError}>{errors.slug}</span>
                      )}
                      <p className={styles.fieldHint}>
                        Usado para identificar o cliente no sistema
                      </p>
                    </div>

                    {/* Descrição */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Settings size={16} />
                        Descrição (Opcional)
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        className={styles.textarea}
                        placeholder="Descrição do cliente ou campeonato"
                        disabled={submitting}
                        rows={3}
                      />
                    </div>

                    {/* Domínio */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Globe size={16} />
                        Domínio (Opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.domain}
                        onChange={(e) =>
                          handleInputChange("domain", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.domain ? styles.inputError : ""
                        }`}
                        placeholder="exemplo.com"
                        disabled={submitting}
                        autoComplete="off"
                      />
                      {errors.domain && (
                        <span className={styles.fieldError}>
                          {errors.domain}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seção de Configurações */}
                <div className={styles.configSection}>
                  <div className={styles.sectionHeader}>
                    <Settings size={20} />
                    <h3>Configurações do Cliente</h3>
                  </div>

                  <div className={styles.formGrid}>
                    {/* Dias de Validade */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Calendar size={16} />
                        Dias de Validade (Opcional)
                      </label>
                      <input
                        type="number"
                        value={formData.validDays}
                        onChange={(e) =>
                          handleInputChange("validDays", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.validDays ? styles.inputError : ""
                        }`}
                        placeholder="30"
                        disabled={submitting}
                        min="1"
                      />
                      {errors.validDays && (
                        <span className={styles.fieldError}>
                          {errors.validDays}
                        </span>
                      )}
                      {formData.validDays && (
                        <p className={styles.fieldHint}>
                          Expira em: {calculateExpirationDate()}
                        </p>
                      )}
                    </div>

                    {/* Limite de Usuários */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Users size={16} />
                        Limite de Usuários
                      </label>
                      <input
                        type="number"
                        value={formData.maxUsers}
                        onChange={(e) =>
                          handleInputChange("maxUsers", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.maxUsers ? styles.inputError : ""
                        }`}
                        disabled={submitting}
                        min="1"
                      />
                      {errors.maxUsers && (
                        <span className={styles.fieldError}>
                          {errors.maxUsers}
                        </span>
                      )}
                    </div>

                    {/* Limite de Equipes */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Building2 size={16} />
                        Limite de Equipes
                      </label>
                      <input
                        type="number"
                        value={formData.maxTeams}
                        onChange={(e) =>
                          handleInputChange("maxTeams", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.maxTeams ? styles.inputError : ""
                        }`}
                        disabled={submitting}
                        min="1"
                      />
                      {errors.maxTeams && (
                        <span className={styles.fieldError}>
                          {errors.maxTeams}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Settings size={16} />
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          handleInputChange("status", e.target.value)
                        }
                        className={styles.select}
                        disabled={submitting}
                      >
                        <option value="ACTIVE">Ativo</option>
                        <option value="INACTIVE">Inativo</option>
                        <option value="TRIAL">Trial</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção de Credenciais do Administrador */}
                <div className={styles.credentialsSection}>
                  <div className={styles.sectionHeader}>
                    <User size={20} />
                    <h3>Administrador Inicial</h3>
                    <span className={styles.sectionBadge}>Obrigatório</span>
                  </div>
                  <p className={styles.sectionDescription}>
                    Crie as credenciais de acesso para o primeiro administrador
                    do cliente
                  </p>

                  <div className={styles.formGrid}>
                    {/* Nome do Administrador */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <User size={16} />
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={formData.adminName}
                        onChange={(e) =>
                          handleInputChange("adminName", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.adminName ? styles.inputError : ""
                        }`}
                        placeholder="Nome do administrador"
                        disabled={submitting}
                        autoComplete="name"
                      />
                      {errors.adminName && (
                        <span className={styles.fieldError}>
                          {errors.adminName}
                        </span>
                      )}
                    </div>

                    {/* Email do Administrador */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Mail size={16} />
                        Email de Acesso
                      </label>
                      <input
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) =>
                          handleInputChange("adminEmail", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.adminEmail ? styles.inputError : ""
                        }`}
                        placeholder="admin@cliente.com"
                        disabled={submitting}
                        autoComplete="email"
                      />
                      {errors.adminEmail && (
                        <span className={styles.fieldError}>
                          {errors.adminEmail}
                        </span>
                      )}
                      <p className={styles.fieldHint}>
                        Este será o email de login do administrador
                      </p>
                    </div>

                    {/* Senha do Administrador */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Lock size={16} />
                        Senha Inicial
                      </label>
                      <div className={styles.passwordWrapper}>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.adminPassword}
                          onChange={(e) =>
                            handleInputChange("adminPassword", e.target.value)
                          }
                          className={`${styles.input} ${
                            errors.adminPassword ? styles.inputError : ""
                          }`}
                          placeholder="Senha com pelo menos 6 caracteres"
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
                      {errors.adminPassword && (
                        <span className={styles.fieldError}>
                          {errors.adminPassword}
                        </span>
                      )}
                      <p className={styles.fieldHint}>
                        O administrador poderá alterar a senha após o primeiro
                        login
                      </p>
                    </div>
                  </div>

                  {/* Preview das Credenciais */}
                  {formData.adminEmail && formData.adminName && (
                    <div className={styles.credentialsPreview}>
                      <div className={styles.previewHeader}>
                        <Check size={16} />
                        <span>Credenciais de Acesso</span>
                      </div>
                      <div className={styles.credentialsList}>
                        <div className={styles.credentialItem}>
                          <Mail size={14} />
                          <span>Email: {formData.adminEmail}</span>
                        </div>
                        <div className={styles.credentialItem}>
                          <User size={14} />
                          <span>Nome: {formData.adminName}</span>
                        </div>
                        <div className={styles.credentialItem}>
                          <Lock size={14} />
                          <span>
                            Senha: {"*".repeat(formData.adminPassword.length)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Seção de Upload de Logo */}
                <div className={styles.imageSection}>
                  <div className={styles.sectionHeader}>
                    <ImageIcon size={20} />
                    <h3>Logo do Cliente</h3>
                  </div>

                  <div className={styles.imageUploadContainer}>
                    {formData.previewUrl ? (
                      <div className={styles.imagePreview}>
                        <img
                          src={formData.previewUrl}
                          alt="Preview do logo"
                          className={styles.previewImage}
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className={styles.removeImageButton}
                          disabled={submitting}
                          title="Remover imagem"
                        >
                          <X size={16} />
                        </button>
                        {/* ✅ Overlay de upload organizado */}
                        {uploadingImage && (
                          <div className={styles.uploadOverlay}>
                            <Loader2 size={24} className={styles.spinner} />
                            <span>Organizando em pasta...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.emptyImagePreview}>
                        <ImageIcon size={32} />
                        <span>Nenhum logo selecionado</span>
                      </div>
                    )}

                    <div className={styles.uploadArea}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className={styles.fileInput}
                        id="logo-upload"
                        disabled={submitting || uploadingImage}
                      />
                      <label
                        htmlFor="logo-upload"
                        className={styles.uploadButton}
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 size={16} className={styles.spinner} />
                            Organizando...
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            Escolher Arquivo
                          </>
                        )}
                      </label>
                      <p className={styles.uploadHint}>
                        PNG, JPG ou GIF até 10MB
                        {formData.slug && (
                          <small>
                            📁 Será salvo em: clientes/{formData.slug}/
                          </small>
                        )}
                      </p>
                    </div>
                  </div>

                  {errors.logo && (
                    <span className={styles.fieldError}>{errors.logo}</span>
                  )}
                </div>

                {/* Preview do Cliente */}
                {formData.name && (
                  <div className={styles.previewSection}>
                    <div className={styles.sectionHeader}>
                      <Check size={20} />
                      <h3>Preview Final</h3>
                    </div>
                    <div className={styles.clientPreview}>
                      <div className={styles.previewCard}>
                        <div className={styles.previewClientLogo}>
                          <img
                            src={formData.previewUrl || "/imagens/logo.png"}
                            alt="Logo do cliente"
                            className={styles.previewClientImage}
                          />
                        </div>
                        <div className={styles.previewClientInfo}>
                          <h4 className={styles.previewClientName}>
                            {formData.name}
                          </h4>
                          <span className={styles.previewClientSlug}>
                            @{formData.slug}
                          </span>
                          <span className={styles.previewClientStatus}>
                            Status:{" "}
                            {formData.status === "ACTIVE"
                              ? "Ativo"
                              : formData.status === "INACTIVE"
                              ? "Inativo"
                              : "Trial"}
                          </span>
                          {formData.description && (
                            <p className={styles.previewClientDescription}>
                              {formData.description}
                            </p>
                          )}
                          {formData.adminEmail && (
                            <div className={styles.previewAdmin}>
                              <strong>Administrador:</strong>{" "}
                              {formData.adminName} ({formData.adminEmail})
                            </div>
                          )}
                        </div>
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
                    uploadingImage ||
                    !formData.name.trim() ||
                    !formData.slug.trim() ||
                    !formData.adminEmail.trim() ||
                    !formData.adminName.trim() ||
                    !formData.adminPassword.trim()
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Criando Cliente e Admin...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Criar Cliente e Administrador
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Layout>
    </ProtectedComponent>
  );
}

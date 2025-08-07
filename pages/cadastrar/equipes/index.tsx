import { useState, useEffect, FormEvent } from "react";
import { getToken } from "next-auth/jwt";
import type { GetServerSideProps } from "next";
import axios from "axios";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { RouteGuard } from "../../../components/RouteGuard";
import { uploadEquipeEscudo } from "../../../utils/cloudinary-upload";
import {
  Users,
  Plus,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Save,
} from "lucide-react";
import styles from "./styles.module.scss";

type Grupo = {
  id: number;
  nome: string;
};

type CadastrarEquipeProps = {
  session: any;
};

export const getServerSideProps: GetServerSideProps<
  CadastrarEquipeProps
> = async (context) => {
  const token = await getToken({ req: context.req });

  if (!token) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  const isSuperAdmin =
    token.role === "admin" &&
    (!token.clientId ||
      token.clientId === "undefined" ||
      token.clientId === "null");

  if (isSuperAdmin) {
    return {
      redirect: {
        destination: "/admin/clients?message=select-client-to-create-teams",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session: {
        user: {
          id: token.sub,
          email: token.email,
          role: token.role,
          clientId: token.clientId,
        },
      },
    },
  };
};

export default function CadastrarEquipe({ session }: CadastrarEquipeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nome: "",
    grupoId: "",
    escudo: null as File | null,
    previewUrl: "",
  });

  useEffect(() => {
    const loadGrupos = async () => {
      try {
        const response = await axios.get("/api/grupos");
        setGrupos(response.data);
      } catch (error) {
        console.error("Erro ao carregar grupos:", error);
        setErrors({ general: "Erro ao carregar grupos disponíveis" });
      } finally {
        setLoading(false);
      }
    };

    loadGrupos();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome da equipe é obrigatório";
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = "Nome deve ter pelo menos 2 caracteres";
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
      let urlEscudo: string | null = null;
      let publicId: string | null = null;

      // ✅ CORREÇÃO: Upload organizado
      if (formData.escudo) {
        setUploadingImage(true);
        console.log("📤 Iniciando upload organizado do escudo...");

        const clientId = session?.user?.clientId || "sistema";
        console.log(`📁 Salvando em: lhpsystems/equipes/${clientId}/`);

        const uploadResult = await uploadEquipeEscudo(
          formData.escudo,
          clientId
        );

        urlEscudo = uploadResult.url;
        publicId = uploadResult.publicId;

        console.log("✅ Escudo salvo em pasta organizada:", {
          pasta: uploadResult.folder,
          url: urlEscudo,
          publicId: publicId,
        });
        setUploadingImage(false);
      }

      // ✅ CORREÇÃO: Enviar public_id (nome correto do campo)
      const response = await axios.post("/api/equipes", {
        nome: formData.nome.trim(),
        grupoId: formData.grupoId === "" ? null : Number(formData.grupoId),
        escudoUrl: urlEscudo,
        public_id: publicId, // ✅ CORREÇÃO: Campo correto
      });

      console.log("✅ Equipe cadastrada com sucesso:", response.data);

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/equipes");
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao cadastrar equipe:", error);
      setErrors({
        general:
          error.response?.data?.error ||
          "Erro ao cadastrar equipe. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, escudo: "Arquivo muito grande. Máximo 10MB." });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors({
        ...errors,
        escudo: "Por favor, selecione apenas arquivos de imagem.",
      });
      return;
    }

    const newErrors = { ...errors };
    delete newErrors.escudo;
    setErrors(newErrors);

    setFormData((prev) => ({
      ...prev,
      escudo: file,
      previewUrl: URL.createObjectURL(file),
    }));
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      escudo: null,
      previewUrl: "",
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

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

  return (
    <RouteGuard module="equipes" action="criar">
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
                  <h1 className={styles.title}>Cadastrar Nova Equipe</h1>
                  <p className={styles.subtitle}>
                    Adicione uma nova equipe ao campeonato
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ INDICADOR DE ORGANIZAÇÃO */}
            {session?.user?.clientId && (
              <div className={styles.organizationInfo}>
                <div className={styles.folderIndicator}>
                  <ImageIcon size={16} />
                  <span>
                    📁 Escudo será salvo em:{" "}
                    <code>
                      lhpsystems/equipes/{session.user.clientId}
                      /escudo_timestamp
                    </code>
                  </span>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className={styles.loadingState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Carregando grupos disponíveis...</p>
              </div>
            )}

            {/* Mensagem de sucesso */}
            {showSuccess && (
              <div className={styles.successMessage}>
                <Check size={20} />
                <span>Equipe cadastrada com sucesso! Redirecionando...</span>
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
            {!loading && (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formContent}>
                  {/* Seção de Informações Básicas */}
                  <div className={styles.basicInfoSection}>
                    <div className={styles.sectionHeader}>
                      <Users size={20} />
                      <h3>Informações Básicas</h3>
                    </div>

                    <div className={styles.formGrid}>
                      {/* Nome da Equipe */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                          <Users size={16} />
                          Nome da Equipe
                        </label>
                        <div className={styles.nameWithPreview}>
                          <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) =>
                              handleInputChange("nome", e.target.value)
                            }
                            className={`${styles.input} ${
                              errors.nome ? styles.inputError : ""
                            }`}
                            placeholder="Digite o nome da equipe"
                            disabled={submitting}
                            autoComplete="off"
                          />
                          <div className={styles.miniPreview}>
                            <img
                              src={formData.previewUrl || "/imagens/escudo.png"}
                              alt="Preview do escudo"
                              className={styles.miniPreviewImage}
                            />
                          </div>
                        </div>
                        {errors.nome && (
                          <span className={styles.fieldError}>
                            {errors.nome}
                          </span>
                        )}
                      </div>

                      {/* Grupo */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                          <Shield size={16} />
                          Grupo (Opcional)
                        </label>
                        <select
                          value={formData.grupoId}
                          onChange={(e) =>
                            handleInputChange("grupoId", e.target.value)
                          }
                          className={styles.select}
                          disabled={submitting}
                        >
                          <option value="">— Sem grupo —</option>
                          {grupos.map((grupo) => (
                            <option key={grupo.id} value={grupo.id}>
                              Grupo {grupo.nome}
                            </option>
                          ))}
                        </select>
                        {grupos.length === 0 && (
                          <p className={styles.noGroupsHint}>
                            Nenhum grupo disponível. Você pode criar grupos
                            primeiro ou deixar a equipe sem grupo.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Seção de Upload de Escudo */}
                  <div className={styles.imageSection}>
                    <div className={styles.sectionHeader}>
                      <ImageIcon size={20} />
                      <h3>Escudo da Equipe</h3>
                    </div>

                    <div className={styles.imageUploadContainer}>
                      {formData.previewUrl ? (
                        <div className={styles.imagePreview}>
                          <img
                            src={formData.previewUrl}
                            alt="Preview do escudo"
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
                          {/* ✅ OVERLAY DE UPLOAD */}
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
                          <span>Nenhum escudo selecionado</span>
                        </div>
                      )}

                      <div className={styles.uploadArea}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className={styles.fileInput}
                          id="escudo-upload"
                          disabled={submitting || uploadingImage}
                        />
                        <label
                          htmlFor="escudo-upload"
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
                          {session?.user?.clientId && (
                            <small>
                              <br />
                              📁 Será salvo em: lhpsystems/equipes/
                              {session.user.clientId}/
                            </small>
                          )}
                        </p>
                      </div>
                    </div>

                    {errors.escudo && (
                      <span className={styles.fieldError}>{errors.escudo}</span>
                    )}
                  </div>

                  {/* Preview da Equipe */}
                  {formData.nome && (
                    <div className={styles.previewSection}>
                      <div className={styles.sectionHeader}>
                        <Check size={20} />
                        <h3>Preview da Equipe</h3>
                      </div>
                      <div className={styles.teamPreview}>
                        <div className={styles.previewCard}>
                          <div className={styles.previewTeamLogo}>
                            <img
                              src={formData.previewUrl || "/imagens/escudo.png"}
                              alt="Escudo da equipe"
                              className={styles.previewTeamImage}
                            />
                          </div>
                          <div className={styles.previewTeamInfo}>
                            <h4 className={styles.previewTeamName}>
                              {formData.nome}
                            </h4>
                            <span className={styles.previewTeamGroup}>
                              {formData.grupoId
                                ? `Grupo ${
                                    grupos.find(
                                      (g) => g.id === Number(formData.grupoId)
                                    )?.nome
                                  }`
                                : "Sem grupo"}
                            </span>
                            {/* ✅ INFORMAÇÃO DE ARMAZENAMENTO */}
                            {session?.user?.clientId && (
                              <small className={styles.previewStoragePath}>
                                📁 Pasta: lhpsystems/equipes/
                                {session.user.clientId}/
                              </small>
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
                      submitting || uploadingImage || !formData.nome.trim()
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
                        Cadastrar Equipe
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Layout>
    </RouteGuard>
  );
}

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { getToken } from "next-auth/jwt";
import type { GetServerSideProps } from "next";
import axios from "axios";
import Layout from "../../../../../components/Layout";
import { RouteGuard } from "../../../../../components/RouteGuard";
import { uploadEquipeEscudo } from "../../../../../utils/cloudinary-upload";
import {
  Edit3,
  Save,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Users,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import styles from "./styles.module.scss";

type Grupo = {
  id: number;
  nome: string;
};

type Equipe = {
  id: number;
  nome: string;
  grupoId: number | null;
  escudoUrl: string | null;
  public_id: string | null;
};

type Props = {
  session: any;
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const token = await getToken({ req: ctx.req });
  if (!token) {
    return { redirect: { destination: "/auth/login", permanent: false } };
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

export default function EditarEquipe({ session }: Props) {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [original, setOriginal] = useState<Equipe | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nome: "",
    grupoId: "",
    escudoUrl: "",
    public_id: "",
    newEscudo: null as File | null,
  });

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [equipeRes, gruposRes] = await Promise.all([
          axios.get(`/api/equipes/${id}`),
          axios.get("/api/grupos"),
        ]);

        const equipe = equipeRes.data;
        const grupos = gruposRes.data;

        setOriginal(equipe);

        setFormData({
          nome: equipe.nome || "",
          grupoId: equipe.grupoId ? equipe.grupoId.toString() : "",
          escudoUrl: equipe.escudoUrl || "",
          public_id: equipe.public_id || "",
          newEscudo: null,
        });

        setGrupos(grupos);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setErrors({ general: "Equipe não encontrada" });
        } else if (error.response?.status === 401) {
          setErrors({ general: "Acesso negado. Faça login novamente." });
        } else {
          setErrors({
            general: error.response?.data?.error || "Erro ao carregar dados",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

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
      newEscudo: file,
      escudoUrl: URL.createObjectURL(file),
    }));
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      newEscudo: null,
      escudoUrl: "",
      public_id: "",
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      let escudoUrl = formData.escudoUrl;
      let public_id = formData.public_id;

      if (formData.newEscudo) {
        setUploading(true);

        const clientId = session?.user?.clientId || "sistema";
        const uploadResult = await uploadEquipeEscudo(
          formData.newEscudo,
          clientId
        );

        escudoUrl = uploadResult.url;
        public_id = uploadResult.publicId;

        setUploading(false);
      }

      await axios.patch(`/api/equipes/${id}`, {
        nome: formData.nome.trim(),
        grupoId: formData.grupoId === "" ? null : Number(formData.grupoId),
        escudoUrl: escudoUrl || null,
        public_id: public_id || null,
        oldPublicId: original?.public_id,
      });

      setShowSuccess(true);

      setTimeout(() => {
        router.push("/equipes");
      }, 1500);
    } catch (error: any) {
      setErrors({
        general:
          error.response?.data?.error ||
          "Erro ao atualizar equipe. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            <div className={styles.loadingState}>
              <Loader2 size={32} className={styles.spinner} />
              <p>Carregando dados da equipe...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <RouteGuard module="equipes" action="editar">
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
                  <h1 className={styles.title}>Editar Equipe</h1>
                  <p className={styles.subtitle}>
                    Atualize as informações da equipe {original?.nome}
                  </p>
                </div>
              </div>
            </div>

            {/* Mensagem de sucesso */}
            {showSuccess && (
              <div className={styles.successMessage}>
                <Check size={20} />
                <span>Equipe atualizada com sucesso! Redirecionando...</span>
              </div>
            )}

            {/* Erro geral */}
            {errors.general && (
              <div className={styles.errorMessage}>
                <AlertTriangle size={20} />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                {/* Nome da Equipe */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <Users size={16} />
                    Nome da Equipe
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    className={`${styles.input} ${
                      errors.nome ? styles.inputError : ""
                    }`}
                    placeholder="Digite o nome da equipe"
                    disabled={submitting}
                  />
                  {errors.nome && (
                    <span className={styles.fieldError}>{errors.nome}</span>
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
                </div>
              </div>

              {/* Upload de Escudo */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <ImageIcon size={16} />
                  Escudo da Equipe
                </label>

                <div className={styles.imageUploadContainer}>
                  {formData.escudoUrl ? (
                    <div className={styles.imagePreview}>
                      <img
                        src={formData.escudoUrl}
                        alt="Escudo da equipe"
                        className={styles.previewImage}
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className={styles.removeImageButton}
                        disabled={submitting}
                      >
                        <X size={16} />
                      </button>
                      {uploading && (
                        <div className={styles.uploadOverlay}>
                          <Loader2 size={24} className={styles.spinner} />
                          <span>Enviando...</span>
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
                      disabled={submitting || uploading}
                    />
                    <label
                      htmlFor="escudo-upload"
                      className={styles.uploadButton}
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={16} className={styles.spinner} />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          {formData.escudoUrl
                            ? "Trocar Arquivo"
                            : "Escolher Arquivo"}
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
                  disabled={submitting || uploading}
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
    </RouteGuard>
  );
}

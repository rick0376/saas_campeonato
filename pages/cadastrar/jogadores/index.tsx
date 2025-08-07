import { useState, useEffect, FormEvent } from "react";
import { getToken } from "next-auth/jwt";
import type { GetServerSideProps } from "next";
import axios from "axios";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { RouteGuard } from "../../../components/RouteGuard";
import { uploadJogadorFoto } from "../../../utils/cloudinary-upload";
import {
  Users,
  Plus,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  User,
  AlertTriangle,
  Check,
  Loader2,
  Save,
} from "lucide-react";
import styles from "./styles.module.scss";

type Equipe = {
  id: number;
  nome: string;
};

type CadastrarJogadorProps = {
  session: any;
};

export const getServerSideProps: GetServerSideProps<
  CadastrarJogadorProps
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
        destination: "/admin/clients?message=select-client-to-create-players",
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

export default function CadastrarJogador({ session }: CadastrarJogadorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nome: "",
    posicao: "",
    numeroCamisa: "",
    idade: "",
    altura: "",
    peso: "",
    equipeId: "",
    foto: null as File | null,
    previewUrl: "",
  });

  const posicoes = ["Goleiro", "Zagueiro", "Meio-campo", "Atacante"];

  useEffect(() => {
    const loadEquipes = async () => {
      try {
        const response = await axios.get("/api/equipes");
        setEquipes(response.data);
      } catch (error) {
        setErrors({ general: "Erro ao carregar equipes disponíveis" });
      } finally {
        setLoading(false);
      }
    };

    loadEquipes();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome do jogador é obrigatório";
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
      let urlFoto: string | null = null;
      let publicId: string | null = null;

      if (formData.foto) {
        setUploadingImage(true);

        const clientId = session?.user?.clientId || "sistema";
        const uploadResult = await uploadJogadorFoto(formData.foto, clientId);

        urlFoto = uploadResult.url;
        publicId = uploadResult.publicId;

        setUploadingImage(false);
      }

      const response = await axios.post("/api/jogadores", {
        nome: formData.nome.trim(),
        posicao: formData.posicao.trim() || null,
        numeroCamisa: formData.numeroCamisa
          ? Number(formData.numeroCamisa)
          : null,
        idade: formData.idade ? Number(formData.idade) : null,
        altura: formData.altura ? Number(formData.altura) : null,
        peso: formData.peso ? Number(formData.peso) : null,
        equipeId: formData.equipeId === "" ? null : Number(formData.equipeId),
        fotoUrl: urlFoto,
        public_id: publicId,
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/jogadores");
      }, 1500);
    } catch (error: any) {
      setErrors({
        general:
          error.response?.data?.error ||
          "Erro ao cadastrar jogador. Tente novamente.",
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
      setErrors({ ...errors, foto: "Arquivo muito grande. Máximo 10MB." });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors({
        ...errors,
        foto: "Por favor, selecione apenas arquivos de imagem.",
      });
      return;
    }

    const newErrors = { ...errors };
    delete newErrors.foto;
    setErrors(newErrors);

    setFormData((prev) => ({
      ...prev,
      foto: file,
      previewUrl: URL.createObjectURL(file),
    }));
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      foto: null,
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

  return (
    <RouteGuard module="jogadores" action="criar">
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
                  <h1 className={styles.title}>Cadastrar Novo Jogador</h1>
                  <p className={styles.subtitle}>
                    Adicione um novo jogador ao campeonato
                  </p>
                </div>
              </div>
            </div>

            {/* Indicador de organização */}
            {session?.user?.clientId && (
              <div className={styles.organizationInfo}>
                <div className={styles.folderIndicator}>
                  <ImageIcon size={16} />
                  <span>
                    📁 Foto será salva em:{" "}
                    <code>
                      lhpsystems/jogadores/{session.user.clientId}
                      /foto_timestamp
                    </code>
                  </span>
                </div>
              </div>
            )}

            {loading && (
              <div className={styles.loadingState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Carregando equipes disponíveis...</p>
              </div>
            )}

            {showSuccess && (
              <div className={styles.successMessage}>
                <Check size={20} />
                <span>Jogador cadastrado com sucesso! Redirecionando...</span>
              </div>
            )}

            {errors.general && (
              <div className={styles.errorMessage}>
                <AlertTriangle size={20} />
                <span>{errors.general}</span>
              </div>
            )}

            {!loading && (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formContent}>
                  {/* Seção de Informações Básicas */}
                  <div className={styles.basicInfoSection}>
                    <div className={styles.sectionHeader}>
                      <User size={20} />
                      <h3>Informações Básicas</h3>
                    </div>

                    <div className={styles.formGrid}>
                      {/* Nome do Jogador */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                          <User size={16} />
                          Nome do Jogador
                        </label>
                        <input
                          type="text"
                          value={formData.nome}
                          onChange={(e) =>
                            handleInputChange("nome", e.target.value)
                          }
                          className={`${styles.input} ${
                            errors.nome ? styles.inputError : ""
                          }`}
                          placeholder="Digite o nome do jogador"
                          disabled={submitting}
                          autoComplete="off"
                        />
                        {errors.nome && (
                          <span className={styles.fieldError}>
                            {errors.nome}
                          </span>
                        )}
                      </div>

                      {/* Posição */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                          <Users size={16} />
                          Posição
                        </label>
                        <select
                          value={formData.posicao}
                          onChange={(e) =>
                            handleInputChange("posicao", e.target.value)
                          }
                          className={styles.select}
                          disabled={submitting}
                        >
                          <option value="">— Selecione uma posição —</option>
                          {posicoes.map((posicao) => (
                            <option key={posicao} value={posicao}>
                              {posicao}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Número da Camisa */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                          Número da Camisa (Opcional)
                        </label>
                        <input
                          type="number"
                          value={formData.numeroCamisa}
                          onChange={(e) =>
                            handleInputChange("numeroCamisa", e.target.value)
                          }
                          className={styles.input}
                          placeholder="Ex: 10"
                          min="1"
                          max="99"
                          disabled={submitting}
                        />
                      </div>

                      {/* Idade */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Idade (Opcional)</label>
                        <input
                          type="number"
                          value={formData.idade}
                          onChange={(e) =>
                            handleInputChange("idade", e.target.value)
                          }
                          className={styles.input}
                          placeholder="Ex: 25"
                          min="14"
                          max="50"
                          disabled={submitting}
                        />
                      </div>

                      {/* Altura */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                          Altura em metros (Opcional)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.altura}
                          onChange={(e) =>
                            handleInputChange("altura", e.target.value)
                          }
                          className={styles.input}
                          placeholder="Ex: 1.75"
                          min="1.0"
                          max="2.5"
                          disabled={submitting}
                        />
                      </div>

                      {/* Peso */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                          Peso em kg (Opcional)
                        </label>
                        <input
                          type="number"
                          value={formData.peso}
                          onChange={(e) =>
                            handleInputChange("peso", e.target.value)
                          }
                          className={styles.input}
                          placeholder="Ex: 70"
                          min="40"
                          max="150"
                          disabled={submitting}
                        />
                      </div>

                      {/* Equipe */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                          <Users size={16} />
                          Equipe (Opcional)
                        </label>
                        <select
                          value={formData.equipeId}
                          onChange={(e) =>
                            handleInputChange("equipeId", e.target.value)
                          }
                          className={styles.select}
                          disabled={submitting}
                        >
                          <option value="">— Sem equipe —</option>
                          {equipes.map((equipe) => (
                            <option key={equipe.id} value={equipe.id}>
                              {equipe.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Seção de Upload de Foto */}
                  <div className={styles.imageSection}>
                    <div className={styles.sectionHeader}>
                      <ImageIcon size={20} />
                      <h3>Foto do Jogador</h3>
                    </div>

                    <div className={styles.imageUploadContainer}>
                      {formData.previewUrl ? (
                        <div className={styles.imagePreview}>
                          <img
                            src={formData.previewUrl}
                            alt="Preview da foto"
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
                          <span>Nenhuma foto selecionada</span>
                        </div>
                      )}

                      <div className={styles.uploadArea}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className={styles.fileInput}
                          id="foto-upload"
                          disabled={submitting || uploadingImage}
                        />
                        <label
                          htmlFor="foto-upload"
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
                              📁 Será salvo em: lhpsystems/jogadores/
                              {session.user.clientId}/
                            </small>
                          )}
                        </p>
                      </div>
                    </div>

                    {errors.foto && (
                      <span className={styles.fieldError}>{errors.foto}</span>
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
                        Cadastrar Jogador
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

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { getToken } from "next-auth/jwt";
import type { GetServerSideProps } from "next";
import axios from "axios";
import Layout from "../../../../../components/Layout";
import { RouteGuard } from "../../../../../components/RouteGuard";
import { uploadJogadorFoto } from "../../../../../utils/cloudinary-upload";
import {
  Edit3,
  Save,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Users,
  User,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import styles from "./styles.module.scss";

type Equipe = {
  id: number;
  nome: string;
};

type Jogador = {
  id: number;
  nome: string;
  posicao: string | null;
  numero: number | null;
  idade: number | null;
  altura: number | null;
  peso: number | null;
  equipeId: number | null;
  fotoUrl: string | null;
  public_id: string | null;
  ativo: boolean;
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

export default function EditarJogador({ session }: Props) {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [original, setOriginal] = useState<Jogador | null>(null);
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
    fotoUrl: "",
    public_id: "",
    ativo: true,
    newFoto: null as File | null,
  });

  const posicoes = ["Goleiro", "Zagueiro", "Meio-campo", "Atacante"];

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [jogadorRes, equipesRes] = await Promise.all([
          axios.get(`/api/jogadores/${id}`),
          axios.get("/api/equipes"),
        ]);

        const jogador = jogadorRes.data;
        const equipes = equipesRes.data;

        setOriginal(jogador);

        setFormData({
          nome: jogador.nome || "",
          posicao: jogador.posicao || "",
          numeroCamisa: jogador.numero ? jogador.numero.toString() : "",
          idade: jogador.idade ? jogador.idade.toString() : "",
          altura: jogador.altura ? jogador.altura.toString() : "",
          peso: jogador.peso ? jogador.peso.toString() : "",
          equipeId: jogador.equipeId ? jogador.equipeId.toString() : "",
          fotoUrl: jogador.fotoUrl || "",
          public_id: jogador.public_id || "",
          ativo: jogador.ativo !== false,
          newFoto: null,
        });

        setEquipes(equipes);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setErrors({ general: "Jogador não encontrado" });
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
      newErrors.nome = "Nome do jogador é obrigatório";
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
      newFoto: file,
      fotoUrl: URL.createObjectURL(file),
    }));
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      newFoto: null,
      fotoUrl: "",
      public_id: "",
    }));
  };

  const handleInputChange = (field: string, value: string | boolean) => {
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
      let fotoUrl = formData.fotoUrl;
      let public_id = formData.public_id;

      if (formData.newFoto) {
        setUploading(true);

        const clientId = session?.user?.clientId || "sistema";
        const uploadResult = await uploadJogadorFoto(
          formData.newFoto,
          clientId
          //id as string
        );

        fotoUrl = uploadResult.url;
        public_id = uploadResult.publicId;

        setUploading(false);
      }

      await axios.patch(`/api/jogadores/${id}`, {
        nome: formData.nome.trim(),
        posicao: formData.posicao.trim() || null,
        numeroCamisa: formData.numeroCamisa
          ? Number(formData.numeroCamisa)
          : null,
        idade: formData.idade ? Number(formData.idade) : null,
        altura: formData.altura ? Number(formData.altura) : null,
        peso: formData.peso ? Number(formData.peso) : null,
        equipeId: formData.equipeId === "" ? null : Number(formData.equipeId),
        ativo: formData.ativo,
        fotoUrl: fotoUrl || null,
        public_id: public_id || null,
        oldPublicId: original?.public_id,
      });

      setShowSuccess(true);

      setTimeout(() => {
        router.push("/jogadores");
      }, 1500);
    } catch (error: any) {
      setErrors({
        general:
          error.response?.data?.error ||
          "Erro ao atualizar jogador. Tente novamente.",
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
              <p>Carregando dados do jogador...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <RouteGuard module="jogadores" action="editar">
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
                  <h1 className={styles.title}>Editar Jogador</h1>
                  <p className={styles.subtitle}>
                    Atualize as informações do jogador {original?.nome}
                  </p>
                </div>
              </div>
            </div>

            {showSuccess && (
              <div className={styles.successMessage}>
                <Check size={20} />
                <span>Jogador atualizado com sucesso! Redirecionando...</span>
              </div>
            )}

            {errors.general && (
              <div className={styles.errorMessage}>
                <AlertTriangle size={20} />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
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
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    className={`${styles.input} ${
                      errors.nome ? styles.inputError : ""
                    }`}
                    placeholder="Digite o nome do jogador"
                    disabled={submitting}
                  />
                  {errors.nome && (
                    <span className={styles.fieldError}>{errors.nome}</span>
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
                  <label className={styles.label}>Número da Camisa</label>
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
                  <label className={styles.label}>Idade</label>
                  <input
                    type="number"
                    value={formData.idade}
                    onChange={(e) => handleInputChange("idade", e.target.value)}
                    className={styles.input}
                    placeholder="Ex: 25"
                    min="14"
                    max="50"
                    disabled={submitting}
                  />
                </div>

                {/* Altura */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Altura (m)</label>
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
                  <label className={styles.label}>Peso (kg)</label>
                  <input
                    type="number"
                    value={formData.peso}
                    onChange={(e) => handleInputChange("peso", e.target.value)}
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
                    Equipe
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

                {/* Status */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Status</label>
                  <select
                    value={formData.ativo.toString()}
                    onChange={(e) =>
                      handleInputChange("ativo", e.target.value === "true")
                    }
                    className={styles.select}
                    disabled={submitting}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Upload de Foto */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <ImageIcon size={16} />
                  Foto do Jogador
                </label>

                <div className={styles.imageUploadContainer}>
                  {formData.fotoUrl ? (
                    <div className={styles.imagePreview}>
                      <img
                        src={formData.fotoUrl}
                        alt="Foto do jogador"
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
                      disabled={submitting || uploading}
                    />
                    <label
                      htmlFor="foto-upload"
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
                          {formData.fotoUrl
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

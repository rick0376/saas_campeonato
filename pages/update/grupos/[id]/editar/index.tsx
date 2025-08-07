import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { getToken } from "next-auth/jwt";
import type { GetServerSideProps } from "next";
import axios from "axios";
import Layout from "../../../../../components/Layout";
import { RouteGuard } from "../../../../../components/RouteGuard";
import {
  Edit3,
  Save,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Award,
  Users,
} from "lucide-react";
import styles from "./styles.module.scss";

type Grupo = {
  id: number;
  nome: string;
  _count: {
    equipes: number;
  };
};

type EditarGrupoProps = {
  session: any;
};

export const getServerSideProps: GetServerSideProps<EditarGrupoProps> = async (
  context
) => {
  const token = await getToken({ req: context.req });

  if (!token) {
    return {
      redirect: {
        destination: "/auth/login",
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

export default function EditarGrupo({ session }: EditarGrupoProps) {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [originalGrupo, setOriginalGrupo] = useState<Grupo | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nome: "",
  });

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const response = await axios.get(`/api/grupos/${id}`);
        const grupo = response.data;

        setOriginalGrupo(grupo);
        setFormData({
          nome: grupo.nome,
        });
      } catch (error) {
        setErrors({ general: "Erro ao carregar dados do grupo" });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome do grupo é obrigatório";
    } else if (formData.nome.trim().length < 1) {
      newErrors.nome = "Nome deve ter pelo menos 1 caractere";
    } else if (formData.nome.trim().length > 10) {
      newErrors.nome = "Nome deve ter no máximo 10 caracteres";
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
      await axios.patch(`/api/grupos/${id}`, {
        nome: formData.nome.trim().toUpperCase(),
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/grupos");
      }, 1500);
    } catch (error: any) {
      setErrors({
        general:
          error.response?.data?.error ||
          "Erro ao atualizar grupo. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (value: string) => {
    setFormData((prev) => ({ ...prev, nome: value }));

    if (errors.nome) {
      const newErrors = { ...errors };
      delete newErrors.nome;
      setErrors(newErrors);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
            <p>Carregando dados do grupo...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <RouteGuard module="grupos" action="editar">
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.container}>
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
                  <h1 className={styles.title}>Editar Grupo</h1>
                  <p className={styles.subtitle}>
                    Atualize as informações do grupo {originalGrupo?.nome}
                  </p>
                </div>
              </div>
            </div>

            {showSuccess && (
              <div className={styles.successMessage}>
                <Check size={20} />
                <span>Grupo atualizado com sucesso! Redirecionando...</span>
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
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <Shield size={16} />
                    Nome do Grupo
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className={`${styles.input} ${
                      errors.nome ? styles.inputError : ""
                    }`}
                    placeholder="Digite o nome do grupo"
                    disabled={submitting}
                    maxLength={10}
                  />
                  {errors.nome && (
                    <span className={styles.fieldError}>{errors.nome}</span>
                  )}
                </div>

                {originalGrupo && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <Users size={16} />
                      Equipes Cadastradas
                    </label>
                    <div className={styles.infoDisplay}>
                      <span className={styles.infoValue}>
                        {originalGrupo._count.equipes} equipe
                        {originalGrupo._count.equipes !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>

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
                  disabled={submitting || !formData.nome.trim()}
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

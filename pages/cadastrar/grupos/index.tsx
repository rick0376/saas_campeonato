import { useState, FormEvent } from "react";
import { getToken } from "next-auth/jwt";
import type { GetServerSideProps } from "next";
import api from "../../../lib/axios";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { RouteGuard } from "../../../components/RouteGuard";
import {
  Award,
  Plus,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Save,
  X,
  Building2,
  Users,
} from "lucide-react";
import styles from "./styles.module.scss";

type CadastrarGrupoProps = {
  session: any;
};

export const getServerSideProps: GetServerSideProps<
  CadastrarGrupoProps
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

export default function CadastrarGrupo({ session }: CadastrarGrupoProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nome: "",
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome do grupo é obrigatório";
    } else if (formData.nome.trim().length < 1) {
      newErrors.nome = "Nome deve ter pelo menos 1 caractere";
    } else if (formData.nome.trim().length > 10) {
      newErrors.nome = "Nome deve ter no máximo 10 caracteres";
    } else if (!/^[A-Za-z0-9\s]+$/.test(formData.nome.trim())) {
      newErrors.nome = "Nome deve conter apenas letras, números e espaços";
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
      await api.post("/api/grupos", {
        nome: formData.nome.trim().toUpperCase(),
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/grupos");
      }, 1500);
    } catch (error: any) {
      setErrors({
        general:
          error.response?.data?.message ||
          "Erro ao cadastrar grupo. Tente novamente.",
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

  return (
    <RouteGuard module="grupos" action="criar">
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
                  <h1 className={styles.title}>Cadastrar Novo Grupo</h1>
                  <p className={styles.subtitle}>
                    Crie um grupo para organizar as equipes do campeonato
                  </p>
                </div>
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className={styles.clientInfo}>
              <div className={styles.clientCard}>
                <div className={styles.clientIcon}>
                  <Building2 size={24} />
                </div>
                <div className={styles.clientDetails}>
                  <h3 className={styles.clientName}>
                    {session.user?.clientName || "Meu Cliente"}
                  </h3>
                  <span className={styles.clientStatus}>
                    <Users size={16} />
                    Criando grupo para este cliente
                  </span>
                </div>
              </div>
            </div>

            {/* Mensagem de sucesso */}
            {showSuccess && (
              <div className={styles.successMessage}>
                <Check size={20} />
                <span>Grupo cadastrado com sucesso! Redirecionando...</span>
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
                {/* Informações do Grupo */}
                <div className={styles.infoSection}>
                  <div className={styles.sectionHeader}>
                    <Award size={20} />
                    <h3>Informações do Grupo</h3>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <Shield size={16} />
                      Nome do Grupo
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => handleInputChange(e.target.value)}
                        className={`${styles.input} ${
                          errors.nome ? styles.inputError : ""
                        }`}
                        placeholder="Ex: A, B, C ou 1, 2, 3"
                        disabled={submitting}
                        maxLength={10}
                        autoFocus
                      />
                      <div className={styles.inputHint}>
                        <span className={styles.charCount}>
                          {formData.nome.length}/10 caracteres
                        </span>
                      </div>
                    </div>
                    {errors.nome && (
                      <span className={styles.fieldError}>{errors.nome}</span>
                    )}
                  </div>

                  {/* Preview do Grupo */}
                  {formData.nome.trim() && (
                    <div className={styles.previewSection}>
                      <h4 className={styles.previewTitle}>Preview do Grupo</h4>
                      <div className={styles.groupPreview}>
                        <div className={styles.previewIcon}>
                          <Shield size={24} />
                        </div>
                        <div className={styles.previewInfo}>
                          <span className={styles.previewName}>
                            Grupo {formData.nome.trim().toUpperCase()}
                          </span>
                          <span className={styles.previewStatus}>
                            0 equipes cadastradas
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dicas */}
                <div className={styles.tipsSection}>
                  <div className={styles.sectionHeader}>
                    <AlertTriangle size={20} />
                    <h3>Dicas Importantes</h3>
                  </div>
                  <div className={styles.tipsList}>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>💡</span>
                      <span>Use nomes simples como A, B, C ou 1, 2, 3</span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>⚡</span>
                      <span>
                        O nome será automaticamente convertido para maiúsculo
                      </span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>🎯</span>
                      <span>
                        Após criar, você poderá adicionar equipes ao grupo
                      </span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>🔄</span>
                      <span>Grupos podem ser editados posteriormente</span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>🏢</span>
                      <span>Grupo será criado apenas para seu cliente</span>
                    </div>
                  </div>
                </div>

                {/* Seção de Exemplos */}
                <div className={styles.examplesSection}>
                  <div className={styles.sectionHeader}>
                    <Shield size={20} />
                    <h3>Exemplos de Grupos</h3>
                  </div>
                  <div className={styles.examplesList}>
                    <div className={styles.exampleGroup}>
                      <span className={styles.exampleTitle}>
                        Grupos por Letras:
                      </span>
                      <div className={styles.exampleItems}>
                        <span className={styles.exampleItem}>A</span>
                        <span className={styles.exampleItem}>B</span>
                        <span className={styles.exampleItem}>C</span>
                        <span className={styles.exampleItem}>D</span>
                      </div>
                    </div>
                    <div className={styles.exampleGroup}>
                      <span className={styles.exampleTitle}>
                        Grupos por Números:
                      </span>
                      <div className={styles.exampleItems}>
                        <span className={styles.exampleItem}>1</span>
                        <span className={styles.exampleItem}>2</span>
                        <span className={styles.exampleItem}>3</span>
                        <span className={styles.exampleItem}>4</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aviso Multi-tenant */}
                <div className={styles.warningSection}>
                  <div className={styles.warningCard}>
                    <AlertTriangle size={20} />
                    <div className={styles.warningContent}>
                      <h4>Importante sobre Multi-tenant</h4>
                      <p>
                        Este grupo será criado exclusivamente para o seu
                        cliente. Outros clientes não terão acesso a este grupo.
                      </p>
                    </div>
                  </div>
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
                  disabled={submitting || !formData.nome.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Cadastrar Grupo
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

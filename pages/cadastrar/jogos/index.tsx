import { useState, useEffect, FormEvent } from "react";
import { getToken } from "next-auth/jwt";
import type { GetServerSideProps } from "next";
import api from "../../../lib/axios";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { RouteGuard } from "../../../components/RouteGuard";
import {
  Target,
  Activity,
  Play,
  Zap,
  ZapIcon,
  Circle,
  Calendar,
  Plus,
  ArrowLeft,
  Users,
  Shield,
  Clock,
  Hash,
  AlertTriangle,
  Check,
  Loader2,
  Save,
  X,
} from "lucide-react";
import styles from "./styles.module.scss";

type Equipe = {
  id: number;
  nome: string;
  grupoId: number | null;
  escudoUrl?: string | null;
};

type Grupo = {
  id: number;
  nome: string;
};

type CadastrarJogoProps = {
  session: any;
};

// ✅ CORREÇÃO: getToken + RouteGuard em vez de verificação complexa
export const getServerSideProps: GetServerSideProps<
  CadastrarJogoProps
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

export default function NovoJogo({ session }: CadastrarJogoProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [equipesAll, setEquipesAll] = useState<Equipe[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    grupoId: "",
    equipeAId: "",
    equipeBId: "",
    rodada: "",
    data: "",
  });

  // ✅ CORREÇÃO: Carregar dados com filtro multi-tenant via APIs
  useEffect(() => {
    const loadData = async () => {
      try {
        const [equipesRes, gruposRes] = await Promise.all([
          api.get("/api/equipes"),
          api.get("/api/grupos"),
        ]);

        setEquipesAll(equipesRes.data);
        setGrupos(gruposRes.data);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setErrors({ general: "Erro ao carregar dados do sistema" });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const equipes = formData.grupoId
    ? equipesAll.filter((e) => e.grupoId === Number(formData.grupoId))
    : [];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.grupoId) {
      newErrors.grupoId = "Selecione um grupo";
    }

    if (!formData.equipeAId) {
      newErrors.equipeAId = "Selecione a equipe A";
    }

    if (!formData.equipeBId) {
      newErrors.equipeBId = "Selecione a equipe B";
    }

    if (formData.equipeAId === formData.equipeBId && formData.equipeAId) {
      newErrors.equipeBId = "As equipes devem ser diferentes";
    }

    if (!formData.rodada) {
      newErrors.rodada = "Informe o número da rodada";
    } else if (Number(formData.rodada) < 1) {
      newErrors.rodada = "Rodada deve ser maior que 0";
    }

    if (!formData.data) {
      newErrors.data = "Selecione data e hora do jogo";
    } else {
      // Validar se a data não é no passado
      const selectedDate = new Date(formData.data);
      const now = new Date();
      if (selectedDate < now) {
        newErrors.data = "A data do jogo deve ser no futuro";
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
      await api.post("/api/jogos", {
        ...formData,
        grupoId: Number(formData.grupoId),
        equipeAId: Number(formData.equipeAId),
        equipeBId: Number(formData.equipeBId),
        rodada: Number(formData.rodada),
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/jogos");
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao cadastrar jogo:", error);
      setErrors({
        general:
          error.response?.data?.error ||
          "Erro ao cadastrar jogo. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpa equipes quando muda o grupo
    if (field === "grupoId") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        equipeAId: "",
        equipeBId: "",
      }));
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

  const getEquipeById = (id: string) => {
    return equipesAll.find((e) => e.id === Number(id));
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            <div className={styles.loadingState}>
              <Loader2 size={32} className={styles.spinner} />
              <p>Carregando dados do sistema...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <RouteGuard module="jogos" action="criar">
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
                  <h1 className={styles.title}>Cadastrar Novo Jogo</h1>
                  <p className={styles.subtitle}>
                    Agende um jogo entre duas equipes do campeonato
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ NOVO: Informações do Cliente */}
            <div className={styles.clientInfo}>
              <div className={styles.clientCard}>
                <div className={styles.clientIcon}>
                  <Users size={24} />
                </div>
                <div className={styles.clientDetails}>
                  <h3 className={styles.clientName}>
                    {session.user?.clientName || "Meu Cliente"}
                  </h3>
                  <span className={styles.clientStatus}>
                    <Calendar size={16} />
                    Criando jogo para este cliente
                  </span>
                </div>
              </div>
            </div>

            {/* Mensagem de sucesso */}
            {showSuccess && (
              <div className={styles.successMessage}>
                <Check size={20} />
                <span>Jogo cadastrado com sucesso! Redirecionando...</span>
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

            {/* Alerta se não há grupos ou equipes */}
            {grupos.length === 0 && (
              <div className={styles.warningMessage}>
                <AlertTriangle size={20} />
                <span>
                  Nenhum grupo encontrado. Você precisa criar grupos e equipes
                  antes de cadastrar jogos.
                </span>
              </div>
            )}

            {grupos.length === 0 && equipesAll.length === 0 && (
              <div className={styles.warningMessage}>
                <AlertTriangle size={20} />
                <span>
                  Nenhuma equipe encontrada. Você precisa criar equipes antes de
                  cadastrar jogos.
                </span>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formContent}>
                {/* Seção de Equipes */}
                <div className={styles.teamsSection}>
                  <div className={styles.sectionHeader}>
                    <Users size={20} />
                    <h3>Seleção de Equipes</h3>
                  </div>

                  <div className={styles.formGrid}>
                    {/* Grupo */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Shield size={16} />
                        Grupo
                      </label>
                      <select
                        value={formData.grupoId}
                        onChange={(e) =>
                          handleInputChange("grupoId", e.target.value)
                        }
                        className={`${styles.select} ${
                          errors.grupoId ? styles.inputError : ""
                        }`}
                        disabled={submitting || grupos.length === 0}
                      >
                        <option value="">
                          {grupos.length === 0
                            ? "Nenhum grupo disponível"
                            : "Selecione o grupo"}
                        </option>
                        {grupos.map((grupo) => (
                          <option key={grupo.id} value={grupo.id}>
                            Grupo {grupo.nome}
                          </option>
                        ))}
                      </select>
                      {errors.grupoId && (
                        <span className={styles.fieldError}>
                          {errors.grupoId}
                        </span>
                      )}
                    </div>

                    {/* Preview do Grupo */}
                    {formData.grupoId && (
                      <div className={styles.groupPreview}>
                        <div className={styles.previewIcon}>
                          <Shield size={20} />
                        </div>
                        <div className={styles.previewInfo}>
                          <span className={styles.previewLabel}>
                            Grupo Selecionado
                          </span>
                          <span className={styles.previewValue}>
                            Grupo{" "}
                            {
                              grupos.find(
                                (g) => g.id === Number(formData.grupoId)
                              )?.nome
                            }
                          </span>
                          <span className={styles.previewTeams}>
                            {equipes.length} equipe
                            {equipes.length !== 1 ? "s" : ""} disponível
                            {equipes.length !== 1 ? "is" : ""}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Seleção de Equipes */}
                  {formData.grupoId && (
                    <div className={styles.teamsGrid}>
                      {/* Equipe A */}
                      <div className={styles.teamSelection}>
                        <label className={styles.label}>
                          <Users size={16} />
                          Equipe A (Casa)
                        </label>
                        <select
                          value={formData.equipeAId}
                          onChange={(e) =>
                            handleInputChange("equipeAId", e.target.value)
                          }
                          className={`${styles.select} ${
                            errors.equipeAId ? styles.inputError : ""
                          }`}
                          disabled={submitting || !formData.grupoId}
                        >
                          <option value="">
                            {equipes.length === 0
                              ? "Nenhuma equipe neste grupo"
                              : "Selecione a equipe A"}
                          </option>
                          {equipes.map((equipe) => (
                            <option key={equipe.id} value={equipe.id}>
                              {equipe.nome}
                            </option>
                          ))}
                        </select>
                        {errors.equipeAId && (
                          <span className={styles.fieldError}>
                            {errors.equipeAId}
                          </span>
                        )}

                        {/* Preview Equipe A */}
                        {formData.equipeAId && (
                          <div className={styles.teamPreview}>
                            <img
                              src={
                                getEquipeById(formData.equipeAId)?.escudoUrl ||
                                "/imagens/escudo.png"
                              }
                              alt="Escudo Equipe A"
                              className={styles.teamLogo}
                              onError={(e) => {
                                e.currentTarget.src = "/imagens/escudo.png";
                              }}
                            />
                            <span className={styles.teamName}>
                              {getEquipeById(formData.equipeAId)?.nome}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* VS */}
                      <div className={styles.vsIndicator}>
                        <span>VS</span>
                      </div>

                      {/* Equipe B */}
                      <div className={styles.teamSelection}>
                        <label className={styles.label}>
                          <Users size={16} />
                          Equipe B (Visitante)
                        </label>
                        <select
                          value={formData.equipeBId}
                          onChange={(e) =>
                            handleInputChange("equipeBId", e.target.value)
                          }
                          className={`${styles.select} ${
                            errors.equipeBId ? styles.inputError : ""
                          }`}
                          disabled={submitting || !formData.grupoId}
                        >
                          <option value="">
                            {equipes.length === 0
                              ? "Nenhuma equipe neste grupo"
                              : "Selecione a equipe B"}
                          </option>
                          {equipes
                            .filter((e) => e.id !== Number(formData.equipeAId))
                            .map((equipe) => (
                              <option key={equipe.id} value={equipe.id}>
                                {equipe.nome}
                              </option>
                            ))}
                        </select>
                        {errors.equipeBId && (
                          <span className={styles.fieldError}>
                            {errors.equipeBId}
                          </span>
                        )}

                        {/* Preview Equipe B */}
                        {formData.equipeBId && (
                          <div className={styles.teamPreview}>
                            <img
                              src={
                                getEquipeById(formData.equipeBId)?.escudoUrl ||
                                "/imagens/escudo.png"
                              }
                              alt="Escudo Equipe B"
                              className={styles.teamLogo}
                              onError={(e) => {
                                e.currentTarget.src = "/imagens/escudo.png";
                              }}
                            />
                            <span className={styles.teamName}>
                              {getEquipeById(formData.equipeBId)?.nome}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Seção de Detalhes */}
                <div className={styles.detailsSection}>
                  <div className={styles.sectionHeader}>
                    <Calendar size={20} />
                    <h3>Detalhes do Jogo</h3>
                  </div>

                  <div className={styles.formGrid}>
                    {/* Rodada */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Hash size={16} />
                        Rodada
                      </label>
                      <input
                        type="number"
                        value={formData.rodada}
                        onChange={(e) =>
                          handleInputChange("rodada", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.rodada ? styles.inputError : ""
                        }`}
                        placeholder="Número da rodada"
                        min="1"
                        max="50"
                        disabled={submitting}
                      />
                      {errors.rodada && (
                        <span className={styles.fieldError}>
                          {errors.rodada}
                        </span>
                      )}
                    </div>

                    {/* Data e Hora */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Clock size={16} />
                        Data e Hora
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.data}
                        onChange={(e) =>
                          handleInputChange("data", e.target.value)
                        }
                        className={`${styles.input} ${
                          errors.data ? styles.inputError : ""
                        }`}
                        disabled={submitting}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      {errors.data && (
                        <span className={styles.fieldError}>{errors.data}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview do Jogo */}
                {formData.equipeAId &&
                  formData.equipeBId &&
                  formData.rodada &&
                  formData.data && (
                    <div className={styles.gamePreview}>
                      <div className={styles.sectionHeader}>
                        <Play size={20} />
                        <h3>Preview do Jogo</h3>
                      </div>
                      <div className={styles.previewCard}>
                        <div className={styles.gameInfo}>
                          <span className={styles.roundInfo}>
                            Rodada {formData.rodada}
                          </span>
                          <div className={styles.teamsMatch}>
                            <div className={styles.teamInfo}>
                              <img
                                src={
                                  getEquipeById(formData.equipeAId)
                                    ?.escudoUrl || "/imagens/escudo.png"
                                }
                                alt="Equipe A"
                                className={styles.teamLogoLarge}
                                onError={(e) => {
                                  e.currentTarget.src = "/imagens/escudo.png";
                                }}
                              />
                              <span>
                                {getEquipeById(formData.equipeAId)?.nome}
                              </span>
                            </div>
                            <span className={styles.vs}>VS</span>
                            <div className={styles.teamInfo}>
                              <img
                                src={
                                  getEquipeById(formData.equipeBId)
                                    ?.escudoUrl || "/imagens/escudo.png"
                                }
                                alt="Equipe B"
                                className={styles.teamLogoLarge}
                                onError={(e) => {
                                  e.currentTarget.src = "/imagens/escudo.png";
                                }}
                              />
                              <span>
                                {getEquipeById(formData.equipeBId)?.nome}
                              </span>
                            </div>
                          </div>
                          <span className={styles.dateInfo}>
                            {new Date(formData.data).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                {/* ✅ NOVO: Dicas para o usuário */}
                <div className={styles.tipsSection}>
                  <div className={styles.sectionHeader}>
                    <AlertTriangle size={20} />
                    <h3>Dicas Importantes</h3>
                  </div>
                  <div className={styles.tipsList}>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>⚽</span>
                      <span>
                        Apenas equipes do mesmo grupo podem jogar entre si
                      </span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>📅</span>
                      <span>
                        A data do jogo deve ser no futuro para poder ser
                        agendada
                      </span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>🏆</span>
                      <span>
                        Após criar o jogo, você poderá adicionar eventos e
                        resultados
                      </span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>🔄</span>
                      <span>Jogos podem ser editados posteriormente</span>
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
                  disabled={
                    submitting ||
                    !formData.equipeAId ||
                    !formData.equipeBId ||
                    grupos.length === 0
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
                      Cadastrar Jogo
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

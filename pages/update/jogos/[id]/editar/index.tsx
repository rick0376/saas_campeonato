import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { getToken } from "next-auth/jwt";
import type { GetServerSideProps } from "next";
import api from "../../../../../lib/axios";
import Layout from "../../../../../components/Layout";
import { RouteGuard } from "../../../../../components/RouteGuard";
import {
  Edit3,
  Save,
  ArrowLeft,
  Users,
  Shield,
  Clock,
  Zap,
  AlertTriangle,
  Check,
  Loader2,
  Calendar,
  X,
  Building2,
  RotateCcw,
  Home,
  Plane,
} from "lucide-react";
import styles from "./styles.module.scss";

type Equipe = {
  id: number;
  nome: string;
  grupoId: number;
  escudoUrl?: string | null;
};

type Grupo = {
  id: number;
  nome: string;
};

type Jogo = {
  id: number;
  equipeAId: number;
  equipeBId: number;
  grupoId: number;
  rodada: number;
  data: string;
  equipeA: { nome: string; escudoUrl?: string | null };
  equipeB: { nome: string; escudoUrl?: string | null };
  grupo: { nome: string };
};

// ✅ NOVO: Tipo para dados do cliente
type Cliente = {
  id: string;
  name: string;
  slug: string;
};

type EditarJogoProps = {
  session: any;
};

export const getServerSideProps: GetServerSideProps<EditarJogoProps> = async (
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

export default function EditarJogo({ session }: EditarJogoProps) {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teams, setTeams] = useState<Equipe[]>([]);
  const [groups, setGroups] = useState<Grupo[]>([]);
  const [originalJogo, setOriginalJogo] = useState<Jogo | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ NOVO: Estados para dados do cliente
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(true);

  const [formData, setFormData] = useState({
    equipeAId: "",
    equipeBId: "",
    grupoId: "",
    rodada: "",
    data: "",
  });

  // Estado para controlar qual equipe é mandante
  const [mandante, setMandante] = useState<1 | 2>(1);

  // ✅ NOVO: useEffect para carregar dados do cliente
  useEffect(() => {
    const carregarCliente = async () => {
      if (
        !session?.user?.clientId ||
        session.user.clientId === "undefined" ||
        session.user.clientId === "null"
      ) {
        setLoadingCliente(false);
        return;
      }

      try {
        // ✅ NOVA API: Usar /api/client-info
        const response = await api.get("/api/client-info");

        if (response.data) {
          setCliente(response.data);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do cliente:", error);
        // Usar nome genérico em caso de erro
        setCliente({
          id: session?.user?.clientId || "",
          name: "Meu Cliente",
          slug: "cliente-atual",
        });
      } finally {
        setLoadingCliente(false);
      }
    };

    carregarCliente();
  }, [session?.user?.clientId]);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [jogoRes, equipesRes, gruposRes] = await Promise.all([
          api.get(`/api/jogos/${id}`),
          api.get("/api/equipes"),
          api.get("/api/grupos"),
        ]);

        const jogo = jogoRes.data;
        setOriginalJogo(jogo);
        setFormData({
          equipeAId: jogo.equipeAId.toString(),
          equipeBId: jogo.equipeBId.toString(),
          grupoId: jogo.grupoId.toString(),
          rodada: jogo.rodada.toString(),
          data: jogo.data.slice(0, 16),
        });
        setTeams(equipesRes.data);
        setGroups(gruposRes.data);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setErrors({ general: "Erro ao carregar dados do jogo" });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Função para trocar mandante
  const alternarMandante = () => {
    setMandante((prev) => (prev === 1 ? 2 : 1));
  };

  // Função para obter equipe mandante e visitante
  const getEquipeMandante = () => {
    const equipeAId = formData.equipeAId;
    const equipeBId = formData.equipeBId;

    if (mandante === 1) {
      return { mandanteId: equipeAId, visitanteId: equipeBId };
    } else {
      return { mandanteId: equipeBId, visitanteId: equipeAId };
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.grupoId) {
      newErrors.grupoId = "Selecione um grupo";
    }

    if (!formData.equipeAId) {
      newErrors.equipeAId = "Selecione uma equipe";
    }

    if (!formData.equipeBId) {
      newErrors.equipeBId = "Selecione uma equipe";
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
      // Determinar equipe mandante e visitante baseado no estado
      const { mandanteId, visitanteId } = getEquipeMandante();

      await api.patch(`/api/jogos/${id}`, {
        equipeAId: Number(mandanteId),
        equipeBId: Number(visitanteId),
        grupoId: Number(formData.grupoId),
        rodada: Number(formData.rodada),
        data: formData.data,
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/jogos");
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao atualizar jogo:", error);
      setErrors({
        general:
          error.response?.data?.error ||
          "Erro ao atualizar jogo. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "grupoId") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        equipeAId: "",
        equipeBId: "",
      }));
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

  const getEquipeById = (id: string) => {
    return teams.find((e) => e.id === Number(id));
  };

  const filtered = teams.filter((t) => t.grupoId === Number(formData.grupoId));

  // ✅ NOVO: Função para obter nome do cliente dinamicamente
  const getNomeCliente = () => {
    if (loadingCliente) {
      return "Carregando...";
    }

    if (
      !session?.user?.clientId ||
      session.user.clientId === "undefined" ||
      session.user.clientId === "null"
    ) {
      return "Sistema Global";
    }

    return cliente?.name || "Cliente não encontrado";
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
            <p>Carregando dados do jogo...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <RouteGuard module="jogos" action="editar">
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
                  <h1 className={styles.title}>Editar Jogo</h1>
                  <p className={styles.subtitle}>
                    Atualize as informações do jogo:{" "}
                    {originalJogo?.equipeA.nome} x {originalJogo?.equipeB.nome}
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ ATUALIZADO: Informações do Cliente com busca dinâmica */}
            <div className={styles.clientInfo}>
              <div className={styles.clientCard}>
                <div className={styles.clientIcon}>
                  <Building2 size={24} />
                </div>
                <div className={styles.clientDetails}>
                  <h3 className={styles.clientName}>{getNomeCliente()}</h3>
                  <span className={styles.clientStatus}>
                    <Edit3 size={16} />
                    {loadingCliente
                      ? "Carregando informações..."
                      : "Editando jogo para este cliente"}
                  </span>
                </div>
                {/* ✅ NOVO: Indicador de loading para o cliente */}
                {loadingCliente && (
                  <div className={styles.clientLoading}>
                    <Loader2 size={16} className={styles.spinner} />
                  </div>
                )}
              </div>
            </div>

            {/* Mensagens */}
            {showSuccess && (
              <div className={styles.successMessage}>
                <Check size={20} />
                <span>Jogo atualizado com sucesso! Redirecionando...</span>
              </div>
            )}

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
                {originalJogo && (
                  <div className={styles.currentInfoSection}>
                    <div className={styles.sectionHeader}>
                      <Calendar size={20} />
                      <h3>Informações Atuais</h3>
                    </div>

                    <div className={styles.currentGameInfo}>
                      <div className={styles.currentMatch}>
                        <div className={styles.teamInfo}>
                          <img
                            src={
                              originalJogo.equipeA.escudoUrl ||
                              "/imagens/escudo.png"
                            }
                            alt="Equipe A"
                            className={styles.teamLogo}
                            onError={(e) => {
                              e.currentTarget.src = "/imagens/escudo.png";
                            }}
                          />
                          <span>{originalJogo.equipeA.nome}</span>
                        </div>
                        <span className={styles.vs}>VS</span>
                        <div className={styles.teamInfo}>
                          <img
                            src={
                              originalJogo.equipeB.escudoUrl ||
                              "/imagens/escudo.png"
                            }
                            alt="Equipe B"
                            className={styles.teamLogo}
                            onError={(e) => {
                              e.currentTarget.src = "/imagens/escudo.png";
                            }}
                          />
                          <span>{originalJogo.equipeB.nome}</span>
                        </div>
                      </div>
                      <div className={styles.gameDetails}>
                        <span>
                          Grupo {originalJogo.grupo.nome} • Rodada{" "}
                          {originalJogo.rodada}
                        </span>
                        <span>
                          {new Date(originalJogo.data).toLocaleString("pt-BR")}
                        </span>
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
                        disabled={submitting}
                      >
                        <option value="">Selecione o grupo</option>
                        {groups.map((grupo) => (
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

                    {/* Rodada */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <Zap size={16} />
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
                      />
                      {errors.data && (
                        <span className={styles.fieldError}>{errors.data}</span>
                      )}
                    </div>
                  </div>

                  {/* Seleção de Equipes com Controle de Mandante */}
                  {formData.grupoId && (
                    <div className={styles.teamsSection}>
                      <div className={styles.teamsSectionHeader}>
                        <h4>Configurar Equipes</h4>
                        <button
                          type="button"
                          onClick={alternarMandante}
                          className={styles.swapButton}
                          title="Trocar mandante"
                        >
                          <RotateCcw size={16} />
                          Trocar Mandante
                        </button>
                      </div>

                      <div className={styles.teamsGrid}>
                        {/* Primeira Equipe */}
                        <div className={styles.teamSelection}>
                          <label className={styles.label}>
                            <Users size={16} />
                            Primeira Equipe
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
                              Selecione a primeira equipe
                            </option>
                            {filtered.map((equipe) => (
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

                          {/* Preview Primeira Equipe */}
                          {formData.equipeAId && (
                            <div className={styles.teamPreview}>
                              <img
                                src={
                                  getEquipeById(formData.equipeAId)
                                    ?.escudoUrl || "/imagens/escudo.png"
                                }
                                alt="Escudo"
                                className={styles.teamLogoPreview}
                                onError={(e) => {
                                  e.currentTarget.src = "/imagens/escudo.png";
                                }}
                              />
                              <div className={styles.teamPreviewContent}>
                                <span className={styles.teamName}>
                                  {getEquipeById(formData.equipeAId)?.nome}
                                </span>
                                <span className={styles.teamRole}>
                                  {mandante === 1 ? (
                                    <>
                                      <Home size={14} />
                                      Mandante
                                    </>
                                  ) : (
                                    <>
                                      <Plane size={14} />
                                      Visitante
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* VS com indicador */}
                        <div className={styles.vsIndicator}>
                          <span>VS</span>
                          <div className={styles.mandanteIndicator}>
                            {mandante === 1 ? "←" : "→"}
                          </div>
                        </div>

                        {/* Segunda Equipe */}
                        <div className={styles.teamSelection}>
                          <label className={styles.label}>
                            <Users size={16} />
                            Segunda Equipe
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
                            <option value="">Selecione a segunda equipe</option>
                            {filtered
                              .filter(
                                (e) => e.id !== Number(formData.equipeAId)
                              )
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

                          {/* Preview Segunda Equipe */}
                          {formData.equipeBId && (
                            <div className={styles.teamPreview}>
                              <img
                                src={
                                  getEquipeById(formData.equipeBId)
                                    ?.escudoUrl || "/imagens/escudo.png"
                                }
                                alt="Escudo"
                                className={styles.teamLogoPreview}
                                onError={(e) => {
                                  e.currentTarget.src = "/imagens/escudo.png";
                                }}
                              />
                              <div className={styles.teamPreviewContent}>
                                <span className={styles.teamName}>
                                  {getEquipeById(formData.equipeBId)?.nome}
                                </span>
                                <span className={styles.teamRole}>
                                  {mandante === 2 ? (
                                    <>
                                      <Home size={14} />
                                      Mandante
                                    </>
                                  ) : (
                                    <>
                                      <Plane size={14} />
                                      Visitante
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Resumo da configuração */}
                      {formData.equipeAId && formData.equipeBId && (
                        <div className={styles.matchSummary}>
                          <div className={styles.summaryHeader}>
                            <h4>Resumo da Configuração</h4>
                          </div>
                          <div className={styles.summaryContent}>
                            <div className={styles.summaryTeam}>
                              <div className={styles.summaryTeamInfo}>
                                <img
                                  src={
                                    getEquipeById(
                                      mandante === 1
                                        ? formData.equipeAId
                                        : formData.equipeBId
                                    )?.escudoUrl || "/imagens/escudo.png"
                                  }
                                  alt="Mandante"
                                  className={styles.summaryLogo}
                                  onError={(e) => {
                                    e.currentTarget.src = "/imagens/escudo.png";
                                  }}
                                />
                                <span>
                                  {
                                    getEquipeById(
                                      mandante === 1
                                        ? formData.equipeAId
                                        : formData.equipeBId
                                    )?.nome
                                  }
                                </span>
                              </div>
                              <span className={styles.summaryRole}>
                                <Home size={14} />
                                Casa
                              </span>
                            </div>
                            <span className={styles.summaryVs}>×</span>
                            <div className={styles.summaryTeam}>
                              <div className={styles.summaryTeamInfo}>
                                <img
                                  src={
                                    getEquipeById(
                                      mandante === 1
                                        ? formData.equipeBId
                                        : formData.equipeAId
                                    )?.escudoUrl || "/imagens/escudo.png"
                                  }
                                  alt="Visitante"
                                  className={styles.summaryLogo}
                                  onError={(e) => {
                                    e.currentTarget.src = "/imagens/escudo.png";
                                  }}
                                />
                                <span>
                                  {
                                    getEquipeById(
                                      mandante === 1
                                        ? formData.equipeBId
                                        : formData.equipeAId
                                    )?.nome
                                  }
                                </span>
                              </div>
                              <span className={styles.summaryRole}>
                                <Plane size={14} />
                                Fora
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Dicas importantes */}
                <div className={styles.tipsSection}>
                  <div className={styles.sectionHeader}>
                    <AlertTriangle size={20} />
                    <h3>Dicas Importantes</h3>
                  </div>
                  <div className={styles.tipsList}>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>⚽</span>
                      <span>
                        Use "Trocar Mandante" para definir qual equipe joga em
                        casa
                      </span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>🏆</span>
                      <span>
                        As equipes devem pertencer ao grupo selecionado
                      </span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>📅</span>
                      <span>
                        Alterações na data afetam o calendário do campeonato
                      </span>
                    </div>
                    <div className={styles.tipItem}>
                      <span className={styles.tipIcon}>⚠️</span>
                      <span>
                        Se o jogo já tem resultados, eles serão mantidos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aviso sobre multi-tenant */}
                <div className={styles.warningSection}>
                  <div className={styles.warningCard}>
                    <AlertTriangle size={20} />
                    <div className={styles.warningContent}>
                      <h4>Importante sobre Segurança</h4>
                      <p>
                        Você só pode editar jogos e selecionar equipes do seu
                        cliente. Outras equipes não aparecerão na lista.
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
                  disabled={
                    submitting || !formData.equipeAId || !formData.equipeBId
                  }
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

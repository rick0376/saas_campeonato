import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { getToken } from "next-auth/jwt";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";
import { RouteGuard } from "../../../../components/RouteGuard";
import {
  Trophy,
  Target,
  Square,
  Users,
  Clock,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Zap,
  AlertTriangle,
  Calendar,
  Award,
  UserCheck,
  X,
  CheckCircle,
  Timer,
} from "lucide-react";
import styles from "./styles.module.scss";

interface Jogador {
  id: number;
  nome: string;
  numero: number;
  posicao: string;
  equipeId: number;
}

interface Equipe {
  id: number;
  nome: string;
  escudoUrl?: string;
  jogadores: Jogador[];
}

interface Jogo {
  id: number;
  data: string;
  placarA: number | null;
  placarB: number | null;
  rodada: number;
  equipeA: Equipe;
  equipeB: Equipe;
  grupo: {
    id: number;
    nome: string;
  };
}

interface Evento {
  id: number;
  tipo: string;
  minuto: number;
  jogador: {
    id: number;
    nome: string;
    numero: number;
  };
  equipe: {
    id: number;
    nome: string;
  };
  detalhes?: string;
  createdAt: string;
}

interface EventosJogoProps {
  jogo: Jogo;
  eventos: Evento[];
}

export default function EventosJogo({
  jogo,
  eventos: eventosIniciais,
}: EventosJogoProps) {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>(eventosIniciais);
  const [novoEvento, setNovoEvento] = useState({
    jogadorId: "",
    equipeId: "",
    tipo: "",
    minuto: "",
    detalhes: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placarAtual, setPlacarAtual] = useState({
    placarA: jogo.placarA || 0,
    placarB: jogo.placarB || 0,
  });

  // Estados para modal de confirmação
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventoParaRemover, setEventoParaRemover] = useState<number | null>(
    null
  );

  const tiposEvento = [
    { value: "gol", label: "⚽ Gol", color: "#10b981" },
    { value: "cartao_amarelo", label: "🟨 Cartão Amarelo", color: "#eab308" },
    { value: "cartao_vermelho", label: "🟥 Cartão Vermelho", color: "#ef4444" },
    { value: "assistencia", label: "🎯 Assistência", color: "#8b5cf6" },
  ];

  const adicionarEvento = async () => {
    if (
      !novoEvento.jogadorId ||
      !novoEvento.equipeId ||
      !novoEvento.tipo ||
      !novoEvento.minuto
    ) {
      setErrors({ form: "Preencha todos os campos obrigatórios" });
      return;
    }

    if (parseInt(novoEvento.minuto) < 1 || parseInt(novoEvento.minuto) > 120) {
      setErrors({ form: "O minuto deve estar entre 1 e 120" });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`/api/jogos/${jogo.id}/eventos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jogadorId: parseInt(novoEvento.jogadorId),
          tipo: novoEvento.tipo,
          minuto: parseInt(novoEvento.minuto),
          detalhes: novoEvento.detalhes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao adicionar evento");
      }

      const evento = await response.json();
      setEventos((prev) => [evento, ...prev]);

      // Atualizar placar se for gol
      if (novoEvento.tipo === "gol") {
        if (parseInt(novoEvento.equipeId) === jogo.equipeA.id) {
          setPlacarAtual((prev) => ({ ...prev, placarA: prev.placarA + 1 }));
        } else {
          setPlacarAtual((prev) => ({ ...prev, placarB: prev.placarB + 1 }));
        }
      }

      // Limpar formulário
      setNovoEvento({
        jogadorId: "",
        equipeId: "",
        tipo: "",
        minuto: "",
        detalhes: "",
      });
    } catch (error: any) {
      setErrors({ form: error.message });
    } finally {
      setLoading(false);
    }
  };

  const abrirModalRemover = (eventoId: number) => {
    setEventoParaRemover(eventoId);
    setShowDeleteModal(true);
  };

  const removerEvento = async () => {
    if (!eventoParaRemover) return;

    try {
      const response = await fetch(`/api/jogos/${jogo.id}/eventos`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventoId: eventoParaRemover }),
      });

      if (!response.ok) {
        throw new Error("Erro ao remover evento");
      }

      const eventoRemovido = eventos.find((e) => e.id === eventoParaRemover);
      setEventos((prev) => prev.filter((e) => e.id !== eventoParaRemover));

      // Atualizar placar se for gol removido
      if (eventoRemovido && eventoRemovido.tipo === "gol") {
        if (eventoRemovido.equipe.id === jogo.equipeA.id) {
          setPlacarAtual((prev) => ({
            ...prev,
            placarA: Math.max(0, prev.placarA - 1),
          }));
        } else {
          setPlacarAtual((prev) => ({
            ...prev,
            placarB: Math.max(0, prev.placarB - 1),
          }));
        }
      }

      setShowDeleteModal(false);
      setEventoParaRemover(null);
    } catch (error) {
      console.error("Erro ao remover evento:", error);
      alert("Erro ao remover evento");
    }
  };

  const jogadoresDaEquipe = novoEvento.equipeId
    ? novoEvento.equipeId === jogo.equipeA.id.toString()
      ? jogo.equipeA.jogadores
      : jogo.equipeB.jogadores
    : [];

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventoIcon = (tipo: string) => {
    switch (tipo) {
      case "gol":
        return "⚽";
      case "cartao_amarelo":
        return "🟨";
      case "cartao_vermelho":
        return "🟥";
      case "assistencia":
        return "🎯";
      default:
        return "📝";
    }
  };

  const getEventoTexto = (tipo: string) => {
    switch (tipo) {
      case "gol":
        return "Gol";
      case "cartao_amarelo":
        return "Cartão Amarelo";
      case "cartao_vermelho":
        return "Cartão Vermelho";
      case "assistencia":
        return "Assistência";
      default:
        return "Evento";
    }
  };

  // Estatísticas dos eventos
  const gols = eventos.filter((e) => e.tipo === "gol");
  const cartoesAmarelos = eventos.filter((e) => e.tipo === "cartao_amarelo");
  const cartoesVermelhos = eventos.filter((e) => e.tipo === "cartao_vermelho");
  const assistencias = eventos.filter((e) => e.tipo === "assistencia");

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
              >
                <ArrowLeft size={20} />
                Voltar aos Jogos
              </button>

              <div className={styles.headerContent}>
                <div className={styles.headerIcon}>
                  <Zap size={32} />
                </div>
                <div>
                  <h1 className={styles.title}>Gerenciar Eventos</h1>
                  <p className={styles.subtitle}>
                    {jogo.equipeA.nome} vs {jogo.equipeB.nome}
                  </p>
                  <p className={styles.gameInfo}>
                    <Calendar size={16} />
                    {formatarData(jogo.data)} - Rodada {jogo.rodada} - Grupo{" "}
                    {jogo.grupo.nome}
                  </p>
                </div>
              </div>
            </div>

            {/* Placar atual */}
            <div className={styles.scoreBoard}>
              <div className={styles.team}>
                <img
                  src={jogo.equipeA.escudoUrl || "/imagens/escudo.png"}
                  alt={jogo.equipeA.nome}
                  className={styles.teamLogo}
                  onError={(e) => {
                    e.currentTarget.src = "/imagens/escudo.png";
                  }}
                />
                <span className={styles.teamName}>{jogo.equipeA.nome}</span>
              </div>

              <div className={styles.score}>
                <span className={styles.scoreNumber}>
                  {placarAtual.placarA}
                </span>
                <span className={styles.vs}>×</span>
                <span className={styles.scoreNumber}>
                  {placarAtual.placarB}
                </span>
              </div>

              <div className={styles.team}>
                <img
                  src={jogo.equipeB.escudoUrl || "/imagens/escudo.png"}
                  alt={jogo.equipeB.nome}
                  className={styles.teamLogo}
                  onError={(e) => {
                    e.currentTarget.src = "/imagens/escudo.png";
                  }}
                />
                <span className={styles.teamName}>{jogo.equipeB.nome}</span>
              </div>
            </div>

            {/* Estatísticas rápidas */}
            <div className={styles.quickStats}>
              <div className={styles.statItem}>
                <Target size={20} />
                <span>{gols.length} Gols</span>
              </div>
              <div className={styles.statItem}>
                <Square size={20} className={styles.yellowCard} />
                <span>{cartoesAmarelos.length} Amarelos</span>
              </div>
              <div className={styles.statItem}>
                <Square size={20} className={styles.redCard} />
                <span>{cartoesVermelhos.length} Vermelhos</span>
              </div>
              <div className={styles.statItem}>
                <Award size={20} />
                <span>{assistencias.length} Assistências</span>
              </div>
            </div>

            {/* Formulário para adicionar evento */}
            <div className={styles.addEventForm}>
              <h3 className={styles.formTitle}>
                <Plus size={20} />
                Adicionar Novo Evento
              </h3>

              {errors.form && (
                <div className={styles.errorMessage}>
                  <AlertTriangle size={16} />
                  {errors.form}
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Equipe *</label>
                  <select
                    value={novoEvento.equipeId}
                    onChange={(e) =>
                      setNovoEvento((prev) => ({
                        ...prev,
                        equipeId: e.target.value,
                        jogadorId: "", // Reset jogador quando muda equipe
                      }))
                    }
                    className={styles.select}
                  >
                    <option value="">Selecione a equipe</option>
                    <option value={jogo.equipeA.id}>{jogo.equipeA.nome}</option>
                    <option value={jogo.equipeB.id}>{jogo.equipeB.nome}</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Jogador *</label>
                  <select
                    value={novoEvento.jogadorId}
                    onChange={(e) =>
                      setNovoEvento((prev) => ({
                        ...prev,
                        jogadorId: e.target.value,
                      }))
                    }
                    disabled={!novoEvento.equipeId}
                    className={styles.select}
                  >
                    <option value="">Selecione o jogador</option>
                    {jogadoresDaEquipe.map((jogador) => (
                      <option key={jogador.id} value={jogador.id}>
                        #{jogador.numero} {jogador.nome} ({jogador.posicao})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Tipo de Evento *</label>
                  <select
                    value={novoEvento.tipo}
                    onChange={(e) =>
                      setNovoEvento((prev) => ({
                        ...prev,
                        tipo: e.target.value,
                      }))
                    }
                    className={styles.select}
                  >
                    <option value="">Selecione o tipo</option>
                    {tiposEvento.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Minuto *</label>
                  <input
                    type="number"
                    value={novoEvento.minuto}
                    onChange={(e) =>
                      setNovoEvento((prev) => ({
                        ...prev,
                        minuto: e.target.value,
                      }))
                    }
                    placeholder="Ex: 45"
                    min="1"
                    max="120"
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Detalhes (Opcional)</label>
                  <input
                    type="text"
                    value={novoEvento.detalhes}
                    onChange={(e) =>
                      setNovoEvento((prev) => ({
                        ...prev,
                        detalhes: e.target.value,
                      }))
                    }
                    placeholder="Observações adicionais..."
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  onClick={adicionarEvento}
                  disabled={loading}
                  className={`${styles.button} ${styles.addButton}`}
                >
                  {loading ? (
                    <>
                      <Clock size={16} className={styles.spinner} />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Adicionar Evento
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Lista de eventos */}
            <div className={styles.eventsList}>
              <h3 className={styles.eventsTitle}>
                <Trophy size={20} />
                Timeline do Jogo ({eventos.length} eventos)
              </h3>

              {eventos.length === 0 ? (
                <div className={styles.emptyEvents}>
                  <Zap size={48} />
                  <h4>Nenhum evento registrado</h4>
                  <p>Adicione gols, cartões e outros eventos do jogo</p>
                </div>
              ) : (
                <div className={styles.eventsTimeline}>
                  {eventos
                    .sort((a, b) => b.minuto - a.minuto)
                    .map((evento) => (
                      <div key={evento.id} className={styles.eventItem}>
                        <div className={styles.eventTime}>
                          <Timer size={14} />
                          {evento.minuto}'
                        </div>

                        <div className={styles.eventIcon}>
                          {getEventoIcon(evento.tipo)}
                        </div>

                        <div className={styles.eventContent}>
                          <div className={styles.eventHeader}>
                            <span className={styles.eventType}>
                              {getEventoTexto(evento.tipo)}
                            </span>
                            <span className={styles.eventTeam}>
                              {evento.equipe.nome}
                            </span>
                          </div>

                          <div className={styles.eventPlayer}>
                            <UserCheck size={14} />#{evento.jogador.numero}{" "}
                            {evento.jogador.nome}
                          </div>

                          {evento.detalhes && (
                            <div className={styles.eventDetails}>
                              {evento.detalhes}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => abrirModalRemover(evento.id)}
                          className={styles.removeButton}
                          title="Remover evento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal de confirmação de remoção */}
            {showDeleteModal && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <div className={styles.modalHeader}>
                    <AlertTriangle size={24} className={styles.warningIcon} />
                    <h3>Confirmar Exclusão</h3>
                  </div>

                  <div className={styles.modalBody}>
                    <p>Tem certeza que deseja remover este evento?</p>
                    <p className={styles.modalWarning}>
                      Esta ação não pode ser desfeita.
                    </p>
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className={styles.cancelButton}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={removerEvento}
                      className={styles.confirmButton}
                    >
                      <Trash2 size={16} />
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </RouteGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const token = await getToken({ req: context.req });

  if (!token) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const { id } = context.params!;

  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const jogo = await prisma.jogo.findUnique({
      where: { id: parseInt(id as string) },
      include: {
        grupo: true,
        equipeA: {
          include: {
            jogadores: {
              where: { ativo: true },
              orderBy: { numero: "asc" },
            },
          },
        },
        equipeB: {
          include: {
            jogadores: {
              where: { ativo: true },
              orderBy: { numero: "asc" },
            },
          },
        },
      },
    });

    if (!jogo) {
      return {
        notFound: true,
      };
    }

    const eventos = await prisma.eventoJogo.findMany({
      where: { jogoId: parseInt(id as string) },
      include: {
        jogador: true,
        equipe: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      props: {
        jogo: JSON.parse(JSON.stringify(jogo)),
        eventos: JSON.parse(JSON.stringify(eventos)),
      },
    };
  } catch (error) {
    console.error("Erro ao buscar dados do jogo:", error);
    return {
      notFound: true,
    };
  }
};

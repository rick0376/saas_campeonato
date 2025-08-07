import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { getToken } from "next-auth/jwt";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";
import { RouteGuard } from "../../../../components/RouteGuard";
import {
  Calendar,
  Users,
  Target,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Clock,
  Award,
  UserCheck,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import styles from "./styles.module.scss";

interface Jogador {
  id: number;
  nome: string;
  numero: number;
  posicao: string;
  equipe: {
    id: number;
    nome: string;
  };
}

interface Evento {
  id: number;
  tipo: string;
  minuto: number;
  descricao?: string;
  jogador?: Jogador;
  equipeId: number;
}

interface Jogo {
  id: number;
  data: string;
  rodada: number;
  placarA?: number;
  placarB?: number;
  status: string;
  equipeA: {
    id: number;
    nome: string;
    escudoUrl?: string;
    jogadores: Jogador[];
  };
  equipeB: {
    id: number;
    nome: string;
    escudoUrl?: string;
    jogadores: Jogador[];
  };
  grupo: {
    id: number;
    nome: string;
  };
  eventos: Evento[];
}

interface GerenciarJogoProps {
  jogo: Jogo;
}

export default function GerenciarJogo({ jogo }: GerenciarJogoProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>(jogo.eventos || []);
  const [showEventModal, setShowEventModal] = useState(false);
  const [placarA, setPlacarA] = useState(jogo.placarA?.toString() || "0");
  const [placarB, setPlacarB] = useState(jogo.placarB?.toString() || "0");
  const [status, setStatus] = useState(jogo.status);

  // Estados do modal de evento
  const [novoEvento, setNovoEvento] = useState({
    tipo: "",
    minuto: "",
    jogadorId: "",
    equipeId: "",
    descricao: "",
    tipoGol: "normal",
    motivo: "",
  });

  const tiposEvento = [
    { value: "gol", label: "Gol", icon: Target },
    { value: "cartao_amarelo", label: "Cartão Amarelo", icon: AlertTriangle },
    { value: "cartao_vermelho", label: "Cartão Vermelho", icon: XCircle },
  ];

  const tiposGol = [
    { value: "normal", label: "Gol Normal" },
    { value: "penalti", label: "Pênalti" },
    { value: "contra", label: "Gol Contra" },
    { value: "falta", label: "Falta Direta" },
  ];

  const statusOptions = [
    { value: "agendado", label: "Agendado", color: "#64748b" },
    { value: "em_andamento", label: "Em Andamento", color: "#f59e0b" },
    { value: "finalizado", label: "Finalizado", color: "#10b981" },
  ];

  const handleSalvarResultado = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jogos/${jogo.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placarA: parseInt(placarA),
          placarB: parseInt(placarB),
          status,
        }),
      });

      if (response.ok) {
        alert("Resultado salvo com sucesso!");
        router.reload();
      } else {
        throw new Error("Erro ao salvar resultado");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao salvar resultado");
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarEvento = async () => {
    if (!novoEvento.tipo || !novoEvento.minuto || !novoEvento.equipeId) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/jogos/${jogo.id}/eventos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(novoEvento),
      });

      if (response.ok) {
        setShowEventModal(false);
        setNovoEvento({
          tipo: "",
          minuto: "",
          jogadorId: "",
          equipeId: "",
          descricao: "",
          tipoGol: "normal",
          motivo: "",
        });
        router.reload();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao adicionar evento");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao adicionar evento");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverEvento = async (eventoId: number) => {
    if (!confirm("Tem certeza que deseja remover este evento?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/jogos/${jogo.id}/eventos`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventoId }),
      });

      if (response.ok) {
        router.reload();
      } else {
        throw new Error("Erro ao remover evento");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao remover evento");
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (tipo: string) => {
    switch (tipo) {
      case "gol":
        return <Target size={16} className={styles.golIcon} />;
      case "cartao_amarelo":
        return <AlertTriangle size={16} className={styles.cartaoAmareloIcon} />;
      case "cartao_vermelho":
        return <XCircle size={16} className={styles.cartaoVermelhoIcon} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getEquipeJogadores = (equipeId: number) => {
    return equipeId === jogo.equipeA.id
      ? jogo.equipeA.jogadores
      : jogo.equipeB.jogadores;
  };

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
              </button>
              <div className={styles.headerContent}>
                <div className={styles.headerIcon}>
                  <Calendar size={24} />
                </div>
                <div>
                  <h1 className={styles.title}>Gerenciar Jogo</h1>
                  <p className={styles.subtitle}>
                    {jogo.equipeA.nome} vs {jogo.equipeB.nome} - Rodada{" "}
                    {jogo.rodada}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.content}>
              {/* Placar e Status */}
              <div className={styles.placarSection}>
                <div className={styles.placarCard}>
                  <div className={styles.equipe}>
                    <div className={styles.equipeInfo}>
                      <img
                        src={jogo.equipeA.escudoUrl || "/imagens/escudo.png"}
                        alt={jogo.equipeA.nome}
                        className={styles.escudo}
                      />
                      <span className={styles.equipeNome}>
                        {jogo.equipeA.nome}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={placarA}
                      onChange={(e) => setPlacarA(e.target.value)}
                      className={styles.placarInput}
                      min="0"
                    />
                  </div>

                  <div className={styles.vs}>
                    <span>VS</span>
                    <div className={styles.statusControl}>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className={styles.statusSelect}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.equipe}>
                    <input
                      type="number"
                      value={placarB}
                      onChange={(e) => setPlacarB(e.target.value)}
                      className={styles.placarInput}
                      min="0"
                    />
                    <div className={styles.equipeInfo}>
                      <span className={styles.equipeNome}>
                        {jogo.equipeB.nome}
                      </span>
                      <img
                        src={jogo.equipeB.escudoUrl || "/imagens/escudo.png"}
                        alt={jogo.equipeB.nome}
                        className={styles.escudo}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSalvarResultado}
                  disabled={loading}
                  className={styles.salvarButton}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Salvar Resultado
                    </>
                  )}
                </button>
              </div>

              {/* Eventos do Jogo */}
              <div className={styles.eventosSection}>
                <div className={styles.eventosHeader}>
                  <h3>Eventos do Jogo</h3>
                  <button
                    onClick={() => setShowEventModal(true)}
                    className={styles.addEventButton}
                  >
                    <Plus size={16} />
                    Adicionar Evento
                  </button>
                </div>

                <div className={styles.eventosList}>
                  {eventos.length === 0 ? (
                    <div className={styles.emptyEvents}>
                      <Clock size={48} />
                      <h4>Nenhum evento registrado</h4>
                      <p>Adicione gols, cartões e outros eventos do jogo</p>
                    </div>
                  ) : (
                    eventos.map((evento) => (
                      <div key={evento.id} className={styles.eventoItem}>
                        <div className={styles.eventoInfo}>
                          <div className={styles.eventoIcon}>
                            {getEventIcon(evento.tipo)}
                          </div>
                          <div className={styles.eventoDetalhes}>
                            <div className={styles.eventoTipo}>
                              {evento.tipo === "gol" && "Gol"}
                              {evento.tipo === "cartao_amarelo" &&
                                "Cartão Amarelo"}
                              {evento.tipo === "cartao_vermelho" &&
                                "Cartão Vermelho"}
                            </div>
                            <div className={styles.eventoJogador}>
                              {evento.jogador ? (
                                <>
                                  #{evento.jogador.numero} {evento.jogador.nome}
                                  <span className={styles.eventoEquipe}>
                                    ({evento.jogador.equipe.nome})
                                  </span>
                                </>
                              ) : (
                                <span className={styles.eventoSemJogador}>
                                  Evento da equipe
                                </span>
                              )}
                            </div>
                            {evento.descricao && (
                              <div className={styles.eventoDescricao}>
                                {evento.descricao}
                              </div>
                            )}
                          </div>
                          <div className={styles.eventoMinuto}>
                            {evento.minuto}'
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoverEvento(evento.id)}
                          className={styles.removeEventButton}
                          title="Remover evento"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal de Adicionar Evento */}
            {showEventModal && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <div className={styles.modalHeader}>
                    <h3>Adicionar Evento</h3>
                    <button
                      onClick={() => setShowEventModal(false)}
                      className={styles.closeModal}
                    >
                      <XCircle size={20} />
                    </button>
                  </div>

                  <div className={styles.modalContent}>
                    <div className={styles.formGrid}>
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
                          className={styles.input}
                          min="0"
                          max="120"
                          placeholder="Ex: 45"
                        />
                      </div>

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
                          <option value={jogo.equipeA.id}>
                            {jogo.equipeA.nome}
                          </option>
                          <option value={jogo.equipeB.id}>
                            {jogo.equipeB.nome}
                          </option>
                        </select>
                      </div>

                      {novoEvento.equipeId && (
                        <div className={styles.inputGroup}>
                          <label>Jogador</label>
                          <select
                            value={novoEvento.jogadorId}
                            onChange={(e) =>
                              setNovoEvento((prev) => ({
                                ...prev,
                                jogadorId: e.target.value,
                              }))
                            }
                            className={styles.select}
                          >
                            <option value="">Selecione o jogador</option>
                            {getEquipeJogadores(
                              parseInt(novoEvento.equipeId)
                            ).map((jogador) => (
                              <option key={jogador.id} value={jogador.id}>
                                #{jogador.numero} {jogador.nome} (
                                {jogador.posicao})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {novoEvento.tipo === "gol" && (
                        <div className={styles.inputGroup}>
                          <label>Tipo do Gol</label>
                          <select
                            value={novoEvento.tipoGol}
                            onChange={(e) =>
                              setNovoEvento((prev) => ({
                                ...prev,
                                tipoGol: e.target.value,
                              }))
                            }
                            className={styles.select}
                          >
                            {tiposGol.map((tipo) => (
                              <option key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {novoEvento.tipo.includes("cartao") && (
                        <div className={styles.inputGroup}>
                          <label>Motivo do Cartão</label>
                          <input
                            type="text"
                            value={novoEvento.motivo}
                            onChange={(e) =>
                              setNovoEvento((prev) => ({
                                ...prev,
                                motivo: e.target.value,
                              }))
                            }
                            className={styles.input}
                            placeholder="Ex: Falta dura, reclamação..."
                          />
                        </div>
                      )}

                      <div className={styles.inputGroup}>
                        <label>Descrição</label>
                        <textarea
                          value={novoEvento.descricao}
                          onChange={(e) =>
                            setNovoEvento((prev) => ({
                              ...prev,
                              descricao: e.target.value,
                            }))
                          }
                          className={styles.textarea}
                          placeholder="Descrição adicional do evento..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      onClick={() => setShowEventModal(false)}
                      className={styles.cancelButton}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAdicionarEvento}
                      disabled={loading}
                      className={styles.confirmButton}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className={styles.spinner} />
                          Adicionando...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Adicionar Evento
                        </>
                      )}
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
        grupo: true,
        eventos: {
          include: {
            jogador: {
              include: {
                equipe: true,
              },
            },
          },
          orderBy: { minuto: "asc" },
        },
      },
    });

    if (!jogo) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        jogo: JSON.parse(JSON.stringify(jogo)),
      },
    };
  } catch (error) {
    console.error("Erro ao buscar jogo:", error);
    return {
      notFound: true,
    };
  }
};

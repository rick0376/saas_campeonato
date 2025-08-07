import { useState, useEffect } from "react";
import { getToken } from "next-auth/jwt";
import type { GetServerSideProps } from "next";
import api from "../../../../lib/axios";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";
import {
  ArrowLeft,
  Users,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Save,
  X,
  Target,
  RotateCcw,
  Calendar,
  Clock,
  Building2,
  Settings,
  Zap,
  RefreshCw,
  Repeat,
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

type Confronto = {
  id: string;
  equipe1: Equipe;
  equipe2: Equipe;
  grupoId: number;
  rodada: number;
  mandante: 1 | 2;
  data?: string;
  horario?: string;
  turno: 1 | 2;
};
/*
type GerarJogosProps = {
  session: any;
};
*/
type GerarJogosProps = {
  session: {
    user: {
      id: string;
      email: string;
      role: string;
      clientId: string;
      clientName: string; // ✅ ADICIONAR
    };
  };
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const token = await getToken({ req: context.req });

  if (!token) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  // ✅ NOVO: Buscar nome do cliente
  let clientName = "Super Admin";

  if (
    token.clientId &&
    token.clientId !== "undefined" &&
    token.clientId !== "null"
  ) {
    try {
      const { prisma } = await import("../../../../lib/prisma");
      const client = await prisma.client.findUnique({
        where: { id: token.clientId as string },
        select: { name: true },
      });
      clientName = client?.name || "Cliente não encontrado";
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      clientName = "Erro ao carregar cliente";
    }
  }

  return {
    props: {
      session: {
        user: {
          id: token.sub,
          email: token.email,
          role: token.role,
          clientId: token.clientId,
          clientName: clientName, // ✅ ADICIONAR nome do cliente
        },
      },
    },
  };
};

export default function GerarConfrontos({ session }: GerarJogosProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [equipesAll, setEquipesAll] = useState<Equipe[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [confrontos, setConfrontos] = useState<Confronto[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  // Estados da modal de conflito
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    existingGames: number;
    newGames: number;
    totalGames: number;
  }>({ existingGames: 0, newGames: 0, totalGames: 0 });

  // Configurações expandidas com tipo de returno
  const [config, setConfig] = useState({
    modalidade: "grupos",
    gruposSelecionados: [] as number[],
    gerarReturno: true,
    tipoReturno: "sequencial" as "sequencial" | "espelhado",
  });

  // Carregar dados com filtro multi-tenant via APIs
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
        setMessage("Erro ao carregar dados");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Função para gerar confrontos do primeiro turno
  const gerarPrimeiroTurno = (equipes: Equipe[]): Confronto[] => {
    const confrontos: Confronto[] = [];
    let confrontoId = 1;

    // Gerar todos os confrontos do primeiro turno
    for (let i = 0; i < equipes.length; i++) {
      for (let j = i + 1; j < equipes.length; j++) {
        confrontos.push({
          id: `turno1-confronto-${confrontoId++}`,
          equipe1: equipes[i],
          equipe2: equipes[j],
          grupoId: equipes[i].grupoId!,
          rodada: 1, // Será redistribuído depois
          mandante: 1,
          turno: 1,
        });
      }
    }

    return confrontos;
  };

  // Função para gerar returno sequencial (lógica original)
  const gerarRetornoSequencial = (
    confrontosPrimeiroTurno: Confronto[]
  ): Confronto[] => {
    const confrontosReturno: Confronto[] = [];
    let confrontoId = 1;

    confrontosPrimeiroTurno.forEach((confronto) => {
      confrontosReturno.push({
        id: `turno2-sequencial-${confrontoId++}`,
        equipe1: confronto.equipe2,
        equipe2: confronto.equipe1,
        grupoId: confronto.grupoId,
        rodada: 1, // Será redistribuído depois
        mandante: 1,
        turno: 2,
      });
    });

    return confrontosReturno;
  };

  // ✅ CORRIGIDO: Função para gerar returno espelhado
  const gerarRetornoEspelhado = (
    confrontosPrimeiroTurno: Confronto[]
  ): Confronto[] => {
    const confrontosReturno: Confronto[] = [];
    let confrontoId = 1;

    // Primeiro, precisamos organizar os confrontos por rodada
    const confrontosPorRodada: Record<number, Confronto[]> = {};

    confrontosPrimeiroTurno.forEach((confronto) => {
      if (!confrontosPorRodada[confronto.rodada]) {
        confrontosPorRodada[confronto.rodada] = [];
      }
      confrontosPorRodada[confronto.rodada].push(confronto);
    });

    // Para cada rodada, criar o espelho exato
    Object.keys(confrontosPorRodada)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((rodada) => {
        const confrontosDaRodada = confrontosPorRodada[rodada];

        confrontosDaRodada.forEach((confronto) => {
          confrontosReturno.push({
            id: `turno2-espelho-r${rodada}-${confrontoId++}`,
            equipe1: confronto.equipe2, // Inverte mandante
            equipe2: confronto.equipe1, // Inverte visitante
            grupoId: confronto.grupoId,
            rodada: rodada, // ✅ MANTÉM A MESMA RODADA
            mandante: 1,
            turno: 2,
          });
        });
      });

    return confrontosReturno;
  };

  // Função para distribuir rodadas respeitando turnos (para returno sequencial)
  const distribuirRodadas = (
    confrontos: Confronto[],
    totalEquipes: number
  ): Confronto[] => {
    if (totalEquipes < 2) return confrontos;

    const maxJogosPorRodada = Math.floor(totalEquipes / 2);

    const confrontosTurno1 = confrontos.filter((c) => c.turno === 1);
    const confrontosTurno2 = confrontos.filter((c) => c.turno === 2);

    // Distribuir rodadas do primeiro turno
    const confrontosTurno1Distribuidos = distribuirRodadasTurno(
      confrontosTurno1,
      maxJogosPorRodada,
      1
    );

    // Calcular quantas rodadas teve o primeiro turno
    const ultimaRodadaTurno1 = Math.max(
      ...confrontosTurno1Distribuidos.map((c) => c.rodada)
    );

    // Distribuir rodadas do segundo turno
    const confrontosTurno2Distribuidos = distribuirRodadasTurno(
      confrontosTurno2,
      maxJogosPorRodada,
      ultimaRodadaTurno1 + 1
    );

    return [...confrontosTurno1Distribuidos, ...confrontosTurno2Distribuidos];
  };

  // ✅ CORRIGIDO: Função para ajustar rodadas do returno espelhado
  const ajustarRodadasEspelhado = (
    confrontos: Confronto[],
    totalEquipes: number
  ): Confronto[] => {
    const confrontosTurno1 = confrontos.filter((c) => c.turno === 1);
    const confrontosTurno2 = confrontos.filter((c) => c.turno === 2);

    // Distribuir primeiro turno normalmente
    const maxJogosPorRodada = Math.floor(totalEquipes / 2);
    const confrontosTurno1Distribuidos = distribuirRodadasTurno(
      confrontosTurno1,
      maxJogosPorRodada,
      1
    );

    // Para returno espelhado, calcular offset e manter estrutura
    const ultimaRodadaTurno1 = Math.max(
      ...confrontosTurno1Distribuidos.map((c) => c.rodada)
    );

    // ✅ CORRIGIDO: Agrupar returno por rodada original e offsetar
    const confrontosTurno2PorRodada: Record<number, Confronto[]> = {};

    confrontosTurno2.forEach((confronto) => {
      if (!confrontosTurno2PorRodada[confronto.rodada]) {
        confrontosTurno2PorRodada[confronto.rodada] = [];
      }
      confrontosTurno2PorRodada[confronto.rodada].push(confronto);
    });

    // Ajustar rodadas mantendo estrutura espelhada
    const confrontosTurno2Ajustados: Confronto[] = [];

    Object.keys(confrontosTurno2PorRodada)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((rodadaOriginal) => {
        const novaRodada = rodadaOriginal + ultimaRodadaTurno1;

        confrontosTurno2PorRodada[rodadaOriginal].forEach((confronto) => {
          confrontosTurno2Ajustados.push({
            ...confronto,
            rodada: novaRodada,
          });
        });
      });

    return [...confrontosTurno1Distribuidos, ...confrontosTurno2Ajustados];
  };

  // Função auxiliar para distribuir rodadas de um turno específico
  const distribuirRodadasTurno = (
    confrontos: Confronto[],
    maxJogosPorRodada: number,
    rodadaInicial: number
  ): Confronto[] => {
    const confrontosRestantes = [...confrontos];
    let rodadaAtual = rodadaInicial;

    while (confrontosRestantes.length > 0) {
      const equipesUsadas = new Set<number>();
      const confrontosDaRodada: Confronto[] = [];

      for (let i = confrontosRestantes.length - 1; i >= 0; i--) {
        const confronto = confrontosRestantes[i];

        if (
          !equipesUsadas.has(confronto.equipe1.id) &&
          !equipesUsadas.has(confronto.equipe2.id)
        ) {
          confronto.rodada = rodadaAtual;
          confrontosDaRodada.push(confronto);
          equipesUsadas.add(confronto.equipe1.id);
          equipesUsadas.add(confronto.equipe2.id);
          confrontosRestantes.splice(i, 1);

          if (confrontosDaRodada.length >= maxJogosPorRodada) {
            break;
          }
        }
      }

      if (confrontosDaRodada.length === 0 && confrontosRestantes.length > 0) {
        const proximo = confrontosRestantes.shift()!;
        proximo.rodada = rodadaAtual;
      }

      rodadaAtual++;
    }

    return confrontos;
  };

  // Função para verificar jogos existentes
  const verificarJogosExistentes = async (confrontosNovos: Confronto[]) => {
    try {
      const response = await api.get("/api/jogos");
      const jogosExistentes = response.data;

      const conflitos = confrontosNovos.filter((confronto) => {
        return jogosExistentes.some(
          (jogo: any) =>
            (jogo.equipeAId === confronto.equipe1.id &&
              jogo.equipeBId === confronto.equipe2.id) ||
            (jogo.equipeAId === confronto.equipe2.id &&
              jogo.equipeBId === confronto.equipe1.id)
        );
      });

      if (conflitos.length > 0) {
        setConflictInfo({
          existingGames: conflitos.length,
          newGames: confrontosNovos.length - conflitos.length,
          totalGames: confrontosNovos.length,
        });
        setShowConflictModal(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao verificar jogos existentes:", error);
      return true;
    }
  };

  // ✅ CORRIGIDO: Função principal para gerar confrontos
  const handleGerar = async () => {
    setGenerating(true);
    setMessage("");

    try {
      if (config.gruposSelecionados.length === 0) {
        setMessage("Selecione pelo menos um grupo");
        setMessageType("error");
        setGenerating(false);
        return;
      }

      let todosConfrontos: Confronto[] = [];

      config.gruposSelecionados.forEach((grupoId) => {
        const equipesDoGrupo = equipesAll.filter((e) => e.grupoId === grupoId);

        if (equipesDoGrupo.length >= 2) {
          // Gerar primeiro turno
          const confrontosPrimeiroTurno = gerarPrimeiroTurno(equipesDoGrupo);

          // Escolher tipo de returno
          let confrontosSegundoTurno: Confronto[] = [];
          if (config.gerarReturno) {
            if (config.tipoReturno === "espelhado") {
              // ✅ CORRIGIDO: Primeiro distribui turno 1, depois gera espelho
              const confrontosTurno1Distribuidos = distribuirRodadasTurno(
                confrontosPrimeiroTurno,
                Math.floor(equipesDoGrupo.length / 2),
                1
              );
              confrontosSegundoTurno = gerarRetornoEspelhado(
                confrontosTurno1Distribuidos
              );
            } else {
              confrontosSegundoTurno = gerarRetornoSequencial(
                confrontosPrimeiroTurno
              );
            }
          }

          // Combinar turnos
          const confrontosCompletos = [
            ...confrontosPrimeiroTurno,
            ...confrontosSegundoTurno,
          ];

          // Distribuir rodadas conforme tipo de returno
          let confrontosComRodada;
          if (config.tipoReturno === "espelhado" && config.gerarReturno) {
            confrontosComRodada = ajustarRodadasEspelhado(
              confrontosCompletos,
              equipesDoGrupo.length
            );
          } else {
            confrontosComRodada = distribuirRodadas(
              confrontosCompletos,
              equipesDoGrupo.length
            );
          }

          todosConfrontos = [...todosConfrontos, ...confrontosComRodada];
        }
      });

      if (todosConfrontos.length === 0) {
        setMessage(
          "Nenhum confronto pode ser gerado com os grupos selecionados"
        );
        setMessageType("error");
        setGenerating(false);
        return;
      }

      const podeGerar = await verificarJogosExistentes(todosConfrontos);

      if (podeGerar) {
        setConfrontos(todosConfrontos);
        const turnoText = !config.gerarReturno
          ? "turno único"
          : config.tipoReturno === "espelhado"
          ? "turno e returno espelhado"
          : "turno e returno sequencial";
        setMessage(
          `${todosConfrontos.length} confrontos gerados com sucesso (${turnoText})!`
        );
        setMessageType("success");
      }
    } catch (error) {
      setMessage("Erro ao gerar confrontos");
      setMessageType("error");
    } finally {
      setGenerating(false);
    }
  };

  // Função para forçar geração (ignorar conflitos)
  const forcarGeracao = async () => {
    setShowConflictModal(false);

    let todosConfrontos: Confronto[] = [];

    config.gruposSelecionados.forEach((grupoId) => {
      const equipesDoGrupo = equipesAll.filter((e) => e.grupoId === grupoId);
      if (equipesDoGrupo.length >= 2) {
        const confrontosPrimeiroTurno = gerarPrimeiroTurno(equipesDoGrupo);
        let confrontosSegundoTurno: Confronto[] = [];
        if (config.gerarReturno) {
          if (config.tipoReturno === "espelhado") {
            const confrontosTurno1Distribuidos = distribuirRodadasTurno(
              confrontosPrimeiroTurno,
              Math.floor(equipesDoGrupo.length / 2),
              1
            );
            confrontosSegundoTurno = gerarRetornoEspelhado(
              confrontosTurno1Distribuidos
            );
          } else {
            confrontosSegundoTurno = gerarRetornoSequencial(
              confrontosPrimeiroTurno
            );
          }
        }
        const confrontosCompletos = [
          ...confrontosPrimeiroTurno,
          ...confrontosSegundoTurno,
        ];

        let confrontosComRodada;
        if (config.tipoReturno === "espelhado" && config.gerarReturno) {
          confrontosComRodada = ajustarRodadasEspelhado(
            confrontosCompletos,
            equipesDoGrupo.length
          );
        } else {
          confrontosComRodada = distribuirRodadas(
            confrontosCompletos,
            equipesDoGrupo.length
          );
        }

        todosConfrontos = [...todosConfrontos, ...confrontosComRodada];
      }
    });

    setConfrontos(todosConfrontos);
    setMessage(
      `${todosConfrontos.length} confrontos gerados (incluindo duplicatas)!`
    );
    setMessageType("success");
  };

  // Alternar mandante
  const alternarMandante = (confrontoId: string) => {
    setConfrontos((prev) =>
      prev.map((c) =>
        c.id === confrontoId ? { ...c, mandante: c.mandante === 1 ? 2 : 1 } : c
      )
    );
  };

  // Definir data
  const definirData = (confrontoId: string, data: string) => {
    setConfrontos((prev) =>
      prev.map((c) => (c.id === confrontoId ? { ...c, data } : c))
    );
  };

  // Definir horário
  const definirHorario = (confrontoId: string, horario: string) => {
    setConfrontos((prev) =>
      prev.map((c) => (c.id === confrontoId ? { ...c, horario } : c))
    );
  };

  const handleSalvar = async () => {
    setSaving(true);
    setMessage("");

    try {
      const jogosParaSalvar = confrontos.map((c) => ({
        equipeAId: c.mandante === 1 ? c.equipe1.id : c.equipe2.id,
        equipeBId: c.mandante === 1 ? c.equipe2.id : c.equipe1.id,
        grupoId: c.grupoId,
        rodada: c.rodada,
        data: c.data
          ? new Date(`${c.data}T${c.horario || "14:00"}`).toISOString()
          : new Date().toISOString(),
      }));

      for (const jogo of jogosParaSalvar) {
        await api.post("/api/jogos", jogo);
      }

      setMessage("Confrontos salvos com sucesso!");
      setMessageType("success");

      setTimeout(() => {
        router.push("/jogos");
      }, 2000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || "Erro ao salvar");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const toggleGrupo = (grupoId: number) => {
    const novosGrupos = config.gruposSelecionados.includes(grupoId)
      ? config.gruposSelecionados.filter((id) => id !== grupoId)
      : [...config.gruposSelecionados, grupoId];

    setConfig((prev) => ({ ...prev, gruposSelecionados: novosGrupos }));
  };

  // Calcular estatísticas dos confrontos
  const calcularEstatisticas = () => {
    const turno1 = confrontos.filter((c) => c.turno === 1).length;
    const turno2 = confrontos.filter((c) => c.turno === 2).length;
    const totalRodadas =
      confrontos.length > 0 ? Math.max(...confrontos.map((c) => c.rodada)) : 0;

    return { turno1, turno2, totalRodadas };
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            <div className={styles.loading}>
              <Loader2 size={32} className={styles.spinner} />
              <p>Carregando dados...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const stats = calcularEstatisticas();

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <button onClick={() => router.back()} className={styles.backButton}>
              <ArrowLeft size={20} />
            </button>
            <div className={styles.headerContent}>
              <div className={styles.headerIcon}>
                <Target size={24} />
              </div>
              <div>
                <h1 className={styles.title}>Gerar Jogos Automaticamente</h1>
                <p className={styles.subtitle}>
                  Configure e gere todas as rodadas automaticamente
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
                  <Target size={16} />
                  Gerando jogos para este cliente
                </span>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          {message && (
            <div className={`${styles.message} ${styles[messageType]}`}>
              {messageType === "success" ? (
                <Check size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
              <span>{message}</span>
              <button
                onClick={() => setMessage("")}
                className={styles.closeButton}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className={styles.content}>
            {/* Configurações */}
            <div className={styles.configSection}>
              <h3>
                <Settings size={20} />
                Configurações de Geração
              </h3>

              {/* Alerta sobre grupos */}
              {grupos.length === 0 && (
                <div className={styles.warningBox}>
                  <AlertTriangle size={20} />
                  <div>
                    <strong>⚠️ Nenhum grupo encontrado!</strong>
                    <p>
                      Você precisa criar grupos e equipes antes de gerar jogos
                      automaticamente.
                    </p>
                  </div>
                </div>
              )}

              {/* Opções de Turno e Returno */}
              <div className={styles.turnoConfig}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={config.gerarReturno}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        gerarReturno: e.target.checked,
                      }))
                    }
                  />
                  <span className={styles.checkboxText}>
                    <Zap size={16} />
                    Gerar Turno e Returno
                  </span>
                </label>

                {/* Opções de Tipo de Returno */}
                {config.gerarReturno && (
                  <div className={styles.returnoOptions}>
                    <h4>
                      <Settings size={16} />
                      Tipo de Returno:
                    </h4>

                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="tipoReturno"
                        value="sequencial"
                        checked={config.tipoReturno === "sequencial"}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            tipoReturno: e.target.value as "sequencial",
                          }))
                        }
                      />
                      <div className={styles.radioContent}>
                        <div className={styles.radioHeader}>
                          <RefreshCw size={16} />
                          <strong>Returno Sequencial</strong>
                        </div>
                        <span>
                          Completa todas as rodadas do turno, depois gera
                          returno em sequência
                        </span>
                        <em>
                          Ex: Rodadas 1-3 (turno), Rodadas 4-6 (returno com
                          novos confrontos)
                        </em>
                      </div>
                    </label>

                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="tipoReturno"
                        value="espelhado"
                        checked={config.tipoReturno === "espelhado"}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            tipoReturno: e.target.value as "espelhado",
                          }))
                        }
                      />
                      <div className={styles.radioContent}>
                        <div className={styles.radioHeader}>
                          <Repeat size={16} />
                          <strong>Returno Espelhado</strong>
                        </div>
                        <span>
                          Inverte apenas os mandantes, mantendo a mesma
                          sequência de confrontos
                        </span>
                        <em>
                          Ex: Rodadas 1-3 (turno), Rodadas 4-6 (returno
                          espelhado)
                        </em>
                      </div>
                    </label>
                  </div>
                )}

                <div className={styles.turnoExplanation}>
                  {!config.gerarReturno ? (
                    <p>
                      ⚡ Será gerado apenas o <strong>turno único</strong> (cada
                      equipe joga contra todas as outras uma vez)
                    </p>
                  ) : config.tipoReturno === "sequencial" ? (
                    <p>
                      🔄 Será gerado o <strong>turno completo</strong> e depois
                      o <strong>returno sequencial</strong> (novas rodadas)
                    </p>
                  ) : (
                    <p>
                      🪞 Será gerado o <strong>turno completo</strong> e depois
                      o <strong>returno espelhado</strong> (mesma sequência,
                      mandantes invertidos)
                    </p>
                  )}
                </div>
              </div>

              {/* Grupos */}
              {grupos.length > 0 && (
                <div className={styles.grupos}>
                  <label>Selecionar Grupos para Gerar Jogos:</label>
                  <div className={styles.gruposGrid}>
                    {grupos.map((grupo) => {
                      const equipesDoGrupo = equipesAll.filter(
                        (e) => e.grupoId === grupo.id
                      );
                      const podeGerar = equipesDoGrupo.length >= 2;

                      return (
                        <label
                          key={grupo.id}
                          className={`${styles.grupoItem} ${
                            !podeGerar ? styles.grupoDisabled : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={config.gruposSelecionados.includes(
                              grupo.id
                            )}
                            onChange={() => toggleGrupo(grupo.id)}
                            disabled={!podeGerar}
                          />
                          <div className={styles.grupoInfo}>
                            <span className={styles.grupoNome}>
                              Grupo {grupo.nome}
                            </span>
                            <span className={styles.grupoEquipes}>
                              {equipesDoGrupo.length} equipes
                            </span>
                            {!podeGerar && (
                              <span className={styles.grupoAviso}>
                                Mínimo 2 equipes
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Informações sobre a geração */}
              <div className={styles.infoBox}>
                <h4>Como funciona a geração automática:</h4>
                <ul>
                  <li>
                    <strong>Primeiro Turno:</strong> Cada equipe joga contra
                    todas as outras uma vez
                  </li>
                  <li>
                    <strong>Returno Sequencial:</strong> Gera novas rodadas após
                    o turno, invertendo mandantes
                  </li>
                  <li>
                    <strong>Returno Espelhado:</strong> Mantém a mesma sequência
                    de rodadas, apenas inverte mandantes
                  </li>
                  <li>
                    <strong>Distribuição Inteligente:</strong> Evita conflitos
                    de equipes na mesma rodada
                  </li>
                  <li>
                    <strong>Datas Personalizáveis:</strong> Configure após a
                    geração
                  </li>
                </ul>
              </div>

              <button
                onClick={handleGerar}
                disabled={
                  generating ||
                  config.gruposSelecionados.length === 0 ||
                  grupos.length === 0
                }
                className={styles.gerarButton}
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Target size={16} />
                    Gerar{" "}
                    {!config.gerarReturno
                      ? "Turno Único"
                      : config.tipoReturno === "espelhado"
                      ? "Turno e Returno Espelhado"
                      : "Turno e Returno Sequencial"}
                  </>
                )}
              </button>
            </div>

            {/* Lista de Confrontos */}
            {confrontos.length > 0 && (
              <div className={styles.confrontosSection}>
                <h3>
                  <Shield size={20} />
                  Jogos Gerados ({confrontos.length} jogos)
                </h3>

                {/* Estatísticas dos confrontos */}
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                      <Zap size={20} />
                    </div>
                    <div className={styles.statContent}>
                      <span className={styles.statNumber}>{stats.turno1}</span>
                      <span className={styles.statLabel}>
                        Jogos do 1º Turno
                      </span>
                    </div>
                  </div>
                  {config.gerarReturno && (
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>
                        {config.tipoReturno === "espelhado" ? (
                          <Repeat size={20} />
                        ) : (
                          <RotateCcw size={20} />
                        )}
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.statNumber}>
                          {stats.turno2}
                        </span>
                        <span className={styles.statLabel}>
                          Jogos do 2º Turno (
                          {config.tipoReturno === "espelhado"
                            ? "Espelhado"
                            : "Sequencial"}
                          )
                        </span>
                      </div>
                    </div>
                  )}
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                      <Calendar size={20} />
                    </div>
                    <div className={styles.statContent}>
                      <span className={styles.statNumber}>
                        {stats.totalRodadas}
                      </span>
                      <span className={styles.statLabel}>Total de Rodadas</span>
                    </div>
                  </div>
                </div>

                <div className={styles.rodadas}>
                  {Array.from(new Set(confrontos.map((c) => c.rodada)))
                    .sort()
                    .map((rodada) => {
                      const confrontosDaRodada = confrontos.filter(
                        (c) => c.rodada === rodada
                      );
                      const temTurno1 = confrontosDaRodada.some(
                        (c) => c.turno === 1
                      );
                      const temTurno2 = confrontosDaRodada.some(
                        (c) => c.turno === 2
                      );

                      return (
                        <div key={rodada} className={styles.rodada}>
                          <h4>
                            Rodada {rodada}
                            {temTurno1 && temTurno2 && " (Misto)"}
                            {temTurno1 && !temTurno2 && " (1º Turno)"}
                            {!temTurno1 &&
                              temTurno2 &&
                              ` (2º Turno - ${
                                config.tipoReturno === "espelhado"
                                  ? "Espelhado"
                                  : "Sequencial"
                              })`}
                          </h4>
                          <div className={styles.confrontosGrid}>
                            {confrontosDaRodada.map((confronto) => {
                              const mandante =
                                confronto.mandante === 1
                                  ? confronto.equipe1
                                  : confronto.equipe2;
                              const visitante =
                                confronto.mandante === 1
                                  ? confronto.equipe2
                                  : confronto.equipe1;

                              return (
                                <div
                                  key={confronto.id}
                                  className={`${styles.confrontoCard} ${
                                    confronto.turno === 2 ? styles.returno : ""
                                  } ${
                                    confronto.turno === 2 &&
                                    config.tipoReturno === "espelhado"
                                      ? styles.espelhado
                                      : ""
                                  }`}
                                >
                                  <div className={styles.confrontoHeader}>
                                    <span className={styles.grupo}>
                                      Grupo{" "}
                                      {
                                        grupos.find(
                                          (g) => g.id === confronto.grupoId
                                        )?.nome
                                      }
                                    </span>
                                    <div className={styles.confrontoMeta}>
                                      <span
                                        className={`${styles.turnoIndicator} ${
                                          confronto.turno === 2 &&
                                          config.tipoReturno === "espelhado"
                                            ? styles.espelhadoIndicator
                                            : ""
                                        }`}
                                      >
                                        {confronto.turno === 1
                                          ? "1º Turno"
                                          : config.tipoReturno === "espelhado"
                                          ? "2º Turno (Espelho)"
                                          : "2º Turno"}
                                      </span>
                                      <button
                                        onClick={() =>
                                          alternarMandante(confronto.id)
                                        }
                                        className={styles.alternarButton}
                                        title="Trocar mandante"
                                      >
                                        <RotateCcw size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className={styles.confrontoBody}>
                                    <div className={styles.equipeCasa}>
                                      <img
                                        src={
                                          mandante.escudoUrl ||
                                          "/imagens/escudo.png"
                                        }
                                        alt="Escudo"
                                        className={styles.escudo}
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            "/imagens/escudo.png";
                                        }}
                                      />
                                      <div>
                                        <div className={styles.equipeNome}>
                                          {mandante.nome}
                                        </div>
                                        <div className={styles.casaBadge}>
                                          CASA
                                        </div>
                                      </div>
                                    </div>

                                    <div className={styles.vs}>VS</div>

                                    <div className={styles.equipeFora}>
                                      <img
                                        src={
                                          visitante.escudoUrl ||
                                          "/imagens/escudo.png"
                                        }
                                        alt="Escudo"
                                        className={styles.escudo}
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            "/imagens/escudo.png";
                                        }}
                                      />
                                      <div>
                                        <div className={styles.equipeNome}>
                                          {visitante.nome}
                                        </div>
                                        <div className={styles.foraBadge}>
                                          FORA
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className={styles.dataHorario}>
                                    <div className={styles.inputGroup}>
                                      <Calendar size={14} />
                                      <input
                                        type="date"
                                        value={confronto.data || ""}
                                        onChange={(e) =>
                                          definirData(
                                            confronto.id,
                                            e.target.value
                                          )
                                        }
                                        className={styles.dateInput}
                                        min={
                                          new Date().toISOString().split("T")[0]
                                        }
                                      />
                                    </div>
                                    <div className={styles.inputGroup}>
                                      <Clock size={14} />
                                      <input
                                        type="time"
                                        value={confronto.horario || ""}
                                        onChange={(e) =>
                                          definirHorario(
                                            confronto.id,
                                            e.target.value
                                          )
                                        }
                                        className={styles.timeInput}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className={styles.actions}>
                  <button
                    onClick={() => setConfrontos([])}
                    className={styles.cancelButton}
                  >
                    <X size={16} />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvar}
                    disabled={saving}
                    className={styles.saveButton}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Salvar {confrontos.length} Jogos
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal de Conflito de Jogos */}
          {showConflictModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <AlertTriangle size={24} className={styles.modalIcon} />
                  <h3 className={styles.modalTitle}>Jogos Já Existem!</h3>
                </div>

                <div className={styles.modalContent}>
                  <div className={styles.conflictInfo}>
                    <div className={styles.conflictStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statNumber}>
                          {conflictInfo.existingGames}
                        </span>
                        <span className={styles.statLabel}>
                          Jogos já cadastrados
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statNumber}>
                          {conflictInfo.newGames}
                        </span>
                        <span className={styles.statLabel}>Jogos novos</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statNumber}>
                          {conflictInfo.totalGames}
                        </span>
                        <span className={styles.statLabel}>Total de jogos</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.warningBox}>
                    <AlertTriangle size={20} />
                    <div>
                      <strong>⚠️ Atenção!</strong>
                      <p>
                        Alguns jogos que você está tentando gerar já existem no
                        sistema. Se continuar, você terá jogos duplicados.
                      </p>
                    </div>
                  </div>

                  <div className={styles.optionsBox}>
                    <h4>O que você gostaria de fazer?</h4>
                    <ul>
                      <li>
                        <strong>Cancelar:</strong> Voltar e excluir os jogos
                        existentes primeiro
                      </li>
                      <li>
                        <strong>Continuar:</strong> Gerar mesmo assim (criará
                        duplicatas)
                      </li>
                    </ul>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button
                    onClick={() => setShowConflictModal(false)}
                    className={styles.cancelModalButton}
                  >
                    <X size={16} />
                    Cancelar
                  </button>
                  <button
                    onClick={forcarGeracao}
                    className={styles.continueButton}
                  >
                    <Check size={16} />
                    Continuar Mesmo Assim
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

import React, { useState, useEffect } from "react";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getToken } from "next-auth/jwt";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import ChartsSection from "../../../components/dashboard/ChartsSection";
import QuickActions from "../../../components/dashboard/QuickActions";
import Select, { SingleValue } from "react-select";
import { PrismaClient } from "@prisma/client";
import {
  BarChart3,
  RefreshCw,
  Calendar,
  Target,
  Users,
  User,
  TrendingUp,
  Activity,
  Zap,
  Clock,
} from "lucide-react";
import styles from "./styles.module.scss";

type Client = {
  id: string;
  name: string;
};

type DashboardStats = {
  totalJogos: number;
  jogosFinalizados: number;
  jogosAgendados: number;
  jogosEmAndamento: number;
  totalEquipes: number;
  totalJogadores: number;
  totalGols: number;
  totalEventos: number;
  progresso: number;
  eventos: {
    gols: number;
    cartoesAmarelos: number;
    cartoesVermelhos: number;
    assistencias: number;
  };
};

type ChartsData = {
  golsPorRodada: Array<{ rodada: number; gols: number }>;
  distribuicaoCartoes: { amarelos: number; vermelhos: number };
  topArtilheiros: Array<{
    nome: string;
    numero: number;
    equipe: string;
    gols: number;
  }>;
  topEquipes: Array<{ nome: string; gols: number }>;
  status: { finalizados: number; agendamento: number; emAndamento: number };
};

interface DashboardProps {
  initialStats: DashboardStats;
  initialCharts: ChartsData;
  hasPermission: boolean;
  clients: Client[];
  initialClientId: string | null;
  isAdmin: boolean;
}

function KpiCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon}>{icon}</div>
      <div className={styles.kpiContent}>
        <span className={styles.kpiNumber}>{value}</span>
        <span className={styles.kpiLabel}>{title}</span>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}

export default function Dashboard({
  initialStats,
  initialCharts,
  hasPermission,
  clients,
  initialClientId,
  isAdmin,
}: DashboardProps) {
  const router = useRouter();

  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [charts, setCharts] = useState<ChartsData>(initialCharts);
  const [loading, setLoading] = useState(false);

  // Modal state para mensagens
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const closeModal = () => setModalMessage(null);

  // Dropdown options: Sempre com "Todos os clientes" no topo
  const options = [
    { label: "Todos os clientes", value: "" },
    ...clients.map((c) => ({ label: c.name, value: c.id })),
  ];

  // Valor selecionado garantindo que exista uma opção
  const selectedOption =
    options.find((opt) => opt.value === (clientId ?? "")) || options[0];

  const handleClientChange = (
    option: SingleValue<{ label: string; value: string }>
  ) => {
    const val = option?.value ?? "";
    const newClientId = val === "" ? null : val;
    setClientId(newClientId);

    router.push(
      {
        pathname: "/admin/dashboard",
        query: newClientId ? { clientId: newClientId } : {},
      },
      undefined,
      { shallow: true }
    );
  };

  // Atualiza dados sempre que clientId mudar
  useEffect(() => {
    if (clientId === undefined) return;

    async function fetchDashboard() {
      setLoading(true);
      try {
        const [statsRes, chartsRes] = await Promise.all([
          fetch(`/api/admin/dashboard/stats?clientId=${clientId ?? ""}`, {
            cache: "no-store",
          }),
          fetch(`/api/admin/dashboard/charts?clientId=${clientId ?? ""}`, {
            cache: "no-store",
          }),
        ]);
        if (!statsRes.ok || !chartsRes.ok) {
          setModalMessage("Erro ao carregar dados do dashboard.");
          setLoading(false);
          return;
        }
        const newStats = await statsRes.json();
        const newCharts = await chartsRes.json();
        setStats(newStats);
        setCharts(newCharts);
      } catch {
        setModalMessage("Erro de comunicação com o servidor.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [clientId]);

  if (!hasPermission) {
    return (
      <Layout>
        <div className={styles.accessDenied}>
          <h2>Acesso negado</h2>
          <p>Você não tem permissão para acessar este dashboard.</p>
          <button onClick={() => router.push("/")}>Voltar ao início</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.headerIcon}>
              <BarChart3 size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Dashboard Administrativo</h1>
              <p className={styles.subtitle}>Visão geral do campeonato</p>
            </div>

            <button
              aria-label="Atualizar dados"
              disabled={loading}
              className={styles.refreshButton}
              onClick={async () => {
                setLoading(true);
                try {
                  const [statsRes, chartsRes] = await Promise.all([
                    fetch(
                      `/api/admin/dashboard/stats?clientId=${clientId ?? ""}`,
                      { cache: "no-store" }
                    ),
                    fetch(
                      `/api/admin/dashboard/charts?clientId=${clientId ?? ""}`,
                      { cache: "no-store" }
                    ),
                  ]);
                  if (!statsRes.ok || !chartsRes.ok) {
                    setModalMessage("Erro ao atualizar dados.");
                    return;
                  }
                  setStats(await statsRes.json());
                  setCharts(await chartsRes.json());
                } catch {
                  setModalMessage("Erro de comunicação.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <RefreshCw
                size={20}
                className={loading ? styles.spinning : undefined}
              />
            </button>
          </div>

          {hasPermission && isAdmin && (
            <div className={styles.clientSelector}>
              <label htmlFor="client-select">Selecionar cliente</label>
              <Select
                inputId="client-select"
                options={options}
                value={selectedOption}
                onChange={handleClientChange}
                isClearable={false}
                placeholder="Selecione um cliente"
                className={styles.select}
                classNamePrefix="react-select"
                menuPortalTarget={
                  typeof window !== "undefined" ? document.body : undefined
                }
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
              />
            </div>
          )}
        </header>

        <section className={styles.kpiGrid}>
          <KpiCard
            icon={<Calendar />}
            title="Total de Jogos"
            value={stats.totalJogos}
            detail={`${stats.jogosFinalizados} finalizados • ${stats.jogosAgendados} agendados`}
          />
          <KpiCard
            icon={<Target />}
            title="Total de Gols"
            value={stats.totalGols}
            detail={
              stats.jogosFinalizados
                ? (stats.totalGols / stats.jogosFinalizados).toFixed(2) +
                  " por jogo"
                : "0"
            }
          />
          <KpiCard
            icon={<Users />}
            title="Equipes"
            value={stats.totalEquipes}
            detail="Ativas"
          />
          <KpiCard
            icon={<User />}
            title="Jogadores"
            value={stats.totalJogadores}
            detail="Ativos"
          />
          <KpiCard
            icon={<TrendingUp />}
            title="Progresso"
            value={`${stats.progresso ?? 0}%`}
          />
          <KpiCard
            icon={<Activity />}
            title="Eventos"
            value={stats.totalEventos}
            detail={`${
              stats.eventos.cartoesAmarelos + stats.eventos.cartoesVermelhos
            } cartões • ${stats.eventos.assistencias}`}
          />
          <KpiCard
            icon={<Clock />}
            title="Jogos em andamento"
            value={stats.jogosEmAndamento}
          />
          <KpiCard
            icon={<Zap />}
            title="Eventos de jogo"
            value={
              stats.eventos.gols +
              stats.eventos.cartoesAmarelos +
              stats.eventos.cartoesVermelhos
            }
            detail={`${stats.eventos.gols} gols`}
          />
        </section>

        <QuickActions
          clientId={clientId} // <-- passe aqui o clientId atual do estado
          onStatsUpdate={async () => {
            setLoading(true);
            try {
              const [statsRes, chartsRes] = await Promise.all([
                fetch(`/api/admin/dashboard/stats?clientId=${clientId ?? ""}`, {
                  cache: "no-store",
                }),
                fetch(
                  `/api/admin/dashboard/charts?clientId=${clientId ?? ""}`,
                  {
                    cache: "no-store",
                  }
                ),
              ]);
              if (!statsRes.ok || !chartsRes.ok) {
                setModalMessage("Erro ao atualizar dados.");
                return;
              }
              setStats(await statsRes.json());
              setCharts(await chartsRes.json());
            } catch {
              setModalMessage("Erro de comunicação.");
            } finally {
              setLoading(false);
            }
          }}
        />

        <ChartsSection data={charts} />

        {/* Modal de mensagem */}
        {modalMessage && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <p>{modalMessage}</p>
              <button onClick={() => setModalMessage(null)}>Fechar</button>
            </div>
          </div>
        )}

        <footer className={styles.statusBar}>
          <div>Última atualização: {new Date().toLocaleString()}</div>
          <div className={styles.onlineStatus}>
            <span className={styles.onlineIndicator} /> Sistema Online
          </div>
        </footer>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (
  ctx: GetServerSidePropsContext
) => {
  const prisma = new PrismaClient();

  try {
    const token = await getToken({ req: ctx.req });

    if (!token) {
      await prisma.$disconnect();
      return {
        redirect: { destination: "/auth/login", permanent: false },
      };
    }

    const role = ((token.role as string) || "").toLowerCase();
    const isAdmin = role === "admin" || role === "superadmin";

    const queryClientId =
      typeof ctx.query.clientId === "string" && ctx.query.clientId.trim() !== ""
        ? ctx.query.clientId.trim()
        : null;

    const effectiveClientId =
      isAdmin &&
      queryClientId &&
      queryClientId !== "null" &&
      queryClientId !== "undefined"
        ? queryClientId
        : isAdmin
        ? undefined // admin principal sem filtro = todos clientes
        : (token.clientId as string);

    const filter = effectiveClientId ? { clientId: effectiveClientId } : {};

    let permissions: any = {};
    if (token.permissions) {
      permissions =
        typeof token.permissions === "string"
          ? JSON.parse(token.permissions)
          : token.permissions;
    }

    let hasPermission = false;
    if (typeof permissions === "object")
      hasPermission = permissions.dashboard?.visualizar ?? false;
    if (!hasPermission && (role === "admin" || role === "superadmin"))
      hasPermission = true;

    if (!hasPermission) {
      await prisma.$disconnect();
      return {
        props: {
          hasPermission: false,
          initialStats: {
            totalJogos: 0,
            jogosFinalizados: 0,
            jogosAgendados: 0,
            jogosEmAndamento: 0,
            totalEquipes: 0,
            totalJogadores: 0,
            totalGols: 0,
            totalEventos: 0,
            progresso: 0,
            eventos: {
              gols: 0,
              cartoesAmarelos: 0,
              cartoesVermelhos: 0,
              assistencias: 0,
            },
          },
          initialCharts: {
            golsPorRodada: [],
            distribuicaoCartoes: { amarelos: 0, vermelhos: 0 },
            topArtilheiros: [],
            topEquipes: [],
            status: { finalizados: 0, agendamento: 0, emAndamento: 0 },
          },
          clients: [],
          initialClientId: null,
          isAdmin,
        },
      };
    }

    const clients = isAdmin
      ? await prisma.client.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

    const [
      totalJogos,
      jogosFinalizados,
      jogosAgendados,
      totalEquipes,
      totalJogadores,
      totalEventos,
      jogos,
      eventos,
      chartJogos,
      chartCartoes,
      chartArtilheiros,
      chartJogosDetalhes,
    ] = await Promise.all([
      prisma.jogo.count({ where: filter }),
      prisma.jogo.count({
        where: { ...filter, placarA: { not: null }, placarB: { not: null } },
      }),
      prisma.jogo.count({ where: { ...filter, placarA: null, placarB: null } }),
      prisma.equipe.count({ where: filter }),
      prisma.jogador.count({ where: { ...filter, ativo: true } }),
      prisma.eventoJogo.count({ where: filter }),
      prisma.jogo.findMany({
        where: { ...filter, placarA: { not: null }, placarB: { not: null } },
        select: {
          placarA: true,
          placarB: true,
          equipeA: { select: { nome: true } },
          equipeB: { select: { nome: true } },
        },
      }),
      prisma.eventoJogo.groupBy({
        by: ["tipo"],
        where: filter,
        _count: { tipo: true },
      }),
      prisma.jogo.groupBy({
        by: ["rodada"],
        where: { ...filter, placarA: { not: null }, placarB: { not: null } },
        _sum: { placarA: true, placarB: true },
        orderBy: { rodada: "asc" },
      }),
      prisma.eventoJogo.groupBy({
        by: ["tipo"],
        where: {
          ...filter,
          tipo: { in: ["cartao_amarelo", "cartao_vermelho"] },
        },
        _count: { tipo: true },
      }),
      prisma.eventoJogo.groupBy({
        by: ["jogadorId"],
        where: { ...filter, tipo: "gol" },
        _count: { jogadorId: true },
        orderBy: { _count: { jogadorId: "desc" } },
        take: 5,
      }),
      prisma.jogo.findMany({
        where: { ...filter, placarA: { not: null }, placarB: { not: null } },
        select: {
          placarA: true,
          placarB: true,
          equipeA: { select: { nome: true } },
          equipeB: { select: { nome: true } },
        },
      }),
    ]);

    const totalGols = jogos.reduce(
      (acc, jogo) => acc + (jogo.placarA ?? 0) + (jogo.placarB ?? 0),
      0
    );

    type EventoCount = { tipo: string; _count: { tipo: number } };
    const eventosTyped = eventos as EventoCount[];
    const eventCounts = eventosTyped.reduce<Record<string, number>>(
      (acc, ev) => {
        acc[ev.tipo] = ev._count.tipo;
        return acc;
      },
      {}
    );

    const progresso = totalJogos
      ? Math.round((jogosFinalizados / totalJogos) * 100)
      : 0;

    const initialStats: DashboardStats = {
      totalJogos,
      jogosFinalizados,
      jogosAgendados,
      jogosEmAndamento: totalJogos - jogosFinalizados - jogosAgendados,
      totalEquipes,
      totalJogadores,
      totalGols,
      totalEventos,
      progresso,
      eventos: {
        gols: eventCounts["gol"] ?? 0,
        cartoesAmarelos: eventCounts["cartao_amarelo"] ?? 0,
        cartoesVermelhos: eventCounts["cartao_vermelho"] ?? 0,
        assistencias: eventCounts["assistencia"] ?? 0,
      },
    };

    const distribuicaoCartoes = {
      amarelos: eventCounts["cartao_amarelo"] ?? 0,
      vermelhos: eventCounts["cartao_vermelho"] ?? 0,
    };

    const golsPorRodada = chartJogos.map((item) => ({
      rodada: item.rodada,
      gols: (item._sum.placarA ?? 0) + (item._sum.placarB ?? 0),
    }));

    const jogadorIds = chartArtilheiros.map((x) => x.jogadorId);
    const jogadoresInfo = await prisma.jogador.findMany({
      where: { id: { in: jogadorIds } },
      select: {
        id: true,
        nome: true,
        numero: true,
        equipe: { select: { nome: true } },
      },
    });

    const topArtilheiros = chartArtilheiros.map((item) => ({
      nome:
        jogadoresInfo.find((j) => j.id === item.jogadorId)?.nome ??
        "Desconhecido",
      numero: jogadoresInfo.find((j) => j.id === item.jogadorId)?.numero ?? 0,
      equipe:
        jogadoresInfo.find((j) => j.id === item.jogadorId)?.equipe?.nome ??
        "Sem equipe",
      gols: item._count.jogadorId,
    }));

    const golsEquipeMap = new Map<string, { nome: string; gols: number }>();
    for (const jogo of chartJogosDetalhes) {
      const nomeA = jogo.equipeA.nome;
      const nomeB = jogo.equipeB.nome;

      if (!golsEquipeMap.has(nomeA))
        golsEquipeMap.set(nomeA, { nome: nomeA, gols: 0 });
      if (!golsEquipeMap.has(nomeB))
        golsEquipeMap.set(nomeB, { nome: nomeB, gols: 0 });

      golsEquipeMap.get(nomeA)!.gols += jogo.placarA ?? 0;
      golsEquipeMap.get(nomeB)!.gols += jogo.placarB ?? 0;
    }
    const topEquipes = Array.from(golsEquipeMap.values())
      .sort((a, b) => b.gols - a.gols)
      .slice(0, 5);

    const status = {
      finalizados: initialStats.jogosFinalizados,
      agendamento: initialStats.jogosAgendados,
      emAndamento: initialStats.jogosEmAndamento,
    };

    const initialCharts: ChartsData = {
      golsPorRodada,
      distribuicaoCartoes,
      topArtilheiros,
      topEquipes,
      status,
    };

    await prisma.$disconnect();

    return {
      props: {
        initialStats,
        initialCharts,
        hasPermission: true,
        clients,
        initialClientId: effectiveClientId ?? null,
        isAdmin,
      },
    };
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
};

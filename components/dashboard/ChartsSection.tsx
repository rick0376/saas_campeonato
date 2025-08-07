import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import styles from "./ChartsSection.module.scss";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Interface corrigida: nomes exatos de propriedades devem ser topEquipes e status (sem sufixos)
interface ChartsData {
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
}

interface ChartsSectionProps {
  data: ChartsData;
}

export default function ChartsSection({ data }: ChartsSectionProps) {
  // Validações para evitar erros caso dados estejam vazios ou indefinidos
  const hasGolsRodada = data?.golsPorRodada?.length > 0;
  const hasTopArtilheiros = data?.topArtilheiros?.length > 0;
  const hasTopEquipes = data?.topEquipes?.length > 0;

  // 1. Gráfico Gols por Rodada
  const golsRodadaData = {
    labels: hasGolsRodada
      ? data.golsPorRodada.map((item) => `Rodada ${item.rodada}`)
      : [],
    datasets: [
      {
        label: "Gols",
        data: hasGolsRodada ? data.golsPorRodada.map((item) => item.gols) : [],
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  // 2. Distribuição Cartões
  const cartoesData = {
    labels: ["Cartões Amarelos", "Cartões Vermelhos"],
    datasets: [
      {
        data: [
          data.distribuicaoCartoes?.amarelos ?? 0,
          data.distribuicaoCartoes?.vermelhos ?? 0,
        ],
        backgroundColor: ["#eab308", "#ef4444"],
        borderColor: ["#ca8a04", "#dc2626"],
        borderWidth: 2,
      },
    ],
  };

  // 3. Top Artilheiros
  const artilheirosData = {
    labels: hasTopArtilheiros
      ? data.topArtilheiros.map((art) => `${art.nome} (#${art.numero})`)
      : [],
    datasets: [
      {
        label: "Gols",
        data: hasTopArtilheiros
          ? data.topArtilheiros.map((art) => art.gols)
          : [],
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  // 4. Top Equipes
  const equipesData = {
    labels: hasTopEquipes ? data.topEquipes.map((eq) => eq.nome) : [],
    datasets: [
      {
        label: "Gols",
        data: hasTopEquipes ? data.topEquipes.map((eq) => eq.gols) : [],
        backgroundColor: "rgba(139, 92, 246, 0.8)",
        borderColor: "rgba(139, 92, 246, 1)",
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  // 5. Status Jogos
  const statusData = {
    labels: ["Finalizados", "Agendamento", "Em Andamento"],
    datasets: [
      {
        data: [
          data.status?.finalizados ?? 0,
          data.status?.agendamento ?? 0,
          data.status?.emAndamento ?? 0,
        ],
        backgroundColor: ["#10b981", "#eab308", "#ef4444"],
        borderColor: ["#059669", "#ca8a04", "#dc2626"],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" as const } },
    scales: { y: { beginAtZero: true } },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const } },
  };

  return (
    <div className={styles.chartsSection}>
      <h2 className={styles.sectionTitle}>Análise Visual dos Dados</h2>

      <div className={styles.chartsGrid}>
        {/* Gols por Rodada */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Gols por Rodada</h3>
          <div className={styles.chartContainer}>
            <Bar data={golsRodadaData} options={chartOptions} />
          </div>
        </div>

        {/* Distribuição de Cartões */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Distribuição de Cartões</h3>
          <div className={styles.chartContainer}>
            <Pie data={cartoesData} options={pieOptions} />
          </div>
        </div>

        {/* Top Artilheiros */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Top 5 Artilheiros</h3>
          <div className={styles.chartContainer}>
            <Bar data={artilheirosData} options={chartOptions} />
          </div>
        </div>

        {/* Top Equipes */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Top 5 Equipes - Gols</h3>
          <div className={styles.chartContainer}>
            <Bar data={equipesData} options={chartOptions} />
          </div>
        </div>

        {/* Status dos Jogos */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Status dos Jogos</h3>
          <div className={styles.chartContainer}>
            <Doughnut data={statusData} options={pieOptions} />
          </div>
        </div>

        {/* Ranking de Artilheiros */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Ranking de Artilheiros</h3>
          <div className={styles.rankingList}>
            {hasTopArtilheiros
              ? data.topArtilheiros.map((art, index) => (
                  <div key={index} className={styles.rankingItem}>
                    <span className={styles.position}>{index + 1}º</span>
                    <div className={styles.playerInfo}>
                      <strong>{art.nome}</strong>
                      <span>
                        #{art.numero} - {art.equipe}
                      </span>
                    </div>
                    <span className={styles.goals}>{art.gols} gols</span>
                  </div>
                ))
              : "Nenhum dado disponível"}
          </div>
        </div>
      </div>
    </div>
  );
}

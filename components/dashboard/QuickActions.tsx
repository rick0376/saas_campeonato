import React, { useState } from "react";
import { useRouter } from "next/router";
import {
  Plus,
  Users,
  User,
  Trophy,
  RefreshCw,
  FileText,
  Zap,
} from "lucide-react";
import CreateGameModal from "./CreateGameModal";
import styles from "./QuickActions.module.scss";

interface QuickActionsProps {
  onStatsUpdate?: () => void;
  clientId?: string | null;
}

export default function QuickActions({
  onStatsUpdate,
  clientId,
}: QuickActionsProps) {
  const router = useRouter();
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalClientId, setModalClientId] = useState<string | null>(null);

  const closeModal = () => setModalMessage(null);

  const handleRecalculateStats = async () => {
    setRecalculating(true);
    try {
      const response = await fetch("/api/admin/dashboard/recalculate-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: clientId ? JSON.stringify({ clientId }) : undefined,
      });

      if (!response.ok) {
        let errorText = "Erro ao recalcular";
        try {
          errorText = await response.text();
        } catch {}
        throw new Error(errorText);
      }

      if (onStatsUpdate) onStatsUpdate();
      setModalMessage("Estatísticas recalculadas com sucesso!");
    } catch (error: any) {
      setModalMessage(error?.message || "Erro ao recalcular estatísticas");
    } finally {
      setRecalculating(false);
    }
  };

  const goTo = (route: string) => {
    if (clientId) {
      router.push(`${route}?clientId=${clientId}`);
    } else {
      router.push(route);
    }
  };

  const quickActions = [
    {
      id: "manage-teams",
      title: "Gerenciar Equipes",
      description: "Adicionar, editar ou remover equipes",
      icon: <Users size={24} />,
      color: "#3b82f6",
      action: () => goTo("/equipes"),
      loading: false,
    },
    {
      id: "manage-players",
      title: "Gerenciar Jogadores",
      description: "Cadastro e edição de jogadores",
      icon: <User size={24} />,
      color: "#8b5cf6",
      action: () => goTo("/jogadores"),
      loading: false,
    },
    {
      id: "classification",
      title: "Ver Classificação",
      description: "Tabela completa de classificação",
      icon: <Trophy size={24} />,
      color: "#eab308",
      action: () => goTo("/classificacao"), // já implementa clientId na query
      loading: false,
    },
    {
      id: "reports",
      title: "Relatórios",
      description: "Estatísticas e relatórios detalhados",
      icon: <FileText size={24} />,
      color: "#ef4444",
      action: () => goTo("/relatorios"),
      loading: false,
    },
  ];

  return (
    <>
      <div className={styles.quickActions}>
        <div className={styles.sectionHeader}>
          <Zap size={24} />
          <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
          <p className={styles.sectionSubtitle}>
            Acesso direto às principais funcionalidades administrativas
          </p>
        </div>

        <div className={styles.actionsGrid}>
          {quickActions.map(
            ({ id, title, description, icon, color, action, loading }) => (
              <button
                key={id}
                onClick={action}
                disabled={loading}
                className={styles.actionCard}
                style={{ "--action-color": color } as React.CSSProperties}
                aria-busy={loading}
                aria-live="polite"
              >
                <div className={styles.actionIcon}>
                  <div className={loading ? styles.spinning : undefined}>
                    {icon}
                  </div>
                </div>
                <div className={styles.actionContent}>
                  <h3 className={styles.actionTitle}>{title}</h3>
                  <p className={styles.actionDescription}>
                    {loading ? "Processando..." : description}
                  </p>
                </div>
                <div className={styles.actionArrow}>→</div>
              </button>
            )
          )}
        </div>

        {showCreateGame && (
          <CreateGameModal
            clientId={modalClientId}
            onClose={() => setShowCreateGame(false)}
            onSuccess={() => {
              setShowCreateGame(false);
              if (onStatsUpdate) onStatsUpdate();
            }}
          />
        )}
      </div>

      {modalMessage && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <p>{modalMessage}</p>
            <button onClick={closeModal} className={styles.modalButton}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import Link from "next/link";
import { Settings, Plus, Edit, Zap, ArrowRight, X } from "lucide-react";
import { usePermissions } from "../../../hooks/usePermissions";
import { useSession } from "next-auth/react";
import {
  CONFIG_SECTIONS,
  ADMIN_CONFIG_SECTIONS,
} from "../../../config/navigation";
import styles from "./styles.module.scss";

export default function Config() {
  const { data: session } = useSession();
  const router = useRouter();
  const { canView } = usePermissions();
  const isAdmin = session?.user?.role === "admin";
  const [showJogosModal, setShowJogosModal] = useState(false);

  // Verifica permissão para visualizar config
  if (!canView("config")) {
    return (
      <Layout>
        <div className={styles.accessDenied}>
          <h2>❌ Acesso Negado</h2>
          <p>
            Você não tem permissão para acessar esta página de Configurações.
          </p>
          <button onClick={() => router.push("/home")}>Voltar ao Início</button>
        </div>
      </Layout>
    );
  }

  const allConfigSections = [
    ...CONFIG_SECTIONS,
    ...(isAdmin ? ADMIN_CONFIG_SECTIONS : []),
  ];

  const handleCadastrarJogo = () => {
    setShowJogosModal(true);
  };

  const handleManualCadastro = () => {
    setShowJogosModal(false);
    router.push("/cadastrar/jogos");
  };

  const handleAutomaticoCadastro = () => {
    setShowJogosModal(false);
    router.push("/cadastrar/jogos/gerar-jogos");
  };

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Settings size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Configurações do Sistema</h1>
              <p className={styles.subtitle}>
                Gerencie todas as configurações do seu campeonato
              </p>
            </div>
          </div>

          <div className={styles.sections}>
            {allConfigSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  <p className={styles.sectionDescription}>
                    {section.description}
                  </p>
                </div>

                <div className={styles.grid}>
                  {section.items.map((item, itemIndex) => {
                    const IconComponent = item.icon;

                    // Verificar se é o item "Cadastrar Jogo"
                    if (
                      item.title === "Cadastrar Jogo" ||
                      item.href === "/cadastrar/jogos"
                    ) {
                      return (
                        <div
                          key={itemIndex}
                          onClick={handleCadastrarJogo}
                          className={`${styles.card} ${styles[item.color]} ${
                            styles.clickable
                          }`}
                        >
                          <div className={styles.cardIcon}>
                            <IconComponent size={20} />
                          </div>
                          <div className={styles.cardContent}>
                            <h3 className={styles.cardTitle}>{item.title}</h3>
                            <p className={styles.cardDescription}>
                              {item.description}
                            </p>
                          </div>
                          <div className={styles.cardArrow}>
                            <ArrowRight size={20} />
                          </div>
                        </div>
                      );
                    }

                    // Para outros itens, manter o Link normal
                    return (
                      <Link
                        key={itemIndex}
                        href={item.href}
                        className={`${styles.card} ${styles[item.color]}`}
                      >
                        <div className={styles.cardIcon}>
                          <IconComponent size={20} />
                        </div>
                        <div className={styles.cardContent}>
                          <h3 className={styles.cardTitle}>{item.title}</h3>
                          <p className={styles.cardDescription}>
                            {item.description}
                          </p>
                        </div>
                        <div className={styles.cardArrow}>
                          <ArrowRight size={20} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Seção de informações */}
          <div className={styles.infoSection}>
            <div className={styles.infoCard}>
              <h3 className={styles.infoTitle}>💡 Dicas</h3>
              <ul className={styles.infoList}>
                <li>Cadastre primeiro os grupos antes das equipes</li>
                <li>Configure todas as equipes antes de criar os jogos</li>
                <li>Use a função de backup regularmente</li>
                <li>
                  Verifique as configurações antes de iniciar o campeonato
                </li>
              </ul>
            </div>
          </div>

          {/* Modal de Escolha de Cadastro */}
          {showJogosModal && (
            <div
              className={styles.modalOverlay}
              onClick={() => setShowJogosModal(false)}
            >
              <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>
                    Como deseja cadastrar jogos?
                  </h2>
                  <button
                    onClick={() => setShowJogosModal(false)}
                    className={styles.modalClose}
                    aria-label="Fechar modal"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className={styles.modalContent}>
                  <p className={styles.modalDescription}>
                    Escolha a forma que preferir para adicionar jogos ao
                    campeonato:
                  </p>

                  <div className={styles.optionsGrid}>
                    {/* Opção Manual */}
                    <div
                      className={styles.optionCard}
                      onClick={handleManualCadastro}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleManualCadastro();
                      }}
                    >
                      <div className={styles.optionIcon}>
                        <Edit size={32} />
                      </div>
                      <div className={styles.optionContent}>
                        <h3 className={styles.optionTitle}>Cadastro Manual</h3>
                        <p className={styles.optionDescription}>
                          Cadastre jogos individualmente com controle total
                          sobre cada partida
                        </p>
                        <ul className={styles.optionFeatures}>
                          <li>✅ Controle total das informações</li>
                          <li>✅ Ideal para poucos jogos</li>
                          <li>✅ Personalização completa</li>
                        </ul>
                      </div>
                      <div className={styles.optionButton}>
                        <span>Cadastrar Manualmente</span>
                        <ArrowRight size={16} />
                      </div>
                    </div>

                    {/* Opção Automática */}
                    <div
                      className={styles.optionCard}
                      onClick={handleAutomaticoCadastro}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleAutomaticoCadastro();
                      }}
                    >
                      <div className={styles.optionIcon}>
                        <Zap size={32} />
                      </div>
                      <div className={styles.optionContent}>
                        <h3 className={styles.optionTitle}>
                          Geração Automática
                        </h3>
                        <p className={styles.optionDescription}>
                          Gere todos os confrontos automaticamente baseado nas
                          equipes e grupos
                        </p>
                        <ul className={styles.optionFeatures}>
                          <li>⚡ Rápido e eficiente</li>
                          <li>⚡ Ideal para muitos jogos</li>
                          <li>⚡ Distribuição inteligente</li>
                        </ul>
                      </div>
                      <div className={styles.optionButton}>
                        <span>Gerar Automaticamente</span>
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

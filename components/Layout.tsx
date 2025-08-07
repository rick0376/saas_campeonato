import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import Nav from "./Nav";
import ProtectedRoute from "./ProtectedRoute";
import { useSessionValidator } from "../hooks/useSessionValidator"; // ← NOVO
import { Loader2 } from "lucide-react";
import styles from "./Layout.module.scss";

interface LayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  showNav?: boolean;
}

export default function Layout({
  children,
  requireAuth = true,
  showNav = true,
}: LayoutProps) {
  const { data: session, status } = useSession();

  // ✅ NOVO: Validação automática de sessão
  useSessionValidator();

  // Loading state
  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingLogo}>
            <img
              src="/imagens/logo.png"
              alt="Logo"
              className={styles.logoImage}
            />
          </div>
          <Loader2 size={32} className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Carregando sistema...</p>
        </div>
      </div>
    );
  }

  const content = (
    <div className={styles.wrapper}>
      {showNav && (
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.logoArea}>
              <div className={styles.logoContainer}>
                <img
                  src="/imagens/logo2.png"
                  alt="Logo LHP Cup Manager"
                  className={styles.logo}
                  onError={(e) => {
                    e.currentTarget.src = "/imagens/escudo.png";
                  }}
                />
              </div>
              <div className={styles.titleContainer}>
                <span className={styles.title}>LHP Cup Manager</span>
                <span className={styles.subtitle}>Sistema de Campeonatos</span>
              </div>
            </div>
            <Nav />
          </div>
        </header>
      )}

      <main className={styles.main}>
        <div className={styles.mainContent}>{children}</div>
      </main>

      {showNav && (
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <div className={styles.footerInfo}>
              <span className={styles.footerText}>
                © {new Date().getFullYear()} LHP Cup Manager
              </span>
              <span className={styles.footerVersion}>v2.0</span>
            </div>
            {session && (
              <div className={styles.footerUser}>
                <span className={styles.footerUserText}>
                  Logado como: {session.user?.name || session.user?.email}
                </span>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );

  if (requireAuth) {
    return <ProtectedRoute>{content}</ProtectedRoute>;
  }

  return content;
}

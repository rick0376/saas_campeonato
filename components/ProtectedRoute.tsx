import { ReactNode, useEffect } from "react";
import { useRouter } from "next/router";
import {
  usePermissions,
  PermissionModule,
  PermissionAction,
} from "../hooks/usePermissions";
import { Shield, Lock, AlertTriangle, ArrowLeft } from "lucide-react";
import styles from "./ProtectedRoute.module.scss";

interface ProtectedRouteProps {
  children: ReactNode;
  module?: string;
  action?: string;
  requireSuperAdmin?: boolean;
  requireClientAdmin?: boolean;
  requireAdmin?: boolean;
  fallbackComponent?: ReactNode;
  redirectTo?: string;
  showBackButton?: boolean;
}

export default function ProtectedRoute({
  children,
  module,
  action = "visualizar",
  requireSuperAdmin = false,
  requireClientAdmin = false,
  requireAdmin = false,
  fallbackComponent,
  redirectTo,
  showBackButton = true,
}: ProtectedRouteProps) {
  const router = useRouter();
  const {
    hasPermission,
    isSuperAdmin,
    isClientAdmin,
    isAdmin,
    isLoading,
    isAuthenticated,
    userInfo,
  } = usePermissions();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && redirectTo) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Verificando permissões...</p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (redirectTo) {
      return (
        <div className={styles.loadingContainer}>
          <p>Redirecionando...</p>
        </div>
      );
    }

    return (
      fallbackComponent || (
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedContent}>
            <Lock size={64} className={styles.accessDeniedIcon} />
            <h2>Acesso Negado</h2>
            <p>Você precisa estar logado para acessar esta área.</p>
            <div className={styles.accessDeniedActions}>
              <button
                onClick={() => router.push("/auth/login")}
                className={styles.loginButton}
              >
                Fazer Login
              </button>
            </div>
          </div>
        </div>
      )
    );
  }

  // Check super admin requirement
  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      fallbackComponent || (
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedContent}>
            <Shield size={64} className={styles.accessDeniedIcon} />
            <h2>Acesso Restrito</h2>
            <p>Esta área é exclusiva para Super Administradores.</p>
            <p>
              Você está logado como: <strong>{userInfo?.email}</strong>
            </p>
            <div className={styles.accessDeniedActions}>
              {showBackButton && (
                <button
                  onClick={() => router.back()}
                  className={styles.backButton}
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>
              )}
              <button
                onClick={() => router.push("/home")}
                className={styles.homeButton}
              >
                Ir para Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    );
  }

  // Check client admin requirement
  if (requireClientAdmin && !isClientAdmin && !isSuperAdmin) {
    return (
      fallbackComponent || (
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedContent}>
            <AlertTriangle size={64} className={styles.accessDeniedIcon} />
            <h2>Acesso Restrito</h2>
            <p>Esta área é exclusiva para Administradores de Cliente.</p>
            <p>
              Você está logado como: <strong>{userInfo?.email}</strong>
            </p>
            <div className={styles.accessDeniedActions}>
              {showBackButton && (
                <button
                  onClick={() => router.back()}
                  className={styles.backButton}
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>
              )}
              <button
                onClick={() => router.push("/home")}
                className={styles.homeButton}
              >
                Ir para Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    );
  }

  // Check general admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      fallbackComponent || (
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedContent}>
            <Lock size={64} className={styles.accessDeniedIcon} />
            <h2>Acesso Restrito</h2>
            <p>Esta área é exclusiva para Administradores.</p>
            <p>
              Você está logado como: <strong>{userInfo?.email}</strong>
            </p>
            <div className={styles.accessDeniedActions}>
              {showBackButton && (
                <button
                  onClick={() => router.back()}
                  className={styles.backButton}
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>
              )}
              <button
                onClick={() => router.push("/home")}
                className={styles.homeButton}
              >
                Ir para Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    );
  }

  // Check specific permission
  if (module && !hasPermission(module, action)) {
    return (
      fallbackComponent || (
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedContent}>
            <Lock size={64} className={styles.accessDeniedIcon} />
            <h2>Permissão Insuficiente</h2>
            <p>
              Você não tem permissão para <strong>{action}</strong> em{" "}
              <strong>{module}</strong>.
            </p>
            <p>Entre em contato com o administrador para solicitar acesso.</p>
            <p>
              Usuário: <strong>{userInfo?.email}</strong>
            </p>
            <div className={styles.accessDeniedActions}>
              {showBackButton && (
                <button
                  onClick={() => router.back()}
                  className={styles.backButton}
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>
              )}
              <button
                onClick={() => router.push("/home")}
                className={styles.homeButton}
              >
                Ir para Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    );
  }

  // Access granted
  return <>{children}</>;
}

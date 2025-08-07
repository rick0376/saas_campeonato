import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, ReactNode } from "react";
import { usePermissions } from "../hooks/usePermissions";
import { Loader2, Lock, AlertTriangle } from "lucide-react";

interface RouteGuardProps {
  module: string;
  action: string;
  children: ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

export const RouteGuard = ({
  module,
  action,
  children,
  redirectTo = "/",
  showAccessDenied = false,
}: RouteGuardProps) => {
  const { data: session, status } = useSession();
  const { has, isSuperAdmin, isLoading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    // ✅ Aguardar carregamento completo
    if (status === "loading" || isLoading) return;

    // ✅ Não autenticado - redirecionar para login
    if (!session) {
      router.push("/auth/login");
      return;
    }

    // ✅ Super admin tem acesso total - não verificar permissões
    if (isSuperAdmin) return;

    // ✅ Verificar permissão específica
    if (!has(module, action)) {
      if (showAccessDenied) {
        // Não redirecionar, apenas mostrar mensagem
        return;
      }
      router.push(redirectTo);
      return;
    }
  }, [
    session,
    status,
    has,
    module,
    action,
    router,
    redirectTo,
    isSuperAdmin,
    isLoading,
    showAccessDenied,
  ]);

  // ✅ Estado de carregamento melhorado
  if (status === "loading" || isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          gap: "1rem",
          padding: "2rem",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        }}
      >
        <Loader2
          size={32}
          style={{
            animation: "spin 1s linear infinite",
            color: "#3b82f6",
          }}
        />
        <p
          style={{
            color: "#64748b",
            margin: 0,
            fontSize: "1rem",
            fontWeight: "500",
          }}
        >
          Verificando permissões...
        </p>
      </div>
    );
  }

  // ✅ Não autenticado
  if (!session) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          gap: "1rem",
          padding: "2rem",
          background: "linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)",
        }}
      >
        <Lock size={48} style={{ color: "#f59e0b" }} />
        <h2 style={{ color: "#92400e", margin: 0, fontSize: "1.5rem" }}>
          Acesso Restrito
        </h2>
        <p style={{ color: "#b45309", margin: 0, textAlign: "center" }}>
          Você precisa estar logado para acessar esta página.
        </p>
        <p style={{ color: "#b45309", margin: 0, fontSize: "0.875rem" }}>
          Redirecionando para login...
        </p>
      </div>
    );
  }

  // ✅ Super admin sempre tem acesso
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // ✅ Sem permissão
  if (!has(module, action)) {
    if (showAccessDenied) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            gap: "1.5rem",
            padding: "2rem",
            textAlign: "center",
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
          }}
        >
          <AlertTriangle size={64} style={{ color: "#ef4444" }} />
          <div>
            <h2
              style={{
                color: "#dc2626",
                margin: "0 0 0.5rem 0",
                fontSize: "1.75rem",
                fontWeight: "700",
              }}
            >
              Acesso Negado
            </h2>
            <p
              style={{
                color: "#991b1b",
                margin: "0 0 1rem 0",
                fontSize: "1.125rem",
                fontWeight: "500",
              }}
            >
              Você não tem permissão para <strong>{action}</strong> em{" "}
              <strong>{module}</strong>
            </p>
            <p
              style={{
                color: "#b91c1c",
                margin: 0,
                fontSize: "0.875rem",
              }}
            >
              Entre em contato com o administrador para solicitar acesso.
            </p>
          </div>
          <button
            onClick={() => router.push(redirectTo)}
            style={{
              padding: "0.875rem 2rem",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 6px 16px rgba(59, 130, 246, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(59, 130, 246, 0.3)";
            }}
          >
            Voltar ao Início
          </button>
        </div>
      );
    }

    // Não renderiza nada se vai redirecionar
    return null;
  }

  // ✅ Tem permissão - renderizar children
  return <>{children}</>;
};

// ✅ NOVO: Componente de proteção mais simples para componentes específicos
interface ProtectedComponentProps {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedComponent = ({
  module,
  action,
  children,
  fallback = null,
}: ProtectedComponentProps) => {
  const { has, isSuperAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
    );
  }

  if (isSuperAdmin || has(module, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

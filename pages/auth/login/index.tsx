import { signIn, getSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  LogIn,
  Building2,
  ArrowLeft,
  Crown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import styles from "./styles.module.scss";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
}

export default function Login() {
  const router = useRouter();
  const { clientId, admin, reason } = router.query;
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);

  // Determinar se é login de Super Admin
  const isSuperAdminLogin = admin === "true";

  // ✅ FUNÇÃO PARA BUSCAR NOME DO CLIENTE
  const fetchClientName = async (id: string) => {
    try {
      setLoadingClient(true);
      // Buscar na lista de clientes públicos
      const response = await fetch("/api/clients/public");
      if (response.ok) {
        const clients = await response.json();
        const client = clients.find((c: any) => c.id === id);

        if (client) {
          setClientInfo({
            id: client.id,
            name: client.name,
            slug: client.slug,
            description: client.description,
          });
        } else {
          setClientInfo({
            id: id,
            name: "Cliente não encontrado",
            slug: "cliente",
            description: "Cliente não encontrado",
          });
        }
      }
    } catch (error) {
      setClientInfo({
        id: id,
        name: "Cliente selecionado",
        slug: "cliente",
        description: "Faça login para acessar este cliente",
      });
    } finally {
      setLoadingClient(false);
    }
  };

  useEffect(() => {
    if (isSuperAdminLogin) {
      setLoadingClient(false);
      return;
    }

    // ✅ CAPTURAR clientId da URL e definir como selecionado
    if (clientId && typeof clientId === "string") {
      setSelectedClientId(clientId);
      fetchClientName(clientId);
    } else {
      setLoadingClient(false);
    }
  }, [clientId, admin, isSuperAdminLogin, reason]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        clientId: isSuperAdminLogin ? undefined : selectedClientId, // ✅ USAR selectedClientId
      });

      if (res?.ok) {
        // Para Super Admin, redirecionar para painel administrativo
        if (isSuperAdminLogin) {
          setTimeout(() => {
            router.push("/admin/clients");
          }, 500);
          return;
        }

        // Para usuários com clientId, redirecionar para dashboard
        if (selectedClientId) {
          setTimeout(() => {
            router.push("/home");
          }, 500);
        } else {
          // Para usuários normais sem clientId
          setTimeout(async () => {
            const session = await getSession();
            router.push("/home");
          }, 1000);
        }
      } else {
        // Tratamento de erros de login
        if (res?.error === "CredentialsSignin") {
          setError(
            "Email ou senha inválidos. Se você tem certeza que suas credenciais estão corretas, verifique se está acessando o cliente correto."
          );
        } else {
          setError("Erro ao fazer login. Tente novamente.");
        }
      }
    } catch (err) {
      setError("Erro interno do servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToClients = () => {
    router.push("/");
  };

  const getReasonMessage = () => {
    switch (reason) {
      case "permissions-updated":
        return {
          type: "info",
          title: "Permissões Atualizadas",
          message:
            "Suas permissões foram atualizadas por um administrador. Faça login novamente para continuar com as novas configurações.",
        };
      case "session-expired":
        return {
          type: "warning",
          title: "Sessão Expirada",
          message:
            "Sua sessão expirou por motivos de segurança. Por favor, faça login novamente.",
        };
      case "unauthorized":
        return {
          type: "error",
          title: "Acesso Negado",
          message:
            "Você não tem permissão para acessar essa área. Faça login com as credenciais corretas.",
        };
      default:
        return null;
    }
  };

  const reasonMessage = getReasonMessage();

  if (loadingClient) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.loginContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>
              {isSuperAdminLogin
                ? "Preparando login de Super Administrador..."
                : "Carregando informações do cliente..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.loginContainer}>
        <button
          className={styles.backButton}
          onClick={handleBackToClients}
          type="button"
        >
          <ArrowLeft size={16} />
          Voltar aos Clientes
        </button>

        {/* Mensagem baseada no reason */}
        {reasonMessage && (
          <div
            className={`${styles.reasonMessage} ${styles[reasonMessage.type]}`}
          >
            <div className={styles.reasonIcon}>
              {reasonMessage.type === "info" && <Info size={20} />}
              {reasonMessage.type === "warning" && <AlertTriangle size={20} />}
              {reasonMessage.type === "error" && <Shield size={20} />}
            </div>
            <div className={styles.reasonContent}>
              <h4 className={styles.reasonTitle}>{reasonMessage.title}</h4>
              <p className={styles.reasonText}>{reasonMessage.message}</p>
            </div>
          </div>
        )}

        <div className={styles.loginHeader}>
          <div className={styles.logoContainer}>
            {isSuperAdminLogin ? (
              <div className={styles.superAdminLogo}>
                <Crown size={48} />
              </div>
            ) : clientInfo?.logo ? (
              <img
                src={clientInfo.logo}
                alt={`Logo ${clientInfo.name}`}
                className={styles.logo}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <img
                src="/imagens/logo2.png"
                alt="Logo"
                className={styles.logo}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>

          <h1 className={styles.loginTitle}>
            {isSuperAdminLogin
              ? "Super Administrador"
              : clientInfo
              ? clientInfo.name
              : "LHP Cup Manager"}
          </h1>

          {/* ✅ APENAS: Cliente: Nome do Cliente */}
          {!isSuperAdminLogin && clientInfo && (
            <div className={styles.clientSimple}>
              <span>Cliente: {clientInfo.name}</span>
            </div>
          )}

          {isSuperAdminLogin ? (
            <div className={styles.superAdminInfo}>
              <Shield size={16} />
              <span>Acesso Total - Painel Administrativo</span>
            </div>
          ) : (
            clientInfo && (
              <div className={styles.clientInfo}>
                <Building2 size={16} />
                <span>Acessando: {clientInfo.name}</span>
              </div>
            )
          )}

          <p className={styles.loginSubtitle}>
            {isSuperAdminLogin
              ? "Faça login com suas credenciais de administrador"
              : "Faça login para acessar o sistema"}
          </p>
        </div>

        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label className={styles.loginLabel}>
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              className={styles.loginInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                isSuperAdminLogin ? "admin@lhp.com" : "Digite seu email"
              }
              required
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.loginLabel}>
              <Lock size={16} />
              Senha
            </label>
            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                className={styles.loginInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                disabled={loading}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.loginError}>
              <span>{error}</span>
            </div>
          )}

          {isSuperAdminLogin && (
            <div className={styles.superAdminWarning}>
              <Shield size={16} />
              <span>
                Você está fazendo login como Super Administrador. Terá acesso
                total ao sistema.
              </span>
            </div>
          )}

          <button
            type="submit"
            className={`${styles.loginButton} ${
              loading ? styles.loading : ""
            } ${isSuperAdminLogin ? styles.superAdminButton : ""}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className={styles.spinner}></div>
                {isSuperAdminLogin ? "Autenticando..." : "Entrando..."}
              </>
            ) : (
              <>
                {isSuperAdminLogin ? <Crown size={16} /> : <LogIn size={16} />}
                {isSuperAdminLogin ? "Entrar como Super Admin" : "Entrar"}
              </>
            )}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} LHP Cup Manager - Championship Platform
          </p>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  const { clientId, admin, reason } = context.query;

  // Se já está logado, verificar tipo de usuário e redirecionar adequadamente
  if (session) {
    const user = session.user as any;

    // Preservar clientId no redirecionamento
    if (clientId) {
      return {
        redirect: {
          destination: `/?clientId=${clientId}`,
          permanent: false,
        },
      };
    }

    // Se é super admin, redirecionar para painel admin
    if (user?.role === "admin" && user?.clientId === null) {
      return {
        redirect: {
          destination: "/admin/clients",
          permanent: false,
        },
      };
    } else {
      // Se é usuário comum, redirecionar para dashboard
      return {
        redirect: {
          destination: "/home",
          permanent: false,
        },
      };
    }
  }

  return {
    props: {},
  };
};

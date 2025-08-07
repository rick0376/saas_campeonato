import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import {
  Building2,
  Users,
  Search,
  LogIn,
  Settings,
  Crown,
  Eye,
} from "lucide-react";
import styles from "./styles.module.scss";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  _count: {
    grupos: number;
    users: number;
  };
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Se já está logado como Super Admin, redirecionar para painel admin
    if (session) {
      const user = session.user as any;
      if (user?.role === "admin" && user?.clientId === null) {
        console.log("Super Admin detectado, redirecionando para painel");
        router.push("/admin/clients");
        return;
      }
    }

    fetchClients();
  }, [session]);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients/public");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    console.log("Selecionando cliente para login:", clientId);
    router.push(`/auth/login?clientId=${clientId}`);
  };

  const handleSuperAdminLogin = () => {
    console.log("Iniciando login como Super Admin");
    router.push("/auth/login?admin=true");
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === "loading" || (session && loading)) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoSection}>
            <img
              src="/imagens/logo2.png"
              alt="LHP Cup Manager"
              className={styles.logo}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className={styles.headerText}>
              <h1>LHP Cup Manager</h1>
              <p>Sistema de Gerenciamento de Campeonatos</p>
            </div>
          </div>

          {/* Botão de Login Super Admin */}
          <button
            className={styles.superAdminButton}
            onClick={handleSuperAdminLogin}
            title="Login como Super Administrador"
          >
            <Crown size={20} />
            Super Admin
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.welcomeSection}>
          <h2>Selecione um Cliente</h2>
          <p>
            Escolha o campeonato que deseja acessar ou faça login como Super
            Administrador
          </p>
        </div>

        {/* Barra de Pesquisa */}
        <div className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Pesquisar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Grid de Clientes */}
        {loading ? (
          <div className={styles.loadingClients}>
            <div className={styles.spinner}></div>
            <p>Carregando clientes...</p>
          </div>
        ) : (
          <div className={styles.clientsGrid}>
            {filteredClients.map((client) => (
              <Link
                key={client.id}
                href={`/jogos-publicos?clientId=${client.id}`}
                className={styles.clientCard}
              >
                <div className={styles.clientHeader}>
                  <div className={styles.clientLogo}>
                    {client.logo ? (
                      <img src={client.logo} alt={client.name} />
                    ) : (
                      <Building2 size={32} />
                    )}
                  </div>
                  <h3>{client.name}</h3>
                </div>

                <div className={styles.clientDescription}>
                  <p>{client.description || "Campeonato de futebol"}</p>
                </div>

                <div className={styles.clientStats}>
                  <div className={styles.stat}>
                    <Users size={16} />
                    <span>{client._count.users} usuários</span>
                  </div>
                  <div className={styles.stat}>
                    <Building2 size={16} />
                    <span>{client._count.grupos} grupos</span>
                  </div>
                </div>

                <div className={styles.clientAction}>
                  <Eye size={16} />
                  <span>Ver Campeonato</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {filteredClients.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <Building2 size={48} />
            <h3>Nenhum cliente encontrado</h3>
            <p>
              Não há clientes cadastrados ou nenhum corresponde à sua pesquisa
            </p>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} LHP Cup Manager - Sistema LHPSYSTEMS</p>
      </footer>
    </div>
  );
}

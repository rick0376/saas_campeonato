import { useState } from "react";
import { getToken } from "next-auth/jwt";
import { GetServerSideProps } from "next";
import Layout from "../../components/Layout";
//import { ProtectedComponent } from "../../components/ProtectedComponent";
import { prisma } from "../../lib/prisma";
import {
  Download,
  Database,
  Users,
  HardDrive,
  Shield,
  Building2,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import styles from "./styles.module.scss";

type Cliente = {
  id: string;
  name: string;
  description: string | null;
};

type BackupProps = {
  session: any;
  clientes: Cliente[];
  isAdmin: boolean;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const token = await getToken({ req: context.req });

  if (!token) {
    return { redirect: { destination: "/auth/login", permanent: false } };
  }

  let clientes: Cliente[] = [];
  const isAdmin = token.role === "admin";

  if (isAdmin) {
    clientes = await prisma.client.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    });
  }

  return {
    props: {
      session: {
        user: {
          id: token.sub,
          email: token.email,
          role: token.role,
          clientId: token.clientId,
        },
      },
      clientes,
      isAdmin,
    },
  };
};

export default function BackupPage({
  session,
  clientes,
  isAdmin,
}: BackupProps) {
  const [loading, setLoading] = useState(false);
  const [tipoBackup, setTipoBackup] = useState<
    "cliente_especifico" | "banco_completo"
  >("cliente_especifico");
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const handleBackup = async () => {
    setLoading(true);
    setMessage("");

    try {
      const body: any = {};

      if (isAdmin) {
        body.tipoBackup = tipoBackup;
        if (tipoBackup === "cliente_especifico") {
          if (!clienteSelecionado) {
            setMessage("Selecione um cliente para fazer backup");
            setMessageType("error");
            setLoading(false);
            return;
          }
          body.clienteId = clienteSelecionado;
        }
      }

      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Erro ao gerar backup");
      }

      // Baixar arquivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${Date.now()}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);

      setMessage("Backup gerado com sucesso!");
      setMessageType("success");
    } catch (error) {
      setMessage("Erro ao gerar backup");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <HardDrive size={32} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Sistema de Backup</h1>
              <p className={styles.subtitle}>
                {isAdmin
                  ? "Faça backup de clientes específicos ou do banco completo"
                  : "Faça backup dos seus dados"}
              </p>
            </div>
          </div>

          {/* Informações do usuário */}
          <div className={styles.userInfo}>
            <div className={styles.userCard}>
              <div className={styles.userIcon}>
                {isAdmin ? <Shield size={24} /> : <Building2 size={24} />}
              </div>
              <div className={styles.userDetails}>
                <h3 className={styles.userName}>{session.user?.email}</h3>
                <span className={styles.userRole}>
                  {isAdmin ? "Super Administrador" : "Usuário do Cliente"}
                </span>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          {message && (
            <div className={`${styles.message} ${styles[messageType]}`}>
              {messageType === "success" ? (
                <CheckCircle size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
              <span>{message}</span>
            </div>
          )}

          {/* Opções de Backup */}
          <div className={styles.backupSection}>
            <h3 className={styles.sectionTitle}>
              <Database size={20} />
              Opções de Backup
            </h3>

            {isAdmin ? (
              // ✅ OPÇÕES PARA ADMINISTRADOR
              <div className={styles.adminOptions}>
                <div className={styles.backupTypeGrid}>
                  <label className={styles.backupTypeCard}>
                    <input
                      type="radio"
                      name="tipoBackup"
                      value="cliente_especifico"
                      checked={tipoBackup === "cliente_especifico"}
                      onChange={(e) => setTipoBackup(e.target.value as any)}
                    />
                    <div className={styles.cardContent}>
                      <div className={styles.cardIcon}>
                        <Building2 size={24} />
                      </div>
                      <h4>Backup de Cliente</h4>
                      <p>Fazer backup dos dados de um cliente específico</p>
                    </div>
                  </label>

                  <label className={styles.backupTypeCard}>
                    <input
                      type="radio"
                      name="tipoBackup"
                      value="banco_completo"
                      checked={tipoBackup === "banco_completo"}
                      onChange={(e) => setTipoBackup(e.target.value as any)}
                    />
                    <div className={styles.cardContent}>
                      <div className={styles.cardIcon}>
                        <Database size={24} />
                      </div>
                      <h4>Backup Completo</h4>
                      <p>Fazer backup de todo o banco de dados</p>
                    </div>
                  </label>
                </div>

                {/* Seleção de Cliente */}
                {tipoBackup === "cliente_especifico" && (
                  <div className={styles.clienteSelector}>
                    <label className={styles.label}>
                      <Users size={16} />
                      Selecionar Cliente:
                    </label>
                    <select
                      value={clienteSelecionado}
                      onChange={(e) => setClienteSelecionado(e.target.value)}
                      className={styles.select}
                    >
                      <option value="">Escolha um cliente...</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              // ✅ OPÇÕES PARA USUÁRIO NORMAL
              <div className={styles.clientOptions}>
                <div className={styles.clientBackupCard}>
                  <div className={styles.cardIcon}>
                    <Building2 size={32} />
                  </div>
                  <div className={styles.cardContent}>
                    <h4>Backup dos Seus Dados</h4>
                    <p>
                      Faça backup de todas as informações relacionadas ao seu
                      cliente: equipes, grupos, jogos e usuários.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Informações de Segurança */}
            <div className={styles.securityInfo}>
              <div className={styles.securityCard}>
                <Shield size={20} />
                <div>
                  <h4>Segurança dos Dados</h4>
                  <ul>
                    <li>✅ Backup seguro e criptografado</li>
                    <li>✅ Apenas seus dados são incluídos</li>
                    <li>✅ Formato padrão para restauração</li>
                    <li>✅ Histórico de modificações preservado</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botão de Backup */}
            <div className={styles.actions}>
              <button
                onClick={handleBackup}
                disabled={
                  loading ||
                  (isAdmin &&
                    tipoBackup === "cliente_especifico" &&
                    !clienteSelecionado)
                }
                className={styles.backupButton}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Gerando Backup...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    {isAdmin
                      ? `Fazer ${
                          tipoBackup === "banco_completo"
                            ? "Backup Completo"
                            : "Backup do Cliente"
                        }`
                      : "Fazer Backup dos Meus Dados"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

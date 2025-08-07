import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Layout from "../../../../components/Layout";
import { ProtectedComponent } from "../../../../components/ProtectedComponent";
import {
  Building2,
  Save,
  ArrowLeft,
  Upload,
  X,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Globe,
  Clock,
  Shield,
  Image as ImageIcon,
  Loader2,
  FileText,
} from "lucide-react";
import styles from "./styles.module.scss";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  logoPublicId?: string;
  description?: string;
  domain?: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
  validDays?: number;
  maxUsers?: number;
  maxTeams?: number;
  isExpired?: boolean;
  daysUntilExpiration?: number;
  _count: {
    users: number;
    grupos: number;
    equipes: number;
    jogos: number;
  };
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  domain: string;
  status: string;
  validDays: number;
  maxUsers: number;
  maxTeams: number;
  logo?: File | null;
}

export default function EditClient() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    description: "",
    domain: "",
    status: "ACTIVE",
    validDays: 365,
    maxUsers: 10,
    maxTeams: 8,
    logo: null,
  });

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${id}`);
      if (response.ok) {
        const data = await response.json();
        setClient(data);
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || "",
          domain: data.domain || "",
          status: data.status,
          validDays: data.validDays || 365,
          maxUsers: data.maxUsers || 10,
          maxTeams: data.maxTeams || 8,
          logo: null,
        });
        if (data.logo) {
          setLogoPreview(data.logo);
        }
      } else {
        setError("Erro ao carregar dados do cliente");
      }
    } catch (error) {
      setError("Erro ao carregar dados do cliente");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "validDays" || name === "maxUsers" || name === "maxTeams"
          ? parseInt(value) || 0
          : value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validações
      if (file.size > 10 * 1024 * 1024) {
        setError("Arquivo muito grande. Máximo 10MB.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Por favor, selecione apenas arquivos de imagem.");
        return;
      }

      setError(""); // Limpar erro anterior
      setFormData((prev) => ({ ...prev, logo: file }));

      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, logo: null }));
    setLogoPreview(client?.logo || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // ✅ CORREÇÃO: Usar FormData para enviar arquivo
      const formDataToSend = new FormData();

      // Dados básicos
      formDataToSend.append("name", formData.name);
      formDataToSend.append("slug", formData.slug);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("domain", formData.domain);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("validDays", formData.validDays.toString());
      formDataToSend.append("maxUsers", formData.maxUsers.toString());
      formDataToSend.append("maxTeams", formData.maxTeams.toString());

      // ✅ CORREÇÃO: Apenas adicionar logo se há arquivo novo
      if (formData.logo) {
        formDataToSend.append("logo", formData.logo);
        console.log("📸 Enviando novo arquivo de logo");
      } else {
        console.log("📋 Nenhum arquivo novo - mantendo logo atual");
      }

      // ✅ ENVIAR COMO MULTIPART (não JSON)
      const response = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        body: formDataToSend, // SEM Content-Type (deixar o browser definir)
      });

      if (response.ok) {
        setSuccess("Cliente atualizado com sucesso!");
        setTimeout(() => {
          router.push("/admin/clients");
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Erro ao atualizar cliente");
      }
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      setError("Erro ao atualizar cliente");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <ProtectedComponent module="clientes" action="editar">
          <div className={styles.loadingContainer}>
            <Loader2 size={48} className={styles.spinner} />
            <p>Carregando dados do cliente...</p>
          </div>
        </ProtectedComponent>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <ProtectedComponent module="clientes" action="editar">
          <div className={styles.errorContainer}>
            <AlertTriangle size={48} />
            <h2>Cliente não encontrado</h2>
            <p>O cliente solicitado não foi encontrado.</p>
            <button
              onClick={() => router.push("/admin/clients")}
              className={styles.backButton}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          </div>
        </ProtectedComponent>
      </Layout>
    );
  }

  return (
    <Layout>
      <ProtectedComponent module="clientes" action="editar">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <button
              onClick={() => router.push("/admin/clients")}
              className={styles.backButton}
            >
              <ArrowLeft size={20} />
              Voltar
            </button>
            <div className={styles.headerContent}>
              <div className={styles.headerIcon}>
                <Building2 size={32} />
              </div>
              <div>
                <h1 className={styles.title}>Editar Cliente</h1>
                <p className={styles.subtitle}>
                  Atualize as informações do cliente {client.name}
                </p>
              </div>
            </div>
          </div>

          {/* Indicador de pasta organizada */}
          <div className={styles.organizationInfo}>
            <div className={styles.folderIndicator}>
              <ImageIcon size={16} />
              <span>
                📁 Logo será salva em:{" "}
                <code>lhpsystems/clientes/{client.slug}/</code>
              </span>
            </div>
          </div>

          {/* Mensagens */}
          {error && (
            <div className={styles.errorMessage}>
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className={styles.successMessage}>
              <CheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          {/* Estatísticas do Cliente */}
          <div className={styles.clientStats}>
            <div className={styles.statCard}>
              <Users size={24} />
              <div>
                <span className={styles.statNumber}>{client._count.users}</span>
                <span className={styles.statLabel}>Usuários</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <Shield size={24} />
              <div>
                <span className={styles.statNumber}>
                  {client._count.equipes}
                </span>
                <span className={styles.statLabel}>Equipes</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <Calendar size={24} />
              <div>
                <span className={styles.statNumber}>{client._count.jogos}</span>
                <span className={styles.statLabel}>Jogos</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <Clock size={24} />
              <div>
                <span className={styles.statNumber}>
                  {client.daysUntilExpiration || 0}
                </span>
                <span className={styles.statLabel}>Dias restantes</span>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Seção Básica */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Informações Básicas</h3>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Building2 size={16} />
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Empresa XYZ"
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Globe size={16} />
                    Slug/Identificador
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="Ex: empresa-xyz"
                    className={styles.input}
                    required
                    readOnly
                    title="Slug não pode ser alterado para manter organização das pastas"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Globe size={16} />
                    Domínio
                  </label>
                  <input
                    type="text"
                    name="domain"
                    value={formData.domain}
                    onChange={handleInputChange}
                    placeholder="Ex: empresa.com"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Shield size={16} />
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={styles.select}
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="SUSPENDED">Suspenso</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FileText size={16} />
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descrição do cliente..."
                  className={styles.textarea}
                  rows={3}
                />
              </div>
            </div>

            {/* Seção de Limites */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Limites e Configurações</h3>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Clock size={16} />
                    Dias de Validade
                  </label>
                  <input
                    type="number"
                    name="validDays"
                    value={formData.validDays}
                    onChange={handleInputChange}
                    min="1"
                    max="3650"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Users size={16} />
                    Máximo de Usuários
                  </label>
                  <input
                    type="number"
                    name="maxUsers"
                    value={formData.maxUsers}
                    onChange={handleInputChange}
                    min="1"
                    max="1000"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Shield size={16} />
                    Máximo de Equipes
                  </label>
                  <input
                    type="number"
                    name="maxTeams"
                    value={formData.maxTeams}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            {/* Seção de Logo */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Logo do Cliente</h3>

              <div className={styles.logoSection}>
                {logoPreview ? (
                  <div className={styles.logoPreview}>
                    <img src={logoPreview} alt="Logo preview" />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className={styles.removeLogoButton}
                      disabled={saving}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <ImageIcon size={48} />
                    <p>Nenhum logo selecionado</p>
                  </div>
                )}

                <div className={styles.logoUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className={styles.fileInput}
                    id="logo-upload"
                    disabled={saving}
                  />
                  <label htmlFor="logo-upload" className={styles.uploadButton}>
                    <Upload size={16} />
                    Alterar Logo
                  </label>
                  <small className={styles.uploadHint}>
                    PNG, JPG ou GIF até 10MB. Será salvo em:
                    lhpsystems/clientes/{client.slug}/
                  </small>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => router.push("/admin/clients")}
                className={styles.cancelButton}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </ProtectedComponent>
    </Layout>
  );
}

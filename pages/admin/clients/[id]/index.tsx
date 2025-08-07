import { useState, useEffect, FormEvent } from "react";
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
  role?: string;
  adminUserId?: string;
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
  role: string;
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
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    description: "",
    domain: "",
    status: "ACTIVE",
    role: "user",
    validDays: 365,
    maxUsers: 10,
    maxTeams: 20,
    logo: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchClient() {
      setLoading(true);
      try {
        const res = await fetch(`/api/clients/${id}`);
        if (!res.ok) throw new Error("Erro ao carregar dados do cliente");
        const data = await res.json();
        const roleNormalized =
          data.role &&
          typeof data.role === "string" &&
          data.role.toLowerCase() === "admin"
            ? "admin"
            : "user";
        setClient(data);
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || "",
          domain: data.domain || "",
          status: data.status,
          role: roleNormalized,
          validDays: data.validDays || 365,
          maxUsers: data.maxUsers || 10,
          maxTeams: data.maxTeams || 20,
          logo: null,
        });
        setLogoPreview(data.logo || null);
      } catch {
        setError("Erro ao carregar dados do cliente");
      } finally {
        setLoading(false);
      }
    }
    fetchClient();
  }, [id]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "validDays" || name === "maxUsers" || name === "maxTeams"
          ? Number(value)
          : value,
    }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Selecione apenas arquivos de imagem.");
      return;
    }
    setError("");
    setFormData((prev) => ({ ...prev, logo: file }));
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setFormData((prev) => ({ ...prev, logo: null }));
    setLogoPreview(client?.logo || null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const clientData = new FormData();
      clientData.append("name", formData.name);
      clientData.append("slug", formData.slug);
      clientData.append("description", formData.description);
      clientData.append("domain", formData.domain);
      clientData.append("status", formData.status);
      clientData.append("role", formData.role);
      clientData.append("validDays", formData.validDays.toString());
      clientData.append("maxUsers", formData.maxUsers.toString());
      clientData.append("maxTeams", formData.maxTeams.toString());
      if (formData.logo) clientData.append("logo", formData.logo);

      const responseClient = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        body: clientData,
      });

      if (!responseClient.ok) {
        const json = await responseClient.json();
        setError(json.message || "Erro ao atualizar cliente");
        setSaving(false);
        return;
      }

      if (client?.adminUserId) {
        const responseUser = await fetch(
          `/api/usuarios/${client.adminUserId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: formData.role }),
          }
        );

        if (!responseUser.ok) {
          setError("Erro ao atualizar o papel do usuário administrador");
          setSaving(false);
          return;
        }
      }

      setSuccess("Cliente e usuário administrador atualizados com sucesso!");
      setTimeout(() => router.push("/admin/clients"), 1500);
    } catch {
      setError("Erro inesperado ao atualizar dados");
    } finally {
      setSaving(false);
    }
  }

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
              <ArrowLeft size={16} /> Voltar
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
          <div className={styles.header}>
            <button
              onClick={() => router.push("/admin/clients")}
              className={styles.backButton}
            >
              <ArrowLeft size={20} /> Voltar
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

          <div className={styles.organizationInfo}>
            <div className={styles.folderIndicator}>
              <ImageIcon size={16} />
              <span>
                Logo será salva em:{" "}
                <code>lhpsystems/clientes/{client.slug}/</code>
              </span>
            </div>
          </div>

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

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Informações Básicas</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Building2 size={16} /> Nome do Cliente
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Globe size={16} /> Slug/Identificador
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    className={styles.input}
                    readOnly
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Globe size={16} /> Domínio
                  </label>
                  <input
                    type="text"
                    name="domain"
                    value={formData.domain}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Shield size={16} /> Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="SUSPENDED">Suspenso</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Shield size={16} /> Papel
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FileText size={16} /> Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={styles.textarea}
                  rows={3}
                ></textarea>
              </div>
            </div>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Limites e Configurações</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Clock size={16} /> Dias de Validade
                  </label>
                  <input
                    type="number"
                    name="validDays"
                    value={formData.validDays}
                    onChange={handleChange}
                    min={1}
                    max={3650}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Users size={16} /> Máximo de Usuários
                  </label>
                  <input
                    type="number"
                    name="maxUsers"
                    value={formData.maxUsers}
                    onChange={handleChange}
                    min={1}
                    max={1000}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Shield size={16} /> Máximo de Equipes
                  </label>
                  <input
                    type="number"
                    name="maxTeams"
                    value={formData.maxTeams}
                    onChange={handleChange}
                    min={1}
                    max={100}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
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
                    <Upload size={16} /> Alterar Logo
                  </label>
                  <small className={styles.uploadHint}>
                    PNG, JPG ou GIF até 10MB. Será salvo em:
                    lhpsystems/clientes/{client.slug}/
                  </small>
                </div>
              </div>
            </div>
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
                    <Loader2 size={16} className={styles.spinner} /> Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Salvar Alterações
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

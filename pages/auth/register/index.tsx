import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axios from "axios";
import {
  User,
  Mail,
  Lock,
  Shield,
  UserPlus,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import styles from "./styles.module.scss";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpar erro quando usuário começar a digitar
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validações básicas
    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError("Email é obrigatório");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("/api/auth/register", {
        email: formData.email,
        name: formData.name,
        password: formData.password,
        role: formData.role,
      });

      if (res.status === 200) {
        setSuccess("Cadastro realizado com sucesso!");
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao cadastrar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.registerCard}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/auth/login" className={styles.backButton}>
            <ArrowLeft size={20} />
          </Link>
          <div className={styles.headerIcon}>
            <UserPlus size={32} />
          </div>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Criar Conta</h1>
            <p className={styles.subtitle}>
              Cadastre-se no Sistema de Campeonato LHPSYSTEMS-2025
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className={styles.errorMessage}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={styles.successMessage}>
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Nome */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <User size={16} />
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={styles.input}
              placeholder="Digite seu nome completo"
              required
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={styles.input}
              placeholder="Digite seu email"
              required
              disabled={loading}
            />
          </div>

          {/* Senha */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <Lock size={16} />
              Senha
            </label>
            <div className={styles.passwordInput}>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={styles.input}
                placeholder="Digite sua senha"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <small className={styles.hint}>Mínimo de 6 caracteres</small>
          </div>

          {/* Tipo de Conta */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <Shield size={16} />
              Tipo de Conta
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange("role", e.target.value)}
              className={styles.select}
              disabled={loading}
            >
              <option value="user">👤 Usuário Comum</option>
              <option value="admin">⚡ Administrador</option>
            </select>
            <small className={styles.hint}>
              Administradores podem gerenciar jogos e estatísticas
            </small>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className={styles.spinner}></div>
                Cadastrando...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Criar Conta
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <p>
            Já tem uma conta?{" "}
            <Link href="/auth/login" className={styles.loginLink}>
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

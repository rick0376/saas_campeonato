"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  Menu,
  X,
  User,
  LogOut,
  AlertTriangle,
  Home,
  Users,
  Shield,
  Calendar,
  Trophy,
  Settings,
  BarChart3,
  UserPlus,
  UserCheck,
  Building2,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { CanView } from "./ProtectedComponent";
import { usePermissions } from "../hooks/usePermissions";
import styles from "./Nav.module.scss";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { isAdmin, isSuperAdmin, canAccessSuperAdminFeatures, canView } =
    usePermissions();

  // Fecha o sidebar ao clicar fora dele
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    setMenuOpen(false);
    await signOut({
      callbackUrl: "/",
      redirect: true,
    });
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Função para obter o tipo de usuário para exibição
  const getUserTypeDisplay = () => {
    if (isSuperAdmin) return "🌟 Super Admin";
    if (isAdmin) return "👑 Administrador";
    return "👤 Usuário";
  };

  return (
    <nav className={styles.nav}>
      {/* Menu desktop simplificado - apenas essencial */}
      <div className={styles.navEssentials}>
        {/* Área do usuário desktop */}
        {session && (
          <div className={styles.userArea}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                <User size={16} />
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>
                  {session.user?.name || session.user?.email}
                </span>
                <span className={styles.userRole}>{getUserTypeDisplay()}</span>
              </div>
            </div>

            <div className={styles.userActions}>
              <Link
                href="/settings/config"
                className={styles.userButton}
                title="Configurações"
              >
                <Settings size={16} />
              </Link>

              <button
                onClick={handleLogoutClick}
                className={styles.logoutButton}
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Menu hamburger */}
        <button
          className={styles.menuButton}
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <span className={styles.menuLabel}>Menu</span>
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay atrás do sidebar */}
      {menuOpen && <div className={styles.overlay} onClick={closeMenu} />}

      {/* Sidebar deslizante */}
      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${menuOpen ? styles.open : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Menu Principal</span>
          <button
            className={styles.closeButton}
            onClick={closeMenu}
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Informações do usuário no sidebar */}
        {session && (
          <div className={styles.sidebarUserInfo}>
            <div className={styles.sidebarUserAvatar}>
              <User size={24} />
            </div>
            <div className={styles.sidebarUserDetails}>
              <span className={styles.sidebarUserName}>
                {session.user?.name || session.user?.email}
              </span>
              <span className={styles.sidebarUserRole}>
                {getUserTypeDisplay()}
              </span>
            </div>
          </div>
        )}

        <div className={styles.sidebarLinks}>
          {/* ===== SEÇÃO PRINCIPAL ===== */}
          <Link href="/home" className={styles.sidebarLink} onClick={closeMenu}>
            <Home size={20} />
            Início
          </Link>

          <CanView module="dashboard">
            <Link
              href="/admin/dashboard"
              className={styles.sidebarLink}
              onClick={closeMenu}
            >
              <BarChart3 size={20} />
              Dashboard
            </Link>
          </CanView>

          <CanView module="equipes">
            <Link
              href="/equipes"
              className={styles.sidebarLink}
              onClick={closeMenu}
            >
              <Users size={20} />
              Equipes
            </Link>
          </CanView>

          <CanView module="jogadores">
            <Link
              href="/jogadores"
              className={styles.sidebarLink}
              onClick={closeMenu}
            >
              <UserCheck size={20} />
              Jogadores
            </Link>
          </CanView>

          <CanView module="grupos">
            <Link
              href="/grupos"
              className={styles.sidebarLink}
              onClick={closeMenu}
            >
              <Shield size={20} />
              Grupos
            </Link>
          </CanView>

          <CanView module="jogos">
            <Link
              href="/jogos"
              className={styles.sidebarLink}
              onClick={closeMenu}
            >
              <Calendar size={20} />
              Jogos
            </Link>
          </CanView>

          <CanView module="classificacao">
            <Link
              href="/classificacao"
              className={styles.sidebarLink}
              onClick={closeMenu}
            >
              <Trophy size={20} />
              Classificação
            </Link>
          </CanView>

          <CanView module="relatorios">
            <Link
              href="/relatorios"
              className={styles.sidebarLink}
              onClick={closeMenu}
            >
              <BarChart3 size={20} />
              Relatórios
            </Link>
          </CanView>

          {/* ===== SEÇÃO ADMINISTRATIVA ===== */}
          {/* Separador visual */}
          <div className={styles.menuSeparator}>
            <span className={styles.separatorLine}></span>
            <span className={styles.separatorText}>Administração</span>
            <span className={styles.separatorLine}></span>
          </div>

          {/* Usuários - apenas para admins */}
          {isAdmin && (
            <CanView module="usuarios">
              <Link
                href="/usuarios"
                className={styles.sidebarLink}
                onClick={closeMenu}
              >
                <UserPlus size={20} />
                Usuários
              </Link>
            </CanView>
          )}

          {/* Permissões - para super admin e admin de cliente */}
          {(isSuperAdmin || isAdmin) && (
            <Link
              href="/admin/permissoes"
              className={styles.sidebarLink}
              onClick={closeMenu}
            >
              <Shield size={20} />
              Permissões
            </Link>
          )}

          {/* ===== SEÇÃO SUPER ADMIN ===== */}
          {canAccessSuperAdminFeatures() && (
            <>
              {/* Separador visual */}
              <div className={styles.menuSeparator}>
                <span className={styles.separatorLine}></span>
                <span className={styles.separatorText}>Super Admin</span>
                <span className={styles.separatorLine}></span>
              </div>

              {/* Clientes - apenas para super admin */}
              <Link
                href="/admin/clients"
                className={styles.sidebarLink}
                onClick={closeMenu}
              >
                <Building2 size={20} />
                Clientes
              </Link>
            </>
          )}

          {/* ===== SEÇÃO SISTEMA ===== */}
          {/* Separador visual */}
          <div className={styles.menuSeparator}>
            <span className={styles.separatorLine}></span>
            <span className={styles.separatorText}>Sistema</span>
            <span className={styles.separatorLine}></span>
          </div>

          {/* Configurações - com proteção */}
          <CanView module="configuracoes">
            <Link
              href="/settings/config"
              className={styles.sidebarLink}
              onClick={closeMenu}
            >
              <Settings size={20} />
              Configurações
            </Link>
          </CanView>

          {/* Botão de logout no sidebar */}
          <button
            className={`${styles.sidebarLink} ${styles.logoutSidebarButton}`}
            onClick={handleLogoutClick}
          >
            <LogOut size={20} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Modal de confirmação de logout */}
      {showLogoutModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>
                <AlertTriangle size={24} />
              </div>
              <h3 className={styles.modalTitle}>Confirmar Logout</h3>
            </div>

            <div className={styles.modalContent}>
              <p className={styles.modalText}>
                Tem certeza que deseja sair do sistema?
              </p>
              <p className={styles.modalSubtext}>
                Você precisará fazer login novamente para acessar o sistema.
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={cancelLogout}
                className={`${styles.modalButton} ${styles.cancelButton}`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmLogout}
                className={`${styles.modalButton} ${styles.confirmButton}`}
              >
                <LogOut size={16} />
                Sim, sair
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

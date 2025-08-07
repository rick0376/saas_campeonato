import { useSession } from "next-auth/react";
import { useMemo } from "react";

export type UserRole = "admin" | "user" | "moderator" | "superadmin";

export type PermissionModule =
  | "dashboard"
  | "usuarios"
  | "equipes"
  | "jogadores"
  | "grupos"
  | "jogos"
  | "gerar-jogos"
  | "classificacao"
  | "relatorios"
  | "clientes"
  | "backup"
  | "configuracoes";

export type PermissionAction =
  | "visualizar"
  | "criar"
  | "editar"
  | "excluir"
  | "exportar";

interface UsePermissionsReturn {
  isSuperAdmin: boolean;
  isClientAdmin: boolean;
  isNormalUser: boolean;
  isAdmin: boolean;
  hasPermission: (module: string, action: string) => boolean;
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  has: (module: string, action: string) => boolean;
  canAccessSuperAdminFeatures: () => boolean;
  canAccessAdminFeatures: () => boolean;
  canManageClients: () => boolean;
  userInfo: {
    id: string;
    email: string;
    name?: string;
    role: string;
    clientId: string | null;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any;
  session: any;
}

export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession();

  const userInfo = useMemo(() => {
    if (!session?.user) return null;
    const user = session.user as any;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
    };
  }, [session]);

  const user = session?.user as any;

  const isSuperAdmin = useMemo(() => {
    return (
      user?.role === "superadmin" ||
      (user?.role === "admin" &&
        (user?.clientId === null ||
          user?.clientId === undefined ||
          user?.clientId === "null" ||
          user?.clientId === "undefined"))
    );
  }, [user]);

  const isClientAdmin = useMemo(() => {
    return (
      user?.role === "admin" &&
      user?.clientId !== null &&
      user?.clientId !== undefined &&
      user?.clientId !== "null" &&
      user?.clientId !== "undefined"
    );
  }, [user]);

  const isAdmin = useMemo(() => {
    return user?.role === "admin" || user?.role === "superadmin";
  }, [user]);

  const isNormalUser = useMemo(() => {
    return user?.role === "user";
  }, [user]);

  const hasPermission = useMemo(() => {
    return (module: string, action: string): boolean => {
      if (!session) return false;

      // Super admin tem acesso total a tudo
      if (isSuperAdmin) return true;

      // Verificação específica para gerar-jogos
      if (module === "gerar-jogos") {
        if (isClientAdmin) {
          try {
            const userPermissions = user?.permissoes;
            if (!userPermissions) return false;
            const permissions =
              typeof userPermissions === "string"
                ? JSON.parse(userPermissions)
                : userPermissions;
            return permissions["gerar-jogos"]?.[action] === true;
          } catch (error) {
            return false;
          }
        }
        // Para usuários normais, verificar permissões específicas
        try {
          const userPermissions = user?.permissoes;
          if (!userPermissions) return false;
          const permissions =
            typeof userPermissions === "string"
              ? JSON.parse(userPermissions)
              : userPermissions;
          return permissions["gerar-jogos"]?.[action] === true;
        } catch (error) {
          return false;
        }
      }

      // Admin de cliente tem acesso total ao seu cliente (exceto gerar-jogos que é específico)
      if (isClientAdmin) return true;

      // Verificar permissões específicas do usuário
      try {
        const userPermissions = user?.permissoes;
        if (!userPermissions) return false;

        const permissions =
          typeof userPermissions === "string"
            ? JSON.parse(userPermissions)
            : userPermissions;

        // ✅ CORREÇÃO: Para gerar-jogos, verificar também permissão de jogos
        if (module === "gerar-jogos") {
          return (
            permissions["gerar-jogos"]?.[action] === true ||
            permissions["jogos"]?.[action] === true
          );
        }

        return permissions[module]?.[action] === true;
      } catch (error) {
        console.error("Erro ao verificar permissões:", error);
        return false;
      }
    };
  }, [session, isSuperAdmin, isClientAdmin, user]);

  const canView = useMemo(() => {
    return (module: string): boolean => {
      return hasPermission(module, "visualizar");
    };
  }, [hasPermission]);

  const canCreate = useMemo(() => {
    return (module: string): boolean => {
      return hasPermission(module, "criar");
    };
  }, [hasPermission]);

  const canEdit = useMemo(() => {
    return (module: string): boolean => {
      return hasPermission(module, "editar");
    };
  }, [hasPermission]);

  const canDelete = useMemo(() => {
    return (module: string): boolean => {
      return hasPermission(module, "excluir");
    };
  }, [hasPermission]);

  const has = useMemo(() => {
    return (module: string, action: string): boolean => {
      return hasPermission(module, action);
    };
  }, [hasPermission]);

  const canAccessSuperAdminFeatures = useMemo(() => {
    return (): boolean => {
      return isSuperAdmin;
    };
  }, [isSuperAdmin]);

  const canAccessAdminFeatures = useMemo(() => {
    return (): boolean => {
      return isAdmin;
    };
  }, [isAdmin]);

  const canManageClients = useMemo(() => {
    return (): boolean => {
      return isSuperAdmin;
    };
  }, [isSuperAdmin]);

  return {
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    has,
    canAccessSuperAdminFeatures,
    canAccessAdminFeatures,
    canManageClients,
    isAdmin,
    isSuperAdmin,
    isClientAdmin,
    isNormalUser,
    userInfo,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    user: session?.user,
    session,
  };
}

export const getModuleFromRoute = (
  pathname: string
): PermissionModule | null => {
  const routeModuleMap: Record<string, PermissionModule> = {
    "/usuarios": "usuarios",
    "/admin/usuarios": "usuarios",
    "/equipes": "equipes",
    "/cadastrar/equipes": "equipes",
    "/update/equipes": "equipes",
    "/jogadores": "jogadores",
    "/cadastrar/jogadores": "jogadores",
    "/update/jogadores": "jogadores",
    "/grupos": "grupos",
    "/cadastrar/grupos": "grupos",
    "/update/grupos": "grupos",
    "/jogos": "jogos",
    "/cadastrar/jogos": "jogos",
    "/update/jogos": "jogos",
    "/admin/gerar-jogos": "gerar-jogos",
    "/classificacao": "classificacao",
    "/relatorios": "relatorios",
    "/admin/clientes": "clientes",
    "/backup": "backup",
    "/settings/config": "configuracoes",
  };

  if (routeModuleMap[pathname]) {
    return routeModuleMap[pathname];
  }

  for (const route in routeModuleMap) {
    if (pathname.startsWith(route)) {
      return routeModuleMap[route];
    }
  }

  return null;
};

export const useRoutePermission = (
  pathname: string,
  action: PermissionAction = "visualizar"
) => {
  const { hasPermission, isSuperAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return { loading: true, hasAccess: false };
  }

  if (isSuperAdmin) {
    return { loading: false, hasAccess: true };
  }

  const module = getModuleFromRoute(pathname);
  if (!module) {
    return { loading: false, hasAccess: true };
  }

  return {
    loading: false,
    hasAccess: hasPermission(module, action),
  };
};

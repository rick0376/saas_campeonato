import { usePermissions } from "../hooks/usePermissions";
import { ReactNode } from "react";

interface ProtectedComponentProps {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

export const ProtectedComponent = ({
  module,
  action,
  children,
  fallback = null,
  adminOnly = false,
  superAdminOnly = false,
}: ProtectedComponentProps) => {
  const { has, isAdmin, isSuperAdmin } = usePermissions();

  // Se é super admin only e usuário não é super admin
  if (superAdminOnly && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  // Se é admin only e usuário não é admin
  if (adminOnly && !isAdmin) {
    return <>{fallback}</>;
  }

  // Verificar permissão específica
  if (!has(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Componentes específicos para facilitar o uso
export const CanView = ({
  module,
  children,
  fallback,
  action = "visualizar",
  adminOnly = false,
  superAdminOnly = false,
}: {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
  action?: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}) => (
  <ProtectedComponent
    module={module}
    action={action}
    fallback={fallback}
    adminOnly={adminOnly}
    superAdminOnly={superAdminOnly}
  >
    {children}
  </ProtectedComponent>
);

export const CanCreate = ({
  module,
  children,
  fallback,
  adminOnly = false,
  superAdminOnly = false,
}: {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}) => (
  <ProtectedComponent
    module={module}
    action="criar"
    fallback={fallback}
    adminOnly={adminOnly}
    superAdminOnly={superAdminOnly}
  >
    {children}
  </ProtectedComponent>
);

export const CanEdit = ({
  module,
  children,
  fallback,
  adminOnly = false,
  superAdminOnly = false,
}: {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}) => (
  <ProtectedComponent
    module={module}
    action="editar"
    fallback={fallback}
    adminOnly={adminOnly}
    superAdminOnly={superAdminOnly}
  >
    {children}
  </ProtectedComponent>
);

export const CanDelete = ({
  module,
  children,
  fallback,
  adminOnly = false,
  superAdminOnly = false,
}: {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}) => (
  <ProtectedComponent
    module={module}
    action="excluir"
    fallback={fallback}
    adminOnly={adminOnly}
    superAdminOnly={superAdminOnly}
  >
    {children}
  </ProtectedComponent>
);

// Componente adicional para ações customizadas
export const CanPerform = ({
  module,
  action,
  children,
  fallback,
  adminOnly = false,
  superAdminOnly = false,
}: {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}) => (
  <ProtectedComponent
    module={module}
    action={action}
    fallback={fallback}
    adminOnly={adminOnly}
    superAdminOnly={superAdminOnly}
  >
    {children}
  </ProtectedComponent>
);

// Componente para múltiplas permissões (OR)
export const CanAny = ({
  permissions,
  children,
  fallback,
  adminOnly = false,
  superAdminOnly = false,
}: {
  permissions: Array<{ module: string; action: string }>;
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}) => {
  const { has, isAdmin, isSuperAdmin } = usePermissions();

  // Se é super admin only e usuário não é super admin
  if (superAdminOnly && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  // Se é admin only e usuário não é admin
  if (adminOnly && !isAdmin) {
    return <>{fallback}</>;
  }

  const hasAnyPermission = permissions.some(({ module, action }) =>
    has(module, action)
  );

  if (!hasAnyPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Componente para múltiplas permissões (AND)
export const CanAll = ({
  permissions,
  children,
  fallback,
  adminOnly = false,
  superAdminOnly = false,
}: {
  permissions: Array<{ module: string; action: string }>;
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}) => {
  const { has, isAdmin, isSuperAdmin } = usePermissions();

  // Se é super admin only e usuário não é super admin
  if (superAdminOnly && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  // Se é admin only e usuário não é admin
  if (adminOnly && !isAdmin) {
    return <>{fallback}</>;
  }

  const hasAllPermissions = permissions.every(({ module, action }) =>
    has(module, action)
  );

  if (!hasAllPermissions) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// ← NOVOS COMPONENTES ESPECÍFICOS PARA ADMIN E SUPER ADMIN

// Componente apenas para admins
export const AdminOnly = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Componente apenas para super admins
export const SuperAdminOnly = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { isSuperAdmin } = usePermissions();

  if (!isSuperAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Componente para gerenciamento de clientes (super admin only)
export const CanManageClients = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { canManageClients } = usePermissions();

  if (!canManageClients()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook para verificar permissões em componentes
export const useCanAccess = (module: string, action: string): boolean => {
  const { has } = usePermissions();
  return has(module, action);
};

// Hook para verificar múltiplas permissões
export const useCanAccessAny = (
  permissions: Array<{ module: string; action: string }>
): boolean => {
  const { has } = usePermissions();
  return permissions.some(({ module, action }) => has(module, action));
};

export const useCanAccessAll = (
  permissions: Array<{ module: string; action: string }>
): boolean => {
  const { has } = usePermissions();
  return permissions.every(({ module, action }) => has(module, action));
};

// ← NOVOS HOOKS PARA ADMIN E SUPER ADMIN

// Hook para verificar se é admin
export const useIsAdmin = (): boolean => {
  const { isAdmin } = usePermissions();
  return isAdmin;
};

// Hook para verificar se é super admin
export const useIsSuperAdmin = (): boolean => {
  const { isSuperAdmin } = usePermissions();
  return isSuperAdmin;
};

// Hook para verificar se pode gerenciar clientes
export const useCanManageClients = (): boolean => {
  const { canManageClients } = usePermissions();
  return canManageClients();
};

// Hook para verificar se pode acessar funcionalidades de admin
export const useCanAccessAdminFeatures = (): boolean => {
  const { canAccessAdminFeatures } = usePermissions();
  return canAccessAdminFeatures();
};

// Hook para verificar se pode acessar funcionalidades de super admin
export const useCanAccessSuperAdminFeatures = (): boolean => {
  const { canAccessSuperAdminFeatures } = usePermissions();
  return canAccessSuperAdminFeatures();
};

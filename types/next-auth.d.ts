import "next-auth";
import "next-auth/jwt";

/**
 * Tipo específico para permissões do sistema
 * Estrutura: { modulo: { acao: boolean } }
 * Exemplo: { usuarios: { visualizar: true, criar: false } }
 */
interface Permissoes {
  [modulo: string]: {
    [acao: string]: boolean;
  };
}

/**
 * Status possíveis para clientes no sistema multi-tenant
 */
type ClientStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXPIRED" | "TRIAL";

/**
 * Roles disponíveis no sistema
 */
type UserRole = "admin" | "user" | "moderator" | "SUPER_ADMIN";

/**
 * Extensão dos tipos do NextAuth para suporte multi-tenant
 */
declare module "next-auth" {
  /**
   * Interface da sessão retornada por useSession, getSession
   * e recebida como prop no SessionProvider
   */
  interface Session {
    user: {
      /** ID único do usuário */
      id: string;
      /** Nome completo do usuário */
      name?: string | null;
      /** Email do usuário */
      email?: string | null;
      /** URL da imagem/avatar do usuário */
      image?: string | null;
      /** Role/função do usuário no sistema */
      role: UserRole;
      /** Permissões granulares do usuário */
      permissoes?: Permissoes | null;
      /** ID do cliente (tenant) - null para super admin */
      clientId?: string | null;
      /** Timestamp da última atividade */
      lastActivity?: number;
      /** Informações do cliente atual (quando aplicável) */
      currentClient?: {
        id: string;
        name: string;
        slug: string;
        status: ClientStatus;
        logo?: string;
      } | null;
    };
    /** Timestamp de expiração da sessão */
    expires: string;
  }

  /**
   * Interface do usuário retornada pelos providers OAuth
   * ou no callback de sessão quando usando database
   */
  interface User {
    /** ID único do usuário */
    id: string;
    /** Nome completo do usuário */
    name?: string | null;
    /** Email do usuário */
    email?: string | null;
    /** URL da imagem/avatar do usuário */
    image?: string | null;
    /** Role/função do usuário no sistema */
    role: UserRole;
    /** Permissões granulares do usuário */
    permissoes?: Permissoes | null;
    /** ID do cliente (tenant) - null para super admin */
    clientId?: string | null;
  }

  /**
   * Interface para configurações de autenticação
   */
  interface AuthOptions {
    /** Configurações específicas do multi-tenant */
    multiTenant?: {
      /** Permitir login sem clientId para super admin */
      allowGlobalAccess?: boolean;
      /** Validar status do cliente durante login */
      validateClientStatus?: boolean;
      /** Redirecionar para seleção de cliente se não especificado */
      redirectToClientSelection?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  /**
   * Interface do JWT retornada pelo callback jwt e getToken
   */
  interface JWT {
    /** ID único do usuário */
    id: string;
    /** Nome completo do usuário */
    name?: string | null;
    /** Email do usuário */
    email?: string | null;
    /** Role/função do usuário no sistema */
    role: UserRole;
    /** Permissões granulares do usuário */
    permissoes?: Permissoes | null;
    /** ID do cliente (tenant) - null para super admin */
    clientId?: string | null;
    /** Timestamp da criação do token */
    iat?: number;
    /** Timestamp de expiração do token */
    exp?: number;
    /** Timestamp da última atividade */
    lastActivity?: number;
  }
}

declare module "next-auth" {
  interface User {
    role: string;
    permissoes: any;
    clientId: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      permissoes: any;
      clientId: string | null;
    };
  }
}

/**
 * Tipos auxiliares para uso em componentes e hooks
 */
export type { Permissoes, ClientStatus, UserRole };

/**
 * Type guards para verificação de tipos
 */
export const isAdmin = (user: Session["user"]): boolean =>
  user.role === "admin";
export const isSuperAdmin = (user: Session["user"]): boolean =>
  user.role === "admin" && user.clientId === null;
export const hasPermission = (
  user: Session["user"],
  module: string,
  action: string
): boolean => {
  if (isSuperAdmin(user)) return true;
  return user.permissoes?.[module]?.[action] === true;
};

/**
 * Constantes para permissões padrão
 */
export const DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: {
    usuarios: { visualizar: true, criar: true, editar: true, excluir: true },
    equipes: { visualizar: true, criar: true, editar: true, excluir: true },
    jogadores: { visualizar: true, criar: true, editar: true, excluir: true },
    grupos: { visualizar: true, criar: true, editar: true, excluir: true },
    jogos: { visualizar: true, criar: true, editar: true, excluir: true },
    classificacao: { visualizar: true },
    relatorios: { visualizar: true, exportar: true },
    admin: { visualizar: true, criar: true, editar: true, excluir: true },
    clientes: { visualizar: true, criar: true, editar: true, excluir: true },
    backup: { visualizar: true, criar: true, restaurar: true, excluir: true },
  },
  CLIENT_ADMIN: {
    usuarios: { visualizar: true, criar: true, editar: true, excluir: true },
    equipes: { visualizar: true, criar: true, editar: true, excluir: true },
    jogadores: { visualizar: true, criar: true, editar: true, excluir: true },
    grupos: { visualizar: true, criar: true, editar: true, excluir: true },
    jogos: { visualizar: true, criar: true, editar: true, excluir: true },
    classificacao: { visualizar: true },
    relatorios: { visualizar: true, exportar: true },
    backup: { visualizar: true, criar: true },
  },
  USER: {
    equipes: { visualizar: true },
    jogadores: { visualizar: true },
    grupos: { visualizar: true },
    jogos: { visualizar: true },
    classificacao: { visualizar: true },
    relatorios: { visualizar: true },
  },
} as const;

/**
 * Utilitários para trabalhar com permissões
 */
export const PermissionUtils = {
  /**
   * Cria objeto de permissões a partir de um template
   */
  createFromTemplate: (
    template: keyof typeof DEFAULT_PERMISSIONS
  ): Permissoes => {
    return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS[template]));
  },

  /**
   * Mescla permissões de múltiplas fontes
   */
  merge: (...permissions: (Permissoes | null | undefined)[]): Permissoes => {
    const result: Permissoes = {};

    permissions.forEach((perm) => {
      if (perm) {
        Object.keys(perm).forEach((module) => {
          if (!result[module]) result[module] = {};
          Object.assign(result[module], perm[module]);
        });
      }
    });

    return result;
  },

  /**
   * Valida se um objeto tem a estrutura correta de permissões
   */
  validate: (permissions: any): permissions is Permissoes => {
    if (!permissions || typeof permissions !== "object") return false;

    return Object.values(permissions).every(
      (module) =>
        typeof module === "object" &&
        Object.values(module).every((action) => typeof action === "boolean")
    );
  },

  /**
   * Converte string JSON para objeto de permissões com validação
   */
  fromString: (permissionsString: string | null | undefined): Permissoes => {
    if (!permissionsString) return {};

    try {
      const parsed = JSON.parse(permissionsString);
      return PermissionUtils.validate(parsed) ? parsed : {};
    } catch {
      return {};
    }
  },

  /**
   * Converte objeto de permissões para string JSON
   */
  toString: (permissions: Permissoes): string => {
    return JSON.stringify(permissions);
  },
};

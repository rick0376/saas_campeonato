import { useSession } from "next-auth/react";
import { usePermissions } from "./usePermissions";
import { NAVIGATION_ITEMS, HOME_MENU_ITEMS } from "../config/navigation";

export function useNavigation() {
  const { data: session } = useSession();
  const { hasPermission, isSuperAdmin, isAdmin } = usePermissions();

  const getFilteredNavigationItems = () => {
    return NAVIGATION_ITEMS.filter((item) => {
      // Verificar se é super admin only
      if (item.superAdminOnly && !isSuperAdmin) {
        return false;
      }

      // Verificar se é admin only
      if (item.adminOnly && !isAdmin) {
        return false;
      }

      // Verificar permissões
      return hasPermission(item.id, item.permissions[0]);
    });
  };

  const getFilteredHomeMenuItems = () => {
    return HOME_MENU_ITEMS.filter((item) => {
      // Verificar se é super admin only
      if (item.superAdminOnly && !isSuperAdmin) {
        return false;
      }

      // Verificar se é admin only
      if (item.adminOnly && !isAdmin) {
        return false;
      }

      // ✅ CORREÇÃO: Verificar permissões baseado no módulo
      if (item.module) {
        return hasPermission(item.module, item.permission || "visualizar");
      }

      // Para itens sem módulo definido, usar o href para determinar o módulo
      const moduleFromHref = getModuleFromHref(item.href);
      if (moduleFromHref) {
        return hasPermission(moduleFromHref, "visualizar");
      }

      // Se não conseguir determinar o módulo, permitir acesso
      return true;
    });
  };

  const getFilteredSubItems = (parentId: string) => {
    const parentItem = NAVIGATION_ITEMS.find((item) => item.id === parentId);
    if (!parentItem?.subItems) return [];

    return parentItem.subItems.filter((subItem) => {
      // Verificar se é super admin only
      if (subItem.superAdminOnly && !isSuperAdmin) {
        return false;
      }

      return hasPermission(parentId, subItem.permissions[0]);
    });
  };

  // Função auxiliar para determinar módulo baseado no href
  const getModuleFromHref = (href: string): string | null => {
    if (href.includes("/equipes")) return "equipes";
    if (href.includes("/jogadores")) return "jogadores";
    if (href.includes("/grupos")) return "grupos";
    if (href.includes("/jogos")) return "jogos";
    if (href.includes("/classificacao")) return "classificacao";
    if (href.includes("/relatorios")) return "relatorios";
    if (href.includes("/usuarios")) return "usuarios";
    if (href.includes("/clients")) return "clientes";
    if (href.includes("/settings")) return "configuracoes";
    return null;
  };

  return {
    navigationItems: getFilteredNavigationItems(),
    homeMenuItems: getFilteredHomeMenuItems(),
    getFilteredSubItems,
    isAdmin,
    isSuperAdmin,
  };
}

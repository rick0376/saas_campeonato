import {
  Home,
  Users,
  Shield,
  Calendar,
  Trophy,
  BarChart3,
  UserPlus,
  Settings,
  UserCheck,
  Play,
  Edit3,
  Layers,
  Plus,
  CalendarPlus,
  Database,
  Target,
  Building2,
  Globe,
} from "lucide-react";

export interface NavigationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: any;
  color: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  permissions: string[];
  subItems?: NavigationSubItem[];
}

export interface NavigationSubItem {
  id: string;
  title: string;
  href: string;
  permissions: string[];
  superAdminOnly?: boolean;
}

export interface HomeMenuItem {
  title: string;
  description: string;
  href: string;
  icon: any;
  color: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  module?: string;
  permission?: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "home",
    title: "Início",
    description: "Painel principal do sistema",
    href: "/home",
    icon: Home,
    color: "blue",
    permissions: ["visualizar"],
  },
  {
    id: "equipes",
    title: "Equipes",
    description: "Gerenciar equipes do campeonato",
    href: "/equipes",
    icon: Users,
    color: "green",
    permissions: ["visualizar"],
    subItems: [
      {
        id: "equipes-listar",
        title: "Gerenciar Equipes",
        href: "/equipes",
        permissions: ["visualizar"],
      },
      {
        id: "equipes-cadastrar",
        title: "Cadastrar Equipe",
        href: "/cadastrar/equipes",
        permissions: ["criar"],
      },
    ],
  },
  {
    id: "jogadores",
    title: "Jogadores",
    description: "Gerenciar jogadores",
    href: "/jogadores",
    icon: UserCheck,
    color: "purple",
    permissions: ["visualizar"],
    subItems: [
      {
        id: "jogadores-listar",
        title: "Listar Jogadores",
        href: "/jogadores",
        permissions: ["visualizar"],
      },
      {
        id: "jogadores-cadastrar",
        title: "Cadastrar Jogador",
        href: "/cadastrar/jogadores",
        permissions: ["criar"],
      },
    ],
  },
  {
    id: "grupos",
    title: "Grupos",
    description: "Organizar grupos do campeonato",
    href: "/grupos",
    icon: Shield,
    color: "indigo",
    permissions: ["visualizar"],
    subItems: [
      {
        id: "grupos-listar",
        title: "Gerenciar Grupos",
        href: "/grupos",
        permissions: ["visualizar"],
      },
      {
        id: "grupos-cadastrar",
        title: "Cadastrar Grupo",
        href: "/cadastrar/grupos",
        permissions: ["criar"],
      },
    ],
  },
  {
    id: "jogos",
    title: "Jogos",
    description: "Gerenciar jogos e partidas",
    href: "/jogos",
    icon: Calendar,
    color: "orange",
    permissions: ["visualizar"],
    subItems: [
      {
        id: "jogos-listar",
        title: "Ver Jogos",
        href: "/jogos",
        permissions: ["visualizar"],
      },
      {
        id: "jogos-cadastrar",
        title: "Cadastrar Jogo",
        href: "/cadastrar/jogos",
        permissions: ["criar"],
      },
    ],
  },
  {
    id: "classificacao",
    title: "Classificação",
    description: "Tabela de classificação das equipes",
    href: "/classificacao",
    icon: Trophy,
    color: "yellow",
    permissions: ["visualizar"],
  },
  {
    id: "relatorios",
    title: "Relatórios",
    description: "Relatórios e estatísticas",
    href: "/relatorios",
    icon: BarChart3,
    color: "teal",
    permissions: ["visualizar"],
    subItems: [
      {
        id: "relatorios-estatisticas",
        title: "Estatísticas Gerais",
        href: "/relatorios/estatisticas",
        permissions: ["visualizar"],
      },
      {
        id: "relatorios-classificacao",
        title: "Classificação",
        href: "/relatorios/classificacao",
        permissions: ["visualizar"],
      },
      {
        id: "relatorios-jogadores",
        title: "Ranking de Jogadores",
        href: "/relatorios/jogadores",
        permissions: ["visualizar"],
      },
      {
        id: "relatorios-jogos",
        title: "Relatório de Jogos",
        href: "/relatorios/jogos",
        permissions: ["visualizar"],
      },
    ],
  },
  {
    id: "usuarios",
    title: "Usuários",
    description: "Gerenciar usuários do sistema",
    href: "/usuarios",
    icon: UserPlus,
    color: "red",
    adminOnly: true,
    permissions: ["visualizar"],
    subItems: [
      {
        id: "usuarios-listar",
        title: "Listar Usuários",
        href: "/usuarios",
        permissions: ["visualizar"],
      },
      {
        id: "usuarios-cadastrar",
        title: "Cadastrar Usuário",
        href: "/cadastrar/usuarios",
        permissions: ["criar"],
      },
    ],
  },
  {
    id: "clientes",
    title: "Clientes",
    description: "Gerenciar clientes do sistema",
    href: "/admin/clients",
    icon: Building2,
    color: "cyan",
    superAdminOnly: true,
    permissions: ["visualizar"],
    subItems: [
      {
        id: "clientes-listar",
        title: "Gerenciar Clientes",
        href: "/admin/clients",
        permissions: ["visualizar"],
        superAdminOnly: true,
      },
      {
        id: "clientes-cadastrar",
        title: "Cadastrar Cliente",
        href: "/cadastrar/clients",
        permissions: ["criar"],
        superAdminOnly: true,
      },
    ],
  },
  {
    id: "permissoes",
    title: "Permissões",
    description: "Configurar permissões dos usuários",
    href: "/admin/permissoes",
    icon: Shield,
    color: "violet",
    adminOnly: true,
    permissions: ["visualizar"],
  },
  {
    id: "configuracoes",
    title: "Configurações",
    description: "Configurações do sistema",
    href: "/settings/config",
    icon: Settings,
    color: "gray",
    permissions: ["visualizar"],
  },
];

export const HOME_MENU_ITEMS: HomeMenuItem[] = [
  {
    title: "Atualizar Resultados",
    description:
      "Acesse a lista de jogos e atualize os resultados em tempo real",
    href: "/jogos",
    icon: Play,
    color: "blue",
    module: "jogos",
    permission: "editar",
  },
  {
    title: "Visualizar Jogos",
    description: "Confira todos os jogos e seus resultados",
    href: "/jogos",
    icon: Calendar,
    color: "purple",
    module: "jogos",
    permission: "visualizar",
  },
  {
    title: "Classificação",
    description: "Confira a tabela de classificação das equipes",
    href: "/classificacao",
    icon: Trophy,
    color: "green",
    module: "classificacao",
    permission: "visualizar",
  },
  {
    title: "Equipes",
    description: "Gerencie as equipes participantes do campeonato",
    href: "/equipes",
    icon: Users,
    color: "orange",
    module: "equipes",
    permission: "visualizar",
  },
  {
    title: "Jogadores",
    description: "Gerencie os jogadores do campeonato",
    href: "/jogadores",
    icon: UserCheck,
    color: "indigo",
    module: "jogadores",
    permission: "visualizar",
  },
  {
    title: "Grupos",
    description: "Organize as equipes em grupos",
    href: "/grupos",
    icon: Shield,
    color: "purple",
    module: "grupos",
    permission: "visualizar",
  },
  {
    title: "Dashboard",
    description: "Visão geral e principais indicadores",
    href: "/admin/dashboard",
    icon: BarChart3,
    color: "blue",
    permission: "visualizar",
  },

  {
    title: "Relatórios",
    description: "Visualize estatísticas e relatórios do campeonato",
    href: "/relatorios",
    icon: BarChart3,
    color: "teal",
    module: "relatorios",
    permission: "visualizar",
  },
  {
    title: "Usuários",
    description: "Gerencie usuários do sistema",
    href: "/usuarios",
    icon: UserPlus,
    color: "red",
    adminOnly: true,
    module: "usuarios",
    permission: "visualizar",
  },
  {
    title: "Clientes",
    description: "Gerencie clientes do sistema",
    href: "/admin/clients",
    icon: Building2,
    color: "cyan",
    superAdminOnly: true,
    module: "clientes",
    permission: "visualizar",
  },
  {
    title: "Permissões",
    description: "Configure permissões dos usuários",
    href: "/admin/permissoes",
    icon: Shield,
    color: "yellow",
    adminOnly: true,
    module: "usuarios",
    permission: "visualizar",
  },
  {
    title: "Configurações",
    description: "Ajuste as configurações do sistema",
    href: "/settings/config",
    icon: Settings,
    color: "gray",
    module: "configuracoes",
    permission: "visualizar",
  },
];

export const CONFIG_SECTIONS = [
  {
    title: "Gerenciamento de Equipes",
    description: "Configure e gerencie as equipes do campeonato",
    items: [
      {
        title: "Gerenciar Equipes",
        description: "Visualize e edite equipes existentes",
        href: "/equipes",
        icon: Users,
        color: "blue",
        module: "equipes",
        permission: "visualizar",
      },
      {
        title: "Cadastrar Equipe",
        description: "Adicione uma nova equipe ao campeonato",
        href: "/cadastrar/equipes",
        icon: UserPlus,
        color: "green",
        module: "equipes",
        permission: "criar",
      },
    ],
  },
  {
    title: "Gerenciamento de Jogadores",
    description: "Configure e gerencie os jogadores",
    items: [
      {
        title: "Gerenciar Jogadores",
        description: "Visualize e edite jogadores existentes",
        href: "/jogadores",
        icon: UserCheck,
        color: "purple",
        module: "jogadores",
        permission: "visualizar",
      },
      {
        title: "Cadastrar Jogador",
        description: "Adicione um novo jogador",
        href: "/cadastrar/jogadores",
        icon: Plus,
        color: "indigo",
        module: "jogadores",
        permission: "criar",
      },
    ],
  },
  {
    title: "Gerenciamento de Grupos",
    description: "Organize as equipes em grupos",
    items: [
      {
        title: "Gerenciar Grupos",
        description: "Visualize e edite grupos existentes",
        href: "/grupos",
        icon: Layers,
        color: "purple",
        module: "grupos",
        permission: "visualizar",
      },
      {
        title: "Cadastrar Grupo",
        description: "Crie um novo grupo para o campeonato",
        href: "/cadastrar/grupos",
        icon: Plus,
        color: "indigo",
        module: "grupos",
        permission: "criar",
      },
    ],
  },
  {
    title: "Gerenciamento de Jogos",
    description: "Configure e gerencie os jogos do campeonato",
    items: [
      {
        title: "Ver Jogos",
        description: "Visualize todos os jogos cadastrados",
        href: "/jogos",
        icon: Calendar,
        color: "orange",
        module: "jogos",
        permission: "visualizar",
      },
      {
        title: "Cadastrar Jogo",
        description: "Adicione um novo jogo ao campeonato",
        href: "/cadastrar/jogos",
        icon: CalendarPlus,
        color: "teal",
        module: "jogos",
        permission: "criar",
      },
      {
        title: "Atualizar Resultados",
        description: "Edite placares e resultados dos jogos",
        href: "/jogos",
        icon: Edit3,
        color: "red",
        module: "jogos",
        permission: "editar",
      },
    ],
  },
];

export const ADMIN_CONFIG_SECTIONS = [
  {
    title: "Gerenciamento de Usuários",
    description: "Configure usuários e permissões do sistema",
    items: [
      {
        title: "Gerenciar Usuários",
        description: "Visualize e edite usuários existentes",
        href: "/usuarios",
        icon: Users,
        color: "blue",
        module: "usuarios",
        permission: "visualizar",
      },
      {
        title: "Cadastrar Usuário",
        description: "Adicione novos usuários ao sistema",
        href: "/cadastrar/usuarios",
        icon: UserPlus,
        color: "green",
        module: "usuarios",
        permission: "criar",
      },
      {
        title: "Configurar Permissões",
        description: "Defina permissões por usuário",
        href: "/admin/permissoes",
        icon: Shield,
        color: "purple",
        adminOnly: true,
        module: "usuarios",
        permission: "visualizar",
      },
    ],
  },
  {
    title: "Gerenciamento de Clientes",
    description: "Configure clientes e tenants do sistema",
    items: [
      {
        title: "Gerenciar Clientes",
        description: "Visualize e edite clientes existentes",
        href: "/admin/clients",
        icon: Building2,
        color: "cyan",
        superAdminOnly: true,
        module: "clientes",
        permission: "visualizar",
      },
      {
        title: "Cadastrar Cliente",
        description: "Adicione novos clientes ao sistema",
        href: "/cadastrar/clients",
        icon: Plus,
        color: "blue",
        superAdminOnly: true,
        module: "clientes",
        permission: "criar",
      },
    ],
  },
  {
    title: "Configurações do Sistema",
    description: "Configurações avançadas e administrativas",
    items: [
      {
        title: "Configurações Gerais",
        description: "Ajuste configurações do sistema",
        href: "/settings/config",
        icon: Settings,
        color: "gray",
        module: "configuracoes",
        permission: "visualizar",
      },
      {
        title: "Backup de Dados",
        description: "Faça backup dos dados do sistema",
        href: "/backup",
        icon: Database,
        color: "dark",
        superAdminOnly: true,
        module: "backup",
        permission: "visualizar",
      },
    ],
  },
];

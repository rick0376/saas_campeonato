import {
  Users,
  Shield,
  Calendar,
  User,
  BarChart,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

// Definir o tipo correto para os módulos
export type ModuloPermissao = {
  id: string;
  nome: string;
  descricao: string;
  icon: LucideIcon;
  acoes: string[];
};

export const MODULOS: ModuloPermissao[] = [
  {
    id: "equipes",
    nome: "Equipes",
    descricao: "Gerenciar equipes",
    icon: Users,
    acoes: ["visualizar", "criar", "editar", "excluir"],
  },
  {
    id: "grupos",
    nome: "Grupos",
    descricao: "Organizar grupos",
    icon: Shield,
    acoes: ["visualizar", "criar", "editar", "excluir"],
  },
  {
    id: "jogos",
    nome: "Jogos",
    descricao: "Agendar jogos",
    icon: Calendar,
    acoes: ["visualizar", "criar", "editar", "excluir"],
  },
  {
    id: "usuarios",
    nome: "Usuários",
    descricao: "Gerenciar usuários",
    icon: User,
    acoes: ["visualizar", "criar", "editar", "excluir"],
  },
  {
    id: "jogadores",
    nome: "Jogadores",
    descricao: "Gerenciar jogadores",
    icon: UserCheck,
    acoes: ["visualizar", "criar", "editar", "excluir"],
  },
  {
    id: "relatorios",
    nome: "Relatórios",
    descricao: "Ver estatísticas",
    icon: BarChart,
    acoes: ["visualizar", "exportar"],
  },
];

// Permissões padrão para usuários comuns
export const PERMISSOES_PADRAO = {
  equipes: { visualizar: true, criar: false, editar: false, excluir: false },
  grupos: { visualizar: true, criar: false, editar: false, excluir: false },
  jogos: { visualizar: true, criar: false, editar: false, excluir: false },
  usuarios: { visualizar: false, criar: false, editar: false, excluir: false },
  jogadores: { visualizar: true, criar: false, editar: false, excluir: false },
  relatorios: { visualizar: true, exportar: false },
};

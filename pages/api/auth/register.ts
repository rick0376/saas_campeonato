import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./[...nextauth]";
import { hash } from "bcryptjs";
import { prisma } from "../../../lib/prisma";

// Permissões padrão
const PERMISSOES_PADRAO = {
  equipes: { visualizar: true, criar: false, editar: false, excluir: false },
  grupos: { visualizar: true, criar: false, editar: false, excluir: false },
  jogos: { visualizar: true, criar: false, editar: false, excluir: false },
  jogadores: { visualizar: true, criar: false, editar: false, excluir: false },
  usuarios: { visualizar: false, criar: false, editar: false, excluir: false },
  relatorios: { visualizar: true, exportar: false },
};

const PERMISSOES_ADMIN = {
  equipes: { visualizar: true, criar: true, editar: true, excluir: true },
  grupos: { visualizar: true, criar: true, editar: true, excluir: true },
  jogos: { visualizar: true, criar: true, editar: true, excluir: true },
  jogadores: { visualizar: true, criar: true, editar: true, excluir: true },
  usuarios: { visualizar: true, criar: true, editar: true, excluir: true },
  relatorios: { visualizar: true, exportar: true },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("🚀 Iniciando API Register...");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    console.log("📝 Dados recebidos:", req.body);

    // Verificar sessão
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      console.log("❌ Sessão não encontrada");
      return res.status(401).json({ error: "Não autorizado" });
    }

    console.log(
      "✅ Sessão encontrada:",
      session.user?.email,
      "Role:",
      session.user?.role
    );

    if (session.user?.role !== "admin") {
      console.log("❌ Usuário não é admin");
      return res.status(403).json({
        error:
          "Acesso negado. Apenas administradores podem cadastrar usuários.",
      });
    }

    const { name, email, password, role } = req.body;

    // Validações básicas
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: "Todos os campos são obrigatórios",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        error: "Nome deve ter pelo menos 2 caracteres",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        error: "Formato de e-mail inválido",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Senha deve ter pelo menos 6 caracteres",
      });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        error: "Tipo de usuário inválido",
      });
    }

    console.log("✅ Validações passaram");

    const emailNormalizado = email.trim().toLowerCase();

    console.log("🔍 Verificando email existente...");

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNormalizado },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "Este e-mail já está cadastrado no sistema",
      });
    }

    console.log("🔐 Criando hash da senha...");

    // Hash da senha
    const hashedPassword = await hash(password, 12);

    // Definir permissões como objeto
    const permissoesObj =
      role === "admin" ? PERMISSOES_ADMIN : PERMISSOES_PADRAO;

    // ✅ CORREÇÃO: Serializar permissões como JSON string
    const permissoesString = JSON.stringify(permissoesObj);

    console.log("💾 Criando usuário no banco...");

    // Criar usuário com permissões como string
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNormalizado,
        password: hashedPassword,
        role: role,
        permissoes: permissoesString, // ✅ CORREÇÃO: Salvar como string
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissoes: true,
        createdAt: true,
      },
    });

    console.log("✅ Usuário criado com sucesso:", newUser.email);

    // ✅ CORREÇÃO: Converter permissões de volta para objeto na resposta
    let permissoesResposta;
    try {
      permissoesResposta = JSON.parse(newUser.permissoes || "{}");
    } catch (e) {
      permissoesResposta = {};
    }

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        permissoes: permissoesResposta, // ✅ Retornar como objeto
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Erro detalhado na API:", error);
    console.error("Stack trace:", error.stack);

    // Tratamento específico de erros do Prisma
    if (error?.code === "P2002") {
      return res.status(409).json({
        error: "Este e-mail já está cadastrado no sistema",
      });
    }

    // Erro genérico
    return res.status(500).json({
      error: "Erro interno do servidor",
      details:
        process.env.NODE_ENV === "development"
          ? {
              message: error.message,
              stack: error.stack,
              code: error.code,
            }
          : "Verifique os logs do servidor",
    });
  }
}
